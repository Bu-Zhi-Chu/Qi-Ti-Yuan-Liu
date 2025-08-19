<!--
  LayoutEditor.svelte
  布局样式编辑面板
  提供布局相关属性的可视化编辑界面
-->
<div class="layout-editor">
    <h3>布局样式</h3>
</div>

<style>
    .layout-editor {
        padding: calc(20px * var(--scale-ratio, 1));
        color: #e2e8f0;
    }
    h3 {
        margin: 0 0 calc(16px * var(--scale-ratio, 1)) 0;
        font-size: calc(16px * var(--scale-ratio, 1));
        font-weight: 600;
        color: #cbd5e1;
    }
</style>