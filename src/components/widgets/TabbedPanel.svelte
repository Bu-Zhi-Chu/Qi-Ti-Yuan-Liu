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
    import { getElementByNodeId } from '../../services/utils/dom-geometry.util'
    import { onMount, onDestroy } from 'svelte'
    import { filterDomTreeBySearch } from '../../services/repository/dom-tree.store.svelte'
    import { addNodeToParent } from '../../services/repository/dom-tree.store.svelte'
    import { projectId } from '../../services/repository/dom-tree.store.svelte'
    import DexieService from '../../services/database/dexie-service'
    import { get } from 'svelte/store'

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

        const handleKey = (e: KeyboardEvent) => {
            if (!e.ctrlKey) return
            if (e.key === '1') {
                e.preventDefault()
                switchToNodes()
            } else if (e.key === '2') {
                e.preventDefault()
                switchToWarehouse()
            }
        }
        window.addEventListener('keydown', handleKey)
        onDestroy(() => {
            window.removeEventListener('keydown', handleKey)
        })
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
    // ------------------- 点击仓库项生成拖拽预览，松开后才入树 -------------------
    let previewEl: HTMLElement | null = null
    let pendingNode: any = null
    let cleanupListeners: (() => void) | null = null

    async function addNodeFromWarehouse(e: MouseEvent, item: WarehouseItem) {
        e.stopPropagation()

        // 若已有正在拖拽的预览，先清理
        if (previewEl) {
            previewEl.remove()
            previewEl = null
        }
        if (cleanupListeners) {
            cleanupListeners()
            cleanupListeners = null
        }

        /* 1. 计算父节点与尺寸百分比 */
        const presetStyles = item.presetStyles || {}
        let widthPercent = 10
        let heightPercent = 10
        const widthVal: string | undefined = presetStyles.width as any
        const heightVal: string | undefined = presetStyles.height as any
        const widthRaw: string | undefined = typeof widthVal === 'string' ? widthVal.trim() : undefined
        const heightRaw: string | undefined = typeof heightVal === 'string' ? heightVal.trim() : undefined
        // 若预设为百分比，直接解析；若为固定px，则稍后转换为百分比
        if (widthRaw && /%$/.test(widthRaw)) widthPercent = parseFloat(widthRaw)
        if (heightRaw && /%$/.test(heightRaw)) heightPercent = parseFloat(heightRaw)
        // 记录若为px值，稍后转换
        const widthPxPreset = widthRaw && /px$/i.test(widthRaw) ? parseFloat(widthRaw) : null
        const heightPxPreset = heightRaw && /px$/i.test(heightRaw) ? parseFloat(heightRaw) : null

        const parentId = selectedId() || 'root'
        const parentEl = getElementByNodeId(parentId) as HTMLElement | null
        if (!parentEl) return
        const parent = parentEl as HTMLElement

        const parentRect = parent.getBoundingClientRect()
        const scaleRatio = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--scale-ratio') || '1') || 1

        // ---------------------- 文本内容处理 ----------------------
        const blockMeta = (blocksConfig as any[]).find((b) => b.type === item.type) as any
        let resolvedTextContent: string | undefined = blockMeta?.textContent
        if (resolvedTextContent && /\{\{projectName\}\}/.test(resolvedTextContent)) {
            const pid = get(projectId)
            if (pid) {
                try {
                    const project = await DexieService.getRecord<any>('qi-qiao-ban', 'projects', pid)
                    if (project?.name) {
                        resolvedTextContent = resolvedTextContent.replace(/\{\{projectName\}\}/g, project.name as string)
                    }
                } catch (err) {
                    console.error('[TabbedPanel] 获取项目名称失败', err)
                }
            }
        }

        // 若预设为px，需要折算到百分比，确保拖拽时中心定位仍正确
        if (widthPxPreset !== null && parent.offsetWidth) {
            widthPercent = ((widthPxPreset * scaleRatio) / parent.offsetWidth) * 100
        }
        if (heightPxPreset !== null && parent.offsetHeight) {
            heightPercent = ((heightPxPreset * scaleRatio) / parent.offsetHeight) * 100
        }

        // 生成 data-name
        function generateUniqueDataName(baseName: string): string {
            const names = new Set<string>()
            function collect(node: any) {
                const attrName = node.attributes?.['data-name'] as string | undefined
                if (attrName) names.add(attrName)
                node.children?.forEach(collect)
            }
            collect(domTree)
            let candidate = baseName
            if (!names.has(candidate)) return candidate
            let index = 1
            while (names.has(`${baseName} ${index}`)) index++
            return `${baseName} ${index}`
        }

        /* 2. 创建待加入节点描述对象（百分比定位） */
        pendingNode = {
            id: globalThis.crypto?.randomUUID?.() ?? `node-${Date.now()}`,
            componentType: item.type,
            styles: {
                position: 'absolute',
                left: '0%', // 占位，松开时再写入
                top: '0%',
                width: `${widthPercent}%`,
                height: `${heightPercent}%`,
                ...(presetStyles || {})
            },
            textContent: resolvedTextContent,
            // 如果是按钮组，预先生成一个默认子按钮
            ...(item.type === 'ButtonGroup'
                ? {
                      attributes: {
                          'data-name': generateUniqueDataName(item.name ?? item.type),
                          buttonCount: 1
                      },
                      children: [
                          {
                              id: globalThis.crypto?.randomUUID?.() ?? `node-${Date.now()}-child`,
                              componentType: 'Button',
                              styles: (() => {
                                  const buttonMeta = (blocksConfig as any[]).find((b) => b.type === 'Button') as any
                                  return buttonMeta?.presetStyles ? { ...buttonMeta.presetStyles } : {}
                              })(),
                              attributes: { 'data-name': '按钮 1' },
                              children: []
                          }
                      ]
                  }
                : {
                      attributes: {
                          'data-name': generateUniqueDataName(item.name ?? item.type)
                      },
                      children: []
                  })
        }

        /* 3. 生成真实 DOM 作为预览 */
        previewEl = document.createElement('div')
        previewEl.style.position = 'absolute'
        previewEl.style.pointerEvents = 'none'
        previewEl.style.background = 'rgba(99,102,241,0.3)'
        previewEl.style.border = 'calc(3px * var(--scale-ratio, 1)) dashed #6366f1'
        previewEl.style.boxSizing = 'border-box'

        parentEl.appendChild(previewEl)

        function updatePreview(clientX: number, clientY: number) {
            const relX = (clientX - parentRect.left) / parentRect.width
            const relY = (clientY - parentRect.top) / parentRect.height
            const leftPercent = relX * 100 - widthPercent / 2
            const topPercent = relY * 100 - heightPercent / 2

            const pxW = ((widthPercent / 100) * parent.offsetWidth) / scaleRatio
            const pxH = ((heightPercent / 100) * parent.offsetHeight) / scaleRatio
            const pxL = ((leftPercent / 100) * parent.offsetWidth) / scaleRatio
            const pxT = ((topPercent / 100) * parent.offsetHeight) / scaleRatio

            // 使用自适应 px（calc * var(--scale-ratio)）以适配不同浏览器缩放
            previewEl!.style.width = `calc(${pxW}px * var(--scale-ratio, 1))`
            previewEl!.style.height = `calc(${pxH}px * var(--scale-ratio, 1))`
            previewEl!.style.left = `calc(${pxL}px * var(--scale-ratio, 1))`
            previewEl!.style.top = `calc(${pxT}px * var(--scale-ratio, 1))`

            // 记录到 pendingNode，方便松开时写入
            pendingNode.styles.left = `${leftPercent}%`
            pendingNode.styles.top = `${topPercent}%`
        }

        updatePreview(e.clientX, e.clientY)

        // 公共清理函数（移除预览并清理监听器）
        function cancelDrag(addNode = true) {
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('mouseup', onUp)
            window.removeEventListener('contextmenu', onCtxMenu)
            if (previewEl) {
                previewEl.remove()
                previewEl = null
            }
            if (addNode && pendingNode) {
                // Screen、ECharts 等特殊组件始终居父容器左上角
                if (pendingNode.componentType === 'Screen' || pendingNode.componentType === 'ECharts') {
                    pendingNode.styles.left = '0%'
                    pendingNode.styles.top = '0%'
                }
                // 如果原始预设为px，则在落地前转换为自适应px写法
                if (widthPxPreset !== null) {
                    pendingNode.styles.width = `calc(${widthPxPreset}px * var(--scale-ratio, 1))`
                }
                if (heightPxPreset !== null) {
                    pendingNode.styles.height = `calc(${heightPxPreset}px * var(--scale-ratio, 1))`
                }
                addNodeToParent(parentId, pendingNode)
            }
            pendingNode = null
            cleanupListeners = null
        }

        const onMove = (ev: MouseEvent) => updatePreview(ev.clientX, ev.clientY)
        const onUp = (ev: MouseEvent) => {
            if (ev.button !== 0) return // 仅左键触发落地
            cancelDrag(true)
        }
        // 右键取消拖拽：阻止默认菜单并中止，不添加节点
        const onCtxMenu = (ev: MouseEvent) => {
            ev.preventDefault()
            cancelDrag(false)
        }

        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
        window.addEventListener('contextmenu', onCtxMenu)

        cleanupListeners = () => {
            cancelDrag(false)
        }
    }

    // 旧的handleDragStart函数可保留以免编译错误，但仓库按钮不再使用原生drag
    function handleDragStart(e: DragEvent, item: WarehouseItem) {
        if (!e.dataTransfer) return

        // ----------------------- 样式提取 -----------------------
        // 仅提取宽高属性，其余保持原逻辑
        const presetStyles = item.presetStyles || {}
        const widthVal: string | undefined = presetStyles.width as any
        const heightVal: string | undefined = presetStyles.height as any

        // 用于构造新的宽高，可能是 px/百分比/自适应公式
        let finalWidth = widthVal
        let finalHeight = heightVal

        // ------------------- 尺寸处理优先级 ----------------------
        // a) 若有预设宽高，则按优先级处理
        if (widthVal && heightVal) {
            const widIsPercent = /%$/.test(widthVal)
            const heiIsPercent = /%$/.test(heightVal)
            const isAutoFormula = (v: string) => /^calc\(/i.test(v)

            // 1. 纯 px 或自适应公式无需处理
            if (!(widIsPercent || isAutoFormula(widthVal))) {
                finalWidth = widthVal
            }
            if (!(heiIsPercent || isAutoFormula(heightVal))) {
                finalHeight = heightVal
            }

            // 2. 若为百分比，需要基于当前选中节点（或 root）换算为 px(calc)
            if (widIsPercent || heiIsPercent) {
                const targetId = selectedId() || 'root'
                const targetEl = getElementByNodeId(targetId) as HTMLElement | null
                if (targetEl) {
                    const parentEl = targetEl
                    const parentRect = parentEl.getBoundingClientRect()
                    const scaleRatio = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--scale-ratio') || '1') || 1

                    if (widIsPercent && parentEl.offsetWidth) {
                        const percent = parseFloat(widthVal!.replace('%', '')) || 0
                        const parentWidth = parentEl.offsetWidth
                        const px = ((percent / 100) * parentWidth) / scaleRatio
                        const pxRounded = Math.round(px * 100) / 100 // 保留两位小数
                        finalWidth = `calc(${pxRounded}px * var(--scale-ratio, 1))`
                    }
                    if (heiIsPercent && parentEl.offsetHeight) {
                        const percent = parseFloat(heightVal!.replace('%', '')) || 0
                        const parentHeight = parentEl.offsetHeight
                        const px = ((percent / 100) * parentHeight) / scaleRatio
                        const pxRounded = Math.round(px * 100) / 100
                        finalHeight = `calc(${pxRounded}px * var(--scale-ratio, 1))`
                    }
                }
            }
        }

        // 如果预设中没有宽高，则保持默认逻辑
        const mergedStyles = { ...presetStyles }
        if (finalWidth) mergedStyles.width = finalWidth
        if (finalHeight) mergedStyles.height = finalHeight

        // 调试输出：查看转换后的自适应 px（若存在）
        console.log('[DragPreviewSize]', { finalWidth, finalHeight, scaleRatio: getComputedStyle(document.documentElement).getPropertyValue('--scale-ratio') })

        const payload = {
            type: item.type,
            name: item.name,
            // 拖拽中预览会用到 conversion 结果，但落地节点仍使用原始尺寸（百分比）
            presetStyles: item.presetStyles ?? {}
        }
        e.dataTransfer.setData('application/json', JSON.stringify(payload))
        e.dataTransfer.effectAllowed = 'copy'

        // 始终让光标位于拖拽预览的中心
        const dragEl = e.currentTarget as HTMLElement | null
        if (dragEl) {
            const { width, height } = dragEl.getBoundingClientRect()
            // 在某些浏览器中 setDragImage 必须传入 DOM 节点，直接用当前目标即可
            e.dataTransfer.setDragImage(dragEl, width / 2, height / 2)
        }
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
                        <button class="warehouse-item" onmousedown={(e) => addNodeFromWarehouse(e, item)} type="button">
                            <div class="item-icon">
                                <img src={item.preview} alt={item.name} width="32" height="32" draggable="false" />
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
