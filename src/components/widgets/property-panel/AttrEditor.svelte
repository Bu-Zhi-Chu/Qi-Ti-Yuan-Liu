<!-- AttrEditor.svelte
     节点属性编辑器
     提供节点属性的可视化编辑界面
-->
<script lang="ts">
    import { getNodeProps, updateNodeProps, getFullNode } from '../../../services/property-panel/property-panel.service'
    import { onMount } from 'svelte'
    import { getElementByNodeId } from '../../../services/utils/dom-geometry.util'
    import { getScaleRatio } from '../../../services/utils/get-scale-ratio.util'

    interface BlockItem {
        type: string
        nameZh: string
        path: string
    }
    let componentOptions: BlockItem[] = []

    onMount(async () => {
        const config = await import('../../blocks/blocks.config.json', { assert: { type: 'json' } })
        componentOptions = config.default as BlockItem[]
    })

    // 当前选中节点 id（来自外部）
    export let selectedId: string | null = null

    // 当前节点属性快照 & id 值
    let propsSnapshot: ReturnType<typeof getNodeProps> | null = null
    let currentId: string = ''
    let currentName: string = ''
    let currentType: string = ''
    let currentRemark: string = ''
    // 新增根节点判断
    let isRoot = false
    // 根节点判定
    $: isRoot = selectedId === 'root'

    // 宽度和高度相关变量
    let currentWidthValue: string = ''
    let currentWidthUnit: '%' | 'px' = '%'
    let currentHeightValue: string = ''
    let currentHeightUnit: '%' | 'px' = '%'

    // 鼠标穿透相关变量
    let currentPointerEvents: 'auto' | 'none' = 'auto'

    // box-sizing 相关变量
    let currentBoxSizing: 'content-box' | 'border-box' = 'border-box'

    // overflow 相关变量
    let currentOverflow: 'hidden' | 'auto' | 'scroll' | 'visible' = 'hidden'

    // 当选中节点变化时，同步所有属性
    $: if (selectedId) {
        // 获取节点属性和节点对象
        propsSnapshot = getNodeProps(selectedId)
        const node = getFullNode(selectedId)

        // 同步基本属性 - 只使用id
        currentId = selectedId

        // 同步名称 - 直接从节点属性中读取data-name
        currentName = node?.attributes?.['data-name'] ?? ''

        // 同步类型，如果为空则使用第一个组件类型作为默认值
        currentType = node?.componentType || componentOptions[0]?.type || ''

        // 同步备注
        currentRemark = propsSnapshot?.attributes?.['data-remark'] ?? ''

        // 同步宽高
        ;[currentWidthValue, currentWidthUnit] = parseSize(propsSnapshot?.styles?.width)
        ;[currentHeightValue, currentHeightUnit] = parseSize(propsSnapshot?.styles?.height)

        // 格式化百分比值，保留一位小数
        if (currentWidthUnit === '%') currentWidthValue = String(Math.round(parseFloat(currentWidthValue) * 10) / 10)
        if (currentHeightUnit === '%') currentHeightValue = String(Math.round(parseFloat(currentHeightValue) * 10) / 10)

        // 同步鼠标穿透属性
        currentPointerEvents = (propsSnapshot?.styles?.pointerEvents as 'auto' | 'none') || 'auto'
        // 同步 overflow 属性
        currentOverflow = (propsSnapshot?.styles?.overflow as 'hidden' | 'auto' | 'scroll' | 'visible') || 'hidden'
        // 同步 box-sizing 属性
        currentBoxSizing = (propsSnapshot?.styles?.boxSizing as 'content-box' | 'border-box') || 'border-box'

        // 若为根节点，固定名称为"画布"
        if (isRoot) {
            currentName = '画布'
        }
    } else {
        // 清空所有属性
        propsSnapshot = null
        currentId = ''
        currentName = ''
        currentType = ''
        currentRemark = ''
        currentWidthValue = ''
        currentWidthUnit = '%'
        currentHeightValue = ''
        currentHeightUnit = '%'
        currentPointerEvents = 'auto'
    }

    // 可用的组件类型列表
    // 删除原先硬编码
    // const componentTypes = ['SimpleBox', 'ResponsiveBox', 'RealTimeClock']

    function handleNameChange(newName: string) {
        if (!selectedId) return
        currentName = newName
        updateNodeProps(selectedId, {
            attributes: { 'data-name': newName }
        })
    }

    // 修改组件类型
    function handleTypeChange(newType: string) {
        if (!selectedId) return
        // 如果为空，使用第一个组件类型作为默认值
        const finalType = newType || componentOptions[0]?.type || ''
        currentType = finalType
        updateNodeProps(selectedId, {
            attributes: { type: finalType }
        })
    }

    // 新增：修改备注
    function handleRemarkChange(newRemark: string) {
        if (!selectedId) return
        currentRemark = newRemark
        updateNodeProps(selectedId, {
            attributes: { 'data-remark': newRemark }
        })
    }

    // 工具函数：解析如 "100px"、"50%" 等字符串，拆分为数值与单位
    function parseSize(size: string | undefined): [string, '%' | 'px'] {
        if (!size) return ['', '%']
        // 支持解析 calc(100px * var(--scale-ratio, 1)) 形式
        const calcMatch = size.match(/^calc\(\s*(\d+(?:\.\d+)?)\s*px\b.*\)$/i)
        if (calcMatch) {
            return [calcMatch[1], 'px']
        }
        const match = size.match(/^(\d+(?:\.\d+)?)\s*(px|%)?$/i)
        return match ? [match[1], (match[2] as any) || '%'] : [size, '%']
    }

    // 统一格式化尺寸，px 单位使用 calc 结合 --scale-ratio 实现自适应
    function formatSize(val: string, unit: '%' | 'px'): string {
        return unit === 'px' ? `calc(${val}px * var(--scale-ratio, 1))` : `${val}%`
    }

    // 宽度数值变更
    function handleWidthValueChange(val: string) {
        if (!selectedId || isRoot) return
        const rounded = currentWidthUnit === '%' ? String(Math.round(parseFloat(val) * 10) / 10) : val
        currentWidthValue = rounded
        updateNodeProps(selectedId, { styles: { width: formatSize(rounded, currentWidthUnit) } })
    }

    // 将宽度从一个单位转换到另一个单位
    function convertWidth(val: number, from: '%' | 'px', to: '%' | 'px'): number {
        if (from === to) return val
        const el = getElementByNodeId(selectedId!)
        const parent = el?.parentElement as HTMLElement | null
        if (!el || !parent) return val
        const parentWidth = parent.offsetWidth
        if (parentWidth === 0) return val
        const sr = getScaleRatio()
        if (from === 'px') {
            // 设计px → % (需乘全局缩放比)
            return ((val * sr) / parentWidth) * 100
        } else {
            // % → 设计px (需除全局缩放比)
            return ((val / 100) * parentWidth) / sr
        }
    }

    // 宽度单位切换（% ↔ px）
    function toggleWidthUnit() {
        if (!selectedId || isRoot) return
        const numericVal = parseFloat(currentWidthValue) || 0
        const nextUnit: '%' | 'px' = currentWidthUnit === '%' ? 'px' : '%'
        const converted = convertWidth(numericVal, currentWidthUnit, nextUnit)
        currentWidthValue = String(nextUnit === '%' ? Math.round(converted * 10) / 10 : Math.round(converted * 100) / 100)
        currentWidthUnit = nextUnit
        updateNodeProps(selectedId, { styles: { width: formatSize(currentWidthValue, currentWidthUnit) } })
    }

    // 高度数值变更
    function handleHeightValueChange(val: string) {
        if (!selectedId || isRoot) return
        const rounded = currentHeightUnit === '%' ? String(Math.round(parseFloat(val) * 10) / 10) : val
        currentHeightValue = rounded
        updateNodeProps(selectedId, { styles: { height: formatSize(rounded, currentHeightUnit) } })
    }

    // 将高度从一个单位转换到另一个单位
    function convertHeight(val: number, from: '%' | 'px', to: '%' | 'px'): number {
        if (from === to) return val
        const el = getElementByNodeId(selectedId!)
        const parent = el?.parentElement as HTMLElement | null
        if (!el || !parent) return val
        const parentHeight = parent.offsetHeight
        if (parentHeight === 0) return val
        const sr = getScaleRatio()
        if (from === 'px') {
            return ((val * sr) / parentHeight) * 100
        } else {
            return ((val / 100) * parentHeight) / sr
        }
    }

    // 高度单位切换（% ↔ px）
    function toggleHeightUnit() {
        if (!selectedId || isRoot) return
        const numericVal = parseFloat(currentHeightValue) || 0
        const nextUnit: '%' | 'px' = currentHeightUnit === '%' ? 'px' : '%'
        const converted = convertHeight(numericVal, currentHeightUnit, nextUnit)
        currentHeightValue = String(nextUnit === '%' ? Math.round(converted * 10) / 10 : Math.round(converted * 100) / 100)
        currentHeightUnit = nextUnit
        updateNodeProps(selectedId, { styles: { height: formatSize(currentHeightValue, currentHeightUnit) } })
    }

    // 处理鼠标穿透属性变更
    function handlePointerEventsChange(value: string) {
        if (!selectedId) return
        currentPointerEvents = value as 'auto' | 'none'
        updateNodeProps(selectedId, { styles: { pointerEvents: value } })
    }

    // 处理 overflow 属性变更
    function handleOverflowChange(value: string) {
        if (!selectedId) return
        currentOverflow = value as 'hidden' | 'auto' | 'scroll' | 'visible'
        updateNodeProps(selectedId, { styles: { overflow: value } })
    }

    // 处理 box-sizing 属性变更
    function handleBoxSizingChange(value: string) {
        if (!selectedId) return
        currentBoxSizing = value as 'content-box' | 'border-box'
        updateNodeProps(selectedId, { styles: { boxSizing: value } })
    }
