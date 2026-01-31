<script lang="ts">
    import { setContext } from 'svelte'
    import { dataMappingKeysStore } from '../../stores/data-mapping.store.svelte'
    import { cachedFetch } from '../../services/cache/cached-fetch'
    import { updateNodeProps } from '../../services/parser/property-panel.service'

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
        showToolPanel?: boolean
        enablePagination?: boolean
        pageSize?: number | string
        columnWidthMode?: 'balanced' | 'value' | 'chars'
        columnFixedPadding?: number
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
        showToolPanel = true,
        enablePagination = true,
        pageSize: initialPageSize = 20,
        columnWidthMode = 'balanced',
        columnFixedPadding = 100,
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

    let currentPage = $state(1)
    let pageSize = $state(Number(initialPageSize))
    let hiddenColumnIndices = $state(new Set<number>())
    let isColumnFilterOpen = $state(false)

    $effect(() => {
        pageSize = Number(initialPageSize)
    })

    let allHeaders = $derived.by(() => {
        const globalMode: 'balanced' | 'value' | 'chars' = columnWidthMode === 'chars' ? 'chars' : columnWidthMode === 'value' ? 'value' : 'balanced'

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
                    widthMode: globalMode,
                    widthValue: 0,
                    widthUnit: 'px'
                }
            }
            const widthValue = typeof h.widthValue === 'number' ? h.widthValue : 0
            const widthUnit = h.widthUnit === '%' ? '%' : 'px'

            return {
                label: h.label ?? '',
                frozen: globalMode === 'balanced' ? false : (h.frozen ?? false),
                previewLength: h.previewLength ?? 10,
                widthMode: globalMode,
                widthValue,
                widthUnit
            }
        })
    })

    let displayHeaders = $derived(allHeaders.filter((_, i) => !hiddenColumnIndices.has(i)))

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
    let horizontalScrollLeft = $state(0)
    let containerWidth = $state(0)

    $effect(() => {
        // Reset to first page when pageSize changes or pagination is disabled
        if (pageSize || !enablePagination) {
            currentPage = 1
        }
    })

    async function fetchTableData(path: string, forceRefresh = false) {
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
                    forceRefresh,
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

    function handleRefresh() {
        if (dataSource === 'real' && requestPath) {
            fetchTableData(requestPath, true)
        } else if (dataSource === 'mock' && mockPath) {
            fetchTableData(mockPath, true)
        } else if (dataSource === 'json') {
            isLoading = true
            setTimeout(() => {
                isLoading = false
            }, 500)
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
        if (isLoading) return [['数据加载中...']]
        if (loadError) return [[`加载失败: ${loadError}`]]
        if (dataSource === 'json') return displayBodyData

        if ((dataSource === 'mock' || dataSource === 'real') && tableData && tableData.isSuccess && Array.isArray(tableData.result)) {
            const resultData = tableData.result
            const mapping = dataSource === 'mock' ? mockSeriesMapping : requestSeriesMapping

            if (!mapping || mapping.length === 0) {
                return resultData.map((row: any) => {
                    const keys = Object.keys(row)
                    // Slice based on all headers, then filter hidden columns
                    const originalCols = keys.slice(0, allHeaders.length)
                    return originalCols.filter((_, i) => !hiddenColumnIndices.has(i)).map((key: string) => row[key] ?? '')
                })
            }

            return resultData.map((row: any) => {
                return mapping
                    .map((key, i) => ({ key, i }))
                    .filter(({ i }) => !hiddenColumnIndices.has(i))
                    .map(({ key }) => {
                        if (!key) return ''
                        return row[key] ?? ''
                    })
            })
        }
        return displayBodyData
    })

    let totalPage = $derived(Math.ceil(processedTableData.length / pageSize) || 1)

    let paginatedTableData = $derived.by(() => {
        const data = processedTableData
        if (!showToolPanel || !enablePagination) return data

        const start = (currentPage - 1) * pageSize
        const end = start + pageSize
        return data.slice(start, end)
    })

    let totalRecords = $derived(isLoading || loadError ? 0 : processedTableData.length)
    let startRecord = $derived(totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1)
    let endRecord = $derived(Math.min(currentPage * pageSize, totalRecords))

    let columnWidths = $derived.by(() => {
        const headers = displayHeaders as ColumnLabelConfig[]
        const count = headers.length
        if (count === 0) return []

        if (columnWidthMode === 'chars') {
            // In 'chars' mode, we use precise text measurement to sync header and body widths
            // This achieves the "auto" effect while keeping columns aligned across the physical DOM split
            let canvas: HTMLCanvasElement | null = null
            let context: CanvasRenderingContext2D | null = null

            if (typeof document !== 'undefined') {
                canvas = document.createElement('canvas')
                context = canvas.getContext('2d')
                if (context) {
                    context.font = '14px Microsoft YaHei, sans-serif' // Match default font
                }
            }

            const getWidth = (str: string) => {
                if (!context) return str.length * 14 // Fallback
                return context.measureText(str).width
            }

            const maxPixelWidths: number[] = new Array(count).fill(0)

            // Measure headers
            for (let i = 0; i < count; i++) {
                const h = headers[i]
                const label = h?.label ?? ''
                const w = getWidth(String(label))
                if (w > maxPixelWidths[i]) maxPixelWidths[i] = w
            }

            // Measure body content
            const rows = paginatedTableData as any[]
            if (Array.isArray(rows)) {
                for (const row of rows) {
                    if (!Array.isArray(row)) continue
                    for (let i = 0; i < count; i++) {
                        const v = row[i]
                        const w = getWidth(v == null ? '' : String(v))
                        if (w > maxPixelWidths[i]) maxPixelWidths[i] = w
                    }
                }
            }

            // Add padding (12px left + 12px right = 24px) + Border buffer
            const paddingBuffer = columnFixedPadding || 100

            return maxPixelWidths.map((w) => {
                const width = w + paddingBuffer
                return `calc(${width}px * var(--scale-ratio, 1))`
            })
        }

        const result: string[] = new Array(count).fill('')

        for (let i = 0; i < count; i++) {
            const h = headers[i]
            if (!h) continue

            const unit: 'px' | '%' = h.widthUnit === '%' ? '%' : 'px'
            const value = typeof h.widthValue === 'number' ? h.widthValue : 0

            if (columnWidthMode === 'value' && value > 0) {
                if (unit === '%') {
                    if (containerWidth > 0) {
                        result[i] = `${(value / 100) * containerWidth}px`
                    } else {
                        result[i] = `${value}%`
                    }
                } else {
                    result[i] = `calc(${value}px * var(--scale-ratio, 1))`
                }
            }
        }

        const hasAny = result.some((w) => w && w.length > 0)
        if (!hasAny) {
            if (containerWidth > 0) {
                const pxWidth = containerWidth / count
                return Array.from({ length: count }, () => `${pxWidth}px`)
            }
            const base = 100 / count
            return Array.from({ length: count }, () => `${base}%`)
        }

        const fallback = 100 / count
        return result.map((w) => {
            if (w && w.length > 0) return w
            if (containerWidth > 0) return `${containerWidth / count}px`
            return `${fallback}%`
        })
    })

    let allColumns = $derived.by(() => {
        return displayHeaders.map((h, i) => ({
            header: h,
            width: columnWidths[i],
            index: i,
            isFrozen: h && typeof h === 'object' && h.frozen
        }))
    })

    let frozenColumns = $derived(allColumns.filter((c) => c.isFrozen))
    let scrollableColumns = $derived(allColumns.filter((c) => !c.isFrozen))

    setContext('dynamic-table', {
        get headers() {
            return displayHeaders
        },
        get bodyData() {
            return paginatedTableData
        },
        get columnWidths() {
            return columnWidths
        },
        get numColumns() {
            return numColumns
        },
        get frozenColumns() {
            return frozenColumns
        },
        get scrollableColumns() {
            return scrollableColumns
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
        },
        get horizontalScrollLeft() {
            return horizontalScrollLeft
        },
        setHorizontalScrollLeft(value: number) {
            horizontalScrollLeft = value
        },
        get columnWidthMode() {
            return columnWidthMode
        }
    })
</script>

<svelte:window onclick={() => (isColumnFilterOpen = false)} />

<div class="dynamic-table-container {className}" {style} {id} {onclick} {...rest} bind:clientWidth={containerWidth}>
    {@render children?.()}
    {#if showToolPanel}
        <div class="tool-panel">
            {#if enablePagination}
                <div class="pagination-control">
                    <select
                        bind:value={pageSize}
                        onchange={() => {
                            if (id) {
                                updateNodeProps(id, { attributes: { pageSize: String(pageSize) } })
                            }
                        }}
                    >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={30}>30</option>
                        <option value={40}>40</option>
                        <option value={50}>50</option>
                    </select>

                    <div class="pagination-sep"></div>

                    <button type="button" class="pagination-btn" aria-label="First Page" title="First Page" class:disabled={currentPage <= 1} disabled={currentPage <= 1} onclick={() => (currentPage = 1)}>
                        <svg viewBox="0 0 16 16">
                            <path d="M2 3h2v10H2zm4 5l8-5v10z" fill="#666" />
                        </svg>
                    </button>
                    <button type="button" class="pagination-btn" aria-label="Previous Page" title="Previous Page" class:disabled={currentPage <= 1} disabled={currentPage <= 1} onclick={() => (currentPage = Math.max(1, currentPage - 1))}>
                        <svg viewBox="0 0 16 16">
                            <path d="M5 8l7-5v10z" fill="#666" />
                        </svg>
                    </button>

                    <div class="pagination-sep"></div>

                    <div class="pagination-info">
                        第 <input
                            type="text"
                            class="pagination-num"
                            value={currentPage}
                            onchange={(e) => {
                                const val = parseInt(e.currentTarget.value)
                                if (!isNaN(val)) {
                                    currentPage = Math.min(Math.max(1, val), totalPage)
                                } else {
                                    e.currentTarget.value = String(currentPage)
                                }
                            }}
                        />
                        共{totalPage}页
                    </div>

                    <div class="pagination-sep"></div>

                    <button type="button" class="pagination-btn" aria-label="Next Page" title="Next Page" class:disabled={currentPage >= totalPage} disabled={currentPage >= totalPage} onclick={() => (currentPage = Math.min(totalPage, currentPage + 1))}>
                        <svg viewBox="0 0 16 16">
                            <path d="M11 8l-7-5v10z" fill="#666" />
                        </svg>
                    </button>
                    <button type="button" class="pagination-btn" aria-label="Last Page" title="Last Page" class:disabled={currentPage >= totalPage} disabled={currentPage >= totalPage} onclick={() => (currentPage = totalPage)}>
                        <svg viewBox="0 0 16 16">
                            <path d="M12 3h2v10h-2zm-2 5l-8-5v10z" fill="#666" />
                        </svg>
                    </button>

                    <div class="pagination-sep"></div>

                    <button type="button" class="pagination-btn" aria-label="Refresh" title="Refresh" class:disabled={isLoading} disabled={isLoading} onclick={handleRefresh}>
                        <svg viewBox="0 0 16 16">
                            <path d="M8 3a5 5 0 0 1 5 5h-2a3 3 0 1 0-3 3v2a5 5 0 1 1 0-10z" fill="#666" />
                            <path d="M13 8l-3-3v6z" fill="#666" />
                        </svg>
                    </button>
                </div>
            {/if}

            <button
                type="button"
                class="column-filter-control"
                aria-label="Column Settings"
                title="Column Settings"
                onclick={(e) => {
                    e.stopPropagation()
                    isColumnFilterOpen = !isColumnFilterOpen
                }}
                aria-expanded={isColumnFilterOpen}
            >
                <div class="filter-icon">
                    <svg viewBox="0 0 16 16" fill="none" stroke="#666">
                        <rect x="3" y="3" width="10" height="10" rx="2" stroke-width="1.2" />
                        <path d="M8 5v6M5 8h6" stroke-width="1.2" stroke-linecap="round" />
                        <path d="M10 10l3 3" stroke-width="1.2" stroke-linecap="round" stroke="transparent" />
                    </svg>
                </div>
                <div class="filter-sep"></div>
                <div class="filter-arrow">
                    <svg viewBox="0 0 16 16" fill="none" stroke="#666">
                        <path d="M4 6l4 4 4-4" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                </div>

                {#if isColumnFilterOpen}
                    <div class="column-filter-panel" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="dialog" tabindex="-1">
                        {#each allHeaders as header, i}
                            {#if !(typeof header === 'object' && header.frozen)}
                                <div
                                    class="column-filter-item"
                                    onclick={() => {
                                        if (hiddenColumnIndices.has(i)) {
                                            hiddenColumnIndices.delete(i)
                                        } else {
                                            hiddenColumnIndices.add(i)
                                        }
                                        hiddenColumnIndices = new Set(hiddenColumnIndices)
                                    }}
                                    role="checkbox"
                                    aria-checked={!hiddenColumnIndices.has(i)}
                                    tabindex="0"
                                    onkeydown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault()
                                            if (hiddenColumnIndices.has(i)) {
                                                hiddenColumnIndices.delete(i)
                                            } else {
                                                hiddenColumnIndices.add(i)
                                            }
                                            hiddenColumnIndices = new Set(hiddenColumnIndices)
                                        }
                                    }}
                                >
                                    <div class="column-filter-check">
                                        {#if !hiddenColumnIndices.has(i)}
                                            <svg viewBox="0 0 16 16">
                                                <path d="M2 8l4 4 8-8" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                                            </svg>
                                        {/if}
                                    </div>
                                    <span class="column-filter-label">{typeof header === 'string' ? header : header.label}</span>
                                </div>
                            {/if}
                        {/each}
                    </div>
                {/if}
            </button>

            {#if enablePagination}
                <div class="record-info">
                    显示{startRecord}到{endRecord},共{totalRecords}记录
                </div>
            {/if}
        </div>
    {/if}
</div>

<style>
    .dynamic-table-container {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    .tool-panel {
        flex: 0 0 auto;
        width: 100%;
        height: calc(30px * var(--scale-ratio, 1));
        background: #f5f5f5;
        border-top: calc(1px * var(--scale-ratio, 1)) solid #dedede;
        box-sizing: border-box;
        display: flex;
        align-items: center;
        padding: 0 calc(6px * var(--scale-ratio, 1));
    }

    .pagination-control {
        display: flex;
        align-items: center;
        height: 100%;
    }

    .pagination-control select {
        height: calc(24px * var(--scale-ratio, 1));
        padding-left: calc(4px * var(--scale-ratio, 1));
        padding-right: calc(20px * var(--scale-ratio, 1));
        margin-right: calc(6px * var(--scale-ratio, 1));
        border: calc(1px * var(--scale-ratio, 1)) solid #dedede;
        border-radius: calc(2px * var(--scale-ratio, 1));
        background-color: white;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Cpath d='M1.5 2.5l4.5 4 4.5-4' stroke='%23666' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right calc(4px * var(--scale-ratio, 1)) center;
        background-size: calc(10px * var(--scale-ratio, 1));
        font-size: calc(12px * var(--scale-ratio, 1));
        color: #333;
        outline: none;
        box-sizing: border-box;
        appearance: none;
        -webkit-appearance: none;
        -moz-appearance: none;
        cursor: pointer;
    }

    .pagination-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: calc(24px * var(--scale-ratio, 1));
        height: calc(24px * var(--scale-ratio, 1));
        cursor: pointer;
        border-radius: calc(2px * var(--scale-ratio, 1));
        margin: 0 calc(1px * var(--scale-ratio, 1));
        border: none;
        background: none;
        padding: 0;
    }

    .pagination-btn:hover {
        background-color: rgb(201, 221, 245);
        border: calc(1px * var(--scale-ratio, 1)) solid rgb(201, 221, 245);
    }

    .pagination-btn svg {
        width: calc(16px * var(--scale-ratio, 1));
        height: calc(16px * var(--scale-ratio, 1));
    }

    .pagination-btn.disabled {
        opacity: 0.4;
        cursor: not-allowed;
        pointer-events: none;
        background-color: transparent;
        border-color: transparent;
    }

    .pagination-sep {
        width: calc(1px * var(--scale-ratio, 1));
        height: calc(16px * var(--scale-ratio, 1));
        background-color: #ccc;
        margin: 0 calc(2px * var(--scale-ratio, 1));
    }

    .record-info {
        font-size: calc(12px * var(--scale-ratio, 1));
        color: #333;
        margin-left: auto;
    }

    .pagination-info {
        font-size: calc(12px * var(--scale-ratio, 1));
        color: #333;
        display: flex;
        align-items: center;
        margin: 0 calc(8px * var(--scale-ratio, 1));
    }

    .pagination-num {
        width: calc(30px * var(--scale-ratio, 1));
        height: calc(22px * var(--scale-ratio, 1));
        border: calc(1px * var(--scale-ratio, 1)) solid #dedede;
        border-radius: calc(2px * var(--scale-ratio, 1));
        margin: 0 calc(4px * var(--scale-ratio, 1));
        text-align: center;
        outline: none;
        font-size: calc(12px * var(--scale-ratio, 1));
    }

    .column-filter-control {
        position: relative;
        display: flex;
        align-items: center;
        height: calc(24px * var(--scale-ratio, 1));
        margin: 0 calc(1px * var(--scale-ratio, 1));
        border: calc(1px * var(--scale-ratio, 1)) solid transparent;
        border-radius: calc(2px * var(--scale-ratio, 1));
        cursor: pointer;
        background: none;
        padding: 0;
    }

    .column-filter-control:hover {
        background-color: rgb(201, 221, 245);
        border: calc(1px * var(--scale-ratio, 1)) solid rgb(201, 221, 245);
    }

    .filter-icon,
    .filter-arrow {
        width: calc(16px * var(--scale-ratio, 1));
        height: calc(16px * var(--scale-ratio, 1));
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .filter-icon svg,
    .filter-arrow svg {
        width: calc(16px * var(--scale-ratio, 1));
        height: calc(16px * var(--scale-ratio, 1));
    }

    .filter-sep {
        width: calc(1px * var(--scale-ratio, 1));
        height: calc(14px * var(--scale-ratio, 1));
        background-color: transparent;
        margin: 0 calc(2px * var(--scale-ratio, 1));
    }

    .column-filter-control:hover .filter-sep {
        background-color: #ccc;
    }

    .column-filter-panel {
        position: absolute;
        bottom: 100%;
        left: 0;
        margin-bottom: calc(4px * var(--scale-ratio, 1));
        background: white;
        border: calc(1px * var(--scale-ratio, 1)) solid #dedede;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        border-radius: calc(2px * var(--scale-ratio, 1));
        padding: calc(4px * var(--scale-ratio, 1)) 0;
        z-index: 1000;
        min-width: calc(120px * var(--scale-ratio, 1));
        max-height: calc(300px * var(--scale-ratio, 1));
        overflow-y: auto;
    }

    .column-filter-item {
        display: flex;
        align-items: center;
        padding: calc(4px * var(--scale-ratio, 1)) calc(12px * var(--scale-ratio, 1));
        cursor: pointer;
        font-size: calc(12px * var(--scale-ratio, 1));
        color: #333;
        white-space: nowrap;
    }

    .column-filter-item:hover {
        background-color: #f5f5f5;
    }

    .column-filter-check {
        width: calc(16px * var(--scale-ratio, 1));
        margin-right: calc(8px * var(--scale-ratio, 1));
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .column-filter-check svg {
        width: calc(12px * var(--scale-ratio, 1));
        height: calc(12px * var(--scale-ratio, 1));
    }
</style>
