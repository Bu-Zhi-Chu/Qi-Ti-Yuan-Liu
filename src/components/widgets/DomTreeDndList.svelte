<!--
 * DomTreeDndList.svelte
 * DOM 映射列表组件（工作区左侧树形结构）- 支持拖拽
 *
 * 功能特性：
 * 1. 递归渲染 domTree 树形结构，展示层级关系。
 * 2. 点击节点即可选中，高亮同步到画布 DomCanvas（通过绑定 selectedId）。
 * 3. 支持拖拽改变节点顺序和父子关系。
 * 4. 拖拽时保持组件在画布中的视觉位置和尺寸不变。
 * 5. 根节点不参与拖拽。
 *
 * 使用示例：
 * <DomTreeDndList />
 -->

<script lang="ts">
    import { dndzone } from 'svelte-dnd-action'
    import type { DndEvent } from 'svelte-dnd-action'
    import { flip } from 'svelte/animate'
    import { 
        domTree, 
        selectedId, 
        setSelectedId, 
        toggleExpanded, 
        toggleHidden, 
        removeNodeById,
        reorderChildren,
        moveNodeToParent,
        findNodeById
    } from '../../services/repository/dom-tree.store.svelte'
    import type { DomNode } from '../../types/dom-node.types'

    /**
     * 事件委托处理器：根据 data-action 处理不同操作
     */
    function handleClick(event: MouseEvent) {
        const target = event.target as HTMLElement | null
        if (!target) return

        // 阻止冒泡以防止影响拖拽
        const closestAction = target.closest('[data-action]')
        if (closestAction) {
            event.stopPropagation()
        }

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

    /**
     * 处理节点拖拽 - 考虑阶段（预览）
     * 在此阶段用户正在拖动但尚未释放
     */
    function handleDndConsider(event: CustomEvent<DndEvent>, parentId: string) {
        if (parentId === 'root') return
        const parent = findNodeById(domTree, parentId)
        if (!parent || !parent.children) return

        // 更新父节点的子节点顺序（预览）
        const newItems = event.detail.items as DomNode[]
        parent.children = [...newItems]
    }

    /**
     * 处理节点拖拽 - 最终确认阶段
     * 在此阶段用户释放了拖拽项
     */
    function handleDndFinalize(event: CustomEvent<DndEvent>, parentId: string) {
        if (parentId === 'root') return

        // 获取新的子节点顺序并更新
        const newChildren = event.detail.items as DomNode[]
        reorderChildren(parentId, newChildren)
    }

    /**
     * 处理拖拽到新父节点
     * 如果是新增到父节点，通过比较原始子节点和新子节点列表来确定移动
     */
    function handleNodeDropToNewParent(item: DomNode, items: DomNode[], targetParentId: string) {
        // 阻止根节点被拖拽
        if (item.id === 'root' || item.dataId === 'root') return

        // 找出新增的节点（拖入的节点）
        const originalParent = findNodeById(domTree, targetParentId)
        if (!originalParent || !originalParent.children) return

        // 找出新增的节点ID
        const originalIds = new Set(originalParent.children.map(child => child.id))
        const newItemIds = items.map(item => item.id)
        
        // 找出新增的节点ID（在新列表中但不在原列表中）
        const addedIds = newItemIds.filter(id => !originalIds.has(id))
        if (addedIds.length !== 1) return // 应该只有一个新增节点

        const nodeId = addedIds[0]
        const insertIndex = newItemIds.indexOf(nodeId)
        
        // 移动节点到新父节点的指定位置
        moveNodeToParent(nodeId, targetParentId, insertIndex)
    }

    /**
     * 递归渲染单个节点及其子节点
     */
    function renderNode(node: DomNode, level = 0): string {
        const nodeId = node.dataId ?? node.id
        const isRoot = nodeId === 'root'
        const isSelected = nodeId === selectedId()
        const labelClass = `node-label ${isSelected ? 'selected' : ''} ${node.hidden ? 'hidden' : ''}`
        const displayName = isRoot ? '画布' : nodeId
        const hasChildren = node.children && node.children.length > 0
        const expandIcon = hasChildren ? (node.expanded ? '▼' : '▶') : ''
        const hideIcon = isRoot ? '' : (node.hidden ? '🙈' : '👁')
        const deleteIcon = isRoot ? '' : '🗑'
        const indent = level * 16

        return `
            <div class="tree-node" style="padding-left: calc(${indent}px * var(--scale-ratio, 1));">
                <div class="node-header">
                    ${expandIcon ? `<span class="icon expand" data-action="toggle-expand" data-id="${nodeId}">${expandIcon}</span>` : '<span class="icon placeholder"></span>'}
                    <span class="icon hide" data-action="toggle-hidden" data-id="${nodeId}">${hideIcon}</span>
                    <span class="icon delete" data-action="delete-node" data-id="${nodeId}">${deleteIcon}</span>
                    <span class="${labelClass}" data-id="${nodeId}">${displayName}</span>
                </div>
                ${hasChildren && node.expanded ? renderChildren(node, level + 1) : ''}
            </div>
        `
    }

    /**
     * 递归渲染节点的子节点列表
     * 为子节点添加拖拽功能
     */
    function renderChildren(node: DomNode, level: number): string {
        if (!node.children || node.children.length === 0) return ''
        const nodeId = node.dataId ?? node.id

        // 在根节点使用传统渲染（不可拖拽）
        if (nodeId === 'root') {
            return node.children.map(child => renderNode(child, level)).join('')
        }

        // 每个节点及其子节点都是独立的拖拽区域
        const childrenHtml: string = node.children.map(child => {
            const childId = child.dataId ?? child.id
            return `
                <div class="dnd-item" key="${childId}" data-id="${childId}">
                    ${renderNode(child, level)}
                </div>
            `
        }).join('')

        return `
            <div class="dnd-container" data-parent-id="${nodeId}">
                ${childrenHtml}
            </div>
        `
    }

    // 生成整个树的 HTML
    const htmlString = $derived(() => (domTree ? renderNode(domTree, 0) : ''))

    /**
     * 在挂载后初始化拖拽区域
     * 动态创建所有拖拽区域
     */
    function initDndZones(node: HTMLElement) {
    /** 初始化（或重新初始化）所有拖拽区域 */
    const setup = () => {
        const container = node // tree-container 根节点
        if (!container) return

        // 为所有拖拽容器添加 dndzone
        const dndContainers = container.querySelectorAll('.dnd-container')
            dndContainers.forEach(dndContainer => {
                const parentId = dndContainer.getAttribute('data-parent-id')
                if (!parentId) return

                // 获取当前节点的子节点
                const parent = findNodeById(domTree, parentId)
                if (!parent || !parent.children) return

                // 应用 dndzone action
                // @ts-ignore: svelte-dnd-action 类型问题
                dndzone(dndContainer, {
                    items: parent.children,
                    flipDurationMs: 300,
                    type: `node-${parentId}`,
                    dropFromOthersDisabled: false,
                    dropTargetStyle: {
                        outline: 'rgba(99, 102, 241, 0.7) dashed 2px',
                    }
                })

                // 添加事件监听器
                dndContainer.addEventListener('consider', (event: any) => {
                    handleDndConsider(event, parentId)
                })

                dndContainer.addEventListener('finalize', (event: any) => {
                    handleDndFinalize(event, parentId)
                    
                    // 检测是否是从其他列表拖入的节点
                    if (event.detail.info?.source !== `node-${parentId}`) {
                        handleNodeDropToNewParent(event.detail.item, event.detail.items, parentId)
                    }
                })
            })
        }

        // 初次执行，确保 HTML 已插入后再初始化
        setTimeout(setup, 0)

        // Svelte action 协议返回
        return {
            update() {
                setTimeout(setup, 0)
            },
            destroy() {
                /* dndzone 会自动清理 */
            }
        }
    }
</script>

<!-- 容器使用事件委托监听点击 -->
<!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
<div 
    class="tree-container" 
    onclick={handleClick} 
    role="tree" 
    tabindex="0"
    use:initDndZones
>
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

    /* 全局样式，通过 :global 设置，以便 {@html} 渲染的内容也能使用 */
    :global(.node-header) {
        display: flex;
        align-items: center;
        margin-bottom: calc(4px * var(--scale-ratio, 1));
    }

    :global(.node-label) {
        padding: calc(4px * var(--scale-ratio, 1)) calc(6px * var(--scale-ratio, 1));
        cursor: pointer;
        border-radius: calc(4px * var(--scale-ratio, 1));
        transition: background 0.2s ease;
        display: inline-block;
    }

    :global(.node-label:hover) {
        background: rgba(255, 255, 255, 0.1);
    }

    :global(.node-label.selected) {
        background: rgba(99, 102, 241, 0.35);
        color: #e0e7ff;
    }

    :global(.node-label.hidden) {
        opacity: 0.5;
        text-decoration: line-through;
    }

    :global(.icon) {
        cursor: pointer;
        margin-right: calc(4px * var(--scale-ratio, 1));
        font-size: calc(10px * var(--scale-ratio, 1));
        opacity: 0.7;
        width: calc(12px * var(--scale-ratio, 1));
        text-align: center;
    }

    :global(.icon:hover) {
        opacity: 1;
    }

    :global(.icon.placeholder) {
        visibility: hidden;
    }

    :global(.icon.expand) {
        cursor: pointer;
    }

    :global(.dnd-container) {
        margin-left: calc(10px * var(--scale-ratio, 1));
        padding: calc(2px * var(--scale-ratio, 1));
        transition: outline 0.2s;
    }

    :global(.dnd-item) {
        margin: calc(2px * var(--scale-ratio, 1)) 0;
        transition: transform 0.2s, box-shadow 0.2s;
    }

    :global(.dnd-item:hover) {
        position: relative;
        z-index: 1;
    }

    /* 拖拽中的视觉效果 */
    :global(.dnd-item.svelte-dnd-active) {
        background: rgba(99, 102, 241, 0.1);
        border-radius: calc(4px * var(--scale-ratio, 1));
    }

    :global(.dnd-item.svelte-dnd-dragged) {
        background: rgba(99, 102, 241, 0.2);
        box-shadow: 0 calc(2px * var(--scale-ratio, 1)) calc(5px * var(--scale-ratio, 1)) rgba(0, 0, 0, 0.2);
        opacity: 0.8;
    }
</style>