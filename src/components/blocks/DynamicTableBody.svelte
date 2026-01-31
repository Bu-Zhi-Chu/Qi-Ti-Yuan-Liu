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

    let rowStyles = $state<string[]>([])
    let cellConfigs = $state<CellConfig[][]>([])
    let imageUrls = $state<Record<string, string>>({})
    let frozenBodyEl: HTMLDivElement | null = null
    let scrollableBodyEl: HTMLDivElement | null = null
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

        if (context && typeof context.setHorizontalScrollLeft === 'function') {
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
            justify-content: flex-start;
            text-align: left;
            ${extra}
        `

        return `
            width: ${widthStr};
            ${baseStyle}
        `
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
                <div class="body-row" style={getRowStyle(rowIndex)}>
                    {#each frozenColumns as col}
                        {@const colIndex = col.index}
                        {@const cellData = row[colIndex] !== undefined ? row[colIndex] : ''}
                        {@const config = getCellConfig(rowIndex, colIndex)}
                        {@const replacement = config.enableImageReplacement ? getReplacementImage(cellData, config.replacementRules) : null}
                        {@const contentBgUrl = getBackgroundUrl(config.contentBackgroundImage)}
                        {@const contentStyle = `
                            ${config.contentWidth ? `width: ${toAdaptiveSize(config.contentWidth)};` : ''}
                            ${config.contentHeight ? `height: ${toAdaptiveSize(config.contentHeight)};` : ''}
                            ${contentBgUrl ? `background-image: url('${contentBgUrl}'); background-size: 100% 100%; background-repeat: no-repeat; background-position: center;` : ''}
                        `}
                        <div class="body-cell" style={getCellStyle(col, rowIndex)}>
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
                    {/each}
                </div>
            {/each}
        </div>

        <div class="body-scrollable" bind:this={scrollableBodyEl} onscroll={handleScroll}>
            {#each bodyData as row, rowIndex}
                <div class="body-row" style={getRowStyle(rowIndex)}>
                    {#each scrollableColumns as col}
                        {@const colIndex = col.index}
                        {@const cellData = row[colIndex] !== undefined ? row[colIndex] : ''}
                        {@const config = getCellConfig(rowIndex, colIndex)}
                        {@const replacement = config.enableImageReplacement ? getReplacementImage(cellData, config.replacementRules) : null}
                        {@const contentBgUrl = getBackgroundUrl(config.contentBackgroundImage)}
                        {@const contentStyle = `
                            ${config.contentWidth ? `width: ${toAdaptiveSize(config.contentWidth)};` : ''}
                            ${config.contentHeight ? `height: ${toAdaptiveSize(config.contentHeight)};` : ''}
                            ${contentBgUrl ? `background-image: url('${contentBgUrl}'); background-size: 100% 100%; background-repeat: no-repeat; background-position: center;` : ''}
                        `}
                        <div class="body-cell" style={getCellStyle(col, rowIndex)}>
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
        box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1);
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
    }
    .empty-message {
        width: 100%;
        text-align: center;
        padding: 20px;
        color: #999;
    }
</style>
