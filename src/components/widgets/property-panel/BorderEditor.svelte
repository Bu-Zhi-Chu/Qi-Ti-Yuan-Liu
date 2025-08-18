<!--
  * BorderEditor.svelte
  * ---------------------------------------------------------------------
  * 边框样式编辑面板（占位）
  * 预计功能：
  *   1. 设置边框宽度、样式、颜色
  *   2. 设置圆角
  *   3. 支持各方向独立控制
  * ---------------------------------------------------------------------
  * 使用示例：
  *   <BorderEditor selectedId={currentId} />
  * ---------------------------------------------------------------------
-->

<script lang="ts">
    // Runes props - 暂仅接收 selectedId
    let { selectedId } = $props<{ selectedId: string | null }>()
</script>

<div class="border-editor">
    {#if selectedId}
        <h3>边框样式</h3>
        <!-- 待实现：边框属性编辑控件 -->
    {:else}
        <p class="placeholder">请选择一个节点来编辑边框</p>
    {/if}
</div>

<style>
    .border-editor {
        padding: calc(20px * var(--scale-ratio, 1));
        color: #e2e8f0;
    }
    h3 {
        margin: 0 0 calc(16px * var(--scale-ratio, 1)) 0;
        font-size: calc(16px * var(--scale-ratio, 1));
        font-weight: 600;
        color: #cbd5e1;
    }
    .placeholder {
        color: #64748b;
        font-style: italic;
        text-align: center;
        margin-top: calc(40px * var(--scale-ratio, 1));
        font-size: calc(14px * var(--scale-ratio, 1));
    }
</style>
