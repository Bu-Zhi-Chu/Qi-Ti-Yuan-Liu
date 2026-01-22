<script lang="ts">
    import { getContext, setContext } from 'svelte'
    import type { Snippet } from 'svelte'

    interface Props {
        style?: string
        class?: string
        children?: Snippet
        [key: string]: any
    }

    let { style = '', class: className = '', children, ...rest }: Props = $props()

    const context = getContext<any>('flexible-table')

    let bodyData = $derived(context?.bodyData ?? [])
    let numColumns = $derived(context?.numColumns ?? 0)
    let alternateRow = $derived(context?.alternateRow ?? false)

    let rowStyles = $state<string[]>([])
    let cellStyles = $state<string[][]>([])
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
        registerCellStyle: (style: string, rowIndex: number = 0, colIndex: number = 0) => {
            const r = rowIndex < 0 ? 0 : rowIndex
            const c = colIndex < 0 ? 0 : colIndex
            const next = cellStyles.map((row) => [...row])
            while (next.length <= r) {
                next.push([])
            }
            const row = next[r]
            while (row.length <= c) {
                row.push('')
            }
            if (row[c] === style) {
                return
            }
            row[c] = style
            cellStyles = next
        },
        unregisterCellStyle: (rowIndex: number = 0, colIndex: number = 0) => {
            const r = rowIndex < 0 ? 0 : rowIndex
            const c = colIndex < 0 ? 0 : colIndex
            const next = cellStyles.map((row) => [...row])
            if (r >= next.length) {
                cellStyles = next
                return
            }
            const row = next[r]
            if (c >= row.length || !row[c]) {
                cellStyles = next
                return
            }
            row[c] = ''
            cellStyles = next
        }
    })

    function getRowStyle(rowIndex: number) {
        const base = rowStyles[0] ?? ''
        const alt = rowStyles[1] ?? base
        if (!alternateRow) return base
        return rowIndex % 2 === 0 ? base : alt
    }

    function getCellStyle(rowIndex: number, colIndex: number) {
        const widthPercent = numColumns > 0 ? 100 / numColumns : 100
        const rowType = alternateRow ? rowIndex % 2 : 0
        const row = cellStyles[rowType] || []
        const extra = row[colIndex] ?? ''
        return `
            width: ${widthPercent}%;
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
                    <div class="body-cell" style={getCellStyle(rowIndex, colIndex)}>
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