</script>

<div class="attr-editor">
    {#if selectedId}
        <h3>主要属性</h3>
        <div class="attr-list">
            <div class="attr-item">
                <label for="node-id">节点编号</label>
                <input id="node-id" type="text" value={selectedId} readonly class="disabled-input" title="系统内部ID，不可编辑" />
                <span class="unit-placeholder"></span>
            </div>
            <div class="attr-item">
                <label for="node-name">节点名称</label>
                <input id="node-name" type="text" bind:value={currentName} oninput={(e) => handleNameChange(e.currentTarget.value)} placeholder="输入节点名称..." disabled={isRoot} class:disabled-input={isRoot} autocomplete="off" />
                <span class="unit-placeholder"></span>
            </div>
            <div class="attr-item">
                <label for="node-type">节点类型</label>
                {#if isRoot}
                    <input id="node-type-text" type="text" value="画布" disabled class="disabled-input" />
                {:else}
                    <select id="node-type" bind:value={currentType} onchange={(e) => handleTypeChange(e.currentTarget.value)}>
                        {#if !currentType}
                            <option value="">请选择组件类型...</option>
                        {/if}
                        {#each componentOptions as item}
                            <option value={item.type}>{item.nameZh}</option>
                        {/each}
                    </select>
                {/if}
                <span class="unit-placeholder"></span>
            </div>

            <!-- 宽度输入 -->
            <div class="attr-item">
                <label for="node-width">节点宽度</label>
                <input id="node-width" type="number" step={currentWidthUnit === '%' ? 0.1 : 1} bind:value={currentWidthValue} oninput={(e) => handleWidthValueChange(e.currentTarget.value)} placeholder="宽度值..." disabled={isRoot} class:disabled-input={isRoot} />
                <button class="unit-toggle" class:disabled-input={isRoot} onclick={toggleWidthUnit} disabled={isRoot}>
                    {currentWidthUnit}
                </button>
            </div>

            <!-- 高度输入 -->
            <div class="attr-item">
                <label for="node-height">节点高度</label>
                <input id="node-height" type="number" step={currentHeightUnit === '%' ? 0.1 : 1} bind:value={currentHeightValue} oninput={(e) => handleHeightValueChange(e.currentTarget.value)} placeholder="高度值..." disabled={isRoot} class:disabled-input={isRoot} />
                <button class="unit-toggle" class:disabled-input={isRoot} onclick={toggleHeightUnit} disabled={isRoot}>
                    {currentHeightUnit}
                </button>
            </div>

            <!-- box-sizing 下拉框 -->
            <div class="attr-item">
                <label for="node-box-sizing">盒子类型</label>
                <select id="node-box-sizing" bind:value={currentBoxSizing} onchange={(e) => handleBoxSizingChange(e.currentTarget.value)}>
                    <option value="border-box">边框盒模型 (border-box)</option>
                    <option value="content-box">内容盒模型 (content-box)</option>
                </select>
                <span class="unit-placeholder"></span>
            </div>

            <!-- overflow 下拉框 -->
            <div class="attr-item">
                <label for="node-overflow">溢出处理</label>
                <select id="node-overflow" bind:value={currentOverflow} onchange={(e) => handleOverflowChange(e.currentTarget.value)}>
                    <option value="hidden">隐藏 (hidden)</option>
                    <option value="auto">自动 (auto)</option>
                    <option value="scroll">滚动 (scroll)</option>
                    <option value="visible">显示 (visible)</option>
                </select>
                <span class="unit-placeholder"></span>
            </div>

            <!-- 鼠标穿透下拉框 -->
            <div class="attr-item">
                <label for="node-pointer-events">鼠标穿透</label>
                <select id="node-pointer-events" bind:value={currentPointerEvents} onchange={(e) => handlePointerEventsChange(e.currentTarget.value)}>
                    <option value="auto">阻挡 (auto)</option>
                    <option value="none">穿透 (none)</option>
                </select>
                <span class="unit-placeholder"></span>
            </div>

            <!-- 新增备注字段 -->
            <div class="attr-item">
                <label for="node-remark">节点备注</label>
                <textarea id="node-remark" rows="3" bind:value={currentRemark} oninput={(e) => handleRemarkChange(e.currentTarget.value)} placeholder="输入备注..." style="resize: vertical;"></textarea>
                <span class="unit-placeholder"></span>
            </div>
        </div>
    {:else}
        <p class="placeholder">请选择一个节点来编辑属性</p>
    {/if}
</div>

<style>
    .attr-editor {
        padding: calc(20px * var(--scale-ratio, 1));
        color: #e2e8f0;
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
    /* 禁用状态光标与视觉提示 */
    .unit-toggle:disabled,
    input:disabled {
        cursor: not-allowed;
        opacity: 0.5;
    }

    /* 根节点（画布）禁用输入框的特殊样式 */
    .disabled-input {
        color: #64748b !important; /* 使用更灰色的文本颜色 */
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
        font-style: italic;
        text-align: center;
        margin-top: calc(40px * var(--scale-ratio, 1));
        font-size: calc(14px * var(--scale-ratio, 1));
    }
    textarea {
        min-height: calc(80px * var(--scale-ratio, 1));
    }

    /* 隐藏原生 number 输入框的上下箭头 */
    input[type='number']::-webkit-inner-spin-button,
    input[type='number']::-webkit-outer-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }
    input[type='number'] {
        appearance: textfield; /* 标准属性 */
        -moz-appearance: textfield; /* Firefox */
    }
</style>
