<!--
 * DragDropList.svelte
 * 支持拖拽功能的列表组件
 *
 * 功能特性：
 * - 可配置是否启用拖拽功能
 * - 支持横向和纵向布局
 * - 拖拽时提供视觉反馈
 * - 支持自定义列表项渲染
 * - 响应式设计，适配不同屏幕尺寸
 *
 * 使用方法：
 * 启用拖拽：
 * <DragDropList
 *   items={[{id: 1, text: '项目1'}, {id: 2, text: '项目2'}]}
 *   enableDrag={true}
 *   direction="vertical"
 *   onReorder={(items) => console.log('新顺序:', items)}
 * />
 *
 * 禁用拖拽：
 * <DragDropList
 *   items={[{id: 1, text: '项目1'}, {id: 2, text: '项目2'}]}
 *   enableDrag={false}
 *   direction="horizontal"
 * />
 *
 * 自定义渲染：
 * <DragDropList
 *   items={items}
 *   let:item
 *   let:index
 * >
 *   <div slot="item" let:item let:index>
 *     <h3>{item.title}</h3>
 *     <p>{item.description}</p>
 *   </div>
 * </DragDropList>
-->

<script lang="ts">
    import { dndzone } from 'svelte-dnd-action'
    import type { DndEvent } from 'svelte-dnd-action'
    import { flip } from 'svelte/animate'

    import ResponsiveBox from '../Core/ResponsiveBox.svelte'

    interface Props {
        items: any[]
        enableDrag?: boolean
        enableHierarchy?: boolean
        direction?: 'vertical' | 'horizontal'
        onReorder?: (items: any[]) => void
        onNodeToggle?: (item: any, expanded: boolean) => void
        style?: string
        itemStyle?: string
        dataId?: string
        children?: (item: any, index: number) => any
        [key: string]: any
    }

    let { items = [], enableDrag = true, enableHierarchy = false, direction = 'vertical', onReorder, onNodeToggle, style = '', itemStyle = '', dataId = '', children, ...rest }: Props = $props()

    // 拖拽事件处理
    function handleDndConsider(event: CustomEvent<DndEvent>) {
        items = event.detail.items
    }

    function handleDndFinalize(event: CustomEvent<DndEvent>) {
        items = event.detail.items
        if (onReorder) {
            onReorder(items)
        }
    }

    // 树形结构相关方法
    function toggleNode(item: any) {
        if (enableHierarchy && item.children) {
            item.expanded = !item.expanded
            if (onNodeToggle) {
                onNodeToggle(item, item.expanded)
            }
        }
    }

    function handleNodeReorder(items: any[], nodeId?: string) {
        if (nodeId) {
            // 更新特定节点的子节点
            const updateNode = (nodes: any[]): any[] => {
                return nodes.map((node) => {
                    if (node.id === nodeId) {
                        return { ...node, children: items }
                    }
                    if (node.children) {
                        return { ...node, children: updateNode(node.children) }
                    }
                    return node
                })
            }
            items = updateNode(items)
        } else {
            // 更新根节点
            items = items
        }

        if (onReorder) {
            onReorder(items)
        }
    }

    // 计算容器样式
    function getContainerStyle() {
        let baseStyle = `display: flex; gap: 10px; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 8px; ${style}`

        if (direction === 'horizontal') {
            baseStyle += '; flex-direction: row; flex-wrap: wrap;'
        } else {
            baseStyle += '; flex-direction: column;'
        }

        return baseStyle
    }

    // 计算项目样式
    function getItemStyle() {
        let baseItemStyle = `padding: 15px; background: rgba(255,255,255,0.2); border-radius: 6px; border: 1px solid rgba(255,255,255,0.3); color: white; cursor: ${enableDrag ? 'grab' : 'default'}; transition: all 0.3s ease; ${itemStyle}`

        if (direction === 'horizontal') {
            baseItemStyle += '; flex: 1; min-width: 120px; text-align: center;'
        } else {
            baseItemStyle += '; width: 100%;'
        }

        return baseItemStyle
    }

    // 拖拽时的样式
    function getDragStyle(isDragged: boolean) {
        if (isDragged) {
            return 'opacity: 0.5; transform: scale(1.05); box-shadow: 0 8px 25px rgba(0,0,0,0.3);'
        }
        return ''
    }
</script>

