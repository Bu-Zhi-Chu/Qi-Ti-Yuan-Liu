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
  - 文本换行（预设常用组合）

  使用说明：
  - 支持实时预览文字样式变化
  - 所有属性直接应用于DOM元素
  - 支持px和em单位切换
  - 文本换行提供常用预设组合，简化white-space和word-break的复杂配置
-->
<script lang="ts">
    import { getNodeProps, updateNodeProps, getFullNode } from '../../../services/property-panel/property-panel.service'
    import { updateNodeProperties } from '../../../services/repository/dom-tree.store.svelte'
    import { projectId } from '../../../services/repository/dom-tree.store.svelte'
    import ColorPicker from '../ColorPicker.svelte'
    import ResponsiveSlider from '../ResponsiveSlider.svelte'
    import { getScaleRatio } from '../../../services/utils/get-scale-ratio.util'

    interface Props {
        selectedId: string | null
    }

    let { selectedId }: Props = $props()

    // 文字样式状态
    let textContent = $state('')
    let fontFamily = $state('')
    let fontSize = $state('16')
    let fontWeight = $state('400')
    let fontColor = $state('#000000')
    let fontOpacity = $state(1)
    let lineHeight = $state('24')
    let textAlign = $state('left')
    let textDecoration = $state('none')
    let fontStyle = $state('normal')
    let letterSpacing = $state('0')
    let wordSpacing = $state('0')
    let textWrapStyle = $state('normal-normal')

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

    // 文本换行组合选项
    const textWrapOptions = [
        {
            value: 'normal-normal',
            label: '正常换行',
            whiteSpace: 'normal',
            wordBreak: 'normal'
        },
        {
            value: 'nowrap-normal',
            label: '不换行',
            whiteSpace: 'nowrap',
            wordBreak: 'normal'
        },
        {
            value: 'pre-normal',
            label: '保留格式',
            whiteSpace: 'pre',
            wordBreak: 'normal'
        },
        {
            value: 'pre-wrap-normal',
            label: '保留格式换行',
            whiteSpace: 'pre-wrap',
            wordBreak: 'normal'
        },
        {
            value: 'pre-line-normal',
            label: '合并空格换行',
            whiteSpace: 'pre-line',
            wordBreak: 'normal'
        },
        {
            value: 'normal-break-all',
            label: '强制断词',
            whiteSpace: 'normal',
            wordBreak: 'break-all'
        },
        {
            value: 'pre-wrap-break-word',
            label: '保留格式断词',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
        }
    ]

    // 初始化文字属性
    function initTextProps() {
        if (!selectedId) return

        const nodeProps = getNodeProps(selectedId)
        const fullNode = getFullNode(selectedId)
        if (!nodeProps || !fullNode) return

        const styles = nodeProps.styles || {}

        // 安全获取字符串值
        const getStringValue = (value: string | Blob | undefined): string => {
            return typeof value === 'string' ? value : ''
        }

        // 使用局部变量避免触发响应式更新
        let newFontFamily = getStringValue(styles.fontFamily) || 'Arial, sans-serif'
        let newFontSize = '16'
        let newFontWeight = getStringValue(styles.fontWeight) || '400'
        let newFontColor = '#000000'
        let newFontOpacity = 1

        let newLineHeight = '24'
        let newTextAlign = getStringValue(styles.textAlign) || 'left'
        let newTextDecoration = getStringValue(styles.textDecoration) || 'none'
        let newFontStyle = getStringValue(styles.fontStyle) || 'normal'
        let newLetterSpacing = '0'
        let newWordSpacing = '0'
        let newTextWrapStyle = 'normal-normal'

        // 字体大小
        const [parsedFontSize] = parseSize(getStringValue(styles.fontSize) || '16px')
        newFontSize = parsedFontSize

        // 字体颜色
        const colorStyle = getStringValue(styles.color) || '#000000'

        // 解析普通颜色
        if (colorStyle) {
            const match = colorStyle.match(/rgba?\(([^)]+)\)/)
            if (match) {
                const parts = match[1].split(',').map((s) => s.trim())
                if (parts.length >= 3) {
                    const r = parseInt(parts[0])
                    const g = parseInt(parts[1])
                    const b = parseInt(parts[2])
                    const a = parts.length > 3 ? parseFloat(parts[3]) : 1
                    newFontColor = rgbToHex(r, g, b)
                    newFontOpacity = a
                }
            } else if (/^#([0-9A-Fa-f]{6})$/.test(colorStyle)) {
                newFontColor = colorStyle
                newFontOpacity = 1
            }
        }

        // 行高
        const [parsedLineHeight] = parseSize(getStringValue(styles.lineHeight) || '1.5')
        newLineHeight = parsedLineHeight

        // 字母间距
        const [parsedLetterSpacing] = parseSize(getStringValue(styles.letterSpacing) || '0px')
        newLetterSpacing = parsedLetterSpacing

        // 单词间距
        const [parsedWordSpacing] = parseSize(getStringValue(styles.wordSpacing) || '0px')
        newWordSpacing = parsedWordSpacing

        // 文字换行 - 根据whiteSpace和wordBreak匹配合适的组合
        const whiteSpaceValue = getStringValue(styles.whiteSpace) || 'normal'
        const wordBreakValue = getStringValue(styles.wordBreak) || 'normal'

        // 查找匹配的组合
        const matchedOption = textWrapOptions.find((option) => option.whiteSpace === whiteSpaceValue && option.wordBreak === wordBreakValue)
        newTextWrapStyle = matchedOption ? matchedOption.value : 'normal-normal'

        // 文本内容
        textContent = fullNode.textContent || ''

        // 批量更新响应式状态，避免多次触发
        fontFamily = newFontFamily
        fontSize = newFontSize
        fontWeight = newFontWeight
        fontColor = newFontColor
        fontOpacity = newFontOpacity
        lineHeight = newLineHeight
        textAlign = newTextAlign
        textDecoration = newTextDecoration
        fontStyle = newFontStyle
        letterSpacing = newLetterSpacing
        wordSpacing = newWordSpacing
        textWrapStyle = newTextWrapStyle
    }

    // 监听selectedId变化，自动调用初始化函数
    $effect(() => {
        if (selectedId) {
            initTextProps()
        } else {
            // 重置所有属性
            textContent = ''
            fontFamily = 'Arial, sans-serif'
            fontSize = '16'
            fontWeight = '400'
            fontColor = '#000000'
            fontOpacity = 1
            lineHeight = '1.5'
            textAlign = 'left'
            textDecoration = 'none'
            fontStyle = 'normal'
            letterSpacing = '0'
            wordSpacing = '0'
            textWrapStyle = 'normal-normal'
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
        const match = rgba.match(/rgba?\(([^)]+)\)/i)
        if (match) {
            const parts = match[1].split(',').map((s) => s.trim())
            return {
                r: parseInt(parts[0]),
                g: parseInt(parts[1]),
                b: parseInt(parts[2]),
                a: parts.length > 3 ? parseFloat(parts[3]) : 1
            }
        }
        return null
    }

    // 解析尺寸值
    function parseSize(size: string | undefined): [string, 'px'] {
        if (!size) return ['16', 'px']
        const calcMatch = size.match(/^calc\(\s*(\d+(?:\.\d+)?)\s*px\b.*\)$/i)
        if (calcMatch) {
            return [calcMatch[1], 'px']
        }

        // 处理旧的倍数格式（如1.5）转换为px
        const numericValue = parseFloat(size)
        if (!isNaN(numericValue) && numericValue > 0 && numericValue <= 5) {
            // 将倍数转换为px（基于16px字体大小）
            return [Math.round(numericValue * 16 * 10) / 10 + '', 'px']
        }

        return [size.replace('px', ''), 'px']
    }

    // 统一格式化尺寸
    function formatSize(val: string, unit: 'px'): string {
        return `calc(${val}px * var(--scale-ratio, 1))`
    }

    // 统一更新文字样式
    function updateTextStyles() {
        if (!selectedId) return

        const styles: Record<string, string | Blob> = {}

        // 字体族
        styles.fontFamily = fontFamily

        // 字体大小
        styles.fontSize = formatSize(fontSize, 'px')

        // 字体粗细
        styles.fontWeight = fontWeight

        // 字体颜色
        const r = parseInt(fontColor.slice(1, 3), 16)
        const g = parseInt(fontColor.slice(3, 5), 16)
        const b = parseInt(fontColor.slice(5, 7), 16)
        styles.color = `rgba(${r}, ${g}, ${b}, ${fontOpacity})`

        // 行高
        styles.lineHeight = formatSize(lineHeight, 'px')

        // 文字对齐
        styles.textAlign = textAlign

        // 文字装饰
        styles.textDecoration = textDecoration

        // 字体样式
        styles.fontStyle = fontStyle

        // 字母间距
        styles.letterSpacing = formatSize(letterSpacing, 'px')

        // 单词间距
        styles.wordSpacing = formatSize(wordSpacing, 'px')

        // 文字换行
        const wrapStyle = textWrapOptions.find((opt) => opt.value === textWrapStyle)
        styles.whiteSpace = wrapStyle ? wrapStyle.whiteSpace : 'normal'
        styles.wordBreak = wrapStyle ? wrapStyle.wordBreak : 'normal'

        // 更新样式 - 将Blob类型过滤掉，只保留string类型
        const filteredStyles: Record<string, string | undefined> = {}
        Object.entries(styles).forEach(([key, value]) => {
            if (typeof value === 'string') {
                filteredStyles[key] = value
            } else if (value === undefined) {
                filteredStyles[key] = undefined
            }
        })
        updateNodeProps(selectedId, { styles: filteredStyles })

        // 单独更新文本内容
        updateNodeProperties(selectedId, { textContent })
    }
</script>

<div class="text-editor">
    {#if selectedId}
        <h3>文字样式</h3>
        <div class="text-list">
            <!-- 文本内容输入 - 放在第一个位置 -->
            <div class="text-item">
                <label for="text-content">文本内容</label>
                <textarea id="text-content" rows="3" bind:value={textContent} oninput={updateTextStyles} placeholder="输入文本内容..." style="resize: vertical; min-height: calc(60px * var(--scale-ratio, 1));"></textarea>
                <span class="unit-placeholder"></span>
            </div>

            <div class="text-item">
                <label for="font-family">文本字体</label>
                <div class="select-wrapper">
                    <select id="font-family" bind:value={fontFamily} onchange={updateTextStyles}>
                        {#each fontFamilyOptions as family}
                            <option value={family.value}>{family.label}</option>
                        {/each}
                    </select>
                </div>
                <span class="unit-placeholder"></span>
            </div>

            <div class="text-item">
                <label for="font-size">字体大小</label>
                <input
                    id="font-size"
                    type="number"
                    min="8"
                    max="200"
                    step="1"
                    bind:value={fontSize}
                    oninput={(e) => {
                        updateTextStyles()
                    }}
                    onwheel={(e) => {
                        e.preventDefault()
                        const val = parseInt(fontSize) || 16
                        fontSize = val + (e.deltaY < 0 ? 1 : -1) + ''
                        updateTextStyles()
                    }}
                    onkeydown={(e) => {
                        if (e.key === 'ArrowUp') {
                            e.preventDefault()
                            const val = parseInt(fontSize) || 16
                            fontSize = val + 1 + ''
                            updateTextStyles()
                        }
                        if (e.key === 'ArrowDown') {
                            e.preventDefault()
                            const val = parseInt(fontSize) || 16
                            fontSize = val - 1 + ''
                            updateTextStyles()
                        }
                    }}
                    placeholder="字体大小..."
                />
                <button class="unit-toggle" disabled>px</button>
            </div>

            <div class="text-item">
                <label for="font-weight">文本宽度</label>
                <div class="select-wrapper">
                    <select id="font-weight" bind:value={fontWeight} onchange={updateTextStyles}>
                        {#each fontWeightOptions as weight}
                            <option value={weight.value}>{weight.label}</option>
                        {/each}
                    </select>
                </div>
                <span class="unit-placeholder"></span>
            </div>

            <div class="text-item">
                <label for="font-color">文本颜色</label>
                <ColorPicker
                    value={hexToRgba(fontColor, fontOpacity)}
                    onchange={(rgba: string) => {
                        const parsed = parseRgba(rgba)
                        if (parsed) {
                            fontColor = rgbToHex(parsed.r, parsed.g, parsed.b)
                            fontOpacity = parsed.a
                            updateTextStyles()
                        }
                    }}
                    projectId={projectId()}
                    componentId={selectedId || 'default'}
                />
                <span class="unit-placeholder"></span>
            </div>

            <div class="text-item">
                <label for="line-height">文本行高</label>
                <input
                    id="line-height"
                    type="number"
                    min="8"
                    max="80"
                    step="1"
                    bind:value={lineHeight}
                    oninput={(e) => {
                        updateTextStyles()
                    }}
                    onwheel={(e) => {
                        e.preventDefault()
                        const val = parseInt(lineHeight) || 24
                        lineHeight = (val + (e.deltaY < 0 ? 1 : -1)).toString()
                        updateTextStyles()
                    }}
                    onkeydown={(e) => {
                        if (e.key === 'ArrowUp') {
                            e.preventDefault()
                            const val = parseInt(lineHeight) || 24
                            lineHeight = (val + 1).toString()
                            updateTextStyles()
                        }
                        if (e.key === 'ArrowDown') {
                            e.preventDefault()
                            const val = parseInt(lineHeight) || 24
                            lineHeight = (val - 1).toString()
                            updateTextStyles()
                        }
                    }}
                    placeholder="行高(px)..."
                />
                <button class="unit-toggle" disabled>px</button>
            </div>

            <div class="text-item">
                <label for="text-align">对齐方式</label>
                <div class="select-wrapper">
                    <select id="text-align" bind:value={textAlign} onchange={updateTextStyles}>
                        {#each textAlignOptions as option}
                            <option value={option.value}>{option.label}</option>
                        {/each}
                    </select>
                </div>
                <span class="unit-placeholder"></span>
            </div>

            <div class="text-item">
                <label for="text-decoration">文字装饰</label>
                <div class="select-wrapper">
                    <select id="text-decoration" bind:value={textDecoration} onchange={updateTextStyles}>
                        {#each textDecorationOptions as option}
                            <option value={option.value}>{option.label}</option>
                        {/each}
                    </select>
                </div>
                <span class="unit-placeholder"></span>
            </div>

            <div class="text-item">
                <label for="font-style">字体样式</label>
                <div class="select-wrapper">
                    <select id="font-style" bind:value={fontStyle} onchange={updateTextStyles}>
                        {#each fontStyleOptions as option}
                            <option value={option.value}>{option.label}</option>
                        {/each}
                    </select>
                </div>
                <span class="unit-placeholder"></span>
            </div>

            <div class="text-item">
                <label for="letter-spacing">字母间距</label>
                <input
                    id="letter-spacing"
                    type="number"
                    min="-5"
                    max="10"
                    step="0.1"
                    bind:value={letterSpacing}
                    oninput={(e) => {
                        updateTextStyles()
                    }}
                    onwheel={(e) => {
                        e.preventDefault()
                        const val = parseFloat(letterSpacing) || 0
                        letterSpacing = (val + (e.deltaY < 0 ? 0.1 : -0.1)).toFixed(1)
                        updateTextStyles()
                    }}
                    onkeydown={(e) => {
                        if (e.key === 'ArrowUp') {
                            e.preventDefault()
                            const val = parseFloat(letterSpacing) || 0
                            letterSpacing = (val + 0.1).toFixed(1)
                            updateTextStyles()
                        }
                        if (e.key === 'ArrowDown') {
                            e.preventDefault()
                            const val = parseFloat(letterSpacing) || 0
                            letterSpacing = (val - 0.1).toFixed(1)
                            updateTextStyles()
                        }
                    }}
                    placeholder="字母间距..."
                />
                <button class="unit-toggle" disabled>px</button>
            </div>

            <div class="text-item">
                <label for="word-spacing">单词间距</label>
                <input
                    id="word-spacing"
                    type="number"
                    min="-5"
                    max="10"
                    step="0.1"
                    bind:value={wordSpacing}
                    oninput={(e) => {
                        updateTextStyles()
                    }}
                    onwheel={(e) => {
                        e.preventDefault()
                        const val = parseFloat(wordSpacing) || 0
                        wordSpacing = (val + (e.deltaY < 0 ? 0.1 : -0.1)).toFixed(1)
                        updateTextStyles()
                    }}
                    onkeydown={(e) => {
                        if (e.key === 'ArrowUp') {
                            e.preventDefault()
                            const val = parseFloat(wordSpacing) || 0
                            wordSpacing = (val + 0.1).toFixed(1)
                            updateTextStyles()
                        }
                        if (e.key === 'ArrowDown') {
                            e.preventDefault()
                            const val = parseFloat(wordSpacing) || 0
                            wordSpacing = (val - 0.1).toFixed(1)
                            updateTextStyles()
                        }
                    }}
                    placeholder="单词间距..."
                />
                <button class="unit-toggle" disabled>px</button>
            </div>

            <!-- 文本换行 -->
            <div class="text-item">
                <label for="text-wrap">文本换行</label>
                <div class="select-wrapper">
                    <select id="text-wrap" bind:value={textWrapStyle} onchange={updateTextStyles}>
                        {#each textWrapOptions as option}
                            <option value={option.value}>{option.label}</option>
                        {/each}
                    </select>
                </div>
                <span class="unit-placeholder"></span>
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
    .text-list {
        display: flex;
        flex-direction: column;
        gap: calc(12px * var(--scale-ratio, 1));
    }
    .text-item {
        display: flex;
        align-items: center;
        gap: calc(10px * var(--scale-ratio, 1));
    }

    /* 确保ColorPicker组件宽度一致 */
    .text-item :global(.color-picker-container) {
        flex: 1;
        min-width: 0;
    }
    label {
        min-width: calc(30px * var(--scale-ratio, 1));
        font-size: calc(13px * var(--scale-ratio, 1));
        font-weight: 500;
        color: #94a3b8;
    }
    input,
    select,
    textarea {
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

    /* 单位切换按钮样式 */
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
        opacity: 0.5;
    }

    .unit-placeholder {
        width: calc(40px * var(--scale-ratio, 1));
    }

    select:focus,
    input:focus,
    textarea:focus {
        outline: none;
        border-color: #cbd5e1;
        background: rgba(255, 255, 255, 0.15);
        box-shadow: 0 0 0 calc(3px * var(--scale-ratio, 1)) rgba(255, 255, 255, 0.1);
    }
    select option {
        background: #1e293b;
        color: #e2e8f0;
    }
    input::placeholder,
    textarea::placeholder {
        color: #9ca3af;
    }
    .placeholder {
        color: #64748b;
        text-align: center;
        padding: calc(40px * var(--scale-ratio, 1));
        font-size: calc(14px * var(--scale-ratio, 1));
    }
    textarea {
        min-height: calc(80px * var(--scale-ratio, 1));
    }

    /* 下拉框包装器和下拉图标 */
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
        border-top: calc(6px * var(--scale-ratio, 1)) solid #94a3b8;
        pointer-events: none;
    }
    .select-wrapper select {
        width: 100%;
        padding-right: calc(30px * var(--scale-ratio, 1));
    }

    /* 隐藏原生 number 输入框的上下箭头 */
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
