<script lang="ts">
    import ResponsiveBox from '../core/ResponsiveBox.svelte'
    import { updateNodeProps } from '../../services/parser/property-panel.service'

    interface TreeNode {
        id: string | number
        label: string
        checked?: boolean
        children?: TreeNode[]
        expanded?: boolean
        SELF_CODE?: string
        PARENT_ID?: string | number
    }

    interface Props {
        id?: string
        tabs?: string[]
        treeData?: TreeNode[]
        multiList?: boolean
        enableMultiSelect?: boolean
        dataSource?: string
        style?: string
        'data-id'?: string
        selectedNodeId?: string | number
        [key: string]: any
    }

    let { id = '', tabs = ['点类型', '管理单位', '自定义'], treeData: rawTreeData = [], multiList = false, enableMultiSelect = false, dataSource = 'example', style = '', 'data-id': dataId = '', selectedNodeId: propSelectedNodeId, ...restProps }: Props = $props()

    let activeTabIndex = $state(0)
    let searchText = $state('')

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
            expanded: raw.expanded,
            children,
            SELF_CODE: raw.SELF_CODE,
            PARENT_ID: raw.PARENT_ID ?? raw.parentId
        }
    }

    function applyDefaultExpansion(nodes: TreeNode[], depth = 0): TreeNode[] {
        return nodes.map((node) => {
            const next: TreeNode = {
                ...node,
                expanded: node.expanded ?? depth === 0
            }
            if (node.children && node.children.length > 0) {
                next.children = applyDefaultExpansion(node.children, depth + 1)
            }
            return next
        })
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
            return applyDefaultExpansion(defaultTreeData)
        }
        const first = data[0] as any
        if (first && 'ID' in first && 'PARENT_ID' in first) {
            console.log('[FilterTree] 检测到 ID/PARENT_ID 扁平结构，开始转树')
            return applyDefaultExpansion(buildTreeFromFlat(data))
        }
        console.log('[FilterTree] 检测到已是树形结构，直接映射')
        return applyDefaultExpansion(data.map(convertRawNode))
    }

    function findNodeById(nodes: TreeNode[], id: string | number): TreeNode | null {
        // Normalize id to string for comparison to handle number vs string mismatches
        const targetIdStr = String(id)
        for (const node of nodes) {
            if (String(node.id) === targetIdStr) return node
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

    function findParentIdByTraversal(nodes: TreeNode[], targetId: string | number): string | number | null {
        const targetStr = String(targetId)
        for (const node of nodes) {
            // Check direct children
            if (node.children && node.children.length > 0) {
                for (const child of node.children) {
                    if (String(child.id) === targetStr) {
                        return node.id
                    }
                }
                // Recursively check children's children
                const found = findParentIdByTraversal(node.children, targetId)
                if (found != null) return found
            }
        }
        return null
    }

    export function getParentId(nodeId?: string | number | null): string | number | null {
        const id = nodeId ?? selectedNodeId
        if (id == null) return null
        
        // 1. Try to get explicit PARENT_ID from node data (e.g. from DB)
        const node = findNodeById(treeData, id)
        if (node && node.PARENT_ID != null && node.PARENT_ID !== '') {
            return node.PARENT_ID
        }

        // 2. Fallback: infer parent from tree structure
        return findParentIdByTraversal(treeData, id)
    }

    const initialTreeData: TreeNode[] = rawTreeData.length > 0 ? normalizeTreeData(rawTreeData as any[]) : defaultTreeData
    let treeData = $state<TreeNode[]>(initialTreeData)
    // Initialize with prop if available, otherwise first node
    let selectedNodeId = $state<string | number | null>(propSelectedNodeId != null && findNodeById(initialTreeData, propSelectedNodeId) ? (findNodeById(initialTreeData, propSelectedNodeId)?.id ?? propSelectedNodeId) : (initialTreeData[0]?.id ?? null))
    let lastSearchTerm = $state('')
    let lastMatchedNodeId = $state<string | number | null>(null)

    $effect(() => {
        console.log('[FilterTree] effect 触发，dataSource:', dataSource, 'rawTreeData length:', Array.isArray(rawTreeData) ? rawTreeData.length : '非数组')
        if (dataSource === 'json' || dataSource === 'real' || dataSource === 'mock') {
            const normalized = rawTreeData.length > 0 ? normalizeTreeData(rawTreeData as any[]) : defaultTreeData
            treeData = normalized

            // Check if current selection is still valid
            if (selectedNodeId != null && findNodeById(normalized, selectedNodeId)) {
                return
            }

            // Check if prop selection is valid (e.g. if updated from parent or init)
            if (propSelectedNodeId != null) {
                const found = findNodeById(normalized, propSelectedNodeId)
                if (found) {
                    selectedNodeId = found.id
                    return
                }
            }

            const first = normalized[0]
            if (first) {
                selectNode(first)
            } else {
                selectedNodeId = null
            }
        } else if (dataSource === 'example') {
            const normalized = defaultTreeData
            treeData = normalized

            if (selectedNodeId != null && findNodeById(normalized, selectedNodeId)) {
                return
            }

            if (propSelectedNodeId != null) {
                const found = findNodeById(normalized, propSelectedNodeId)
                if (found) {
                    selectedNodeId = found.id
                    return
                }
            }

            const first = normalized[0]
            if (first) {
                selectNode(first)
            } else {
                selectedNodeId = null
            }
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
        console.log('[FilterTree] 选中节点:', {
            ID: node.id,
            NAME: node.label,
            SELF_CODE: node.SELF_CODE
        })
        selectedNodeId = node.id
    }

    let lastPersistedSelection = $state<string | null>(null)
    $effect(() => {
        if (!id) return
        const selectedIdStr = selectedNodeId == null ? '' : String(selectedNodeId)
        const selfCode = getSelfCode(selectedNodeId) ?? ''
        const parentId = getParentId(selectedNodeId)
        const parentIdStr = parentId == null ? '' : String(parentId)

        const effectiveSelfCode = selfCode || selectedIdStr
        const signature = `${selectedIdStr}|${selfCode}|${parentIdStr}`
        if (signature === lastPersistedSelection) return
        lastPersistedSelection = signature
        updateNodeProps(id, {
            attributes: {
                selectedNodeId: selectedIdStr,
                selectedSelfCode: effectiveSelfCode,
                selectedParentId: parentIdStr
            }
        })
    })

    function collectAllNodes(nodes: TreeNode[]): TreeNode[] {
        const result: TreeNode[] = []
        function dfs(list: TreeNode[]) {
            for (const node of list) {
                result.push(node)
                if (node.children && node.children.length > 0) {
                    dfs(node.children)
                }
            }
        }
        dfs(nodes)
        return result
    }

    function expandAncestors(targetId: string | number) {
        function helper(nodes: TreeNode[]): [TreeNode[], boolean] {
            let foundInThisLevel = false
            const newNodes = nodes.map((node) => {
                let foundInChildren = false
                let newChildren = node.children

                if (node.children && node.children.length > 0) {
                    const [updatedChildren, childFound] = helper(node.children)
                    if (childFound) {
                        foundInChildren = true
                        newChildren = updatedChildren
                    }
                }

                const isTarget = node.id === targetId
                const shouldExpand = isTarget || foundInChildren

                if (shouldExpand) {
                    foundInThisLevel = true
                }

                if (foundInChildren && node.children && node.children.length > 0) {
                    return {
                        ...node,
                        expanded: true,
                        children: newChildren
                    }
                }

                if (newChildren !== node.children) {
                    return {
                        ...node,
                        children: newChildren
                    }
                }

                return node
            })

            return [newNodes, foundInThisLevel]
        }

        const [updated, found] = helper(treeData)
        if (found) {
            treeData = updated
        }
    }

    function locateNext() {
        const term = searchText.trim()
        if (!term) return
        const lower = term.toLowerCase()
        const flat = collectAllNodes(treeData)
        if (flat.length === 0) return

        let startIndex = 0
        if (lastSearchTerm === term && lastMatchedNodeId != null) {
            const currentIndex = flat.findIndex((n) => n.id === lastMatchedNodeId)
            startIndex = currentIndex >= 0 ? currentIndex + 1 : 0
        } else {
            lastSearchTerm = term
            lastMatchedNodeId = null
        }

        let foundIndex = -1
        for (let i = 0; i < flat.length; i++) {
            const idx = (startIndex + i) % flat.length
            const node = flat[idx]
            if (node.label.toLowerCase().includes(lower)) {
                foundIndex = idx
                break
            }
        }
        if (foundIndex === -1) return
        const found = flat[foundIndex]
        lastSearchTerm = term
        lastMatchedNodeId = found.id
        expandAncestors(found.id)
        selectedNodeId = found.id
    }

    function triggerSearch() {
        locateNext()
    }

    let visibleTreeData = $derived(treeData)
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
                                    {#if node.children && node.children.length > 0}
                                        <button
                                            type="button"
                                            class="ztree-state-icon"
                                            onclick={(e) => {
                                                e.stopPropagation()
                                                toggleExpand(node)
                                            }}
                                            aria-label={(node.expanded ?? true) ? '收起' : '展开'}
                                        >
                                            {#if node.expanded ?? true}
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
                                    {:else}
                                        <span class="ztree-state-placeholder"></span>
                                    {/if}
                                    <div
                                        class="tree-node-inner"
                                        class:selected={node.id === selectedNodeId}
                                        role="button"
                                        tabindex="0"
                                        onclick={() => selectNode(node)}
                                        ondblclick={() => {
                                            if (node.children && node.children.length > 0) {
                                                toggleExpand(node)
                                            }
                                        }}
                                        onkeydown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') selectNode(node)
                                        }}
                                    >
                                        {#if node.children && node.children.length > 0}
                                            <button
                                                type="button"
                                                class="toggle-button"
                                                onclick={(e) => {
                                                    e.stopPropagation()
                                                    toggleExpand(node)
                                                }}
                                                aria-label={(node.expanded ?? true) ? '收起' : '展开'}
                                            >
                                                <img class="toggle-icon" src={(node.expanded ?? true) ? expandedIcon : collapsedIcon} alt="" />
                                            </button>
                                        {:else}
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
                                                    {#if child.children && child.children.length > 0}
                                                        <button
                                                            type="button"
                                                            class="ztree-state-icon"
                                                            onclick={(e) => {
                                                                e.stopPropagation()
                                                                toggleExpand(child)
                                                            }}
                                                            aria-label={(child.expanded ?? true) ? '收起' : '展开'}
                                                        >
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
                                                    {:else}
                                                        <span class="ztree-state-placeholder"></span>
                                                    {/if}
                                                    <div
                                                        class="tree-node-inner"
                                                        class:selected={child.id === selectedNodeId}
                                                        role="button"
                                                        tabindex="0"
                                                        onclick={() => selectNode(child)}
                                                        ondblclick={() => {
                                                            if (child.children && child.children.length > 0) {
                                                                toggleExpand(child)
                                                            }
                                                        }}
                                                        onkeydown={(e) => {
                                                            if (e.key === 'Enter' || e.key === ' ') selectNode(child)
                                                        }}
                                                    >
                                                        {#if child.children && child.children.length > 0}
                                                            <button
                                                                type="button"
                                                                class="toggle-button"
                                                                onclick={(e) => {
                                                                    e.stopPropagation()
                                                                    toggleExpand(child)
                                                                }}
                                                                aria-label={(child.expanded ?? true) ? '收起' : '展开'}
                                                            >
                                                                <img class="toggle-icon" src={(child.expanded ?? true) ? expandedIcon : collapsedIcon} alt="" />
                                                            </button>
                                                        {:else}
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
                                                    <ul class="tree-level grand">
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
        font-size: calc(14px * var(--scale-ratio, 1));
        height: calc(30px * var(--scale-ratio, 1));
    }
    .filter-tree-search input {
        width: 100%;
        padding: 0 calc(28px * var(--scale-ratio, 1)) 0 calc(4px * var(--scale-ratio, 1));
        height: calc(30px * var(--scale-ratio, 1));
        border-radius: calc(2px * var(--scale-ratio, 1));
        border: calc(1px * var(--scale-ratio, 1)) solid #1990ff;
        font-size: calc(14px * var(--scale-ratio, 1));
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
    .tree-level.grand {
        padding-left: calc(40px * var(--scale-ratio, 1));
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
        gap: calc(2px * var(--scale-ratio, 1));
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
        width: calc(13px * var(--scale-ratio, 1));
        height: calc(13px * var(--scale-ratio, 1));
        border: none;
        padding: 0;
        margin: 0;
        background: transparent;
        cursor: pointer;
    }
    .tree-node .ztree-state-icon svg {
        width: calc(12px * var(--scale-ratio, 1));
        height: calc(12px * var(--scale-ratio, 1));
        display: block;
    }
    .tree-node .ztree-state-placeholder {
        display: inline-block;
        width: calc(13px * var(--scale-ratio, 1));
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
        width: calc(20px * var(--scale-ratio, 1));
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
