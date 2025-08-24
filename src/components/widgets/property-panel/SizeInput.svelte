<!-- SizeInput.svelte
     通用数字输入 + 单位切换组件
     通过双向绑定 value/unit，内部支持单位互转与步长自动调整

     使用示例：
     <SizeInput bind:value={widthVal} bind:unit={widthUnit} convert={convertWidth} disabled={isRoot} />
-->
<script lang="ts">
    import { createEventDispatcher } from 'svelte'
    interface Props {
        value?: string
        unit?: 'px' | '%'
        unitOptions?: ('px' | '%')[]
        disabled?: boolean
        step?: number | null
        convert?: (val: number, from: 'px' | '%', to: 'px' | '%') => number
        placeholder?: string
    }

    let {
        value = $bindable<string>(''),
        unit = $bindable<'px' | '%'>('px'),
        unitOptions = ['px', '%'],
        disabled = false,
        step = null,
        convert = (val: number) => val,
        placeholder = ''
    } = $props<{
        value?: string
        unit?: 'px' | '%'
        unitOptions?: ('px' | '%')[]
        disabled?: boolean
        step?: number | null
        convert?: (val: number, from: 'px' | '%', to: 'px' | '%') => number
        placeholder?: string
    }>()

    // 通过 $bindable 直接绑定，无需额外内部状态
    const dispatch = createEventDispatcher<{ input: { value: string; unit: 'px' | '%' }; change: { value: string; unit: 'px' | '%' } }>()

    // 外部 props 改变时同步内部

    // 输入值变化
    function handleInput(e: Event) {
        const inputEl = e.currentTarget as HTMLInputElement
        value = inputEl.value
        dispatch('input', { value, unit })
        dispatch('change', { value, unit })
    }

    // 切换单位
    function toggleUnit() {
        if (disabled || unitOptions.length < 2) return
        const idx = unitOptions.indexOf(unit)
        const nextUnit = unitOptions[(idx + 1) % unitOptions.length]
        const num = parseFloat(value) || 0
        const converted = convert(num, unit, nextUnit)
        // 根据转换后的值决定保留小数
        value = nextUnit === '%' ? String(Math.round(converted * 10) / 10) : String(Math.round(converted * 100) / 100)
        unit = nextUnit
        dispatch('change', { value, unit })
    }

    // 计算步长

    // 计算步长
    let calcStep = $derived(step != null ? step : unit === '%' ? 0.1 : 1)
</script>

<!-- 使用 wrapper，按钮绝对定位叠加，保证输入框宽度 -->
<div class="size-input-wrapper">
    <input type="number" step={calcStep} bind:value oninput={handleInput} {placeholder} {disabled} class:disabled-input={disabled} />
</div>
<button class="unit-toggle" class:disabled-input={disabled || unitOptions.length < 2} onclick={toggleUnit} disabled={disabled || unitOptions.length < 2}>
    {unit}
</button>

<style>
    input {
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

    .size-input-wrapper {
        flex: 1;
        display: flex;
        align-items: center;
        gap: calc(6px * var(--scale-ratio, 1));
    }

    /* 若 property-row 中已存在按钮，隐藏占位符 */
    :global(.property-row:has(.unit-toggle) .unit-placeholder) {
        display: none;
    }
    .unit-toggle:hover {
        background: rgba(255, 255, 255, 0.15);
    }
    .unit-toggle:disabled,
    input:disabled {
        cursor: not-allowed;
        opacity: 0.5;
        color: #64748b;
    }
    .disabled-input {
        color: #64748b !important;
    }
    input[type='number']::-webkit-inner-spin-button,
    input[type='number']::-webkit-outer-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }
    input[type='number'] {
        appearance: textfield;
        -moz-appearance: textfield;
    }
</style>
