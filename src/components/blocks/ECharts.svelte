<script lang="ts">
    import { Chart as ECharts } from 'svelte-echarts'
    import echartsInit from './echarts-core'
    import { request } from '../../services/request'

    // 默认基础配置，不含具体数据
    const defaultConfig = {
        title: { text: '示例柱状图' },
        tooltip: {},
        xAxis: { type: 'category', data: ['A', 'B', 'C', 'D', 'E', 'F'] },
        yAxis: { type: 'value' },
        series: [{ type: 'bar' }]
    }

    // 各图表类型的默认配置模板
    const chartDefaults: Record<string, any> = {
        bar: {
            title: { text: '示例柱状图' },
            tooltip: {},
            xAxis: { type: 'category' },
            yAxis: { type: 'value' },
            series: [{ type: 'bar' }]
        },
        line: {
            title: { text: '示例折线图' },
            tooltip: {},
            xAxis: { type: 'category' },
            yAxis: { type: 'value' },
            series: [{ type: 'line' }]
        },
        pie: {
            title: { text: '示例饼图' },
            tooltip: { trigger: 'item' },
            legend: { orient: 'vertical', left: 'left' },
            series: [{ type: 'pie', radius: '50%' }]
        }
    }

    // 默认数据
    const defaultData = {
        x: ['A', 'B', 'C', 'D', 'E', 'F'],
        y: [23, 45, 56, 13, 22, 36]
    }

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
        chartType?: 'bar' | 'line' | 'pie'
        config?: any
        data?: any
        dataSource?: 'json' | 'mock' | 'real'
        requestPath?: string
        theme?: any
        style?: string
        [key: string]: any
    }

    // Svelte 5 runes写法：直接在解构中初始化默认值
    let { id = crypto.randomUUID(), chartType = 'bar', config = chartDefaults[chartType] ?? chartDefaults['bar'], data = defaultData, dataSource = 'json', requestPath = '', theme = 'light', style = '', ...rest } = $props() as Props
    // 当 dataSource 为 mock 或 real 时，尝试根据 requestPath 发起网络请求获取数据
    $effect(() => {
        console.debug('[ECharts] effect', { dataSource, requestPath })
        if (dataSource !== 'json' && requestPath) {
            const url = requestPath
            request<any>(url)
                .then((resp) => {
                    data = resp
                })
                .catch((e) => {
                    console.error('[ECharts] 数据请求失败', e)
                })
        }
    })

    // 最终 ECharts option，对 config 与 data 的响应式派生
    const option = $derived(
        (() => {
            // 兼容两种 config 结构：
            // 1. 直接是 ECharts option
            // 2. 是一个以 chartType 为 key 的模板映射（来自 blocks.config.json 默认值）
            let base: any
            if (config && ['bar', 'line', 'pie'].every((k) => k in config)) {
                // 模板映射，取对应图表类型的子配置
                base = JSON.parse(JSON.stringify((config as any)[chartType] ?? chartDefaults[chartType] ?? chartDefaults['bar']))
            } else if (config && Object.keys(config).length) {
                // 直接配置
                base = JSON.parse(JSON.stringify(config))
            } else {
                // 回退默认模板
                base = JSON.parse(JSON.stringify(chartDefaults[chartType] ?? chartDefaults['bar']))
            }

            // 提取 x / y 轴数据
            let xData: any[] = []
            let yData: any[] = []

            if (Array.isArray(data)) {
                // 仅提供 y 数据数组
                yData = data
                xData = data.map((_, idx) => String(idx + 1))
            } else if (data && typeof data === 'object') {
                xData = Array.isArray((data as any).x) ? (data as any).x : []
                yData = Array.isArray((data as any).y) ? (data as any).y : []
            }

            // 处理 xAxis / yAxis
            if (!base.xAxis) {
                base.xAxis = { type: 'category', data: xData }
            } else if (typeof base.xAxis === 'object') {
                base.xAxis = { ...(base.xAxis as any), data: xData }
            }

            // 确定图表类型
            const seriesType = chartType || (Array.isArray(base.series) && base.series[0]?.type) || 'bar'
            const isPie = seriesType === 'pie'
            if (!isPie) {
                // 确保 cartesian 图表存在 yAxis
                if (!base.yAxis) {
                    base.yAxis = { type: 'value' }
                }
            } else {
                // 饼图不需要轴
                delete base.xAxis
                delete base.yAxis
            }

            // 处理 series[0]
            if (Array.isArray(base.series) && base.series.length > 0) {
                base.series[0] = { ...(base.series[0] || {}), data: yData, type: seriesType }
            } else {
                base.series = [{ type: seriesType, data: yData }]
            }

            return base
        })()
    )

    // 若外部传入空数据或配置，自动回退
    $effect(() => {
        if (!config || Object.keys(config).length === 0) config = chartDefaults[chartType] ?? chartDefaults['bar']
        if (!data || (Array.isArray(data) && data.length === 0)) data = defaultData
    })

    // 当图表类型切换且当前 config 与之前默认模板引用相同，自动替换为新类型默认模板，保证标题等同步
    let prevChartType = chartType
    $effect(() => {
        if (chartType !== prevChartType) {
            const prevDefaultRef = chartDefaults[prevChartType]
            const cfgObj: any = config
            const prevSeriesType = Array.isArray(cfgObj?.series) ? cfgObj.series[0]?.type : undefined

            // 如果当前 config 是模板映射（包含 chartDefaults 的所有键）
            const templateKeys = Object.keys(chartDefaults)
            const isTemplateMap = cfgObj && templateKeys.every((k) => k in cfgObj)
            if (isTemplateMap) {
                // 直接提取当前类型子配置作为新的 config，便于属性面板只显示当前图表配置
                config = JSON.parse(JSON.stringify(cfgObj[chartType] ?? chartDefaults[chartType] ?? chartDefaults['bar']))
            } else if (config === prevDefaultRef || prevSeriesType === prevChartType) {
                // 或者 config 与旧默认一致，也替换
                config = chartDefaults[chartType] ?? chartDefaults['bar']
            }

            // 如果 data 仍是默认数据引用，则重置为默认 (保留示例数据)
            if (data === defaultData) {
                data = defaultData
            }
            prevChartType = chartType
        }
    })
</script>

<!-- 使用一个禁用指针事件的包装层，确保仅图表本身可以交互 -->
<div class="wrapper" {style} {...rest} {id}>
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
