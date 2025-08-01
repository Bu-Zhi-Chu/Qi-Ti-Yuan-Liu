<!--
 * 实时时钟小组件
 * 基于ResponsiveBox的实时时间显示组件，使用Svelte 5 Runes系统
 *
 * 功能特性：
 * - 实时更新时间显示（使用Svelte 5 SvelteDate响应式对象）
 * - 支持两种时间格式：
 *   1. "yyyy-MM-dd HH:mm:ss" (年月日时分秒)
 *   2. "yyyy-MM-dd 星期X HH:mm:ss" (年月日星期时分秒)
 * - 响应式设计，自动适配容器大小
 * - 完全通过style属性控制样式，无需额外类名
 * - 利用Svelte 5的细粒度响应式更新机制
 *
 * 使用方法：
 * <RealTimeClock format="datetime" /> // 显示年月日时分秒
 * <RealTimeClock format="datetime-weekday" /> // 显示年月日星期时分秒
 * <RealTimeClock style="color: aqua; font-size: 16px;" /> // 自定义样式
 *
 * @param {string} [format="datetime"] - 时间格式类型，可选值："datetime" | "datetime-weekday"
 * @param {string} [style=""] - 内联样式字符串
-->

<script lang="ts">
    import ResponsiveBox from '../foundation/ResponsiveBox.svelte'
    import { SvelteDate } from 'svelte/reactivity'

    interface Props {
        format?: 'datetime' | 'datetime-weekday'
        style?: string
    }

    let { format = 'datetime', style = '' }: Props = $props()

    // 使用 Svelte 5 的响应式日期对象
    let currentTime = new SvelteDate()

    // 星期映射
    const weekdays = ['日', '一', '二', '三', '四', '五', '六']

    // 格式化时间
    const formatTime = (date: Date, formatType: string): string => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        const seconds = String(date.getSeconds()).padStart(2, '0')

        if (formatType === 'datetime-weekday') {
            const weekday = weekdays[date.getDay()]
            return `${year}-${month}-${day} 星期${weekday} ${hours}:${minutes}:${seconds}`
        } else {
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
        }
    }

    // 派生计算格式化后的时间
    let formattedTime = $derived(formatTime(currentTime, format))

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

<ResponsiveBox {style}>
    {formattedTime}
</ResponsiveBox>

<style>
</style>
