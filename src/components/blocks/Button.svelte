<!--
 * Button 组件
 * 外层使用 ResponsiveBox 以保持布局一致性
 * 支持 id 唯一标识、文本、样式 variant 以及事件透传
 * 其余属性透传至 ResponsiveBox
 * 注意：低代码平台应保证 id 唯一
-->

<script lang="ts">
    import ResponsiveBox from '../core/ResponsiveBox.svelte'
    import { currentPage } from '../../stores/dom-tree.store.svelte'
    import { setCurrentPage } from '../../stores/dom-tree.store.svelte'
    import { getContext, onMount } from 'svelte'
    import { findNodeById, domTree, findParentById } from '../../stores/dom-tree.store.svelte'

    interface Props {
        id?: string
        text?: string
        textContent?: string
        disabled?: boolean
        enableClick?: boolean
        textOffsetLeft?: string
        textOffsetTop?: string
        highlightImage?: string
        hoverEffect?: string
        buttonType?: string
        businessStyle?: string
        navigationTarget?: string
        jumpPath?: string
        // 新增：默认首页开关
        defaultHome?: boolean
        editing?: boolean
        style?: string
        children?: any
        [key: string]: any
    }

    let {
        id = crypto.randomUUID(),
        text = '按钮',
        textContent,
        disabled = false,
        enableClick = false,
        textOffsetLeft = '0px',
        textOffsetTop = '0px',
        highlightImage = '',
        hoverEffect = '',
        buttonType = '',
        businessStyle = '',
        navigationTarget = '',
        jumpPath = '',
        /* 新增 */ defaultHome = false,
        editing = false,
        style = '',
        children,
        ...rest
    } = $props() as Props

    // 提取外部传入的 class（如 use-pseudo-bg），保持响应式
    const externalClass = $derived(() => (rest as any)?.class ?? '')
    delete rest.class

    // 开关状态（仅在 buttonType === 'switch' 时使用）
    let toggled = false

    // 移除对 highlightImage 的直接样式注入，交由 NodeRenderer 通过 --bg-img 处理
    const mergedStyle = $derived(() => style)

    const companyTableContext = getContext<any>('company-table')
    const isBusinessButton = $derived(buttonType === 'hongde')
    const isClickable = $derived((enableClick || isBusinessButton) && !disabled)

    function resolveJumpUrl(raw: string): string | null {
        const s = (raw || '').trim()
        if (!s) return null
        if (/^https?:\/\//i.test(s)) return s
        const origin = window.location.origin
        if (s.startsWith('/')) return `${origin}${s}`
        return `${origin}/${s}`
    }

    /** 点击事件，根据按钮类型执行不同逻辑 */
    function handleClick() {
        if (editing) return

        if (isBusinessButton) {
            companyTableContext?.handleBusinessAction?.({
                id,
                businessStyle
            })
            return
        }

        switch (buttonType) {
            case 'switch':
                toggled = !toggled
                // 把状态写回节点
                const node = findNodeById(domTree, id)
                if (node) node.toggled = toggled
                console.log(`Button(${id}) ${toggled ? '开启' : '关闭'}`)
                break
            case 'navigation':
                const nodeNav = findNodeById(domTree, id)
                if (!nodeNav) break
                if (nodeNav.toggled) {
                    // 已经高亮则不处理
                    break
                }
                // 清除同父级其他导航按钮高亮
                const parent = findParentById(domTree, id)
                if (parent?.children) {
                    parent.children.forEach((child: any) => {
                        if (child.componentType === 'Button' && (child.buttonType === 'navigation' || (child.attributes as any)?.buttonType === 'navigation')) {
                            ;(child as any).toggled = child.id === id
                        }
                    })
                }
                console.log(`Button(${id}) 导航高亮`)
                // 切换页面
                if (navigationTarget) {
                    setCurrentPage(navigationTarget)
                }
                break
            case 'jump':
                const url = resolveJumpUrl(jumpPath)
                if (url) {
                    window.open(url, '_blank', 'noopener,noreferrer')
                }
                break
            case 'trigger':
                console.log(`Button(${id}) 触发`)
            default:
                break
        }
    }
    /** 键盘事件：回车或空格等价点击 */
    function handleKey(e: KeyboardEvent) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleClick()
        }
    }
    // 当设置为默认首页时，组件挂载后自动切换页面并高亮
    onMount(() => {
        if (buttonType === 'navigation' && defaultHome && navigationTarget) {
            // 若已高亮则跳过
            if (!toggled) {
                toggled = true
                // 维护同父级导航按钮高亮状态
                const parent = findParentById(domTree, id)
                if (parent?.children) {
                    parent.children.forEach((child: any) => {
                        if (child.componentType === 'Button' && (child.buttonType === 'navigation' || (child.attributes as any)?.buttonType === 'navigation')) {
                            ;(child as any).toggled = child.id === id
                        }
                    })
                }
            }
            // 切换到目标页面
            setCurrentPage(navigationTarget)
        }
    })
</script>

<ResponsiveBox {id} {...rest} class={`btn ${hoverEffect} ${externalClass()}`} {disabled} style={mergedStyle()}>
    <div class="full-size" role="button" tabindex={isClickable ? 0 : undefined} onclick={isClickable ? handleClick : undefined} onkeydown={isClickable ? handleKey : undefined}>
        <span style="margin-left: calc({textOffsetLeft} * var(--scale-ratio, 1)); margin-top: calc({textOffsetTop} * var(--scale-ratio, 1));">
            {#if children}
                {@render children()}
            {:else}
                {textContent ?? text}
            {/if}
        </span>
    </div>
</ResponsiveBox>

<style>
    .full-size {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
    }

    /* 悬浮效果：放大 */
    :global(.zoom:hover) {
        transform: scale(1.05);
        transition: transform 0.25s ease;
    }

    /* 悬浮效果：浮起 */
    :global(.lift) {
        transition:
            transform 0.25s ease,
            box-shadow 0.25s ease;
    }
    :global(.lift:hover) {
        transform: translateY(calc(-4px * var(--scale-ratio, 1)));
        box-shadow: 0 calc(6px * var(--scale-ratio, 1)) calc(14px * var(--scale-ratio, 1)) rgba(0, 0, 0, 0.25);
    }
</style>
