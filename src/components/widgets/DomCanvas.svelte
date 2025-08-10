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
    import { onMount, onDestroy } from 'svelte'
    import NodeRenderer from './NodeRenderer.svelte'
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
        // 鼠标移动方向与画布平移方向保持一致
        setState({ offsetX: state.startOffsetX + dx, offsetY: state.startOffsetY + dy })
    }

    // 释放拖动
    const endDrag = () => {
        if (state.dragging) {
            setState({ dragging: false, cursor: state.spaceDown ? 'grab' : 'auto' })
        }
    }

    // 注册全局监听
    onMount(() => {
        window.addEventListener('keydown', handleKeyDown, { passive: false })
        window.addEventListener('keyup', handleKeyUp)
        window.addEventListener('mouseup', endDrag)
        window.addEventListener('mousemove', handleMouseMove)
    })

    onDestroy(() => {
        window.removeEventListener('keydown', handleKeyDown)
        window.removeEventListener('keyup', handleKeyUp)
        window.removeEventListener('mouseup', endDrag)
        window.removeEventListener('mousemove', handleMouseMove)
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
    function handleSelect(event: CustomEvent<string>) {
        selectedId = event.detail
    }

    /**
     * 递归创建 DOM 元素
     * @param node DOM 节点数据
     * @returns 创建的 DOM 元素
     */
    function createDomElement(node: DomNode): HTMLElement {
        // 创建元素，若未指定 tagName 则默认使用 'div'
        const tagName = node.tagName ?? 'div'
        const element = document.createElement(tagName)
        const nodeKey = node.nodeId ?? node.id

        // 设置元素 ID 和数据属性
        element.dataset.nodeId = nodeKey

        // 添加点击事件
        element.addEventListener('click', (e) => handleSelectNode(nodeKey, e))

        // 设置属性
        if (node.attributes) {
            Object.entries(node.attributes).forEach(([key, value]) => {
                element.setAttribute(key, value)
            })
        }

        // 设置样式
        if (node.styles) {
            Object.entries(node.styles).forEach(([key, value]) => {
                element.style[key as any] = value
            })
        }

        // 添加默认样式
        element.style.transition = 'all 0.2s ease'
        element.style.border = 'calc(1px * var(--scale-ratio, 1)) dashed transparent'

        // 递归处理子节点
        if (node.children && node.children.length > 0) {
            node.children.forEach((childNode) => {
                const childElement = createDomElement(childNode)
                element.appendChild(childElement)
            })
        }

        return element
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
    style={`width: 100%; height: 100%; cursor: ${state.cursor}; transform: ${editing ? `translate(calc(-50% + ${state.offsetX}px), calc(-50% + ${state.offsetY}px)) scale(0.5)` : `translate(${state.offsetX}px, ${state.offsetY}px)`}; transform-origin: center center;`}
    role="application"
    onmousedown={handleMouseDown}
>
    <NodeRenderer node={domTree} {selectedId} on:select={handleSelect} />
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
