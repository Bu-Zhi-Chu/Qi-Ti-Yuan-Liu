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
    let hideScrollbar = $derived(context?.hideScrollbar ?? true)
    let columnWidths = $derived(context?.columnWidths ?? [])

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

    function getCellStyle(index: number) {
        let widthStr = ''
        if (columnWidths && columnWidths.length > index) {
            widthStr = `${columnWidths[index]}%`
        } else {
            const widthPercent = numColumns > 0 ? 100 / numColumns : 100
            widthStr = `${widthPercent}%`
        }
        return `
            width: ${widthStr};
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            font-weight: bold;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        `
    }
</script>

<div class="dynamic-table-header {className}" class:has-scrollbar={!hideScrollbar} {style} {...rest}>
    {#each headers as header, index}
        <div class="header-cell" style={getCellStyle(index)}>
            {@html String(header ?? '')}
        </div>
    {/each}
</div>

<style>
    .dynamic-table-header {
        display: flex;
        box-sizing: border-box;
        width: 100%;
    }
    .dynamic-table-header.has-scrollbar {
        padding-right: var(--ft-scrollbar-width, calc(6px * var(--scale-ratio, 1)));
    }
    .header-cell {
        height: 100%;
        box-sizing: border-box;
        padding: 0 calc(4px * var(--scale-ratio, 1));
    }
</style>
