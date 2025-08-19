<!--
  TextEditor.svelte
  文字样式编辑面板
  提供文字相关属性的可视化编辑界面

  功能：
  - 字体族设置
  - 字体大小调整
  - 字体粗细选择
  - 文字颜色设置
  - 行高设置
  - 文字对齐方式
  - 文字装饰（下划线、删除线）
  - 字体样式（斜体、正常）
  - 字母间距
  - 单词间距

  使用说明：
  - 支持实时预览文字样式变化
  - 所有属性直接应用于DOM元素
  - 支持px和em单位切换
-->
<script lang="ts">
    import { getNodeProps, updateNodeProps } from '../../../services/property-panel/property-panel.service'
    import ColorPicker from '../ColorPicker.svelte'

    interface Props {
        selectedId: string | null
    }

    let { selectedId }: Props = $props()

    // 文字样式状态
    let fontFamily = $state('')
    let fontSize = $state('16')
    let fontWeight = $state('400')
    let fontColor = $state('#000000')
    let fontOpacity = $state(1)
    let lineHeight = $state('1.5')
    let textAlign = $state('left')
    let textDecoration = $state('none')
    let fontStyle = $state('normal')
    let letterSpacing = $state('0')
    let wordSpacing = $state('0')

    // 字体族选项
    const fontFamilyOptions = [
        { value: 'Arial, sans-serif', label: 'Arial' },
        { value: 'Helvetica, sans-serif', label: 'Helvetica' },
        { value: 'Times, serif', label: 'Times' },
        { value: 'Times New Roman, serif', label: 'Times New Roman' },
        { value: 'Courier, monospace', label: 'Courier' },
        { value: 'Georgia, serif', label: 'Georgia' },
        { value: 'Verdana, sans-serif', label: 'Verdana' },
        { value: '微软雅黑, sans-serif', label: '微软雅黑' },
        { value: '宋体, serif', label: '宋体' },
        { value: '黑体, sans-serif', label: '黑体' }
    ]

    // 字体粗细选项
    const fontWeightOptions = [
        { value: '100', label: '100 - 超细' },
        { value: '200', label: '200 - 特细' },
        { value: '300', label: '300 - 细体' },
        { value: '400', label: '400 - 正常' },
        { value: '500', label: '500 - 中粗' },
        { value: '600', label: '600 - 粗体' },
        { value: '700', label: '700 - 特粗' },
        { value: '800', label: '800 - 超粗' },
        { value: '900', label: '900 - 极粗' }
    ]

    // 文字对齐选项
    const textAlignOptions = [
        { value: 'left', label: '左对齐' },
        { value: 'center', label: '居中对齐' },
        { value: 'right', label: '右对齐' },
        { value: 'justify', label: '两端对齐' }
    ]

    // 文字装饰选项
    const textDecorationOptions = [
        { value: 'none', label: '无装饰' },
        { value: 'underline', label: '下划线' },
        { value: 'overline', label: '上划线' },
        { value: 'line-through', label: '删除线' }
    ]

    // 字体样式选项
    const fontStyleOptions = [
        { value: 'normal', label: '正常' },
        { value: 'italic', label: '斜体' },
        { value: 'oblique', label: '倾斜' }
    ]

    // 初始化文字属性
    function initTextProps() {
        if (!selectedId) return

        const nodeProps = getNodeProps(selectedId)
        const styles = nodeProps?.styles || {}

        // 字体族
        fontFamily = styles.fontFamily || 'Arial, sans-serif'

        // 字体大小
        const [parsedFontSize] = parseSize(styles.fontSize || '16px')
        fontSize = parsedFontSize

        // 字体粗细
        fontWeight = styles.fontWeight || '400'

        // 字体颜色
        const colorStyle = styles.color || '#000000'
        if (colorStyle) {
            const match = colorStyle.match(/rgba?\(([^)]+)\)/)
            if (match) {
                const parts = match[1].split(',').map((s) => s.trim())
                if (parts.length >= 3) {
                    const r = parseInt(parts[0])
                    const g = parseInt(parts[1])
                    const b = parseInt(parts[2])
                    const a = parts.length > 3 ? parseFloat(parts[3]) : 1
                    fontColor = rgbToHex(r, g, b)
                    fontOpacity = a
                }
            } else if (/^#([0-9A-Fa-f]{6})$/.test(colorStyle)) {
                fontColor = colorStyle
                fontOpacity = 1
            }
        }

        // 行高
        const [parsedLineHeight] = parseLineHeight(styles.lineHeight || '1.5')
        lineHeight = parsedLineHeight

        // 文字对齐
        textAlign = styles.textAlign || 'left'

        // 文字装饰
        textDecoration = styles.textDecoration || 'none'

        // 字体样式
        fontStyle = styles.fontStyle || 'normal'

        // 字母间距
        const [parsedLetterSpacing] = parseSize(styles.letterSpacing || '0px')
        letterSpacing = parsedLetterSpacing

        // 单词间距
        const [parsedWordSpacing] = parseSize(styles.wordSpacing || '0px')
        wordSpacing = parsedWordSpacing
    }

    // 监听selectedId变化
    $effect(() => {
        if (selectedId) {
            initTextProps()
        }
    })

    // RGB转十六进制
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

    // 十六进制转RGBA
    function hexToRgba(hex: string, opacity: number): string {
        const rgb = hexToRgb(hex)
        if (rgb) {
            return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`
        }
        return `rgba(0, 0, 0, ${opacity})`
    }

    // 十六进制转RGB
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

    // 解析尺寸值（移除单位解析，统一使用px）
    function parseSize(size: string): [string, 'px'] {
        if (!size) return ['16', 'px']
        return [size.replace('px', ''), 'px']
    }

    // 解析行高（移除单位解析，统一使用px）
    function parseLineHeight(lineHeight: string): [string, 'px'] {
        if (!lineHeight) return ['1.5', 'px']
        return [lineHeight.replace('px', ''), 'px']
    }

    // 更新文字样式
    function updateTextStyles() {
        if (!selectedId) return

        const styles: Record<string, string> = {
            fontFamily: fontFamily,
            fontWeight: fontWeight,
            textAlign: textAlign,
            textDecoration: textDecoration,
            fontStyle: fontStyle
        }

        // 字体大小
        if (fontSize) {
            styles.fontSize = fontSize + 'px'
        }

        // 字体颜色
        const colorHex = fontColor.startsWith('#') ? fontColor.slice(1) : fontColor
        styles.color = fontOpacity === 1 ? `#${colorHex}` : `rgba(${parseInt(colorHex.slice(0, 2), 16)}, ${parseInt(colorHex.slice(2, 4), 16)}, ${parseInt(colorHex.slice(4, 6), 16)}, ${fontOpacity})`

        // 行高
        if (lineHeight) {
            styles.lineHeight = lineHeight + 'px'
        }

        // 字母间距
        if (letterSpacing && letterSpacing !== '0') {
            styles.letterSpacing = letterSpacing + 'px'
        }

        // 单词间距
        if (wordSpacing && wordSpacing !== '0') {
            styles.wordSpacing = wordSpacing + 'px'
        }

        updateNodeProps(selectedId, { styles })
    }

    // 处理属性变更
    function handlePropertyChange() {
        updateTextStyles()
    }
</script>

<div class="text-editor">
    {#if selectedId}
        <h3>文字样式</h3>

        <div class="property-group">
            <div class="property-item">
                <label for="font-family">文本字体</label>
                <div class="select-wrapper">
                    <select id="font-family" bind:value={fontFamily} onchange={handlePropertyChange}>
                        {#each fontFamilyOptions as option}
                            <option value={option.value}>{option.label}</option>
                        {/each}
                    </select>
                </div>
            </div>

            <div class="property-item">
                <label for="font-size">字体大小</label>
                <div class="input-group">
                    <input
                        id="font-size"
                        type="number"
                        min="8"
                        max="200"
                        step="1"
                        bind:value={fontSize}
                        oninput={(e) => {
                            handlePropertyChange()
                        }}
                        onwheel={(e) => {
                            e.preventDefault()
                            const val = parseInt(fontSize) || 16
                            fontSize = val + (e.deltaY < 0 ? 1 : -1) + ''
                            handlePropertyChange()
                        }}
                        onkeydown={(e) => {
                            if (e.key === 'ArrowUp') {
                                e.preventDefault()
                                const val = parseInt(fontSize) || 16
                                fontSize = val + 1 + ''
                                handlePropertyChange()
                            }
                            if (e.key === 'ArrowDown') {
                                e.preventDefault()
                                const val = parseInt(fontSize) || 16
                                fontSize = val - 1 + ''
                                handlePropertyChange()
                            }
                        }}
                        placeholder="字体大小..."
                    />
                    <button class="unit-toggle" disabled>px</button>
                </div>
            </div>

            <div class="property-item">
                <label for="font-weight">字体粗细</label>
                <div class="select-wrapper">
                    <select id="font-weight" bind:value={fontWeight} onchange={handlePropertyChange}>
                        {#each fontWeightOptions as option}
                            <option value={option.value}>{option.label}</option>
                        {/each}
                    </select>
                </div>
            </div>

            <div class="property-item">
                <label for="font-color">文本颜色</label>
                <div class="color-input-group">
                    <ColorPicker
                        value={hexToRgba(fontColor, fontOpacity)}
                        onchange={(rgba: string) => {
                            const parsed = parseRgba(rgba)
                            if (parsed) {
                                fontColor = rgbToHex(parsed.r, parsed.g, parsed.b)
                                fontOpacity = parsed.a
                                handlePropertyChange()
                            }
                        }}
                        projectId="default"
                    />
                </div>
            </div>

            <div class="property-item">
                <label for="line-height">文本行高</label>
                <div class="input-group">
                    <input
                        id="line-height"
                        type="number"
                        min="0.5"
                        max="5"
                        step="0.1"
                        bind:value={lineHeight}
                        oninput={(e) => {
                            handlePropertyChange()
                        }}
                        onwheel={(e) => {
                            e.preventDefault()
                            const val = parseFloat(lineHeight) || 1.5
                            lineHeight = (val + (e.deltaY < 0 ? 0.1 : -0.1)).toFixed(1)
                            handlePropertyChange()
                        }}
                        onkeydown={(e) => {
                            if (e.key === 'ArrowUp') {
                                e.preventDefault()
                                const val = parseFloat(lineHeight) || 1.5
                                lineHeight = (val + 0.1).toFixed(1)
                                handlePropertyChange()
                            }
                            if (e.key === 'ArrowDown') {
                                e.preventDefault()
                                const val = parseFloat(lineHeight) || 1.5
                                lineHeight = (val - 0.1).toFixed(1)
                                handlePropertyChange()
                            }
                        }}
                        placeholder="文本行高..."
                    />
                    <button class="unit-toggle" disabled>px</button>
                </div>
            </div>

            <div class="property-item">
                <label for="text-align">文本对齐</label>
                <div class="select-wrapper">
                    <select id="text-align" bind:value={textAlign} onchange={handlePropertyChange}>
                        {#each textAlignOptions as option}
                            <option value={option.value}>{option.label}</option>
                        {/each}
                    </select>
                </div>
            </div>

            <div class="property-item">
                <label for="text-decoration">文本装饰</label>
                <div class="select-wrapper">
                    <select id="text-decoration" bind:value={textDecoration} onchange={handlePropertyChange}>
                        {#each textDecorationOptions as option}
                            <option value={option.value}>{option.label}</option>
                        {/each}
                    </select>
                </div>
            </div>

            <div class="property-item">
                <label for="font-style">字体样式</label>
                <div class="select-wrapper">
                    <select id="font-style" bind:value={fontStyle} onchange={handlePropertyChange}>
                        {#each fontStyleOptions as option}
                            <option value={option.value}>{option.label}</option>
                        {/each}
                    </select>
                </div>
            </div>

            <div class="property-item">
                <label for="letter-spacing">字母间距</label>
                <div class="input-group">
                    <input
                        id="letter-spacing"
                        type="number"
                        min="-5"
                        max="10"
                        step="0.1"
                        bind:value={letterSpacing}
                        oninput={(e) => {
                            handlePropertyChange()
                        }}
                        onwheel={(e) => {
                            e.preventDefault()
                            const val = parseFloat(letterSpacing) || 0
                            letterSpacing = (val + (e.deltaY < 0 ? 0.1 : -0.1)).toFixed(1)
                            handlePropertyChange()
                        }}
                        onkeydown={(e) => {
                            if (e.key === 'ArrowUp') {
                                e.preventDefault()
                                const val = parseFloat(letterSpacing) || 0
                                letterSpacing = (val + 0.1).toFixed(1)
                                handlePropertyChange()
                            }
                            if (e.key === 'ArrowDown') {
                                e.preventDefault()
                                const val = parseFloat(letterSpacing) || 0
                                letterSpacing = (val - 0.1).toFixed(1)
                                handlePropertyChange()
                            }
                        }}
                        placeholder="字母间距..."
                    />
                    <button class="unit-toggle" disabled>px</button>
                </div>
            </div>

            <div class="property-item">
                <label for="word-spacing">单词间距</label>
                <div class="input-group">
                    <input
                        id="word-spacing"
                        type="number"
                        min="-5"
                        max="10"
                        step="0.1"
                        bind:value={wordSpacing}
                        oninput={(e) => {
                            handlePropertyChange()
                        }}
                        onwheel={(e) => {
                            e.preventDefault()
                            const val = parseFloat(wordSpacing) || 0
                            wordSpacing = (val + (e.deltaY < 0 ? 0.1 : -0.1)).toFixed(1)
                            handlePropertyChange()
                        }}
                        onkeydown={(e) => {
                            if (e.key === 'ArrowUp') {
                                e.preventDefault()
                                const val = parseFloat(wordSpacing) || 0
                                wordSpacing = (val + 0.1).toFixed(1)
                                handlePropertyChange()
                            }
                            if (e.key === 'ArrowDown') {
                                e.preventDefault()
                                const val = parseFloat(wordSpacing) || 0
                                wordSpacing = (val - 0.1).toFixed(1)
                                handlePropertyChange()
                            }
                        }}
                        placeholder="单词间距..."
                    />
                    <button class="unit-toggle" disabled>px</button>
                </div>
            </div>
        </div>
    {:else}
        <p class="placeholder">请选择一个节点来编辑文字样式</p>
    {/if}
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

    .property-group {
        display: flex;
        flex-direction: column;
        gap: calc(16px * var(--scale-ratio, 1));
    }

    .property-item {
        display: flex;
        align-items: center;
        gap: calc(12px * var(--scale-ratio, 1));
    }

    .property-item label {
        min-width: calc(80px * var(--scale-ratio, 1));
        font-size: calc(14px * var(--scale-ratio, 1));
        color: #94a3b8;
    }

    .select-wrapper {
        flex: 1;
        position: relative;
        margin-right: calc(48px * var(--scale-ratio, 1));
    }

    .select-wrapper select {
        width: 100%;
        padding: calc(8px * var(--scale-ratio, 1)) calc(12px * var(--scale-ratio, 1));
        background: rgba(255, 255, 255, 0.1);
        border: calc(1px * var(--scale-ratio, 1)) solid rgba(255, 255, 255, 0.2);
        border-radius: calc(6px * var(--scale-ratio, 1));
        color: #e2e8f0;
        font-size: calc(14px * var(--scale-ratio, 1));
        appearance: none;
        cursor: pointer;
        transition: all 0.3s ease;
    }

    .select-wrapper select:focus {
        outline: none;
        border-color: #cbd5e1;
        background: rgba(255, 255, 255, 0.15);
        box-shadow: 0 0 0 calc(3px * var(--scale-ratio, 1)) rgba(255, 255, 255, 0.1);
    }

    .select-wrapper select:hover {
        border-color: rgba(255, 255, 255, 0.3);
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

    .input-group {
        display: flex;
        align-items: center;
        gap: calc(8px * var(--scale-ratio, 1));
        flex: 1;
    }

    .input-group input {
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

    .input-group input:focus {
        outline: none;
        border-color: #cbd5e1;
        background: rgba(255, 255, 255, 0.15);
        box-shadow: 0 0 0 calc(3px * var(--scale-ratio, 1)) rgba(255, 255, 255, 0.1);
    }

    .input-group input:hover {
        border-color: rgba(255, 255, 255, 0.3);
    }

    /* 隐藏原生 number 输入框的上下箭头 */
    .input-group input[type='number']::-webkit-inner-spin-button,
    .input-group input[type='number']::-webkit-outer-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }
    .input-group input[type='number'] {
        -moz-appearance: textfield;
        appearance: textfield;
    }

    .unit-toggle {
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
    .unit-toggle:hover {
        background: rgba(255, 255, 255, 0.15);
    }
    .unit-toggle:disabled {
        cursor: not-allowed;
        color: #64748b;
        opacity: 0.7;
    }

    .color-input-group {
        flex: 1;
        position: relative;
        margin-right: calc(48px * var(--scale-ratio, 1));
    }

    .placeholder {
        color: #64748b;
        font-style: italic;
        text-align: center;
        margin-top: calc(40px * var(--scale-ratio, 1));
        font-size: calc(14px * var(--scale-ratio, 1));
    }
</style>
