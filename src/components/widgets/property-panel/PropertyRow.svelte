<!--
  PropertyRow.svelte
  ------------------
  属性面板统一行组件，用于封装「标签 + 属性容器 + 单位按钮(可选)」的布局。

  功能特性：
  1. 样式、尺寸与现有 .attr-item 行完全一致，确保视觉与交互保持不变。
  2. 通过插槽灵活支持各种编辑控件：文本、数字、颜色选择器、开关、下拉框、文本域等。
  3. 预留名为 "unit" 的插槽，用于放置单位切换按钮；若未提供则显示占位占位区，保证整体对齐。

  使用示例：
  ```svelte
  // 纯文本输入
  &lt;PropertyRow label="节点名称">
      &lt;input type="text" ... />
  &lt;/PropertyRow>

  // 数字输入 + 单位切换按钮
  &lt;PropertyRow label="节点宽度">
      &lt;input type="number" bind:value={width} />
      &lt;button slot="unit" class="unit-toggle" on:click={toggleWidthUnit}>{currentWidthUnit}</button>
  &lt;/PropertyRow>

  // 颜色选择器
  &lt;PropertyRow label="文字颜色">
      &lt;ColorPicker bind:value={fontColor} />
  </PropertyRow>
  ```
-->
<script lang="ts">
    import type { Snippet } from 'svelte'
    interface Props {
        /** 左侧标签文本 */
        label: string
        /** 默认插槽 snippet */
        children?: Snippet
        /** 单位按钮插槽 snippet */
        unit?: Snippet
    }

    // Runes props (Svelte5)
    let { label, children, unit }: Props = $props()
</script>

<div class="attr-item property-row">
    <!-- 标签区域 -->
    <span class="row-label">{label}</span>

    <!-- 属性控件容器（默认插槽）-->
    {@render children?.()}

    <!-- 单位按钮：存在则渲染，否则占位 -->
    {#if unit}
        {@render unit()}
    {:else}
        <span class="unit-placeholder"></span>
    {/if}
</div>

<style>
    /* 行容器，与旧 .attr-item 保持一致 */
    :global(.attr-item),
    .property-row {
        display: flex;
        align-items: center;
        gap: calc(10px * var(--scale-ratio, 1));
    }

    /* 标签样式 */
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

    :global(.unit-toggle:disabled),
    :global(input:disabled) {
        cursor: not-allowed;
        opacity: 0.5;
        color: #64748b;
    }

    /* 与旧面板占位宽度保持一致 */
    .unit-placeholder {
        width: calc(40px * var(--scale-ratio, 1));
    }

    /* 焦点态 */
    :global(select:focus),
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
        -moz-appearance: textfield;
    }
</style>
