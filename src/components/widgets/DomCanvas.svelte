<!--
 * DomCanvas.svelte
 * DOM 画布区域组件，负责渲染和展示 DOM 树
 *
 * 功能特性：
 * - 根据 domTree 数据结构动态渲染 DOM 树
 * - 支持选中节点高亮显示
 * - 响应式设计，适配不同屏幕尺寸
 * - 与 DomTreeList 组件共享数据源，保持同步
 *
 * 使用方法：
 * <DomCanvas
 *   domTree={domTree}
 *   bind:selectedId={selectedId}
 * />
 -->

<script module lang="ts">
    /**
     * 组件对外属性类型声明
     */
    export interface Props {
        editing?: boolean
    }

    /** DOM 节点类型 */
    import NodeRenderer from './NodeRenderer.svelte'
    import usePan from '../../services/actions/use-pan.action'
    import useWheelZoom from '../../services/actions/use-wheel-zoom.action'
    import { getScaleRatio } from '../../services/utils/get-scale-ratio.util'
    import blocksConfig from '../blocks/blocks.config.json'
    import drawModeAction from '../../services/actions/draw-mode.action'
    import useAdjustMode from '../../services/actions/adjust-mode.action'
    import DrawModeOverlay from './DrawModeOverlay.svelte'
    import AlignmentOverlay from './AlignmentOverlay.svelte'
    import { isDrawMode } from '../../stores/draw-mode.store.svelte'
    import DexieService from '../../services/database/dexie-service'
    import { canvasScale } from '../../stores/canvas-state.store.svelte'
    import { screenDetector } from '../../services/screen/screen-detector.service'
</script>

