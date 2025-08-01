<!--
 * 响应式容器组件 - 自动将style属性中的px值转换为calc()表达式
 * 支持在style属性中直接写CSS字符串，自动将px值转换为calc(值 * var(--scale-ratio, 1))
 *
 * 使用方法：
 * <ResponsiveBox style="width: 100px; height: 100px; top: 100px; left: 100px;">
 *   内容放这里
 * </ResponsiveBox>
 *
 * 自适应核心公式：
 * <div style="width: calc(100px * var(--scale-ratio, 1)); height: calc(100px * var(--scale-ratio, 1)); ...">
-->

<script lang="ts">
    import { onMount } from 'svelte'

    interface Props {
        style?: string
        children?: import('svelte').Snippet
        [key: string]: any // 支持其他任意属性
    }

    let { style = '', children, ...rest }: Props = $props()

    const baseFontSize = $state(16)
    const scaleRatio = $derived(Math.min(window.innerWidth / 1920, 1.2))

    // 将style字符串中的px值转换为calc表达式
    const finalStyle = $derived.by(() => {
        if (!style.trim()) return ''

        // 替换所有数字+px为calc表达式，保留px单位
        return style.replace(/(\d+(?:\.\d+)?)px/g, (match, value) => {
            const numValue = parseFloat(value)
            return `calc(${numValue}px * var(--scale-ratio, ${scaleRatio}))`
        })
    })
</script>

<div style={finalStyle} {...rest}>
    {@render children?.()}
</div>
