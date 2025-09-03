<!-- StatusBar.svelte
 * 用于显示实时画布缩放百分比
-->
<script lang="ts">
    import { canvasScale } from '../../services/repository/canvas-state.store'
</script>

<div class="status-bar">
    缩放：{Math.round($canvasScale * 100)}%
</div>

<style>
    .status-bar {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        padding-left: calc(8px * var(--scale-ratio, 1));
        font-size: calc(12px * var(--scale-ratio, 1));
        color: #fff;
        background: rgba(30, 41, 59, 0.95);
    }
</style>