<script lang="ts">
    // 组件属性 - 使用 Runes $props 声明，selectedId 支持双向绑定
    let { editing = false } = $props<{ editing?: boolean }>()

    import { onMount } from 'svelte'
    import { domTree, selectedId, setSelectedId, setProjectId, loadDomTreeFromDatabase, projectId, addNodeToParent } from '../../stores/dom-tree.store.svelte'
    import { getElementByNodeId } from '../../services/utils/dom-geometry.util'
    import Dexie from 'dexie'
    import { isLiteMode } from '../../services/env/environment.service'
    // 顶部容器引用，用于渲染画布内容
    let canvasContainerRef: HTMLDivElement | null = null

    /* =================== 画布移动与缩放逻辑 =================== */
    // 位移状态 - 从数据库加载
    let offsetX = $state(0)
    let offsetY = $state(0)
    // 缩放状态 - 从数据库加载
    let scale = $state(1)

    // 响应全局 canvasScale 变化（例如状态栏点击切换）
    $effect(() => {
        const targetScale = editing ? $canvasScale / 0.5 : $canvasScale
        if (scale !== targetScale) {
            scale = targetScale
        }
    })
    // 拖动状态
    let isDragging = $state(false)

    // 项目ID - 从store获取
    let localProjectId = $state('')
    let isLoading = $state(true)

    onMount(() => {
        console.log('当前URL:', window.location.href)
        console.log('当前hash:', window.location.hash)
        console.log('当前pathname:', window.location.pathname)
        console.log('是否为精简模式:', isLiteMode())

        // 立即执行加载逻辑
        loadProjectData()

        // 监听store中项目ID的变化
        const unsubscribe = projectId.subscribe((newProjectId) => {
            if (newProjectId && newProjectId !== localProjectId) {
                localProjectId = newProjectId
                console.log('store中项目ID变化，重新加载项目数据:', localProjectId)
                loadCanvasState()
            }
        })

        // 快捷键监听 F 聚焦 - 使用capture阶段确保优先处理
        document.addEventListener('keydown', handleFocusKey, true)

        return () => {
            unsubscribe?.()
            document.removeEventListener('keydown', handleFocusKey, true)
        }
    })

    // 使用store中的项目ID，不再自己解析路由
    async function loadProjectData() {
        const currentProjectId = $projectId
        if (currentProjectId) {
            localProjectId = currentProjectId
            console.log('从store获取项目ID:', localProjectId)
            loadCanvasState()
        } else {
            console.warn('store中项目ID为空，等待EditorPage初始化...')
        }
    }

    // 从项目数据加载canvas状态
    async function loadCanvasState() {
        if (!localProjectId) {
            console.warn('项目ID为空，无法加载canvas状态')
            return
        }

        // 立即显示加载状态，阻止渲染旧数据
        isLoading = true

        // 设置新项目ID（避免多余的清空步骤，减少数据库调用）
        setProjectId(localProjectId)

        try {
            console.log('开始加载项目:', localProjectId)

            // 立即加载domTree数据，确保数据是最新的
            await loadDomTreeFromDatabase(localProjectId)

            // 恢复上次选中的节点
            console.log(`【数据库交互】加载项目数据: 项目ID=${localProjectId}`)
            const project = await DexieService.getRecord<any>('qi-qiao-ban', 'projects', localProjectId)
            console.log('加载到的项目数据:', project)

            // 恢复上次选中的节点ID
            // 恢复上次选中的节点ID
            // 根据项目设计尺寸设置 ScreenDetector
            if (project && project.designWidth && project.designHeight) {
                screenDetector.setDesignSize(project.designWidth, project.designHeight)
            }

            if (project && project.selectedNodeId) {
                await setSelectedId(project.selectedNodeId)
                console.log('已恢复选中节点:', project.selectedNodeId)
            } else {
                // 默认选中根节点
                await setSelectedId('root')
            }

            if (project && project.canvasState) {
                console.log('找到canvasState:', project.canvasState)
                offsetX = project.canvasState.x || 0
                offsetY = project.canvasState.y || 0
                scale = project.canvasState.scale || 1
                // 立即同步全局 canvasScale，防止刷新后状态栏默认 100%
                canvasScale.set(editing ? scale * 0.5 : scale)
                console.log('已应用canvas状态:', { offsetX, offsetY, scale })

                // 强制刷新DOM状态
                if (canvasContainerRef) {
                    canvasContainerRef.style.setProperty('--offset-x', `${offsetX}px`)
                    canvasContainerRef.style.setProperty('--offset-y', `${offsetY}px`)
                    canvasContainerRef.style.setProperty('--scale', `${scale}`)
                }
            } else {
                console.log('未找到canvas状态，使用默认值')
                // 重置为默认状态
                offsetX = 0
                offsetY = 0
                // 编辑模式下第一次进入默认缩放 0.5，其余情况保持 1
                scale = editing ? 0.5 : 1
                // 同步更新 canvasScale
                canvasScale.set(scale)
            }

            // 数据完全加载完成后隐藏加载状态
            isLoading = false
            console.log('项目加载完成:', localProjectId)
        } catch (error) {
            console.error('加载canvas状态失败:', error)
            isLoading = false
        }
    }

    // 保存canvas状态到项目数据
    async function saveCanvasState() {
        if (!localProjectId) {
            console.warn('项目ID为空，无法保存canvas状态')
            return
        }
        try {
            const canvasState = { x: offsetX, y: offsetY, scale: scale }
            console.log('准备保存canvas状态:', canvasState, '到项目:', localProjectId)
            console.log(`【数据库交互】保存画布状态: 项目ID=${localProjectId}, 状态=${JSON.stringify(canvasState)}`)
            const success = await DexieService.updateRecord('qi-qiao-ban', 'projects', localProjectId, {
                canvasState,
                updatedAt: Date.now()
            })
            if (success) {
                console.log('已保存canvas状态:', canvasState)
            } else {
                console.warn('保存canvas状态失败，可能项目不存在')
            }
        } catch (error) {
            console.error('保存canvas状态失败:', error)
        }
    }

    // 当画布状态变化时自动保存
    let isInitialLoad = $state(true)
    let lastSavedState = $state<string>('')

    $effect(() => {
        // 依赖画布状态，状态变化时触发保存
        const currentState = { x: offsetX, y: offsetY, scale: scale }
        const stateStr = JSON.stringify(currentState)

        if ($projectId && !isInitialLoad && stateStr !== lastSavedState) {
            // 防抖保存，避免频繁更新
            const timeout = setTimeout(() => {
                saveCanvasState()
                lastSavedState = stateStr
            }, 300)
            return () => clearTimeout(timeout)
        }
    })

    // 在项目加载完成后重置isInitialLoad标志
    $effect(() => {
        if (isLoading === false && $projectId) {
            // 延迟重置，确保所有初始状态都已应用
            const timeout = setTimeout(() => {
                isInitialLoad = false
                // 初始化最后保存的状态，避免首次保存
                lastSavedState = JSON.stringify({ x: offsetX, y: offsetY, scale: scale })
            }, 100)
            return () => clearTimeout(timeout)
        }
    })

    // 平移回调处理函数
    function handlePan({ x, y, event }: { x: number; y: number; event: PointerEvent }) {
        offsetX = x
        offsetY = y
    }

    // 缩放回调处理函数
    function handleZoom({ scale: newScale, x, y, event }: { scale: number; x: number; y: number; event: WheelEvent }) {
        offsetX = x
        offsetY = y
        scale = newScale
        canvasScale.set(editing ? scale * 0.5 : scale)
    }

    /**
     * 处理 NodeRenderer 选中事件
     * 通过 setSelectedId 统一处理选中逻辑和数据库保存
     */
    async function handleSelect(id: string) {
        // 拖动画布过程中忽略节点选中
        if (isDragging) return
        // 绘画模式下不触发选中
        if (isDrawMode()) return
        // 更新全局选中 ID（已包含变化检测和数据库保存）
        await setSelectedId(id)
    }

    /*
     * 当退出编辑模式时，不再重置画布位移和缩放
     * 正常模式下保持用户设置的画布位置
     */
    let wasEditing = $state(false)
    $effect(() => {
        // 仅记录状态变化，不再重置画布位置
        wasEditing = editing
    })

    // 同步全局缩放到状态栏
    $effect(() => {
        canvasScale.set(editing ? scale * 0.5 : scale)
    })

    // 聚焦画布：根节点缩放 50%；非根节点自动计算缩放并递归微调直至偏移量稳定
    function focusCanvas() {
        const currentSelectedId = selectedId()
        const maxRefine = 5
        const threshold = 1 // 屏幕像素阈值，小于该值判定为稳定

        // 若未选中或选中根节点，使用默认视图
        if (!currentSelectedId || currentSelectedId === 'root') {
            offsetX = 0
            offsetY = 0
            scale = editing ? 1 : 0.5
        } else {
            const el = getElementByNodeId(currentSelectedId!)
            const container = canvasContainerRef
            if (el && container) {
                const rect = el.getBoundingClientRect()
                const containerRect = container.getBoundingClientRect()

                // 视口尺寸
                const viewportW = window.innerWidth
                const viewportH = window.innerHeight

                const viewportCenterX = viewportW / 2
                const viewportCenterY = viewportH / 2

                // 目标让元素占据 80% 视口尺寸
                const desiredScreenScale = Math.min((viewportW * 0.8) / rect.width, (viewportH * 0.8) / rect.height)
                const ratio = getScaleRatio()
                // 将屏幕缩放转换为内部画布 scale
                scale = desiredScreenScale / (editing ? 0.5 * ratio : 1 * ratio)
                // 限制缩放范围
                scale = Math.max(0.2, Math.min(scale, 3))

                const effectiveScale = (editing ? scale * 0.5 : scale) * ratio

                // 元素中心在画布坐标系中的像素位置
                const nodeCenterCanvasX = rect.left - containerRect.left + rect.width / 2
                const nodeCenterCanvasY = rect.top - containerRect.top + rect.height / 2

                // 画布容器中心（像素）
                const canvasCenterX = containerRect.width / 2
                const canvasCenterY = containerRect.height / 2

                // 将屏幕位移转换为画布偏移量
                offsetX += (canvasCenterX - nodeCenterCanvasX) / effectiveScale
                offsetY += (canvasCenterY - nodeCenterCanvasY) / effectiveScale
                // 递归微调，使用 rAF 在布局刷新后再次测量，最多执行 maxRefine 次
                let attempt = 0
                let lastDeltaCanvasX: number | null = null
                let lastDeltaCanvasY: number | null = null
                function refine() {
                    attempt++
                    const el2 = getElementByNodeId(currentSelectedId!)
                    if (!el2) return
                    const rect2 = el2.getBoundingClientRect()
                    const centerX2 = rect2.left + rect2.width / 2
                    const centerY2 = rect2.top + rect2.height / 2

                    // 每次迭代都重新计算 scaleRatio，保证与画布实时缩放保持一致
                    const curEffectiveScale = (editing ? scale * 0.5 : scale) * getScaleRatio()

                    const deltaScreenX = viewportCenterX - centerX2
                    const deltaScreenY = viewportCenterY - centerY2
                    const deltaCanvasX = deltaScreenX / curEffectiveScale
                    const deltaCanvasY = deltaScreenY / curEffectiveScale

                    // 按当前缩放换算阈值，避免不同缩放下判断失真
                    const thresholdCanvas = threshold / curEffectiveScale
                    const oscillationThresholdCanvas = 150 / curEffectiveScale
                    const oscillated =
                        lastDeltaCanvasX !== null &&
                        lastDeltaCanvasY !== null &&
                        Math.sign(deltaCanvasX) !== Math.sign(lastDeltaCanvasX) &&
                        Math.sign(deltaCanvasY) !== Math.sign(lastDeltaCanvasY) &&
                        (Math.abs(deltaCanvasX) >= oscillationThresholdCanvas || Math.abs(deltaCanvasY) >= oscillationThresholdCanvas)

                    // 若已稳定、超过迭代次数或检测到大幅来回震荡则停止
                    if ((Math.abs(deltaCanvasX) < thresholdCanvas && Math.abs(deltaCanvasY) < thresholdCanvas) || attempt >= maxRefine || oscillated) {
                        return
                    }

                    offsetX += deltaCanvasX
                    offsetY += deltaCanvasY
                    lastDeltaCanvasX = deltaCanvasX
                    lastDeltaCanvasY = deltaCanvasY
                    window.requestAnimationFrame(refine)
                }
                window.requestAnimationFrame(refine)
            } else {
                // 元素不存在回退
                offsetX = 0
                offsetY = 0
                scale = editing ? 1 : 0.5
            }
        }
        // 同步全局缩放到状态栏
        canvasScale.set(editing ? scale * 0.5 : scale)
    }

    // 处理快捷键 F 触发聚焦
    function handleFocusKey(e: KeyboardEvent) {
        // 如果焦点在输入框、文本域或其他可编辑元素中，不触发聚焦
        const target = e.target
        if (target instanceof HTMLElement && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable || target.closest('[contenteditable="true"]'))) {
            return
        }

        if (e.key === 'f' || e.key === 'F') {
            e.preventDefault()
            focusCanvas()
        }
    }

    // 拖放处理函数
    function handleDragOver(event: DragEvent) {
        event.preventDefault()
        event.dataTransfer!.dropEffect = 'copy'
    }

    function handleDrop(event: DragEvent) {
        event.preventDefault()
        const dataStr = event.dataTransfer?.getData('application/json')
        if (!dataStr) return

        let payload: { type: string; name?: string; presetStyles?: Record<string, any> }
        try {
            payload = JSON.parse(dataStr)
        } catch {
            return
        }

        const parentId = selectedId() || 'root'
        const parentEl = getElementByNodeId(parentId) ?? canvasContainerRef
        if (!parentEl) return
        const parentRect = parentEl.getBoundingClientRect()

        const defaultW = 10
        const defaultH = 10
        let widthPercent = defaultW
        let heightPercent = defaultH

        if (payload.presetStyles) {
            const wStr = payload.presetStyles.width as string | undefined
            const hStr = payload.presetStyles.height as string | undefined
            if (wStr && wStr.endsWith('%')) widthPercent = parseFloat(wStr)
            if (hStr && hStr.endsWith('%')) heightPercent = parseFloat(hStr)
        }

        const dropX = event.clientX
        const dropY = event.clientY
        const relativeXPercent = ((dropX - parentRect.left) / parentRect.width) * 100
        const relativeYPercent = ((dropY - parentRect.top) / parentRect.height) * 100

        const leftPercent = relativeXPercent - widthPercent / 2
        const topPercent = relativeYPercent - heightPercent / 2

        // 生成唯一 data-name，避免重名
        function generateUniqueDataName(baseName: string): string {
            if (!baseName) return baseName
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
            while (names.has(`${baseName} ${index}`)) {
                index++
            }
            return `${baseName} ${index}`
        }
        const displayName = generateUniqueDataName(payload.name ?? payload.type)

        // 生成随机背景颜色
        function generateRandomColor() {
            const colors = [
                'rgba(239, 68, 68, 0.8)',   // 红色
                'rgba(245, 101, 101, 0.8)', // 浅红
                'rgba(251, 146, 60, 0.8)',  // 橙色
                'rgba(252, 211, 77, 0.8)',  // 黄色
                'rgba(34, 197, 94, 0.8)',   // 绿色
                'rgba(16, 185, 129, 0.8)',  // 青绿
                'rgba(6, 182, 212, 0.8)',   // 青色
                'rgba(59, 130, 246, 0.8)',  // 蓝色
                'rgba(99, 102, 241, 0.8)',  // 靛蓝
                'rgba(139, 92, 246, 0.8)',  // 紫色
                'rgba(168, 85, 247, 0.8)',  // 紫罗兰
                'rgba(236, 72, 153, 0.8)'   // 粉色
            ]
            return colors[Math.floor(Math.random() * colors.length)]
        }

        // 检查是否需要使用随机背景颜色
        const blockConfig = blocksConfig.find((b: any) => b.type === payload.type)
        const shouldUseRandomBg = blockConfig?.randomBackgroundColor === true

        // 处理样式，如果启用随机背景颜色则忽略presetStyles中的背景颜色
        let finalStyles = { ...(payload.presetStyles || {}) }
        if (shouldUseRandomBg) {
            // 移除presetStyles中的背景相关属性
            const { backgroundColor, background, backgroundImage, backgroundSize, backgroundPosition, backgroundRepeat, ...stylesWithoutBg } = finalStyles
            finalStyles = {
                ...stylesWithoutBg,
                backgroundColor: generateRandomColor()
            }
        }

        const newNode = {
            id: globalThis.crypto?.randomUUID?.() ?? `node-${Date.now()}`,
            componentType: payload.type,
            styles: {
                position: 'absolute',
                left: `${leftPercent}%`,
                top: `${topPercent}%`,
                width: `${widthPercent}%`,
                height: `${heightPercent}%`,
                ...finalStyles
            },
            attributes: {
                'data-name': displayName
            },
            children: []
        } as any

        addNodeToParent(parentId, newNode)
        // setSelectedId(newNode.id)  // 移除自动切换新节点的选中，保持原有选中状态
    }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
    bind:this={canvasContainerRef}
    class="canvas-container"
    class:editing
    id="画板"
    data-name="画板"
    style="--offset-x: {offsetX}px; --offset-y: {offsetY}px; --scale: {scale};"
    use:usePan={{ key: 'Space', onPan: handlePan, scaleAccessor: () => getScaleRatio(), offsetAccessor: () => ({ x: offsetX, y: offsetY }), editingAccessor: () => editing }}
    use:useWheelZoom={{
        key: 'Alt',
        getScale: () => scale,
        setScale: (newScale) => (scale = newScale),
        getOffsets: () => ({ x: offsetX, y: offsetY }),
        setOffsets: ({ x, y }) => {
            offsetX = x
            offsetY = y
        },
        onZoom: handleZoom,
        minScale: 0.2,
        maxScale: 3,
        step: 0.1,
        stopDelay: 200,
        editingAccessor: () => editing
    }}
    use:drawModeAction={{
        editingAccessor: () => editing,
        scaleAccessor: () => (editing ? scale * 0.5 : scale)
    }}
    use:useAdjustMode={{
        key: 'KeyV',
        editingAccessor: () => editing,
        scaleAccessor: () => (editing ? scale * 0.5 : scale),
        selectedNodeAccessor: () => selectedId(),
        isRootNodeAccessor: (nodeId) => nodeId === 'root',
        onAdjust: (payload) => console.log('节点调整:', payload)
    }}
    role="application"
    onpointerdown={() => (isDragging = true)}
    onpointerup={() => (isDragging = false)}
    onpointercancel={() => (isDragging = false)}
    ondragover={handleDragOver}
    ondrop={handleDrop}
