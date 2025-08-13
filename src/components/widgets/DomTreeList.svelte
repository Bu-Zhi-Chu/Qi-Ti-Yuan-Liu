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

    // 拖拽相关状态
    let draggingId: string | null = null
    let hoverTargetId: string | null = null
    let hoverZone: 'above' | 'inside' | 'below' | null = null

    // 指示线元素引用
    let indicatorTop: HTMLDivElement | null = null
    let indicatorBottom: HTMLDivElement | null = null

    function updateIndicators(rect: DOMRect, zone: 'above' | 'inside' | 'below') {
        if (!indicatorTop || !indicatorBottom) return
        const containerRect = indicatorTop.parentElement?.getBoundingClientRect()
        if (!containerRect) return
        const left = rect.left - containerRect.left
        const width = rect.width
        indicatorTop.style.left = `${left}px`
        indicatorTop.style.width = `${width}px`
        indicatorBottom.style.left = `${left}px`
        indicatorBottom.style.width = `${width}px`
        indicatorTop.style.top = `${rect.top - containerRect.top}px`
        indicatorBottom.style.top = `${rect.bottom - containerRect.top - 2}px`
        indicatorTop.style.display = zone === 'above' ? 'block' : 'none'
        indicatorBottom.style.display = zone === 'below' ? 'block' : 'none'
        if (zone === 'inside') {
            indicatorTop.style.display = 'none'
            indicatorBottom.style.display = 'none'
        }
    }

    function clearDragState() {
        draggingId = null
        hoverTargetId = null
        hoverZone = null
        if (indicatorTop) indicatorTop.style.display = 'none'
        if (indicatorBottom) indicatorBottom.style.display = 'none'
    }

    function handlePointerDown(event: PointerEvent) {
        const target = event.target as HTMLElement | null
        if (!target) return
        if (target.getAttribute('data-action') !== 'drag-handle') return
        draggingId = target.getAttribute('data-id')
        if (!draggingId) return
        event.preventDefault()
        window.addEventListener('pointermove', handlePointerMove)
        window.addEventListener('pointerup', handlePointerUp)
    }

    function handlePointerMove(event: PointerEvent) {
        if (!draggingId) return
        const el = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null
        if (!el) return
        const id = el.getAttribute('data-id') || el.closest('[data-id]')?.getAttribute('data-id')
        if (!id || id === 'root' || id === draggingId) return
        const nodeEl = el.closest('.tree-node') as HTMLElement | null
        if (!nodeEl) return
        const rect = nodeEl.getBoundingClientRect()
        const offsetY = event.clientY - rect.top
        let zone: 'above' | 'inside' | 'below'
        if (offsetY < rect.height / 3) zone = 'above'
        else if (offsetY > (rect.height * 2) / 3) zone = 'below'
        else zone = 'inside'

        hoverTargetId = id
        hoverZone = zone
        updateIndicators(rect, zone)
    }

    function handlePointerUp() {
        if (draggingId && hoverTargetId && hoverZone) {
            if (hoverZone === 'inside') {
                moveNode(draggingId, hoverTargetId)
            } else if (hoverZone === 'above') {
                insertNodeBefore(hoverTargetId, draggingId)
            } else if (hoverZone === 'below') {
                insertNodeAfter(hoverTargetId, draggingId)
            }
        }
        window.removeEventListener('pointermove', handlePointerMove)
        window.removeEventListener('pointerup', handlePointerUp)
        clearDragState()
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
        const hideIcon = level === 0 ? '' : node.hidden ? '🙈' : '👁'
        const deleteIcon = level === 0 ? '' : '🗑'

        const childrenHtml = hasChildren && node.expanded ? node.children!.map((child: DomNode) => renderNode(child, level + 1, currentSelectedId)).join('') : ''

        return /*html*/ `
          <div class="tree-node" style="padding-left: calc(${padding}px * var(--scale-ratio, 1));">
            <span class="icon expand" data-action="toggle-expand" data-id="${nodeKey}">${expandIcon}</span>
            <span class="icon hide" data-action="toggle-hidden" data-id="${nodeKey}">${hideIcon}</span>
            <span class="icon delete" data-action="delete-node" data-id="${nodeKey}">${deleteIcon}</span>
            <span class="icon drag-handle" data-action="drag-handle" data-id="${nodeKey}" style="cursor: grab;">⋮⋮</span>
            <span class="${labelClass}" data-id="${nodeKey}">${displayName}</span>
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

    .drop-indicator {
        position: absolute;
        height: 2px;
        background: #6366f1;
        pointer-events: none;
        display: none;
    }

    .tree-container:focus {
        outline: none;
    }
</style>
