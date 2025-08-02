<!--
 * 低代码平台动态组件容器
 * @description 支持通过属性面板切换任意组件类型的通用容器
 * @usage 在低代码平台中拖拽使用，通过type属性切换组件
 * @example <DynamicComponent type="RealTimeClock" props={{format: "datetime"}} data-id="comp-123" />
-->
<script lang="ts">
    import type { Component } from 'svelte'

    // 支持的组件类型映射
    const componentMap = {
        RealTimeClock: () => import('../widgets/RealTimeClock.svelte'),
        CustomTextInput: () => import('../widgets/CustomTextInput.svelte'),
        ResponsiveBox: () => import('./ResponsiveBox.svelte'),
        SimpleBox: () => import('./SimpleBox.svelte')
        // 可扩展更多组件类型
    }

    // 组件属性定义
    interface Props {
        type: keyof typeof componentMap
        props?: Record<string, any>
        children?: any
        style?: string
        class?: string
        'data-id': string // 必须提供稳定的data-id
        [key: string]: any // 支持任意HTML属性透传
    }

    // 解构props，data-id必须由父组件提供稳定的值
    let { type, props = {}, children, style, class: className, 'data-id': dataId, ...restProps }: Props = $props()

    // 直接使用传入的data-id，确保在组件生命周期内保持不变
    const componentUUID = dataId

    // 动态加载的组件
    let TargetComponent: any = $state(null)

    // 监听类型变化，动态加载对应组件
    $effect(() => {
        if (type && componentMap[type]) {
            componentMap[type]().then((module) => {
                TargetComponent = module.default
            })
        }
    })
</script>

<!-- 确保 data-id 始终存在于 DOM 中，即使在组件切换过程中 -->
{#if TargetComponent}
    <TargetComponent {...props} {...restProps} {style} class={className} data-id={componentUUID}>
        {@render children?.()}
    </TargetComponent>
{/if}

<!--
  使用说明：
  1. 在低代码平台中，data-id应该从数据库的DragComponent.id获取
  2. 当切换组件类型时，保持相同的data-id不变
  3. 这样可以确保组件标识符在类型切换时保持稳定

  示例：
  <DynamicComponent
    type={selectedComponent.type}
    props={selectedComponent.properties}
    data-id={selectedComponent.id}  // 使用数据库ID作为稳定标识
  />
-->
