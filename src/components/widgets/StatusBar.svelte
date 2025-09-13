<!-- StatusBar.svelte
 * 用于显示实时画布缩放百分比
-->
<script lang="ts">
    import { canvasScale } from '../../services/repository/canvas-state.store'
    import { onMount, onDestroy } from 'svelte'
    $: percent = Math.round($canvasScale * 100)
    let fps = 0
    let fpsText = '--'
    // 浏览器支持时显示已用 JS 堆内存（MB）
    let memoryMB: string = '--'
    // 监控开关
    import { perfMonitorEnabled } from '../../services/repository/perf-monitor.store'
    let fpsEnabled = $perfMonitorEnabled
    let memoryEnabled = $perfMonitorEnabled

    // 监听开关变化
    $: {
        fpsEnabled = $perfMonitorEnabled
        memoryEnabled = $perfMonitorEnabled
        restartLoop()
    }
    let _frameId: number
    function startFPSCounter() {
        let lastTime = performance.now()
        let frames = 0
        const loop = () => {
            const now = performance.now()
            if (fpsEnabled) frames++
            if (now - lastTime >= 1000) {
                // FPS
                fpsText = fpsEnabled ? String(frames) : '--'
                // 内存
                if (memoryEnabled && (performance as any).memory) {
                    const { usedJSHeapSize } = (performance as any).memory
                    memoryMB = (usedJSHeapSize / 1024 / 1024).toFixed(1)
                } else if (!memoryEnabled) {
                    memoryMB = '--'
                }
                frames = 0
                lastTime = now
            }
            _frameId = requestAnimationFrame(loop)
        }
        _frameId = requestAnimationFrame(loop)
    }
    onMount(startFPSCounter)
    onDestroy(() => {
        if (_frameId) cancelAnimationFrame(_frameId)
    })
    function toggleScale() {
        const p = percent
        let newPercent: number
        if (p >= 100) {
            newPercent = p === 100 ? 50 : 100 // >100 归为 100，等于 100 切换到 50
        } else if (p >= 50) {
            newPercent = 100 // 50<x<100 切 100
        } else {
            newPercent = 50 // <50 切 50
        }
        canvasScale.set(newPercent / 100)
    }

    // 点击后切换缩放并移除焦点
    function handleClick(e: MouseEvent) {
        toggleScale()
        ;(e.currentTarget as HTMLElement)?.blur()
    }

    // 切换监控开关
    function restartLoop() {
        if (_frameId) cancelAnimationFrame(_frameId)
        if (fpsEnabled || memoryEnabled) startFPSCounter()
    }

    function toggleFPS(e?: Event) {
        fpsEnabled = !fpsEnabled
        fpsText = fpsEnabled ? String(fps) : '--'
        restartLoop()
        if (e) (e.currentTarget as HTMLElement)?.blur()
    }
    function toggleMemory(e?: Event) {
        memoryEnabled = !memoryEnabled
        memoryMB = memoryEnabled ? memoryMB : '--'
        restartLoop()
        if (e) (e.currentTarget as HTMLElement)?.blur()
    }

    function handleFPSToggleKey(e: KeyboardEvent) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            toggleFPS(e)
        }
    }
    function handleMemoryToggleKey(e: KeyboardEvent) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            toggleMemory(e)
        }
    }

    // 键盘触发后切换缩放并移除焦点
    function handleKey(e: KeyboardEvent) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            toggleScale()
            ;(e.currentTarget as HTMLElement)?.blur()
        }
    }
</script>

<div class="status-bar" title="点击缩放百分比可切换 50% / 100%">
    <span class="zoom" role="button" tabindex="0" on:click={handleClick} on:keydown={handleKey} style="cursor: pointer;">缩放：{percent}%</span>
    {#if $perfMonitorEnabled}
        <span role="button" tabindex="0" on:click={toggleFPS} on:keydown={handleFPSToggleKey} style="cursor: pointer; margin-left: calc(12px * var(--scale-ratio, 1));">FPS：{fpsText}</span>
        <span role="button" tabindex="0" on:click={toggleMemory} on:keydown={handleMemoryToggleKey} style="cursor: pointer; margin-left: calc(12px * var(--scale-ratio, 1));">内存：{memoryMB}MB</span>
    {/if}
</div>

<style>
    .status-bar {
        pointer-events: auto;
        cursor: pointer;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        padding-left: calc(8px * var(--scale-ratio, 1));
        font-size: calc(12px * var(--scale-ratio, 1));
        color: #fff;
    }
</style>
