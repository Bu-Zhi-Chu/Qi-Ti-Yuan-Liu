<!--
 * 简化版响应式容器组件
 * 这是一个轻量级的容器组件，作为ResponsiveBox的简化版本
 * 主要特点：
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
        children?: import('svelte').Snippet
        'data-id'?: string // 外部指定的数据标识符，用于低代码平台定位
        [key: string]: any // 支持其他任意属性
    }

    let { style = '', children, ...rest }: Props = $props()
</script>

<div style="display: inline-block; width: 100%; height: 100%; {style}" {...rest}>
    {@render children?.()}
</div>