>
    {#if !isLoading}
        <NodeRenderer node={domTree} selectedId={selectedId()} {editing} select={handleSelect} />
    {/if}

    <!-- 使用独立的DrawModeOverlay组件渲染预览矩形 -->
    <DrawModeOverlay {editing} />

    <!-- 对齐辅助线 -->
    <AlignmentOverlay {editing} />

    <!-- 加载状态 -->
    {#if isLoading}
        <div style="position: absolute;top: 50%;left: 50%;transform: translate(-50%, -50%);color: white;font-size: calc(16px * var(--scale-ratio, 1));text-align: center;z-index: 100;">
            <div
                style="width: calc(40px * var(--scale-ratio, 1));height: calc(40px * var(--scale-ratio, 1));border: calc(3px * var(--scale-ratio, 1)) solid rgba(255,255,255,0.3);border-top: calc(3px * var(--scale-ratio, 1)) solid white;border-radius: 50%;animation: spin 1s linear infinite;margin: 0 auto calc(10px * var(--scale-ratio, 1));"
            ></div>
            加载中...
        </div>
        <style>
            @keyframes spin {
                0% {
                    transform: rotate(0deg);
                }
                100% {
                    transform: rotate(360deg);
                }
            }
        </style>
    {/if}
</div>

<style>
    .canvas-container {
        width: 100%;
        height: 100%;
        position: relative;
    }

    .canvas-container.editing {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(calc(-50% + calc(var(--offset-x, 0px) * var(--scale-ratio, 1))), calc(-50% + calc(var(--offset-y, 0px) * var(--scale-ratio, 1)))) scale(calc(var(--scale, 1) * 0.5));
        transform-origin: center center;
        z-index: 5;
    }

    .canvas-container.editing {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(calc(-50% + calc(var(--offset-x, 0px) * var(--scale-ratio, 1))), calc(-50% + calc(var(--offset-y, 0px) * var(--scale-ratio, 1)))) scale(calc(var(--scale, 1) * 0.5));
        transform-origin: center center;
        z-index: 5;
    }
</style>
