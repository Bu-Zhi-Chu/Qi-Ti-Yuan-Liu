<!--
 * TabbedPanel.svelte
 * 页签式面板组件 - 左侧节点列表面板
 *
 * 功能特性：
 * 1. 上方页签式导航，包含"节点列表"和"节点仓库"两个页签
 * 2. 节点列表为默认选中的第一个页签
 * 3. 节点仓库为第二个页签，用于展示可用组件
 * 4. 响应式设计，适配不同屏幕尺寸
 * 5. 平滑的页签切换动画
 *
 * 使用示例：
 * <TabbedPanel />
 -->

<script lang="ts">
    import { domTree, selectedId, setSelectedId } from '../../services/repository/dom-tree.store.svelte'
    import DomTreeList from './DomTreeList.svelte'
    import blocksConfig from '../blocks/blocks.config.json'
    import { onMount } from 'svelte'
    import { filterDomTreeBySearch } from '../../services/repository/dom-tree.store.svelte'

    // 当前激活的页签
    let activeTab = $state<'nodes' | 'warehouse'>('nodes')

    // 仓库项类型声明
    interface WarehouseItem {
        id: string
        name: string
        type: string
        preview: string
        presetStyles?: Record<string, any>
    }

    // 节点仓库数据
    let warehouseItems = $state<WarehouseItem[]>([])

    // ---- 移除统一搜索关键字，改用各页签独立关键字 ----
    let nodeSearchQuery = $state('')
    let warehouseSearchQuery = $state('')

    // 过滤后的仓库组件列表（仅使用仓库搜索关键字）
    let filteredWarehouseItems = $derived(() => warehouseItems.filter((item: WarehouseItem) => item.name.toLowerCase().includes(warehouseSearchQuery.toLowerCase()) || item.type.toLowerCase().includes(warehouseSearchQuery.toLowerCase())))

    function handleSearch(query: string) {
        if (activeTab === 'nodes') {
            nodeSearchQuery = query
            filterDomTreeBySearch(nodeSearchQuery)
        } else {
            warehouseSearchQuery = query
        }
    }
    onMount(() => {
        activeTab = 'nodes'
        // 初始化节点仓库数据 - 从blocks.config.json加载可用组件
        warehouseItems = blocksConfig.map((block: any) => ({
            id: block.type,
            name: block.nameZh,
            type: block.type,
            preview: block.preview,
            presetStyles: block.presetStyles || {}
        }))
    })

    // 切换到节点列表页签
    function switchToNodes() {
        activeTab = 'nodes'
    }

    // 切换到节点仓库页签
    function switchToWarehouse() {
        activeTab = 'warehouse'
    }

    // 从仓库添加节点到画布
    function addNodeFromWarehouse(item: any) {
        // TODO: 实现添加节点逻辑
        console.log('添加节点:', item)
    }

    function handleDragStart(e: DragEvent, item: WarehouseItem) {
        if (!e.dataTransfer) return
        const payload = {
            type: item.type,
            name: item.name,
            presetStyles: item.presetStyles ?? {}
        }
        e.dataTransfer.setData('application/json', JSON.stringify(payload))
        e.dataTransfer.effectAllowed = 'copy'
    }
</script>

