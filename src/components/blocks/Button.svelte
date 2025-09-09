<!--\n * Button 组件\n * 外层使用 ResponsiveBox 以保持布局一致性\n * 支持 id 唯一标识、文本、样式 variant 以及事件透传\n * 其余属性透传至 ResponsiveBox\n * 注意：低代码平台应保证 id 唯一\n-->

<script lang="ts">
    import ResponsiveBox from '../core/ResponsiveBox.svelte'

    interface Props {
        id?: string
        text?: string
        disabled?: boolean
        enableClick?: boolean
        [key: string]: any
    }

    let { id = crypto.randomUUID(), text = '按钮', disabled = false, enableClick = false, ...rest }: Props = $props()
</script>

<ResponsiveBox {id} {...rest} class="btn" {disabled}>
    {text}
</ResponsiveBox>

<style>
</style>
