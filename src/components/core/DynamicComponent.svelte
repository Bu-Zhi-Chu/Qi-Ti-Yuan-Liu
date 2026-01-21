<!--
 * 低代码平台动态组件容器
 * @description 支持通过属性面板切换任意组件类型的通用容器
 * @usage 在低代码平台中拖拽使用，通过type属性切换组件
 * @example <DynamicComponent type="RealTimeClock" props={{format: "datetime"}} data-id="comp-123" />
-->
<script lang="ts">
    import type { Component, Snippet } from 'svelte'
    import { onMount } from 'svelte'
    import { loadComponent } from '../../services/utils/manifest-loader'
    import blocksConfig from '../blocks/blocks.config.json'

    let componentMap: Record<string, () => Promise<{ default: Component }>> = {}

    onMount(() => {
        // 根据 JSON 配置直接生成组件映射
        for (const item of blocksConfig) {
            componentMap[item.type] = () => loadComponent(item.path)
        }
    })

    // 组件属性定义
    interface Props {
        type: string // 使用字符串，运行时校验是否存在于 componentMap
        props?: Record<string, any>
        children?: Snippet // Svelte 5 snippet 类型
        style?: string
        class?: string
        id: string // 必须提供稳定的id
        [key: string]: any // 支持任意HTML属性透传
    }

    let incoming: Props = $props()
    const componentUUID = incoming.id
    const type = $derived.by(() => incoming.type)
    const propsBag = $derived.by(() => incoming.props ?? {})
    const children = $derived.by(() => incoming.children)
    const style = $derived.by(() => incoming.style)
    const className = $derived.by(() => incoming.class)
    const restProps = $derived.by(() => {
        const { type: _t, props: _p, children: _ch, style: _s, class: _c, id: _id, ...rest } = incoming
        return rest
    })

    // 动态加载的组件
    let TargetComponent: any = $state(null)

    function mergeStyle(base: string | undefined, extra: string): string | undefined {
        const baseStr = (base ?? '').trim()
        const extraStr = extra.trim()
        if (!extraStr) return base
        if (!baseStr) return extraStr
        return baseStr.endsWith(';') ? `${baseStr}${extraStr}` : `${baseStr};${extraStr}`
    }

    const placeholderPreStyle = $derived.by(() => {
        if (type !== 'SimpleBox') return ''
        if ((incoming as any).animation !== 'delayedLoad') return ''
        const dir = ((incoming as any).delayedLoadDirection as 'up' | 'down' | 'left' | 'right' | undefined) || 'up'
        const distRaw = Number((incoming as any).delayedLoadDistance)
        const dist = Number.isFinite(distRaw) ? Math.max(0, distRaw) : 20
        const x = dir === 'left' ? dist : dir === 'right' ? -dist : 0
        const y = dir === 'up' ? dist : dir === 'down' ? -dist : 0
        return `opacity: 0; translate: calc(${x}px * var(--scale-ratio, 1)) calc(${y}px * var(--scale-ratio, 1));`
    })

    const placeholderStyle = $derived.by(() => mergeStyle(style, placeholderPreStyle))

    // 监听类型变化，动态加载对应组件
    $effect(() => {
        const nextType = type
        if (nextType && componentMap[nextType]) {
            componentMap[nextType]().then((module) => {
                TargetComponent = module.default
            })
        }
    })
</script>

<!-- 根据组件加载状态渲染 -->
{#if TargetComponent}
    <!-- Svelte 5 runes 模式：组件默认动态，直接使用组件语法 -->
    <TargetComponent {style} class={className} id={componentUUID} {...propsBag} {...restProps}>
        {@render children?.()}
    </TargetComponent>
{:else}
    <!-- 组件未加载时的占位符 -->
    <div id={componentUUID} style={placeholderStyle} class={className} {...restProps}>
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
