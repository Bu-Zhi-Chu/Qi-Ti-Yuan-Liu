<!--
 * NodeRenderer.svelte
 * 递归渲染 DomNode 数据结构；除根节点外统一使用 DynamicComponent(SimpleBox)。
 * 支持选中高亮，通过派发 select 事件让上层组件维护 selectedId。
 -->
<script module lang="ts">
    import type { DomNode } from '../../types/dom-node.types'
    /** 组件输入类型定义，供外部组件类型检查 */
    export interface Props {
        node: DomNode
        selectedId?: string | null
        /** 选择回调 */
        select?: (id: string) => void
    }
</script>

<script lang="ts">
    import DynamicComponent from '../Core/DynamicComponent.svelte'
    // 递归自引入，替代 <svelte:self>（Svelte5 已弃用）
    import NodeRenderer from './NodeRenderer.svelte'

    // Runes props
    const { node, selectedId, select } = $props()
    /** 当前节点业务标识 */
    const nodeKey = node.dataId ?? node.id

    /** 点击选中 */
    function handleClick(event: MouseEvent) {
        event.stopPropagation()
        select?.(nodeKey)
    }

    /** 生成内联样式字符串 */
    function buildStyle(): string {
        const styleEntries = Object.entries(node.styles ?? {})
        const styleStr = styleEntries
            .map(([k, v]) => {
                const kebab = k.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
                return `${kebab}:${v}`
            })
            .join(';')
        const borderColor = nodeKey === selectedId ? '#3b82f6' : 'transparent'
        const boxShadow = nodeKey === selectedId ? '0 0 calc(10px * var(--scale-ratio, 1)) rgba(59,130,246,0.5)' : 'none'
        const outline = nodeKey === selectedId ? '2px solid #3b82f6' : 'none'
        const defaultStyles = `transition:all 0.2s ease;border: calc(1px * var(--scale-ratio, 1)) dashed ${borderColor};box-shadow:${boxShadow};outline:${outline};outline-offset:-2px`
        return styleStr ? `${styleStr};${defaultStyles}` : defaultStyles
    }

    /** 透传除 styles 之外的 attributes */
    const extraAttr = node.attributes ?? {}
</script>

{#if nodeKey === 'root'}
    <div data-id={nodeKey} style={buildStyle()} {...extraAttr} onclick={handleClick}>
        {#each node.children ?? [] as child}
            <NodeRenderer node={child} {selectedId} {select} />
        {/each}
    </div>
{:else}
    <DynamicComponent type="SimpleBox" data-id={nodeKey} style={buildStyle()} {...extraAttr} onclick={handleClick}>
        {#each node.children ?? [] as child}
            <NodeRenderer node={child} {selectedId} {select} />
        {/each}
    </DynamicComponent>
{/if}
