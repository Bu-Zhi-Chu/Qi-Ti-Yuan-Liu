<!--
 * DomTreeList.svelte
 * DOM 映射列表组件（工作区左侧树形结构）
 *
 * 功能特性：
 * 1. 递归渲染 domTree 树形结构，展示层级关系。
 * 2. 点击节点即可选中，高亮同步到画布 DomCanvas（通过绑定 selectedId）。
 * 3. 使用事件委托 (on:click) + id 属性，避免在大量节点上注册监听器。
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
        searchQuery?: string
    }

    /** DOM 节点类型 */
    import type { DomNode } from '../../types/dom-node.types'
</script>

<script lang="ts">
    import { domTree, selectedId, setSelectedId, toggleExpanded, toggleHidden, toggleLocked, removeNodeById, moveNode, insertNodeBefore, insertNodeAfter, updateNodeName } from '../../services/repository/dom-tree.store.svelte'

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

        // 检查是否点击了操作按钮（SVG图标或按钮区域）
        const actionButton = target.closest('[data-action]') as HTMLElement | null
        if (actionButton) {
            const action = actionButton.getAttribute('data-action')
            const id = actionButton.getAttribute('id') || actionButton.closest('[id]')?.getAttribute('id')
            if (!id) return

            event.stopPropagation() // 阻止事件冒泡
            switch (action) {
                case 'toggle-hidden':
                    toggleHidden(id)
                    break
                case 'toggle-locked':
                    toggleLocked(id)
                    break
                case 'delete-node':
                    removeNodeById(id).then((success) => {
                        // removeNodeById内部已经处理了选中根节点的逻辑
                    })
                    break
                case 'drag-handle':
                    // 拖拽手柄的点击事件由 pointerdown 处理
                    break
            }
            return // 已经处理了操作按钮，直接返回
        }

        // 只有点击节点内容区域时才选中节点
        const nodeContent = target.closest('.node-content') as HTMLElement | null
        if (nodeContent) {
            const id = nodeContent.parentElement?.getAttribute('id') || nodeContent.closest('[id]')?.getAttribute('id')
            if (id) {
                setSelectedId(id).catch(console.error)
            }
        }
    }

    /** 双击事件：展开/收起节点 */
    function handleDoubleClick(event: MouseEvent) {
        const target = event.target as HTMLElement | null
        if (!target) return

        // 如果双击发生在操作按钮或者拖拽手柄上，则不执行折叠/展开
        if (target.closest('.action-btn') || target.closest('.drag-handle')) {
            return
        }

        const nodeContent = target.closest('.node-content')
        if (!nodeContent) return

        const id = nodeContent.parentElement?.getAttribute('id')
        if (!id) return

        // 双击节点内容时展开/收起
        toggleExpanded(id)
    }

    // 递归生成 HTML 字符串
    const { searchQuery = '' } = $props<{ searchQuery?: string }>()

    // 当前正在编辑的节点 ID 和临时文本
    let editingNodeId: string | null = $state(null)
    let editingText: string = $state('')
    let originalName: string = ''

    /** 按 F2 进入编辑模式 */
    function startEdit(nodeId: string, currentName: string) {
        if (nodeId === 'root') return // ✅ 根节点禁止重命名
        editingNodeId = nodeId
        editingText = currentName
        originalName = currentName
        queueMicrotask(() => {
            const input = document.querySelector<HTMLInputElement>(`#edit-${nodeId}`)
            input?.focus()
            input?.select()
        })
    }

    /** 确认更新名称 */
    async function confirmEdit() {
        if (!editingNodeId) return
        // 实时读取输入框当前值
        const input = document.querySelector<HTMLInputElement>(`#edit-${editingNodeId}`)
        const newName = input?.value.trim()
        if (newName) {
            await updateNodeName(editingNodeId, newName)
        }
        cancelEdit()
    }

    /** 取消编辑 */
    function cancelEdit() {
        editingNodeId = null
        editingText = ''
        originalName = ''
    }

    /** 键盘事件：Enter 确认，Escape 取消 */
    function handleEditKeydown(event: KeyboardEvent) {
        switch (event.key) {
            case 'Enter':
                confirmEdit()
                break
            case 'Escape':
                cancelEdit()
                break
        }
    }

    /** 全局键盘监听：F2 进入编辑 */
    $effect(() => {
        function onKeyDown(e: KeyboardEvent) {
            if (e.key === 'F2' && selectedId()) {
                e.preventDefault()
                const node = findNodeById(domTree, selectedId()!)
                if (node) {
                    const name = node.attributes?.['data-name'] || node.componentType || '元素'
                    startEdit(selectedId()!, name)
                }
            }
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    })

    // 辅助：根据 id 找到节点
    function findNodeById(tree: DomNode, id: string): DomNode | null {
        if (tree.id === id) return tree
        if (tree.children) {
            for (const child of tree.children) {
                const found = findNodeById(child, id)
                if (found) return found
            }
        }
        return null
    }

    function containsLocked(node: DomNode): boolean {
        if (node.locked) return true
        if (node.children) {
            return node.children.some((child: DomNode) => containsLocked(child))
        }
        return false
    }

    function shouldInclude(node: DomNode, q: string): boolean {
        if (!q) return true
        const displayName = (node.attributes?.['data-name'] || node.componentType || (node.attributes as any)?.type || '元素').toString().toLowerCase()
        if (displayName.includes(q)) return true
        if (node.children) {
            return node.children.some((child) => shouldInclude(child, q))
        }
        return false
    }

    function renderNode(node: DomNode, level = 0, currentSelectedId: string | null, qLower = searchQuery.toLowerCase()): string {
        if (!shouldInclude(node, qLower)) return ''
        const padding = 16
        const nodeKey = node.id
        const isSelected = nodeKey === currentSelectedId
        const displayName = level === 0 ? '画布' : node.attributes?.['data-name'] || node.componentType || (node.attributes as any)?.type || '元素'
        const nameHtml =
            editingNodeId === nodeKey
                ? `
              <span class="edit-wrapper" onclick="event.stopPropagation()">
                <input id="edit-${nodeKey}" type="text" value="${editingText}" class="edit-input"
                       onkeydown="handleEditKeydown(event)" />
                <button class="edit-btn ok" onclick="confirmEdit()" title="确认">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20 6L9 17l-5-5"></path>
                  </svg>
                </button>
                <button class="edit-btn cancel" onclick="cancelEdit()" title="取消">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </span>
            `
                : `<span class="node-name" title="${displayName}">${displayName}</span>`
        const hasChildren = node.children && node.children.length

        const childrenHtml = hasChildren && node.expanded ? node.children!.map((child: DomNode) => renderNode(child, level + 1, currentSelectedId)).join('') : ''

        // 使用 Lucide 图标库的 SVG 图标替换 emoji
        const dragHandleSvg =
            level === 0
                ? ''
                : `
          <svg class="icon drag-handle" data-action="drag-handle" id="${nodeKey}" title="拖拽排序" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="9" cy="12" r="1"></circle>
            <circle cx="9" cy="5" r="1"></circle>
            <circle cx="9" cy="19" r="1"></circle>
            <circle cx="15" cy="12" r="1"></circle>
            <circle cx="15" cy="5" r="1"></circle>
            <circle cx="15" cy="19" r="1"></circle>
          </svg>
        `

        const lockIconSvg =
            level === 0
                ? ''
                : node.locked
                  ? `
          <svg class="icon action-btn lock-btn" data-action="toggle-locked" id="${nodeKey}" title="解锁元素" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        `
                  : `
          <svg class="icon action-btn lock-btn" data-action="toggle-locked" id="${nodeKey}" title="锁定元素" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 11V7a5 5 0 0 0-10 0v4"></path>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          </svg>
        `

        const hideIconSvg =
            level === 0
                ? ''
                : node.hidden
                  ? `
          <svg class="icon action-btn hide-btn" data-action="toggle-hidden" id="${nodeKey}" title="显示元素" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path>
            <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path>
            <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path>
            <line x1="2" x2="22" y1="2" y2="22"></line>
          </svg>
        `
                  : `
          <svg class="icon action-btn hide-btn" data-action="toggle-hidden" id="${nodeKey}" title="隐藏元素" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        `

        const deleteIconSvg =
            level === 0
                ? ''
                : containsLocked(node)
                  ? `
           <svg class="icon action-btn delete-btn placeholder" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="visibility:hidden; pointer-events:none;">
             <path d="M3 6h18"></path>
             <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
             <path d="M10 11v6"></path>
             <path d="M14 11v6"></path>
           </svg>
         `
                  : `
           <svg class="icon action-btn delete-btn" data-action="delete-node" id="${nodeKey}" title="删除元素" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
             <path d="M3 6h18"></path>
             <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
             <path d="M10 11v6"></path>
             <path d="M14 11v6"></path>
           </svg>
         `

        return /*html*/ `
          <div class="tree-node" style="padding-left: calc(16px * var(--scale-ratio, 1));" id="${nodeKey}" data-level="${level}">
            <div class="node-content ${isSelected ? 'selected' : ''} ${node.hidden ? 'hidden' : ''} ${hasChildren && !node.expanded ? 'collapsed' : ''}">
              <div class="node-left">
                ${dragHandleSvg}
                ${nameHtml}
              </div>
              <div class="node-actions">
                ${lockIconSvg}
                ${hideIconSvg}
                ${deleteIconSvg}
              </div>
            </div>
            ${childrenHtml}
          </div>
        `
    }

    const htmlString = $derived(() => (domTree ? renderNode(domTree, 0, selectedId()) : ''))
    $effect(() => {
        // 暴露到全局供字符串模板里的 onclick/onkeydown 使用
        ;(window as any).confirmEdit = confirmEdit
        ;(window as any).cancelEdit = cancelEdit
        ;(window as any).handleEditKeydown = handleEditKeydown
        return () => {
            delete (window as any).confirmEdit
            delete (window as any).cancelEdit
            delete (window as any).handleEditKeydown
        }
    })

    // 点击外部关闭重命名模式
    function handleClickOutside(event: MouseEvent) {
        const target = event.target as HTMLElement
        const isInsideEditBox = target.closest('.edit-wrapper')
        const isInsideNodeItem = target.closest('.node-item') as HTMLElement | null

        // 如果点击的不是当前编辑节点，也不是编辑框内部，则关闭编辑
        if (!isInsideEditBox && (!isInsideNodeItem || isInsideNodeItem.dataset?.id !== editingNodeId)) {
            cancelEdit()
        }
    }

    // 监听全局点击事件
    import { onMount } from 'svelte'
    onMount(() => {
        document.addEventListener('click', handleClickOutside)
        return () => {
            document.removeEventListener('click', handleClickOutside)
        }
    })
</script>

<!-- 容器使用事件委托监听 -->
<!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
<div class="tree-container" onclick={handleClick} ondblclick={handleDoubleClick} onpointerdown={handlePointerDown} role="tree" tabindex="0">
    {@html htmlString()}
    <div bind:this={indicatorTop} class="drop-indicator"></div>
    <div bind:this={indicatorBottom} class="drop-indicator"></div>
</div>

<style>
    .tree-container {
        position: relative;
        padding: calc(12px * var(--scale-ratio, 1)) calc(px * var(--scale-ratio, 1));
        padding-right: calc(16px * var(--scale-ratio, 1));
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
        padding: calc(6px * var(--scale-ratio, 1)) calc(4px * var(--scale-ratio, 1));
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
        margin-right: 5%;
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

    :global(.drag-handle.disabled) {
        color: #475569;
        cursor: not-allowed;
        opacity: 0.5;
    }

    :global(.drag-handle.disabled:hover) {
        background: none;
        transform: none;
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

    :global(.lock-btn:hover) {
        background: rgba(59, 130, 246, 0.2);
        color: #60a5fa;
    }

    :global(.node-name) {
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

    :global(.node-name:hover) {
        color: #f8fafc;
        background: rgba(255, 255, 255, 0.08);
    }

    /* ========= 行内编辑框样式（自适应） ========= */
    :global(.edit-wrapper) {
        display: inline-flex;
        align-items: center;
        background: #1e293b;
        border: calc(1px * var(--scale-ratio, 1)) solid #475569;
        border-radius: calc(4px * var(--scale-ratio, 1));
        overflow: hidden;
    }

    :global(.edit-input) {
        background: transparent;
        color: #e2e8f0;
        border: none;
        padding: calc(2px * var(--scale-ratio, 1)) calc(4px * var(--scale-ratio, 1));
        font-size: calc(13px * var(--scale-ratio, 1));
        font-family: inherit;
        width: calc(100px * var(--scale-ratio, 1));
        outline: none;
    }

    :global(.edit-btn) {
        background: none;
        border: none;
        cursor: pointer;
        color: #94a3b8;
        padding: calc(2px * var(--scale-ratio, 1));
        display: flex;
        align-items: center;
        transition: color 0.15s ease;
    }

    :global(.edit-btn svg) {
        width: calc(14px * var(--scale-ratio, 1));
        height: calc(14px * var(--scale-ratio, 1));
    }

    :global(.edit-btn:hover) {
        color: #e2e8f0;
    }

    :global(.edit-btn.ok:hover) {
        color: #22c55e; /* 绿色确认 */
    }

    :global(.edit-btn.cancel:hover) {
        color: #ef4444; /* 红色取消 */
    }

    :global(.edit-input:focus) {
        border-color: #6366f1;
    }

    :global(.edit-btn) {
        background: none;
        border: none;
        cursor: pointer;
        font-size: calc(12px * var(--scale-ratio, 1));
        padding: 0 calc(4px * var(--scale-ratio, 1));
        transition: transform 0.1s ease;
    }

    :global(.edit-btn:hover) {
        transform: scale(1.2);
    }

    :global(.node-content.selected) {
        background: rgba(99, 102, 241, 0.35) !important;
        color: #e0e7ff;
        box-shadow: 0 0 calc(8px * var(--scale-ratio, 1)) rgba(99, 102, 241, 0.3);
        border-left: calc(3px * var(--scale-ratio, 1)) solid #6366f1;
    }

    :global(.node-content.hidden) {
        opacity: 0.5;
    }

    /* 收起状态的阴影提示 */
    :global(.node-content.collapsed) {
        box-shadow: 0 calc(2px * var(--scale-ratio, 1)) calc(8px * var(--scale-ratio, 1)) rgba(0, 0, 0, 0.3);
        border-bottom: calc(2px * var(--scale-ratio, 1)) solid rgba(100, 116, 139, 0.5);
    }

    :global(.node-content.collapsed:hover) {
        box-shadow: 0 calc(4px * var(--scale-ratio, 1)) calc(12px * var(--scale-ratio, 1)) rgba(0, 0, 0, 0.4);
        border-bottom-color: rgba(100, 116, 139, 0.8);
    }

    :global(.node-content.selected .node-id) {
        color: #e0e7ff;
    }

    /* 锁定节点在选中时仍保持蓝色文字 */
    :global(.node-content.selected .node-id.locked) {
        color: #60a5fa;
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