<!-- 页签式面板容器 -->
<div class="tabbed-panel">
    <!-- 页签导航栏 -->
    <div class="tab-nav">
        <button class="tab-button {activeTab === 'nodes' ? 'active' : ''}" onclick={switchToNodes} type="button">节点列表</button>
        <button class="tab-button {activeTab === 'warehouse' ? 'active' : ''}" onclick={switchToWarehouse} type="button">节点仓库</button>
    </div>

    <!-- duplicate tab-content removed -->
    <!-- 搜索栏 -->
    <div class="search-bar">
        <input
            type="search"
            placeholder="搜索节点或组件..."
            value={activeTab === 'nodes' ? nodeSearchQuery : warehouseSearchQuery}
            oninput={(e) => handleSearch((e.target as HTMLInputElement).value)}
            style="width: 100%; padding:calc(8px * var(--scale-ratio, 1)) calc(16px * var(--scale-ratio, 1)); background: rgba(30, 41, 59, 0.5); border: calc(1px * var(--scale-ratio, 1)) solid rgba(99, 102, 241, 0.2); border-radius: calc(8px * var(--scale-ratio, 1)); color: #e2e8f0; font-size: calc(14px * var(--scale-ratio, 1)); outline: none; transition: border-color 0.2s ease;"
            onfocus={(e) => ((e.target as HTMLInputElement).style.borderColor = '#6366f1')}
            onblur={(e) => ((e.target as HTMLInputElement).style.borderColor = 'rgba(99, 102, 241, 0.2)')}
            autocomplete="off"
        />
    </div>

    <!-- 页签内容区域 -->
    <div class="tab-content">
        <!-- 节点列表页签 -->
        {#if activeTab === 'nodes'}
            <div class="tab-pane nodes-pane">
                <DomTreeList searchQuery={nodeSearchQuery} />
            </div>
        {/if}

        <!-- 节点仓库页签 -->
        {#if activeTab === 'warehouse'}
            <div class="tab-pane warehouse-pane">
                <div class="warehouse-grid">
                    {#each filteredWarehouseItems() as item (item.id)}
                        <button class="warehouse-item" draggable="true" ondragstart={(e) => handleDragStart(e, item)} onclick={() => addNodeFromWarehouse(item)} type="button">
                            <div class="item-icon">
                                <img src={item.preview} alt={item.name} width="32" height="32" />
                            </div>
                            <div class="item-name">{item.name}</div>
                            <div class="item-type">{item.type}</div>
                        </button>
                    {/each}
                </div>
            </div>
        {/if}
    </div>
</div>

<style>
    .tabbed-panel {
        height: 100%;
        display: flex;
        flex-direction: column;
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
        border-right: calc(1px * var(--scale-ratio, 1)) solid rgba(99, 102, 241, 0.2);
    }

    /* 页签导航栏样式 */
    .tab-nav {
        display: flex;
        background: rgba(15, 23, 42, 0.8);
        border-bottom: calc(1px * var(--scale-ratio, 1)) solid rgba(99, 102, 241, 0.2);
        backdrop-filter: blur(calc(10px * var(--scale-ratio, 1)));
    }

    .tab-button {
        flex: 1;
        padding: calc(12px * var(--scale-ratio, 1)) calc(16px * var(--scale-ratio, 1));
        background: none;
        border: none;
        color: #94a3b8;
        font-size: calc(13px * var(--scale-ratio, 1));
        font-weight: 500;
        cursor: pointer;
        transition: all 0.3s ease;
        border-bottom: calc(2px * var(--scale-ratio, 1)) solid transparent;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: calc(6px * var(--scale-ratio, 1));
    }

    .tab-button:hover {
        color: #e2e8f0;
        background: rgba(99, 102, 241, 0.1);
    }

    .tab-button.active {
        color: #6366f1;
        border-bottom-color: #6366f1;
        background: rgba(99, 102, 241, 0.15);
    }

    /* 页签内容区域样式 */
    .tab-content {
        flex: 1;
        overflow: hidden;
        position: relative;
    }

    .tab-pane {
        height: 100%;
        overflow-y: auto;
    }

    /* 节点仓库样式 */
    .warehouse-pane {
        padding: calc(16px * var(--scale-ratio, 1));
    }

    .warehouse-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr); /* 每行固定两个 */
        gap: calc(12px * var(--scale-ratio, 1));
    }

    .warehouse-item {
        background: rgba(30, 41, 59, 0.6);
        border: calc(1px * var(--scale-ratio, 1)) solid rgba(99, 102, 241, 0.2);
        border-radius: calc(8px * var(--scale-ratio, 1));
        padding: calc(12px * var(--scale-ratio, 1)) calc(8px * var(--scale-ratio, 1));
        text-align: center;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: calc(4px * var(--scale-ratio, 1));
    }

    .warehouse-item:hover {
        background: rgba(99, 102, 241, 0.2);
        border-color: #6366f1;
        transform: translateY(calc(-2px * var(--scale-ratio, 1)));
        box-shadow: 0 calc(4px * var(--scale-ratio, 1)) calc(12px * var(--scale-ratio, 1)) rgba(99, 102, 241, 0.3);
    }

    .item-icon {
        margin-bottom: calc(4px * var(--scale-ratio, 1));
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .item-icon img {
        width: calc(32px * var(--scale-ratio, 1));
        height: calc(32px * var(--scale-ratio, 1));
        object-fit: contain;
    }

    .item-name {
        color: #e2e8f0;
        font-size: calc(11px * var(--scale-ratio, 1));
        font-weight: 500;
        line-height: 1.2;
    }

    .item-type {
        color: #64748b;
        font-size: calc(9px * var(--scale-ratio, 1));
        line-height: 1.2;
    }

    /* 滚动条样式 */
    .tab-pane::-webkit-scrollbar {
        width: calc(6px * var(--scale-ratio, 1));
    }

    .tab-pane::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.05);
        border-radius: calc(3px * var(--scale-ratio, 1));
    }

    .tab-pane::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: calc(3px * var(--scale-ratio, 1));
    }

    .tab-pane::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.3);
    }

    .search-bar {
        padding: calc(12px * var(--scale-ratio, 1)) calc(16px * var(--scale-ratio, 1));
        background: rgba(15, 23, 42, 0.6);
        border-bottom: calc(1px * var(--scale-ratio, 1)) solid rgba(99, 102, 241, 0.1);
    }
</style>
