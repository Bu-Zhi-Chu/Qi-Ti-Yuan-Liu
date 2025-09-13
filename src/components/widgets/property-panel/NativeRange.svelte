<!-- NativeRange.svelte -->
<script lang="ts">
    import { onMount } from 'svelte'

    interface Props {
        value: number // 0-1
        min?: number
        max?: number
        step?: number
        onChange?: (v: number) => void
    }

    let { value = $bindable(), min = 0, max = 1, step = 0.01, onChange }: Props = $props()

    let trackEl: HTMLDivElement
    let dragging = $state(false)
    let inputValue = $state(String(value)) // 右侧输入框字符串

    // 百分比显示
    const percent = $derived(((value - min) / (max - min)) * 100)

    // 右侧输入框实时同步
    $effect(() => {
        inputValue = String(value)
    })

    function updateValue(clientX: number) {
        if (!trackEl) return
        const rect = trackEl.getBoundingClientRect()
        let p = (clientX - rect.left) / rect.width
        p = Math.max(0, Math.min(1, p))
        let v = min + p * (max - min)
        if (step > 0) v = Math.round(v / step) * step
        value = v
        onChange?.(v)
    }

    function onPointerDown(e: PointerEvent) {
        e.preventDefault()
        dragging = true
        updateValue(e.clientX)
        trackEl.setPointerCapture(e.pointerId)
    }

    function onPointerMove(e: PointerEvent) {
        if (!dragging) return
        updateValue(e.clientX)
    }

    function onPointerUp(e: PointerEvent) {
        dragging = false
        trackEl.releasePointerCapture(e.pointerId)
    }

    onMount(() => {
        const opts = false
        const move = (ev: Event) => onPointerMove(ev as PointerEvent)
        const up = (ev: Event) => onPointerUp(ev as PointerEvent)
        trackEl?.addEventListener('pointermove', move, opts)
        trackEl?.addEventListener('pointerup', up, opts)
        return () => {
            trackEl?.removeEventListener('pointermove', move, opts)
            trackEl?.removeEventListener('pointerup', up, opts)
        }
    })

    // 右侧输入框变化 → 同步 value
    function handleInput(e: Event) {
        const v = parseFloat((e.currentTarget as HTMLInputElement).value)
        if (!isNaN(v)) {
            value = Math.max(min, Math.min(max, v))
            onChange?.(value)
        }
    }
</script>

<div class="range-wrapper">
    <!-- 滑动条占据中间区域 -->
    <div class="slider-col">
        <div class="track" bind:this={trackEl} onpointerdown={onPointerDown}>
            <div class="fill" style="width: {percent}%"></div>
            <div class="thumb" style="left: {percent}%"></div>
        </div>
    </div>
</div>

<!-- 数值输入框放在单位插槽区域 -->
<div class="unit-input">
    <input type="number" bind:value={inputValue} oninput={handleInput} {min} {max} {step} />
</div>

<style>
    .range-wrapper {
        display: flex;
        align-items: center;
        flex: 1 1 auto; /* occupy PropertyRow middle area */
        min-width: 0;
    }

    /* slider fills the entire middle area */
    .slider-col {
        flex: 1 1 auto;
        display: flex;
        align-items: center;
        height: calc(32px * var(--scale-ratio, 1));
        padding: 0 calc(8px * var(--scale-ratio, 1));
        border: calc(1px * var(--scale-ratio, 1)) solid #4b5563;
        border-radius: calc(6px * var(--scale-ratio, 1));
        box-sizing: border-box;
    }
    .track {
        flex: 1;
        position: relative;
        height: calc(4px * var(--scale-ratio, 1));
        background: #374151;
        border-radius: calc(2px * var(--scale-ratio, 1));
        cursor: pointer;
    }
    .fill {
        height: 100%;
        background: #60a5fa;
        border-radius: calc(2px * var(--scale-ratio, 1));
        pointer-events: none;
    }
    .thumb {
        position: absolute;
        top: 50%;
        width: calc(16px * var(--scale-ratio, 1));
        height: calc(16px * var(--scale-ratio, 1));
        background: #ffffff;
        border: calc(1px * var(--scale-ratio, 1)) solid #9ca3af;
        border-radius: 50%;
        transform: translate(-50%, -50%);
    }

    /* numeric input sits in unit slot area */
    .unit-input {
        flex: 0 0 calc(40px * var(--scale-ratio, 1));
    }

    /* When NativeRange provides its own unit-input, hide the default placeholder to avoid double width */
    :global(.property-row:has(.unit-input) .unit-placeholder) {
        display: none;
    }
    .unit-input input {
        width: 100%;
        height: calc(32px * var(--scale-ratio, 1));
        padding: 0 calc(8px * var(--scale-ratio, 1));
        border: calc(1px * var(--scale-ratio, 1)) solid rgba(255, 255, 255, 0.2);
        border-radius: calc(6px * var(--scale-ratio, 1));
        font-size: calc(11px * var(--scale-ratio, 1));
        background: rgba(255, 255, 255, 0.1);
        color: #e2e8f0;
        text-align: center;
        box-sizing: border-box;
        transition: all 0.3s ease;
        appearance: none;
    }
    .unit-input input:focus {
        outline: none;
        border-color: #60a5fa;
    }
    .unit-input input::-webkit-outer-spin-button,
    .unit-input input::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }
</style>
