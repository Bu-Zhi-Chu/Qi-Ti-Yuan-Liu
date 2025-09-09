<!--
 * Button 组件
 * 外层使用 ResponsiveBox 以保持布局一致性
 * 支持 id 唯一标识、文本、样式 variant 以及事件透传
 * 其余属性透传至 ResponsiveBox
 * 注意：低代码平台应保证 id 唯一
-->

<script lang="ts">
    import ResponsiveBox from '../core/ResponsiveBox.svelte'

    interface Props {
        id?: string
        text?: string
        textContent?: string
        disabled?: boolean
        enableClick?: boolean
        textOffsetLeft?: string
        textOffsetTop?: string
        highlightImage?: string
        style?: string
        children?: any
        [key: string]: any
    }

    let { id = crypto.randomUUID(), text = '按钮', textContent, disabled = false, enableClick = false, textOffsetLeft = '0px', textOffsetTop = '0px', highlightImage = '', style = '', children, ...rest } = $props() as Props

    let isHighlighted = $state(false)

    const mergedStyle = $derived(() => {
        const highlight = isHighlighted && highlightImage ? `background-image: url(${highlightImage}); background-size: contain; background-repeat: no-repeat; background-position: center;` : ''
        return style && highlight ? `${style}; ${highlight}` : style || highlight
    })

    /** 点击事件，默认输出日志 */
    function handleClick() {
        console.log(`Button(${id}) clicked`)
        if (highlightImage) {
            isHighlighted = !isHighlighted
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

<ResponsiveBox {id} {...rest} class="btn" {disabled} style={mergedStyle()}>
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
</style>
