<!-- StyleEditor.svelte
     节点样式编辑器
     提供宽高等样式属性的可视化编辑界面
-->
<script lang="ts">
    import { getNodeProps, updateNodeProps } from '../../../services/property-panel/property-panel.service'
    import { getElementByNodeId } from '../../../services/utils/dom-geometry.util'
    import { getScaleRatio } from '../../../services/utils/get-scale-ratio.util'

    // 外部传入当前选中节点 id
    export let selectedId: string | null = null

    // 当前节点样式快照
    let isRoot: boolean = false
    let styleSnapshot: ReturnType<typeof getNodeProps> | null = null

    // 本地可编辑字段：数值和单位分离，用户仅输入数字
    let currentWidthValue: string = ''
    let currentWidthUnit: '%' | 'px' = '%'
    let currentHeightValue: string = ''
    let currentHeightUnit: '%' | 'px' = '%'

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

    // 根节点判定
    $: isRoot = selectedId === 'root'

    // 当选中节点变化时，同步宽高
    $: if (selectedId) {
        styleSnapshot = getNodeProps(selectedId)
        ;[currentWidthValue, currentWidthUnit] = parseSize(styleSnapshot?.styles?.width)
        ;[currentHeightValue, currentHeightUnit] = parseSize(styleSnapshot?.styles?.height)
        if (currentWidthUnit === '%') currentWidthValue = String(Math.round(parseFloat(currentWidthValue) * 10) / 10)
        if (currentHeightUnit === '%') currentHeightValue = String(Math.round(parseFloat(currentHeightValue) * 10) / 10)
    } else {
        currentWidthValue = ''
        currentWidthUnit = 'px'
        currentHeightValue = ''
        currentHeightUnit = 'px'
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
</script>

<div class="style-editor">
    {#if selectedId}
        <h3>节点样式</h3>
        <div class="style-list">
            <div class="style-item">
                <label for="node-width">宽度:</label>
                <input id="node-width" type="number" step={currentWidthUnit === '%' ? 0.1 : 1} bind:value={currentWidthValue} disabled={isRoot} oninput={(e) => handleWidthValueChange(e.currentTarget.value)} placeholder="数字" />
                <button type="button" class="unit-toggle" onclick={toggleWidthUnit} aria-label="切换宽度单位" disabled={isRoot}>{currentWidthUnit}</button>
            </div>
            <div class="style-item">
                <label for="node-height">高度:</label>
                <input id="node-height" type="number" step={currentHeightUnit === '%' ? 0.1 : 1} bind:value={currentHeightValue} disabled={isRoot} oninput={(e) => handleHeightValueChange(e.currentTarget.value)} placeholder="数字" />
                <button type="button" class="unit-toggle" onclick={toggleHeightUnit} aria-label="切换高度单位" disabled={isRoot}>{currentHeightUnit}</button>
            </div>
        </div>
    {:else}
        <p class="placeholder">请选择一个节点来编辑样式</p>
    {/if}
</div>

<style>
    .style-editor {
        padding: calc(20px * var(--scale-ratio, 1));
        color: #e2e8f0;
    }
    h3 {
        margin: 0 0 calc(16px * var(--scale-ratio, 1)) 0;
        font-size: calc(16px * var(--scale-ratio, 1));
        font-weight: 600;
        color: #cbd5e1;
    }
    .style-list {
        display: flex;
        flex-direction: column;
        gap: calc(12px * var(--scale-ratio, 1));
    }
    .style-item {
        display: grid;
        grid-template-columns: calc(40px * var(--scale-ratio, 1)) 1fr calc(40px * var(--scale-ratio, 1));
        align-items: center;
        gap: calc(8px * var(--scale-ratio, 1));
        padding: calc(12px * var(--scale-ratio, 1));
        background: rgba(255, 255, 255, 0.05);
        border-radius: calc(8px * var(--scale-ratio, 1));
        transition: all 0.3s ease;
    }
    .style-item:hover {
        background: rgba(255, 255, 255, 0.08);
        transform: translateY(-1px);
    }
    .unit-toggle {
        width: 100%;
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

    label {
        min-width: calc(80px * var(--scale-ratio, 1));
        font-size: calc(13px * var(--scale-ratio, 1));
        font-weight: 500;
        color: #94a3b8;
    }
    input {
        flex: 1;
        padding: calc(8px * var(--scale-ratio, 1)) calc(12px * var(--scale-ratio, 1));
        border: calc(1px * var(--scale-ratio, 1)) solid rgba(255, 255, 255, 0.2);
        border-radius: calc(6px * var(--scale-ratio, 1));
        font-size: calc(13px * var(--scale-ratio, 1));
        background: rgba(255, 255, 255, 0.1);
        color: #e2e8f0;
        transition: all 0.3s ease;
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
    input:focus {
        outline: none;
        border-color: #cbd5e1;
        background: rgba(255, 255, 255, 0.15);
        box-shadow: 0 0 0 calc(3px * var(--scale-ratio, 1)) rgba(255, 255, 255, 0.1);
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
</style>
