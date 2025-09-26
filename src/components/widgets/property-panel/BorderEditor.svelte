<!--
  BorderEditor.svelte
  边框样式编辑面板
  提供边框相关属性的可视化编辑界面
  支持统一控制与四边独立控制两种模式
-->
<script lang="ts">
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    import { getNodePropsStore, getNodeProps as _getNodeProps, updateNodeProps } from '../../../services/parser/property-panel.service'
    import ColorPicker from '../ColorPicker.svelte'
    import PropertyRow from './PropertyRow.svelte'
    import SizeInput from './SizeInput.svelte'
    import PropertySelect from './PropertySelect.svelte'
    import ToggleSwitch from '../ToggleSwitch.svelte'
    import { onMount } from 'svelte'

    interface Props {
        selectedId: string | null
    }

    let { selectedId }: Props = $props()

    // 当前节点 props 快照类型
    let propsSnapshot: ReturnType<typeof _getNodeProps> | null = null
    // 订阅函数
    let unsubscribe = () => {}

    // 统一控制开关
    let unifiedControl = $state(true)

    // 统一边框属性
    let borderWidth = $state('0')
    let borderColor = $state('#000000')
    let borderStyle = $state('solid')
    let borderRadius = $state('0')
    let borderRadiusUnit = $state<'px' | '%'>('px')

    // 四边独立属性
    let borderTopWidth = $state('0')
    let borderTopColor = $state('#000000')
    let borderTopStyle = $state('solid')
    let borderRightWidth = $state('0')
    let borderRightColor = $state('#000000')
    let borderRightStyle = $state('solid')
    let borderBottomWidth = $state('0')
    let borderBottomColor = $state('#000000')
    let borderBottomStyle = $state('solid')
    let borderLeftWidth = $state('0')
    let borderLeftColor = $state('#000000')
    let borderLeftStyle = $state('solid')

    // 四个独立圆角属性
    let borderTopLeftRadius = $state('0')
    let borderTopRightRadius = $state('0')
    let borderBottomLeftRadius = $state('0')
    let borderBottomRightRadius = $state('0')
    let borderTopLeftRadiusUnit = $state<'px' | '%'>('px')
    let borderTopRightRadiusUnit = $state<'px' | '%'>('px')
    let borderBottomLeftRadiusUnit = $state<'px' | '%'>('px')
    let borderBottomRightRadiusUnit = $state<'px' | '%'>('px')

    // 根节点判断
    let isRoot = $state(false)

    // 边框样式选项
    const borderStyleOptions = [
        { value: 'none', label: '无边框' },
        { value: 'solid', label: '实线' },
        { value: 'dashed', label: '虚线' },
        { value: 'dotted', label: '点线' },
        { value: 'double', label: '双线' },
        { value: 'groove', label: '凹槽' },
        { value: 'ridge', label: '垄状' },
        { value: 'inset', label: '内嵌' },
        { value: 'outset', label: '外嵌' }
    ]

    // 新版：通过 getNodePropsStore 订阅实时变化
    $effect(() => {
        unsubscribe()
        if (selectedId) {
            const store = getNodePropsStore(selectedId)
            unsubscribe = store.subscribe((props) => {
                propsSnapshot = props
                if (!props) return
                const getStringValue = (value: string | Blob | undefined): string => (typeof value === 'string' ? value : '')

                // 读取统一边框属性
                borderWidth = parsePxValue(getStringValue(props.styles?.borderWidth)) || ''
                borderColor = getStringValue(props.styles?.borderColor) || '#000000'
                borderStyle = getStringValue(props.styles?.borderStyle) || 'solid'
                ;[borderRadius, borderRadiusUnit] = parseBorderRadius(getStringValue(props.styles?.borderRadius))

                // 读取四边独立属性
                borderTopWidth = parsePxValue(getStringValue(props.styles?.borderTopWidth)) || ''
                borderTopColor = getStringValue(props.styles?.borderTopColor) || '#000000'
                borderTopStyle = getStringValue(props.styles?.borderTopStyle) || 'solid'
                borderRightWidth = parsePxValue(getStringValue(props.styles?.borderRightWidth)) || ''
                borderRightColor = getStringValue(props.styles?.borderRightColor) || '#000000'
                borderRightStyle = getStringValue(props.styles?.borderRightStyle) || 'solid'
                borderBottomWidth = parsePxValue(getStringValue(props.styles?.borderBottomWidth)) || ''
                borderBottomColor = getStringValue(props.styles?.borderBottomColor) || '#000000'
                borderBottomStyle = getStringValue(props.styles?.borderBottomStyle) || 'solid'
                borderLeftWidth = parsePxValue(getStringValue(props.styles?.borderLeftWidth)) || ''
                borderLeftColor = getStringValue(props.styles?.borderLeftColor) || '#000000'
                borderLeftStyle = getStringValue(props.styles?.borderLeftStyle) || 'solid'

                // 读取四个独立圆角属性
                ;[borderTopLeftRadius, borderTopLeftRadiusUnit] = parseBorderRadius(getStringValue(props.styles?.borderTopLeftRadius))
                ;[borderTopRightRadius, borderTopRightRadiusUnit] = parseBorderRadius(getStringValue(props.styles?.borderTopRightRadius))
                ;[borderBottomLeftRadius, borderBottomLeftRadiusUnit] = parseBorderRadius(getStringValue(props.styles?.borderBottomLeftRadius))
                ;[borderBottomRightRadius, borderBottomRightRadiusUnit] = parseBorderRadius(getStringValue(props.styles?.borderBottomRightRadius))

                // 判断是否使用统一控制
                const hasUnified = getStringValue(props.styles?.borderWidth) || getStringValue(props.styles?.borderColor) || getStringValue(props.styles?.borderStyle) || getStringValue(props.styles?.borderRadius)
                const hasIndividual =
                    getStringValue(props.styles?.borderTopWidth) ||
                    getStringValue(props.styles?.borderTopColor) ||
                    getStringValue(props.styles?.borderTopStyle) ||
                    getStringValue(props.styles?.borderRightWidth) ||
                    getStringValue(props.styles?.borderRightColor) ||
                    getStringValue(props.styles?.borderRightStyle) ||
                    getStringValue(props.styles?.borderBottomWidth) ||
                    getStringValue(props.styles?.borderBottomColor) ||
                    getStringValue(props.styles?.borderBottomStyle) ||
                    getStringValue(props.styles?.borderLeftWidth) ||
                    getStringValue(props.styles?.borderLeftColor) ||
                    getStringValue(props.styles?.borderLeftStyle)

                if (hasUnified && !hasIndividual) {
                    unifiedControl = true
                } else if (hasIndividual && !hasUnified) {
                    unifiedControl = false
                } // 如果两者都没有或同时存在，保持现状
            })
        } else {
            resetAllProperties()
        }
        return () => {
            unsubscribe()
            unsubscribe = () => {}
        }
    })

    // 解析 px 值
    function parsePxValue(value: string | undefined): string {
        if (!value) return '0'
        const match = value.match(/calc\((\d+)px.*\)/)
        return match ? match[1] : value.replace('px', '')
    }

    // 格式化 px 值
    function formatPxValue(value: string): string {
        if (!value) return ''
        return `calc(${value}px * var(--scale-ratio, 1))`
    }

    // 解析边框圆角值和单位
    function parseBorderRadius(value: string | undefined): [string, 'px' | '%'] {
        if (!value) return ['0', 'px']

        // 处理百分比
        if (value.endsWith('%')) {
            return [value.replace('%', ''), '%']
        }

        // 处理calc表达式中的px
        const match = value.match(/calc\((\d+(?:\.\d+)?)px.*\)/)
        if (match) {
            return [match[1], 'px']
        }

        // 处理普通px
        if (value.endsWith('px')) {
            return [value.replace('px', ''), 'px']
        }

        return [value, 'px']
    }

    // 格式化边框圆角值
    function formatBorderRadius(value: string, unit: 'px' | '%'): string {
        if (!value) return ''
        if (unit === '%') {
            return `${value}%`
        }
        return `calc(${value}px * var(--scale-ratio, 1))`
    }

    // 重置所有属性
    function resetAllProperties() {
        unifiedControl = true
        borderWidth = '0'
        borderColor = '#000000'
        borderStyle = 'solid'
        borderRadius = '0'
        borderRadiusUnit = 'px'
        borderTopWidth = '0'
        borderTopColor = '#000000'
        borderTopStyle = 'solid'
        borderRightWidth = '0'
        borderRightColor = '#000000'
        borderRightStyle = 'solid'
        borderBottomWidth = '0'
        borderBottomColor = '#000000'
        borderBottomStyle = 'solid'
        borderLeftWidth = '0'
        borderLeftColor = '#000000'
        borderLeftStyle = 'solid'
        borderTopLeftRadius = '0'
        borderTopRightRadius = '0'
        borderBottomLeftRadius = '0'
        borderBottomRightRadius = '0'
        borderTopLeftRadiusUnit = 'px'
        borderTopRightRadiusUnit = 'px'
        borderBottomLeftRadiusUnit = 'px'
        borderBottomRightRadiusUnit = 'px'
    }

    // 更新统一边框样式
    function updateUnifiedBorder() {
        if (!selectedId || isRoot) return

        const styles: Record<string, string> = {}

        styles.borderWidth = formatPxValue(borderWidth)
        styles.borderColor = borderColor || '#000000'
        styles.borderStyle = borderStyle || 'solid'
        styles.borderRadius = formatBorderRadius(borderRadius, borderRadiusUnit)

        // 清除四边独立样式
        styles.borderTopWidth = ''
        styles.borderTopColor = ''
        styles.borderTopStyle = ''
        styles.borderRightWidth = ''
        styles.borderRightColor = ''
        styles.borderRightStyle = ''
        styles.borderBottomWidth = ''
        styles.borderBottomColor = ''
        styles.borderBottomStyle = ''
        styles.borderLeftWidth = ''
        styles.borderLeftColor = ''
        styles.borderLeftStyle = ''

        updateNodeProps(selectedId, { styles })
    }

    // 更新四边独立边框样式
    function updateIndividualBorder(side: string, prop: string, value: string) {
        if (!selectedId || isRoot) return

        const styles: Record<string, string> = {}
        const key = `border${side}${prop}`

        if (prop === 'Radius') {
            styles[key] = formatBorderRadius(value, getRadiusUnitForSide(side))
        } else if (prop === 'Width') {
            styles[key] = formatPxValue(value)
        } else {
            styles[key] = value || (prop === 'Color' ? '#000000' : 'solid')
        }

        // 如果当前修改的不是样式属性，且未显式指定样式，则为该边补充默认样式（solid）
        if (prop !== 'Style') {
            const styleKey = `border${side}Style`
            let currentStyle = 'solid'
            switch (side) {
                case 'Top':
                    currentStyle = borderTopStyle || 'solid'
                    break
                case 'Right':
                    currentStyle = borderRightStyle || 'solid'
                    break
                case 'Bottom':
                    currentStyle = borderBottomStyle || 'solid'
                    break
                case 'Left':
                    currentStyle = borderLeftStyle || 'solid'
                    break
            }
            styles[styleKey] = currentStyle
        }

        // 清除统一边框样式，确保互斥
        styles.borderWidth = ''
        styles.borderColor = ''
        styles.borderStyle = ''
        styles.borderRadius = ''

        updateNodeProps(selectedId, { styles })
    }

    // 获取对应边的圆角单位
    function getRadiusUnitForSide(side: string): 'px' | '%' {
        switch (side) {
            case 'TopLeft':
                return borderTopLeftRadiusUnit
            case 'TopRight':
                return borderTopRightRadiusUnit
            case 'BottomLeft':
                return borderBottomLeftRadiusUnit
            case 'BottomRight':
                return borderBottomRightRadiusUnit
            default:
                return 'px'
        }
    }

    // 切换独立圆角单位
    function toggleIndividualRadiusUnit(side: string) {
        if (!selectedId || isRoot) return

        let unitRef: 'px' | '%'
        let valueRef: string
        let sideKey: string

        switch (side) {
            case 'TopLeft':
                borderTopLeftRadiusUnit = borderTopLeftRadiusUnit === 'px' ? '%' : 'px'
                unitRef = borderTopLeftRadiusUnit
                valueRef = borderTopLeftRadius
                sideKey = 'TopLeft'
                break
            case 'TopRight':
                borderTopRightRadiusUnit = borderTopRightRadiusUnit === 'px' ? '%' : 'px'
                unitRef = borderTopRightRadiusUnit
                valueRef = borderTopRightRadius
                sideKey = 'TopRight'
                break
            case 'BottomLeft':
                borderBottomLeftRadiusUnit = borderBottomLeftRadiusUnit === 'px' ? '%' : 'px'
                unitRef = borderBottomLeftRadiusUnit
                valueRef = borderBottomLeftRadius
                sideKey = 'BottomLeft'
                break
            case 'BottomRight':
                borderBottomRightRadiusUnit = borderBottomRightRadiusUnit === 'px' ? '%' : 'px'
                unitRef = borderBottomRightRadiusUnit
                valueRef = borderBottomRightRadius
                sideKey = 'BottomRight'
                break
            default:
                return
        }

        if (valueRef) {
            updateIndividualBorder(sideKey, 'Radius', valueRef)
        }
    }

    // 处理数字输入的键盘事件
    function handleNumberKeydown(e: KeyboardEvent, currentValue: string, callback: (newValue: string) => void) {
        if (e.key === 'ArrowUp') {
            e.preventDefault()
            const val = parseInt(currentValue) || 0
            callback(String(val + 1))
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            const val = parseInt(currentValue) || 0
            callback(String(Math.max(0, val - 1)))
        }
    }

    // 切换边框圆角单位
    function toggleBorderRadiusUnit() {
        if (!selectedId || isRoot) return

        borderRadiusUnit = borderRadiusUnit === 'px' ? '%' : 'px'

        // 如果当前有值，则更新样式
        if (borderRadius) {
            updateUnifiedBorder()
        }
    }

    // 新增：切换统一/分别控制时互斥更新样式的处理函数
    function handleUnifiedToggle() {
        if (!selectedId || isRoot) return
        if (unifiedControl) {
            updateUnifiedBorder()
        } else {
            updateNodeProps(selectedId, {
                styles: {
                    borderWidth: '',
                    borderColor: '',
                    borderStyle: '',
                    borderRadius: ''
                }
            })
        }
    }
