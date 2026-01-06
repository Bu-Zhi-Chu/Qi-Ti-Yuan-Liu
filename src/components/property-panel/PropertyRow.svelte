<!--
  PropertyRow.svelte
  ------------------
  属性面板统一行组件。左侧显示标签文本，中部渲染默认插槽（各种输入/选择控件），
  右侧预留名为 "unit" 的插槽，用于放置单位切换按钮；若父级未提供则显示占位元素，
  以保证布局对齐。
-->
<script lang="ts">
    /**
     * 属性行组件 Props
     * @prop label 行左侧文字标签
     * @prop labelVisible 是否显示标签，默认为 true
     */
    export let label: string
    export let labelVisible: boolean = true
    export let alignTop: boolean = false
</script>

<div class="attr-item property-row" class:align-top={alignTop}>
    <span class="row-label" style={labelVisible ? '' : 'visibility: hidden;'}>{label}</span>

    <!-- 默认插槽：表单控件 -->
    <slot></slot>

    <!-- 单位按钮插槽：未提供时占位 -->
    <slot name="unit">
        <span class="unit-placeholder"></span>
    </slot>
</div>

<style>
    .property-row {
        display: flex;
        align-items: center;
        gap: calc(10px * var(--scale-ratio, 1));
    }

    .property-row.align-top {
        align-items: flex-start;
    }

    .row-label {
        min-width: calc(30px * var(--scale-ratio, 1));
        font-size: calc(13px * var(--scale-ratio, 1));
        font-weight: 500;
        color: #94a3b8;
    }

    /* 通用输入/选择控件样式，保持与旧面板一致 */
    :global(input),
    :global(select),
    :global(textarea) {
        flex: 1;
        padding: calc(8px * var(--scale-ratio, 1)) calc(12px * var(--scale-ratio, 1));
        border: calc(1px * var(--scale-ratio, 1)) solid rgba(255, 255, 255, 0.2);
        border-radius: calc(6px * var(--scale-ratio, 1));
        font-size: calc(13px * var(--scale-ratio, 1));
        background: rgba(255, 255, 255, 0.1);
        color: #e2e8f0;
        transition: all 0.3s ease;
        appearance: none;
    }

    :global(input:disabled),
    :global(select:disabled),
    :global(textarea:disabled) {
        color: #64748b;
    }

    /* 单位切换按钮，与旧 .unit-toggle 保持一致 */
    :global(.unit-toggle) {
        width: calc(40px * var(--scale-ratio, 1));
        padding: calc(8px * var(--scale-ratio, 1)) calc(12px * var(--scale-ratio, 1));
        border: calc(1px * var(--scale-ratio, 1)) solid rgba(255, 255, 255, 0.2);
        border-radius: calc(6px * var(--scale-ratio, 1));
        font-size: calc(13px * var(--scale-ratio, 1));
        background: rgba(255, 255, 255, 0.1);
        color: #e2e8f0;
        text-align: center;
        cursor: pointer;
        transition: all 0.3s ease;
    }

    :global(.unit-toggle:hover) {
        background: rgba(255, 255, 255, 0.15);
    }

    :global(.unit-toggle:disabled) {
        cursor: not-allowed;
        opacity: 0.5;
        color: #64748b;
    }

    .unit-placeholder {
        width: calc(40px * var(--scale-ratio, 1));
    }

    /* 焦点态 */
    :global(select:focus),
    :global(input[type='range']) {
        width: 100%;
        user-select: auto;
        -webkit-user-select: auto;
    }

    :global(input:focus),
    :global(textarea:focus) {
        outline: none;
        border-color: #cbd5e1;
        background: rgba(255, 255, 255, 0.15);
        box-shadow: 0 0 0 calc(3px * var(--scale-ratio, 1)) rgba(255, 255, 255, 0.1);
    }

    /* 隐藏 number 原生箭头 */
    :global(input[type='number']::-webkit-inner-spin-button),
    :global(input[type='number']::-webkit-outer-spin-button) {
        -webkit-appearance: none;
        margin: 0;
    }

    :global(input[type='number']) {
        appearance: textfield;
    }
</style>
