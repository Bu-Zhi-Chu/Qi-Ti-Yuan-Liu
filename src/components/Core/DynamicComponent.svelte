<!--
 * 低代码平台动态组件容器
 * @description 支持通过属性面板切换任意组件类型的通用容器
 * @usage 在低代码平台中拖拽使用，通过type属性切换组件
 * @example <DynamicComponent type="RealTimeClock" props={{format: "datetime"}} data-id="comp-123" />
-->
<script lang="ts">
    import type { Component, Snippet } from 'svelte'
    import blocksConfig from '../blocks/blocks.config.json'

    // 根据 JSON 配置直接生成组件映射（动态 import）
    // 使用 /* @vite-ignore */ 提示 Vite 允许基于变量路径的动态加载
    const componentMap: Record<string, () => Promise<{ default: Component }>> = {}
    for (const item of blocksConfig) {
        componentMap[item.type] = () => import(/* @vite-ignore */ item.path)
    }

    // 组件属性定义
    interface Props {
        type: string // 使用字符串，运行时校验是否存在于 componentMap
        props?: Record<string, any>
        children?: Snippet // Svelte 5 snippet 类型
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

<!-- 根据组件加载状态渲染 -->
{#if TargetComponent}
    <!-- Svelte 5 runes 模式：组件默认动态，直接使用组件语法 -->
    <TargetComponent {style} class={className} data-id={componentUUID} {...props} {...restProps}>
        {@render children?.()}
    </TargetComponent>
{:else}
    <!-- 组件未加载时的占位符 -->
    <div data-id={componentUUID} {style} class={className} {...restProps}>
        {@render children?.()}
    </div>
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
