<!--
 * DrawModeOverlay.svelte
 * 绘画模式预览层：在绘制矩形时提供实时预览
 *
 * 使用：
 * <DrawModeOverlay editing={true} />
-->

<script lang="ts">
    import { isDrawing, drawRect } from '../../services/utils/draw-mode.store.svelte'
    // 外部控制：是否处于编辑状态
    const { editing = false } = $props<{ editing?: boolean }>()

    // 当前绘制矩形数据
    const rect = $derived.by(() => drawRect())
    // 绘制中状态，保持响应式
    const drawing = $derived.by(() => isDrawing())
</script>

{#if drawing && rect}
    <div
        class="draw-preview"
        style={`position: absolute; left: ${rect.left}%; top: ${rect.top}%; width: ${rect.width}%; height: ${rect.height}%; background-color: rgba(148, 163, 184, 0.35); border: calc(2px * var(--scale-ratio, 1)) dashed #94a3b8; border-radius: calc(4px * var(--scale-ratio, 1)); box-shadow: 0 0 calc(6px * var(--scale-ratio, 1)) rgba(0,0,0,0.15); pointer-events: none; z-index: 100;`}
    ></div>
{/if}
