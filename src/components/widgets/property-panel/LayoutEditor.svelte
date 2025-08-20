<!--
  LayoutEditor.svelte
  布局样式编辑面板
  提供布局相关属性的可视化编辑界面
-->
<script lang="ts">
    import { getNodeProps, updateNodeProps } from '../../../services/property-panel/property-panel.service'
    import { onMount } from 'svelte'

    interface Props {
        selectedId: string | null
    }

    let { selectedId }: Props = $props()

    // display属性状态
    let currentDisplay = $state('block')

    // flex属性状态
    let currentFlexDirection = $state('row')
    let currentJustifyContent = $state('flex-start')
    let currentAlignItems = $state('stretch')
    let currentAlignContent = $state('stretch')
    let currentFlexWrap = $state('nowrap')
    let currentGap = $state('')
    let currentRowGap = $state('')
    let currentColumnGap = $state('')

    // grid属性状态
    let currentGridTemplateColumns = $state('')
    let currentGridTemplateRows = $state('')
    let currentGridGap = $state('')
    let currentGridColumnGap = $state('')
    let currentGridRowGap = $state('')

    // 可用的display值
    const displayOptions = [
        { value: 'block', label: '块级 (block)' },
        { value: 'inline', label: '行内 (inline)' },
        { value: 'inline-block', label: '行内块级 (inline-block)' },
        { value: 'flex', label: '弹性 (flex)' },
        { value: 'grid', label: '网格 (grid)' }
    ]

    // 初始化display值
    // 安全获取字符串值的工具函数
    const getStringValue = (value: string | Blob | undefined): string => {
        return typeof value === 'string' ? value : ''
    }

    $effect(() => {
        if (selectedId) {
            const props = getNodeProps(selectedId)
            if (props) {
                currentDisplay = typeof props.styles?.display === 'string' ? props.styles.display : 'block'

                // 初始化flex属性
                currentFlexDirection = getStringValue(props.styles?.flexDirection) || 'row'
                currentJustifyContent = getStringValue(props.styles?.justifyContent) || 'flex-start'
                currentAlignItems = getStringValue(props.styles?.alignItems) || 'stretch'
                currentFlexWrap = getStringValue(props.styles?.flexWrap) || 'nowrap'

                // 初始化grid属性
                currentGridTemplateColumns = getStringValue(props.styles?.gridTemplateColumns)
                currentGridTemplateRows = getStringValue(props.styles?.gridTemplateRows)
                currentGridGap = getStringValue(props.styles?.gap || props.styles?.gridGap)
                currentGridColumnGap = getStringValue(props.styles?.columnGap || props.styles?.gridColumnGap)
                currentGridRowGap = getStringValue(props.styles?.rowGap || props.styles?.gridRowGap)
            }
        }
    })

    // 处理display属性变更
    function handleDisplayChange(newValue: string) {
        if (!selectedId) return

        updateNodeProps(selectedId, {
            styles: {
                display: newValue
            }
        })
    }

    // 处理flex属性变更
    function handleFlexPropChange(prop: string, value: string) {
        if (!selectedId) return

        updateNodeProps(selectedId, {
            styles: {
                [prop]: value
            }
        })
    }

    // 处理grid属性变更
    function handleGridPropChange(prop: string, value: string) {
        if (!selectedId) return

        updateNodeProps(selectedId, {
            styles: {
                [prop]: value
            }
        })
    }
</script>

