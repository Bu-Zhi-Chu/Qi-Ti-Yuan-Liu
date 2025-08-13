<!--
 * DomTreeList.svelte
 * DOM 映射列表组件（工作区左侧树形结构）
 *
 * 功能特性：
 * 1. 递归渲染 domTree 树形结构，展示层级关系。
 * 2. 点击节点即可选中，高亮同步到画布 DomCanvas（通过绑定 selectedId）。
 * 3. 使用事件委托 (on:click) + data-id 属性，避免在大量节点上注册监听器。
 * 4. 采用 {@html} 渲染字符串模板，性能好且实现简单；字符串由 renderNode 递归生成。
 * 5. 预留后续与 svelte-dnd-action 集成接口，实现树形拖拽排序。
 *
 * 使用示例：
 * <DomTreeList {domTree} bind:selectedId />
 -->

<script module lang="ts">
    /**
     * 组件对外属性类型声明
     */
    export interface Props {
        domTree: any
        selectedId?: string | null
    }

    /** DOM 节点类型 */
    import type { DomNode } from '../../types/dom-node.types'
</script>

<script lang="ts">
    import { domTree, selectedId, setSelectedId, toggleExpanded, toggleHidden, removeNodeById } from '../../services/repository/dom-tree.store.svelte'

    /** 事件委托：根据 data-action 处理不同操作 */
    function handleClick(event: MouseEvent) {
        const target = event.target as HTMLElement | null
        if (!target) return
        const action = target.getAttribute('data-action')
        const id = target.getAttribute('data-id') || target.closest('[data-id]')?.getAttribute('data-id')
        if (!id) return

        switch (action) {
            case 'toggle-expand':
                toggleExpanded(id)
                break
            case 'toggle-hidden':
                toggleHidden(id)
                break
            case 'delete-node':
                removeNodeById(id)
                break
            default:
                setSelectedId(id)
        }
    }

    // 递归生成 HTML 字符串
    function renderNode(node: DomNode, level = 0, currentSelectedId: string | null): string {
        const padding = level * 16
        const nodeKey = node.dataId ?? node.id
        const isSelected = nodeKey === currentSelectedId
        const labelClass = `${isSelected ? 'node-label selected' : 'node-label'} ${node.hidden ? 'hidden' : ''}`
        const displayName = level === 0 ? '画布' : nodeKey
        const hasChildren = node.children && node.children.length
        const expandIcon = hasChildren ? (node.expanded ? '▼' : '▶') : ''
        const hideIcon = level === 0 ? '' : (node.hidden ? '🙈' : '👁')
        const deleteIcon = level === 0 ? '' : '🗑'

        const childrenHtml = hasChildren && node.expanded ? node.children!.map((child: DomNode) => renderNode(child, level + 1, currentSelectedId)).join('') : ''

        return /*html*/ `
          <div class="tree-node" style="padding-left: calc(${padding}px * var(--scale-ratio, 1));">
            <span class="icon expand" data-action="toggle-expand" data-id="${nodeKey}">${expandIcon}</span>
            <span class="icon hide" data-action="toggle-hidden" data-id="${nodeKey}">${hideIcon}</span>
            <span class="icon delete" data-action="delete-node" data-id="${nodeKey}">${deleteIcon}</span>
            <span class="${labelClass}" data-id="${nodeKey}">${displayName}</span>
            ${childrenHtml}
          </div>
        `
    }

    const htmlString = $derived(() => (domTree ? renderNode(domTree, 0, selectedId()) : ''))
</script>

<!-- 容器使用事件委托监听 -->
<!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
<div class="tree-container" onclick={handleClick} role="tree" tabindex="0">
    {@html htmlString()}
</div>

<style>
    .tree-container {
        padding: calc(8px * var(--scale-ratio, 1)) calc(4px * var(--scale-ratio, 1));
        font-size: calc(12px * var(--scale-ratio, 1));
        color: #cbd5e1;
        overflow-y: auto;
        height: 100%;
    }

    /* svelte-ignore css_unused_selector */
    :global(.node-label) {
        padding: calc(4px * var(--scale-ratio, 1)) calc(6px * var(--scale-ratio, 1));
        cursor: pointer;
        border-radius: calc(4px * var(--scale-ratio, 1));
        transition: background 0.2s ease;
        display: inline-block;
    }

    /* svelte-ignore css_unused_selector */
    :global(.node-label:hover) {
        background: rgba(255, 255, 255, 0.08);
    }

    /* svelte-ignore css_unused_selector */
    :global(.node-label.selected) {
        background: rgba(99, 102, 241, 0.35);
        color: #e0e7ff;
    }

    /* svelte-ignore css_unused_selector */
    :global(.node-id) {
        opacity: 0.7;
    }
</style>
