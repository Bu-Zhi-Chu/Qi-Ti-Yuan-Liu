<script lang="ts">
    import ResponsiveBox from '../core/ResponsiveBox.svelte'

    interface TreeNode {
        id: string | number
        label: string
        checked?: boolean
        children?: TreeNode[]
        expanded?: boolean
        SELF_CODE?: string
    }

    interface Props {
        tabs?: string[]
        treeData?: TreeNode[]
        multiList?: boolean
        enableMultiSelect?: boolean
        dataSource?: string
        style?: string
        'data-id'?: string
        [key: string]: any
    }

    let { tabs = ['点类型', '管理单位', '自定义'], treeData: rawTreeData = [], multiList = false, enableMultiSelect = false, dataSource = 'example', style = '', 'data-id': dataId = '', ...restProps }: Props = $props()

    let activeTabIndex = $state(0)
    let searchText = $state('')
    let searchKeyword = $state('')

    const baseUrl = import.meta.env.BASE_URL || '/'
    const searchIcon = `${baseUrl}img/hold/searchbox_button.png`
    const expandedIcon = `${baseUrl}img/hold/1-o.png`
    const collapsedIcon = `${baseUrl}img/hold/2-c.png`
    const leafIcon = `${baseUrl}img/hold/3.png`

    const defaultTreeData: TreeNode[] = [
        {
            id: 'root',
            label: '根节点',
            checked: false,
            expanded: true,
            children: [
                { id: 'root-leaf-1', label: '根节点末端1', checked: true },
                { id: 'root-leaf-2', label: '根节点末端2', checked: true }
            ]
        },
        {
            id: 'level1',
            label: '一级节点',
            checked: false,
            expanded: true,
            children: [
                { id: 'level1-leaf-1', label: '一级末端1', checked: true },
                { id: 'level1-leaf-2', label: '一级末端2', checked: true }
            ]
        },
        {
            id: 'level2',
            label: '二级节点',
            checked: false,
            expanded: true,
            children: [
                { id: 'level2-leaf-1', label: '二级末端1', checked: true },
                { id: 'level2-leaf-2', label: '二级末端2', checked: true }
            ]
        }
    ]

    function convertRawNode(raw: any): TreeNode {
        const children = Array.isArray(raw.children) ? raw.children.map(convertRawNode) : []
        return {
            id: raw.id ?? raw.ID,
            label: raw.label ?? raw.NAME ?? '',
            checked: raw.checked ?? false,
            expanded: raw.expanded ?? true,
            children,
            SELF_CODE: raw.SELF_CODE
        }
    }

    function buildTreeFromFlat(list: any[]): TreeNode[] {
        console.log('[FilterTree] buildTreeFromFlat 输入条数:', Array.isArray(list) ? list.length : '非数组')
        const map = new Map<string | number, any>()
        for (const item of list) {
            const id = item.ID ?? item.id
            if (id === undefined || id === null) continue
            const copy = { ...item, children: [] }
            map.set(id, copy)
        }
        const roots: any[] = []
        for (const item of list) {
            const id = item.ID ?? item.id
            if (id === undefined || id === null) continue
            const parentId = item.PARENT_ID ?? item.parentId
            const node = map.get(id)
            if (parentId === undefined || parentId === null || parentId === '') {
                roots.push(node)
            } else {
                const parent = map.get(parentId)
                if (parent) {
                    parent.children.push(node)
                } else {
                    roots.push(node)
                }
            }
        }
        const result = roots.map(convertRawNode)
        console.log(
            '[FilterTree] 构建完成，根节点:',
            result.map((n) => ({
                id: n.id,
                label: n.label,
                childrenCount: n.children ? n.children.length : 0
            }))
        )
        return result
    }

    function normalizeTreeData(data: any[]): TreeNode[] {
        console.log('[FilterTree] normalizeTreeData 输入类型:', Array.isArray(data) ? 'array' : typeof data, 'length:', Array.isArray(data) ? data.length : 0)
        if (!data || data.length === 0) {
            console.log('[FilterTree] 使用默认示例树')
            return defaultTreeData
        }
        const first = data[0] as any
        if (first && 'ID' in first && 'PARENT_ID' in first) {
            console.log('[FilterTree] 检测到 ID/PARENT_ID 扁平结构，开始转树')
            return buildTreeFromFlat(data)
        }
        console.log('[FilterTree] 检测到已是树形结构，直接映射')
        return data.map(convertRawNode)
    }

    function findNodeById(nodes: TreeNode[], id: string | number): TreeNode | null {
        for (const node of nodes) {
            if (node.id === id) return node
            if (node.children && node.children.length > 0) {
                const found = findNodeById(node.children, id)
                if (found) return found
            }
        }
        return null
    }

    export function getSelfCode(nodeId?: string | number | null): string | null {
        const id = nodeId ?? selectedNodeId
        if (id == null) return null
        const node = findNodeById(treeData, id)
        return node?.SELF_CODE ?? null
    }

    let treeData = $state<TreeNode[]>(rawTreeData.length > 0 ? normalizeTreeData(rawTreeData as any[]) : defaultTreeData)
    let selectedNodeId = $state<string | number | null>(treeData[0]?.id ?? null)

    $effect(() => {
        console.log('[FilterTree] effect 触发，dataSource:', dataSource, 'rawTreeData length:', Array.isArray(rawTreeData) ? rawTreeData.length : '非数组')
        if (dataSource === 'json') {
            treeData = rawTreeData.length > 0 ? normalizeTreeData(rawTreeData as any[]) : defaultTreeData
        } else if (dataSource === 'example') {
            treeData = defaultTreeData
        }
        if (!selectedNodeId && treeData.length > 0) {
            selectedNodeId = treeData[0].id
        }
    })

    function toggleNode(node: TreeNode) {
        node.checked = !node.checked
        if (node.children && node.children.length > 0) {
            node.children = node.children.map((child) => ({ ...child, checked: node.checked }))
        }
        treeData = treeData.map((n) => ({ ...n }))
    }

    function toggleExpand(node: TreeNode) {
        node.expanded = !(node.expanded ?? true)
        treeData = treeData.map((n) => ({ ...n }))
    }

    function selectNode(node: TreeNode) {
        selectedNodeId = node.id
    }

    function triggerSearch() {
        searchKeyword = searchText.trim()
    }

    function getFilteredNodes(nodes: TreeNode[]): TreeNode[] {
        const term = searchKeyword.trim()
        if (!term) return nodes
        const lower = term.toLowerCase()
        const result: TreeNode[] = []
        for (const node of nodes) {
            const labelMatch = node.label.toLowerCase().includes(lower)
            const children = node.children ? getFilteredNodes(node.children) : []
            if (labelMatch || children.length > 0) {
                result.push({
                    ...node,
                    children: children.length > 0 ? children : node.children
                })
            }
        }
        return result
    }

    let visibleTreeData = $derived(getFilteredNodes(treeData))
