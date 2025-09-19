<script lang="ts">
    import { Chart as ECharts } from 'svelte-echarts'
    import echartsInit from './echarts-core'
    import { request } from '../../services/request'

    // 不再使用默认模板和数据生成函数，JavaScript代码是唯一渲染方式

    /**
     * 图表组件封装（基于 svelte-echarts）
     *
     * Props:
     * - id: 节点唯一标识
     * - option: ECharts 配置对象
     * - theme: 主题名称（如 'dark'），留空使用默认
     * - style: 内联样式字符串，用于尺寸/布局控制
     * - 其余属性透传给根元素
     */
    interface Props {
        id?: string
        /** JavaScript代码配置（唯一渲染方式） */
        code?: string
        theme?: any
        style?: string
        // 废弃的属性（不再使用）
        chartType?: 'bar' | 'line' | 'pie'
        config?: any
        x?: any
        y?: any
        data?: any
        name?: any
        value?: any
        [key: string]: any
    }

    // Svelte 5 runes写法：直接在解构中初始化默认值
    const { id = crypto.randomUUID(), code, theme = 'light', style = '', className, ...restProps } = $props() as Props

    // 导入必要的服务和存储
    import { screenDetector } from '../../services/screen/screen-detector.service'
    import DexieService from '../../services/database/dexie-service'
    import { projectId, getDesignSize } from '../../stores/dom-tree.store.svelte'
    import { get } from 'svelte/store'

    // 当前缩放比例
    let scaleRatio = $state({ width: 1, height: 1 })
    let containerRef: HTMLDivElement | null = null

    // 计算并应用缩放比例
    async function refreshScale() {
        if (!containerRef) return

        // 直接读 store 缓存的设计尺寸
        const { width: designWidth = 1920, height: designHeight = 1080 } = getDesignSize()

        const docWidth = window.innerWidth
        const docHeight = window.innerHeight
        const widthRatio = docWidth / designWidth
        const heightRatio = docHeight / designHeight

        // 使用较小的比例，确保内容完整显示
        const scale = Math.min(widthRatio, heightRatio)

        scaleRatio = { width: scale, height: scale }

        // 应用缩放变换
        containerRef.style.transform = `scale(${scale}, ${scale})`
        containerRef.style.transformOrigin = 'left top'

        // 设置容器尺寸为设计尺寸
        containerRef.style.width = designWidth + 'px'
        containerRef.style.height = designHeight + 'px'
    }

    // 监听窗口大小变化
    $effect(() => {
        refreshScale()

        const handleResize = async () => {
            await refreshScale()
        }

        window.addEventListener('resize', handleResize)

        // 页面显示时重新计算
        const handlePageshow = async (e: PageTransitionEvent) => {
            if (e.persisted) {
                await refreshScale()
            }
        }

        window.addEventListener('pageshow', handlePageshow)

        return () => {
            window.removeEventListener('resize', handleResize)
            window.removeEventListener('pageshow', handlePageshow)
        }
    })

    // 调试：检查code属性是否被正确传递
    $effect(() => {
        console.log('ECharts component received code:', code)
        console.log('ECharts component received all props:', { id, code, theme, style, className, ...restProps })
    })

    // 安全执行JavaScript代码并返回option对象
    function executeJavaScriptCode(code: string): any {
        try {
            // 创建一个安全的执行环境
            const sandbox = {
                option: undefined,
                console: console,
                Math: Math,
                Array: Array,
                Object: Object,
                String: String,
                Number: Number,
                Date: Date
            }

            // 创建函数代码，将sandbox作为作用域
            const functionCode = `
                with (sandbox) {
                    ${code}
                }
                return sandbox.option;
            `

            // 创建函数并执行
            const func = new Function('sandbox', functionCode)
            const result = func(sandbox)

            return result
        } catch (error) {
            console.error('JavaScript代码执行错误:', error)
            return null
        }
    }

    // 最终 ECharts option，仅通过JavaScript代码生成
    const option = $derived(
        (() => {
            // 如果提供了JavaScript代码，执行代码生成option
            if (code && typeof code === 'string' && code.trim()) {
                const codeResult = executeJavaScriptCode(code)
                if (codeResult && typeof codeResult === 'object') {
                    return codeResult
                }
            }

            // 如果没有提供JavaScript代码，返回一个基础配置确保图表能初始化
            return {
                title: {
                    text: '请配置JavaScript代码',
                    left: 'center',
                    top: 'middle',
                    textStyle: {
                        fontSize: 14,
                        color: '#999'
                    }
                },
                xAxis: {
                    type: 'category',
                    data: ['A', 'B', 'C']
                },
                yAxis: {
                    type: 'value'
                },
                series: [
                    {
                        data: [0, 0, 0],
                        type: 'bar'
                    }
                ]
            }
        })()
    )
</script>

<!-- 外层容器用于应用缩放变换 -->
<div class="scale-container" bind:this={containerRef}>
    <!-- 使用一个禁用指针事件的包装层，确保仅图表本身可以交互 -->
    <div class="wrapper" {style} {...restProps} {id}>
        <ECharts class="chart" options={option} theme={theme as any} init={echartsInit as any} />
    </div>
</div>

<style>
    /* 外层缩放容器 */
    .scale-container {
        position: relative;
        transform-origin: left top;
        overflow: hidden;
    }

    /* 让外层容器可以接收鼠标事件用于选中 */
    .wrapper {
        pointer-events: all;
        width: 100%;
        height: 100%;
    }

    /* 禁用图表本身的鼠标事件，避免拦截选中 */
    .chart {
        width: 100%;
        height: 100%;
        pointer-events: none;
    }
</style>
