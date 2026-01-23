<script lang="ts">
    import { setContext } from 'svelte'
    import { dataMappingKeysStore } from '../../stores/data-mapping.store.svelte'
    import { cachedFetch } from '../../services/cache/cached-fetch'

    import type { Snippet } from 'svelte'

    interface Props {
        id?: string
        hideScrollbar?: boolean
        alternateRow?: boolean
        dateWrap?: boolean
        smartSizing?: boolean
        smartSizingFactor?: number
        columnLabels?: string[]
        headers?: string[]
        bodyData?: (string | number)[][]
        dataSource?: string
        requestPath?: string
        mockPath?: string
        requestSeriesMapping?: string[]
        mockSeriesMapping?: string[]
        style?: string
        class?: string
        children?: Snippet
        onclick?: (event: MouseEvent) => void
        [key: string]: any
    }

    let {
        id = '',
        hideScrollbar = true,
        alternateRow = false,
        dateWrap = true,
        smartSizing = false,
        smartSizingFactor = 1,
        columnLabels = [],
        headers = [],
        bodyData = [],
        dataSource = 'json',
        requestPath = '',
        mockPath = '',
        requestSeriesMapping = [],
        mockSeriesMapping = [],
        style = '',
        class: className = '',
        children,
        onclick,
        ...rest
    }: Props = $props()

    // 默认数据逻辑 (与 DynamicTable 保持一致)
    let displayHeaders = $derived.by(() => {
        if (columnLabels && columnLabels.length > 0) return columnLabels
        if (headers && headers.length > 0) return headers
        if (bodyData && bodyData.length > 0 && bodyData[0].length > 0) {
            return Array.from({ length: bodyData[0].length }, (_, i) => `列${i + 1}`)
        }
        return ['列1', '列2', '列3']
    })

    let displayBodyData = $derived.by(() => {
        if (bodyData && bodyData.length > 0) return bodyData
        const numCols = displayHeaders.length
        const numRows = 50
        return Array.from({ length: numRows }, (_, rowIndex) => Array.from({ length: numCols }, (_, colIndex) => `示例 ${rowIndex + 1}-${colIndex + 1}`))
    })

    let numColumns = $derived(displayHeaders.length)

    // 数据查询状态管理
    let tableData = $state<any>(null)
    let isLoading = $state(false)
    let loadError = $state<string | null>(null)

    async function fetchTableData(path: string) {
        if (!path || path.trim() === '') {
            tableData = null
            return
        }
        isLoading = true
        loadError = null
        try {
            const data = await cachedFetch(
                path,
                {},
                {
                    onUpdate: (updatedData: any) => {
                        if (JSON.stringify(updatedData) !== JSON.stringify(data)) {
                            tableData = updatedData
                        }
                    }
                }
            )
            tableData = data
        } catch (error) {
            console.error('[FlexibleTable] 数据请求失败:', error)
            loadError = error instanceof Error ? error.message : '数据请求失败'
            tableData = null
        } finally {
            isLoading = false
        }
    }

    $effect(() => {
        const handleDataFetch = (path: string | undefined) => {
            if (!path) {
                tableData = null
                return
            }
            fetchTableData(path)
        }

        if (dataSource === 'real' && requestPath) {
            handleDataFetch(requestPath)
        } else if (dataSource === 'mock' && mockPath) {
            handleDataFetch(mockPath)
        } else {
            tableData = null
        }
    })

    $effect(() => {
        const data = tableData
        if (data && data.isSuccess && Array.isArray(data.result) && data.result.length > 0) {
            const keys = Object.keys(data.result[0])
            dataMappingKeysStore.setKeys(id, keys)
        } else {
            dataMappingKeysStore.clearKeys(id)
        }
    })

    let processedTableData = $derived.by(() => {
        if (dataSource === 'json') return displayBodyData
        if (isLoading) return [['数据加载中...']]
        if (loadError) return [[`加载失败: ${loadError}`]]

        if ((dataSource === 'mock' || dataSource === 'real') && tableData && tableData.isSuccess && Array.isArray(tableData.result)) {
            const resultData = tableData.result
            const mapping = dataSource === 'mock' ? mockSeriesMapping : requestSeriesMapping

            if (!mapping || mapping.length === 0) {
                return resultData.slice(0, 10).map((row: any) => {
                    const keys = Object.keys(row)
                    return keys.slice(0, numColumns).map((key: string) => row[key] ?? '')
                })
            }

            return resultData.slice(0, 50).map((row: any) => {
                return mapping.map((key: string) => {
                    if (!key) return ''
                    return row[key] ?? ''
                })
            })
        }
        return displayBodyData
    })

    function getVisualLength(str: any) {
        if (str === null || str === undefined) return 0
        const s = String(str)
        let len = 0
        for (let i = 0; i < s.length; i++) {
            const code = s.charCodeAt(i)
            if (code > 255) {
                len += 2
            } else {
                len += 1
            }
        }
        return len
    }

    let columnWidths = $derived.by(() => {
        if (!smartSizing) return []
        const cols = numColumns
        if (cols === 0) return []

        const lengths = new Array(cols).fill(0)

        // Headers
        displayHeaders.forEach((h, i) => {
            if (i < cols) lengths[i] = Math.max(lengths[i], getVisualLength(h))
        })

        // Body (sample top 50 rows)
        processedTableData.slice(0, 50).forEach((row: any[]) => {
            row.forEach((cell: any, i: number) => {
                if (i < cols) lengths[i] = Math.max(lengths[i], getVisualLength(cell))
            })
        })

        const minLength = 4 // Minimum weight
        const factor = Math.max(0.1, Math.min(10, smartSizingFactor))

        // Apply factor to dampen or exaggerate the differences
        // We want to scale the deviation from the mean?
        // Or simply power? length^factor
        // If factor > 1, differences are exaggerated.
        // If factor < 1, differences are dampened (closer to equal width).
        // Let's use power function.

        const weightedLengths = lengths.map((l) => Math.pow(Math.max(l, minLength), factor))

        const totalLength = weightedLengths.reduce((a, b) => a + b, 0)
        if (totalLength === 0) return []

        return weightedLengths.map((l) => (l / totalLength) * 100)
    })

    // 提供上下文给子组件
    setContext('flexible-table', {
        get headers() {
            return displayHeaders
        },
        get bodyData() {
            return processedTableData
        },
        get columnWidths() {
            return columnWidths
        },
        get numColumns() {
            return numColumns
        },
        get hideScrollbar() {
            return hideScrollbar
        },
        get alternateRow() {
            return alternateRow
        },
        get dateWrap() {
            return dateWrap
        }
    })
