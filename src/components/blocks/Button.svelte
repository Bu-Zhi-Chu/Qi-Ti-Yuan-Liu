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
        targetPageId?: string
        style?: string
        children?: any
        [key: string]: any
    }

    let { id = crypto.randomUUID(), text = '按钮', textContent, disabled = false, enableClick = false, textOffsetLeft = '0px', textOffsetTop = '0px', highlightImage = '', hoverEffect = '', buttonType = '', targetPageId = '', style = '', children, ...rest } = $props() as Props

    const isHighlighted = $derived(() => {
        return buttonType === 'navigate' && targetPageId && $currentPage === targetPageId
    })

    const mergedStyle = $derived(() => {
        const highlight = isHighlighted() && highlightImage
            ? `background-image: url(${highlightImage}); background-size: contain; background-repeat: no-repeat; background-position: center;`
            : ''
        return style && highlight ? `${style}; ${highlight}` : style || highlight
    })

    /** 点击事件，默认输出日志 */
    function handleClick() {
        console.log(`Button(${id}) clicked`)
        if (buttonType === 'navigate' && targetPageId) {
            currentPage.set(targetPageId)
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

<ResponsiveBox {id} {...rest} class="btn {hoverEffect}" {disabled} style={mergedStyle()}>
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
