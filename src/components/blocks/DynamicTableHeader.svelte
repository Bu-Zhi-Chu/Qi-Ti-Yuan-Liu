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
    let frozenColumns = $derived(context?.frozenColumns ?? [])
    let scrollableColumns = $derived(context?.scrollableColumns ?? [])
    let numColumns = $derived(context?.numColumns ?? 0)
    let columnWidths = $derived(context?.columnWidths ?? [])
    let hasVerticalScrollbar = $derived(context?.hasVerticalScrollbar ?? false)
    let verticalScrollbarWidth = $derived(context?.verticalScrollbarWidth ?? 0)
    let horizontalScrollLeft = $derived(context?.horizontalScrollLeft ?? 0)
    let isAllSelected = $derived(context?.isAllSelected ?? false)
    let toggleAll = context?.toggleAll

    let imageUrls = $state<Record<string, string>>({})
    let scrollEl = $state<HTMLDivElement | null>(null)

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

    $effect(() => {
        if (!scrollEl) return
        const target = horizontalScrollLeft
        if (scrollEl.scrollLeft !== target) {
            scrollEl.scrollLeft = target
        }
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

    function getCellStyle(col: any) {
        let widthStr = col.width || ''
        if (!widthStr) {
            const widthPercent = numColumns > 0 ? 100 / numColumns : 100
            widthStr = `${widthPercent}%`
        }

        const baseStyle = `
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        `

        return `
            width: ${widthStr};
            ${baseStyle}
        `
    }
</script>

{#if hasVerticalScrollbar}
    {@const padding = verticalScrollbarWidth > 0 ? `${verticalScrollbarWidth}px` : '0px'}
    {@const headerStyle = style ? `${style}; padding-right: ${padding}` : `padding-right: ${padding}`}
    <div class="dynamic-table-header {className}" style={headerStyle} {...rest}>
        <div class="header-frozen">
            {#each frozenColumns as col}
                {@const header = col.header}
                {@const label = header && typeof header === 'object' ? header.label : header}
                {@const type = header && typeof header === 'object' ? header.type : 'default'}
                <div class="header-cell" style={getCellStyle(col)} title={label == null ? '' : String(label)}>
                    {#if type === 'selection'}
                        <input type="checkbox" checked={isAllSelected} onclick={toggleAll} class="custom-checkbox" />
                    {:else}
                        {@html String(label ?? '')}
                    {/if}
                </div>
            {/each}
        </div>
        <div class="header-scroll" bind:this={scrollEl}>
            {#each scrollableColumns as col}
                {@const header = col.header}
                {@const label = header && typeof header === 'object' ? header.label : header}
                {@const type = header && typeof header === 'object' ? header.type : 'default'}
                <div class="header-cell" style={getCellStyle(col)} title={label == null ? '' : String(label)}>
                    {#if type === 'selection'}
                        <input type="checkbox" checked={isAllSelected} onclick={toggleAll} class="custom-checkbox" />
                    {:else}
                        {@html String(label ?? '')}
                    {/if}
                </div>
            {/each}
        </div>
    </div>
{:else}
    <div class="dynamic-table-header {className}" {style} {...rest}>
        <div class="header-frozen">
            {#each frozenColumns as col}
                {@const header = col.header}
                {@const label = header && typeof header === 'object' ? header.label : header}
                {@const type = header && typeof header === 'object' ? header.type : 'default'}
                <div class="header-cell" style={getCellStyle(col)} title={label == null ? '' : String(label)}>
                    {#if type === 'selection'}
                        <input type="checkbox" checked={isAllSelected} onclick={toggleAll} class="custom-checkbox" />
                    {:else}
                        {@html String(label ?? '')}
                    {/if}
                </div>
            {/each}
        </div>
        <div class="header-scroll" bind:this={scrollEl}>
            {#each scrollableColumns as col}
                {@const header = col.header}
                {@const label = header && typeof header === 'object' ? header.label : header}
                {@const type = header && typeof header === 'object' ? header.type : 'default'}
                <div class="header-cell" style={getCellStyle(col)} title={label == null ? '' : String(label)}>
                    {#if type === 'selection'}
                        <input type="checkbox" checked={isAllSelected} onclick={toggleAll} class="custom-checkbox" />
                    {:else}
                        {@html String(label ?? '')}
                    {/if}
                </div>
            {/each}
        </div>
    </div>
{/if}

<style>
    .dynamic-table-header {
        display: flex;
        box-sizing: border-box;
        width: 100%;
        border-bottom: calc(1px * var(--scale-ratio, 1)) dashed rgb(29, 143, 211);
        overflow: hidden;
    }
    .header-frozen {
        display: flex;
        flex: 0 0 auto;
        overflow: hidden;
        z-index: 2;
        background: inherit;
        /* box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1); */
    }
    .header-scroll {
        display: flex;
        flex: 1 1 auto;
        overflow-x: auto;
        overflow-y: hidden;
    }
    .header-scroll::-webkit-scrollbar {
        display: none;
    }
    .header-scroll {
        -ms-overflow-style: none;
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
    .header-scroll {
        scrollbar-width: none;
    }
    .header-cell {
        height: 100%;
        box-sizing: border-box;
        padding: 0 calc(4px * var(--scale-ratio, 1));
        border-right: calc(1px * var(--scale-ratio, 1)) dashed rgb(29, 143, 211);
        flex: 0 0 auto;
    }
</style>
