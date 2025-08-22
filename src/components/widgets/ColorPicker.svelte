<!--
 * ColorPicker.svelte
 * 颜色选择器组件，支持颜色和透明度选择
 *
 * 功能特性：
 * - 支持RGBA格式颜色值，合并颜色和透明度
 * - 点击切换HTML和RGBA格式显示
 * - 支持吸色功能（颜色吸管）
 * - 样式类似下拉框，与项目现有UI风格一致
 * - 响应式设计，适配不同屏幕尺寸
 *
 * 使用方法：
 * <ColorPicker
 *   value="rgba(255, 0, 0, 1)"
 *   onchange={(rgba) => handleChange(rgba)}
 *   projectId="my-project"
 *   componentId="color-1"  // 可选，如果不提供将自动生成UUID
 * />
 *
 * 属性说明：
 * - value: 当前颜色值（RGBA格式）
 * - onchange: 颜色变化时的回调函数
 * - placeholder: 占位符文本
 * - disabled: 是否禁用
 * - projectId: 项目ID，用于保存颜色历史记录
 * - componentId: 组件ID，用于标识颜色组件，如果不提供将自动生成唯一UUID
 -->

<script lang="ts">
    import { onMount, onDestroy } from 'svelte'
    import Icon from './Icon.svelte'
    import ResponsiveBox from '../core/ResponsiveBox.svelte'
    import ColorPaletteService from '../../services/project/color-palette.service'
    import { domTree, findNodeById } from '../../services/repository/dom-tree.store.svelte'

    import { v4 as uuidv4 } from 'uuid'

    interface Props {
        value?: string | Blob // 现在接受rgba、hex格式或Blob
        onchange?: (rgba: string) => void
        placeholder?: string
        disabled?: boolean
        projectId?: string // 项目ID，用于保存颜色历史记录
        componentId?: string // 组件ID，用于标识颜色组件（如果不提供将自动生成UUID）
    }

    const { value, onchange, placeholder = '选择颜色...', disabled = false, projectId = 'default', componentId = uuidv4() } = $props()

    let isOpen = $state(false)
    let currentColor = $state('#000000')
    let currentOpacity = $state(1)
    let displayFormat = $state<'hex' | 'rgba'>('rgba') // 显示格式：hex或rgbargba(0, 0, 0, 1)
    // 去抖保存计时器，避免拖动过程中频繁写数据库
    let saveDebounce: ReturnType<typeof setTimeout> | null = null
    let pickerRef: HTMLDivElement = $state(null as any)
    let buttonRef: HTMLButtonElement = $state(null as any)

    // 颜色选择器DOM引用
    let hueRect: HTMLDivElement = $state(null as any)
    let satRect: HTMLDivElement = $state(null as any)
    let alphaRect: HTMLDivElement = $state(null as any)
    let hueCanvas: HTMLCanvasElement = $state(null as any)
    let satCanvas: HTMLCanvasElement = $state(null as any)
    let alphaCanvas: HTMLCanvasElement = $state(null as any)

    // 颜色状态
    let hue = $state(0) // 色相 0-360
    let saturation = $state(100) // 饱和度 0-100
    let lightness = $state(50) // 亮度 0-100
    let colorPalette = $state<string[]>([])

    // 鼠标状态
    let isSelectingHue = $state(false)
    let isSelectingSat = $state(false)
    let isSelectingAlpha = $state(false)

    // 颜色转换函数
    function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
        h = h / 360
        s = s / 100
        l = l / 100

        let r, g, b

        if (s === 0) {
            r = g = b = l
        } else {
            const hue2rgb = (p: number, q: number, t: number) => {
                if (t < 0) t += 1
                if (t > 1) t -= 1
                if (t < 1 / 6) return p + (q - p) * 6 * t
                if (t < 1 / 2) return q
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
                return p
            }

            const q = l < 0.5 ? l * (1 + s) : l + s - l * s
            const p = 2 * l - q
            r = hue2rgb(p, q, h + 1 / 3)
            g = hue2rgb(p, q, h)
            b = hue2rgb(p, q, h - 1 / 3)
        }

        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        }
    }

    function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
        r /= 255
        g /= 255
        b /= 255

        const max = Math.max(r, g, b)
        const min = Math.min(r, g, b)
        let h = 0,
            s = 0,
            l = (max + min) / 2

        if (max !== min) {
            const d = max - min
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
            switch (max) {
                case r:
                    h = (g - b) / d + (g < b ? 6 : 0)
                    break
                case g:
                    h = (b - r) / d + 2
                    break
                case b:
                    h = (r - g) / d + 4
                    break
            }
            h /= 6
        }

        return { h: h * 360, s: s * 100, l: l * 100 }
    }

    function rgbToHex(r: number, g: number, b: number): string {
        return (
            '#' +
            [r, g, b]
                .map((x) => {
                    const hex = Math.round(x).toString(16)
                    return hex.length === 1 ? '0' + hex : hex
                })
                .join('')
        )
    }

    function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
        return result
            ? {
                  r: parseInt(result[1], 16),
                  g: parseInt(result[2], 16),
                  b: parseInt(result[3], 16)
              }
            : null
    }

    // 解析RGBA格式
    function parseRgba(rgba: string): { r: number; g: number; b: number; a: number } | null {
        const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/i)
        if (match) {
            return {
                r: parseInt(match[1]),
                g: parseInt(match[2]),
                b: parseInt(match[3]),
                a: match[4] ? parseFloat(match[4]) : 1
            }
        }
        return null
    }

    // 将RGBA转换为十六进制
    function rgbaToHex(rgba: string): { hex: string; opacity: number } | null {
        const parsed = parseRgba(rgba)
        if (parsed) {
            return {
                hex: rgbToHex(parsed.r, parsed.g, parsed.b),
                opacity: parsed.a
            }
        }
        return null
    }

    // 将十六进制和透明度转换为RGBA
    function hexToRgba(hex: string, opacity: number): string {
        const rgb = hexToRgb(hex)
        if (rgb) {
            return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`
        }
        return `rgba(0, 0, 0, ${opacity})`
    }

    // 格式化显示值
    function formatDisplayValue(): string {
        if (displayFormat === 'hex') {
            return currentColor
        } else {
            return hexToRgba(currentColor, Math.round(currentOpacity * 100) / 100)
        }
    }

    // 响应式显示值，确保同步更新
    let displayValue = $derived(formatDisplayValue())

    // 更新当前颜色
    function updateColorFromHsl() {
        const rgb = hslToRgb(hue, saturation, lightness)
        currentColor = rgbToHex(rgb.r, rgb.g, rgb.b)
        notifyChange()
    }

    // 从RGBA值更新颜色状态
    function updateFromRgba(rgba: string) {
        const parsed = rgbaToHex(rgba)
        if (parsed) {
            currentColor = parsed.hex
            currentOpacity = parsed.opacity
            updateHslFromColor()
        }
    }

    // 从十六进制颜色更新HSL值
    function updateHslFromColor() {
        const rgb = hexToRgb(currentColor)
        if (rgb) {
            const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
            hue = hsl.h
            saturation = hsl.s
            lightness = hsl.l
        }
    }

    // 切换显示格式
    function toggleDisplayFormat() {
        displayFormat = displayFormat === 'hex' ? 'rgba' : 'hex'
    }

    // 绘制色相选择器
    function drawHueCanvas() {
        if (!hueCanvas) return

        const ctx = hueCanvas.getContext('2d')
        if (!ctx) return

        const width = hueCanvas.width
        const height = hueCanvas.height

        // 创建色相渐变（垂直方向）
        const hueGradient = ctx.createLinearGradient(0, 0, 0, height)
        for (let i = 0; i <= 6; i++) {
            hueGradient.addColorStop(i / 6, `hsl(${i * 60}, 100%, 50%)`)
        }

        ctx.fillStyle = hueGradient
        ctx.fillRect(0, 0, width, height)
    }

    // 绘制饱和度选择器
    function drawSatCanvas() {
        if (!satCanvas) return

        const ctx = satCanvas.getContext('2d')
        if (!ctx) return

        const width = satCanvas.width
        const height = satCanvas.height

        // 清除画布
        ctx.clearRect(0, 0, width, height)

        // 绘制饱和度-亮度选择器
        // 水平方向：饱和度从0到100
        // 垂直方向：亮度从0到100（从上到下）

        // 创建水平饱和度渐变
        for (let x = 0; x < width; x++) {
            const sat = (x / width) * 100
            const satGradient = ctx.createLinearGradient(x, 0, x, height)

            // 顶部：白色 + 当前色相
            satGradient.addColorStop(0, `hsl(${hue}, ${sat}%, 100%)`)
            // 中间：纯色
            satGradient.addColorStop(0.5, `hsl(${hue}, ${sat}%, 50%)`)
            // 底部：黑色
            satGradient.addColorStop(1, `hsl(${hue}, ${sat}%, 0%)`)

            ctx.fillStyle = satGradient
            ctx.fillRect(x, 0, 1, height)
        }
    }

    // 绘制透明度选择器
    function drawAlphaCanvas() {
        if (!alphaCanvas) return

        const ctx = alphaCanvas.getContext('2d')
        if (!ctx) return

        const width = alphaCanvas.width
        const height = alphaCanvas.height

        // 绘制棋盘格背景
        const squareSize = 8
        for (let y = 0; y < height; y += squareSize) {
            for (let x = 0; x < width; x += squareSize) {
                const isEven = (x / squareSize + y / squareSize) % 2 === 0
                ctx.fillStyle = isEven ? '#ffffff' : '#cccccc'
                ctx.fillRect(x, y, squareSize, squareSize)
            }
        }

        // 绘制透明度渐变
        const rgb = hexToRgb(currentColor)
        if (rgb) {
            const gradient = ctx.createLinearGradient(0, 0, 0, height)
            gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`)
            gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`)
            ctx.fillStyle = gradient
            ctx.fillRect(0, 0, width, height)
        }
    }

    // 鼠标事件处理
    function handleHueMouseDown(event: MouseEvent) {
        isSelectingHue = true
        updateHueFromMouse(event)
    }

    function handleSatMouseDown(event: MouseEvent) {
        isSelectingSat = true
        updateSatFromMouse(event)
    }

    function handleAlphaMouseDown(event: MouseEvent) {
        isSelectingAlpha = true
        updateAlphaFromMouse(event)
    }

    function handleMouseMove(event: MouseEvent) {
        if (isSelectingHue) {
            updateHueFromMouse(event)
        } else if (isSelectingSat) {
            updateSatFromMouse(event)
        } else if (isSelectingAlpha) {
            updateAlphaFromMouse(event)
        }
    }

    function handleMouseUp() {
        isSelectingHue = false
        isSelectingSat = false
        isSelectingAlpha = false
    }

    function updateHueFromMouse(event: MouseEvent) {
        if (!hueRect || !hueCanvas) return

        const rect = hueRect.getBoundingClientRect()
        const canvasHeight = hueCanvas.height

        const y = Math.max(0, Math.min(event.clientY - rect.top, rect.height))

        // 将相对于DOM元素的位置转换为相对于canvas的位置
        const relativeY = (y / rect.height) * canvasHeight

        hue = (relativeY / canvasHeight) * 360
        updateColorFromHsl()
    }

    function updateSatFromMouse(event: MouseEvent) {
        if (!satRect || !satCanvas) return

        const rect = satRect.getBoundingClientRect()
        const canvasWidth = satCanvas.width
        const canvasHeight = satCanvas.height

        const x = Math.max(0, Math.min(event.clientX - rect.left, rect.width))
        const y = Math.max(0, Math.min(event.clientY - rect.top, rect.height))

        // 将相对于DOM元素的位置转换为相对于canvas的位置
        const relativeX = (x / rect.width) * canvasWidth
        const relativeY = (y / rect.height) * canvasHeight

        saturation = (relativeX / canvasWidth) * 100
        lightness = 100 - (relativeY / canvasHeight) * 100

        updateColorFromHsl()
    }

    function updateAlphaFromMouse(event: MouseEvent) {
        if (!alphaRect || !alphaCanvas) return

        const rect = alphaRect.getBoundingClientRect()
        const canvasHeight = alphaCanvas.height

        const y = Math.max(0, Math.min(event.clientY - rect.top, rect.height))

        // 将相对于DOM元素的位置转换为相对于canvas的位置
        const relativeY = (y / rect.height) * canvasHeight

        currentOpacity = 1 - relativeY / canvasHeight
        notifyChange()
    }

    // 吸色功能
    async function startColorPicker() {
        if (!('EyeDropper' in window)) {
            alert('您的浏览器不支持吸色功能')
            return
        }

        try {
            const eyeDropper = new (window as any).EyeDropper()
            const result = await eyeDropper.open()
            if (result && result.sRGBHex) {
                currentColor = result.sRGBHex.toLowerCase()
                updateHslFromColor()
                notifyChange()
            }
        } catch (error) {
            // 用户取消或错误，静默处理
        }
    }

    // 通知父组件变化 handled below
    function notifyChange() {
        const rgba = hexToRgba(currentColor, currentOpacity)

        // 去抖动同步更新 doms 表，拖动停止后 300ms 执行一次
        if (projectId && componentId) {
            if (saveDebounce) clearTimeout(saveDebounce)
            saveDebounce = setTimeout(async () => {
                await ColorPaletteService.updateColorInDoms(projectId, componentId, rgba)
                await loadColorPalette()
            }, 300)
        }

        onchange?.(rgba)
    }

    // 处理颜色输入变化
    function handleColorInput(event: Event) {
        const target = event.target as HTMLInputElement
        const input = target.value.trim()

        // 处理RGBA格式
        if (input.startsWith('rgba')) {
            const parsed = parseRgba(input)
            if (parsed) {
                currentColor = rgbToHex(parsed.r, parsed.g, parsed.b)
                currentOpacity = parsed.a
                updateHslFromColor()
                notifyChange()
            }
        }
        // 处理HEX格式
        else if (/^#[0-9A-Fa-f]{6}$/.test(input)) {
            currentColor = input
            updateHslFromColor()
            notifyChange()
        }
    }

    // 处理透明度变化
    function handleOpacityChange(event: Event) {
        const target = event.target as HTMLInputElement
        currentOpacity = parseFloat(target.value) / 100
        updateColorFromHsl()
    }

    // 点击外部关闭面板
    function handleClickOutside(event: MouseEvent) {
        if (pickerRef && !pickerRef.contains(event.target as Node) && buttonRef && !buttonRef.contains(event.target as Node)) {
            isOpen = false
        }
    }

    // 键盘事件处理
    function handleKeyDown(event: KeyboardEvent) {
        if (event.key === 'Escape') {
            isOpen = false
        }
    }

    // 加载颜色卡
    // 深度遍历 domTree，收集所有背景颜色
    function getColorsFromDomTree(node: any, acc: string[] = []) {
        const bg = node?.styles?.backgroundColor
        if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') {
            acc.push(bg)
        }
        if (Array.isArray(node?.children)) {
            for (const child of node.children) {
                getColorsFromDomTree(child, acc)
            }
        }
        return acc
    }

    // 直接从内存 domTree 统计颜色卡
    function loadColorPalette() {
        const colors = getColorsFromDomTree(domTree)
        const uniqueColors = [...new Set(colors)].slice(0, 8)
        colorPalette = uniqueColors
    }

    // 初始化
    onMount(() => {
        document.addEventListener('click', handleClickOutside)
        document.addEventListener('keydown', handleKeyDown)
        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)

        // 从doms表加载当前颜色值
        loadCurrentColor()

        if (projectId) {
            loadColorPalette()
        }

        return () => {
            document.removeEventListener('click', handleClickOutside)
            document.removeEventListener('keydown', handleKeyDown)
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
            if (saveDebounce) clearTimeout(saveDebounce)
        }
    })

    // 移除isDomsColorLoaded标志，value属性始终优先

    // 从doms表加载当前颜色值（仅作为默认值，当value未提供时使用）

    // 从内存 domTree 或回退 doms 表加载当前颜色值（仅在未提供 value 时使用）
    async function loadCurrentColor() {
        if (value) {
            const valueStr = typeof value === 'string' ? value : ''
            if (valueStr.trim() !== '') return
        }

        let rgba: string | null = null

        // 优先从内存 domTree 获取
        if (componentId) {
            const node = findNodeById(domTree, componentId)
            const bgColor = node?.styles?.backgroundColor
            rgba = typeof bgColor === 'string' ? bgColor : null
        }

        if (rgba) {
            updateFromRgba(rgba)
        }
    }

    // 当projectId或componentId变化时重新加载色卡
    $effect(() => {
        if (projectId && componentId) {
            loadColorPalette()
            loadCurrentColor()
        }
    })

    // 绘制画布
    $effect(() => {
        if (isOpen) {
            drawHueCanvas()
            drawSatCanvas()
            drawAlphaCanvas()
        }
    })

    // 响应外部value变化 - 始终优先使用value属性
    $effect(() => {
        if (typeof value === 'string') {
            const valueStr = value
            if (valueStr.startsWith('rgba')) {
                updateFromRgba(valueStr)
            } else if (valueStr.startsWith('#')) {
                currentColor = valueStr
                currentOpacity = 1
                updateHslFromColor()
            }
        }
    })

    // 更新HSL值
    $effect(() => {
        if (currentColor !== value) {
            updateHslFromColor()
        }
    })

    // 使用默认缩放比例1
    const scale = 1
</script>

<ResponsiveBox class="color-picker-container" style="width: 100%; position: relative">
    <button bind:this={buttonRef} class="color-picker-button" class:disabled onclick={() => (isOpen = !isOpen)} type="button" {disabled}>
        <span class="color-text">
            {displayValue}
        </span>
        <Icon name="ChevronDown" size={16} class="dropdown-icon" />
    </button>

    {#if isOpen && !disabled}
        <div bind:this={pickerRef} class="color-picker-panel">
            <div class="panel-header">
                <h4>选择颜色</h4>
                <div class="header-actions">
                    {#if 'EyeDropper' in window}
                        <button class="picker-btn" onclick={startColorPicker} type="button" title="吸色">
                            <Icon name="Pipette" size={16} />
                        </button>
                    {/if}
                    <button class="close-btn" onclick={() => (isOpen = false)} type="button" aria-label="关闭颜色选择器">
                        <Icon name="X" size={16} />
                    </button>
                </div>
            </div>

            <div class="picker-content">
                <!-- 左侧色相选择器 -->
                <div class="hue-selector">
                    <div bind:this={hueRect} class="hue-rect" onmousedown={handleHueMouseDown} style="position: relative; cursor: crosshair;" role="slider" tabindex="0" aria-label="色相选择器" aria-valuemin="0" aria-valuemax="360" aria-valuenow={hue} aria-orientation="vertical">
                        <canvas bind:this={hueCanvas} width="20" height="150"></canvas>
                        <div class="hue-selector-handle" style="top: {(hue / 360) * 100}%;"></div>
                    </div>
                </div>

                <!-- 中间饱和度选择器 -->
                <div class="sat-selector">
                    <div bind:this={satRect} class="sat-rect" onmousedown={handleSatMouseDown} style="position: relative; cursor: crosshair;" role="slider" tabindex="0" aria-label="饱和度选择器" aria-valuemin="0" aria-valuemax="100" aria-valuenow={saturation} aria-orientation="horizontal">
                        <canvas bind:this={satCanvas} width="180" height="150"></canvas>
                        <div class="sat-selector-handle" style="left: {(saturation / 100) * 100}%; top: {((100 - lightness) / 100) * 100}%;"></div>
                    </div>
                </div>

                <!-- 右侧透明度选择器 -->
                <div class="alpha-selector">
                    <div
                        bind:this={alphaRect}
                        class="alpha-rect"
                        onmousedown={handleAlphaMouseDown}
                        style="position: relative; cursor: crosshair;"
                        role="slider"
                        tabindex="0"
                        aria-label="透明度选择器"
                        aria-valuemin="0"
                        aria-valuemax="100"
                        aria-valuenow={Math.round(currentOpacity * 100)}
                        aria-orientation="vertical"
                    >
                        <canvas bind:this={alphaCanvas} width="20" height="150"></canvas>
                        <div class="alpha-selector-handle" style="top: {(1 - currentOpacity) * 100}%;"></div>
                    </div>
                </div>
            </div>

            <div class="color-controls">
                <div class="color-input-group">
                    <label for="color-input" class="control-label">颜色值</label>
                    <input id="color-input" type="text" class="hex-input" bind:value={displayValue} oninput={handleColorInput} placeholder="rgba(0, 0, 0, 1)" onclick={toggleDisplayFormat} style="cursor: pointer;" title="点击切换显示格式" maxlength="25" />
                </div>
            </div>

            {#if colorPalette.length > 0}
                <div class="color-palette">
                    <label class="control-label" for="color-palette">颜色卡</label>
                    <div class="palette-colors">
                        {#each colorPalette as color}
                            <div class="palette-color-wrapper">
                                <button
                                    type="button"
                                    class="palette-color"
                                    style="background-color: {color}"
                                    onclick={() => {
                                        const parsed = parseRgba(color)
                                        if (parsed) {
                                            currentColor = rgbToHex(parsed.r, parsed.g, parsed.b)
                                            currentOpacity = parsed.a
                                            updateHslFromColor()
                                            notifyChange()
                                        }
                                    }}
                                    title={color}
                                    aria-label={`选择颜色 ${color}`}
                                ></button>
                                <button
                                    type="button"
                                    class="delete-color-btn"
                                    onclick={async (e) => {
                                        e.stopPropagation()
                                        if (projectId) {
                                            await ColorPaletteService.deleteColor(projectId, color)
                                            loadColorPalette()
                                        }
                                    }}
                                    title={`删除颜色 ${color}`}
                                    aria-label={`删除颜色 ${color}`}
                                >
                                    <Icon name="X" size={12} />
                                </button>
                            </div>
                        {/each}
                    </div>
                </div>
            {/if}
        </div>
    {/if}
</ResponsiveBox>

<style>
    .color-picker-button {
        display: flex;
        align-items: center;
        width: 100%;
        min-width: 0;
        padding: calc(8px * var(--scale-ratio, 1)) calc(12px * var(--scale-ratio, 1));
        border: calc(1px * var(--scale-ratio, 1)) solid rgba(255, 255, 255, 0.2);
        border-radius: calc(6px * var(--scale-ratio, 1));
        background: rgba(45, 55, 72, 0.9);
        color: #e2e8f0;
        font-size: calc(11px * var(--scale-ratio, 1));
        cursor: pointer;
        transition: all 0.3s ease;
        gap: calc(8px * var(--scale-ratio, 1));
    }

    .color-picker-button:hover:not(.disabled) {
        background: rgba(45, 55, 72, 0.95);
        border-color: rgba(255, 255, 255, 0.3);
    }

    .color-picker-button.disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .color-text {
        flex: 1;
        text-align: left;
        font-family: 'Courier New', monospace;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        min-width: 0;
        margin-right: calc(8px * var(--scale-ratio, 1));
    }

    .color-picker-panel {
        position: absolute;
        top: 100%;
        left: 0;
        margin-top: calc(4px * var(--scale-ratio, 1));
        background: #0f172a;
        border: calc(1px * var(--scale-ratio, 1)) solid #334155;
        border-radius: calc(8px * var(--scale-ratio, 1));
        padding: calc(16px * var(--scale-ratio, 1));
        box-shadow: 0 calc(10px * var(--scale-ratio, 1)) calc(25px * var(--scale-ratio, 1)) rgba(0, 0, 0, 0.5);
        z-index: 1000;
        width: 100%;
        max-width: calc(320px * var(--scale-ratio, 1));
        min-width: calc(240px * var(--scale-ratio, 1));
    }

    .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: calc(16px * var(--scale-ratio, 1));
    }

    .panel-header h4 {
        margin: 0;
        font-size: calc(14px * var(--scale-ratio, 1));
        font-weight: 600;
        color: #e2e8f0;
    }

    .header-actions {
        display: flex;
        align-items: center;
        gap: calc(8px * var(--scale-ratio, 1));
    }

    .close-btn,
    .picker-btn {
        background: none;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        padding: calc(4px * var(--scale-ratio, 1));
        border-radius: calc(4px * var(--scale-ratio, 1));
        transition: color 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .close-btn:hover,
    .picker-btn:hover {
        color: #e2e8f0;
        background-color: rgba(45, 55, 72, 0.9);
    }

    .picker-content {
        display: flex;
        gap: calc(12px * var(--scale-ratio, 1));
        margin-bottom: calc(16px * var(--scale-ratio, 1));
        align-items: flex-start;
    }

    .hue-selector {
        width: calc(20px * var(--scale-ratio, 1));
        height: calc(150px * var(--scale-ratio, 1));
    }

    .hue-rect {
        position: relative;
        width: 100%;
        height: 100%;
        border: calc(1px * var(--scale-ratio, 1)) solid rgba(255, 255, 255, 0.2);
        border-radius: calc(4px * var(--scale-ratio, 1));
        overflow: hidden;
    }

    .hue-rect canvas {
        display: block;
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
    }

    .hue-selector-handle {
        position: absolute;
        left: calc(-2px * var(--scale-ratio, 1));
        right: calc(-2px * var(--scale-ratio, 1));
        height: calc(4px * var(--scale-ratio, 1));
        background: white;
        border: calc(1px * var(--scale-ratio, 1)) solid rgba(0, 0, 0, 0.3);
        border-radius: calc(2px * var(--scale-ratio, 1));
        transform: translateY(-50%);
        pointer-events: none;
    }

    .sat-selector {
        flex: 1;
        height: calc(150px * var(--scale-ratio, 1));
    }

    .sat-rect {
        position: relative;
        width: 100%;
        height: 100%;
        border: calc(1px * var(--scale-ratio, 1)) solid rgba(255, 255, 255, 0.2);
        border-radius: calc(4px * var(--scale-ratio, 1));
        overflow: hidden;
    }

    .sat-rect canvas {
        display: block;
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
    }

    .sat-selector-handle {
        position: absolute;
        width: calc(12px * var(--scale-ratio, 1));
        height: calc(12px * var(--scale-ratio, 1));
        background: white;
        border: calc(2px * var(--scale-ratio, 1)) solid #333;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        pointer-events: none;
        box-shadow: 0 0 0 calc(1px * var(--scale-ratio, 1)) rgba(0, 0, 0, 0.3);
    }

    .alpha-selector {
        width: calc(24px * var(--scale-ratio, 1));
        height: calc(150px * var(--scale-ratio, 1));
    }

    .alpha-rect {
        position: relative;
        width: 100%;
        height: 100%;
        border: calc(1px * var(--scale-ratio, 1)) solid rgba(255, 255, 255, 0.2);
        border-radius: calc(4px * var(--scale-ratio, 1));
        overflow: hidden;
        background-image: linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%);
        background-size: calc(8px * var(--scale-ratio, 1)) calc(8px * var(--scale-ratio, 1));
        background-position:
            0 0,
            0 calc(4px * var(--scale-ratio, 1)),
            calc(4px * var(--scale-ratio, 1)) calc(-4px * var(--scale-ratio, 1)),
            calc(-4px * var(--scale-ratio, 1)) 0px;
    }

    .alpha-rect canvas {
        display: block;
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
    }

    .alpha-selector-handle {
        position: absolute;
        left: calc(-2px * var(--scale-ratio, 1));
        right: calc(-2px * var(--scale-ratio, 1));
        height: calc(4px * var(--scale-ratio, 1));
        background: white;
        border: calc(1px * var(--scale-ratio, 1)) solid rgba(0, 0, 0, 0.3);
        border-radius: calc(2px * var(--scale-ratio, 1));
        transform: translateY(-50%);
        pointer-events: none;
    }

    .color-controls {
        display: flex;
        gap: calc(12px * var(--scale-ratio, 1));
        margin-bottom: calc(16px * var(--scale-ratio, 1));
    }

    .color-input-group {
        flex: 1;
    }

    .control-label {
        display: block;
        font-size: calc(12px * var(--scale-ratio, 1));
        color: #94a3b8;
        margin-bottom: calc(4px * var(--scale-ratio, 1));
    }

    .hex-input {
        width: 100%;
        padding: calc(6px * var(--scale-ratio, 1)) calc(8px * var(--scale-ratio, 1));
        border: calc(1px * var(--scale-ratio, 1)) solid #334155;
        border-radius: calc(4px * var(--scale-ratio, 1));
        background: #334155;
        color: #e2e8f0;
        font-size: calc(12px * var(--scale-ratio, 1));
        font-family: 'Courier New', monospace;
    }

    .hex-input:focus {
        outline: none;
        border-color: #6366f1;
        background: #475569;
    }

    .color-palette {
        margin-top: calc(16px * var(--scale-ratio, 1));
    }

    .palette-colors {
        display: flex;
        gap: calc(4px * var(--scale-ratio, 1));
        flex-wrap: wrap;
    }

    .palette-color-wrapper {
        position: relative;
        width: calc(24px * var(--scale-ratio, 1));
        height: calc(24px * var(--scale-ratio, 1));
    }

    .palette-color {
        width: 100%;
        height: 100%;
        border: calc(1px * var(--scale-ratio, 1)) solid rgba(255, 255, 255, 0.2);
        border-radius: calc(4px * var(--scale-ratio, 1));
        cursor: pointer;
        transition:
            transform 0.2s ease,
            border-color 0.2s ease;
        position: relative;
    }

    .palette-color:hover {
        transform: scale(1.1);
        border-color: rgba(255, 255, 255, 0.4);
    }

    .palette-color:active {
        transform: scale(0.9);
    }

    .delete-color-btn {
        position: absolute;
        top: calc(-6px * var(--scale-ratio, 1));
        right: calc(-6px * var(--scale-ratio, 1));
        width: calc(16px * var(--scale-ratio, 1));
        height: calc(16px * var(--scale-ratio, 1));
        background: #ef4444;
        color: white;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        opacity: 0;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10;
    }

    .palette-color-wrapper:hover .delete-color-btn {
        opacity: 1;
    }

    .delete-color-btn:hover {
        background: #dc2626;
        transform: scale(1.2);
    }
</style>
