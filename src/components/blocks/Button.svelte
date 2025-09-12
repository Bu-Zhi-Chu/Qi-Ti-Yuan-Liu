<!--
 * Button 组件
 * 外层使用 ResponsiveBox 以保持布局一致性
 * 支持 id 唯一标识、文本、样式 variant 以及事件透传
 * 其余属性透传至 ResponsiveBox
 * 注意：低代码平台应保证 id 唯一
-->

<script lang="ts">
    import ResponsiveBox from '../core/ResponsiveBox.svelte'
    import { currentPage } from '../../services/repository/dom-tree.store.svelte'
    import { setCurrentPage } from '../../services/repository/dom-tree.store.svelte'
    import { onMount } from 'svelte'
    import { findNodeById, domTree } from '../../services/repository/dom-tree.store.svelte'

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
        style?: string
        children?: any
        [key: string]: any
    }

    let { id = crypto.randomUUID(), text = '按钮', textContent, disabled = false, enableClick = false, textOffsetLeft = '0px', textOffsetTop = '0px', highlightImage = '', hoverEffect = '', buttonType = '', style = '', children, ...rest } = $props() as Props

    // 提取外部传入的 class（如 use-pseudo-bg），保持响应式
    const externalClass = $derived(() => (rest as any)?.class ?? '')
    delete rest.class

    // 开关状态（仅在 buttonType === 'switch' 时使用）
    let toggled = false

    // 移除对 highlightImage 的直接样式注入，交由 NodeRenderer 通过 --bg-img 处理
    const mergedStyle = $derived(() => style)

    /** 点击事件，根据按钮类型执行不同逻辑 */
    function handleClick() {
        switch (buttonType) {
            case 'switch':
                toggled = !toggled
                // 把状态写回节点
                const node = findNodeById(domTree, id)
                if (node) node.toggled = toggled
                console.log(`Button(${id}) ${toggled ? '开启' : '关闭'}`)
                break
            case 'navigation':
                // 导航逻辑待实现
                console.log(`Button(${id}) 导航`)
                break
            case 'trigger':
            default:
                console.log(`Button(${id}) 触发`)
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
</script>

<ResponsiveBox {id} {...rest} class={`btn ${hoverEffect} ${externalClass()}`} {disabled} style={mergedStyle()}>
    <div class="full-size" role="button" tabindex={enableClick ? 0 : undefined} onclick={enableClick ? handleClick : undefined} onkeydown={enableClick ? handleKey : undefined}>
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
