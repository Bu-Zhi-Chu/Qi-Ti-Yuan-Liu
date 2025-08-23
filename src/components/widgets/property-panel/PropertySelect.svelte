<!--
  PropertySelect.svelte
  ---------------------
  通用下拉框组件，复用 AttrEditor 中的样式，确保视觉与交互保持一致。
  使用方法：
  <PropertySelect bind:value={selected} options={options} placeholder="请选择..." disabled={false} />
  - value     ：当前选中值，支持双向绑定
  - options   ：{ value:string; label:string }[] 数组
  - placeholder：可选，占位提示文字
  - disabled  ：是否禁用
  - id        ：可选，select 的 id，用于 label 关联
  事件：change -> 派发选中值(string)
-->
<script lang="ts">
    interface Option {
        value: string
        label: string
    }

    /**
     * 当前选中值。
     * 不设置默认 '', 避免与父组件 bind:value 冲突导致初次渲染短暂回落默认值。
     */
    export let value: string
    export let options: Option[] = []
    // placeholder prop 已移除
    export let disabled = false
    export let id: string | undefined = undefined
    export let change: (value: string) => void = () => {}

    import { onMount } from 'svelte'
    // 标记组件是否已完成初始化，避免初次渲染时触发 change 事件回写默认值
    let initialized = false
    onMount(() => {
        initialized = true
    })

    function handleChange(event: Event) {
        if (!initialized) return // 初始渲染产生的 change 事件忽略
        const target = event.currentTarget as HTMLSelectElement
        change(target.value)
    }
</script>

<div class="select-wrapper">
    <select {id} bind:value {disabled} on:change={handleChange}>
        <!-- 已移除 placeholder 默认选项 -->
        {#each options as opt}
            <option value={opt.value}>{opt.label}</option>
        {/each}
    </select>
</div>

<style>
    /* 与 AttrEditor 中保持一致的视觉风格 */
    .select-wrapper {
        position: relative;
        flex: 1;
    }
    .select-wrapper::after {
        content: '';
        position: absolute;
        right: calc(12px * var(--scale-ratio, 1));
        top: 50%;
        transform: translateY(-50%);
        width: 0;
        height: 0;
        border-left: calc(4px * var(--scale-ratio, 1)) solid transparent;
        border-right: calc(4px * var(--scale-ratio, 1)) solid transparent;
        border-top: calc(4px * var(--scale-ratio, 1)) solid #94a3b8;
        pointer-events: none;
    }

    .select-wrapper select {
        width: 100%;
        padding: calc(8px * var(--scale-ratio, 1)) calc(12px * var(--scale-ratio, 1));
        padding-right: calc(30px * var(--scale-ratio, 1)); /* 预留箭头空间 */
        border: calc(1px * var(--scale-ratio, 1)) solid rgba(255, 255, 255, 0.3);
        border-radius: calc(6px * var(--scale-ratio, 1));
        font-size: calc(13px * var(--scale-ratio, 1));
        background: rgba(30, 41, 59, 0.95);
        color: #e2e8f0;
        transition: all 0.3s ease;
        appearance: none;
    }

    .select-wrapper select option {
        background: #1e293b;
        color: #e2e8f0;
        padding: calc(8px * var(--scale-ratio, 1)) calc(12px * var(--scale-ratio, 1));
    }

    .select-wrapper select option:hover,
    .select-wrapper select option:focus,
    .select-wrapper select option:checked {
        color: #e2e8f0;
    }

    .select-wrapper select:disabled {
        color: #64748b;
        cursor: not-allowed;
        opacity: 0.5;
    }
    .select-wrapper select:focus {
        outline: none;
        border-color: #cbd5e1;
        background: rgba(255, 255, 255, 0.15);
        box-shadow: 0 0 0 calc(3px * var(--scale-ratio, 1)) rgba(255, 255, 255, 0.1);
    }
</style>
