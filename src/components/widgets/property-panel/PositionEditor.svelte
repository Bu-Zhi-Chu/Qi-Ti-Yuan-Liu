<!-- PositionEditor.svelte
     节点定位属性编辑器
     提供节点定位相关属性的可视化编辑界面

     定位属性使用说明：
     1. static（静态定位）：默认值，此时 top/right/bottom/left 属性无效，可使用 margin 调整位置
     2. relative（相对定位）：相对于正常位置进行偏移，使用 top/right/bottom/left 属性
     3. absolute（绝对定位）：相对于最近的非static定位祖先元素，使用 top/right/bottom/left 属性
     4. fixed（固定定位）：相对于浏览器窗口，使用 top/right/bottom/left 属性
     5. sticky（粘性定位）：基于用户滚动位置，使用 top/right/bottom/left 属性

     注意：
     - 当 relative/absolute/fixed/sticky 定位时，优先使用 top/right/bottom/left 属性而非 margin
     - 当 static 定位时，top/right/bottom/left 属性无效，应使用 margin 属性调整位置
-->
<script lang="ts">
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    import { getNodePropsStore, getNodeProps as _getNodeProps, updateNodeProps } from '../../../services/property-panel/property-panel.service'
    import { domTree } from '../../../stores/dom-tree.store.svelte'
    import { getElementByNodeId } from '../../../services/utils/dom-geometry.util'
    import { getScaleRatio } from '../../../services/utils/get-scale-ratio.util'
    import PropertyRow from './PropertyRow.svelte'
    import SizeInput from './SizeInput.svelte'
    import PropertySelect from './PropertySelect.svelte'

    // 外部传入当前选中节点 id
    let { selectedId = null } = $props<{ selectedId?: string | null }>()

    // 当前节点样式快照
    let isRoot = $state<boolean>(false)
    let styleSnapshot: ReturnType<typeof _getNodeProps> | null = null
    // 订阅函数
    let unsubscribe = () => {}

    // 本地可编辑字段 - 定位类型
    let currentPosition = $state<'static' | 'relative' | 'absolute' | 'fixed' | 'sticky'>('static')

    // 坐标位置属性
    let currentTop = $state<string>('')
    let currentRight = $state<string>('')
    let currentBottom = $state<string>('')
    let currentLeft = $state<string>('')
    let currentZIndex = $state<string>('')

    // 外边距属性
    let currentMarginTop = $state<string>('')
    let currentMarginRight = $state<string>('')
    let currentMarginBottom = $state<string>('')
    let currentMarginLeft = $state<string>('')

    // 默认单位设置
    const defaultUnit: 'px' | '%' = '%'

    // 定位类型选项
    const positionTypeOptions = [
        { value: 'static', label: '静态 (static)' },
        { value: 'relative', label: '相对 (relative)' },
        { value: 'absolute', label: '绝对 (absolute)' },
        { value: 'fixed', label: '固定 (fixed)' },
        { value: 'sticky', label: '粘性 (sticky)' }
    ]

    // 单位选择 - 位置属性
    let currentTopUnit = $state<'px' | '%'>(defaultUnit)
    let currentRightUnit = $state<'px' | '%'>(defaultUnit)
    let currentBottomUnit = $state<'px' | '%'>(defaultUnit)
    let currentLeftUnit = $state<'px' | '%'>(defaultUnit)

    // 单位选择 - 外边距属性
    let currentMarginTopUnit = $state<'px' | '%'>(defaultUnit)
    let currentMarginRightUnit = $state<'px' | '%'>(defaultUnit)
    let currentMarginBottomUnit = $state<'px' | '%'>(defaultUnit)
    let currentMarginLeftUnit = $state<'px' | '%'>(defaultUnit)

    // 显示控制
    let showPositionProps = $state<boolean>(false)
    let showMarginProps = $state<boolean>(true)

    // 根节点判定、显示控制逻辑
    $effect(() => {
        isRoot = selectedId === 'root'
        showPositionProps = currentPosition !== 'static'
        showMarginProps = currentPosition === 'static'
    })

    // 当选中节点或 domTreeVersion 变化时，同步样式
    $effect(() => {
        unsubscribe()
        if (selectedId) {
            const store = getNodePropsStore(selectedId)
            unsubscribe = store.subscribe((snapshot) => {
                styleSnapshot = snapshot
                currentPosition = (snapshot?.styles?.position as any) || 'static'
                ;[currentTop, currentTopUnit] = parseSize(snapshot?.styles?.top)
                ;[currentRight, currentRightUnit] = parseSize(snapshot?.styles?.right)
                ;[currentBottom, currentBottomUnit] = parseSize(snapshot?.styles?.bottom)
                ;[currentLeft, currentLeftUnit] = parseSize(snapshot?.styles?.left)
                ;[currentMarginTop, currentMarginTopUnit] = parseSize(snapshot?.styles?.marginTop)
                ;[currentMarginRight, currentMarginRightUnit] = parseSize(snapshot?.styles?.marginRight)
                ;[currentMarginBottom, currentMarginBottomUnit] = parseSize(snapshot?.styles?.marginBottom)
                ;[currentMarginLeft, currentMarginLeftUnit] = parseSize(snapshot?.styles?.marginLeft)
                const zIndexValue = snapshot?.styles?.zIndex
                currentZIndex = typeof zIndexValue === 'string' ? zIndexValue : ''
            })
        } else {
            currentPosition = 'static'
            currentTop = currentRight = currentBottom = currentLeft = ''
            currentTopUnit = currentRightUnit = currentBottomUnit = currentLeftUnit = defaultUnit
            currentMarginTop = currentMarginRight = currentMarginBottom = currentMarginLeft = ''
            currentMarginTopUnit = currentMarginRightUnit = currentMarginBottomUnit = currentMarginLeftUnit = defaultUnit
            currentZIndex = ''
        }
        return () => {
            unsubscribe()
            unsubscribe = () => {}
        }
    })

    // 解析尺寸值和单位
    function parseSize(size: string | Blob | undefined): [string, 'px' | '%'] {
        if (!size) return ['', defaultUnit]

        const sizeStr = typeof size === 'string' ? size : ''
        if (!sizeStr) return ['', defaultUnit]

        // 支持解析 calc(-100px * var(--scale-ratio, 1)) 形式，包括负值
        const calcMatch = sizeStr.match(/^calc\(\s*(-?\d+(?:\.\d+)?)\s*px\b.*\)$/i)
        if (calcMatch) {
            return [calcMatch[1], 'px']
        }

        // 处理百分比 - 四舍五入保留1位小数，支持负值
        if (sizeStr.endsWith('%')) {
            const value = parseFloat(sizeStr.replace('%', ''))
            return [isNaN(value) ? '' : Math.round(value * 10) / 10 + '', '%']
        }

        // 处理像素，支持负值
        if (sizeStr.endsWith('px')) {
            return [sizeStr.replace('px', ''), 'px']
        }

        // 默认使用全局设置的默认单位
        return [sizeStr, defaultUnit]
    }

    // 格式化尺寸，px 单位使用 calc 结合 --scale-ratio 实现自适应
    function formatSize(value: string, unit: 'px' | '%'): string {
        if (!value) return ''
        return unit === 'px' ? `calc(${value}px * var(--scale-ratio, 1))` : `${value}%`
    }

    // 智能转换函数：将绝对定位的位置值转换为静态定位的margin值，保持原有单位
    function smartConvertToMargin(value: string, unit: 'px' | '%', prop: 'top' | 'right' | 'bottom' | 'left', parentWidth: number, parentHeight: number): { value: string; unit: 'px' | '%' } {
        if (!value) return { value: '', unit: unit }

        const numericValue = parseFloat(value) || 0
        const sr = getScaleRatio()

        if (unit === 'px') {
            // 对于px单位，保持px单位，进行等值转换
            return { value: Math.round(numericValue * 100) / 100 + '', unit: 'px' }
        } else if (unit === '%') {
            // 对于百分比单位，保持百分比单位，根据属性类型调整
            if (prop === 'top' || prop === 'bottom') {
                // 垂直方向的百分比基于高度，转换为基于宽度的百分比
                if (parentWidth > 0 && parentHeight > 0) {
                    const heightBasedValue = (numericValue / 100) * parentHeight
                    const widthBasedPercentage = (heightBasedValue / parentWidth) * 100
                    return { value: Math.round(widthBasedPercentage * 10) / 10 + '', unit: '%' }
                }
            }
            // 水平方向保持不变
        }

        return { value, unit }
    }

    // 智能转换函数：将静态定位的 margin 值转换为绝对定位的位置值，保持原有单位
    function smartConvertToPosition(value: string, unit: 'px' | '%', prop: 'marginTop' | 'marginRight' | 'marginBottom' | 'marginLeft', parentWidth: number, parentHeight: number): { value: string; unit: 'px' | '%' } {
        if (!value) return { value: '', unit }

        const numericValue = parseFloat(value) || 0
        const sr = getScaleRatio()

        if (unit === 'px') {
            // px 单位保持不变
            return { value: Math.round(numericValue * 100) / 100 + '', unit: 'px' }
        } else if (unit === '%') {
            if (prop === 'marginTop' || prop === 'marginBottom') {
                // 垂直方向：margin 的百分比基于父宽度，需要转换为基于父高度的百分比
                if (parentWidth > 0 && parentHeight > 0) {
                    const widthBasedPx = (numericValue / 100) * parentWidth // 转为像素
                    const heightBasedPercent = (widthBasedPx / parentHeight) * 100
                    return { value: Math.round(heightBasedPercent * 10) / 10 + '', unit: '%' }
                }
            }
            // 水平方向保持不变
        }

        return { value, unit }
    }

    // 处理定位类型变更
    function handlePositionChange(val: string) {
        if (!selectedId || isRoot) return
        currentPosition = val as any
        updateNodeProps(selectedId, { styles: { position: val } })

        // 获取父元素尺寸用于智能转换
        const el = getElementByNodeId(selectedId!)
        const parent = el?.parentElement as HTMLElement | null
        const parentWidth = parent?.offsetWidth || 0
        const parentHeight = parent?.offsetHeight || 0

        if (val === 'static') {
            // 当切换到静态定位时，使用智能转换将位置属性值同步到外边距属性，保持原有单位
            if (currentTop) {
                const converted = smartConvertToMargin(currentTop, currentTopUnit, 'top', parentWidth, parentHeight)
                currentMarginTop = converted.value
                currentMarginTopUnit = currentTopUnit // 保持原有单位
                handleMarginPropChange('marginTop', converted.value, currentTopUnit)
            }

            if (currentRight) {
                const converted = smartConvertToMargin(currentRight, currentRightUnit, 'right', parentWidth, parentHeight)
                currentMarginRight = converted.value
                currentMarginRightUnit = currentRightUnit // 保持原有单位
                handleMarginPropChange('marginRight', converted.value, currentRightUnit)
            }

            if (currentBottom) {
                const converted = smartConvertToMargin(currentBottom, currentBottomUnit, 'bottom', parentWidth, parentHeight)
                currentMarginBottom = converted.value
                currentMarginBottomUnit = currentBottomUnit // 保持原有单位
                handleMarginPropChange('marginBottom', converted.value, currentBottomUnit)
            }

            if (currentLeft) {
                const converted = smartConvertToMargin(currentLeft, currentLeftUnit, 'left', parentWidth, parentHeight)
                currentMarginLeft = converted.value
                currentMarginLeftUnit = currentLeftUnit // 保持原有单位
                handleMarginPropChange('marginLeft', converted.value, currentLeftUnit)
            }

            // 清空定位属性，确保与外边距互斥
            currentTop = ''
            currentRight = ''
            currentBottom = ''
            currentLeft = ''
            updateNodeProps(selectedId, {
                styles: {
                    top: '',
                    right: '',
                    bottom: '',
                    left: ''
                }
            })
        } else {
            // 当从静态定位切换到非静态定位时，将外边距转换为定位属性，保持视觉位置一致
            if (currentMarginTop) {
                const converted = smartConvertToPosition(currentMarginTop, currentMarginTopUnit, 'marginTop', parentWidth, parentHeight)
                currentTop = converted.value
                currentTopUnit = converted.unit
                handlePositionPropChange('top', converted.value, converted.unit)
            }
            if (currentMarginRight) {
                const converted = smartConvertToPosition(currentMarginRight, currentMarginRightUnit, 'marginRight', parentWidth, parentHeight)
                currentRight = converted.value
                currentRightUnit = converted.unit
                handlePositionPropChange('right', converted.value, converted.unit)
            }
            if (currentMarginBottom) {
                const converted = smartConvertToPosition(currentMarginBottom, currentMarginBottomUnit, 'marginBottom', parentWidth, parentHeight)
                currentBottom = converted.value
                currentBottomUnit = converted.unit
                handlePositionPropChange('bottom', converted.value, converted.unit)
            }
            if (currentMarginLeft) {
                const converted = smartConvertToPosition(currentMarginLeft, currentMarginLeftUnit, 'marginLeft', parentWidth, parentHeight)
                currentLeft = converted.value
                currentLeftUnit = converted.unit
                handlePositionPropChange('left', converted.value, converted.unit)
            }

            // 清空margin值，确保与定位属性互斥
            currentMarginTop = ''
            currentMarginRight = ''
            currentMarginBottom = ''
            currentMarginLeft = ''

            updateNodeProps(selectedId, {
                styles: {
                    marginTop: '',
                    marginRight: '',
                    marginBottom: '',
                    marginLeft: ''
                }
            })
        }
    }

    // 处理位置属性变更 - 使用 top/right/bottom/left 属性实现定位（优先于 margin）
    // 注意：absolute/fixed/relative/sticky 定位时，应优先使用 top/right/bottom/left 属性
    function handlePositionPropChange(prop: 'top' | 'right' | 'bottom' | 'left', value: string, unit: 'px' | '%') {
        if (!selectedId || isRoot) return

        const formattedValue = value ? formatSize(value, unit) : ''
        updateNodeProps(selectedId, { styles: { [prop]: formattedValue } })
    }

    // 处理外边距属性变更
    // 注意：static 定位时，应使用 margin 属性调整位置，因为 top/right/bottom/left 属性无效
    function handleMarginPropChange(prop: 'marginTop' | 'marginRight' | 'marginBottom' | 'marginLeft', value: string, unit: 'px' | '%') {
        if (!selectedId || isRoot) return

        const formattedValue = value ? formatSize(value, unit) : ''
        updateNodeProps(selectedId, { styles: { [prop]: formattedValue } })
    }

    // 处理z-index变更
    function handleZIndexChange(value: string) {
        if (!selectedId || isRoot) return
        updateNodeProps(selectedId, { styles: { zIndex: value } })
    }

    // 将位置属性从一个单位转换到另一个单位
    function convertPosition(val: number, from: '%' | 'px', to: '%' | 'px', prop: 'top' | 'right' | 'bottom' | 'left'): number {
        if (from === to) return val
        // 使用 dom-geometry.util 中的 getElementByNodeId 函数获取元素
        const el = getElementByNodeId(selectedId!)
        const parent = el?.parentElement as HTMLElement | null
        if (!el || !parent) return val

        // 获取父元素的宽度或高度
        const parentSize = prop === 'left' || prop === 'right' ? parent.offsetWidth : parent.offsetHeight
        if (parentSize === 0) return val

        const sr = getScaleRatio()
        if (from === 'px') {
            // 设计px → % (需乘全局缩放比)
            return ((val * sr) / parentSize) * 100
        } else {
            // % → 设计px (需除全局缩放比)
            return ((val / 100) * parentSize) / sr
        }
    }

    // 将外边距属性从一个单位转换到另一个单位
    function convertMargin(val: number, from: '%' | 'px', to: '%' | 'px', prop: 'marginTop' | 'marginRight' | 'marginBottom' | 'marginLeft'): number {
        if (from === to) return val
        // 使用 dom-geometry.util 中的 getElementByNodeId 函数获取元素
        const el = getElementByNodeId(selectedId!)
        const parent = el?.parentElement as HTMLElement | null
        if (!el || !parent) return val

        // 在静态定位中，所有margin的百分比都基于父容器宽度
        const parentSize = parent.offsetWidth
        if (parentSize === 0) return val

        const sr = getScaleRatio()
        if (from === 'px') {
            // 设计px → % (需乘全局缩放比)
            return ((val * sr) / parentSize) * 100
        } else {
            // % → 设计px (需除全局缩放比)
            return ((val / 100) * parentSize) / sr
        }
    }
