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
        animation?: '' | 'breath' | 'float'
        breathDuration?: number
        breathMinOpacity?: number
        breathFactor?: number
        floatHeight?: number
        floatDuration?: number
        floatFactor?: number
        embedHtml?: string
        embedCss?: string
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

    let { style, animation = '', breathDuration = 2, breathMinOpacity = 0.6, breathFactor, floatHeight = 8, floatDuration = 2, floatFactor, embedHtml = '', embedCss = '', class: className, children, ...rest }: Props = $props()

    let embedRootRef: HTMLDivElement | null = $state(null)
    let activeIframe: HTMLIFrameElement | null = $state(null)
    let activeStyleEl: HTMLStyleElement | null = $state(null)

    const breathDurationStyle = $derived(() => {
        if (animation !== 'breath') return ''
        const d = Number.isFinite(breathDuration) && breathDuration > 0 ? breathDuration : 2
        const o = Number.isFinite(breathMinOpacity) ? Math.min(1, Math.max(0, breathMinOpacity)) : 0.6
        const seed = Number.isFinite(breathFactor) ? (breathFactor as number) : instanceSeed
        const phase01 = pseudoRandom01(seed)
        const delay = -(phase01 * d)
        return `--simplebox-breath-duration: ${d}s; --simplebox-breath-min-opacity: ${o}; --simplebox-breath-delay: ${delay}s;`
    })

    const floatStyle = $derived(() => {
        if (animation !== 'float') return ''
        const d = Number.isFinite(floatDuration) && floatDuration > 0 ? floatDuration : 2
        const h = Number.isFinite(floatHeight) ? Math.max(0, floatHeight) : 8
        const seed = Number.isFinite(floatFactor) ? (floatFactor as number) : instanceSeed
        const phase01 = pseudoRandom01(seed)
        const delay = -(phase01 * d)
        return `--simplebox-float-duration: ${d}s; --simplebox-float-height: calc(${h}px * var(--scale-ratio, 1)); --simplebox-float-delay: ${delay}s;`
    })

    const finalStyle = $derived(() => mergeStyle(style, mergeStyle(breathDurationStyle(), floatStyle()) ?? ''))
    const finalClass = $derived(() => mergeClass(className, animation === 'breath' ? 'simplebox-breath' : animation === 'float' ? 'simplebox-float' : ''))

    const embedHtmlValue = $derived(() => (embedHtml ?? '').trim())
    const embedCssValue = $derived(() => String(embedCss ?? ''))

    function applyIframeSizing() {
        const iframe = activeIframe
        if (!iframe) return
        if (!iframe.style.width) iframe.style.width = '100%'
        if (!iframe.style.height) iframe.style.height = '100%'
        if (!iframe.style.border) iframe.style.border = '0'
        if (!iframe.style.display) iframe.style.display = 'block'
    }

    function refreshIframeRef() {
        const root = embedRootRef
        if (!root) {
            activeIframe = null
            activeStyleEl = null
            return
        }
        const iframe = root.querySelector('iframe') as HTMLIFrameElement | null
        if (iframe !== activeIframe) {
            activeIframe = iframe
            activeStyleEl = null
        }
    }

    function tryInjectCss() {
        const iframe = activeIframe
        if (!iframe) return
        try {
            const doc = iframe.contentDocument
            if (!doc) return
            const head = doc.head ?? doc.getElementsByTagName('head')[0] ?? doc.documentElement
            if (!head) return

            if (!activeStyleEl || activeStyleEl.ownerDocument !== doc) {
                const styleEl = doc.createElement('style')
                styleEl.setAttribute('data-simplebox', 'embed-css')
                head.appendChild(styleEl)
                activeStyleEl = styleEl
            }
            activeStyleEl.textContent = embedCssValue()
        } catch {}
    }

    $effect(() => {
        const html = embedHtmlValue()
        const root = embedRootRef
        if (!html || !root) return
        refreshIframeRef()
        applyIframeSizing()
        tryInjectCss()

        const observer = new MutationObserver(() => {
            refreshIframeRef()
            applyIframeSizing()
            tryInjectCss()
        })
        observer.observe(root, { childList: true, subtree: true })
        return () => observer.disconnect()
    })

    $effect(() => {
        embedCssValue()
        applyIframeSizing()
        tryInjectCss()
    })

    $effect(() => {
        const iframe = activeIframe
        if (!iframe) return
        const onLoad = () => tryInjectCss()
        iframe.addEventListener('load', onLoad)
        return () => {
            iframe.removeEventListener('load', onLoad)
        }
    })
</script>

<div style={finalStyle()} class={finalClass()} {...rest}>
    {#if embedHtmlValue()}
        <div bind:this={embedRootRef} class="embed-root">
            {@html embedHtmlValue()}
        </div>
    {:else}
        {@render children?.()}
    {/if}
</div>

<style>
    .embed-root {
        width: 100%;
        height: 100%;
    }

    :global(.embed-root iframe) {
        width: 100%;
        height: 100%;
        display: block;
        border: 0;
    }

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

    .simplebox-float {
        animation: simplebox-float var(--simplebox-float-duration, 2s) ease-in-out infinite;
        animation-delay: var(--simplebox-float-delay, 0s);
        will-change: translate;
    }

    @keyframes simplebox-float {
        0%,
        100% {
            translate: 0 0;
        }
        50% {
            translate: 0 calc(-1 * var(--simplebox-float-height, calc(8px * var(--scale-ratio, 1))));
        }
    }
</style>
