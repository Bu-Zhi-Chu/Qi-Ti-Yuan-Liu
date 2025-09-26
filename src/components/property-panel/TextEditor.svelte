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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    import { getNodePropsStore, getNodeProps as _getNodeProps, updateNodeProps, getFullNode } from '../../services/parser/property-panel.service'
    import { updateNodeProperties } from '../../stores/dom-tree.store.svelte'
    import { projectId } from '../../stores/dom-tree.store.svelte'
    import ColorPicker from '../widgets/ColorPicker.svelte'
    import { getScaleRatio } from '../../services/utils/get-scale-ratio.util'
    import PropertyRow from './PropertyRow.svelte'
    import PropertySelect from './PropertySelect.svelte'
    import SizeInput from './SizeInput.svelte'
    import blocksConfig from '../blocks/blocks.config.json'
    import fontsConfig from '../fonts/fonts.config.json'

    interface Props {
        selectedId: string | null
    }

    let { selectedId }: Props = $props()

    // 解析 blocksConfig，用于判断是否隐藏文本内容
    const blocksMap = new Map((blocksConfig as any[]).map((b: any) => [b.type, b]))
    function isTextContentVisible(type?: string) {
        if (!type) return true
        const cfg = blocksMap.get(type)
        return cfg?.hideTextContent !== true
    }
    let showTextContent = $derived.by(() => {
        if (!selectedId) return false
        const node = getFullNode(selectedId)
        const type = node?.componentType || (node?.attributes as any)?.type
        return isTextContentVisible(type)
    })

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
    let textIndent = $state('0')
    let textWrapStyle = $state('normal-normal')

    // 字体族选项
    const fonts = fontsConfig as Array<{ name: string; family: string; fallback: string; src: string; weight?: string; style?: string }>

    function ensureFontLoaded(font: { name: string; family: string; fallback: string; src: string; weight?: string; style?: string }) {
        // 检查是否已加载
        const check = document.fonts.check(`1em ${font.family}`)
        if (check) return
        const face: FontFace = new (window as any).FontFace(font.family, `url(${font.src})`, {
            style: font.style || 'normal',
            weight: font.weight || '400'
        })
        ;(document as any).fonts.add(face)
        face.load().catch((err: unknown) => console.error('Font load error', err))
    }

    const fontFamilyOptions = [{ value: '', label: '默认' }, ...fonts.map((f) => ({ value: `'${f.family}', ${f.fallback}`, label: f.name }))]

    $effect(() => {
        if (!fontFamily) return
        const selected = fonts.find((f) => `'${f.family}', ${f.fallback}` === fontFamily)
        if (selected) {
            ensureFontLoaded(selected)
        }
    })
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

        const nodeProps = _getNodeProps(selectedId)
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
        let newTextIndent = '0'
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

        // 首行缩进
        const [parsedTextIndent] = parseSize(getStringValue(styles.textIndent) || '0px')
        newTextIndent = parsedTextIndent

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
        textIndent = newTextIndent
        textWrapStyle = newTextWrapStyle
    }

    // 通过 getNodePropsStore 订阅节点属性变化，实时刷新文字样式
    let unsubscribe = () => {}
    $effect(() => {
        // 先取消之前的订阅
        unsubscribe()

        if (selectedId) {
            const store = getNodePropsStore(selectedId)
            // 初始化一次
            initTextProps()
            // 订阅后续变化
            unsubscribe = store.subscribe(() => {
                initTextProps()
            })
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
            textIndent = '0'
        }

        // 清理函数，组件卸载或依赖变化时执行
        return () => {
            unsubscribe()
            unsubscribe = () => {}
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

        // 能匹配嵌套或单层 calc 表达式中的像素值，例如：
        // calc(23px * var(--scale-ratio, 0.1))
        // calc(calc(23px * var(--scale-ratio, 0.1)) * var(--scale-ratio, 1))
        const nestedMatch = size.match(/(\d+(?:\.\d+)?)\s*px/i)
        if (nestedMatch) {
            return [nestedMatch[1], 'px']
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
        // 若已包含 calc(...)，说明已格式化，直接返回避免嵌套
        if (val.trim().startsWith('calc(')) {
            return val
        }
        if (val === '' || isNaN(parseFloat(val))) return ''
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

        // 首行缩进
        styles.textIndent = formatSize(textIndent, 'px')

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

        // 获取当前节点信息
        const node = getFullNode(selectedId)
        const isButtonComponent = node?.componentType === 'Button'

        // 单独更新文本内容 - 必须先执行，避免订阅回调覆盖输入
        updateNodeProperties(selectedId, { textContent })

        // 如果是Button组件，同步更新data-name
        if (isButtonComponent) {
            updateNodeProps(selectedId, {
                attributes: { 'data-name': textContent }
            })
        }

        // 更新样式
        updateNodeProps(selectedId, { styles: filteredStyles })
    }
</script>

<div class="text-editor">
    {#if selectedId}
        <h3>文字样式</h3>
        <div class="text-list">
            <!-- 文本内容输入 - 放在第一个位置 -->
            {#if showTextContent}
                <PropertyRow label="文本内容">
                    <textarea
                        id="text-content"
                        rows="3"
                        bind:value={textContent}
                        oninput={(e) => {
                            textContent = (e.target as HTMLTextAreaElement).value
                            updateTextStyles()
                        }}
                        placeholder="输入文本内容..."
                        style="resize: vertical; min-height: calc(60px * var(--scale-ratio, 1));"
                    ></textarea>
                </PropertyRow>
            {/if}

            <PropertyRow label="文本字体">
                <PropertySelect
                    bind:value={fontFamily}
                    options={fontFamilyOptions}
                    change={(v) => {
                        fontFamily = v
                        updateTextStyles()
                    }}
                />
            </PropertyRow>

            <PropertyRow label="字体大小">
                <SizeInput
                    bind:value={fontSize}
                    unitOptions={['px']}
                    convert={(v) => v}
                    on:change={({ detail }) => {
                        fontSize = detail.value
                        updateTextStyles()
                    }}
                    placeholder="字体大小..."
                />
            </PropertyRow>

            <PropertyRow label="文本宽度">
                <PropertySelect
                    bind:value={fontWeight}
                    options={fontWeightOptions}
                    change={(v) => {
                        fontWeight = v
                        updateTextStyles()
                    }}
                />
            </PropertyRow>

            <PropertyRow label="文本颜色">
                <ColorPicker
                    value={hexToRgba(fontColor, fontOpacity)}
                    onchange={(rgba: string) => {
                        if (!rgba) {
                            // 清空文字颜色
                            fontColor = '#000000'
                            fontOpacity = 1
                            updateTextStyles()
                        } else {
                            const parsed = parseRgba(rgba)
                            if (parsed) {
                                fontColor = rgbToHex(parsed.r, parsed.g, parsed.b)
                                fontOpacity = parsed.a
                                updateTextStyles()
                            }
                        }
                    }}
                    projectId={$projectId}
                    componentId={selectedId || 'default'}
                />
            </PropertyRow>

            <PropertyRow label="文本行高">
                <SizeInput
                    bind:value={lineHeight}
                    unitOptions={['px']}
                    convert={(v) => v}
                    on:change={({ detail }) => {
                        lineHeight = detail.value
                        updateTextStyles()
                    }}
                    placeholder="行高(px)..."
                />
            </PropertyRow>

            <PropertyRow label="对齐方式">
                <PropertySelect
                    bind:value={textAlign}
                    options={textAlignOptions}
                    change={(v) => {
                        textAlign = v
                        updateTextStyles()
                    }}
                />
            </PropertyRow>

            <PropertyRow label="文字装饰">
                <PropertySelect
                    bind:value={textDecoration}
                    options={textDecorationOptions}
                    change={(v) => {
                        textDecoration = v
                        updateTextStyles()
                    }}
                />
            </PropertyRow>

            <PropertyRow label="字体样式">
                <PropertySelect
                    bind:value={fontStyle}
                    options={fontStyleOptions}
                    change={(v) => {
                        fontStyle = v
                        updateTextStyles()
                    }}
                />
            </PropertyRow>

            <PropertyRow label="字母间距">
                <SizeInput
                    bind:value={letterSpacing}
                    unitOptions={['px']}
                    convert={(v) => v}
                    on:change={({ detail }) => {
                        letterSpacing = detail.value
                        updateTextStyles()
                    }}
                    placeholder="字母间距..."
                />
            </PropertyRow>

            <PropertyRow label="单词间距">
                <SizeInput
                    bind:value={wordSpacing}
                    unitOptions={['px']}
                    convert={(v) => v}
                    on:change={({ detail }) => {
                        wordSpacing = detail.value
                        updateTextStyles()
                    }}
                    placeholder="单词间距..."
                />
            </PropertyRow>

            <PropertyRow label="首行缩进">
                <SizeInput
                    bind:value={textIndent}
                    unitOptions={['px']}
                    convert={(v) => v}
                    on:change={({ detail }) => {
                        textIndent = detail.value
                        updateTextStyles()
                    }}
                    placeholder="首行缩进..."
                />
            </PropertyRow>

            <!-- 文本换行 -->
            <PropertyRow label="文本换行">
                <PropertySelect
                    bind:value={textWrapStyle}
                    options={textWrapOptions}
                    change={(v) => {
                        textWrapStyle = v
                        updateTextStyles()
                    }}
                />
            </PropertyRow>
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

    /* 确保ColorPicker组件宽度一致 */
    .text-list :global(.color-picker-container) {
        flex: 1;
        min-width: 0;
    }

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

    textarea:focus {
        outline: none;
        border-color: #cbd5e1;
        background: rgba(255, 255, 255, 0.15);
        box-shadow: 0 0 0 calc(3px * var(--scale-ratio, 1)) rgba(255, 255, 255, 0.1);
    }

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
</style>
