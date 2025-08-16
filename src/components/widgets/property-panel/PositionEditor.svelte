<!-- PositionEditor.svelte
     节点定位属性编辑器
     提供节点定位相关属性的可视化编辑界面

     定位属性使用说明：
     1. static（静态定位）：默认值，此时 top/right/bottom/left 属性无效，可使用 margin 调整位置
     2. relative（相对定位）：相对于正常位置进行偏移，使用 top/right/bottom/left 属性
     3. absolute（绝对定位）：相对于最近的非static定位祖先元素，使用 top/right/bottom/left 属性
     4. fixed（固定定位）：相对于浏览器窗口，使用 top/right/bottom/left 属性
     5. sticky（粘性定位）：基于用户滚动位置，使用 top/right/bottom/left 属性

     变换属性使用说明：
     1. translateX/translateY：平移变换，支持 px 和 % 单位
     2. scaleX/scaleY：缩放变换，无单位
     3. rotate：旋转变换，无单位
     4. skewX/skewY：倾斜变换，无单位
     5. transform-origin：变换原点，支持 px 和 % 单位

     注意：
     - 当 relative/absolute/fixed/sticky 定位时，优先使用 top/right/bottom/left 属性而非 margin
     - 当 static 定位时，top/right/bottom/left 属性无效，应使用 margin 属性调整位置
     - transform 属性在所有定位类型下均可使用
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

    // transform相关属性
    let currentTranslateX: string = ''
    let currentTranslateY: string = ''
    let currentScaleX: string = ''
    let currentScaleY: string = ''
    let currentRotate: string = ''
    let currentSkewX: string = ''
    let currentSkewY: string = ''
    let currentTransformOriginX: string = ''
    let currentTransformOriginY: string = ''

    // 默认单位设置
    const defaultUnit: 'px' | '%' = '%'

    // 单位选择 - 位置属性
    let currentTopUnit: 'px' | '%' = defaultUnit
    let currentRightUnit: 'px' | '%' = defaultUnit
    let currentBottomUnit: 'px' | '%' = defaultUnit
    let currentLeftUnit: 'px' | '%' = defaultUnit

    // 单位选择 - 外边距属性
    let currentMarginTopUnit: 'px' | '%' = defaultUnit
    let currentMarginRightUnit: 'px' | '%' = defaultUnit
    let currentMarginBottomUnit: 'px' | '%' = defaultUnit
    let currentMarginLeftUnit: 'px' | '%' = defaultUnit

    // 单位选择 - transform属性
    let currentTranslateXUnit: 'px' | '%' = defaultUnit
    let currentTranslateYUnit: 'px' | '%' = defaultUnit
    let currentTransformOriginXUnit: 'px' | '%' = defaultUnit
    let currentTransformOriginYUnit: 'px' | '%' = defaultUnit

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

        // 解析transform相关属性
        ;[currentTranslateX, currentTranslateXUnit] = parseSize(styleSnapshot?.styles?.translateX)
        ;[currentTranslateY, currentTranslateYUnit] = parseSize(styleSnapshot?.styles?.translateY)
        currentScaleX = styleSnapshot?.styles?.scaleX || ''
        currentScaleY = styleSnapshot?.styles?.scaleY || ''
        currentRotate = styleSnapshot?.styles?.rotate || ''
        currentSkewX = styleSnapshot?.styles?.skewX || ''
        currentSkewY = styleSnapshot?.styles?.skewY || ''
        ;[currentTransformOriginX, currentTransformOriginXUnit] = parseSize(styleSnapshot?.styles?.transformOriginX)
        ;[currentTransformOriginY, currentTransformOriginYUnit] = parseSize(styleSnapshot?.styles?.transformOriginY)

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
        currentTopUnit = defaultUnit
        currentRightUnit = defaultUnit
        currentBottomUnit = defaultUnit
        currentLeftUnit = defaultUnit
        // 重置外边距属性
        currentMarginTop = ''
        currentMarginRight = ''
        currentMarginBottom = ''
        currentMarginLeft = ''
        currentMarginTopUnit = defaultUnit
        currentMarginRightUnit = defaultUnit
        currentMarginBottomUnit = defaultUnit
        currentMarginLeftUnit = defaultUnit
        // 重置transform相关属性
        currentTranslateX = ''
        currentTranslateY = ''
        currentScaleX = ''
        currentScaleY = ''
        currentRotate = ''
        currentSkewX = ''
        currentSkewY = ''
        currentTransformOriginX = ''
        currentTransformOriginY = ''
        currentTranslateXUnit = defaultUnit
        currentTranslateYUnit = defaultUnit
        currentTransformOriginXUnit = defaultUnit
        currentTransformOriginYUnit = defaultUnit
    }

    // 解析尺寸值和单位
    function parseSize(size: string | undefined): [string, 'px' | '%'] {
        if (!size) return ['', defaultUnit]

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

        // 默认使用全局设置的默认单位
        return [size, defaultUnit]
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
        } else {
            // 当从静态定位切换到非静态定位时，清空margin值
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

    // 处理transform属性变更
    function handleTranslateChange(axis: 'X' | 'Y', value: string, unit: 'px' | '%') {
        if (!selectedId || isRoot) return
        const propName = axis === 'X' ? 'translateX' : 'translateY'
        if (axis === 'X') {
            currentTranslateX = value
            currentTranslateXUnit = unit
        } else {
            currentTranslateY = value
            currentTranslateYUnit = unit
        }
        updateNodeProps(selectedId, { styles: { [propName]: formatSize(value, unit) } })
    }

    function handleScaleChange(axis: 'X' | 'Y', value: string) {
        if (!selectedId || isRoot) return
        const propName = axis === 'X' ? 'scaleX' : 'scaleY'
        if (axis === 'X') {
            currentScaleX = value
        } else {
            currentScaleY = value
        }
        updateNodeProps(selectedId, { styles: { [propName]: value } })
    }

    function handleRotateChange(value: string) {
        if (!selectedId || isRoot) return
        currentRotate = value
        updateNodeProps(selectedId, { styles: { rotate: value } })
    }

    function handleSkewChange(axis: 'X' | 'Y', value: string) {
        if (!selectedId || isRoot) return
        const propName = axis === 'X' ? 'skewX' : 'skewY'
        if (axis === 'X') {
            currentSkewX = value
        } else {
            currentSkewY = value
        }
        updateNodeProps(selectedId, { styles: { [propName]: value } })
    }

    function handleTransformOriginChange(axis: 'X' | 'Y', value: string, unit: 'px' | '%') {
        if (!selectedId || isRoot) return
        const propName = axis === 'X' ? 'transformOriginX' : 'transformOriginY'
        if (axis === 'X') {
            currentTransformOriginX = value
            currentTransformOriginXUnit = unit
        } else {
            currentTransformOriginY = value
            currentTransformOriginYUnit = unit
        }
        updateNodeProps(selectedId, { styles: { [propName]: formatSize(value, unit) } })
    }

    function toggleTransformUnit(axis: 'X' | 'Y', propType: 'translate' | 'transformOrigin') {
        if (!selectedId || isRoot) return
        let currentUnit: 'px' | '%'
        let currentValue: string
        
        if (propType === 'translate') {
            if (axis === 'X') {
                currentUnit = currentTranslateXUnit
                currentValue = currentTranslateX
                currentTranslateXUnit = currentUnit === 'px' ? '%' : 'px'
                handleTranslateChange('X', currentValue, currentTranslateXUnit)
            } else {
                currentUnit = currentTranslateYUnit
                currentValue = currentTranslateY
                currentTranslateYUnit = currentUnit === 'px' ? '%' : 'px'
                handleTranslateChange('Y', currentValue, currentTranslateYUnit)
            }
        } else {
            if (axis === 'X') {
                currentUnit = currentTransformOriginXUnit
                currentValue = currentTransformOriginX
                currentTransformOriginXUnit = currentUnit === 'px' ? '%' : 'px'
                handleTransformOriginChange('X', currentValue, currentTransformOriginXUnit)
            } else {
                currentUnit = currentTransformOriginYUnit
                currentValue = currentTransformOriginY
                currentTransformOriginYUnit = currentUnit === 'px' ? '%' : 'px'
                handleTransformOriginChange('Y', currentValue, currentTransformOriginYUnit)
            }
        }
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

            <!-- Transform相关属性 -->
            <h4>变换属性</h4>
            
            <!-- 平移 -->
            <div class="position-item">
                <label for="node-translate-x">水平平移</label>
                <input id="node-translate-x" type="number" step="1" bind:value={currentTranslateX} oninput={(e) => handleTranslateChange('X', e.currentTarget.value, currentTranslateXUnit)} placeholder="水平平移..." disabled={isRoot} class:disabled-input={isRoot} />
                <button class="unit-toggle" onclick={() => toggleTransformUnit('X', 'translate')} disabled={isRoot} class:disabled-input={isRoot}>
                    {currentTranslateXUnit}
                </button>
            </div>

            <div class="position-item">
                <label for="node-translate-y">垂直平移</label>
                <input id="node-translate-y" type="number" step="1" bind:value={currentTranslateY} oninput={(e) => handleTranslateChange('Y', e.currentTarget.value, currentTranslateYUnit)} placeholder="垂直平移..." disabled={isRoot} class:disabled-input={isRoot} />
                <button class="unit-toggle" onclick={() => toggleTransformUnit('Y', 'translate')} disabled={isRoot} class:disabled-input={isRoot}>
                    {currentTranslateYUnit}
                </button>
            </div>

            <!-- 缩放 -->
            <div class="position-item">
                <label for="node-scale-x">水平缩放</label>
                <input id="node-scale-x" type="number" step="0.1" bind:value={currentScaleX} oninput={(e) => handleScaleChange('X', e.currentTarget.value)} placeholder="水平缩放..." disabled={isRoot} class:disabled-input={isRoot} />
                <span class="unit-placeholder"></span>
            </div>

            <div class="position-item">
                <label for="node-scale-y">垂直缩放</label>
                <input id="node-scale-y" type="number" step="0.1" bind:value={currentScaleY} oninput={(e) => handleScaleChange('Y', e.currentTarget.value)} placeholder="垂直缩放..." disabled={isRoot} class:disabled-input={isRoot} />
                <span class="unit-placeholder"></span>
            </div>

            <!-- 旋转 -->
            <div class="position-item">
                <label for="node-rotate">旋转角度</label>
                <input id="node-rotate" type="number" step="1" bind:value={currentRotate} oninput={(e) => handleRotateChange(e.currentTarget.value)} placeholder="旋转角度..." disabled={isRoot} class:disabled-input={isRoot} />
                <span class="unit-placeholder"></span>
            </div>

            <!-- 倾斜 -->
            <div class="position-item">
                <label for="node-skew-x">水平倾斜</label>
                <input id="node-skew-x" type="number" step="1" bind:value={currentSkewX} oninput={(e) => handleSkewChange('X', e.currentTarget.value)} placeholder="水平倾斜..." disabled={isRoot} class:disabled-input={isRoot} />
                <span class="unit-placeholder"></span>
            </div>
            <div class="position-item">
                <label for="node-skew-y">垂直倾斜</label>
                <input id="node-skew-y" type="number" step="1" bind:value={currentSkewY} oninput={(e) => handleSkewChange('Y', e.currentTarget.value)} placeholder="垂直倾斜..." disabled={isRoot} class:disabled-input={isRoot} />
                <span class="unit-placeholder"></span>
            </div>

            <!-- 变换原点 -->
            <div class="position-item">
                <label for="node-transform-origin-x">原点横轴</label>
                <input id="node-transform-origin-x" type="number" step="1" bind:value={currentTransformOriginX} oninput={(e) => handleTransformOriginChange('X', e.currentTarget.value, currentTransformOriginXUnit)} placeholder="变换原点X..." disabled={isRoot} class:disabled-input={isRoot} />
                <button class="unit-toggle" onclick={() => toggleTransformUnit('X', 'transformOrigin')} disabled={isRoot} class:disabled-input={isRoot}>
                    {currentTransformOriginXUnit}
                </button>
            </div>

            <div class="position-item">
                <label for="node-transform-origin-y">原点竖轴</label>
                <input id="node-transform-origin-y" type="number" step="1" bind:value={currentTransformOriginY} oninput={(e) => handleTransformOriginChange('Y', e.currentTarget.value, currentTransformOriginYUnit)} placeholder="变换原点Y..." disabled={isRoot} class:disabled-input={isRoot} />
                <button class="unit-toggle" onclick={() => toggleTransformUnit('Y', 'transformOrigin')} disabled={isRoot} class:disabled-input={isRoot}>
                    {currentTransformOriginYUnit}
                </button>
            </div>
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
    h4 {
        margin: calc(24px * var(--scale-ratio, 1)) 0 calc(12px * var(--scale-ratio, 1)) 0;
        font-size: calc(14px * var(--scale-ratio, 1));
        font-weight: 600;
        color: #cbd5e1;
        border-top: calc(1px * var(--scale-ratio, 1)) solid rgba(255, 255, 255, 0.1);
        padding-top: calc(12px * var(--scale-ratio, 1));
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
