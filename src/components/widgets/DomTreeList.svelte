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
    import { domTree, selectedId, setSelectedId, toggleExpanded, toggleHidden, removeNodeById, moveNode, insertNodeBefore, insertNodeAfter } from '../../services/repository/dom-tree.store.svelte'

    import { TreeDragDropService } from '../../services/interactions/tree-drag-drop.service'

    // 拖拽服务实例
    let dragDropService: TreeDragDropService

    // 指示线元素引用
    let indicatorTop: HTMLDivElement | null = null
    let indicatorBottom: HTMLDivElement | null = null

    // 初始化拖拽服务
    $effect(() => {
        if (indicatorTop && indicatorBottom) {
            dragDropService = new TreeDragDropService(indicatorTop, indicatorBottom)
        }

        // 添加全局事件监听器
        window.addEventListener('pointermove', handlePointerMove)
        window.addEventListener('pointerup', handlePointerUp)
        
        return () => {
            dragDropService?.destroy()
            window.removeEventListener('pointermove', handlePointerMove)
            window.removeEventListener('pointerup', handlePointerUp)
        }
    })

    function handlePointerDown(event: PointerEvent) {
        dragDropService?.handlePointerDown(event)
    }

    function handlePointerMove(event: PointerEvent) {
        dragDropService?.handlePointerMove(event)
    }

    function handlePointerUp() {
        dragDropService?.handlePointerUp()
    }

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
            case 'drag-handle':
                // 拖拽手柄的点击事件由 pointerdown 处理
                break
            default:
                // 点击节点文本或空白区域时选中节点
                setSelectedId(id)
        }
    }

    // 递归生成 HTML 字符串
    function renderNode(node: DomNode, level = 0, currentSelectedId: string | null): string {
        const padding = 16
        const nodeKey = node.dataId ?? node.id
        const isSelected = nodeKey === currentSelectedId
        const labelClass = `${isSelected ? 'node-label selected' : 'node-label'} ${node.hidden ? 'hidden' : ''}`
        const displayName = level === 0 ? '画布' : node.attributes?.name || node.tagName || '元素'
        const hasChildren = node.children && node.children.length
        const expandIcon = hasChildren ? (node.expanded ? '▼' : '▶') : ''
        const hideIcon = level === 0 ? '' : node.hidden ? '🙈' : '👁'
        const deleteIcon = level === 0 ? '' : '🗑'

        const childrenHtml = hasChildren && node.expanded ? node.children!.map((child: DomNode) => renderNode(child, level + 1, currentSelectedId)).join('') : ''

        return /*html*/ `
          <div class="tree-node" style="padding-left: calc(12px * var(--scale-ratio, 1));" data-id="${nodeKey}" data-level="${level}">
            <div class="node-content">
              <div class="node-left">
                <span class="icon expand" data-action="toggle-expand" data-id="${nodeKey}">${expandIcon}</span>
                ${level > 0 ? `<span class="icon drag-handle" data-action="drag-handle" data-id="${nodeKey}">⋮⋮</span>` : ''}
                <span class="node-id" data-id="${nodeKey}">${displayName}</span>
              </div>
              <div class="node-actions">
                ${level > 0 ? `<span class="icon action-btn hide-btn" data-action="toggle-hidden" data-id="${nodeKey}">${hideIcon}</span>` : ''}
                ${level > 0 ? `<span class="icon action-btn delete-btn" data-action="delete-node" data-id="${nodeKey}">${deleteIcon}</span>` : ''}
              </div>
            </div>
            ${childrenHtml}
          </div>
        `
    }

    const htmlString = $derived(() => (domTree ? renderNode(domTree, 0, selectedId()) : ''))
</script>

<!-- 容器使用事件委托监听 -->
<!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
<div class="tree-container" onclick={handleClick} onpointerdown={handlePointerDown} role="tree" tabindex="0">
    {@html htmlString()}
    <div bind:this={indicatorTop} class="drop-indicator"></div>
    <div bind:this={indicatorBottom} class="drop-indicator"></div>
</div>

