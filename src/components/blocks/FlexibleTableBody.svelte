<script lang="ts">
    import { getContext, setContext, onDestroy } from 'svelte'
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
    }

    interface CellConfig {
        style: string
        enableImageReplacement?: boolean
        replacementRules?: ReplacementRule[]
    }

    let { style = '', class: className = '', children, ...rest }: Props = $props()

    const context = getContext<any>('flexible-table')

    let bodyData = $derived(context?.bodyData ?? [])
    let numColumns = $derived(context?.numColumns ?? 0)
    let alternateRow = $derived(context?.alternateRow ?? false)
    let dateWrap = $derived(context?.dateWrap ?? true)
    let columnWidths = $derived(context?.columnWidths ?? [])

    let rowStyles = $state<string[]>([])
    let cellConfigs = $state<CellConfig[][]>([])
    let imageUrls = $state<Record<string, string>>({})

    $effect(() => {
        const pid = get(projectId)
        if (!pid) return

        const hashes = new Set<string>()

        // Scan replacement rules
        cellConfigs.forEach((row) => {
            row.forEach((config) => {
                config.replacementRules?.forEach((r) => {
                    if (r.image && /^[a-f0-9]{40,}$/.test(r.image)) {
                        hashes.add(r.image)
                    }
                })
                // Scan cell styles
                if (config.style) {
                    const matches = config.style.match(/[a-f0-9]{40,}/g)
                    if (matches) {
                        matches.forEach((m) => hashes.add(m))
                    }
                }
            })
        })

        // Scan row styles
        rowStyles.forEach((style) => {
            if (style) {
                const matches = style.match(/[a-f0-9]{40,}/g)
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

    onDestroy(() => {
        Object.values(imageUrls).forEach((url) => URL.revokeObjectURL(url))
    })

    setContext('flexible-table-body', {
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
                // Fill with empty config
                row.push({ style: '' })
            }

            const newConfig = typeof config === 'string' ? { style: config } : config

            // Check for equality to avoid infinite loops if it's an object reference that changes but content is same
            // For simplicity, we just check if it's exactly the same object or string content for style
            const current = row[c]
            if (current && current.style === newConfig.style && current.enableImageReplacement === newConfig.enableImageReplacement && JSON.stringify(current.replacementRules) === JSON.stringify(newConfig.replacementRules)) {
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
        return style.replace(/[a-f0-9]{40,}/g, (match) => {
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

    function getCellStyle(rowIndex: number, colIndex: number) {
        let widthStr = ''
        if (columnWidths && columnWidths.length > colIndex) {
            widthStr = `${columnWidths[colIndex]}%`
        } else {
            const widthPercent = numColumns > 0 ? 100 / numColumns : 100
            widthStr = `${widthPercent}%`
        }

        const config = getCellConfig(rowIndex, colIndex)
        const extra = config.style || ''

        return `
            width: ${widthStr};
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        ${extra}
        `
    }

    function isDateString(val: any): boolean {
        if (typeof val !== 'string') return false
        // Match YYYY-MM-DD HH:MM:SS or YYYY-MM-DD HH:MM
        return /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(?::\d{2})?$/.test(val)
    }

    function getReplacementImage(val: any, rules?: ReplacementRule[]): string | null {
        if (!rules || rules.length === 0) return null
        const strVal = String(val)
        const matched = rules.find((r) => r.rule === strVal)
        if (!matched) return null

        const img = matched.image
        if (/^[a-f0-9]{40,}$/.test(img)) {
            return imageUrls[img] ?? null
        }
        return img
    }
</script>

<div class="flexible-table-body {className}" {style} {...rest}>
    <!-- 隐藏的插槽容器，用于挂载 FlexibleTableRow -->
    <div style="display: none;">
        {@render children?.()}
    </div>

    {#if bodyData.length > 0}
        {#each bodyData as row, rowIndex}
            <div class="body-row" style={getRowStyle(rowIndex)}>
                {#each Array(numColumns) as _, colIndex}
                    {@const cellData = row[colIndex] !== undefined ? row[colIndex] : ''}
                    {@const config = getCellConfig(rowIndex, colIndex)}
                    {@const replacementImage = config.enableImageReplacement ? getReplacementImage(cellData, config.replacementRules) : null}
                    <div class="body-cell" style={getCellStyle(rowIndex, colIndex)}>
                        {#if replacementImage}
                            <img src={replacementImage} alt={String(cellData)} style="max-width: 100%; max-height: 100%; object-fit: contain;" />
                        {:else if dateWrap && isDateString(cellData)}
                            <div style="display: flex; flex-direction: column; line-height: 1.2;">
                                <span>{cellData.split(/\s+/)[0]}</span>
                                <span>{cellData.split(/\s+/)[1]}</span>
                            </div>
                        {:else}
                            {cellData}
                        {/if}
                    </div>
                {/each}
            </div>
        {/each}
    {:else}
        <div class="empty-message">暂无数据</div>
    {/if}
</div>

<style>
    .flexible-table-body {
        overflow-y: auto;
        box-sizing: border-box;
    }
    .body-row {
        display: flex;
        width: 100%;
        min-height: calc(36px * var(--scale-ratio, 1));
        border-bottom: calc(1px * var(--scale-ratio, 1)) solid rgba(255, 255, 255, 0.05);
        box-sizing: border-box;
        --bg-img: none;
        --bg-size: auto;
        --bg-repeat: no-repeat;
        --bg-pos: 0% 0%;
        background-image: var(--bg-img);
        background-size: var(--bg-size);
        background-repeat: var(--bg-repeat);
        background-position: var(--bg-pos);
    }
    .body-cell {
        min-height: calc(36px * var(--scale-ratio, 1));
        box-sizing: border-box;
        padding: calc(4px * var(--scale-ratio, 1));
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .empty-message {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0.5;
        font-style: italic;
    }
</style>
