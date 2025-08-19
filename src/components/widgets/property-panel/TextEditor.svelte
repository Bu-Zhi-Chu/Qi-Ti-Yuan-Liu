<!--
  TextEditor.svelte
  文字样式编辑面板
  提供文字相关属性的可视化编辑界面
-->
<div class="text-editor">
    <h3>文字样式</h3>
</div>

<style>
    .text-editor {
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