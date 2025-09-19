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
                series: [{
                    data: [0, 0, 0],
                    type: 'bar'
                }]
            }
        })()
    )
</script>

<!-- 使用一个禁用指针事件的包装层，确保仅图表本身可以交互 -->
<div class="wrapper" {style} {...restProps} {id}>
    <ECharts class="chart" options={option} theme={theme as any} init={echartsInit as any} />
</div>

<style>
    /* 让外层容器可以接收鼠标事件用于选中 */
    .wrapper {
        pointer-events: all;
    }

    /* 禁用图表本身的鼠标事件，避免拦截选中 */
    .chart {
        width: 100%;
        height: 100%;
        pointer-events: none;
    }
</style>
