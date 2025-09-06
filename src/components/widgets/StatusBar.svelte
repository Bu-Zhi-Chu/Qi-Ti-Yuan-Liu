<!-- StatusBar.svelte
 * 用于显示实时画布缩放百分比
-->
<script lang="ts">
    import { canvasScale } from '../../services/repository/canvas-state.store'
    $: percent = Math.round($canvasScale * 100)
    function toggleScale() {
        const p = percent
        let newPercent: number
        if (p >= 100) {
            newPercent = p === 100 ? 50 : 100 // >100 归为 100，等于 100 切换到 50
        } else if (p >= 50) {
            newPercent = 100 // 50<x<100 切 100
        } else {
            newPercent = 50 // <50 切 50
        }
        canvasScale.set(newPercent / 100)
    }

    // 点击后切换缩放并移除焦点
    function handleClick(e: MouseEvent) {
        toggleScale()
        ;(e.currentTarget as HTMLElement)?.blur()
    }

    // 键盘触发后切换缩放并移除焦点
    function handleKey(e: KeyboardEvent) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            toggleScale()
            ;(e.currentTarget as HTMLElement)?.blur()
        }
    }
</script>

<div class="status-bar" role="button" tabindex="0" on:click={handleClick} on:keydown={handleKey} style="cursor: pointer;" title="点击切换 50% / 100%">
    缩放：{percent}%
</div>

<style>
    .status-bar {
        pointer-events: auto;
        cursor: pointer;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        padding-left: calc(8px * var(--scale-ratio, 1));
        font-size: calc(12px * var(--scale-ratio, 1));
        color: #fff;
    }
</style>
