<!--
 * DrawModeOverlay.svelte
 * 绘画模式预览层：在绘制矩形时提供实时预览
 *
 * 使用：
 * <DrawModeOverlay editing={true} />
-->

<script lang="ts">
    import { isDrawing, drawRect } from '../../services/repository/draw-mode.store.svelte'
    import { selectedId } from '../../services/repository/dom-tree.store.svelte'

    // 外部控制：是否处于编辑状态
    const { editing = false } = $props<{ editing?: boolean }>()

    // 当前绘制矩形数据
    const rect = $derived.by(() => drawRect())
    // 绘制中状态，保持响应式
    const drawing = $derived.by(() => isDrawing())

    /**
     * 根据当前 selectedId 查询对应的真实 DOM 元素
     * 当选中节点发生变化时，自动更新 targetEl
     */
    const targetEl = $derived.by(() => {
        const id = selectedId()
        if (!id) return null
        return document.querySelector(`[id="${id}"]`) as HTMLElement | null
    })

    /**
     * portal action：将节点挂载到指定目标元素内部
     *  - 首次初始化直接 appendChild
     *  - 当参数 target 变化时，自动迁移到新目标
     *  - 组件销毁时移除挂载
     */
    function portal(node: HTMLElement, target: HTMLElement | null) {
        if (!target) return {}
        target.appendChild(node)
        let current: HTMLElement | null = target
        return {
            update(newTarget: HTMLElement | null) {
                if (newTarget === current) return
                if (node.parentNode) (node.parentNode as HTMLElement).removeChild(node)
                if (newTarget) newTarget.appendChild(node)
                current = newTarget
            },
            destroy() {
                if (node.parentNode === current) (current as HTMLElement).removeChild(node)
            }
        }
    }
</script>

{#if drawing && rect && targetEl}
    <div
        use:portal={targetEl}
        class="draw-preview"
        style={`position: absolute; left: ${rect.left}%; top: ${rect.top}%; width: ${rect.width}%; height: ${rect.height}%; background-color: rgba(148, 163, 184, 0.35); border: calc(2px * var(--scale-ratio, 1)) dashed #94a3b8; border-radius: calc(4px * var(--scale-ratio, 1)); box-shadow: 0 0 calc(6px * var(--scale-ratio, 1)) rgba(0,0,0,0.15); pointer-events: none; z-index: 100;`}
    ></div>
{/if}
