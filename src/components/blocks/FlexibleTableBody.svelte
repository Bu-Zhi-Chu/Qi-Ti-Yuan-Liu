<script lang="ts">
    import { getContext } from 'svelte'

    interface Props {
        style?: string
        class?: string
        [key: string]: any
    }

    let { style = '', class: className = '', ...rest }: Props = $props()

    const context = getContext<any>('flexible-table')

    let bodyData = $derived(context?.bodyData ?? [])
    let numColumns = $derived(context?.numColumns ?? 0)

    function getCellStyle(index: number) {
        const widthPercent = numColumns > 0 ? 100 / numColumns : 100
        return `
            width: ${widthPercent}%;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        `
    }
</script>

<div class="flexible-table-body {className}" {style} {...rest}>
    {#if bodyData.length > 0}
        {#each bodyData as row}
            <div class="body-row">
                {#each Array(numColumns) as _, colIndex}
                    {@const cellData = row[colIndex] !== undefined ? row[colIndex] : ''}
                    <div class="body-cell" style={getCellStyle(colIndex)}>
                        {cellData}
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
        min-height: 36px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        box-sizing: border-box;
    }
    .body-cell {
        min-height: 36px;
        box-sizing: border-box;
        padding: 4px;
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
