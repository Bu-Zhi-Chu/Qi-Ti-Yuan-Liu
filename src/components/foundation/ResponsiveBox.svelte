<!--
 * 响应式容器组件 - Svelte 5 Runes系统全面优化版
 * 使用$effect自动管理副作用，$derived缓存计算结果，ResizeObserver实现精确响应式
 * 支持在style属性中直接写CSS字符串，自动将px值转换为calc(值 * var(--scale-ratio, 1))
 *
 * 使用方法：
 * <ResponsiveBox style="width: 100px; height: 100px; top: 100px; left: 100px;">
 *   内容放这里
 * </ResponsiveBox>
 *
 * 自适应核心公式：
 * <div style="width: calc(100px * var(--scale-ratio, 1)); height: calc(100px * var(--scale-ratio, 1)); ...">
 *
 * Svelte 5升级亮点：
 * 1. $effect自动清理副作用，无需手动管理
 * 2. $derived缓存计算结果，避免重复计算
 * 3. ResizeObserver实现容器级精确尺寸监听
 * 4. 性能优化：只在必要时机重新计算
-->

<script lang="ts">
    interface Props {
        style?: string
        children?: import('svelte').Snippet
        baseWidth?: number // 基准宽度，默认1920
        [key: string]: any // 支持其他任意属性
    }

    let { style = '', baseWidth = 1920, children, ...rest }: Props = $props()

    // 使用$state管理容器宽度状态
    let containerWidth = $state(0)
    let containerRef: HTMLDivElement = $state() as HTMLDivElement

    // 使用$derived创建响应式计算属性，自动缓存计算结果
    const scaleRatio = $derived(containerWidth > 0 ? Math.min(containerWidth / baseWidth, 1.2) : 1)

    // 使用$derived缓存style转换结果，只在style或scaleRatio变化时重新计算
    const finalStyle = $derived(style.trim() ? style.replace(/(\d+(?:\.\d+)?)px/g, (_, v) => `calc(${parseFloat(v)}px * var(--scale-ratio, ${scaleRatio}))`) : '')

    // 使用$effect自动管理ResizeObserver生命周期和副作用清理
    $effect(() => {
        if (!containerRef || typeof window === 'undefined') return

        // ResizeObserver 浏览器兼容性检查
        if ('ResizeObserver' in window) {
            // 使用ResizeObserver监听容器尺寸变化 - 现代浏览器
            const resizeObserver = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    const { width } = entry.contentRect
                    containerWidth = width
                }
            })

            // 立即获取初始宽度
            containerWidth = containerRef.offsetWidth

            // 开始监听
            resizeObserver.observe(containerRef)

            // $effect自动返回清理函数
            return () => {
                resizeObserver.disconnect()
            }
        } else {
            // 降级方案：使用传统的addEventListener - 旧版浏览器
            const updateContainerWidth = () => {
                containerWidth = containerRef.offsetWidth
            }

            updateContainerWidth()
            ;(window as Window & typeof globalThis).addEventListener('resize', updateContainerWidth)

            // $effect自动返回清理函数
            return () => {
                ;(window as Window & typeof globalThis).removeEventListener('resize', updateContainerWidth)
            }
        }
    })
</script>

<div bind:this={containerRef} style={finalStyle} {...rest}>
    {@render children?.()}
</div>
