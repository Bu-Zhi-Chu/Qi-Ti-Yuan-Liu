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

    // Runes props - 保留 selectedId 响应式
    const { node, selectedId, editing = false, select } = $props()

    // 最新选中 ID

    /** 当前节点业务标识 */
    const nodeKey = node.dataId ?? node.id

    /** 点击选中 - 精确点击，不冒泡 */
    function handleClick(event: MouseEvent) {
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
        const styles = node.styles ?? {}
        const styleEntries = Object.entries(styles)
        
        // 分离transform相关属性和其他样式
        const transformProps = ['translateX', 'translateY', 'scaleX', 'scaleY', 'rotate', 'skewX', 'skewY']
        const transformValues: string[] = []
        const regularStyles: string[] = []
        
        // 处理transform相关属性
        let hasTransform = false
        
        // 平移
        if (styles.translateX || styles.translateY) {
            const translateX = styles.translateX || '0'
            const translateY = styles.translateY || '0'
            transformValues.push(`translate(${translateX}, ${translateY})`)
            hasTransform = true
        }
        
        // 缩放
        if (styles.scaleX || styles.scaleY) {
            const scaleX = styles.scaleX || '1'
            const scaleY = styles.scaleY || '1'
            transformValues.push(`scale(${scaleX}, ${scaleY})`)
            hasTransform = true
        }
        
        // 旋转
        if (styles.rotate) {
            transformValues.push(`rotate(${styles.rotate})`)
            hasTransform = true
        }
        
        // 倾斜
        if (styles.skewX || styles.skewY) {
            const skewX = styles.skewX || '0'
            const skewY = styles.skewY || '0'
            transformValues.push(`skew(${skewX}, ${skewY})`)
            hasTransform = true
        }
        
        // 处理其他常规样式
        for (const [k, v] of styleEntries) {
            // 跳过已处理的transform相关属性
            if (transformProps.includes(k) || k === 'transformOriginX' || k === 'transformOriginY') continue
            
            const kebab = k.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
            regularStyles.push(`${kebab}:${v}`)
        }
        
        // 添加组合的transform属性
        if (hasTransform) {
            regularStyles.push(`transform:${transformValues.join(' ')}`)
        }
        
        // 处理transform-origin
        if (styles.transformOriginX || styles.transformOriginY) {
            const originX = styles.transformOriginX || '50%'
            const originY = styles.transformOriginY || '50%'
            regularStyles.push(`transform-origin:${originX} ${originY}`)
        }
        
        const styleStr = regularStyles.join(';')

        // 使用更明显的边框宽度和 !important 强制应用
        const borderWidth = 1
        let borderStyles = ''
        let boxShadowStyles = ''

        // 只在编辑模式下且当前节点被选中时显示高亮边框
        if (editing && isSelected) {
            borderStyles = `border: calc(${borderWidth}px * var(--scale-ratio, 1)) solid #00ff00 !important`
            boxShadowStyles = `box-shadow: inset 0 0 0 calc(2px * var(--scale-ratio, 1)) #00ff00, 0 0 calc(8px * var(--scale-ratio, 1)) rgba(0, 255, 0, 0.5) !important`
        }

        // 根据 hidden 属性控制显示/隐藏
        const hiddenStyle = node.hidden ? 'display:none !important;' : ''

        const defaultStyles = `transition: all 0.2s ease !important; ${borderStyles}; ${boxShadowStyles}; ${hiddenStyle}`
        const result = styleStr ? `${styleStr}; ${defaultStyles}` : defaultStyles

        return result
    })

    /** 透传除 styles 之外的 attributes（保持响应式） */
    const extraAttr = $derived.by(() => node.attributes ?? {})

    /** 计算最终 id（默认等于 data-id，可被用户修改），保持响应式 */
    const displayId = $derived.by(() => (extraAttr as Record<string, any>).id ?? node.id)

    /** 移除 id，防止与显式 id 属性重复 */
    const restAttrs = $derived.by(() => {
        const { id: _omitId, ...others } = extraAttr
        return others
    })

    /** 计算展示名称，供 data-name 使用，保持与 DomTreeList 显示逻辑一致 */
    const dataNameAttr = $derived.by(() => (nodeKey === 'root' ? '画布' : ((restAttrs as Record<string, any>)?.['data-name'] ?? node.tagName ?? '元素')))

    /** 获取组件类型，默认为 SimpleBox */
    const componentType = node.componentType ?? 'SimpleBox'

    /** 获取组件属性，合并 componentProps 和其他属性（保持响应式） */
    const componentProps = $derived.by(() => ({ 'data-name': dataNameAttr, ...restAttrs, ...(node.componentProps ?? {}) }))
</script>

{#if nodeKey === 'root'}
    <div data-id={nodeKey} data-name={dataNameAttr} id={displayId} style={finalStyle} {...restAttrs} onclick={handleClick}>
        {#each node.children ?? [] as child}
            <NodeRenderer node={child} {selectedId} {editing} {select} />
        {/each}
    </div>
{:else}
    <DynamicComponent type={componentType} data-id={nodeKey} data-name={dataNameAttr} id={displayId} style={finalStyle} {...componentProps} onclick={handleClick}>
        {#each node.children ?? [] as child}
            <NodeRenderer node={child} {selectedId} {editing} {select} />
        {/each}
    </DynamicComponent>
{/if}