<ResponsiveBox style={getContainerStyle()} data-id={dataId} {...rest}>
    {#if enableHierarchy}
        <!-- 树形结构渲染 -->
        {#if enableDrag}
            <div
                style="width: 100%; height: 100%;"
                use:dndzone={{
                    items,
                    flipDurationMs: 300,
                    type: direction === 'horizontal' ? 'horizontal-list' : 'vertical-list'
                }}
                onconsider={handleDndConsider}
                onfinalize={handleDndFinalize}
            >
                {#each items as item, index (item.id || index)}
                    <div animate:flip={{ duration: 300 }}>
                        {@render renderTreeNode(item, index, 0)}
                    </div>
                {/each}
            </div>
        {:else}
            <div style="width: 100%; height: 100%;">
                {#each items as item, index (item.id || index)}
                    <div>
                        {@render renderTreeNode(item, index, 0)}
                    </div>
                {/each}
            </div>
        {/if}
    {:else}
        <!-- 普通列表渲染 -->
        {#if enableDrag}
            <div
                style="width: 100%; height: 100%;"
                use:dndzone={{
                    items,
                    flipDurationMs: 300,
                    type: direction === 'horizontal' ? 'horizontal-list' : 'vertical-list'
                }}
                onconsider={handleDndConsider}
                onfinalize={handleDndFinalize}
            >
                {#each items as item, index (item.id || index)}
                    <div animate:flip={{ duration: 300 }} style="{getItemStyle()} {getDragStyle(false)}" class="drag-item" data-index={index}>
                        {#if children}
                            {@render children(item, index)}
                        {:else}
                            <div style="display: flex; align-items: center; justify-content: space-between;">
                                <span style="font-weight: 500;">{item.text || item.name || `项目 ${index + 1}`}</span>
                                <span style="cursor: grab; font-size: 18px; color: rgba(255,255,255,0.7);">⋮⋮</span>
                            </div>
                        {/if}
                    </div>
                {/each}
            </div>
        {:else}
            <div style="width: 100%; height: 100%;">
                {#each items as item, index (item.id || index)}
                    <div style={getItemStyle()} class="drag-item" data-index={index}>
                        {#if children}
                            {@render children(item, index)}
                        {:else}
                            <div style="display: flex; align-items: center; justify-content: space-between;">
                                <span style="font-weight: 500;">{item.text || item.name || `项目 ${index + 1}`}</span>
                            </div>
                        {/if}
                    </div>
                {/each}
            </div>
        {/if}
    {/if}
</ResponsiveBox>

<!-- 递归渲染树节点的snippet -->
{#snippet renderTreeNode(item: any, index: number, level: number)}
    <div style="{getItemStyle()} {getDragStyle(false)}" class="drag-item tree-node" data-index={index}>
        <div style="display: flex; align-items: center; gap: 8px; padding-left: {level * 20}px;">
            <!-- 展开/折叠按钮 -->
            {#if item.children && item.children.length > 0}
                <button style="background: none; border: none; cursor: pointer; color: rgba(255,255,255,0.7); font-size: 16px;" onclick={() => toggleNode(item)}>
                    {item.expanded ? '▼' : '▶'}
                </button>
            {:else}
                <span style="width: 16px; display: inline-block;"></span>
            {/if}

            <!-- 内容区域 -->
            {#if children}
                {@render children(item, index)}
            {:else}
                <span style="font-weight: 500;">{item.text || item.name || `项目 ${index + 1}`}</span>
            {/if}

            {#if enableDrag}
                <span style="cursor: grab; font-size: 18px; color: rgba(255,255,255,0.7); margin-left: auto;">⋮⋮</span>
            {/if}
        </div>

        <!-- 子节点列表 -->
        {#if item.children && item.children.length > 0 && item.expanded}
            <div style="margin-left: 24px; margin-top: 8px;">
                {#if enableDrag}
                    <div
                        style="width: 100%;"
                        use:dndzone={{
                            items: item.children,
                            flipDurationMs: 300,
                            type: direction === 'horizontal' ? 'horizontal-list' : 'vertical-list'
                        }}
                        onconsider={(e: CustomEvent<DndEvent>) => {
                            item.children = e.detail.items
                        }}
                        onfinalize={(e: CustomEvent<DndEvent>) => {
                            item.children = e.detail.items
                            if (onReorder) onReorder(items)
                        }}
                    >
                        {#each item.children as child, childIndex (child.id || childIndex)}
                            <div animate:flip={{ duration: 300 }}>
                                {@render renderTreeNode(child, childIndex, level + 1)}
                            </div>
                        {/each}
                    </div>
                {:else}
                    <div style="width: 100%;">
                        {#each item.children as child, childIndex (child.id || childIndex)}
                            <div>
                                {@render renderTreeNode(child, childIndex, level + 1)}
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>
        {/if}
    </div>
{/snippet}

<style>
    .drag-item:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: translateY(-2px);
    }

    .drag-item:active {
        cursor: grabbing;
    }

    /* 拖拽时的样式覆盖 */
    :global(.dragged) {
        opacity: 0.5 !important;
        transform: scale(1.05) !important;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3) !important;
    }

    :global(.drag-preview) {
        background: rgba(59, 130, 246, 0.8) !important;
        color: white !important;
        border-radius: 6px !important;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2) !important;
    }

    .tree-node {
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        margin: 2px 0;
    }
</style>
