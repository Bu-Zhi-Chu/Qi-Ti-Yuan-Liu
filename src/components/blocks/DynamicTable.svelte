<script lang="ts">
    import { setContext } from 'svelte'
    import { dataMappingKeysStore } from '../../stores/data-mapping.store.svelte'
    import { cachedFetch } from '../../services/cache/cached-fetch'

    import type { Snippet } from 'svelte'

    interface ColumnLabelConfig {
        label: string
        frozen: boolean
        previewLength?: number
        widthMode?: 'balanced' | 'value' | 'chars'
        widthValue?: number
        widthUnit?: 'px' | '%'
    }

    interface Props {
        id?: string
        hideScrollbar?: boolean
        alternateRow?: boolean
        columnLabels?: (string | ColumnLabelConfig)[]
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
        hideScrollbar: _hideScrollbar = false,
        alternateRow = false,
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

    let displayHeaders = $derived.by(() => {
        let raw: (string | ColumnLabelConfig)[] = []
        if (columnLabels && columnLabels.length > 0) {
            raw = columnLabels
        } else if (headers && headers.length > 0) {
            raw = headers
        } else if (bodyData && bodyData.length > 0 && bodyData[0].length > 0) {
            raw = Array.from({ length: bodyData[0].length }, (_, i) => `列${i + 1}`)
        } else {
            raw = ['列1', '列2', '列3']
        }

        return raw.map((h) => {
            if (typeof h === 'string') {
                return {
                    label: h,
                    frozen: false,
                    previewLength: 10,
                    widthMode: 'balanced',
                    widthValue: 0,
                    widthUnit: 'px'
                }
            }
            const rawMode = (h as any).widthMode
            const widthMode: 'balanced' | 'value' | 'chars' = rawMode === 'chars' ? 'chars' : rawMode === 'value' ? 'value' : 'balanced'
            const widthValue = typeof h.widthValue === 'number' ? h.widthValue : 0
            const widthUnit = h.widthUnit === '%' ? '%' : 'px'

            return {
                label: h.label ?? '',
                frozen: h.frozen ?? false,
                previewLength: h.previewLength ?? 10,
                widthMode,
                widthValue,
                widthUnit
            }
        })
    })

    let displayBodyData = $derived.by(() => {
        if (bodyData && bodyData.length > 0) return bodyData
        const numCols = displayHeaders.length
        const numRows = 50
        const baseText = '一二三四五六七八九十'

        return Array.from({ length: numRows }, (_, rowIndex) =>
            Array.from({ length: numCols }, (_, colIndex) => {
                const col = displayHeaders[colIndex]
                const len = col && typeof col === 'object' && col.previewLength ? col.previewLength : 0

                if (len > 0) {
                    let result = ''
                    while (result.length < len) {
                        result += baseText
                    }
                    return result.slice(0, len)
                }

                return `示例 ${rowIndex + 1}-${colIndex + 1}`
            })
        )
    })

    let numColumns = $derived(displayHeaders.length)

    let tableData = $state<any>(null)
    let isLoading = $state(false)
    let loadError = $state<string | null>(null)
    let hasVerticalScrollbar = $state(false)
    let verticalScrollbarWidth = $state(0)

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
            console.error('[DynamicTable] 数据请求失败:', error)
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

    let columnWidths = $derived.by(() => {
        const headers = displayHeaders as ColumnLabelConfig[]
        const count = headers.length
        if (count === 0) return []

        const result: string[] = new Array(count).fill('')

        for (let i = 0; i < count; i++) {
            const h = headers[i]
            if (!h) continue

            const mode: 'balanced' | 'value' | 'chars' = h.widthMode === 'chars' ? 'chars' : h.widthMode === 'value' ? 'value' : 'balanced'
            const unit: 'px' | '%' = h.widthUnit === '%' ? '%' : 'px'
            const value = typeof h.widthValue === 'number' ? h.widthValue : 0

            if (mode === 'value' && value > 0) {
                if (unit === '%') {
                    result[i] = `${value}%`
                } else {
                    result[i] = `calc(${value}px * var(--scale-ratio, 1))`
                }
            }
        }

        const hasAny = result.some((w) => w && w.length > 0)
        if (!hasAny) {
            const base = 100 / count
            return Array.from({ length: count }, () => `${base}%`)
        }

        const fallback = 100 / count
        return result.map((w) => (w && w.length > 0 ? w : `${fallback}%`))
    })

    setContext('dynamic-table', {
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
        get alternateRow() {
            return alternateRow
        },
        get hasVerticalScrollbar() {
            return hasVerticalScrollbar
        },
        setHasVerticalScrollbar(value: boolean) {
            hasVerticalScrollbar = value
        },
        get verticalScrollbarWidth() {
            return verticalScrollbarWidth
        },
        setVerticalScrollbarWidth(value: number) {
            verticalScrollbarWidth = value
        }
    })
</script>

<div class="dynamic-table-container {className}" {style} {id} {onclick} {...rest}>
    {@render children?.()}
</div>

<style>
    .dynamic-table-container {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }
</style>
