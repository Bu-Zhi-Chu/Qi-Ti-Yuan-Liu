<script lang="ts">
    import { getContext, onDestroy } from 'svelte'
    import { getImage } from '../../services/database/image-store.service'
    import { projectId } from '../../stores/dom-tree.store.svelte'
    import { get } from 'svelte/store'

    interface Props {
        style?: string
        class?: string
        [key: string]: any
    }

    let { style = '', class: className = '', ...rest }: Props = $props()

    const context = getContext<any>('dynamic-table')

    let headers = $derived(context?.headers ?? [])
    let numColumns = $derived(context?.numColumns ?? 0)
    let columnWidths = $derived(context?.columnWidths ?? [])
    let hasVerticalScrollbar = $derived(context?.hasVerticalScrollbar ?? false)
    let verticalScrollbarWidth = $derived(context?.verticalScrollbarWidth ?? 0)

    let imageUrls = $state<Record<string, string>>({})

    $effect(() => {
        const pid = get(projectId)
        if (!pid || !style) return

        const matches = style.match(/[a-f0-9]{40,}/g)
        if (!matches) return

        const toLoad = matches.filter((h) => !imageUrls[h])
        if (toLoad.length === 0) return

        Promise.all(
            toLoad.map(async (hash) => {
                try {
                    const img = await getImage(pid, hash)
                    return { hash, url: img ? URL.createObjectURL(img.blob) : null }
                } catch {
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

    function replaceHashesInStyle(s: string) {
        if (!s) return ''
        return s.replace(/[a-f0-9]{40,}/g, (match) => {
            return imageUrls[match] ?? match
        })
    }

    let stickyOffsets = $derived.by(() => {
        const offsets: string[] = []
        const widths = columnWidths.length > 0 ? columnWidths : []
        const count = headers.length
        let currentOffset = '0'

        for (let i = 0; i < count; i++) {
            offsets.push(currentOffset)
            const header = headers[i]
            if (header && typeof header === 'object' && header.frozen) {
                let w = ''
                if (widths.length > i && widths[i]) {
                    w = widths[i]
                } else {
                    const widthPercent = numColumns > 0 ? 100 / numColumns : 100
                    w = `${widthPercent}%`
                }
                if (currentOffset === '0') {
                    currentOffset = w
                } else {
                    currentOffset = `calc(${currentOffset} + ${w})`
                }
            }
        }
        return offsets
    })

    function getCellStyle(index: number) {
        let widthStr = ''
        if (columnWidths && columnWidths.length > index && columnWidths[index]) {
            widthStr = columnWidths[index]
        } else {
            const widthPercent = numColumns > 0 ? 100 / numColumns : 100
            widthStr = `${widthPercent}%`
        }

        const header = headers[index]
        const isFrozen = header && typeof header === 'object' && header.frozen

        let stickyStyle = ''
        if (isFrozen) {
            stickyStyle = `
                position: sticky;
                left: ${stickyOffsets[index]};
                z-index: 10;
                background: inherit;
            `
        }

        return `
            width: ${widthStr};
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            ${stickyStyle}
        `
    }
</script>

{#if hasVerticalScrollbar}
    {@const padding = verticalScrollbarWidth > 0 ? `${verticalScrollbarWidth}px` : '0px'}
    {@const headerStyle = style ? `${style}; padding-right: ${padding}` : `padding-right: ${padding}`}
    <div class="dynamic-table-header {className}" style={headerStyle} {...rest}>
        {#each headers as header, index}
            {@const label = header && typeof header === 'object' ? header.label : header}
            <div class="header-cell" style={getCellStyle(index)} title={label == null ? '' : String(label)}>
                {@html String(label ?? '')}
            </div>
        {/each}
    </div>
{:else}
    <div class="dynamic-table-header {className}" {style} {...rest}>
        {#each headers as header, index}
            {@const label = header && typeof header === 'object' ? header.label : header}
            <div class="header-cell" style={getCellStyle(index)} title={label == null ? '' : String(label)}>
                {@html String(label ?? '')}
            </div>
        {/each}
    </div>
{/if}

<style>
    .dynamic-table-header {
        display: flex;
        box-sizing: border-box;
        width: 100%;
        border-bottom: calc(1px * var(--scale-ratio, 1)) dashed rgb(29, 143, 211);
    }
    .header-cell {
        height: 100%;
        box-sizing: border-box;
        padding: 0 calc(4px * var(--scale-ratio, 1));
        border-right: calc(1px * var(--scale-ratio, 1)) dashed rgb(29, 143, 211);
    }
</style>
