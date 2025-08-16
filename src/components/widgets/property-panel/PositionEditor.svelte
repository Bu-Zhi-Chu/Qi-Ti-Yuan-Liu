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
    import { getNodeProps, updateNodeProps } from '../../../services/property-panel/property-panel.service'
    import { domTree } from '../../../services/repository/dom-tree.store.svelte'
    import { getElementByNodeId } from '../../../services/utils/dom-geometry.util'
    import { getScaleRatio } from '../../../services/utils/get-scale-ratio.util'

    // 外部传入当前选中节点 id
    export let selectedId: string | null = null

    // 当前节点样式快照
    let isRoot: boolean = false
    let styleSnapshot: ReturnType<typeof getNodeProps> | null = null

    // 本地可编辑字段 - 定位类型
    let currentPosition: 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky' = 'static'

    // 坐标位置属性
    let currentTop: string = ''
    let currentRight: string = ''
    let currentBottom: string = ''
    let currentLeft: string = ''
    let currentZIndex: string = ''

    // 外边距属性
    let currentMarginTop: string = ''
    let currentMarginRight: string = ''
    let currentMarginBottom: string = ''
    let currentMarginLeft: string = ''

    // 单位选择 - 位置属性
    let currentTopUnit: 'px' | '%' = 'px'
    let currentRightUnit: 'px' | '%' = 'px'
    let currentBottomUnit: 'px' | '%' = 'px'
    let currentLeftUnit: 'px' | '%' = 'px'

    // 单位选择 - 外边距属性
    let currentMarginTopUnit: 'px' | '%' = 'px'
    let currentMarginRightUnit: 'px' | '%' = 'px'
    let currentMarginBottomUnit: 'px' | '%' = 'px'
    let currentMarginLeftUnit: 'px' | '%' = 'px'

    // 显示控制
    let showPositionProps: boolean = false
    let showMarginProps: boolean = true

    // 根节点判定
    $: isRoot = selectedId === 'root'

    // 是否显示位置属性（非static定位才显示）
    $: showPositionProps = currentPosition !== 'static'

    // 是否显示外边距属性（在static定位时显示）
    $: showMarginProps = currentPosition === 'static'

    // 当选中节点变化时，同步样式
    $: if (selectedId) {
        styleSnapshot = getNodeProps(selectedId)
        currentPosition = (styleSnapshot?.styles?.position as any) || 'static'

        // 解析位置属性
        ;[currentTop, currentTopUnit] = parseSize(styleSnapshot?.styles?.top)
        ;[currentRight, currentRightUnit] = parseSize(styleSnapshot?.styles?.right)
        ;[currentBottom, currentBottomUnit] = parseSize(styleSnapshot?.styles?.bottom)
        ;[currentLeft, currentLeftUnit] = parseSize(styleSnapshot?.styles?.left)

        // 解析外边距属性
        ;[currentMarginTop, currentMarginTopUnit] = parseSize(styleSnapshot?.styles?.marginTop)
        ;[currentMarginRight, currentMarginRightUnit] = parseSize(styleSnapshot?.styles?.marginRight)
        ;[currentMarginBottom, currentMarginBottomUnit] = parseSize(styleSnapshot?.styles?.marginBottom)
        ;[currentMarginLeft, currentMarginLeftUnit] = parseSize(styleSnapshot?.styles?.marginLeft)

        // 解析z-index
        currentZIndex = styleSnapshot?.styles?.zIndex || ''
    } else {
        // 重置所有属性
        currentPosition = 'static'
        // 重置位置属性
        currentTop = ''
        currentRight = ''
        currentBottom = ''
        currentLeft = ''
        currentZIndex = ''
        currentTopUnit = 'px'
        currentRightUnit = 'px'
        currentBottomUnit = 'px'
        currentLeftUnit = 'px'
        // 重置外边距属性
        currentMarginTop = ''
        currentMarginRight = ''
        currentMarginBottom = ''
        currentMarginLeft = ''
        currentMarginTopUnit = 'px'
        currentMarginRightUnit = 'px'
        currentMarginBottomUnit = 'px'
        currentMarginLeftUnit = 'px'
    }

    // 解析尺寸值和单位
    function parseSize(size: string | undefined): [string, 'px' | '%'] {
        if (!size) return ['', 'px']

        // 支持解析 calc(100px * var(--scale-ratio, 1)) 形式
        const calcMatch = size?.match(/^calc\(\s*(\d+(?:\.\d+)?)\s*px\b.*\)$/i)
        if (calcMatch) {
            return [calcMatch[1], 'px']
        }

        // 处理百分比
        if (size.endsWith('%')) {
            return [size.replace('%', ''), '%']
        }

        // 处理像素
        if (size.endsWith('px')) {
            return [size.replace('px', ''), 'px']
        }

        // 默认当作像素处理
        return [size, 'px']
    }

    // 格式化尺寸，px 单位使用 calc 结合 --scale-ratio 实现自适应
    function formatSize(value: string, unit: 'px' | '%'): string {
        if (!value) return ''
        return unit === 'px' ? `calc(${value}px * var(--scale-ratio, 1))` : `${value}%`
    }

    // 处理定位类型变更
    function handlePositionChange(val: string) {
        if (!selectedId || isRoot) return

        const oldPosition = currentPosition
        currentPosition = val as any

        // 更新定位类型
        updateNodeProps(selectedId, { styles: { position: val } })

        // 如果从其他定位类型切换到静态定位，将位置属性转换为外边距属性
        if (val === 'static' && oldPosition !== 'static') {
            transferPositionToMargin()
        }
    }

    // 将位置属性转换为外边距属性（用于切换到静态定位时）
    function transferPositionToMargin() {
        if (!selectedId || isRoot) return

        const styles: Record<string, string> = {}
        let hasChanges = false

        // 只转换有值的属性
        if (currentTop) {
            styles.marginTop = formatSize(currentTop, currentTopUnit)
            currentMarginTop = currentTop
            currentMarginTopUnit = currentTopUnit
            hasChanges = true
        }

        if (currentRight) {
            styles.marginRight = formatSize(currentRight, currentRightUnit)
            currentMarginRight = currentRight
            currentMarginRightUnit = currentRightUnit
            hasChanges = true
        }

        if (currentBottom) {
            styles.marginBottom = formatSize(currentBottom, currentBottomUnit)
            currentMarginBottom = currentBottom
            currentMarginBottomUnit = currentBottomUnit
            hasChanges = true
        }

        if (currentLeft) {
            styles.marginLeft = formatSize(currentLeft, currentLeftUnit)
            currentMarginLeft = currentLeft
            currentMarginLeftUnit = currentLeftUnit
            hasChanges = true
        }

        // 如果有需要更新的样式，则更新节点属性
        if (hasChanges) {
            // 更新节点属性
            updateNodeProps(selectedId, { styles })

            // 强制触发UI更新 - 使用setTimeout确保在下一个事件循环中更新
            setTimeout(() => {
                // 克隆当前值以确保Svelte检测到变化
                currentMarginTop = String(currentMarginTop)
                currentMarginRight = String(currentMarginRight)
                currentMarginBottom = String(currentMarginBottom)
                currentMarginLeft = String(currentMarginLeft)

                console.log('已将位置属性转换为外边距属性:', {
                    marginTop: currentMarginTop + currentMarginTopUnit,
                    marginRight: currentMarginRight + currentMarginRightUnit,
                    marginBottom: currentMarginBottom + currentMarginBottomUnit,
                    marginLeft: currentMarginLeft + currentMarginLeftUnit
                })
            }, 0)
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

    // 切换单位 - 位置属性
    function toggleUnit(prop: 'top' | 'right' | 'bottom' | 'left') {
        if (!selectedId || isRoot) return

        let currentValue = ''
        let currentUnit: 'px' | '%' = 'px'
        let nextUnit: 'px' | '%' = 'px'

        // 获取当前值和单位
        switch (prop) {
            case 'top':
                currentValue = currentTop
                currentUnit = currentTopUnit
                nextUnit = currentUnit === 'px' ? '%' : 'px'
                break
            case 'right':
                currentValue = currentRight
                currentUnit = currentRightUnit
                nextUnit = currentUnit === 'px' ? '%' : 'px'
                break
            case 'bottom':
                currentValue = currentBottom
                currentUnit = currentBottomUnit
                nextUnit = currentUnit === 'px' ? '%' : 'px'
                break
            case 'left':
                currentValue = currentLeft
                currentUnit = currentLeftUnit
                nextUnit = currentUnit === 'px' ? '%' : 'px'
                break
        }

        // 如果有值，则进行单位转换
        if (currentValue) {
            const numericVal = parseFloat(currentValue) || 0
            const converted = convertPosition(numericVal, currentUnit, nextUnit, prop)
            const roundedValue = String(nextUnit === '%' ? Math.round(converted * 10) / 10 : Math.round(converted * 100) / 100)

            // 更新UI状态和节点属性
            switch (prop) {
                case 'top':
                    currentTop = roundedValue
                    currentTopUnit = nextUnit
                    break
                case 'right':
                    currentRight = roundedValue
                    currentRightUnit = nextUnit
                    break
                case 'bottom':
                    currentBottom = roundedValue
                    currentBottomUnit = nextUnit
                    break
                case 'left':
                    currentLeft = roundedValue
                    currentLeftUnit = nextUnit
                    break
            }

            handlePositionPropChange(prop, roundedValue, nextUnit)
        }
    }

    // 将外边距属性从一个单位转换到另一个单位
    function convertMargin(val: number, from: '%' | 'px', to: '%' | 'px', prop: 'marginTop' | 'marginRight' | 'marginBottom' | 'marginLeft'): number {
        if (from === to) return val
        // 使用 dom-geometry.util 中的 getElementByNodeId 函数获取元素
        const el = getElementByNodeId(selectedId!)
        const parent = el?.parentElement as HTMLElement | null
        if (!el || !parent) return val

        // 获取父元素的宽度或高度
        const parentSize = prop === 'marginLeft' || prop === 'marginRight' ? parent.offsetWidth : parent.offsetHeight
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

    // 切换单位 - 外边距属性
    function toggleMarginUnit(prop: 'marginTop' | 'marginRight' | 'marginBottom' | 'marginLeft') {
        if (!selectedId || isRoot) return

        let currentValue = ''
        let currentUnit: 'px' | '%' = 'px'
        let nextUnit: 'px' | '%' = 'px'

        // 获取当前值和单位
        switch (prop) {
            case 'marginTop':
                currentValue = currentMarginTop
                currentUnit = currentMarginTopUnit
                nextUnit = currentUnit === 'px' ? '%' : 'px'
                break
            case 'marginRight':
                currentValue = currentMarginRight
                currentUnit = currentMarginRightUnit
                nextUnit = currentUnit === 'px' ? '%' : 'px'
                break
            case 'marginBottom':
                currentValue = currentMarginBottom
                currentUnit = currentMarginBottomUnit
                nextUnit = currentUnit === 'px' ? '%' : 'px'
                break
            case 'marginLeft':
                currentValue = currentMarginLeft
                currentUnit = currentMarginLeftUnit
                nextUnit = currentUnit === 'px' ? '%' : 'px'
                break
        }

        // 如果有值，则进行单位转换
        if (currentValue) {
            const numericVal = parseFloat(currentValue) || 0
            const converted = convertMargin(numericVal, currentUnit, nextUnit, prop)
            const roundedValue = String(nextUnit === '%' ? Math.round(converted * 10) / 10 : Math.round(converted * 100) / 100)

            // 更新UI状态和节点属性
            switch (prop) {
                case 'marginTop':
                    currentMarginTop = roundedValue
                    currentMarginTopUnit = nextUnit
                    break
                case 'marginRight':
                    currentMarginRight = roundedValue
                    currentMarginRightUnit = nextUnit
                    break
                case 'marginBottom':
                    currentMarginBottom = roundedValue
                    currentMarginBottomUnit = nextUnit
                    break
                case 'marginLeft':
                    currentMarginLeft = roundedValue
                    currentMarginLeftUnit = nextUnit
                    break
            }

            handleMarginPropChange(prop, roundedValue, nextUnit)
        }
    }
</script>

<div class="position-editor">
    {#if selectedId}
        <h3>定位样式</h3>
        <div class="position-list">
            <!-- 定位类型 -->
            <div class="position-item">
                <label for="node-position">定位类型</label>
                {#if isRoot}
                    <input id="node-position-text" type="text" value="静态 (static) - 画布固定" disabled class="disabled-input" />
                {:else}
                    <select id="node-position" bind:value={currentPosition} onchange={(e) => handlePositionChange(e.currentTarget.value)}>
                        <option value="static">静态 (static)</option>
                        <option value="relative">相对 (relative)</option>
                        <option value="absolute">绝对 (absolute)</option>
                        <option value="fixed">固定 (fixed)</option>
                        <option value="sticky">粘性 (sticky)</option>
                    </select>
                {/if}
                <span class="unit-placeholder"></span>
            </div>

            <!-- 位置属性 - 仅在非static定位时显示 -->
            {#if showPositionProps && !isRoot}
                <!-- 上边距 -->
                <div class="position-item">
                    <label for="node-top">上边距值</label>
                    <input id="node-top" type="number" step="1" bind:value={currentTop} oninput={(e) => handlePositionPropChange('top', e.currentTarget.value, currentTopUnit)} placeholder="上边距..." disabled={isRoot} class:disabled-input={isRoot} />
                    <button class="unit-toggle" onclick={() => toggleUnit('top')} disabled={isRoot} class:disabled-input={isRoot}>
                        {currentTopUnit}
                    </button>
                </div>

                <!-- 右边距 -->
                <div class="position-item">
                    <label for="node-right">右边距值</label>
                    <input id="node-right" type="number" step="1" bind:value={currentRight} oninput={(e) => handlePositionPropChange('right', e.currentTarget.value, currentRightUnit)} placeholder="右边距..." disabled={isRoot} class:disabled-input={isRoot} />
                    <button class="unit-toggle" onclick={() => toggleUnit('right')} disabled={isRoot} class:disabled-input={isRoot}>
                        {currentRightUnit}
                    </button>
                </div>

                <!-- 下边距 -->
                <div class="position-item">
                    <label for="node-bottom">下边距值</label>
                    <input id="node-bottom" type="number" step="1" bind:value={currentBottom} oninput={(e) => handlePositionPropChange('bottom', e.currentTarget.value, currentBottomUnit)} placeholder="下边距..." disabled={isRoot} class:disabled-input={isRoot} />
                    <button class="unit-toggle" onclick={() => toggleUnit('bottom')} disabled={isRoot} class:disabled-input={isRoot}>
                        {currentBottomUnit}
                    </button>
                </div>

                <!-- 左边距 -->
                <div class="position-item">
                    <label for="node-left">左边距值</label>
                    <input id="node-left" type="number" step="1" bind:value={currentLeft} oninput={(e) => handlePositionPropChange('left', e.currentTarget.value, currentLeftUnit)} placeholder="左边距..." disabled={isRoot} class:disabled-input={isRoot} />
                    <button class="unit-toggle" onclick={() => toggleUnit('left')} disabled={isRoot} class:disabled-input={isRoot}>
                        {currentLeftUnit}
                    </button>
                </div>

                <!-- Z轴层级 -->
                <div class="position-item">
                    <label for="node-zindex">层级指数</label>
                    <input id="node-zindex" type="number" step="1" bind:value={currentZIndex} oninput={(e) => handleZIndexChange(e.currentTarget.value)} placeholder="z-index..." disabled={isRoot} class:disabled-input={isRoot} />
                    <span class="unit-placeholder"></span>
                </div>
            {/if}

            <!-- 外边距属性 - 在static定位时特别有用 -->
            {#if showMarginProps && !isRoot}
                <!-- 上外边距 -->
                <div class="position-item">
                    <label for="node-margin-top">上外边距</label>
                    <input id="node-margin-top" type="number" step="1" bind:value={currentMarginTop} oninput={(e) => handleMarginPropChange('marginTop', e.currentTarget.value, currentMarginTopUnit)} placeholder="上外边距..." disabled={isRoot} class:disabled-input={isRoot} />
                    <button class="unit-toggle" onclick={() => toggleMarginUnit('marginTop')} disabled={isRoot} class:disabled-input={isRoot}>
                        {currentMarginTopUnit}
                    </button>
                </div>

                <!-- 右外边距 -->
                <div class="position-item">
                    <label for="node-margin-right">右外边距</label>
                    <input id="node-margin-right" type="number" step="1" bind:value={currentMarginRight} oninput={(e) => handleMarginPropChange('marginRight', e.currentTarget.value, currentMarginRightUnit)} placeholder="右外边距..." disabled={isRoot} class:disabled-input={isRoot} />
                    <button class="unit-toggle" onclick={() => toggleMarginUnit('marginRight')} disabled={isRoot} class:disabled-input={isRoot}>
                        {currentMarginRightUnit}
                    </button>
                </div>

                <!-- 下外边距 -->
                <div class="position-item">
                    <label for="node-margin-bottom">下外边距</label>
                    <input id="node-margin-bottom" type="number" step="1" bind:value={currentMarginBottom} oninput={(e) => handleMarginPropChange('marginBottom', e.currentTarget.value, currentMarginBottomUnit)} placeholder="下外边距..." disabled={isRoot} class:disabled-input={isRoot} />
                    <button class="unit-toggle" onclick={() => toggleMarginUnit('marginBottom')} disabled={isRoot} class:disabled-input={isRoot}>
                        {currentMarginBottomUnit}
                    </button>
                </div>

                <!-- 左外边距 -->
                <div class="position-item">
                    <label for="node-margin-left">左外边距</label>
                    <input id="node-margin-left" type="number" step="1" bind:value={currentMarginLeft} oninput={(e) => handleMarginPropChange('marginLeft', e.currentTarget.value, currentMarginLeftUnit)} placeholder="左外边距..." disabled={isRoot} class:disabled-input={isRoot} />
                    <button class="unit-toggle" onclick={() => toggleMarginUnit('marginLeft')} disabled={isRoot} class:disabled-input={isRoot}>
                        {currentMarginLeftUnit}
                    </button>
                </div>
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
    .position-item {
        display: flex;
        align-items: center;
        gap: calc(10px * var(--scale-ratio, 1));
        border-radius: calc(8px * var(--scale-ratio, 1));
        transition: all 0.3s ease;
    }

    .unit-placeholder {
        width: calc(40px * var(--scale-ratio, 1));
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
    }

    /* 统一禁用态样式 */
    select:disabled,
    input:disabled,
    .unit-toggle:disabled {
        cursor: not-allowed;
        opacity: 0.5;
    }

    /* 根节点（画布）禁用输入框的特殊样式 */
    .disabled-input {
        color: #64748b !important; /* 使用更灰色的文本颜色 */
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