</script>

<div class="border-editor">
    <h3>边框样式</h3>

    {#if selectedId}
        <!-- 统一控制开关 -->
        <div class="border-section">
            <div class="attr-list">
                <PropertyRow label="统一控制">
                    <ToggleSwitch id="unified-control" bind:checked={unifiedControl} disabled={isRoot} on:change={handleUnifiedToggle} />
                </PropertyRow>
            </div>
        </div>

        {#if unifiedControl}
            <!-- 统一边框样式 -->
            <div class="border-section">
                <div class="attr-list">
                    <PropertyRow label="边框宽度">
                        <SizeInput
                            bind:value={borderWidth}
                            unit="px"
                            unitOptions={['px']}
                            disabled={isRoot}
                            convert={(val) => val}
                            on:change={(e) => {
                                borderWidth = e.detail.value
                                updateUnifiedBorder()
                            }}
                        />
                    </PropertyRow>

                    <PropertyRow label="边框颜色">
                        <ColorPicker
                            value={borderColor}
                            onchange={(color: string | null) => {
                                borderColor = color || '#000000'
                                updateUnifiedBorder()
                            }}
                            disabled={isRoot}
                        />
                    </PropertyRow>

                    <PropertyRow label="边框样式">
                        <PropertySelect
                            bind:value={borderStyle}
                            options={borderStyleOptions}
                            disabled={isRoot}
                            change={(val: string) => {
                                borderStyle = val
                                updateUnifiedBorder()
                            }}
                        />
                    </PropertyRow>

                    <PropertyRow label="边框圆角">
                        <SizeInput
                            bind:value={borderRadius}
                            bind:unit={borderRadiusUnit}
                            disabled={isRoot}
                            convert={(val) => val}
                            on:change={(e) => {
                                borderRadius = e.detail.value
                                borderRadiusUnit = e.detail.unit
                                updateUnifiedBorder()
                            }}
                        />
                    </PropertyRow>
                </div>
            </div>
        {:else}
            <!-- 四边独立边框样式 -->
            <div class="border-section">
                <div class="attr-list">
                    <PropertyRow label="上边宽度">
                        <SizeInput
                            bind:value={borderTopWidth}
                            unit="px"
                            disabled={isRoot}
                            convert={(val) => val}
                            on:change={(e) => {
                                borderTopWidth = e.detail.value
                                updateIndividualBorder('Top', 'Width', e.detail.value)
                            }}
                        />
                    </PropertyRow>

                    <PropertyRow label="上边颜色">
                        <ColorPicker value={borderTopColor} onchange={(color: string | null) => updateIndividualBorder('Top', 'Color', color || '#000000')} disabled={isRoot} />
                    </PropertyRow>

                    <PropertyRow label="上边样式">
                        <PropertySelect
                            bind:value={borderTopStyle}
                            options={borderStyleOptions}
                            disabled={isRoot}
                            change={(val: string) => {
                                borderTopStyle = val
                                updateIndividualBorder('Top', 'Style', val)
                            }}
                        />
                    </PropertyRow>
                </div>
            </div>

            <div class="border-section">
                <div class="attr-list">
                    <PropertyRow label="右边宽度">
                        <SizeInput
                            bind:value={borderRightWidth}
                            unit="px"
                            disabled={isRoot}
                            convert={(val) => val}
                            on:change={(e) => {
                                borderRightWidth = e.detail.value
                                updateIndividualBorder('Right', 'Width', e.detail.value)
                            }}
                        />
                    </PropertyRow>

                    <PropertyRow label="右边颜色">
                        <ColorPicker value={borderRightColor} onchange={(color: string | null) => updateIndividualBorder('Right', 'Color', color || '#000000')} disabled={isRoot} />
                    </PropertyRow>

                    <PropertyRow label="右边样式">
                        <PropertySelect
                            bind:value={borderRightStyle}
                            options={borderStyleOptions}
                            disabled={isRoot}
                            change={(val: string) => {
                                borderRightStyle = val
                                updateIndividualBorder('Right', 'Style', val)
                            }}
                        />
                    </PropertyRow>
                </div>
            </div>

            <div class="border-section">
                <div class="attr-list">
                    <PropertyRow label="下边宽度">
                        <SizeInput
                            bind:value={borderBottomWidth}
                            unit="px"
                            disabled={isRoot}
                            convert={(val) => val}
                            on:change={(e) => {
                                borderBottomWidth = e.detail.value
                                updateIndividualBorder('Bottom', 'Width', e.detail.value)
                            }}
                        />
                    </PropertyRow>

                    <PropertyRow label="下边颜色">
                        <ColorPicker value={borderBottomColor} onchange={(color: string | null) => updateIndividualBorder('Bottom', 'Color', color || '#000000')} disabled={isRoot} />
                    </PropertyRow>

                    <PropertyRow label="下边样式">
                        <PropertySelect
                            bind:value={borderBottomStyle}
                            options={borderStyleOptions}
                            disabled={isRoot}
                            change={(val: string) => {
                                borderBottomStyle = val
                                updateIndividualBorder('Bottom', 'Style', val)
                            }}
                        />
                    </PropertyRow>
                </div>
            </div>

            <div class="border-section">
                <div class="attr-list">
                    <PropertyRow label="左边宽度">
                        <SizeInput
                            bind:value={borderLeftWidth}
                            unit="px"
                            disabled={isRoot}
                            convert={(val) => val}
                            on:change={(e) => {
                                borderLeftWidth = e.detail.value
                                updateIndividualBorder('Left', 'Width', e.detail.value)
                            }}
                        />
                    </PropertyRow>

                    <PropertyRow label="左边颜色">
                        <ColorPicker value={borderLeftColor} onchange={(color: string | null) => updateIndividualBorder('Left', 'Color', color || '#000000')} disabled={isRoot} />
                    </PropertyRow>

                    <PropertyRow label="左边样式">
                        <PropertySelect
                            bind:value={borderLeftStyle}
                            options={borderStyleOptions}
                            disabled={isRoot}
                            change={(val: string) => {
                                borderLeftStyle = val
                                updateIndividualBorder('Left', 'Style', val)
                            }}
                        />
                    </PropertyRow>
                </div>
            </div>

            <!-- 四个独立圆角设置 -->
            <div class="border-section">
                <div class="attr-list">
                    <PropertyRow label="上左圆角">
                        <SizeInput
                            bind:value={borderTopLeftRadius}
                            bind:unit={borderTopLeftRadiusUnit}
                            disabled={isRoot}
                            convert={(val) => val}
                            on:change={(e) => {
                                borderTopLeftRadius = e.detail.value
                                borderTopLeftRadiusUnit = e.detail.unit
                                updateIndividualBorder('TopLeft', 'Radius', e.detail.value)
                            }}
                        />
                    </PropertyRow>

                    <PropertyRow label="上右圆角">
                        <SizeInput
                            bind:value={borderTopRightRadius}
                            bind:unit={borderTopRightRadiusUnit}
                            disabled={isRoot}
                            convert={(val) => val}
                            on:change={(e) => {
                                borderTopRightRadius = e.detail.value
                                borderTopRightRadiusUnit = e.detail.unit
                                updateIndividualBorder('TopRight', 'Radius', e.detail.value)
                            }}
                        />
                    </PropertyRow>

                    <PropertyRow label="下左圆角">
                        <SizeInput
                            bind:value={borderBottomLeftRadius}
                            bind:unit={borderBottomLeftRadiusUnit}
                            disabled={isRoot}
                            convert={(val) => val}
                            on:change={(e) => {
                                borderBottomLeftRadius = e.detail.value
                                borderBottomLeftRadiusUnit = e.detail.unit
                                updateIndividualBorder('BottomLeft', 'Radius', e.detail.value)
                            }}
                        />
                    </PropertyRow>

                    <PropertyRow label="下右圆角">
                        <SizeInput
                            bind:value={borderBottomRightRadius}
                            bind:unit={borderBottomRightRadiusUnit}
                            disabled={isRoot}
                            convert={(val) => val}
                            on:change={(e) => {
                                borderBottomRightRadius = e.detail.value
                                borderBottomRightRadiusUnit = e.detail.unit
                                updateIndividualBorder('BottomRight', 'Radius', e.detail.value)
                            }}
                        />
                    </PropertyRow>
                </div>
            </div>
        {/if}
    {:else}
        <p class="placeholder">请选择一个节点来编辑边框样式</p>
    {/if}
</div>

<style>
    .border-editor {
        padding: calc(20px * var(--scale-ratio, 1));
        color: #e2e8f0;
    }

    .border-section {
        margin-bottom: calc(32px * var(--scale-ratio, 1));
    }

    .border-section:last-child {
        margin-bottom: 0;
    }
    h3 {
        margin: 0 0 calc(16px * var(--scale-ratio, 1)) 0;
        font-size: calc(16px * var(--scale-ratio, 1));
        font-weight: 600;
        color: #cbd5e1;
    }

    .attr-list {
        display: flex;
        flex-direction: column;
        gap: calc(12px * var(--scale-ratio, 1));
    }

    /* 让 ColorPicker 在 BorderEditor 的 PropertyRow 内占满可用空间 */
    .border-section :global(.color-picker-container) {
        flex: 1;
    }

    .placeholder {
        color: #64748b;
        font-style: italic;
        text-align: center;
        margin-top: calc(40px * var(--scale-ratio, 1));
        font-size: calc(14px * var(--scale-ratio, 1));
    }
</style>
