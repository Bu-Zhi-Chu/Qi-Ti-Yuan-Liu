<script lang="ts">
    import { Chart as ECharts } from 'svelte-echarts'
    import echartsInit from './echarts-core'
    import { cachedFetch } from '../../services/cache/cached-fetch'
    import * as echarts from 'echarts/core'
    import { graphic } from 'echarts'
    import { setEChartsInstance, removeEChartsInstance } from '../../services/component-instance/echarts-instance.service'

    let chartInstance = $state<any>(null)

    $effect(() => {
        if (chartInstance) {
            setEChartsInstance(id, chartInstance)
        } else {
            removeEChartsInstance(id)
        }
        return () => {
            removeEChartsInstance(id)
        }
    })

    // 定义API响应的接口
    interface ApiResponse<T = any> {
        isSuccess: boolean
        result: T
        isCache: boolean
        timestamp: number
        error?: any
    }

    // 被动事件监听器polyfill，优化性能警告
    if (typeof window !== 'undefined') {
        const originalAddEventListener = EventTarget.prototype.addEventListener
        EventTarget.prototype.addEventListener = function (type: string, listener: EventListener, options?: boolean | AddEventListenerOptions) {
            // 对于wheel和mousewheel事件，默认使用被动监听器
            if (type === 'wheel' || type === 'mousewheel') {
                if (typeof options === 'boolean') {
                    options = { passive: true, capture: options }
                } else if (typeof options === 'object' && options !== null) {
                    if (!options.hasOwnProperty('passive')) {
                        options.passive = true
                    }
                } else {
                    options = { passive: true }
                }
            }
            return originalAddEventListener.call(this, type, listener, options as any)
        }
    }

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
        /** 独立存储的序列化数据 */
        seriesData?: string[]
        /** 动态数据映射关系 */
        mockSeriesMapping?: string[]
        requestSeriesMapping?: string[]
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
    const { id = crypto.randomUUID(), code, theme = 'light', style = '', className, designWidth: propDesignWidth, designHeight: propDesignHeight, renderer = false, ...restProps } = $props() as Props

    // 导入必要的服务和存储
    import { screenDetector } from '../../services/screen/screen-detector.service'
    import DexieService from '../../services/database/dexie-service'
    import { projectId, getDesignSize } from '../../stores/dom-tree.store.svelte'
    import { get } from 'svelte/store'
    import { dataMappingKeysStore } from '../../stores/data-mapping.store.svelte'

    // 当前缩放比例
    let scaleRatio = $state({ width: 1, height: 1 })
    let containerRef: HTMLDivElement | null = null
    let chartReady = $state(false)

    // 检查容器是否有有效尺寸
    function checkContainerSize(): boolean {
        if (!containerRef) return false
        const rect = containerRef.getBoundingClientRect()
        return rect.width > 0 && rect.height > 0
    }

    // 计算并应用缩放比例
    async function refreshScale() {
        if (!containerRef) return

        // 优先使用props中的设计尺寸，如果没有则使用store中的设计尺寸
        const storeDesignSize = getDesignSize()
        const designWidth = propDesignWidth ?? storeDesignSize.width ?? 1920
        const designHeight = propDesignHeight ?? storeDesignSize.height ?? 1080

        // 调试日志：输出实际使用的尺寸值
        // console.log(`[ECharts] 设计尺寸: ${designWidth}x${designHeight}, prop尺寸: ${propDesignWidth}x${propDesignHeight}, store尺寸: ${storeDesignSize.width}x${storeDesignSize.height}`)

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

    // 监听窗口大小变化和项目尺寸变化
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

        // 监听项目ID变化，当项目切换时重新计算尺寸
        const unsubscribeProject = projectId.subscribe(async () => {
            await refreshScale()
        })

        // 等待容器准备好
        const checkReady = () => {
            if (checkContainerSize()) {
                chartReady = true
            } else {
                // 如果容器还没准备好，稍后重试
                setTimeout(checkReady, 100)
            }
        }

        // 使用 requestAnimationFrame 确保 DOM 已经渲染
        requestAnimationFrame(() => {
            checkReady()
        })

        return () => {
            window.removeEventListener('resize', handleResize)
            window.removeEventListener('pageshow', handlePageshow)
            unsubscribeProject()
        }
    })

    // 调试：检查code属性是否被正确传递
    // $effect(() => {
    //     console.log('ECharts component received code:', code)
    //     console.log('ECharts component received all props:', { id, code, theme, style, className, ...restProps })
    // })

    // 安全执行JavaScript代码并返回option对象
    function executeJavaScriptCode(code: string, data?: { [key: string]: any[] } | null, seriesMapping?: string[]): any {
        try {
            // 创建一个安全的执行环境，包含echarts图形功能和数据
            const sandbox = {
                option: undefined,
                data: data, // 添加预处理后的数据到沙箱环境
                console: console,
                Math: Math,
                Array: Array,
                Object: Object,
                String: String,
                Number: Number,
                Date: Date,
                echarts: {
                    graphic: graphic
                }
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

            // 如果有数据映射，则应用它
            if (result && Array.isArray(seriesMapping) && data) {
                // 先提取出所有的data数组，保持它们在代码中的原始顺序
                const dataMatches = extractDataMatches(code)

                console.log('需要映射的数组数量:', dataMatches.length)

                // 第X映射对应第X个data数组（按代码中出现顺序）
                dataMatches.forEach((match, index) => {
                    const mappingPath = seriesMapping[index]
                    console.log(`\n第${index}个映射:`)
                    console.log(`  映射路径: ${mappingPath}`)
                    console.log(`  原数据: ${match[1]}`)

                    if (mappingPath && data[mappingPath]) {
                        let targetData = data[mappingPath]
                        console.log(`  映射数据:`, targetData)

                        // 数据长度兼容性处理
                        if (Array.isArray(targetData)) {
                            // 解析原始data数组的长度
                            let originalLength = 0
                            try {
                                const parsedOriginal = JSON.parse(match[1])
                                originalLength = Array.isArray(parsedOriginal) ? parsedOriginal.length : 0
                            } catch (e) {
                                // 解析失败，使用默认值
                            }

                            // 移除数据长度限制 - 保持数据原始长度
                            // if (originalLength > 0 && targetData.length !== originalLength) {
                            //     if (targetData.length > originalLength) {
                            //         // 目标数据更长，截断
                            //         targetData = targetData.slice(0, originalLength)
                            //         console.log(`  数据过长，截断为前${originalLength}个`)
                            //     } else {
                            //         // 目标数据更短，用最后一个值填充
                            //         const lastValue = targetData[targetData.length - 1]
                            //         while (targetData.length < originalLength) {
                            //             targetData.push(lastValue)
                            //         }
                            //         console.log(`  数据过短，填充到${originalLength}个`)
                            //     }
                            // }
                        }

                        // 找到这个data在result中的位置并替换
                        let replaced = false

                        // 首先尝试解析原始data字符串 - 处理单引号情况
                        let originalData: any
                        try {
                            // 将单引号替换为双引号，使其成为有效的JSON
                            const jsonString = match[1].replace(/'/g, '"')
                            originalData = JSON.parse(jsonString)
                        } catch (e) {
                            // 如果JSON解析失败，尝试作为数组字面量执行
                            try {
                                // 使用Function构造器安全地执行数组表达式
                                originalData = new Function('return ' + match[1])()
                            } catch (e2) {
                                // 最后降级为字符串比较
                                originalData = match[1]
                            }
                        }

                        // 检查series中的data
                        if (result.series && Array.isArray(result.series)) {
                            result.series.forEach((s: any) => {
                                if (JSON.stringify(s.data) === JSON.stringify(originalData)) {
                                    s.data = targetData
                                    replaced = true
                                }
                            })
                        }

                        // 检查xAxis中的data
                        if (result.xAxis && result.xAxis.data) {
                            if (JSON.stringify(result.xAxis.data) === JSON.stringify(originalData)) {
                                result.xAxis.data = targetData
                                replaced = true
                            }
                        }

                        // 检查yAxis中的data（如果有的话）
                        if (result.yAxis && result.yAxis.data) {
                            if (JSON.stringify(result.yAxis.data) === JSON.stringify(originalData)) {
                                result.yAxis.data = targetData
                                replaced = true
                            }
                        }

                        // 添加详细的匹配调试信息
                        if (!replaced) {
                            console.log(`  匹配调试:`)
                            console.log(`    原始数据:`, JSON.stringify(originalData))
                            console.log(`    xAxis.data:`, result.xAxis?.data ? JSON.stringify(result.xAxis.data) : '无')
                            console.log(
                                `    series数据:`,
                                result.series?.map((s: any, i: number) => `series[${i}]: ${JSON.stringify(s.data)}`)
                            )
                            console.log(`    匹配结果:`, JSON.stringify(originalData) === JSON.stringify(result.xAxis?.data) ? 'xAxis匹配' : 'xAxis不匹配')
                        }

                        console.log(`  替换结果: ${replaced ? '成功' : '未找到对应位置'}`)
                    } else {
                        console.log(`  映射数据: 未找到 (${mappingPath ? '路径存在但数据为空' : '无映射路径'})`)
                    }
                })

                // 添加详细的调试信息来查看result结构
                // console.log('\n=== 详细结构分析 ===')
                // console.log('result对象:', JSON.stringify(result, null, 2))
                // console.log('\n所有data数组:')
            }

            return result
        } catch (error) {
            console.error('JavaScript代码执行错误:', error)
            return null
        }
    }

    // 数据状态管理
    let realData = $state<any>(null)
    let isLoading = $state(false)
    let loadError = $state<string | null>(null)

    // 新增：预处理后的数据
    const processedData = $derived(() => {
        if (!realData || !realData.isSuccess || !Array.isArray(realData.result) || realData.result.length === 0) {
            return null
        }
        const keys = Object.keys(realData.result[0])
        const pData: { [key: string]: any[] } = {}
        for (const key of keys) {
            pData[key] = realData.result.map((item: any) => item[key])
        }
        return pData
    })

    let chartData: ApiResponse | null = $state(null)

    // 数据请求函数
    async function fetchRealData(requestPath: string) {
        if (!requestPath || requestPath.trim() === '') {
            chartData = null
            return
        }

        isLoading = true
        loadError = null

        try {
            const data = await cachedFetch(
                requestPath,
                {},
                {
                    onUpdate: (updatedData) => {
                        if (JSON.stringify(updatedData) !== JSON.stringify(data)) {
                            console.log('数据有变，更新UI')
                            chartData = updatedData
                        }
                    }
                }
            )
            chartData = data
        } catch (error) {
            console.error('数据请求失败:', error)
            loadError = error instanceof Error ? error.message : '数据请求失败'
            chartData = null
        } finally {
            isLoading = false
        }
    }

    // 监听数据相关属性变化，发起真实请求
    $effect(() => {
        const dataSource = restProps.dataSource || restProps.dataAccess || 'json'
        const requestPath = restProps.requestPath
        const mockPath = restProps.mockPath

        const handleDataFetch = (path: string | undefined) => {
            if (!path) {
                chartData = null
                return
            }
            fetchRealData(path)
        }

        if (dataSource === 'real' && requestPath) {
            handleDataFetch(requestPath)
        } else if (dataSource === 'mock' && mockPath) {
            handleDataFetch(mockPath)
        } else {
            chartData = null
        }
    })

    // 监听 chartData 变化，处理副作用
    $effect(() => {
        const data = chartData
        realData = data

        if (data && data.isSuccess && Array.isArray(data.result) && data.result.length > 0) {
            const keys = Object.keys(data.result[0])
            dataMappingKeysStore.setKeys(id, keys)
        } else {
            dataMappingKeysStore.clearKeys(id)
        }
    })

    // 导入序列提取服务
    import { extractSeriesFromCode, getSeriesCount, extractDataMatches } from '../../services/property-panel/series-extractor.service'

    // 防抖控制：避免短时间内多次触发option计算
    let optionUpdateTimestamp = 0
    let lastOptionValue: any = null

    // 最终 ECharts option，支持JavaScript代码和真实数据
    const option = $derived(
        (() => {
            // 获取数据配置 - 注意：保存的是dataSource，但组件内部使用dataAccess
            const dataSource = restProps.dataSource || restProps.dataAccess || 'json'
            const requestPath = restProps.requestPath
            const seriesData = restProps.seriesData as string[] | undefined

            // 准备最终执行的 code
            let finalCode = code
            let legendData: string[] | null | undefined = null

            // 如果是虚拟数据模式，且有独立数据源，则进行数据覆盖（不再使用正则直接替换代码）
            if (dataSource === 'json' && finalCode && seriesData && seriesData.length > 0) {
                // 直接执行代码，稍后根据 seriesData 覆盖结果
                const extraction = extractSeriesFromCode(finalCode, seriesData)
                legendData = extraction.legendData
            } else {
                // 其他模式直接执行原始 code
            }

            // 如果数据源是真实请求或模拟接口
            if (dataSource === 'real' || dataSource === 'mock') {
                // 如果正在加载，显示加载状态
                if (isLoading) {
                    return {
                        title: {
                            text: '数据加载中...',
                            left: 'center',
                            top: 'middle',
                            textStyle: {
                                fontSize: 14,
                                color: '#666'
                            }
                        },
                        series: []
                    }
                }

                // 如果有错误，显示错误信息
                if (loadError) {
                    return {
                        title: {
                            text: `数据加载失败: ${loadError}`,
                            left: 'center',
                            top: 'middle',
                            textStyle: {
                                fontSize: 12,
                                color: '#ff4d4f'
                            }
                        },
                        series: []
                    }
                }

                // 如果提供了JavaScript代码，执行代码生成option（传入真实数据）
                if (finalCode && typeof finalCode === 'string' && finalCode.trim()) {
                    let seriesMapping: string[] | undefined
                    if (dataSource === 'real') {
                        seriesMapping = restProps.requestSeriesMapping
                    } else if (dataSource === 'mock') {
                        seriesMapping = restProps.mockSeriesMapping
                    }

                    const codeResult = executeJavaScriptCode(finalCode, processedData(), seriesMapping)
                    if (codeResult && typeof codeResult === 'object') {
                        // 处理标题和图例的默认位置
                        return processOptionDefaults(codeResult)
                    }
                }

                // 如果没有提供JavaScript代码但有真实数据，使用默认配置
                if (realData) {
                    const titleText = dataSource === 'mock' ? '模拟数据图表' : '真实数据图表'
                    return {
                        title: {
                            text: titleText,
                            left: 'center',
                            top: 20
                        },
                        tooltip: {
                            trigger: 'axis'
                        },
                        xAxis: {
                            type: 'category'
                        },
                        yAxis: {
                            type: 'value'
                        },
                        series: [
                            {
                                name: '数据',
                                type: 'line',
                                data: realData
                            }
                        ]
                    }
                }
            }

            // 默认的虚拟数据逻辑（原有的json模式）
            // 如果提供了JavaScript代码，执行代码生成option
            if (finalCode && typeof finalCode === 'string' && finalCode.trim()) {
                const codeResult = executeJavaScriptCode(finalCode)
                if (codeResult && typeof codeResult === 'object') {
                    // ---------- 新增：根据 props.seriesData 覆盖结果 ----------
                    if (dataSource === 'json' && Array.isArray(seriesData) && seriesData.length > 0) {
                        // 约定映射：
                        //    1) 若已存在 legend（legendData 非空或 codeResult 自带 legend），则
                        //       0 => legend.data，1 => xAxis.data，2+ => series[i-2].data
                        //    2) 否则（无 legend），则
                        //       0 => xAxis.data，1+ => series[i-1].data
                        const hasLegend = (legendData && legendData.length > 0) || !!codeResult.legend
                        const parseArr = (str: string) => {
                            try {
                                return JSON.parse(str)
                            } catch {
                                try {
                                    return new Function('return ' + str)()
                                } catch {
                                    return null
                                }
                            }
                        }
                        let dataStartIdx = 0
                        // legend 映射
                        if (hasLegend) {
                            if (seriesData[0]) {
                                const ld = parseArr(seriesData[0])
                                if (ld && Array.isArray(ld)) {
                                    if (!codeResult.legend) codeResult.legend = {}
                                    codeResult.legend.data = ld
                                }
                            }
                            dataStartIdx = 1 // xAxis 开始于索引 1
                        }
                        // xAxis 映射
                        if (seriesData[dataStartIdx]) {
                            const xd = parseArr(seriesData[dataStartIdx])
                            if (xd && Array.isArray(xd)) {
                                if (!codeResult.xAxis) codeResult.xAxis = { type: 'category' }
                                if (Array.isArray(codeResult.xAxis)) {
                                    codeResult.xAxis[0].data = xd
                                } else {
                                    codeResult.xAxis.data = xd
                                }
                            }
                        }
                        // series
                        if (codeResult.series && Array.isArray(codeResult.series)) {
                            codeResult.series.forEach((s: any, idx: number) => {
                                const targetStr = seriesData[idx + dataStartIdx + 1]
                                if (targetStr) {
                                    const parsed = parseArr(targetStr)
                                    if (parsed && Array.isArray(parsed)) {
                                        s.data = parsed
                                    }
                                }
                            })
                        }
                    }
                    // 调试输出：查看更新后的legend数据
                    if (dataSource === 'json' && codeResult.legend && codeResult.legend.data) {
                        console.log(`[ECharts] 使用更新后的legend数据同步系列名称:`, codeResult.legend.data)
                    }
                    // 如果是json模式，并且已经有更新后的legend数据，则用它来覆盖series.name
                    // 使用更新后的codeResult.legend.data，而不是从代码提取的legendData
                    if (dataSource === 'json' && codeResult.legend && codeResult.legend.data && Array.isArray(codeResult.legend.data) && codeResult.series && Array.isArray(codeResult.series)) {
                        codeResult.series.forEach((s: any, i: number) => {
                            if (codeResult.legend.data[i]) {
                                const oldName = s.name
                                s.name = codeResult.legend.data[i]
                                // 调试输出：记录系列名称的变更
                                if (oldName !== s.name) {
                                    console.log(`[ECharts] 系列 ${i} 名称更新: "${oldName}" -> "${s.name}"`)
                                }
                            }
                        })
                    }
                    // === 调试输出：查看最终 option 中的数据 ===
                    // 添加防抖：只在数据真正有变化时才打印日志
                    const codeResultStr = JSON.stringify(codeResult)
                    const lastOptionStr = JSON.stringify(lastOptionValue)
                    if (codeResultStr !== lastOptionStr) {
                        console.log('[ECharts] option(after seriesData override):', codeResult)
                        lastOptionValue = codeResult
                    }
                    /* ---------- 自动补全 legend.data（仅 json 模式且用户未写时） ---------- */
                    if (dataSource === 'json' && codeResult.series && codeResult.series.length > 0) {
                        // 只有用户没写 legend.data 时才自动填充
                        const needFillLegend = !codeResult.legend || !Array.isArray(codeResult.legend.data) || codeResult.legend.data.length === 0
                        if (needFillLegend) {
                            if (!codeResult.legend) codeResult.legend = {}
                            codeResult.legend.data = codeResult.series.map((s: any) => s.name || '')
                            console.log('[ECharts] 自动填充 legend.data:', codeResult.legend.data)
                        }
                    }

                    // 处理标题和图例的默认位置
                    return processOptionDefaults(codeResult)
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
                    type: 'category'
                },
                yAxis: {
                    type: 'value'
                },
                series: []
            }
        })()
    )

    // 辅助函数：通过路径字符串从对象中获取值
    function getByPath(obj: any, path: string): any {
        try {
            return path.split('.').reduce((acc, part) => acc && acc[part], obj)
        } catch (e) {
            console.error(`Error getting data by path: ${path}`, e)
            return null
        }
    }

    // 处理标题和图例的默认位置
    function processOptionDefaults(option: any): any {
        // 深拷贝option对象，避免修改原始对象
        const processedOption = JSON.parse(JSON.stringify(option))

        // 如果存在标题但没有位置信息，设置为顶部居中
        if (processedOption.title && !processedOption.title.left && !processedOption.title.x) {
            processedOption.title.left = 'center'
            processedOption.title.top = 20 // 距离顶部20像素
        }

        // 如果存在图例但没有位置信息，设置为底部居中
        if (processedOption.legend && !processedOption.legend.bottom && !processedOption.legend.top && !processedOption.legend.left && !processedOption.legend.right && !processedOption.legend.x) {
            processedOption.legend.bottom = 20 // 距离底部20像素
            processedOption.legend.left = 'center'
        }

        return processedOption
    }
</script>

<!-- 外层容器用于应用缩放变换         bind:chart={chartInstance} -->
<div class="scale-container" bind:this={containerRef}>
    <!-- 使用一个禁用指针事件的包装层，确保仅图表本身可以交互 -->
    <div class="wrapper" {style} {...restProps} {id}>
        {#if chartReady}
            <ECharts
                class="chart"
                bind:chart={chartInstance}
                options={option}
                theme={theme as any}
                init={((dom: HTMLElement, theme?: string, opts?: any) => {
                    // renderer为true时使用canvas（最高性能），为false时使用svg
                    const rendererType = renderer ? 'canvas' : 'svg'
                    return echartsInit(dom, theme, { ...opts, renderer: rendererType })
                }) as any}
            />
        {/if}

        <!-- 加载状态指示器 -->
        {#if isLoading}
            <div class="loading-overlay">
                <div class="loading-spinner"></div>
                <div class="loading-text">数据加载中...</div>
            </div>
        {/if}
    </div>
</div>

<style>
    /* 外层缩放容器 */
    .scale-container {
        position: relative;
        transform-origin: left top;
        overflow: hidden;
        min-width: 100px;
        min-height: 100px;
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

    /* 加载状态覆盖层 */
    .loading-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    }

    .loading-spinner {
        width: 40px;
        height: 40px;
        border: 4px solid rgba(255, 255, 255, 0.3);
        border-top: 4px solid #ffffff;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 16px;
    }

    .loading-text {
        color: #ffffff;
        font-size: 14px;
        font-weight: 500;
    }

    @keyframes spin {
        0% {
            transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
        }
    }
</style>
