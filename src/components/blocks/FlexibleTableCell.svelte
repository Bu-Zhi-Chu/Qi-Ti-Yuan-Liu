<script lang="ts">
    import { getContext, onDestroy } from 'svelte'

    interface Props {
        style?: string
        class?: string
        rowIndex?: number
        colIndex?: number
        [key: string]: any
    }

    let { style = '', class: className = '', rowIndex = 0, colIndex = 0, ...rest }: Props = $props()

    const context = getContext<any>('flexible-table-body')
    const rowContext = getContext<any>('flexible-table-row')

    function toIndex(value: number | string | undefined, fallback: number) {
        if (typeof value === 'number') return value
        if (typeof value === 'string') {
            const n = Number(value)
            if (Number.isFinite(n)) return n
        }
        return fallback
    }

    function getEffectiveRowIndex() {
        if (rowContext && rowContext.rowIndex !== undefined) {
            return rowContext.rowIndex
        }
        return toIndex(rowIndex, 0)
    }

    $effect(() => {
        if (context && context.registerCellStyle) {
            const r = getEffectiveRowIndex()
            const c = toIndex(colIndex, 0)
            context.registerCellStyle(style, r, c)
        }
    })

    onDestroy(() => {
        if (context && context.unregisterCellStyle) {
            const r = getEffectiveRowIndex()
            const c = toIndex(colIndex, 0)
            context.unregisterCellStyle(r, c)
        }
    })
</script>

<div class="flexible-table-cell-config {className}" style="display: none;" {...rest}></div>
