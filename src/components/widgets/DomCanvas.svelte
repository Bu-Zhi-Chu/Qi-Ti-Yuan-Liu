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
        domTree: any
        selectedId?: string | null
        editing?: boolean
    }

    /** DOM 节点类型 */
    import type { DomNode } from '../../types/dom-node.types'
    import { onMount } from 'svelte'
    import NodeRenderer from './NodeRenderer.svelte'
    import { registerSpacePressRelease, registerMouseMove, registerMouseLeftPressRelease } from '../../services/utils/shortcut.service'
</script>

<script lang="ts">
    // 组件属性 - 使用 Runes $props 声明，selectedId 支持双向绑定
    let { domTree, selectedId = $bindable(null), editing = false } = $props<{ domTree: import('../../types/dom-node.types').DomNode; selectedId?: string | null; editing?: boolean }>()
    // 顶部容器引用，用于渲染画布内容
    let canvasContainerRef: HTMLDivElement | null = null

    /* =================== 画布移动逻辑 =================== */
    interface DragState {
        spaceDown: boolean
        dragging: boolean
        startX: number
        startY: number
        startOffsetX: number
        startOffsetY: number
        offsetX: number
        offsetY: number
        cursor: string
    }
    let state: DragState = $state({
        spaceDown: false,
        dragging: false,
        startX: 0,
        startY: 0,
        startOffsetX: 0,
        startOffsetY: 0,
        offsetX: 0,
        offsetY: 0,
        cursor: 'auto'
    })
    const setState = (patch: Partial<DragState>) => {
        state = { ...state, ...patch }
    }

    // 监听键盘空格按下/松开
    const handleKeyDown = (e: KeyboardEvent) => {
        if (!editing || e.repeat) return
        if (e.code === 'Space') {
            setState({ spaceDown: true, cursor: 'grab' })
            // 阻止页面滚动
            e.preventDefault()
        }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
        if (e.code === 'Space') {
            setState({ spaceDown: false, dragging: false, cursor: 'auto' })
        }
    }

    // 鼠标按下开始拖动
    const handleMouseDown = (e: MouseEvent) => {
        if (!editing || !state.spaceDown || !canvasContainerRef) return
        setState({
            dragging: true,
            startX: e.clientX,
            startY: e.clientY,
            startOffsetX: state.offsetX,
            startOffsetY: state.offsetY,
            cursor: 'grabbing'
        })
        e.preventDefault()
    }

    // 鼠标移动滚动画布
    const handleMouseMove = (e: MouseEvent) => {
        if (!state.dragging) return
        const dx = e.clientX - state.startX
        const dy = e.clientY - state.startY

        // 获取当前缩放比例，用于补偿鼠标移动距离
        const scaleRatio = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--scale-ratio') || '1')

        // 根据缩放比例调整移动距离，确保鼠标与画布移动同步
        const adjustedDx = dx / scaleRatio
        const adjustedDy = dy / scaleRatio

        // 鼠标移动方向与画布平移方向保持一致
        setState({ offsetX: state.startOffsetX + adjustedDx, offsetY: state.startOffsetY + adjustedDy })
    }

    // 释放拖动
    const endDrag = () => {
        if (state.dragging) {
            setState({ dragging: false, cursor: state.spaceDown ? 'grab' : 'auto' })
        }
    }

    // 通过快捷键服务统一注册监听，确保自动清理
    onMount(() => {
        const offSpace = registerSpacePressRelease(handleKeyDown, handleKeyUp)
        const offMove = registerMouseMove(handleMouseMove)
        const offLeft = registerMouseLeftPressRelease(handleMouseDown, endDrag)

        return () => {
            offSpace()
            offMove()
            offLeft()
        }
    })

    /**
     * 选中节点事件处理
     * @param nodeId 要选中的节点 ID
     */
    function handleSelectNode(nodeId: string, event: MouseEvent) {
        // 阻止事件冒泡，避免重复触发
        event.stopPropagation()
        // 更新选中的节点 ID
        selectedId = nodeId
    }

    /**
     * 处理 NodeRenderer 选中事件
     */
    function handleSelect(id: string) {
        // 拖动画布过程中忽略节点选中
        if (state.spaceDown || state.dragging) return
        selectedId = id
    }

    /**
     * DOM 树渲染交由 NodeRenderer 递归组件处理
     */

    /*
     * 当退出编辑模式时，重置画布位移，确保“正常模式”回到原位
     */
    $effect(() => {
        if (!editing && (state.offsetX !== 0 || state.offsetY !== 0)) {
            setState({ offsetX: 0, offsetY: 0 })
        }
    })
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
    bind:this={canvasContainerRef}
    class:editing
    style={`width: 100%; height: 100%; cursor: ${state.cursor}; transform: ${editing ? `translate(calc(-50% + calc(${state.offsetX}px * var(--scale-ratio, 1))), calc(-50% + calc(${state.offsetY}px * var(--scale-ratio, 1)))) scale(0.5)` : `translate(calc(${state.offsetX}px * var(--scale-ratio, 1)), calc(${state.offsetY}px * var(--scale-ratio, 1)))`}; transform-origin: center center;`}
    role="application"
>
    <NodeRenderer node={domTree} {selectedId} {editing} select={handleSelect} />
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
