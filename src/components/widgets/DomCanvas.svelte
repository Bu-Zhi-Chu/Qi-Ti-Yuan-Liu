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
    import drawModeAction from '../../services/actions/draw-mode.action'
    import DrawModeOverlay from './DrawModeOverlay.svelte'
    import { isDrawMode } from '../../services/repository/draw-mode.store.svelte'
    import DexieService from '../../services/database/dexie-service'
</script>

<script lang="ts">
    // 组件属性 - 使用 Runes $props 声明，selectedId 支持双向绑定
    let { editing = false } = $props<{ editing?: boolean }>()

    import { onMount } from 'svelte'
    import { domTree, selectedId, setSelectedId, setProjectId, loadDomTreeFromDatabase } from '../../services/repository/dom-tree.store.svelte'
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
    // 拖动状态
    let isDragging = $state(false)

    // 项目ID - 从路由参数获取或默认
    let projectId = $state('')
    let isLoading = $state(true)

    // 从URL获取项目ID或设置默认值
    onMount(() => {
        console.log('当前URL:', window.location.href)
        console.log('当前hash:', window.location.hash)
        console.log('当前pathname:', window.location.pathname)
        console.log('是否为精简模式:', isLiteMode())

        // 立即执行加载逻辑
        loadProjectData()

        // 监听路由变化（仅在非精简模式下）
        const handleRouteChange = () => {
            if (isLiteMode()) return

            let newMatch = window.location.hash.match(/\/editor\/([^\/]+)/)
            if (!newMatch) {
                newMatch = window.location.pathname.match(/\/editor\/([^\/]+)/)
            }
            if (!newMatch) {
                newMatch = window.location.pathname.match(/\/search\/editor\/([^\/]+)/)
            }

            if (newMatch && newMatch[1] !== projectId) {
                projectId = newMatch[1]
                console.log('检测到项目切换，新项目ID:', projectId)
                loadCanvasState()
            }
        }

        window.addEventListener('hashchange', handleRouteChange)
        window.addEventListener('popstate', handleRouteChange)

        return () => {
            window.removeEventListener('hashchange', handleRouteChange)
            window.removeEventListener('popstate', handleRouteChange)
        }
    })

    // 分离的异步函数处理项目数据加载
    async function loadProjectData() {
        // 精简模式下从数据库获取项目ID
        if (isLiteMode()) {
            try {
                console.log('精简模式：从数据库获取项目ID')
                const projects = await DexieService.getAllRecords('qi-qiao-ban', 'projects')
                if (projects && projects.length > 0) {
                    projectId = (projects[0] as any).id
                    console.log('精简模式：获取到项目ID:', projectId)
                    loadCanvasState()
                } else {
                    console.warn('精简模式：数据库中没有项目')
                }
            } catch (error) {
                console.error('精简模式：获取项目ID失败', error)
            }
        } else {
            // 非精简模式从URL获取项目ID
            let match = window.location.hash.match(/\/editor\/([^\/]+)/)
            if (!match) {
                match = window.location.pathname.match(/\/editor\/([^\/]+)/)
            }
            if (!match) {
                match = window.location.pathname.match(/\/search\/editor\/([^\/]+)/)
            }

            if (match) {
                projectId = match[1]
                console.log('提取到项目ID:', projectId)
                loadCanvasState()
            } else {
                console.warn('未从URL中提取到项目ID，当前URL:', window.location.href)
            }
        }
    }

    // 从项目数据加载canvas状态
    async function loadCanvasState() {
        if (!projectId) {
            console.warn('项目ID为空，无法加载canvas状态')
            return
        }

        // 立即显示加载状态，阻止渲染旧数据
        isLoading = true

        // 立即清空当前项目ID，确保dom-tree.store.ts立即清理数据
        setProjectId('')

        // 设置新项目ID
        setProjectId(projectId)

        try {
            console.log('开始加载项目:', projectId)

            // 立即加载domTree数据，确保数据是最新的
            await loadDomTreeFromDatabase(projectId)

            // 恢复上次选中的节点
            console.log(`【数据库交互】加载项目数据: 项目ID=${projectId}`)
            const project = await DexieService.getRecord<any>('qi-qiao-ban', 'projects', projectId)
            console.log('加载到的项目数据:', project)

            // 恢复上次选中的节点ID
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
                scale = 1
            }

            // 数据完全加载完成后隐藏加载状态
            isLoading = false
            console.log('项目加载完成:', projectId)
        } catch (error) {
            console.error('加载canvas状态失败:', error)
            isLoading = false
        }
    }

    // 保存canvas状态到项目数据
    async function saveCanvasState() {
        if (!projectId) {
            console.warn('项目ID为空，无法保存canvas状态')
            return
        }
        try {
            const canvasState = { x: offsetX, y: offsetY, scale: scale }
            console.log('准备保存canvas状态:', canvasState, '到项目:', projectId)
            console.log(`【数据库交互】保存画布状态: 项目ID=${projectId}, 状态=${JSON.stringify(canvasState)}`)
            const success = await DexieService.updateRecord('qi-qiao-ban', 'projects', projectId, {
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

        if (projectId && !isInitialLoad && stateStr !== lastSavedState) {
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
        if (isLoading === false && projectId) {
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
    role="application"
    onpointerdown={() => (isDragging = true)}
    onpointerup={() => (isDragging = false)}
    onpointercancel={() => (isDragging = false)}
>
    {#if !isLoading}
        <NodeRenderer node={domTree} selectedId={selectedId()} {editing} select={handleSelect} />
    {/if}

    <!-- 使用独立的DrawModeOverlay组件渲染预览矩形 -->
    <DrawModeOverlay {editing} />

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
</style>
