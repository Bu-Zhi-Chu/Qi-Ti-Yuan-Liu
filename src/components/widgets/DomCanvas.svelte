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
    import type { DomNode } from '../../types/dom-node.types'
    import NodeRenderer from './NodeRenderer.svelte'
    import usePan from '../../services/utils/use-pan.action'
    import useWheelZoom from '../../services/utils/use-wheel-zoom.action'
</script>

<script lang="ts">
    import { registerShortcut, registerMouseLeftPressRelease } from '../../services/utils/shortcut.service'
    import { calculateRelativeRect, createDrawNode } from '../../services/utils/draw-mode.util'
    import { getElementByNodeId } from '../../services/utils/dom-geometry.util'
    import { onDestroy } from 'svelte'

    // 组件属性 - 使用 Runes $props 声明，selectedId 支持双向绑定
    let { editing = false } = $props<{ editing?: boolean }>()

    import { domTree, selectedId, setSelectedId, addNodeToParent } from '../../services/repository/dom-tree.store.svelte'
    // 顶部容器引用，用于渲染画布内容
    let canvasContainerRef: HTMLDivElement | null = null

    /* =================== 画布移动与缩放逻辑 =================== */
    // 位移状态
    let offsetX = $state(0)
    let offsetY = $state(0)
    // 缩放状态
    let scale = $state(1)
    // 拖动状态
    let isDragging = $state(false)

    /* =================== 绘画模式状态 =================== */
    let isDrawMode = $state(false)
    let isDrawing = $state(false)
    let drawStart = $state<{ x: number; y: number } | null>(null)
    let drawRect = $state<{ left: number; top: number; width: number; height: number } | null>(null)
    let targetNodeId = $state<string | null>(null)

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

    // 读取全局缩放比例
    function getScaleRatio() {
        return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--scale-ratio') || '1')
    }

    /**
     * 处理 NodeRenderer 选中事件
     */
    function handleSelect(id: string) {
        // 拖动画布过程中忽略节点选中
        if (isDragging) return
        // 绘画模式下不触发选中
        if (isDrawMode) return
        // 更新全局选中 ID
        setSelectedId(id)
    }

    /**
     * DOM 树渲染交由 NodeRenderer 递归组件处理
     */

    /*
     * 当退出编辑模式时，重置画布位移和缩放，确保"正常模式"回到原位
     */
    $effect(() => {
        if (!editing && (offsetX !== 0 || offsetY !== 0 || scale !== 1)) {
            offsetX = 0
            offsetY = 0
            scale = 1
        }
    })

    /* =================== 绘画模式逻辑 =================== */

    // 注册/注销绘画模式快捷键 B
    let unregisterDrawMode: (() => void) | null = null
    let unregisterMouseEvents: (() => void) | null = null

    $effect(() => {
        if (editing) {
            const keydownHandler = (e: KeyboardEvent) => {
                if (e.key === 'b' || e.key === 'B') {
                    if (!isDrawMode) {
                        isDrawMode = true
                        document.body.style.cursor = 'crosshair'
                    }
                }
            }
            const keyupHandler = (e: KeyboardEvent) => {
                if (e.key === 'b' || e.key === 'B') {
                    if (isDrawMode) {
                        isDrawMode = false
                        document.body.style.cursor = 'default'
                    }
                }
            }
            document.addEventListener('keydown', keydownHandler)
            document.addEventListener('keyup', keyupHandler)
            unregisterDrawMode = () => {
                document.removeEventListener('keydown', keydownHandler)
                document.removeEventListener('keyup', keyupHandler)
            }
        } else if (unregisterDrawMode) {
            unregisterDrawMode()
            unregisterDrawMode = null
            isDrawMode = false
            document.body.style.cursor = 'default'
        }
    })

    // 处理鼠标事件 - 绘画模式
    $effect(() => {
        // 清理之前的事件监听
        if (unregisterMouseEvents) {
            const unregister = unregisterMouseEvents as () => void
            unregister()
            unregisterMouseEvents = null
        }

        if (isDrawMode && editing) {
            unregisterMouseEvents = registerMouseLeftPressRelease(
                (e: MouseEvent) => {
                    // 按下左键开始绘制
                    if (!isDrawMode || isDrawing) return

                    // 找到当前选中的元素，确保是有效目标
                    const id = selectedId()
                    const targetEl = id ? getElementByNodeId(id) : null
                    if (!targetEl) return

                    targetNodeId = id
                    const rect = targetEl.getBoundingClientRect()
                    const currentScale = editing ? scale * 0.5 : scale
                    isDrawing = true
                    drawStart = { x: e.clientX, y: e.clientY }
                    drawRect = {
                        left: ((e.clientX - rect.left) / currentScale / rect.width) * 100,
                        top: ((e.clientY - rect.top) / currentScale / rect.height) * 100,
                        width: 0,
                        height: 0
                    }

                    // 防止事件冒泡和默认行为
                    e.preventDefault()
                    e.stopPropagation()
                },
                (e: MouseEvent) => {
                    // 松开左键结束绘制
                    if (!isDrawing || !drawStart || !drawRect || !targetNodeId) return

                    const targetEl = getElementByNodeId(targetNodeId)
                    if (!targetEl) {
                        resetDrawState()
                        return
                    }

                    // 计算最终矩形
                    const rect = targetEl.getBoundingClientRect()
                    const currentScale = editing ? scale * 0.5 : scale
                    const finalRect = calculateRelativeRect(drawStart, { x: e.clientX, y: e.clientY }, rect, currentScale)

                    // 添加新节点
                    if ((finalRect.width * rect.width) / 100 > 5 && (finalRect.height * rect.height) / 100 > 5) {
                        const newNode = createDrawNode(finalRect)
                        addNodeToParent(targetNodeId, newNode)
                    }

                    // 重置绘制状态
                    resetDrawState()

                    // 防止事件冒泡和默认行为
                    e.preventDefault()
                    e.stopPropagation()
                }
            )

            // 添加鼠标移动事件监听
            window.addEventListener('mousemove', handleMouseMove)
        } else if (unregisterMouseEvents) {
            const unregister = unregisterMouseEvents as () => void
            unregister()
            unregisterMouseEvents = null
            window.removeEventListener('mousemove', handleMouseMove)
            resetDrawState()
        }
    })

    function handleMouseMove(e: MouseEvent) {
        if (!isDrawing || !drawStart || !targetNodeId) return

        const targetEl = getElementByNodeId(targetNodeId)
        if (!targetEl) return

        const rect = targetEl.getBoundingClientRect()
        const currentScale = editing ? scale * 0.5 : scale
        drawRect = calculateRelativeRect(drawStart, { x: e.clientX, y: e.clientY }, rect, currentScale)

        // 防止事件冒泡和默认行为
        e.preventDefault()
        e.stopPropagation()
    }

    function resetDrawState() {
        isDrawing = false
        drawStart = null
        drawRect = null
        targetNodeId = null
    }

    // 在组件销毁时清理
    onDestroy(() => {
        if (unregisterDrawMode) unregisterDrawMode()
        if (unregisterMouseEvents) {
            const unregister = unregisterMouseEvents as () => void
            unregister()
        }
        window.removeEventListener('mousemove', handleMouseMove)
    })
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
    bind:this={canvasContainerRef}
    class:editing
    use:usePan={{ key: 'Space', onPan: handlePan, scaleAccessor: () => getScaleRatio(), offsetAccessor: () => ({ x: offsetX, y: offsetY }) }}
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
        stopDelay: 200
    }}
    style={`width: 100%; height: 100%; transform: ${
        editing ? `translate(calc(-50% + calc(${offsetX}px * var(--scale-ratio, 1))), calc(-50% + calc(${offsetY}px * var(--scale-ratio, 1)))) scale(${scale * 0.5})` : `translate(calc(${offsetX}px * var(--scale-ratio, 1)), calc(${offsetY}px * var(--scale-ratio, 1))) scale(${scale})`
    }; transform-origin: center center;`}
    role="application"
    onpointerdown={() => (isDragging = true)}
    onpointerup={() => (isDragging = false)}
    onpointercancel={() => (isDragging = false)}
>
    <NodeRenderer node={domTree} selectedId={selectedId()} {editing} select={handleSelect} />

    <!-- 绘画模式预览矩形 -->
    {#if isDrawing && drawRect && editing}
        <div
            class="draw-preview"
            style={`position: absolute; left: ${drawRect.left}%; top: ${drawRect.top}%; width: ${drawRect.width}%; height: ${drawRect.height}%; background-color: rgba(148, 163, 184, 0.35); border: calc(2px * var(--scale-ratio, 1)) dashed #94a3b8; border-radius: calc(4px * var(--scale-ratio, 1)); box-shadow: 0 0 calc(6px * var(--scale-ratio, 1)) rgba(0,0,0,0.15); pointer-events: none; z-index: 100;`}
        ></div>
    {/if}
</div>

<style>
    .editing {
        position: absolute;
        left: 50%;
        top: 50%;
        width: 100%;
        height: 100%;
        display: block;
        /* 平移由内联 style 控制 */
        transform-origin: center center;
        z-index: 5;
    }
</style>
