<script lang="ts">
    import { getContext } from 'svelte'

    interface Props {
        style?: string
        class?: string
        [key: string]: any
    }

    let { style = '', class: className = '', ...rest }: Props = $props()

    const context = getContext<any>('flexible-table')

    let headers = $derived(context?.headers ?? [])
    let numColumns = $derived(context?.numColumns ?? 0)
    let hideScrollbar = $derived(context?.hideScrollbar ?? true)
    let columnWidths = $derived(context?.columnWidths ?? [])

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

<div class="flexible-table-header {className}" class:has-scrollbar={!hideScrollbar} {style} {...rest}>
    {#each headers as header, index}
        <div class="header-cell" style={getCellStyle(index)}>
            {@html String(header ?? '')}
        </div>
    {/each}
</div>

<style>
    .flexible-table-header {
        display: flex;
        box-sizing: border-box;
        width: 100%;
    }
    .flexible-table-header.has-scrollbar {
        padding-right: var(--ft-scrollbar-width, calc(6px * var(--scale-ratio, 1)));
    }
    .header-cell {
        height: 100%;
        box-sizing: border-box;
        padding: 0 calc(4px * var(--scale-ratio, 1));
    }
</style>
