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
        animation?: '' | 'breath' | 'float' | 'delayedLoad' | 'number'
        breathDuration?: number
        breathMinOpacity?: number
        breathFactor?: number
        floatHeight?: number
        floatDuration?: number
        floatFactor?: number
        delayedLoadDirection?: 'up' | 'down' | 'left' | 'right'
        delayedLoadDelay?: number
        delayedLoadDistance?: number
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

    function extractOpacity(styleStr: string | undefined): string | null {
        if (!styleStr) return null
        const m = styleStr.match(/(?:^|;)\s*opacity\s*:\s*([^;]+)\s*(?:;|$)/i)
        if (!m) return null
        const v = (m[1] ?? '').trim()
        return v ? v : null
    }

    let instanceSeed = $state(Math.random() * 10000)

    let {
        style,
        animation = '',
        breathDuration = 2,
        breathMinOpacity = 0.6,
        breathFactor,
        floatHeight = 8,
        floatDuration = 2,
        floatFactor,
        delayedLoadDirection = 'up',
        delayedLoadDelay = 0.3,
        delayedLoadDistance = 20,
        embedHtml = '',
        embedCss = '',
        class: className,
        children,
        ...rest
    }: Props = $props()

    let rootRef: HTMLDivElement | null = $state(null)
    let embedRootRef: HTMLDivElement | null = $state(null)
    let activeIframe: HTMLIFrameElement | null = $state(null)
    let activeStyleEl: HTMLStyleElement | null = $state(null)

    function setupNumberAnimation(root: HTMLElement) {
        const original = new Map<Text, string>()
        let raf = 0
        let observer: MutationObserver | null = null

        const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())
        const durationMs = 900
        const startAt = now()

        const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

        const isIgnoredElement = (el: Element) => {
            const tag = el.tagName
            return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SCRIPT' || tag === 'STYLE'
        }

        const scan = () => {
            const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
                acceptNode: (node) => {
                    const parent = (node as Text).parentElement
                    if (!parent) return NodeFilter.FILTER_REJECT
                    if (isIgnoredElement(parent)) return NodeFilter.FILTER_REJECT
                    if (!parent.isConnected) return NodeFilter.FILTER_REJECT
                    return NodeFilter.FILTER_ACCEPT
                }
            })

            let n: Node | null
            while ((n = walker.nextNode())) {
                const textNode = n as Text
                if (original.has(textNode)) continue
                const value = textNode.nodeValue ?? ''
                if (!/\d/.test(value)) continue
                original.set(textNode, value)
            }
        }

        const formatNumber = (value: number, decimals: number) => {
            if (!Number.isFinite(value)) return '0'
            if (decimals <= 0) return String(Math.round(value))
            return value.toFixed(decimals)
        }

        const render = () => {
            const t = Math.min(1, (now() - startAt) / durationMs)
            const p = easeOutCubic(t)

            original.forEach((raw, textNode) => {
                if (!textNode.isConnected) return
                const matches = [...raw.matchAll(/-?\d+(?:\.\d+)?/g)]
                if (matches.length === 0) return

                let out = ''
                let lastIndex = 0
                for (const m of matches) {
                    const idx = m.index ?? 0
                    const token = m[0]
                    const target = Number(token)
                    const dot = token.indexOf('.')
                    const decimals = dot >= 0 ? token.length - dot - 1 : 0

                    out += raw.slice(lastIndex, idx)
                    out += formatNumber(target * p, decimals)
                    lastIndex = idx + token.length
                }
                out += raw.slice(lastIndex)
                textNode.nodeValue = out
            })

            if (t < 1) {
                raf = requestAnimationFrame(render)
            } else {
                original.forEach((raw, textNode) => {
                    if (textNode.isConnected) textNode.nodeValue = raw
                })
            }
        }

        scan()
        raf = requestAnimationFrame(render)

        observer = new MutationObserver(() => {
            scan()
        })
        observer.observe(root, { characterData: true, subtree: true, childList: true })

        return () => {
            if (observer) observer.disconnect()
            if (raf) cancelAnimationFrame(raf)
            original.forEach((raw, textNode) => {
                if (textNode.isConnected) textNode.nodeValue = raw
            })
            original.clear()
        }
    }

    let cleanupNumberAnimation: (() => void) | null = null

    $effect(() => {
        if (animation !== 'number') {
            cleanupNumberAnimation?.()
            cleanupNumberAnimation = null
            return
        }
        const root = rootRef
        if (!root) return
        cleanupNumberAnimation?.()
        cleanupNumberAnimation = setupNumberAnimation(root)
        return () => {
            cleanupNumberAnimation?.()
            cleanupNumberAnimation = null
        }
    })

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

    const delayedLoadStyle = $derived(() => {
        if (animation !== 'delayedLoad') return ''
        const d = Number.isFinite(delayedLoadDelay) ? Math.max(0, delayedLoadDelay) : 0.3
        const dist = Number.isFinite(delayedLoadDistance) ? Math.max(0, delayedLoadDistance) : 20
        const dir = delayedLoadDirection || 'up'
        const x = dir === 'left' ? dist : dir === 'right' ? -dist : 0
        const y = dir === 'up' ? dist : dir === 'down' ? -dist : 0
        const targetOpacity = extractOpacity(style) ?? '1'
        return `--simplebox-delayed-load-delay: ${d}s; --simplebox-delayed-load-offset-x: calc(${x}px * var(--scale-ratio, 1)); --simplebox-delayed-load-offset-y: calc(${y}px * var(--scale-ratio, 1)); --simplebox-delayed-load-final-opacity: ${targetOpacity}; opacity: 0; translate: var(--simplebox-delayed-load-offset-x, 0px) var(--simplebox-delayed-load-offset-y, 0px);`
    })

    const finalStyle = $derived(() => mergeStyle(style, mergeStyle(breathDurationStyle(), mergeStyle(floatStyle(), delayedLoadStyle()) ?? '') ?? ''))
    const finalClass = $derived(() => mergeClass(className, animation === 'breath' ? 'simplebox-breath' : animation === 'float' ? 'simplebox-float' : animation === 'delayedLoad' ? 'simplebox-delayed-load' : ''))

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

<div bind:this={rootRef} style={finalStyle()} class={finalClass()} {...rest}>
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

    .simplebox-delayed-load {
        opacity: 0;
        translate: var(--simplebox-delayed-load-offset-x, 0px) var(--simplebox-delayed-load-offset-y, 0px);
        animation: simplebox-delayed-load 0.6s ease-out both;
        animation-delay: var(--simplebox-delayed-load-delay, 0s);
        will-change: translate, opacity;
    }

    @keyframes simplebox-delayed-load {
        from {
            opacity: 0;
            translate: var(--simplebox-delayed-load-offset-x, 0px) var(--simplebox-delayed-load-offset-y, 0px);
        }
        to {
            opacity: var(--simplebox-delayed-load-final-opacity, 1);
            translate: 0 0;
        }
    }
</style>
