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

    // 默认数据：运行时从 blocks.config.json 提取，避免在代码里硬编码
    import blocksConfig from './blocks.config.json'

    function buildDefaultDataMap() {
        const map: Record<string, any> = {}
        const chartCfg: any = (blocksConfig as any[]).find((c) => c.type === 'ECharts')?.dataProps ?? {}
        for (const [ct, def] of Object.entries(chartCfg)) {
            const d: any = def
            if (ct === 'pie') {
                map[ct] = {
                    name: d?.name?.default ?? [],
                    value: d?.value?.default ?? []
                }
            } else {
                map[ct] = {
                    x: d?.x?.default ?? [],
                    y: d?.y?.default ?? []
                }
            }
        }
        return map
    }

    const defaultDataMap: Record<string, any> = buildDefaultDataMap()

    function getDefaultData(ct: string) {
        return defaultDataMap[ct] ?? defaultDataMap['bar']
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
        x?: any
        y?: any
        data?: any
        /** 饼图专用：名称数组 */
        name?: any
        /** 饼图专用：数值数组，与 name 对应 */
        value?: any
        theme?: any
        style?: string
        [key: string]: any
    }

    // Svelte 5 runes写法：直接在解构中初始化默认值
    let { id = crypto.randomUUID(), chartType = 'bar', config = chartDefaults[chartType] ?? chartDefaults['bar'], x = undefined, y = undefined, data = undefined, name = undefined, value = undefined, theme = 'light', style = '', ...rest } = $props() as Props

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

            const isPieChart = chartType === 'pie'

            // 首先如果组件显式传入 x/y 则优先使用
            if (x && Array.isArray(x)) xData = x
            if (y && Array.isArray(y)) yData = y

            // 若未显式传入，则回退到 data 结构解析
            let effectiveData: any = data
            if (!xData.length && !yData.length) {
                if (data == null) {
                    effectiveData = getDefaultData(chartType)
                }
                if (data && typeof data === 'object' && ['bar', 'line', 'pie'].every((k) => k in data)) {
                    effectiveData = (data as any)[chartType]
                }
            }

            const fillFromEffective = () => {
                if (isPieChart) {
                    if (Array.isArray(name) && Array.isArray(value)) {
                        yData = name.map((n: string, idx: number) => ({ name: n, value: value[idx] ?? 0 }))
                    } else if (effectiveData && typeof effectiveData === 'object') {
                        const names = Array.isArray((effectiveData as any).name) ? (effectiveData as any).name : []
                        const values = Array.isArray((effectiveData as any).value) ? (effectiveData as any).value : []
                        yData = names.map((n: string, idx: number) => ({ name: n, value: values[idx] ?? 0 }))
                    } else if (Array.isArray(effectiveData)) {
                        yData = effectiveData as any[]
                    }
                } else if (Array.isArray(effectiveData)) {
                    yData = effectiveData
                    xData = effectiveData.map((_, idx) => String(idx + 1))
                } else if (effectiveData && typeof effectiveData === 'object') {
                    if (!xData.length) xData = Array.isArray((effectiveData as any).x) ? (effectiveData as any).x : []
                    if (!yData.length) yData = Array.isArray((effectiveData as any).y) ? (effectiveData as any).y : []
                }
            }

            // 若两者皆空或有一方为空，则尝试补齐
            if (!xData.length || !yData.length) {
                fillFromEffective()
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
        if (!data || (Array.isArray(data) && data.length === 0)) data = getDefaultData(chartType)
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
            if (data && ['bar', 'line', 'pie'].every((k) => k in defaultDataMap) && Object.values(defaultDataMap).some((v) => v === data)) {
                data = getDefaultData(chartType)
            }

            // 清理上一类型专属的数据字段，避免沿用到新类型
            x = undefined
            y = undefined
            name = undefined
            value = undefined

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
