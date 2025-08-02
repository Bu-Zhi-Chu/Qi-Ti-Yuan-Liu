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
 * 菜单模式：
 * <DragDropList
 *   items={[{id: 1, name: '菜单1', icon: '📋'}, {id: 2, name: '菜单2', icon: '⚙️'}]}
 *   onMenuClick={(id) => console.log('点击菜单:', id)}
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
    import SimpleBox from '../Core/SimpleBox.svelte'

    interface Props {
        items: any[]
        enableDrag?: boolean
        enableHierarchy?: boolean
        direction?: 'vertical' | 'horizontal'
        onReorder?: (items: any[]) => void
        onNodeToggle?: (item: any, expanded: boolean) => void
        onMenuClick?: (itemId: string) => void
        onSelect?: (itemId: string) => void
        selectedId?: string
        style?: string
        itemStyle?: string
        dataId?: string
        children?: (item: any, index: number) => any
        [key: string]: any
    }

    let { items = [], enableDrag = true, enableHierarchy = false, direction = 'vertical', onReorder, onNodeToggle, onMenuClick, onSelect, selectedId, style = '', itemStyle = '', dataId = '', children, ...rest }: Props = $props()

    // 拖拽事件处理
    function handleDndConsider(event: CustomEvent<DndEvent>) {
        items = [...event.detail.items]
    }

    function handleDndFinalize(event: CustomEvent<DndEvent>) {
        items = [...event.detail.items]
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
        let baseStyle = `display: flex; gap: calc(10px * var(--scale-ratio, 1)); padding: calc(10px * var(--scale-ratio, 1)); background: rgba(255,255,255,0.1); border-radius: calc(8px * var(--scale-ratio, 1)); ${style}`

        if (direction === 'horizontal') {
            baseStyle += '; flex-direction: row; flex-wrap: wrap;'
        } else {
            baseStyle += '; flex-direction: column;'
        }

        return baseStyle
    }

    // 计算统一的项目样式
    function getItemStyle(isSelected: boolean = false) {
        let baseItemStyle = `padding: calc(5px * var(--scale-ratio, 1)) calc(8px * var(--scale-ratio, 1)); margin: calc(2px * var(--scale-ratio, 1)) 0; background: rgba(99, 102, 241, 0.1); border: calc(1px * var(--scale-ratio, 1)) solid rgba(99, 102, 241, 0.2); border-radius: calc(4px * var(--scale-ratio, 1)); color: #e2e8f0; cursor: ${enableDrag ? 'grab' : 'default'}; transition: all 0.2s ease; ${itemStyle}`

        if (isSelected) {
            baseItemStyle += '; background: rgba(99, 102, 241, 0.3); border-color: rgba(99, 102, 241, 0.5); box-shadow: 0 0 calc(10px * var(--scale-ratio, 1)) rgba(99, 102, 241, 0.3);'
        }

        if (direction === 'horizontal') {
            baseItemStyle += '; flex: 1; min-width: calc(120px * var(--scale-ratio, 1)); text-align: center;'
        } else {
            baseItemStyle += '; width: 100%;'
        }

        return baseItemStyle
    }

    // 拖拽时的样式
    function getDragStyle(isDragged: boolean) {
        if (isDragged) {
            return 'opacity: 0.5; transform: scale(1.05); box-shadow: 0 calc(8px * var(--scale-ratio, 1)) calc(25px * var(--scale-ratio, 1)) rgba(0,0,0,0.3);'
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
                    <div animate:flip={{ duration: 300 }} style="{getItemStyle(selectedId === item.id)} {getDragStyle(false)}" class="drag-item" data-index={index}>
                        {@render renderItemContent(item, index)}
                    </div>
                {/each}
            </div>
        {:else}
            <div style="width: 100%; height: 100%;">
                {#each items as item, index (item.id || index)}
                    <div style={getItemStyle(selectedId === item.id)} class="drag-item" data-index={index}>
                        {@render renderItemContent(item, index)}
                    </div>
                {/each}
            </div>
        {/if}
    {/if}
</ResponsiveBox>

<!-- 统一的项目内容渲染snippet -->
{#snippet renderItemContent(item: any, index: number)}
    {#if children}
        {@render children(item, index)}
    {:else}
        <button
            style="display: flex; align-items: center; width: 100%; background: none; border: none; cursor: pointer; position: relative; padding: calc(5px * var(--scale-ratio, 1)) calc(8px * var(--scale-ratio, 1)); "
            onclick={() => {
                if (onSelect) {
                    onSelect(item.id)
                } else if (onMenuClick) {
                    onMenuClick(item.id)
                } else if (onReorder) {
                    // 如果没有onMenuClick但有onReorder，可以触发点击事件
                    // console.log('Item clicked:', item.id)
                }
            }}
            onkeydown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    if (onSelect) {
                        onSelect(item.id)
                    } else if (onMenuClick) {
                        // console.log('Item clicked:', item.id)
                    } else if (onReorder) {
                        // console.debug('Item clicked:', item.id)
                    }
                }
            }}
            tabindex="0"
        >
            <SimpleBox style="display: flex; align-items: center; justify-content: flex-start; width: 100%;">
                {#if item.icon}
                    <SimpleBox style="width:0; font-size: calc(14px * var(--scale-ratio, 1)); color: {item.style?.color || 'white'}; margin-right: calc(4px * var(--scale-ratio, 1));">{item.icon}</SimpleBox>
                    <SimpleBox style="width:60%; font-weight: 500; font-size: calc(12px * var(--scale-ratio, 1)); color: {item.style?.color || 'white'};">{item.name || item.text || `项目 ${index + 1}`}</SimpleBox>
                {:else}
                    <SimpleBox style="width:100%; font-weight: 500; font-size: calc(12px * var(--scale-ratio, 1)); color: {item.style?.color || 'white'};">{item.name || item.text || `项目 ${index + 1}`}</SimpleBox>
                {/if}
            </SimpleBox>
            {#if selectedId === item.id}
                <SimpleBox style="position: absolute; right: calc(12px * var(--scale-ratio, 1)); width: calc(6px * var(--scale-ratio, 1)); height: calc(6px * var(--scale-ratio, 1)); background: #6366f1; border-radius: 50%;"></SimpleBox>
            {/if}
        </button>
    {/if}
{/snippet}

<!-- 递归渲染树节点的snippet -->
{#snippet renderTreeNode(item: any, index: number, level: number)}
    <SimpleBox style="{getItemStyle(selectedId === item.id)} {getDragStyle(false)}" class="drag-item tree-node" data-index={index}>
        <SimpleBox style="display: flex; align-items: center; gap: calc(8px * var(--scale-ratio, 1)); padding-left: calc(${level} * 20px * var(--scale-ratio, 1));">
            <!-- 展开/折叠按钮 -->
            {#if item.children && item.children.length > 0}
                <button style="background: none; border: none; cursor: pointer; color: rgba(255,255,255,0.7); font-size: calc(16px * var(--scale-ratio, 1));" onclick={() => toggleNode(item)}>
                    {item.expanded ? '▼' : '▶'}
                </button>
            {:else}
                <SimpleBox style="width: calc(16px * var(--scale-ratio, 1)); display: inline-block;"></SimpleBox>
            {/if}

            <!-- 内容区域 -->
            {@render renderItemContent(item, index)}

            {#if enableDrag}
                <SimpleBox style="cursor: grab; font-size: calc(18px * var(--scale-ratio, 1)); color: rgba(255,255,255,0.7); margin-left: auto;">⋮⋮</SimpleBox>
            {/if}
        </SimpleBox>

        <!-- 子节点列表 -->
        {#if item.children && item.children.length > 0 && item.expanded}
            <SimpleBox style="margin-left: calc(24px * var(--scale-ratio, 1)); margin-top: calc(8px * var(--scale-ratio, 1));">
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
            </SimpleBox>
        {/if}
    </SimpleBox>
{/snippet}

<style>
    .drag-item:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: translateY(calc(-2px * var(--scale-ratio, 1)));
    }

    .drag-item:active {
        cursor: grabbing;
    }
</style>
