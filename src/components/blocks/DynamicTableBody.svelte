<script lang="ts">
    import { getContext, setContext, onDestroy, onMount } from 'svelte'
    import type { Snippet } from 'svelte'
    import { getImage } from '../../services/database/image-store.service'
    import { projectId } from '../../stores/dom-tree.store.svelte'
    import { get } from 'svelte/store'

    interface Props {
        style?: string
        class?: string
        children?: Snippet
        [key: string]: any
    }

    interface ReplacementRule {
        rule: string
        image: string
        width?: string
        height?: string
    }

    interface CellConfig {
        style: string
        enableImageReplacement?: boolean
        replacementRules?: ReplacementRule[]
        contentBackgroundImage?: string
        contentWidth?: string
        contentHeight?: string
    }

    let { style = '', class: className = '', children, ...rest }: Props = $props()

    const context = getContext<any>('dynamic-table')

    let bodyData = $derived(context?.bodyData ?? [])
    let headers = $derived(context?.headers ?? [])
    let frozenColumns = $derived(context?.frozenColumns ?? [])
    let scrollableColumns = $derived(context?.scrollableColumns ?? [])
    let numColumns = $derived(context?.numColumns ?? 0)
    let alternateRow = $derived(context?.alternateRow ?? false)
    let columnWidths = $derived(context?.columnWidths ?? [])
    let columnWidthMode = $derived(context?.columnWidthMode ?? 'balanced')
    let selectedRowIndices = $derived(context?.selectedRowIndices ?? new Set())
    let toggleRow = context?.toggleRow
    let handleCellUpdate = context?.handleCellUpdate
    let startRecord = $derived(context?.startRecord ?? 1)

    let rowStyles = $state<string[]>([])
    let cellConfigs = $state<CellConfig[][]>([])
    let imageUrls = $state<Record<string, string>>({})
    let frozenBodyEl = $state<HTMLDivElement | null>(null)
    let scrollableBodyEl = $state<HTMLDivElement | null>(null)

    let editingCell = $state<{ rowIndex: number; colIndex: number } | null>(null)
    let editingValue = $state('')
    let hoveredRowIndex = $state<number | null>(null)

    // Smart navigation state
    let editDirection = $state<'horizontal' | 'vertical'>('horizontal')
    let lastEditedCell = $state<{ rowIndex: number; colIndex: number } | null>(null)
    let isNavigating = false

    let stickyOffsets = $derived.by(() => {
        return []
    })

    $effect(() => {
        const pid = get(projectId)
        if (!pid) return

        const hashes = new Set<string>()

        cellConfigs.forEach((row) => {
            row.forEach((config) => {
                config.replacementRules?.forEach((r) => {
                    if (r.image) {
                        hashes.add(r.image)
                    }
                })
                if (config.contentBackgroundImage) {
                    hashes.add(config.contentBackgroundImage)
                }
                if (config.style) {
                    const matches = config.style.match(/[a-zA-Z0-9-_]{32,}/g)
                    if (matches) {
                        matches.forEach((m) => hashes.add(m))
                    }
                }
            })
        })

        rowStyles.forEach((style) => {
            if (style) {
                const matches = style.match(/[a-zA-Z0-9-_]{32,}/g)
                if (matches) {
                    matches.forEach((m) => hashes.add(m))
                }
            }
        })

        const toLoad = [...hashes].filter((h) => !imageUrls[h])
        if (toLoad.length === 0) return

        Promise.all(
            toLoad.map(async (hash) => {
                try {
                    const img = await getImage(pid, hash)
                    return { hash, url: img ? URL.createObjectURL(img.blob) : null }
                } catch (e) {
                    console.error('Failed to load image', hash, e)
                    return { hash, url: null }
                }
            })
        ).then((results) => {
            const newUrls: Record<string, string> = {}
            let hasNew = false
            results.forEach(({ hash, url }) => {
                if (url) {
                    newUrls[hash] = url
                    hasNew = true
                }
            })
            if (hasNew) {
                imageUrls = { ...imageUrls, ...newUrls }
            }
        })
    })

    function updateScrollbarState() {
        if (!context || typeof context.setHasVerticalScrollbar !== 'function') return
        if (!scrollableBodyEl) return
        const hasScrollbar = scrollableBodyEl.scrollHeight > scrollableBodyEl.clientHeight
        context.setHasVerticalScrollbar(hasScrollbar)
        if (typeof context.setVerticalScrollbarWidth === 'function') {
            const width = scrollableBodyEl.offsetWidth - scrollableBodyEl.clientWidth
            context.setVerticalScrollbarWidth(width > 0 ? width : 0)
        }
    }

    function handleFrozenWheel(e: WheelEvent) {
        if (!scrollableBodyEl) return

        const delta = e.deltaY
        const prev = scrollableBodyEl.scrollTop
        scrollableBodyEl.scrollTop += delta
        const curr = scrollableBodyEl.scrollTop

        if (prev !== curr) {
            e.preventDefault()
            if (frozenBodyEl) frozenBodyEl.scrollTop = curr
        }
    }

    function handleScroll() {
        if (!scrollableBodyEl) return

        if (columnWidthMode !== 'balanced' && context && typeof context.setHorizontalScrollLeft === 'function') {
            context.setHorizontalScrollLeft(scrollableBodyEl.scrollLeft)
        }

        if (frozenBodyEl) {
            frozenBodyEl.scrollTop = scrollableBodyEl.scrollTop
        }
    }

    let resizeObserver: ResizeObserver | null = null

    onMount(() => {
        setTimeout(updateScrollbarState, 0)

        if (typeof ResizeObserver !== 'undefined' && scrollableBodyEl) {
            resizeObserver = new ResizeObserver(() => {
                updateScrollbarState()
            })
            resizeObserver.observe(scrollableBodyEl)
        }
    })

    onDestroy(() => {
        if (resizeObserver && scrollableBodyEl) {
            resizeObserver.unobserve(scrollableBodyEl)
        }
        if (scrollableBodyEl) {
            // Event listener is on element, so handled by framework mostly, but safety check
        }
        Object.values(imageUrls).forEach((url) => URL.revokeObjectURL(url))
    })

    setContext('dynamic-table-body', {
        registerRowStyle: (style: string, index: number = 0) => {
            const next = [...rowStyles]
            if (next[index] === style) return
            next[index] = style
            rowStyles = next
        },
        unregisterRowStyle: (index: number) => {
            const next = [...rowStyles]
            if (index >= 0 && index < next.length) {
                if (!next[index]) return
                next[index] = ''
                rowStyles = next
            }
        },
        registerCellStyle: (config: CellConfig | string, rowIndex: number = 0, colIndex: number = 0) => {
            const r = rowIndex < 0 ? 0 : rowIndex
            const c = colIndex < 0 ? 0 : colIndex
            const next = cellConfigs.map((row) => [...row])
            while (next.length <= r) {
                next.push([])
            }
            const row = next[r]
            while (row.length <= c) {
                row.push({ style: '' })
            }

            const newConfig = typeof config === 'string' ? { style: config } : config

            const current = row[c]
            if (
                current &&
                current.style === newConfig.style &&
                current.enableImageReplacement === newConfig.enableImageReplacement &&
                JSON.stringify(current.replacementRules) === JSON.stringify(newConfig.replacementRules) &&
                current.contentBackgroundImage === newConfig.contentBackgroundImage &&
                current.contentWidth === newConfig.contentWidth &&
                current.contentHeight === newConfig.contentHeight
            ) {
                return
            }

            row[c] = newConfig
            cellConfigs = next
        },
        unregisterCellStyle: (rowIndex: number = 0, colIndex: number = 0) => {
            const r = rowIndex < 0 ? 0 : rowIndex
            const c = colIndex < 0 ? 0 : colIndex
            const next = cellConfigs.map((row) => [...row])
            if (r >= next.length) {
                cellConfigs = next
                return
            }
            const row = next[r]
            if (c >= row.length) {
                cellConfigs = next
                return
            }
            row[c] = { style: '' }
            cellConfigs = next
        }
    })

    function replaceHashesInStyle(style: string) {
        if (!style) return ''
        return style.replace(/[a-zA-Z0-9-_]{32,}/g, (match) => {
            return imageUrls[match] ?? match
        })
    }

    function getRowStyle(rowIndex: number) {
        const base = rowStyles[0] ?? ''
        const alt = rowStyles[1] ?? base
        let style = ''
        if (!alternateRow) {
            style = base
        } else {
            style = rowIndex % 2 === 0 ? base : alt
        }
        if (hoveredRowIndex === rowIndex) {
            style += '; background-color: rgba(150, 150, 150, 0.2) !important;'
        }
        return replaceHashesInStyle(style)
    }

    function getCellConfig(rowIndex: number, colIndex: number): CellConfig {
        const rowType = alternateRow ? rowIndex % 2 : 0
        const row = cellConfigs[rowType] || []
        return row[colIndex] ?? { style: '' }
    }

    function getCellStyle(col: any, rowIndex: number) {
        const colIndex = col.index
        let widthStr = col.width || ''
        if (!widthStr) {
            const widthPercent = numColumns > 0 ? 100 / numColumns : 100
            widthStr = `${widthPercent}%`
        }

        const config = getCellConfig(rowIndex, colIndex)
        const extra = config.style || ''

        const baseStyle = `
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            ${extra}
        `

        return `
            width: ${widthStr};
            ${baseStyle}
        `
    }

    function startEditing(rowIndex: number, colIndex: number, value: any, isEditable: boolean | undefined, source: 'manual' | 'auto' = 'manual') {
        if (!isEditable) return

        // Smart direction inference for manual clicks
        if (source === 'manual' && lastEditedCell) {
            const dRow = Math.abs(rowIndex - lastEditedCell.rowIndex)
            const dCol = Math.abs(colIndex - lastEditedCell.colIndex)

            // Check for adjacency (including wrapping, but simpler proximity check is usually enough for "adjacent click")
            // Here we strictly check for immediate neighbors
            if (dRow === 0 && dCol === 1) {
                editDirection = 'horizontal'
            } else if (dRow === 1 && dCol === 0) {
                editDirection = 'vertical'
            }
        }

        editingCell = { rowIndex, colIndex }
        editingValue = value == null ? '' : String(value)

        // Update last edited cell tracking (deferred to here so it captures the cell we just started editing as the "last visited")
        // Wait, if I click A, lastEditedCell becomes A. Then I click B. We compare B with A. Then lastEditedCell becomes B.
        lastEditedCell = { rowIndex, colIndex }
    }

    function finishEditing() {
        if (isNavigating) return
        if (!editingCell) return
        const { rowIndex, colIndex } = editingCell
        if (handleCellUpdate) {
            handleCellUpdate(rowIndex, colIndex, editingValue)
        }
        editingCell = null
        editingValue = ''
    }

    function cancelEditing() {
        if (isNavigating) return
        editingCell = null
        editingValue = ''
    }

    function handleKeyDown(e: KeyboardEvent) {
        if (e.key === 'Enter') {
            finishEditing()
        } else if (e.key === 'Escape') {
            cancelEditing()
        } else if (e.key === 'Tab') {
            e.preventDefault()
            e.stopPropagation()
            handleTabNavigation()
        }
    }

    function handleTabNavigation() {
        if (!editingCell) return
        const { rowIndex, colIndex } = editingCell

        // Save current data manually
        if (handleCellUpdate) {
            handleCellUpdate(rowIndex, colIndex, editingValue)
        }

        // Set navigating flag to prevent onblur from interfering
        isNavigating = true

        // Clear current editing state
        editingCell = null
        editingValue = ''

        // Find next editable cell based on direction
        let nextRow = rowIndex
        let nextCol = colIndex
        let found = false

        // Safety break to prevent infinite loops
        let attempts = 0
        const maxAttempts = bodyData.length * numColumns

        while (!found && attempts < maxAttempts) {
            attempts++

            if (editDirection === 'horizontal') {
                // Move next column
                nextCol++
                if (nextCol >= numColumns) {
                    nextCol = 0
                    nextRow++
                    // If we run out of rows, stop or wrap to beginning?
                    // User said "if this row has no more... automatically switch to next row".
                    // Implies stop if no more rows.
                    if (nextRow >= bodyData.length) {
                        isNavigating = false
                        return // End of table
                    }
                }
            } else {
                // Move next row
                nextRow++
                if (nextRow >= bodyData.length) {
                    nextRow = 0
                    nextCol++
                    if (nextCol >= numColumns) {
                        isNavigating = false
                        return // End of table
                    }
                }
            }

            // Check if this cell is editable
            // headers[nextCol] contains config
            const header = headers[nextCol]
            // Note: headers array includes system columns if they are in displayHeaders
            // displayHeaders filters out hidden columns.
            // Check if editable
            if (header && typeof header === 'object' && header.editable) {
                found = true
            }
        }

        if (found) {
            // Need to get value for the new cell
            const row = bodyData[nextRow]
            const val = row ? row[nextCol] : ''
            const header = headers[nextCol]
            const isEditable = header && typeof header === 'object' && header.editable

            // Start editing next cell
            // Use 'auto' source so we don't change direction logic
            startEditing(nextRow, nextCol, val, isEditable, 'auto')

            // Reset navigating flag after a short delay to ensure focus is established
            setTimeout(() => {
                isNavigating = false
            }, 100)
        } else {
            isNavigating = false
        }
    }

    function focus(el: HTMLInputElement) {
        el.focus()
        // Move cursor to the end of the text
        const length = el.value.length
        el.setSelectionRange(length, length)
    }

    function toAdaptiveSize(val?: string): string {
        if (!val) return ''
        if (val.endsWith('px')) {
            return `calc(${val} * var(--scale-ratio, 1))`
        }
        return val
    }

    function getReplacementImage(val: any, rules?: ReplacementRule[]): { url: string; width?: string; height?: string } | null {
        if (!rules || rules.length === 0) return null
        const strVal = String(val)
        const matched = rules.find((r) => r.rule === strVal)
        if (!matched) return null

        const img = matched.image
        let url: string | null = null
        if (/^[a-f0-9]{40,}$/i.test(img)) {
            url = imageUrls[img] ?? null
        } else {
            url = img
        }

        if (!url) return null
        return { url, width: toAdaptiveSize(matched.width), height: toAdaptiveSize(matched.height) }
    }

    function getBackgroundUrl(img?: string): string | null {
        if (!img) return null
        if (/^[a-f0-9]{40,}$/i.test(img)) {
            return imageUrls[img] ?? null
        }
        return img
    }