<div class="layout-editor">
    {#if selectedId}
        <h3>布局样式</h3>
        <div class="layout-list">
            <!-- display属性 -->
            <div class="layout-item">
                <label for="node-display">显示类型</label>
                <div class="select-wrapper">
                    <select id="node-display" bind:value={currentDisplay} onchange={(e) => handleDisplayChange(e.currentTarget.value)}>
                        {#each displayOptions as option}
                            <option value={option.value}>{option.label}</option>
                        {/each}
                    </select>
                </div>
                <span class="unit-placeholder"></span>
            </div>

            <!-- Flex属性 -->
            {#if currentDisplay === 'flex'}
                <div class="layout-item">
                    <label for="node-flex-direction">排列方向</label>
                    <div class="select-wrapper">
                        <select id="node-flex-direction" bind:value={currentFlexDirection} onchange={(e) => handleFlexPropChange('flexDirection', e.currentTarget.value)}>
                            <option value="row">水平 (row)</option>
                            <option value="column">垂直 (column)</option>
                            <option value="row-reverse">水平反向 (row-reverse)</option>
                            <option value="column-reverse">垂直反向 (column-reverse)</option>
                        </select>
                    </div>
                    <span class="unit-placeholder"></span>
                </div>

                <div class="layout-item">
                    <label for="node-justify-content">主轴对齐</label>
                    <div class="select-wrapper">
                        <select id="node-justify-content" bind:value={currentJustifyContent} onchange={(e) => handleFlexPropChange('justifyContent', e.currentTarget.value)}>
                            <option value="flex-start">起始对齐</option>
                            <option value="flex-end">末尾对齐</option>
                            <option value="center">居中对齐</option>
                            <option value="space-between">两端对齐</option>
                            <option value="space-around">环绕对齐</option>
                            <option value="space-evenly">均匀对齐</option>
                        </select>
                    </div>
                    <span class="unit-placeholder"></span>
                </div>

                <div class="layout-item">
                    <label for="node-align-items">副轴对齐</label>
                    <div class="select-wrapper">
                        <select id="node-align-items" bind:value={currentAlignItems} onchange={(e) => handleFlexPropChange('alignItems', e.currentTarget.value)}>
                            <option value="stretch">拉伸对齐</option>
                            <option value="flex-start">起始对齐</option>
                            <option value="flex-end">末尾对齐</option>
                            <option value="center">居中对齐</option>
                            <option value="baseline">基线对齐</option>
                        </select>
                    </div>
                    <span class="unit-placeholder"></span>
                </div>

                <div class="layout-item">
                    <label for="node-flex-wrap">换行设置</label>
                    <div class="select-wrapper">
                        <select id="node-flex-wrap" bind:value={currentFlexWrap} onchange={(e) => handleFlexPropChange('flexWrap', e.currentTarget.value)}>
                            <option value="nowrap">不换行</option>
                            <option value="wrap">换行</option>
                            <option value="wrap-reverse">反向换行</option>
                        </select>
                    </div>
                    <span class="unit-placeholder"></span>
                </div>

                <div class="layout-item">
                    <label for="node-align-content">多轴对齐</label>
                    <div class="select-wrapper">
                        <select id="node-align-content" bind:value={currentAlignContent} onchange={(e) => handleFlexPropChange('alignContent', e.currentTarget.value)}>
                            <option value="stretch">拉伸对齐</option>
                            <option value="flex-start">起始对齐</option>
                            <option value="flex-end">末尾对齐</option>
                            <option value="center">居中对齐</option>
                            <option value="space-between">两端对齐</option>
                            <option value="space-around">环绕对齐</option>
                            <option value="space-evenly">均匀对齐</option>
                        </select>
                    </div>
                    <span class="unit-placeholder"></span>
                </div>

                <div class="layout-item">
                    <label for="node-flex-gap">间距设置</label>
                    <input
                        id="node-flex-gap"
                        type="number"
                        step="1"
                        bind:value={currentGap}
                        oninput={(e) => handleFlexPropChange('gap', e.currentTarget.value + 'px')}
                        onwheel={(e) => {
                            e.preventDefault()
                            const val = parseInt(currentGap) || 0
                            currentGap = val + (e.deltaY < 0 ? 1 : -1) + ''
                        }}
                        onkeydown={(e) => {
                            if (e.key === 'ArrowUp') {
                                e.preventDefault()
                                const val = parseInt(currentGap) || 0
                                currentGap = val + 1 + ''
                            }
                            if (e.key === 'ArrowDown') {
                                e.preventDefault()
                                const val = parseInt(currentGap) || 0
                                currentGap = val - 1 + ''
                            }
                        }}
                        placeholder="间距..."
                    />
                    <button class="unit-toggle" disabled>px</button>
                </div>

                <div class="layout-item">
                    <label for="node-flex-row-gap">行间距值</label>
                    <input
                        id="node-flex-row-gap"
                        type="number"
                        step="1"
                        bind:value={currentRowGap}
                        oninput={(e) => handleFlexPropChange('rowGap', e.currentTarget.value + 'px')}
                        onwheel={(e) => {
                            e.preventDefault()
                            const val = parseInt(currentRowGap) || 0
                            currentRowGap = val + (e.deltaY < 0 ? 1 : -1) + ''
                        }}
                        onkeydown={(e) => {
                            if (e.key === 'ArrowUp') {
                                e.preventDefault()
                                const val = parseInt(currentRowGap) || 0
                                currentRowGap = val + 1 + ''
                            }
                            if (e.key === 'ArrowDown') {
                                e.preventDefault()
                                const val = parseInt(currentRowGap) || 0
                                currentRowGap = val - 1 + ''
                            }
                        }}
                        placeholder="行间距..."
                    />
                    <button class="unit-toggle" disabled>px</button>
                </div>

                <div class="layout-item">
                    <label for="node-flex-column-gap">列间距值</label>
                    <input
                        id="node-flex-column-gap"
                        type="number"
                        step="1"
                        bind:value={currentColumnGap}
                        oninput={(e) => handleFlexPropChange('columnGap', e.currentTarget.value + 'px')}
                        onwheel={(e) => {
                            e.preventDefault()
                            const val = parseInt(currentColumnGap) || 0
                            currentColumnGap = val + (e.deltaY < 0 ? 1 : -1) + ''
                        }}
                        onkeydown={(e) => {
                            if (e.key === 'ArrowUp') {
                                e.preventDefault()
                                const val = parseInt(currentColumnGap) || 0
                                currentColumnGap = val + 1 + ''
                            }
                            if (e.key === 'ArrowDown') {
                                e.preventDefault()
                                const val = parseInt(currentColumnGap) || 0
                                currentColumnGap = val - 1 + ''
                            }
                        }}
                        placeholder="列间距..."
                    />
                    <button class="unit-toggle" disabled>px</button>
                </div>
            {/if}

            <!-- Grid属性 -->
            {#if currentDisplay === 'grid'}
                <div class="layout-item">
                    <label for="node-grid-columns">列模板项</label>
                    <input id="node-grid-columns" type="text" bind:value={currentGridTemplateColumns} oninput={(e) => handleGridPropChange('gridTemplateColumns', e.currentTarget.value)} placeholder="例: 1fr 2fr 1fr" />
                    <span class="unit-placeholder"></span>
                </div>

                <div class="layout-item">
                    <label for="node-grid-rows">行模板项</label>
                    <input id="node-grid-rows" type="text" bind:value={currentGridTemplateRows} oninput={(e) => handleGridPropChange('gridTemplateRows', e.currentTarget.value)} placeholder="例: auto 100px auto" />
                    <span class="unit-placeholder"></span>
                </div>

                <div class="layout-item">
                    <label for="node-grid-gap">间距设置</label>
                    <input
                        id="node-grid-gap"
                        type="number"
                        step="1"
                        bind:value={currentGridGap}
                        oninput={(e) => handleGridPropChange('gap', e.currentTarget.value + 'px')}
                        onwheel={(e) => {
                            e.preventDefault()
                            const val = parseInt(currentGridGap) || 0
                            currentGridGap = val + (e.deltaY < 0 ? 1 : -1) + ''
                        }}
                        onkeydown={(e) => {
                            if (e.key === 'ArrowUp') {
                                e.preventDefault()
                                const val = parseInt(currentGridGap) || 0
                                currentGridGap = val + 1 + ''
                            }
                            if (e.key === 'ArrowDown') {
                                e.preventDefault()
                                const val = parseInt(currentGridGap) || 0
                                currentGridGap = val - 1 + ''
                            }
                        }}
                        placeholder="间距..."
                    />
                    <button class="unit-toggle" disabled>px</button>
                </div>

                <div class="layout-item">
                    <label for="node-grid-column-gap">列间距值</label>
                    <input
                        id="node-grid-column-gap"
                        type="number"
                        step="1"
                        bind:value={currentGridColumnGap}
                        oninput={(e) => handleGridPropChange('columnGap', e.currentTarget.value + 'px')}
                        onwheel={(e) => {
                            e.preventDefault()
                            const val = parseInt(currentGridColumnGap) || 0
                            currentGridColumnGap = val + (e.deltaY < 0 ? 1 : -1) + ''
                        }}
                        onkeydown={(e) => {
                            if (e.key === 'ArrowUp') {
                                e.preventDefault()
                                const val = parseInt(currentGridColumnGap) || 0
                                currentGridColumnGap = val + 1 + ''
                            }
                            if (e.key === 'ArrowDown') {
                                e.preventDefault()
                                const val = parseInt(currentGridColumnGap) || 0
                                currentGridColumnGap = val - 1 + ''
                            }
                        }}
                        placeholder="列间距..."
                    />
                    <button class="unit-toggle" disabled>px</button>
                </div>

                <div class="layout-item">
                    <label for="node-grid-row-gap">行间距值</label>
                    <input
                        id="node-grid-row-gap"
                        type="number"
                        step="1"
                        bind:value={currentGridRowGap}
                        oninput={(e) => handleGridPropChange('rowGap', e.currentTarget.value + 'px')}
                        onwheel={(e) => {
                            e.preventDefault()
                            const val = parseInt(currentGridRowGap) || 0
                            currentGridRowGap = val + (e.deltaY < 0 ? 1 : -1) + ''
                        }}
                        onkeydown={(e) => {
                            if (e.key === 'ArrowUp') {
                                e.preventDefault()
                                const val = parseInt(currentGridRowGap) || 0
                                currentGridRowGap = val + 1 + ''
                            }
                            if (e.key === 'ArrowDown') {
                                e.preventDefault()
                                const val = parseInt(currentGridRowGap) || 0
                                currentGridRowGap = val - 1 + ''
                            }
                        }}
                        placeholder="行间距..."
                    />
                    <button class="unit-toggle" disabled>px</button>
                </div>
            {/if}
        </div>
    {:else}
        <p class="placeholder">请选择一个节点来编辑样式</p>
    {/if}
</div>

<style>
    .layout-editor {
        padding: calc(20px * var(--scale-ratio, 1));
        color: #e2e8f0;
    }
    h3 {
        margin: 0 0 calc(16px * var(--scale-ratio, 1)) 0;
        font-size: calc(16px * var(--scale-ratio, 1));
        font-weight: 600;
        color: #cbd5e1;
    }
    .layout-list {
        display: flex;
        flex-direction: column;
        gap: calc(12px * var(--scale-ratio, 1));
    }
    .layout-item {
        display: flex;
        align-items: center;
        gap: calc(10px * var(--scale-ratio, 1));
        border-radius: calc(8px * var(--scale-ratio, 1));
        transition: all 0.3s ease;
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

    select:focus,
    input:focus {
        outline: none;
        border-color: #cbd5e1;
        background: rgba(255, 255, 255, 0.15);
        box-shadow: 0 0 0 calc(3px * var(--scale-ratio, 1)) rgba(255, 255, 255, 0.1);
    }
    select option {
        background: #1e293b;
        color: #e2e8f0;
        padding: calc(8px * var(--scale-ratio, 1)) calc(12px * var(--scale-ratio, 1));
        border: none;
    }

    select option:hover,
    select option:focus,
    select option:checked {
        background: #334155;
    }

    .unit-placeholder {
        width: calc(40px * var(--scale-ratio, 1));
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

    /* 隐藏原生 number 输入框的上下箭头 */
    input[type='number']::-webkit-inner-spin-button,
    input[type='number']::-webkit-outer-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }
    input[type='number'] {
        -moz-appearance: textfield;
        appearance: textfield;
    }

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
        border-top: calc(4px * var(--scale-ratio, 1)) solid #94a3b8;
        pointer-events: none;
    }

    .select-wrapper select {
        width: 100%;
        padding-right: calc(30px * var(--scale-ratio, 1));
    }

    .placeholder {
        color: #64748b;
        font-size: calc(14px * var(--scale-ratio, 1));
        text-align: center;
        padding: calc(20px * var(--scale-ratio, 1));
    }
</style>
