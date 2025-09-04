<!--
 * 实时时钟小组件
 * 基于ResponsiveBox的实时时间显示组件，使用Svelte 5 Runes系统
 *
 * 功能特性：
 * - 实时更新时间显示（使用Svelte 5 SvelteDate响应式对象）
 * - 支持两种时间格式：
 *   1. "yyyy-MM-dd HH:mm:ss" (年月日时分秒)
 *   2. "yyyy-MM-dd 星期X HH:mm:ss" (年月日星期时分秒)
 * - 支持单行/多行显示模式，多行模式具有优雅的视觉层次
 * - 响应式设计，自动适配容器大小
 * - 完全通过style属性控制样式，无需额外类名
 * - 利用Svelte 5的细粒度响应式更新机制
 *
 * 使用方法：
 * <RealTimeClock format="datetime" /> // 显示年月日时分秒
 * <RealTimeClock format="datetime-weekday" /> // 显示年月日星期时分秒
 * <RealTimeClock displayMode="multi-line" /> // 多行显示，日期在上，时间在下
 * <RealTimeClock style="color: aqua; font-size: 16px;" /> // 自定义样式
 *
 * 样式优化：
 * - 单行模式：紧凑显示，适合小空间
 * - 多行模式：日期部分缩小+半透明，时间部分加粗突出，视觉层次清晰
 *
 * @param {string} [format="datetime"] - 时间格式类型，可选值："datetime" | "datetime-weekday"
 * @param {string} [displayMode="single-line"] - 显示模式，可选值："single-line" | "multi-line"
 * @param {string} [style=""] - 内联样式字符串
-->

<script lang="ts">
    import ResponsiveBox from '../core/ResponsiveBox.svelte'
    import { SvelteDate } from 'svelte/reactivity'

    interface Props {
        displayType?: 'datetime' | 'date' | 'time' | 'year' | 'month' | 'weekday' | 'day'
        style?: string
        'data-id'?: string
        [key: string]: any // 支持任意属性和事件处理器的传递
    }

    let { displayType = 'datetime', style = '', 'data-id': dataId = '', ...restProps }: Props = $props()

    // 使用 Svelte 5 的响应式日期对象
    let currentTime = new SvelteDate()

    // 星期映射
    const weekdays = ['日', '一', '二', '三', '四', '五', '六']

    // 格式化日期部分
    const formatDatePart = (date: Date): string => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
    }

    // 格式化时间部分
    const formatTimePart = (date: Date): string => {
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        const seconds = String(date.getSeconds()).padStart(2, '0')
        return `${hours}:${minutes}:${seconds}`
    }

    // 派生计算格式化后的时间
    let displayValue = $derived(() => {
        switch (displayType) {
            case 'date':
                return formatDatePart(currentTime)
            case 'time':
                return formatTimePart(currentTime)
            case 'weekday':
                return `星期${weekdays[currentTime.getDay()]}`
            case 'year':
                return String(currentTime.getFullYear())
            case 'month':
                return String(currentTime.getMonth() + 1).padStart(2, '0')
            case 'day':
                return String(currentTime.getDate()).padStart(2, '0')
            default:
                return `${formatDatePart(currentTime)} ${formatTimePart(currentTime)}`
        }
    })

    // 使用 SvelteDate 的响应式特性，定时更新
    $effect(() => {
        const intervalId = setInterval(() => {
            currentTime.setTime(Date.now())
        }, 1000)

        // 清理函数，组件卸载时清除定时器
        return () => {
            clearInterval(intervalId)
        }
    })
</script>

<ResponsiveBox {style} data-id={dataId} {...restProps}>
    <!-- 绝对定位全尺寸包裹，确保时间文本居中且不受 ResponsiveBox 内部 padding 影响 -->
    <div style="position:absolute;inset:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;text-align:center;pointer-events:none;">
        {displayValue()}
    </div>
</ResponsiveBox>