</script>

<ResponsiveBox {style} data-id={dataId} {...restProps}>
    <div class="filter-tree">
        {#if multiList && tabs.length > 0}
            <div class="filter-tree-tabs">
                {#each tabs as tab, index}
                    <button type="button" class:active={index === activeTabIndex} onclick={() => (activeTabIndex = index)}>
                        <span>{tab}</span>
                    </button>
                {/each}
            </div>
        {/if}
        <div class="filter-tree-main">
            <div class="filter-tree-search">
                <input
                    type="text"
                    placeholder="请输入搜索内容"
                    bind:value={searchText}
                    onkeydown={(e) => {
                        if (e.key === 'Enter') {
                            triggerSearch()
                        }
                    }}
                />
                <button type="button" class="search-button" onclick={triggerSearch} aria-label="搜索">
                    <img class="search-icon" src={searchIcon} alt="" />
                </button>
            </div>
            <div class="filter-tree-list">
                {#if visibleTreeData.length === 0}
                    <div class="empty">暂无数据</div>
                {:else}
                    <ul class="tree-level root">
                        {#each visibleTreeData as node}
                            <li>
                                <div class="tree-node">
                                    <div
                                        class="tree-node-inner"
                                        class:selected={node.id === selectedNodeId}
                                        role="button"
                                        tabindex="0"
                                        onclick={() => selectNode(node)}
                                        onkeydown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') selectNode(node)
                                        }}
                                    >
                                        {#if node.children && node.children.length > 0}
                                            <button type="button" class="ztree-state-icon" onclick={() => toggleExpand(node)} aria-label={(node.expanded ?? true) ? '收起' : '展开'}>
                                                {#if node.expanded ?? true}
                                                    <!-- 减号：白底 + 蓝色边框 + 黑色横线 -->
                                                    <svg viewBox="0 0 18 18" aria-hidden="true">
                                                        <rect x="1" y="1" width="16" height="16" rx="2" ry="2" fill="#ffffff" stroke="#5f9bdb" stroke-width="1" />
                                                        <rect x="4" y="8" width="10" height="2" fill="#2b2b2b" />
                                                    </svg>
                                                {:else}
                                                    <!-- 加号：白底 + 蓝色边框 + 黑色十字 -->
                                                    <svg viewBox="0 0 18 18" aria-hidden="true">
                                                        <rect x="1" y="1" width="16" height="16" rx="2" ry="2" fill="#ffffff" stroke="#5f9bdb" stroke-width="1" />
                                                        <rect x="4" y="8" width="10" height="2" fill="#2b2b2b" />
                                                        <rect x="8" y="4" width="2" height="10" fill="#2b2b2b" />
                                                    </svg>
                                                {/if}
                                            </button>
                                            <button type="button" class="toggle-button" onclick={() => toggleExpand(node)} aria-label={(node.expanded ?? true) ? '收起' : '展开'}>
                                                <img class="toggle-icon" src={(node.expanded ?? true) ? expandedIcon : collapsedIcon} alt="" />
                                            </button>
                                        {:else}
                                            <span class="ztree-state-placeholder"></span>
                                            <span class="toggle-leaf">
                                                <img class="toggle-icon" src={leafIcon} alt="" />
                                            </span>
                                        {/if}
                                        {#if enableMultiSelect}
                                            <input type="checkbox" checked={node.checked} onclick={() => toggleNode(node)} />
                                        {/if}
                                        <span class="node-label">{node.label}</span>
                                    </div>
                                </div>
                                {#if node.children && node.children.length > 0 && (node.expanded ?? true)}
                                    <ul class="tree-level child">
                                        {#each node.children as child}
                                            <li>
                                                <div class="tree-node">
                                                    <div
                                                        class="tree-node-inner"
                                                        class:selected={child.id === selectedNodeId}
                                                        role="button"
                                                        tabindex="0"
                                                        onclick={() => selectNode(child)}
                                                        onkeydown={(e) => {
                                                            if (e.key === 'Enter' || e.key === ' ') selectNode(child)
                                                        }}
                                                    >
                                                        {#if child.children && child.children.length > 0}
                                                            <button type="button" class="ztree-state-icon" onclick={() => toggleExpand(child)} aria-label={(child.expanded ?? true) ? '收起' : '展开'}>
                                                                {#if child.expanded ?? true}
                                                                    <svg viewBox="0 0 18 18" aria-hidden="true">
                                                                        <rect x="1" y="1" width="16" height="16" rx="2" ry="2" fill="#ffffff" stroke="#5f9bdb" stroke-width="1" />
                                                                        <rect x="4" y="8" width="10" height="2" fill="#2b2b2b" />
                                                                    </svg>
                                                                {:else}
                                                                    <svg viewBox="0 0 18 18" aria-hidden="true">
                                                                        <rect x="1" y="1" width="16" height="16" rx="2" ry="2" fill="#ffffff" stroke="#5f9bdb" stroke-width="1" />
                                                                        <rect x="4" y="8" width="10" height="2" fill="#2b2b2b" />
                                                                        <rect x="8" y="4" width="2" height="10" fill="#2b2b2b" />
                                                                    </svg>
                                                                {/if}
                                                            </button>
                                                            <button type="button" class="toggle-button" onclick={() => toggleExpand(child)} aria-label={(child.expanded ?? true) ? '收起' : '展开'}>
                                                                <img class="toggle-icon" src={(child.expanded ?? true) ? expandedIcon : collapsedIcon} alt="" />
                                                            </button>
                                                        {:else}
                                                            <span class="ztree-state-placeholder"></span>
                                                            <span class="toggle-leaf">
                                                                <img class="toggle-icon" src={leafIcon} alt="" />
                                                            </span>
                                                        {/if}
                                                        {#if enableMultiSelect}
                                                            <input type="checkbox" checked={child.checked} onclick={() => toggleNode(child)} />
                                                        {/if}
                                                        <span class="node-label">{child.label}</span>
                                                    </div>
                                                </div>
                                                {#if child.children && child.children.length > 0 && (child.expanded ?? true)}
                                                    <ul class="tree-level child">
                                                        {#each child.children as grand}
                                                            <li>
                                                                <div class="tree-node">
                                                                    <div
                                                                        class="tree-node-inner"
                                                                        class:selected={grand.id === selectedNodeId}
                                                                        role="button"
                                                                        tabindex="0"
                                                                        onclick={() => selectNode(grand)}
                                                                        onkeydown={(e) => {
                                                                            if (e.key === 'Enter' || e.key === ' ') selectNode(grand)
                                                                        }}
                                                                    >
                                                                        <span class="toggle-leaf">
                                                                            <img class="toggle-icon" src={leafIcon} alt="" />
                                                                        </span>
                                                                        {#if enableMultiSelect}
                                                                            <input type="checkbox" checked={grand.checked} onclick={() => toggleNode(grand)} />
                                                                        {/if}
                                                                        <span class="node-label">{grand.label}</span>
                                                                    </div>
                                                                </div>
                                                            </li>
                                                        {/each}
                                                    </ul>
                                                {/if}
                                            </li>
                                        {/each}
                                    </ul>
                                {/if}
                            </li>
                        {/each}
                    </ul>
                {/if}
            </div>
        </div>
    </div>
</ResponsiveBox>

<style>
    .filter-tree {
        display: flex;
        width: 100%;
        height: 100%;
        border: calc(1px * var(--scale-ratio, 1)) solid #1990ff;
        border-radius: calc(2px * var(--scale-ratio, 1));
        box-sizing: border-box;
        overflow: hidden;
        background-color: #ffffff;
    }
    .filter-tree-tabs {
        display: flex;
        flex-direction: column;
        flex: 0 0 auto;
        background: #0c7ed9;
        border-right: calc(1px * var(--scale-ratio, 1)) solid #1990ff;
    }
    .filter-tree-tabs button {
        writing-mode: vertical-rl;
        transform: rotate(180deg);
        padding: calc(8px * var(--scale-ratio, 1)) calc(4px * var(--scale-ratio, 1));
        border: none;
        background: transparent;
        color: #ffffff;
        cursor: pointer;
        font-size: calc(12px * var(--scale-ratio, 1));
        border-radius: 0;
        min-height: calc(60px * var(--scale-ratio, 1));
    }
    .filter-tree-tabs button.active {
        background: #ffffff;
        color: #0c7ed9;
    }
    .filter-tree-main {
        display: flex;
        flex-direction: column;
        flex: 1 1 auto;
        box-sizing: border-box;
        padding: calc(4px * var(--scale-ratio, 1));
    }
    .filter-tree-search {
        position: relative;
        flex: 0 0 auto;
        margin-bottom: calc(8px * var(--scale-ratio, 1));
    }
    .filter-tree-search input {
        width: 100%;
        padding: 0 calc(28px * var(--scale-ratio, 1)) 0 calc(4px * var(--scale-ratio, 1));
        height: calc(28px * var(--scale-ratio, 1));
        border-radius: calc(2px * var(--scale-ratio, 1));
        border: calc(1px * var(--scale-ratio, 1)) solid #1990ff;
        font-size: calc(12px * var(--scale-ratio, 1));
        box-sizing: border-box;
    }
    .filter-tree-search .search-button {
        position: absolute;
        top: 50%;
        right: calc(4px * var(--scale-ratio, 1));
        transform: translateY(-50%);
        width: calc(18px * var(--scale-ratio, 1));
        height: calc(18px * var(--scale-ratio, 1));
        border: none;
        background: transparent;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        cursor: pointer;
    }
    .filter-tree-search .search-button .search-icon {
        width: calc(18px * var(--scale-ratio, 1));
        height: calc(18px * var(--scale-ratio, 1));
        stroke: #ffffff;
        stroke-width: 1.5;
        fill: none;
    }
    .filter-tree-list {
        flex: 1 1 auto;
        overflow: auto;
        border-top: calc(1px * var(--scale-ratio, 1)) solid #e0e7ff;
        padding-top: calc(8px * var(--scale-ratio, 1));
        padding-left: calc(10px * var(--scale-ratio, 1));
    }
    .tree-level {
        list-style: none;
        padding-left: 0;
        margin: 0;
    }
    .tree-level.root > li + li {
        margin-top: calc(4px * var(--scale-ratio, 1));
    }
    .tree-level.child {
        padding-left: calc(24px * var(--scale-ratio, 1));
        margin-top: calc(2px * var(--scale-ratio, 1));
    }
    .tree-node {
        display: flex;
        align-items: center;
        gap: calc(2px * var(--scale-ratio, 1));
    }
    .tree-node-inner {
        display: inline-flex;
        align-items: center;
        gap: calc(4px * var(--scale-ratio, 1));
        font-size: calc(15px * var(--scale-ratio, 1));
        color: #333333;
        padding: 0 calc(2px * var(--scale-ratio, 1));
        border: calc(1px * var(--scale-ratio, 1)) solid transparent;
        border-radius: calc(2px * var(--scale-ratio, 1));
        cursor: pointer;
    }
    .tree-node-inner:hover .node-label {
        text-decoration: underline;
    }
    .tree-node-inner.selected {
        background-color: rgb(201, 221, 245);
        border-color: rgb(201, 221, 245);
    }
    .tree-node .ztree-state-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: calc(20px * var(--scale-ratio, 1));
        height: calc(20px * var(--scale-ratio, 1));
        border: none;
        padding: 0;
        margin: 0;
        background: transparent;
        cursor: pointer;
    }
    .tree-node .ztree-state-icon svg {
        width: calc(14px * var(--scale-ratio, 1));
        height: calc(14px * var(--scale-ratio, 1));
        display: block;
    }
    .tree-node .ztree-state-placeholder {
        display: inline-block;
        width: calc(20px * var(--scale-ratio, 1));
        height: calc(20px * var(--scale-ratio, 1));
    }
    .tree-node .toggle-button {
        border: none;
        background: transparent;
        padding: 0;
        margin: 0;
        width: calc(20px * var(--scale-ratio, 1));
        height: calc(20px * var(--scale-ratio, 1));
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
    }
    .tree-node .toggle-icon {
        width: 100%;
        height: 100%;
    }
    .tree-node .toggle-leaf {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: calc(18px * var(--scale-ratio, 1));
        height: calc(20px * var(--scale-ratio, 1));
    }
    .tree-node input[type='checkbox'] {
        width: calc(20px * var(--scale-ratio, 1));
        height: calc(20px * var(--scale-ratio, 1));
    }
    .node-label {
        white-space: nowrap;
    }
    .empty {
        font-size: calc(12px * var(--scale-ratio, 1));
        color: #999999;
        text-align: center;
        padding: calc(8px * var(--scale-ratio, 1));
    }
</style>