</script>

<div class="position-editor">
    {#if selectedId}
        <h3>定位样式</h3>
        <div class="position-list">
            <!-- 定位类型 -->
            <PropertyRow label="定位类型">
                {#if isRoot}
                    <input id="node-position-text" type="text" value="静态 (static) - 画布固定" disabled class="disabled-input" />
                {:else}
                    <PropertySelect id="node-position" bind:value={currentPosition} options={positionTypeOptions} disabled={isRoot} change={handlePositionChange} />
                {/if}
            </PropertyRow>

            <!-- 位置属性 - 仅在非static定位时显示 -->
            {#if showPositionProps && !isRoot}
                <!-- 上边距 -->
                <PropertyRow label="上边距值">
                    <SizeInput bind:value={currentTop} bind:unit={currentTopUnit} disabled={isRoot} convert={(val, from, to) => convertPosition(val, from, to, 'top')} placeholder="上边距..." on:change={({ detail: { value, unit } }) => handlePositionPropChange('top', value, unit)} />
                </PropertyRow>

                <!-- 右边距 -->
                <PropertyRow label="右边距值">
                    <SizeInput bind:value={currentRight} bind:unit={currentRightUnit} disabled={isRoot} convert={(val, from, to) => convertPosition(val, from, to, 'right')} placeholder="右边距..." on:change={({ detail: { value, unit } }) => handlePositionPropChange('right', value, unit)} />
                </PropertyRow>

                <!-- 下边距 -->
                <PropertyRow label="下边距值">
                    <SizeInput bind:value={currentBottom} bind:unit={currentBottomUnit} disabled={isRoot} convert={(val, from, to) => convertPosition(val, from, to, 'bottom')} placeholder="下边距..." on:change={({ detail: { value, unit } }) => handlePositionPropChange('bottom', value, unit)} />
                </PropertyRow>

                <!-- 左边距 -->
                <PropertyRow label="左边距值">
                    <SizeInput bind:value={currentLeft} bind:unit={currentLeftUnit} disabled={isRoot} convert={(val, from, to) => convertPosition(val, from, to, 'left')} placeholder="左边距..." on:change={({ detail: { value, unit } }) => handlePositionPropChange('left', value, unit)} />
                </PropertyRow>

                <!-- Z轴层级 -->
                <PropertyRow label="层级指数">
                    <input id="node-zindex" type="number" step="1" bind:value={currentZIndex} oninput={(e) => handleZIndexChange(e.currentTarget.value)} placeholder="z-index..." disabled={isRoot} class:disabled-input={isRoot} />
                </PropertyRow>
            {/if}

            <!-- 外边距属性 - 在static定位时特别有用 -->
            {#if showMarginProps && !isRoot}
                <!-- 上外边距 -->
                <PropertyRow label="上外边距">
                    <SizeInput
                        bind:value={currentMarginTop}
                        bind:unit={currentMarginTopUnit}
                        disabled={isRoot}
                        convert={(val, from, to) => convertMargin(val, from, to, 'marginTop')}
                        placeholder="上外边距..."
                        on:change={({ detail: { value, unit } }) => handleMarginPropChange('marginTop', value, unit)}
                    />
                </PropertyRow>

                <!-- 右外边距 -->
                <PropertyRow label="右外边距">
                    <SizeInput
                        bind:value={currentMarginRight}
                        bind:unit={currentMarginRightUnit}
                        disabled={isRoot}
                        convert={(val, from, to) => convertMargin(val, from, to, 'marginRight')}
                        placeholder="右外边距..."
                        on:change={({ detail: { value, unit } }) => handleMarginPropChange('marginRight', value, unit)}
                    />
                </PropertyRow>

                <!-- 下外边距 -->
                <PropertyRow label="下外边距">
                    <SizeInput
                        bind:value={currentMarginBottom}
                        bind:unit={currentMarginBottomUnit}
                        disabled={isRoot}
                        convert={(val, from, to) => convertMargin(val, from, to, 'marginBottom')}
                        placeholder="下外边距..."
                        on:change={({ detail: { value, unit } }) => handleMarginPropChange('marginBottom', value, unit)}
                    />
                </PropertyRow>

                <!-- 左外边距 -->
                <PropertyRow label="左外边距">
                    <SizeInput
                        bind:value={currentMarginLeft}
                        bind:unit={currentMarginLeftUnit}
                        disabled={isRoot}
                        convert={(val, from, to) => convertMargin(val, from, to, 'marginLeft')}
                        placeholder="左外边距..."
                        on:change={({ detail: { value, unit } }) => handleMarginPropChange('marginLeft', value, unit)}
                    />
                </PropertyRow>
            {/if}
        </div>
    {:else}
        <p class="placeholder">请选择一个节点来编辑样式</p>
    {/if}
</div>

<style>
    .position-editor {
        padding: calc(20px * var(--scale-ratio, 1));
        color: #e2e8f0;
    }
    h3 {
        margin: 0 0 calc(16px * var(--scale-ratio, 1)) 0;
        font-size: calc(16px * var(--scale-ratio, 1));
        font-weight: 600;
        color: #cbd5e1;
    }
    .position-list {
        display: flex;
        flex-direction: column;
        gap: calc(12px * var(--scale-ratio, 1));
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
        appearance: none;
    }

    input:focus {
        outline: none;
        border-color: #cbd5e1;
        background: rgba(255, 255, 255, 0.15);
        box-shadow: 0 0 0 calc(3px * var(--scale-ratio, 1)) rgba(255, 255, 255, 0.1);
    }

    /* 统一禁用态样式 */

    input:disabled {
        cursor: not-allowed;
        opacity: 0.5;
    }

    /* 禁用状态统一使用 #64748b 颜色 */
    .disabled-input {
        color: #64748b !important; /* 统一禁用状态文本颜色 */
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
</style>
