<!--
 * 自适应滑动条组件 - 基于ResponsiveBox实现
 * 使用Svelte 5 Runes系统，确保宽高与其他属性栏组件完全一致
 * 支持自适应缩放，使用calc(px * var(--scale-ratio, 1))计算实际尺寸
 *
 * 使用方法：
 * <ResponsiveSlider
 *   bind:value={gradientRatio}
 *   min={0}
 *   max={100}
 *   step={1}
 *   oninput={handleChange}
 * />
 *
 * 自适应特性：
 * - 高度：calc(32px * var(--scale-ratio, 1)) - 与其他输入框一致
 * - 滑块：calc(16px * var(--scale-ratio, 1)) - 精确缩放
 * - 轨道：calc(6px * var(--scale-ratio, 1)) - 统一风格
-->

<script lang="ts">
    import ResponsiveBox from '../core/ResponsiveBox.svelte'

    interface Props {
        value: number
        min?: number
        max?: number
        step?: number
        oninput?: (value: number) => void
        disabled?: boolean
        class?: string
    }

    let { value = $bindable(), min = 0, max = 100, step = 1, oninput, disabled = false, class: className = '' }: Props = $props()

    function handleInput(event: Event) {
        const target = event.target as HTMLInputElement
        const newValue = parseFloat(target.value)
        value = newValue
        oninput?.(newValue)
    }
</script>

<ResponsiveBox class="responsive-slider {className}" style="flex: 1; position: relative;">
    <input type="range" {min} {max} {step} bind:value oninput={handleInput} {disabled} style="width: 100%; height: 100%; margin: 0; padding: 0;" />
</ResponsiveBox>

<style>
    :global(.responsive-slider) {
        height: calc(34px * var(--scale-ratio, 1));
        display: flex;
        align-items: center;
    }

    :global(.responsive-slider input[type='range']) {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: calc(6px * var(--scale-ratio, 1));
        background: rgba(255, 255, 255, 0.1);
        border: calc(1px * var(--scale-ratio, 1)) solid rgba(255, 255, 255, 0.2);
        border-radius: calc(6px * var(--scale-ratio, 1));
        outline: none;
        transition: all 0.3s ease;
        cursor: pointer;
    }

    :global(.responsive-slider input[type='range']:hover) {
        background: rgba(255, 255, 255, 0.15);
        border-color: rgba(255, 255, 255, 0.25);
    }

    :global(.responsive-slider input[type='range']:focus) {
        background: rgba(255, 255, 255, 0.15);
        border-color: #cbd5e1;
        box-shadow: 0 0 0 calc(3px * var(--scale-ratio, 1)) rgba(255, 255, 255, 0.1);
    }

    :global(.responsive-slider input[type='range']::-webkit-slider-thumb) {
        -webkit-appearance: none;
        appearance: none;
        width: calc(16px * var(--scale-ratio, 1));
        height: calc(16px * var(--scale-ratio, 1));
        background: #e2e8f0;
        border: calc(1px * var(--scale-ratio, 1)) solid rgba(255, 255, 255, 0.2);
        border-radius: 50%;
        transition: all 0.3s ease;
    }

    :global(.responsive-slider input[type='range']::-moz-range-thumb) {
        width: calc(16px * var(--scale-ratio, 1));
        height: calc(16px * var(--scale-ratio, 1));
        background: #e2e8f0;
        border: calc(1px * var(--scale-ratio, 1)) solid rgba(255, 255, 255, 0.2);
        border-radius: 50%;
        cursor: pointer;
        transition: all 0.3s ease;
    }

    :global(.responsive-slider input[type='range']:hover::-webkit-slider-thumb) {
        background: #cbd5e1;
        border-color: rgba(255, 255, 255, 0.3);
    }

    :global(.responsive-slider input[type='range']:hover::-moz-range-thumb) {
        background: #cbd5e1;
        border-color: rgba(255, 255, 255, 0.3);
    }

    :global(.responsive-slider input[type='range']:active::-webkit-slider-thumb) {
        background: #f1f5f9;
        border-color: #cbd5e1;
        box-shadow: 0 0 0 calc(2px * var(--scale-ratio, 1)) rgba(255, 255, 255, 0.2);
    }

    :global(.responsive-slider input[type='range']:active::-moz-range-thumb) {
        background: #f1f5f9;
        border-color: #cbd5e1;
        box-shadow: 0 0 0 calc(2px * var(--scale-ratio, 1)) rgba(255, 255, 255, 0.2);
    }

    :global(.responsive-slider input[type='range']:disabled) {
        opacity: 0.5;
        cursor: not-allowed;
    }

    :global(.responsive-slider input[type='range']:disabled::-webkit-slider-thumb) {
        cursor: not-allowed;
    }

    :global(.responsive-slider input[type='range']:disabled::-moz-range-thumb) {
        cursor: not-allowed;
    }
</style>
