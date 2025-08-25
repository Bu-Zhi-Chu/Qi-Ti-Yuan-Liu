<!--\n  ToggleSwitch.svelte\n  通用开关组件\n  功能：\n  - 提供与背景编辑器、边框编辑器等一致的开关视觉效果\n  - 支持双向绑定 checked\n  - 支持禁用状态\n  使用方法：\n  <ToggleSwitch id=\"some-id\" bind:checked={flag} on:change={handler}/>\n-->
<script lang="ts">
    import { createEventDispatcher } from 'svelte'
    // 组件属性定义
    let {
        id = '',
        checked = $bindable(false),
        disabled = false
    } = $props<{
        id?: string
        checked?: boolean
        disabled?: boolean
    }>()

    const dispatch = createEventDispatcher<{ change: boolean }>()

    function handleChange(event: Event) {
        const value = (event.target as HTMLInputElement).checked
        checked = value
        dispatch('change', value)
    }
</script>

<label class="switch">
    <input {id} type="checkbox" bind:checked {disabled} onchange={handleChange} />
    <span class="slider"></span>
</label>

<style>
    /* 与 BackgroundEditor / BorderEditor 保持一致的样式 */
    .switch {
        position: relative;
        display: inline-block;
        width: calc(44px * var(--scale-ratio, 1));
        height: calc(24px * var(--scale-ratio, 1));
    }
    .switch input {
        opacity: 0;
        width: 0;
        height: 0;
    }
    .slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(255, 255, 255, 0.1);
        transition: 0.3s;
        border-radius: calc(12px * var(--scale-ratio, 1));
    }
    .slider:before {
        position: absolute;
        content: '';
        height: calc(18px * var(--scale-ratio, 1));
        width: calc(18px * var(--scale-ratio, 1));
        left: calc(6px * var(--scale-ratio, 1));
        bottom: calc(3px * var(--scale-ratio, 1));
        background-color: white;
        transition: 0.3s;
        border-radius: 50%;
    }
    input:checked + .slider {
        background-color: #6366f1;
    }
    input:checked + .slider:before {
        transform: translateX(calc(17px * var(--scale-ratio, 1)));
    }
</style>
