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
</script>

<script lang="ts">
    // 组件属性 - 使用 Runes $props 声明，selectedId 支持双向绑定
    let { editing = false } = $props<{ editing?: boolean }>()

    import { domTree, selectedId, setSelectedId } from '../../services/repository/dom-tree.store.svelte'
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
     */
    function handleSelect(id: string) {
        // 拖动画布过程中忽略节点选中
        if (isDragging) return
        // 绘画模式下不触发选中
        if (isDrawMode()) return
        // 更新全局选中 ID
        setSelectedId(id)
    }

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
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
    bind:this={canvasContainerRef}
    class="canvas-container"
    class:editing
    style="--offset-x: {offsetX}px; --offset-y: {offsetY}px; --scale: {scale};"
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
    use:drawModeAction={{
        editingAccessor: () => editing,
        scaleAccessor: () => (editing ? scale * 0.5 : scale)
    }}
    role="application"
    onpointerdown={() => (isDragging = true)}
    onpointerup={() => (isDragging = false)}
    onpointercancel={() => (isDragging = false)}
>
    <NodeRenderer node={domTree} selectedId={selectedId()} {editing} select={handleSelect} />

    <!-- 使用独立的DrawModeOverlay组件渲染预览矩形 -->
    <DrawModeOverlay {editing} />
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
