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
    // 递归自引入，替代 <svelte:self>（Svelte5 已弃用）
    import NodeRenderer from './NodeRenderer.svelte'
    import { onDestroy } from 'svelte'

    // Blob → URL 缓存，避免重复生成
    const blobUrlMap = new WeakMap<Blob, string>()
    // 记录所有已创建的临时 URL，便于销毁时统一释放
    const blobUrlSet = new Set<string>()

    // 组件卸载时释放所有创建的 Object URL
    onDestroy(() => {
        for (const url of blobUrlSet) {
            URL.revokeObjectURL(url)
        }
        blobUrlSet.clear()
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

        // console.log(`[NodeRenderer] 点击事件触发: ${nodeKey}, target:`, event.target, 'currentTarget:', event.currentTarget)

        // 检查是否是直接点击当前元素（不是子元素冒泡上来的）
        const isDirectClick = event.target === event.currentTarget

        if (isDirectClick) {
            // 立即阻止事件冒泡和默认行为
            event.stopImmediatePropagation()
            event.preventDefault()

            // 选中当前元素
            select?.(nodeKey)
            // console.log(`[NodeRenderer] 直接点击选中: ${nodeKey}`)
        } else {
            // console.log(`[NodeRenderer] 忽略子元素冒泡: ${nodeKey}`)
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
    let finalStyle = $derived.by(() => {
        const styleEntries = Object.entries(node.styles ?? {})
        const styleStr = styleEntries
            .map(([k, v]) => {
                const kebab = k.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
                let value: any = v

                // 处理背景图片 - 直接处理 Blob 对象或 URL 字符串
                if (k === 'backgroundImage') {
                    if (v instanceof Blob) {
                        let url = blobUrlMap.get(v)
                        if (!url) {
                            url = URL.createObjectURL(v)
                            blobUrlMap.set(v, url)
                            blobUrlSet.add(url)
                        }
                        value = `url(${url})`
                    } else if (typeof v === 'string') {
                        const str = v.trim()
                        // 保留已有 url()、线性/径向渐变字符串
                        if (str.startsWith('url(') || str.startsWith('linear-gradient(') || str.startsWith('radial-gradient(')) {
                            value = str
                        } else if (str) {
                            // 处理普通路径
                            value = `url(${str})`
                        }
                    } else if (v) {
                        // 其他情况直接使用原值
                        value = v
                    }
                } else if (value instanceof Blob) {
                    // 处理其他 Blob 类型样式
                    let url = blobUrlMap.get(value)
                    if (!url) {
                        url = URL.createObjectURL(value)
                        blobUrlMap.set(value, url)
                        blobUrlSet.add(url)
                    }
                    value = `url(${url})`
                }

                return `${kebab}:${value}`
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
        const hiddenStyle = node.hidden ? 'display:none !important;' : ''

        const defaultStyles = `transition: all 0.2s ease !important; ${outlineStyles}; ${hiddenStyle}`
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
    const dataNameAttr = $derived.by(() => (nodeKey === 'root' ? '画布' : ((restAttrs as Record<string, any>)?.['data-name'] ?? node.type ?? '元素')))

    /** 获取组件类型，默认为 SimpleBox */
    const componentType = $derived.by(() => node.componentType ?? 'SimpleBox')

    /** 获取组件属性，合并 componentProps 和其他属性（保持响应式） */
    const componentProps = $derived.by(() => ({ 'data-name': dataNameAttr, ...restAttrs, ...(node.componentProps ?? {}) }))
</script>

{#if nodeKey === 'root'}
    <div id={nodeKey} data-name={dataNameAttr} style={finalStyle} {...restAttrs} onclick={handleClick}>
        {node.textContent || ''}
        {#each node.children ?? [] as child (child.id)}
            <NodeRenderer node={child} {selectedId} {editing} {select} />
        {/each}
    </div>
{:else}
    <DynamicComponent type={componentType} id={nodeKey} data-name={dataNameAttr} style={finalStyle} {...componentProps} onclick={handleClick}>
        {node.textContent || ''}
        {#each node.children ?? [] as child (child.id)}
            <NodeRenderer node={child} {selectedId} {editing} {select} />
        {/each}
    </DynamicComponent>
{/if}