</script>

<div class="dynamic-table-body {className}" {style} {...rest}>
    <div style="display: none;">
        {@render children?.()}
    </div>

    {#if bodyData.length > 0}
        <div class="body-frozen" bind:this={frozenBodyEl}>
            {#each bodyData as row, rowIndex}
                <div class="body-row" style={getRowStyle(rowIndex)} onmouseenter={() => (hoveredRowIndex = rowIndex)} onmouseleave={() => (hoveredRowIndex = null)} role="row" tabindex="-1">
                    {#each frozenColumns as col}
                        {@const colIndex = col.index}
                        {@const header = col.header}
                        {@const type = header && typeof header === 'object' ? header.type : 'default'}

                        {#if type === 'index'}
                            <div class="body-cell" style={getCellStyle(col, rowIndex)}>
                                <div class="cell-content" style="text-align: center; width: 100%;">
                                    {startRecord + rowIndex}
                                </div>
                            </div>
                        {:else if type === 'selection'}
                            <div class="body-cell" style={getCellStyle(col, rowIndex)}>
                                <div class="cell-content" style="text-align: center; width: 100%; display: flex; justify-content: center; align-items: center;">
                                    <input
                                        type="checkbox"
                                        checked={selectedRowIndices.has(rowIndex)}
                                        onclick={(e) => {
                                            e.stopPropagation()
                                            toggleRow && toggleRow(rowIndex)
                                        }}
                                        class="custom-checkbox"
                                    />
                                </div>
                            </div>
                        {:else}
                            {@const cellData = row[colIndex] !== undefined ? row[colIndex] : ''}
                            {@const config = getCellConfig(rowIndex, colIndex)}
                            {@const isEditable = header && typeof header === 'object' ? header.editable : false}

                            {#if editingCell?.rowIndex === rowIndex && editingCell?.colIndex === colIndex}
                                <div class="body-cell" style={getCellStyle(col, rowIndex)}>
                                    <input
                                        type="text"
                                        value={editingValue}
                                        oninput={(e) => (editingValue = e.currentTarget.value)}
                                        onblur={finishEditing}
                                        onkeydown={handleKeyDown}
                                        use:focus
                                        style="width: 100%; height: 100%; box-sizing: border-box; border: none; outline: 2px solid #3b82f6; outline-offset: -2px; border-radius: 0; background: transparent; text-align: inherit; font-family: inherit; font-size: inherit; padding: 0; margin: 0; line-height: 1.5; min-height: 1.5em; color: inherit;"
                                    />
                                </div>
                            {:else}
                                {@const replacement = config.enableImageReplacement ? getReplacementImage(cellData, config.replacementRules) : null}
                                {@const contentBgUrl = getBackgroundUrl(config.contentBackgroundImage)}
                                {@const contentStyle = `
                            ${config.contentWidth ? `width: ${toAdaptiveSize(config.contentWidth)};` : ''}
                            ${config.contentHeight ? `height: ${toAdaptiveSize(config.contentHeight)};` : ''}
                            ${contentBgUrl ? `background-image: url('${contentBgUrl}'); background-size: 100% 100%; background-repeat: no-repeat; background-position: center;` : ''}
                        `}
                                <div class="body-cell" style={getCellStyle(col, rowIndex)} ondblclick={() => startEditing(rowIndex, colIndex, cellData, isEditable)}>
                                    {#if replacement}
                                        <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
                                            <img src={replacement.url} alt={String(cellData)} style="max-width: 100%; max-height: 100%; object-fit: contain; width: {replacement.width || 'auto'}; height: {replacement.height || 'auto'};" />
                                        </div>
                                    {:else}
                                        <div class="cell-content" style={`display: inline-block; ${contentStyle}`} title={cellData == null ? '' : String(cellData)}>
                                            {cellData}
                                        </div>
                                    {/if}
                                </div>
                            {/if}
                        {/if}
                    {/each}
                </div>
            {/each}
        </div>

        <div class="body-scrollable" bind:this={scrollableBodyEl} onscroll={handleScroll} style:overflow-x={columnWidthMode === 'balanced' ? 'hidden' : 'auto'}>
            {#each bodyData as row, rowIndex}
                <div class="body-row" style={getRowStyle(rowIndex)} onmouseenter={() => (hoveredRowIndex = rowIndex)} onmouseleave={() => (hoveredRowIndex = null)} role="row" tabindex="-1">
                    {#each scrollableColumns as col}
                        {@const colIndex = col.index}
                        {@const header = col.header}
                        {@const type = header && typeof header === 'object' ? header.type : 'default'}

                        {#if type === 'index'}
                            <div class="body-cell" style={getCellStyle(col, rowIndex)}>
                                <div class="cell-content" style="text-align: center; width: 100%;">
                                    {startRecord + rowIndex}
                                </div>
                            </div>
                        {:else if type === 'selection'}
                            <div class="body-cell" style={getCellStyle(col, rowIndex)}>
                                <div class="cell-content" style="text-align: center; width: 100%; display: flex; justify-content: center; align-items: center;">
                                    <input
                                        type="checkbox"
                                        checked={selectedRowIndices.has(rowIndex)}
                                        onclick={(e) => {
                                            e.stopPropagation()
                                            toggleRow && toggleRow(rowIndex)
                                        }}
                                        class="custom-checkbox"
                                    />
                                </div>
                            </div>
                        {:else}
                            {@const cellData = row[colIndex] !== undefined ? row[colIndex] : ''}
                            {@const config = getCellConfig(rowIndex, colIndex)}
                            {@const isEditable = header && typeof header === 'object' ? header.editable : false}

                            {#if editingCell?.rowIndex === rowIndex && editingCell?.colIndex === colIndex}
                                <div class="body-cell" style={getCellStyle(col, rowIndex)}>
                                    <input
                                        type="text"
                                        value={editingValue}
                                        oninput={(e) => (editingValue = e.currentTarget.value)}
                                        onblur={finishEditing}
                                        onkeydown={handleKeyDown}
                                        use:focus
                                        style="width: 100%; height: 100%; box-sizing: border-box; border: none; outline: 2px solid #3b82f6; outline-offset: -2px; border-radius: 0; background: transparent; text-align: inherit; font-family: inherit; font-size: inherit; padding: 0; margin: 0; line-height: 1.5; min-height: 1.5em; color: inherit;"
                                    />
                                </div>
                            {:else}
                                {@const replacement = config.enableImageReplacement ? getReplacementImage(cellData, config.replacementRules) : null}
                                {@const contentBgUrl = getBackgroundUrl(config.contentBackgroundImage)}
                                {@const contentStyle = `
                            ${config.contentWidth ? `width: ${toAdaptiveSize(config.contentWidth)};` : ''}
                            ${config.contentHeight ? `height: ${toAdaptiveSize(config.contentHeight)};` : ''}
                            ${contentBgUrl ? `background-image: url('${contentBgUrl}'); background-size: 100% 100%; background-repeat: no-repeat; background-position: center;` : ''}
                        `}
                                <div class="body-cell" style={getCellStyle(col, rowIndex)} ondblclick={() => startEditing(rowIndex, colIndex, cellData, isEditable)}>
                                    {#if replacement}
                                        <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
                                            <img src={replacement.url} alt={String(cellData)} style="max-width: 100%; max-height: 100%; object-fit: contain; width: {replacement.width || 'auto'}; height: {replacement.height || 'auto'};" />
                                        </div>
                                    {:else}
                                        <div class="cell-content" style={`display: inline-block; ${contentStyle}`} title={cellData == null ? '' : String(cellData)}>
                                            {cellData}
                                        </div>
                                    {/if}
                                </div>
                            {/if}
                        {/if}
                    {/each}
                </div>
            {/each}
        </div>
    {:else}
        <div class="empty-message">暂无数据</div>
    {/if}
</div>

<style>
    .dynamic-table-body {
        display: flex;
        overflow: hidden;
        box-sizing: border-box;
    }
    .body-frozen {
        flex: 0 0 auto;
        overflow: hidden;
        z-index: 1;
        /* box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1); */
    }
    .body-scrollable {
        flex: 1 1 auto;
        overflow-y: auto;
        overflow-x: auto;
        scrollbar-width: auto;
        scrollbar-color: #8b8b8b transparent;
    }
    .body-scrollable::-webkit-scrollbar {
        width: calc(10px * var(--scale-ratio, 1));
        height: calc(10px * var(--scale-ratio, 1));
    }
    .body-scrollable::-webkit-scrollbar-track {
        background: transparent;
    }
    .body-scrollable::-webkit-scrollbar-thumb {
        background: #8b8b8b;
        border-radius: calc(5px * var(--scale-ratio, 1));
    }
    .body-scrollable::-webkit-scrollbar-thumb:hover {
        background: #8b8b8b;
    }
    .body-scrollable::-webkit-scrollbar-button {
        background: #8b8b8b;
    }
    .body-row {
        display: flex;
        width: max-content;
        min-width: 100%;
    }
    .body-cell {
        flex: 0 0 auto;
        box-sizing: border-box;
        padding: calc(4px * var(--scale-ratio, 1));
        border-right: calc(1px * var(--scale-ratio, 1)) dashed rgb(29, 143, 211);
        border-bottom: calc(1px * var(--scale-ratio, 1)) dashed rgb(29, 143, 211);
        overflow: hidden;
    }
    .cell-content {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
        min-height: 1.5em;
        line-height: 1.5;
        display: inline-block;
        vertical-align: middle;
    }
    .empty-message {
        width: 100%;
        text-align: center;
        padding: 20px;
        color: #999;
    }
    .custom-checkbox {
        appearance: none;
        -webkit-appearance: none;
        width: calc(16px * var(--scale-ratio, 1));
        height: calc(16px * var(--scale-ratio, 1));
        border: calc(1px * var(--scale-ratio, 1)) solid #9ca3af;
        border-radius: calc(3px * var(--scale-ratio, 1));
        background-color: #fff;
        cursor: pointer;
        display: inline-block;
        position: relative;
        margin: 0;
        vertical-align: middle;
        outline: none;
    }
    .custom-checkbox:checked {
        background-color: #3b82f6;
        border-color: #3b82f6;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='20 6 9 17 4 12'%3E%3C/polyline%3E%3C/svg%3E");
        background-size: 80% 80%;
        background-position: center;
        background-repeat: no-repeat;
    }
    .custom-checkbox:hover {
        border-color: #3b82f6;
    }
</style>