</script>

<div class="flexible-table-container {className}" class:hide-scrollbar={hideScrollbar} {style} {id} {onclick} {...rest}>
    {@render children?.()}
</div>

<style>
    .flexible-table-container {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        --ft-scrollbar-width: calc(6px * var(--scale-ratio, 1)); /* 定义滚动条宽度 */
    }

    /* 隐藏滚动条但保留滚动功能 */
    :global(.flexible-table-container.hide-scrollbar *::-webkit-scrollbar) {
        display: none;
    }
    :global(.flexible-table-container.hide-scrollbar *) {
        -ms-overflow-style: none; /* IE and Edge */
        scrollbar-width: none; /* Firefox */
    }

    /* 显示滚动条时的自定义样式，确保宽度固定以便对齐 */
    :global(.flexible-table-container:not(.hide-scrollbar) *::-webkit-scrollbar) {
        width: var(--ft-scrollbar-width);
        height: var(--ft-scrollbar-width);
    }
    :global(.flexible-table-container:not(.hide-scrollbar) *::-webkit-scrollbar-track) {
        background: transparent;
    }
    :global(.flexible-table-container:not(.hide-scrollbar) *::-webkit-scrollbar-thumb) {
        background-color: rgba(255, 255, 255, 0.2);
        border-radius: var(--ft-scrollbar-width);
    }
    :global(.flexible-table-container:not(.hide-scrollbar) *::-webkit-scrollbar-thumb:hover) {
        background-color: rgba(255, 255, 255, 0.3);
    }
</style>
