<!--
 * 响应式容器组件
 * 自动处理缩放计算的容器组件，用户只需提供原始尺寸值
 *
 * 使用方法：
 * <ResponsiveBox width={100} height={100} fontSize={16} top={100} left={100}>
 *   内容放这里
 * </ResponsiveBox>
 *
 * 高级用法：
 * <ResponsiveBox
 *   width={200}
 *   height={150}
 *   padding={20}
 *   marginTop={10}
 *   borderRadius={8}
 *   borderWidth={1}
 *   borderColor="#ccc"
 *   backgroundColor="#f5f5f5"
 * >
 *   完整盒模型示例
 * </ResponsiveBox>
 *
 * 支持单位：
 * - 默认单位：px
 * - 支持百分比：width="50%"
 * - 支持任意CSS单位：width="10rem"
 *
 * ## 支持属性
 * - 基础尺寸: width, height, minWidth, minHeight, maxWidth, maxHeight
 * - 定位: top, left, right, bottom
 * - 盒模型: paddingTop/Right/Bottom/Left, marginTop/Right/Bottom/Left
 * - 边框: borderRadius, borderWidth, borderTop/Right/Bottom/LeftWidth
 * - 文字: fontSize, lineHeight
 * - 布局: flexBasis, gap
 *
 * 特性：
 * - 自动监听缩放比例变化
 * - 内存安全的事件清理
 * - 支持所有标准CSS属性
 * - 完整的盒模型支持
 * - Flexbox布局支持
-->

<script lang="ts">
    import { onMount } from 'svelte'

    interface Props {
        // 基础尺寸
        width?: string | number
        height?: string | number
        minWidth?: string | number
        minHeight?: string | number
        maxWidth?: string | number
        maxHeight?: string | number

        // 定位
        top?: string | number
        left?: string | number
        right?: string | number
        bottom?: string | number

        // 盒模型 - 只保留四个方向的单一属性
        paddingTop?: string | number
        paddingRight?: string | number
        paddingBottom?: string | number
        paddingLeft?: string | number
        marginTop?: string | number
        marginRight?: string | number
        marginBottom?: string | number
        marginLeft?: string | number

        // 边框 - 只保留宽度相关的
        borderRadius?: string | number
        borderWidth?: string | number
        borderTopWidth?: string | number
        borderRightWidth?: string | number
        borderBottomWidth?: string | number
        borderLeftWidth?: string | number

        // 文字
        fontSize?: string | number
        lineHeight?: string | number

        // 布局 - 只保留能接收px的
        flexBasis?: string | number
        gap?: string | number

        class?: string
        children?: import('svelte').Snippet
        [key: string]: any
    }

    let {
        // 基础尺寸
        width,
        height,
        minWidth,
        minHeight,
        maxWidth,
        maxHeight,

        // 定位
        top,
        left,
        right,
        bottom,

        // 盒模型
        paddingTop,
        paddingRight,
        paddingBottom,
        paddingLeft,
        marginTop,
        marginRight,
        marginBottom,
        marginLeft,

        // 边框 - 只保留宽度相关的
        borderRadius,
        borderWidth,
        borderTopWidth,
        borderRightWidth,
        borderBottomWidth,
        borderLeftWidth,

        // 文字
        fontSize,
        lineHeight,

        // 布局 - 只保留能接收px的
        flexBasis,
        gap,

        class: className = '',
        children,
        ...restProps
    }: Props = $props()

    let scaleRatio = $state(1)

    // 将数值转换为带单位的字符串
    function formatValue(value: string | number | undefined, unit = 'px'): string {
        if (value === undefined || value === null) return ''
        if (typeof value === 'string') {
            // 如果已经是字符串（包含单位或百分比），直接返回
            return value
        }
        // 如果是数值，添加单位并乘以缩放比例
        return `${Number(value) * scaleRatio}${unit}`
    }

    // 响应式样式计算 - 直接返回CSS字符串
    let responsiveStyles = $derived.by(() => {
        const styles: Record<string, string> = {
            // 基础尺寸
            width: formatValue(width),
            height: formatValue(height),
            minWidth: formatValue(minWidth),
            minHeight: formatValue(minHeight),
            maxWidth: formatValue(maxWidth),
            maxHeight: formatValue(maxHeight),

            // 定位
            top: formatValue(top),
            left: formatValue(left),
            right: formatValue(right),
            bottom: formatValue(bottom),

            // 盒模型 - 只保留四个方向的单一属性
            paddingTop: formatValue(paddingTop),
            paddingRight: formatValue(paddingRight),
            paddingBottom: formatValue(paddingBottom),
            paddingLeft: formatValue(paddingLeft),
            marginTop: formatValue(marginTop),
            marginRight: formatValue(marginRight),
            marginBottom: formatValue(marginBottom),
            marginLeft: formatValue(marginLeft),

            // 边框 - 只保留宽度相关的
            borderRadius: formatValue(borderRadius),
            borderWidth: formatValue(borderWidth),
            borderTopWidth: formatValue(borderTopWidth),
            borderRightWidth: formatValue(borderRightWidth),
            borderBottomWidth: formatValue(borderBottomWidth),
            borderLeftWidth: formatValue(borderLeftWidth),

            // 文字
            fontSize: formatValue(fontSize),
            lineHeight: formatValue(lineHeight),

            // 布局 - 只保留能接收px的
            flexBasis: formatValue(flexBasis),
            gap: formatValue(gap),

            ...restProps
        }

        // 过滤掉空值并转换为CSS字符串
        return Object.entries(styles)
            .filter(([_, value]) => value !== '' && value !== undefined)
            .map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`)
            .join('; ')
    })

    onMount(() => {
        const updateScale = () => {
            scaleRatio = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--scale-ratio')) || 1
        }

        updateScale()
        window.addEventListener('resize', updateScale)

        return () => {
            window.removeEventListener('resize', updateScale)
        }
    })
</script>

<div class="responsive-box {className}" style={responsiveStyles}>
    {@render children?.()}
</div>

<style>
    .responsive-box {
        box-sizing: border-box;
    }
</style>
