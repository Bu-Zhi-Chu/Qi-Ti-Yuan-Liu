<!--
 * 低代码平台动态组件容器
 * @description 支持通过属性面板切换任意组件类型的通用容器
 * @usage 在低代码平台中拖拽使用，通过type属性切换组件
 * @example <DynamicComponent type="RealTimeClock" props={{format: "datetime"}} />
-->
<script lang="ts">
    import type { Component } from 'svelte'

    // 支持的组件类型映射
    const componentMap = {
        RealTimeClock: () => import('../widgets/RealTimeClock.svelte'),
        ResponsiveBox: () => import('./ResponsiveBox.svelte')
        // 可扩展更多组件类型
    }

    // 组件属性定义
    interface Props {
        type: keyof typeof componentMap
        props?: Record<string, any>
        children?: any
        style?: string
        class?: string
        [key: string]: any // 支持任意HTML属性透传
    }

    let { type, props = {}, children, style, class: className, ...restProps }: Props = $props()

    // 动态加载的组件
    let TargetComponent: Component | null = $state(null)

    // 监听类型变化，动态加载对应组件
    $effect(() => {
        if (type && componentMap[type]) {
            componentMap[type]().then((module) => {
                TargetComponent = module.default as Component
            })
        }
    })
</script>

<TargetComponent {...props} {...restProps} {style} class={className}>
    {@render children?.()}
</TargetComponent>
