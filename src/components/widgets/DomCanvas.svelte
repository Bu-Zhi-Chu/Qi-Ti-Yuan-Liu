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
</script>

<script lang="ts">
    // 组件属性 - 使用 Runes $props 声明，selectedId 支持双向绑定
    let { domTree, selectedId = null, editing = false } = $props<{ domTree: import('../../types/dom-node.types').DomNode; selectedId?: string | null; editing?: boolean }>()
    // 顶部容器引用，用于渲染画布内容
    let canvasContainerRef: HTMLDivElement | null = null

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
     * 递归创建 DOM 元素
     * @param node DOM 节点数据
     * @returns 创建的 DOM 元素
     */
    function createDomElement(node: DomNode): HTMLElement {
        // 创建元素
        const element = document.createElement(node.tagName)
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
        element.style.border = '1px dashed transparent'

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
     * 更新选中节点样式
     */
    $effect(() => {
        if (!selectedId) return

        // 先清除所有元素的选中样式
        const allElements = document.querySelectorAll('[data-node-id]')
        allElements.forEach((el) => {
            const elem = el as HTMLElement
            elem.style.border = '1px dashed transparent'
            elem.style.boxShadow = 'none'
        })

        // 为选中元素添加样式
        const selectedElement = document.querySelector(`[data-node-id="${selectedId}"]`)
        if (selectedElement) {
            const elem = selectedElement as HTMLElement
            elem.style.border = '1px dashed #3b82f6'
            elem.style.boxShadow = '0 0 10px rgba(59, 130, 246, 0.5)'
        }
    })

    /**
     * DOM 树更新时，重新渲染画布
     */
    $effect(() => {
        if (!domTree) return

        // 获取画布容器
        const canvasContainer = canvasContainerRef
        if (!canvasContainer) return

        // 清空容器
        canvasContainer.innerHTML = ''

        // 创建根元素并添加到容器
        const rootElement = createDomElement(domTree)
        canvasContainer.appendChild(rootElement)
    })
</script>

<div bind:this={canvasContainerRef} class:editing style="background: white; width: 100%; height: 100%; overflow: auto;">
    <!-- DOM 树将在这里动态渲染 -->
</div>

<style>
    .editing {
        position: absolute;
        left: 50%;
        top: 50%;
        width: 100%;
        height: 100%;
        display: block;
        transform: translate(-50%, -50%) scale(0.5);
        transform-origin: center center;
        z-index: 5;
    }
</style>
