<script lang="ts">
    import { getContext, setContext, onDestroy } from 'svelte'
    import type { Snippet } from 'svelte'

    interface Props {
        style?: string
        class?: string
        rowIndex?: number
        children?: Snippet
        [key: string]: any
    }

    let { style = '', class: className = '', rowIndex = 0, children, ...rest }: Props = $props()

    const context = getContext<any>('flexible-table-body')

    function getIndex() {
        if (typeof rowIndex === 'string') {
            const n = Number(rowIndex)
            return Number.isFinite(n) ? n : 0
        }
        return rowIndex ?? 0
    }

    // Provide row index to children cells
    setContext('flexible-table-row', {
        get rowIndex() {
            return getIndex()
        }
    })

    $effect(() => {
        if (context && context.registerRowStyle) {
            context.registerRowStyle(style, getIndex())
        }
    })

    onDestroy(() => {
        if (context && context.unregisterRowStyle) {
            context.unregisterRowStyle(getIndex())
        }
    })
</script>

<div class="flexible-table-row-config {className}" style="display: none;" {...rest}>
    {@render children?.()}
</div>
