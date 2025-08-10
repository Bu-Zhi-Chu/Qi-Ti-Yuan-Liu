<!--
 * NodeRenderer.svelte
 * 递归渲染 DomNode 数据结构；除根节点外统一使用 DynamicComponent(SimpleBox)。
 * 支持选中高亮，通过派发 select 事件让上层组件维护 selectedId。
 -->
<script lang="ts">
    import { createEventDispatcher } from 'svelte'
    import type { DomNode } from '../../types/dom-node.types'
    import DynamicComponent from '../Core/DynamicComponent.svelte'

    /** 组件输入 */
    export interface Props {
        node: DomNode
        selectedId?: string | null
    }

    const dispatch = createEventDispatcher<{ select: string }>()

    // Runes props
    let { node, selectedId = null }: Props = $props()

    /** 当前节点业务标识 */
    const nodeKey = node.nodeId ?? node.id

    /** 点击选中 */
    function handleClick(event: MouseEvent) {
        event.stopPropagation()
        dispatch('select', nodeKey)
    }

    /** 生成内联样式字符串 */
    function buildStyle(): string {
        const styleEntries = Object.entries(node.styles ?? {})
        const styleStr = styleEntries.map(([k, v]) => {
            const kebab = k.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
            return `${kebab}:${v}`
        }).join(';')
        const borderColor = nodeKey === selectedId ? '#3b82f6' : 'transparent'
        const boxShadow = nodeKey === selectedId ? '0 0 calc(10px * var(--scale-ratio, 1)) rgba(59,130,246,0.5)' : 'none'
        const defaultStyles = `transition:all 0.2s ease;border:calc(1px * var(--scale-ratio, 1)) dashed ${borderColor};box-shadow:${boxShadow}`
        return styleStr ? `${styleStr};${defaultStyles}` : defaultStyles
    }

    /** 透传除 styles 之外的 attributes */
    const extraAttr = node.attributes ?? {}
</script>

{#if nodeKey === 'root'}
    <div data-node-id={nodeKey} style={buildStyle()} {...extraAttr} on:click={handleClick}>
        {#each node.children ?? [] as child}
            <svelte:self node={child} {selectedId} on:select={(e) => dispatch('select', e.detail)} />
        {/each}
    </div>
{:else}
    <DynamicComponent type="SimpleBox" data-id={nodeKey} style={buildStyle()} {...extraAttr} on:click={handleClick}>
        {#each node.children ?? [] as child}
            <svelte:self node={child} {selectedId} on:select={(e) => dispatch('select', e.detail)} />
        {/each}
    </DynamicComponent>
{/if}
