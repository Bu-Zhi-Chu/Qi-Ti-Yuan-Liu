<!--
 * NodeRenderer.svelte
 * 递归渲染 DomNode 数据结构；除根节点外统一使用 DynamicComponent(SimpleBox)。
 * 支持选中高亮，通过派发 select 事件让上层组件维护 selectedId。
 * 高亮边框只在编辑模式下显示，避免在正常浏览模式下干扰用户体验。
 -->
<script module lang="ts">
    import type { DomNode } from '../../types/dom-node.types'
    /** 组件输入类型定义，供外部组件类型检查 */
    export interface Props {
        node: DomNode
        selectedId?: string | null
        /** 是否为编辑模式，控制高亮边框显示 */
        editing?: boolean
        /** 选择回调 */
        select?: (id: string) => void
    }
</script>

<script lang="ts">
    import DynamicComponent from '../core/DynamicComponent.svelte'

    import NodeRenderer from './NodeRenderer.svelte'
    import { onMount, onDestroy } from 'svelte'
    import { get } from 'svelte/store'
    import { projectId } from '../../stores/dom-tree.store.svelte'
    import { getImage } from '../../services/database/image-store.service'
    import { decrementOrDelete } from '../../services/database/image-store.service'
    import { LRUMap } from 'lru_map'
    import { registerBlobUrl } from '../../services/utils/blob-url-manager'
    import { currentPage } from '../../stores/dom-tree.store.svelte'

    // 40+位十六进制哈希
    const hashRegex = /^[a-f0-9]{40,}$/

    /** 递归收集节点及其子节点的背景图哈希 */
    function collectHashes(node: any, set: Set<string> = new Set()): Set<string> {
        const bg = (node.styles as any)?.backgroundImage
        if (typeof bg === 'string' && hashRegex.test(bg.trim())) {
            set.add(bg.trim())
        }
        for (const child of node.children ?? []) {
            collectHashes(child, set)
        }
        return set
    }

    /** 批量预取背景图哈希对应的 URL */
    function prefetchBackgroundImgs(root: any) {
        const hashes = collectHashes(root)
        hashes.forEach(async (h) => {
            await getUrlByHash(h)
        })
    }

    // 哈希→URL 全局 LRU 缓存，容量 128
    const urlCache = new LRUMap<string, string>(128)
    let urlCacheVersion = $state(0)

    // 当条目被淘汰时自动 revoke
    const originalShift = urlCache.shift.bind(urlCache)
    urlCache.shift = function () {
        const result = originalShift()
        if (result) {
            const [k, v] = result
            if (v) URL.revokeObjectURL(v)
        }
        return result
    }

    async function getUrlByHash(hash: string): Promise<string> {
        let url = urlCache.get(hash)
        if (url) return url

        const pid = get(projectId)
        if (!pid) return ''
        const record = await getImage(pid, hash)
        if (!record) return ''
        url = URL.createObjectURL(record.blob)
        registerBlobUrl(url)
        urlCache.set(hash, url)
        return url
    }

    // 组件卸载时释放所有创建的 Object URL（背景图引用计数由 dom-tree.store 统一管理）

    // 首次挂载预取背景图哈希
    onMount(() => {
        prefetchBackgroundImgs(node)
    })

    // 监听背景图片哈希变更，及时扣减引用
    let prevBgHash: string | null = null
    $effect(() => {
        const currentBg = (node.styles as any)?.backgroundImage
        const str = typeof currentBg === 'string' ? currentBg.trim() : ''
        if (str !== prevBgHash) {
            if (prevBgHash && hashRegex.test(prevBgHash)) {
                const pid = get(projectId)
                if (pid) decrementOrDelete(pid, prevBgHash)
            }
            prevBgHash = hashRegex.test(str) ? str : null
        }
    })

    // Runes props - 保留 selectedId 响应式
    const { node, selectedId, editing = false, select } = $props()

    // 最新选中 ID

    /** 当前节点唯一标识 */
    const nodeKey = node.id

    /** 点击选中 - 精确点击，不冒泡 */
    function handleClick(event: MouseEvent) {
        // 只在编辑模式下允许节点选择
        if (!editing) return

        // 立即阻止事件冒泡和默认行为
        event.stopImmediatePropagation()
        event.preventDefault()

        // 选中当前元素
        select?.(nodeKey)
    }

    function handleKeyDown(event: KeyboardEvent) {
        if (!editing) return
        const k = event.key
        if (k === 'Enter') {
            event.preventDefault()
            event.stopImmediatePropagation?.()
            select?.(nodeKey)
        }
    }

    // 计算当前节点是否被选中
    const isSelected = $derived(selectedId === nodeKey)

    // 调试：监听 isSelected 变化（仅在状态改变时打印）
    let previousSelected = $state(false)
    $effect(() => {
        if (isSelected !== previousSelected) {
            // console.log(`[NodeRenderer ${nodeKey}] isSelected 状态改变: ${previousSelected} -> ${isSelected}, selectedId: ${selectedId}`)
            previousSelected = isSelected
        }
    })

    /** 派生最终内联样式，依赖 selectedId、node.styles、node.hidden 实时更新 */
    let hasPseudoBg = $derived.by(() => {
        const bg = (node.styles as any)?.backgroundImage
        if (!bg) return false
        if (typeof bg === 'string') {
            const str = bg.trim()
            // 过滤渐变
            return !!str && !str.includes('gradient(')
        }
        return true // Blob 等
    })

    let finalStyle = $derived.by(() => {
        const _v = urlCacheVersion // 保证依赖
        const styleEntries = Object.entries(node.styles ?? {}).filter(([k]) => !['textOffsetLeft', 'textOffsetTop', 'highlightImage'].includes(k))
        const styleStr = styleEntries
            .map(([k, v]) => {
                let propertyName = k.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
                let value: any = v

                // 处理背景图片 - 改为写入 CSS 变量，交由伪元素渲染
                if (k === 'backgroundImage') {
                    let actualImage = v

                    // 如果是switch按钮，根据toggled状态选择图片

                    const btnType = (node as any).buttonType ?? (node.attributes as any)?.buttonType ?? (node.componentProps as any)?.buttonType

                    if (node.componentType === 'Button' && (btnType === 'switch' || btnType === 'navigation')) {
                        actualImage = node.toggled ? (node.styles as any)?.highlightImage : v
                    }

                    if (typeof actualImage === 'string') {
                        const str = actualImage.trim()
                        if (hashRegex.test(str)) {
                            let url = urlCache.get(str)
                            if (!url) {
                                getUrlByHash(str).then((u) => {
                                    if (u) {
                                        urlCache.set(str, u)
                                        urlCacheVersion = urlCacheVersion + 1
                                    }
                                })
                            } else {
                                value = `url(${url})`
                            }
                        } else if (str.startsWith('url(')) {
                            value = str
                        } else if (str) {
                            value = `url(${str})`
                        }
                    }
                    // 使用 CSS 变量 --bg-img
                    propertyName = '--bg-img'
                } else if (k === 'backgroundGradient') {
                    // 渐变依旧直接渲染在元素本体
                    propertyName = 'background-image'
                    value = typeof v === 'string' ? v.trim() : v
                } else if (k === 'backgroundSize') {
                    propertyName = '--bg-size'
                } else if (k === 'backgroundPosition') {
                    propertyName = '--bg-pos'
                } else if (k === 'backgroundRepeat') {
                    propertyName = '--bg-repeat'
                } else if (k === 'backgroundOpacity') {
                    propertyName = '--bg-opacity'
                }

                return `${propertyName}:${value}`
            })
            .join(';')

        // 检查是否有边框宽度设置
        const hasBorderWidth = () => {
            const styles = node.styles ?? {}

            // 辅助函数：检查宽度值是否为有效非零值
            const isNonZeroWidth = (width: string | number | undefined): boolean => {
                if (!width) return false
                const widthStr = String(width).trim()
                if (!widthStr) return false

                // 处理calc()表达式
                if (widthStr.includes('calc(')) {
                    // 提取calc中的数值部分，处理类似 calc(0px * var(--scale-ratio, 1)) 的情况
                    const calcMatch = widthStr.match(/calc\s*\(\s*([\d.]+)\s*px/)
                    if (calcMatch && calcMatch[1]) {
                        return parseFloat(calcMatch[1]) !== 0
                    }
                    // 如果无法解析calc表达式，保守地认为有边框
                    return true
                }

                // 处理简单数值和单位
                const numericValue = parseFloat(widthStr.replace(/[^\d.]/g, ''))
                if (isNaN(numericValue)) return false
                return numericValue !== 0
            }

            // 检查统一边框宽度
            if (isNonZeroWidth(styles.borderWidth)) {
                return true
            }

            // 检查四边独立边框宽度
            const borderWidths = [styles.borderTopWidth, styles.borderRightWidth, styles.borderBottomWidth, styles.borderLeftWidth]
            return borderWidths.some(isNonZeroWidth)
        }

        // 使用多层box-shadow实现选中高亮，从内到外逐渐变淡
        let outlineStyles = ''

        // 只在编辑模式下且当前节点被选中时显示高亮轮廓
        // 当边框宽度不为空且不为0时，不显示高亮边框以避免重叠
        if (editing && isSelected && !hasBorderWidth()) {
            outlineStyles = `outline: none !important; box-shadow: 0 0 calc(2px * var(--scale-ratio, 1)) calc(2px * var(--scale-ratio, 1)) rgba(99, 102, 241, 0.8), 0 0 calc(4px * var(--scale-ratio, 1)) calc(4px * var(--scale-ratio, 1)) rgba(99, 102, 241, 0.5), 0 0 calc(6px * var(--scale-ratio, 1)) calc(6px * var(--scale-ratio, 1)) rgba(99, 102, 241, 0.3) !important`
        }

        // 根据 hidden 属性控制显示/隐藏
        let visibility = ''
        // 移除对 Screen 的静态隐藏处理，交由 Screen 组件自身根据 store 状态处理
        const hiddenStyle = node.hidden || (node.attributes as any)?.['cut-mark'] ? 'display:none !important;' : ''

        const defaultStyles = `${outlineStyles}; ${hiddenStyle} ${visibility}`
        const result = styleStr ? `${styleStr}; ${defaultStyles}` : defaultStyles

        return result
    })

    /** 透传除 styles 之外的 attributes（保持响应式） */
    const extraAttr = $derived.by(() => node.attributes ?? {})

    /** 计算展示 id（直接使用节点 id），保持响应式 */
    const displayId = $derived.by(() => node.id)

    /** 移除 id，防止与显式 id 属性重复 */
    const restAttrs = $derived.by(() => {
        const { id: _omitId, ...others } = extraAttr
        return others
    })

    /** 计算展示名称，供 data-name 使用，保持与 DomTreeList 显示逻辑一致 */
    const dataNameAttr = $derived.by(() => (nodeKey === 'root' ? '画布' : ((restAttrs as Record<string, any>)?.['data-name'] ?? node.componentType ?? (node.attributes as any)?.type ?? '元素')))

    /** 获取组件类型，默认为 SimpleBox */
    const componentType = $derived.by(() => node.componentType ?? 'SimpleBox')

    /** 获取组件属性，合并 componentProps 和其他属性（保持响应式） */
    const componentProps = $derived.by(() => {
        // 引入缓存版本号以保持响应式依赖
        const _cv = urlCacheVersion
        const styleProps: Record<string, any> = {}
        const extraKeys = ['textOffsetLeft', 'textOffsetTop', 'highlightImage']
        extraKeys.forEach((k) => {
            let v = (node.styles as any)?.[k]
            if (v !== undefined) {
                // 当 key 为 highlightImage 时，支持哈希自动解析
                if (k === 'highlightImage' && typeof v === 'string') {
                    const str = v.trim()
                    if (hashRegex.test(str)) {
                        const cached = urlCache.get(str)
                        if (cached) {
                            v = cached
                        } else {
                            getUrlByHash(str).then((u) => {
                                if (u) {
                                    urlCache.set(str, u)
                                    urlCacheVersion = urlCacheVersion + 1
                                }
                            })
                        }
                    }
                }
                styleProps[k] = v
            }
        })
        const result = { 'data-name': dataNameAttr, ...restAttrs, ...(node.componentProps ?? {}), ...styleProps }

        // 调试：检查组件属性是否包含code属性
        if (componentType === 'ECharts') {
            // console.log('NodeRenderer ECharts componentProps:', result)
            // console.log('NodeRenderer restAttrs:', restAttrs)
            // console.log('NodeRenderer node.attributes:', node.attributes)
        }

        // 确保featureProps中的属性也能传递给组件
        // 这对于ECharts等需要code属性的组件很重要
        return result
    })
</script>

{#if nodeKey === 'root'}
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div id={nodeKey} data-name={dataNameAttr} style={finalStyle} class:use-pseudo-bg={hasPseudoBg} {...restAttrs} onclick={handleClick} onkeydown={handleKeyDown} tabindex={editing ? -1 : undefined}>
        {@html node.textContent || ''}
        {#each node.children ?? [] as child (child.id)}
            <NodeRenderer node={child} {selectedId} {editing} {select} />
        {/each}
    </div>
{:else}
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <DynamicComponent type={componentType} id={nodeKey} data-name={dataNameAttr} style={finalStyle} {...componentProps} class={hasPseudoBg ? 'use-pseudo-bg' : undefined} onclick={handleClick} onkeydown={handleKeyDown} tabindex={editing ? -1 : undefined}>
        {@html node.textContent || ''}
        {#each node.children ?? [] as child (child.id)}
            <NodeRenderer node={child} {selectedId} {editing} {select} />
        {/each}
    </DynamicComponent>
{/if}
