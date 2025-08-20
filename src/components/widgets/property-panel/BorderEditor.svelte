<!--
  BorderEditor.svelte
  边框样式编辑面板
  提供边框相关属性的可视化编辑界面
  支持统一控制与四边独立控制两种模式
-->
<script lang="ts">
    import { getNodeProps, updateNodeProps } from '../../../services/property-panel/property-panel.service'
    import ColorPicker from '../ColorPicker.svelte'
    import { onMount } from 'svelte'

    interface Props {
        selectedId: string | null
    }

    let { selectedId }: Props = $props()

    // 统一控制开关
    let unifiedControl = $state(true)

    // 统一边框属性
    let borderWidth = $state('')
    let borderColor = $state('#000000')
    let borderStyle = $state('solid')
    let borderRadius = $state('')

    // 四边独立属性
    let borderTopWidth = $state('')
    let borderTopColor = $state('#000000')
    let borderTopStyle = $state('solid')
    let borderRightWidth = $state('')
    let borderRightColor = $state('#000000')
    let borderRightStyle = $state('solid')
    let borderBottomWidth = $state('')
    let borderBottomColor = $state('#000000')
    let borderBottomStyle = $state('solid')
    let borderLeftWidth = $state('')
    let borderLeftColor = $state('#000000')
    let borderLeftStyle = $state('solid')

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

    // 当选中节点变化时，同步所有边框属性
    $effect(() => {
        if (selectedId) {
            isRoot = selectedId === 'root'
            const props = getNodeProps(selectedId)

            // 读取统一边框属性
            borderWidth = parsePxValue(props?.styles?.borderWidth) || ''
            borderColor = props?.styles?.borderColor || '#000000'
            borderStyle = props?.styles?.borderStyle || 'solid'
            borderRadius = parsePxValue(props?.styles?.borderRadius) || ''

            // 读取四边独立属性
            borderTopWidth = parsePxValue(props?.styles?.borderTopWidth) || ''
            borderTopColor = props?.styles?.borderTopColor || '#000000'
            borderTopStyle = props?.styles?.borderTopStyle || 'solid'
            borderRightWidth = parsePxValue(props?.styles?.borderRightWidth) || ''
            borderRightColor = props?.styles?.borderRightColor || '#000000'
            borderRightStyle = props?.styles?.borderRightStyle || 'solid'
            borderBottomWidth = parsePxValue(props?.styles?.borderBottomWidth) || ''
            borderBottomColor = props?.styles?.borderBottomColor || '#000000'
            borderBottomStyle = props?.styles?.borderBottomStyle || 'solid'
            borderLeftWidth = parsePxValue(props?.styles?.borderLeftWidth) || ''
            borderLeftColor = props?.styles?.borderLeftColor || '#000000'
            borderLeftStyle = props?.styles?.borderLeftStyle || 'solid'

            // 判断是否使用统一控制
            unifiedControl = !(props?.styles?.borderTopWidth || props?.styles?.borderRightWidth || props?.styles?.borderBottomWidth || props?.styles?.borderLeftWidth)
        } else {
            // 清空所有属性
            resetAllProperties()
        }
    })

    // 解析 px 值
    function parsePxValue(value: string | undefined): string {
        if (!value) return ''
        const match = value.match(/calc\((\d+)px.*\)/)
        return match ? match[1] : value.replace('px', '')
    }

    // 格式化 px 值
    function formatPxValue(value: string): string {
        if (!value) return ''
        return `calc(${value}px * var(--scale-ratio, 1))`
    }

    // 重置所有属性
    function resetAllProperties() {
        unifiedControl = true
        borderWidth = ''
        borderColor = '#000000'
        borderStyle = 'solid'
        borderRadius = ''
        borderTopWidth = ''
        borderTopColor = '#000000'
        borderTopStyle = 'solid'
        borderRightWidth = ''
        borderRightColor = '#000000'
        borderRightStyle = 'solid'
        borderBottomWidth = ''
        borderBottomColor = '#000000'
        borderBottomStyle = 'solid'
        borderLeftWidth = ''
        borderLeftColor = '#000000'
        borderLeftStyle = 'solid'
    }

    // 更新统一边框样式
    function updateUnifiedBorder() {
        if (!selectedId || isRoot) return

        const styles: Record<string, string> = {}

        if (borderWidth) {
            styles.borderWidth = formatPxValue(borderWidth)
        }
        if (borderColor) {
            styles.borderColor = borderColor
        }
        if (borderStyle) {
            styles.borderStyle = borderStyle
        }
        if (borderRadius) {
            styles.borderRadius = formatPxValue(borderRadius)
        }

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
        styles[key] = prop === 'Width' || prop === 'Radius' ? formatPxValue(value) : value

        updateNodeProps(selectedId, { styles })
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
</script>

<div class="border-editor">
    <h3>边框样式</h3>

    {#if selectedId}
        <!-- 统一控制开关 -->
        <div class="border-section">
            <div class="attr-list">
                <div class="attr-item">
                    <label for="unified-control">统一控制</label>
                    <div class="switch-wrapper">
                        <label class="switch">
                            <input type="checkbox" bind:checked={unifiedControl} disabled={isRoot} />
                            <span class="slider"></span>
                        </label>
                    </div>
                    <span class="unit-placeholder"></span>
                </div>
            </div>
        </div>

        {#if unifiedControl}
            <!-- 统一边框样式 -->
            <div class="border-section">
                <div class="attr-list">
                    <div class="attr-item">
                        <label for="border-width">边框宽度</label>
                        <input
                            id="border-width"
                            type="number"
                            min="0"
                            bind:value={borderWidth}
                            oninput={(e) => {
                                borderWidth = e.currentTarget.value
                                updateUnifiedBorder()
                            }}
                            onkeydown={(e) =>
                                handleNumberKeydown(e, borderWidth, (v) => {
                                    borderWidth = v
                                    updateUnifiedBorder()
                                })}
                            placeholder="宽度值..."
                            disabled={isRoot}
                            class:disabled-input={isRoot}
                        />
                        <button class="unit-toggle" disabled>px</button>
                    </div>

                    <div class="attr-item">
                        <label for="border-color">边框颜色</label>
                        <div class="color-picker-wrapper">
                            <ColorPicker
                                value={borderColor}
                                onchange={(color: string) => {
                                    borderColor = color
                                    updateUnifiedBorder()
                                }}
                                disabled={isRoot}
                            />
                        </div>
                        <span class="unit-placeholder"></span>
                    </div>

                    <div class="attr-item">
                        <label for="border-style">边框样式</label>
                        <div class="select-wrapper">
                            <select id="border-style" bind:value={borderStyle} onchange={updateUnifiedBorder} disabled={isRoot}>
                                {#each borderStyleOptions as option}
                                    <option value={option.value}>{option.label}</option>
                                {/each}
                            </select>
                        </div>
                        <span class="unit-placeholder"></span>
                    </div>

                    <div class="attr-item">
                        <label for="border-radius">边框圆角</label>
                        <input
                            id="border-radius"
                            type="number"
                            min="0"
                            bind:value={borderRadius}
                            oninput={(e) => {
                                borderRadius = e.currentTarget.value
                                updateUnifiedBorder()
                            }}
                            onkeydown={(e) =>
                                handleNumberKeydown(e, borderRadius, (v) => {
                                    borderRadius = v
                                    updateUnifiedBorder()
                                })}
                            placeholder="圆角值..."
                            disabled={isRoot}
                            class:disabled-input={isRoot}
                        />
                        <button class="unit-toggle" disabled>px</button>
                    </div>
                </div>
            </div>
        {:else}
            <!-- 四边独立边框样式 -->
            <div class="border-section">
                <div class="attr-list">
                    <div class="attr-item">
                        <label for="border-top-width">上边宽度</label>
                        <input
                            id="border-top-width"
                            type="number"
                            min="0"
                            bind:value={borderTopWidth}
                            oninput={(e) => updateIndividualBorder('Top', 'Width', e.currentTarget.value)}
                            onkeydown={(e) =>
                                handleNumberKeydown(e, borderTopWidth, (v) => {
                                    borderTopWidth = v
                                    updateIndividualBorder('Top', 'Width', v)
                                })}
                            placeholder="宽度值..."
                            disabled={isRoot}
                            class:disabled-input={isRoot}
                        />
                        <button class="unit-toggle" disabled>px</button>
                    </div>

                    <div class="attr-item">
                        <label for="border-top-color">上边颜色</label>
                        <div class="color-picker-wrapper">
                            <ColorPicker value={borderTopColor} onchange={(color: string) => updateIndividualBorder('Top', 'Color', color)} disabled={isRoot} />
                        </div>
                        <span class="unit-placeholder"></span>
                    </div>

                    <div class="attr-item">
                        <label for="border-top-style">上边样式</label>
                        <div class="select-wrapper">
                            <select id="border-top-style" bind:value={borderTopStyle} onchange={() => updateIndividualBorder('Top', 'Style', borderTopStyle)} disabled={isRoot}>
                                {#each borderStyleOptions as option}
                                    <option value={option.value}>{option.label}</option>
                                {/each}
                            </select>
                        </div>
                        <span class="unit-placeholder"></span>
                    </div>
                </div>
            </div>

            <div class="border-section">
                <div class="attr-list">
                    <div class="attr-item">
                        <label for="border-right-width">右边宽度</label>
                        <input
                            id="border-right-width"
                            type="number"
                            min="0"
                            bind:value={borderRightWidth}
                            oninput={(e) => updateIndividualBorder('Right', 'Width', e.currentTarget.value)}
                            onkeydown={(e) =>
                                handleNumberKeydown(e, borderRightWidth, (v) => {
                                    borderRightWidth = v
                                    updateIndividualBorder('Right', 'Width', v)
                                })}
                            placeholder="宽度值..."
                            disabled={isRoot}
                            class:disabled-input={isRoot}
                        />
                        <button class="unit-toggle" disabled>px</button>
                    </div>

                    <div class="attr-item">
                        <label for="border-right-color">右边颜色</label>
                        <div class="color-picker-wrapper">
                            <ColorPicker value={borderRightColor} onchange={(color: string) => updateIndividualBorder('Right', 'Color', color)} disabled={isRoot} />
                        </div>
                        <span class="unit-placeholder"></span>
                    </div>

                    <div class="attr-item">
                        <label for="border-right-style">右边样式</label>
                        <div class="select-wrapper">
                            <select id="border-right-style" bind:value={borderRightStyle} onchange={() => updateIndividualBorder('Right', 'Style', borderRightStyle)} disabled={isRoot}>
                                {#each borderStyleOptions as option}
                                    <option value={option.value}>{option.label}</option>
                                {/each}
                            </select>
                        </div>
                        <span class="unit-placeholder"></span>
                    </div>
                </div>
            </div>

            <div class="border-section">
                <div class="attr-list">
                    <div class="attr-item">
                        <label for="border-bottom-width">下边宽度</label>
                        <input
                            id="border-bottom-width"
                            type="number"
                            min="0"
                            bind:value={borderBottomWidth}
                            oninput={(e) => updateIndividualBorder('Bottom', 'Width', e.currentTarget.value)}
                            onkeydown={(e) =>
                                handleNumberKeydown(e, borderBottomWidth, (v) => {
                                    borderBottomWidth = v
                                    updateIndividualBorder('Bottom', 'Width', v)
                                })}
                            placeholder="宽度值..."
                            disabled={isRoot}
                            class:disabled-input={isRoot}
                        />
                        <button class="unit-toggle" disabled>px</button>
                    </div>

                    <div class="attr-item">
                        <label for="border-bottom-color">下边颜色</label>
                        <div class="color-picker-wrapper">
                            <ColorPicker value={borderBottomColor} onchange={(color: string) => updateIndividualBorder('Bottom', 'Color', color)} disabled={isRoot} />
                        </div>
                        <span class="unit-placeholder"></span>
                    </div>

                    <div class="attr-item">
                        <label for="border-bottom-style">下边样式</label>
                        <div class="select-wrapper">
                            <select id="border-bottom-style" bind:value={borderBottomStyle} onchange={() => updateIndividualBorder('Bottom', 'Style', borderBottomStyle)} disabled={isRoot}>
                                {#each borderStyleOptions as option}
                                    <option value={option.value}>{option.label}</option>
                                {/each}
                            </select>
                        </div>
                        <span class="unit-placeholder"></span>
                    </div>
                </div>
            </div>

            <div class="border-section">
                <div class="attr-list">
                    <div class="attr-item">
                        <label for="border-left-width">左边宽度</label>
                        <input
                            id="border-left-width"
                            type="number"
                            min="0"
                            bind:value={borderLeftWidth}
                            oninput={(e) => updateIndividualBorder('Left', 'Width', e.currentTarget.value)}
                            onkeydown={(e) =>
                                handleNumberKeydown(e, borderLeftWidth, (v) => {
                                    borderLeftWidth = v
                                    updateIndividualBorder('Left', 'Width', v)
                                })}
                            placeholder="宽度值..."
                            disabled={isRoot}
                            class:disabled-input={isRoot}
                        />
                        <button class="unit-toggle" disabled>px</button>
                    </div>

                    <div class="attr-item">
                        <label for="border-left-color">左边颜色</label>
                        <div class="color-picker-wrapper">
                            <ColorPicker value={borderLeftColor} onchange={(color: string) => updateIndividualBorder('Left', 'Color', color)} disabled={isRoot} />
                        </div>
                        <span class="unit-placeholder"></span>
                    </div>

                    <div class="attr-item">
                        <label for="border-left-style">左边样式</label>
                        <div class="select-wrapper">
                            <select id="border-left-style" bind:value={borderLeftStyle} onchange={() => updateIndividualBorder('Left', 'Style', borderLeftStyle)} disabled={isRoot}>
                                {#each borderStyleOptions as option}
                                    <option value={option.value}>{option.label}</option>
                                {/each}
                            </select>
                        </div>
                        <span class="unit-placeholder"></span>
                    </div>
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
    h4 {
        margin: 0 0 calc(12px * var(--scale-ratio, 1)) 0;
        font-size: calc(14px * var(--scale-ratio, 1));
        font-weight: 500;
        color: #94a3b8;
    }
    .attr-list {
        display: flex;
        flex-direction: column;
        gap: calc(12px * var(--scale-ratio, 1));
    }

    .attr-item {
        display: flex;
        align-items: center;
        gap: calc(10px * var(--scale-ratio, 1));
    }
    label {
        min-width: calc(30px * var(--scale-ratio, 1));
        font-size: calc(13px * var(--scale-ratio, 1));
        font-weight: 500;
        color: #94a3b8;
    }
    input,
    select {
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
    input:focus,
    select:focus {
        outline: none;
        border-color: #cbd5e1;
        background: rgba(255, 255, 255, 0.15);
        box-shadow: 0 0 0 calc(3px * var(--scale-ratio, 1)) rgba(255, 255, 255, 0.1);
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
    .unit-toggle:disabled,
    input:disabled {
        cursor: not-allowed;
        opacity: 0.5;
    }
    .disabled-input {
        color: #64748b !important;
    }
    .unit-placeholder {
        width: calc(40px * var(--scale-ratio, 1));
    }
    .select-wrapper {
        position: relative;
        flex: 1;
    }
    .color-picker-wrapper {
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
        border-top: calc(4px * var(--scale-ratio, 1)) solid #94a3b8;
        pointer-events: none;
    }
    .select-wrapper select {
        width: 100%;
        padding-right: calc(30px * var(--scale-ratio, 1));
    }
    select option {
        background: #1e293b;
        color: #e2e8f0;
        padding: calc(8px * var(--scale-ratio, 1)) calc(12px * var(--scale-ratio, 1));
    }
    select option:hover,
    select option:focus,
    select option:checked {
        background-color: rgba(99, 102, 241, 0.2);
        color: #e2e8f0;
    }
    input::placeholder {
        color: #9ca3af;
    }
    .placeholder {
        color: #64748b;
        font-style: italic;
        text-align: center;
        margin-top: calc(40px * var(--scale-ratio, 1));
        font-size: calc(14px * var(--scale-ratio, 1));
    }

    /* 开关组件样式 */
    .switch-wrapper {
        flex: 1;
    }
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
        left: calc(3px * var(--scale-ratio, 1));
        bottom: calc(3px * var(--scale-ratio, 1));
        background-color: white;
        transition: 0.3s;
        border-radius: 50%;
    }
    input:checked + .slider {
        background-color: rgba(99, 102, 241, 0.8);
    }
    input:checked + .slider:before {
        transform: translateX(calc(20px * var(--scale-ratio, 1)));
    }
    input:disabled + .slider {
        opacity: 0.5;
        cursor: not-allowed;
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