<style>
    .tree-container {
        position: relative;
        padding: calc(12px * var(--scale-ratio, 1)) calc(8px * var(--scale-ratio, 1));
        font-size: calc(13px * var(--scale-ratio, 1));
        color: #cbd5e1;
        overflow-y: auto;
        height: 100%;
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }

    /* 现代树节点布局 */
    :global(.tree-node) {
        margin: calc(1px * var(--scale-ratio, 1)) 0;
    }

    :global(.node-content) {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: calc(6px * var(--scale-ratio, 1)) calc(8px * var(--scale-ratio, 1));
        border-radius: calc(6px * var(--scale-ratio, 1));
        transition: all 0.2s ease;
        min-height: calc(32px * var(--scale-ratio, 1));
        position: relative;
    }

    :global(.node-content:hover) {
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(10px);
    }

    :global(.node-left) {
        display: flex;
        align-items: center;
        gap: calc(8px * var(--scale-ratio, 1));
        flex: 1;
        min-width: 0;
    }

    :global(.node-actions) {
        display: flex;
        align-items: center;
        gap: calc(4px * var(--scale-ratio, 1));
        flex-shrink: 0;
    }

    /* 图标样式 */
    :global(.icon) {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: calc(20px * var(--scale-ratio, 1));
        height: calc(20px * var(--scale-ratio, 1));
        font-size: calc(12px * var(--scale-ratio, 1));
        cursor: pointer;
        border-radius: calc(4px * var(--scale-ratio, 1));
        transition: all 0.2s ease;
        user-select: none;
        flex-shrink: 0;
    }

    :global(.icon:hover) {
        background: rgba(255, 255, 255, 0.1);
        transform: scale(1.1);
    }

    :global(.expand) {
        color: #94a3b8;
        font-size: calc(10px * var(--scale-ratio, 1));
    }

    :global(.expand:hover) {
        color: #f8fafc;
        background: rgba(99, 102, 241, 0.2);
    }

    :global(.drag-handle) {
        color: #64748b;
        cursor: grab;
        font-size: calc(14px * var(--scale-ratio, 1));
        letter-spacing: calc(-2px * var(--scale-ratio, 1));
    }

    :global(.drag-handle:hover) {
        color: #e2e8f0;
        background: rgba(139, 92, 246, 0.2);
    }

    :global(.drag-handle:active) {
        cursor: grabbing;
    }

    :global(.action-btn) {
        color: #64748b;
        border-radius: calc(4px * var(--scale-ratio, 1));
        padding: calc(2px * var(--scale-ratio, 1));
    }

    :global(.action-btn:hover) {
        color: #f8fafc;
    }

    :global(.hide-btn:hover) {
        background: rgba(251, 191, 36, 0.2);
        color: #fbbf24;
    }

    :global(.delete-btn:hover) {
        background: rgba(239, 68, 68, 0.2);
        color: #f87171;
    }

    :global(.node-id) {
        color: #e2e8f0;
        font-weight: 500;
        cursor: pointer;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        transition: all 0.2s ease;
        padding: calc(2px * var(--scale-ratio, 1)) calc(4px * var(--scale-ratio, 1));
        border-radius: calc(4px * var(--scale-ratio, 1));
    }

    :global(.node-id:hover) {
        color: #f8fafc;
        background: rgba(255, 255, 255, 0.08);
    }

    :global(.node-id.selected) {
        background: rgba(99, 102, 241, 0.35);
        color: #e0e7ff;
        box-shadow: 0 0 calc(8px * var(--scale-ratio, 1)) rgba(99, 102, 241, 0.3);
    }

    :global(.node-id.hidden) {
        opacity: 0.5;
        text-decoration: line-through;
    }

    .drop-indicator {
        position: absolute;
        height: calc(2px * var(--scale-ratio, 1));
        background: linear-gradient(90deg, #6366f1, #8b5cf6);
        pointer-events: none;
        display: none;
        border-radius: calc(1px * var(--scale-ratio, 1));
        box-shadow: 0 0 calc(4px * var(--scale-ratio, 1)) rgba(99, 102, 241, 0.5);
    }

    .tree-container:focus {
        outline: none;
    }

    /* 滚动条样式 */
    .tree-container::-webkit-scrollbar {
        width: calc(6px * var(--scale-ratio, 1));
    }

    .tree-container::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.05);
        border-radius: calc(3px * var(--scale-ratio, 1));
    }

    .tree-container::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: calc(3px * var(--scale-ratio, 1));
        transition: background 0.2s ease;
    }

    .tree-container::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.3);
    }
</style>
