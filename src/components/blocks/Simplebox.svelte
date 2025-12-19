<!--
 * 简化版响应式容器组件
 * 这是一个轻量级的容器组件，作为ResponsiveBox的简化版本
 * 主要特点： 推荐用%  尺寸 位置 边框等用到px单位的地方一定要用自适应公式来设置
 * 1. 默认宽高100%，行内级别显示 只接收百分比单位
 * 2. 无复杂的响应式逻辑，性能更好
 * 3. 适合组件封装时使用，避免多层嵌套
 * 4. 支持自定义样式和属性透传
 * 5. 支持data-id属性传递，用于低代码平台定位
 *
 * 使用方法：
 * <SimpleBox>内容</SimpleBox>
 * <SimpleBox style="background: red;">带样式内容</SimpleBox>
 * <SimpleBox class="custom-class">带类名内容</SimpleBox>
 * <SimpleBox data-id="simple-container">带数据标识的容器</SimpleBox>
-->

<script lang="ts">
    interface Props {
        style?: string
        animation?: '' | 'breath'
        breathDuration?: number
        breathMinOpacity?: number
        breathFactor?: number
        class?: string
        children?: import('svelte').Snippet
        'data-id'?: string // 外部指定的数据标识符，用于低代码平台定位
        [key: string]: any // 支持其他任意属性
    }

    function mergeStyle(base: string | undefined, extra: string): string | undefined {
        const baseStr = (base ?? '').trim()
        const extraStr = extra.trim()
        if (!extraStr) return base
        if (!baseStr) return extraStr
        return baseStr.endsWith(';') ? `${baseStr}${extraStr}` : `${baseStr};${extraStr}`
    }

    function mergeClass(base: string | undefined, extra: string): string | undefined {
        const baseStr = (base ?? '').trim()
        const extraStr = extra.trim()
        if (!extraStr) return base
        if (!baseStr) return extraStr
        return `${baseStr} ${extraStr}`
    }

    function fract(n: number): number {
        return n - Math.floor(n)
    }

    function pseudoRandom01(seed: number): number {
        return fract(Math.sin(seed * 12.9898) * 43758.5453)
    }

    let instanceSeed = $state(Math.random() * 10000)

    let { style, animation = '', breathDuration = 2, breathMinOpacity = 0.6, breathFactor, class: className, children, ...rest }: Props = $props()

    const breathDurationStyle = $derived(() => {
        if (animation !== 'breath') return ''
        const d = Number.isFinite(breathDuration) && breathDuration > 0 ? breathDuration : 2
        const o = Number.isFinite(breathMinOpacity) ? Math.min(1, Math.max(0, breathMinOpacity)) : 0.6
        const seed = Number.isFinite(breathFactor) ? (breathFactor as number) : instanceSeed
        const phase01 = pseudoRandom01(seed)
        const delay = -(phase01 * d)
        return `--simplebox-breath-duration: ${d}s; --simplebox-breath-min-opacity: ${o}; --simplebox-breath-delay: ${delay}s;`
    })

    const finalStyle = $derived(() => mergeStyle(style, breathDurationStyle()))
    const finalClass = $derived(() => mergeClass(className, animation === 'breath' ? 'simplebox-breath' : ''))
</script>

<div style={finalStyle()} class={finalClass()} {...rest}>
    {@render children?.()}
</div>

<style>
    .simplebox-breath {
        animation: simplebox-breath var(--simplebox-breath-duration, 2s) ease-in-out infinite;
        animation-delay: var(--simplebox-breath-delay, 0s);
        will-change: opacity;
    }

    @keyframes simplebox-breath {
        0%,
        100% {
            opacity: 1;
        }
        50% {
            opacity: var(--simplebox-breath-min-opacity, 0.6);
        }
    }
</style>
