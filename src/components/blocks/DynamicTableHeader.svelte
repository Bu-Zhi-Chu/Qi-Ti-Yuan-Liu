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

    let frozenColumns = $derived(context?.frozenColumns ?? [])
    let scrollableColumns = $derived(context?.scrollableColumns ?? [])
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

    type HeaderType = 'default' | 'index' | 'selection' | 'operation' | 'group'

    interface ColumnHeaderInfo {
        col: any
        type: HeaderType
        rawLabel: string
        groupLabel: string
        leafLabel: string
        segments: string[]
    }

    interface GroupCell {
        label: string
        width: string
    }

    function parseColumns(columns: any[]): ColumnHeaderInfo[] {
        return columns.map((col) => {
            const header = col.header
            const type: HeaderType = header && typeof header === 'object' ? (header.type ?? 'default') : 'default'
            const baseLabel = header && typeof header === 'object' ? (header.label ?? '') : (header ?? '')
            if (type === 'index' || type === 'selection' || type === 'operation') {
                const label = String(baseLabel ?? '')
                return {
                    col,
                    type,
                    rawLabel: label,
                    groupLabel: '',
                    leafLabel: label,
                    segments: [label]
                }
            }
            const str = String(baseLabel ?? '')
            const parts = str
                .split('|')
                .map((p) => p.trim())
                .filter((p) => p.length > 0)
            const groupLabel = parts.length > 1 ? parts[0] : ''
            const leafLabel = parts.length > 0 ? parts[parts.length - 1] : str
            return {
                col,
                type: 'default',
                rawLabel: str,
                groupLabel,
                leafLabel,
                segments: parts.length > 0 ? parts : [str]
            }
        })
    }

    function combineWidths(a: string, b: string): string {
        const wa = a && a.trim()
        const wb = b && b.trim()
        if (wa && wb) return `calc(${wa} + ${wb})`
        if (wa) return wa
        if (wb) return wb
        return ''
    }

    interface HeaderCell {
        rowStart: number
        rowSpan: number
        colStart: number
        colSpan: number
        label: string
        type: HeaderType
    }

    function hasGroup(infos: ColumnHeaderInfo[]): boolean {
        return infos.some((info) => info.segments && info.segments.length > 1)
    }

    const HEADER_BASE_PX = 40
    const HEADER_ROW_HEIGHT = `calc(${HEADER_BASE_PX}px * var(--scale-ratio, 1))`

    function buildColumnTemplate(infos: ColumnHeaderInfo[]): string {
        const parts = infos.map((info) => {
            const w = info.col.width
            const s = w && String(w).trim()
            return s && s.length > 0 ? s : 'auto'
        })
        return parts.join(' ')
    }

    interface HeaderNode {
        label: string
        level: number
        startCol: number
        endCol: number
        type: HeaderType
        children: HeaderNode[]
    }

    function buildCells(infos: ColumnHeaderInfo[], grouped: boolean, maxDepth: number): HeaderCell[] {
        const cells: HeaderCell[] = []
        if (infos.length === 0) return cells

        const visualColStarts: number[] = []
        let nextCol = 1
        for (let i = 0; i < infos.length; i++) {
            visualColStarts[i] = nextCol++
        }

        if (!grouped) {
            for (let i = 0; i < infos.length; i++) {
                const info = infos[i]
                cells.push({
                    rowStart: 1,
                    rowSpan: 1,
                    colStart: visualColStarts[i],
                    colSpan: 1,
                    label: info.leafLabel,
                    type: info.type
                })
            }
            return cells
        }

        for (let i = 0; i < infos.length; i++) {
            const info = infos[i]
            const isSystem = info.type === 'index' || info.type === 'selection'
            if (!isSystem) continue

            cells.push({
                rowStart: 1,
                rowSpan: maxDepth,
                colStart: visualColStarts[i],
                colSpan: 1,
                label: info.leafLabel,
                type: info.type
            })
        }

        const root: HeaderNode = {
            label: '',
            level: -1,
            startCol: 0,
            endCol: 0,
            type: 'group',
            children: []
        }

        for (let i = 0; i < infos.length; i++) {
            const info = infos[i]
            const isSystem = info.type === 'index' || info.type === 'selection'
            if (isSystem) continue

            const segs = info.segments && info.segments.length > 0 ? info.segments : [info.leafLabel]
            const colPos = visualColStarts[i]
            let current = root

            for (let level = 0; level < segs.length; level++) {
                const label = segs[level]
                const siblings = current.children
                const last = siblings[siblings.length - 1]
                let node: HeaderNode

                if (last && last.label === label && last.level === level) {
                    node = last
                } else {
                    node = {
                        label,
                        level,
                        startCol: colPos,
                        endCol: colPos,
                        type: level === segs.length - 1 ? info.type : 'group',
                        children: []
                    }
                    siblings.push(node)
                }

                if (colPos < node.startCol) node.startCol = colPos
                if (colPos > node.endCol) node.endCol = colPos

                current = node
            }
        }

        function collect(node: HeaderNode) {
            for (const child of node.children) {
                const isLeaf = child.children.length === 0
                const rowStart = child.level + 1
                const colStart = child.startCol
                const colSpan = child.endCol - child.startCol + 1
                const rowSpan = isLeaf ? maxDepth - child.level : 1

                cells.push({
                    rowStart,
                    rowSpan,
                    colStart,
                    colSpan,
                    label: child.label,
                    type: child.type
                })

                collect(child)
            }
        }

        collect(root)

        return cells
    }

    function getHeaderCellStyle(cell: HeaderCell) {
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
            grid-column: ${cell.colStart} / span ${cell.colSpan};
            grid-row: ${cell.rowStart} / span ${cell.rowSpan};
            ${baseStyle}
            ${cell.type === 'group' ? `border-bottom: calc(1px * var(--scale-ratio, 1)) dashed rgb(29, 143, 211);` : ''}
        `
    }

    let frozenInfos = $derived(parseColumns(frozenColumns))
    let scrollableInfos = $derived(parseColumns(scrollableColumns))
    let headerRowCount = $derived(
        (() => {
            const all = [...frozenInfos, ...scrollableInfos]
            let maxDepth = 1
            for (const info of all) {
                if (info.type === 'index' || info.type === 'selection') continue
                const depth = info.segments && info.segments.length > 0 ? info.segments.length : 1
                if (depth > maxDepth) maxDepth = depth
            }
            return maxDepth
        })()
    )
    let hasAnyGroup = $derived(headerRowCount > 1)
    let frozenCells = $derived(buildCells(frozenInfos, hasAnyGroup, headerRowCount))
    let scrollableCells = $derived(buildCells(scrollableInfos, hasAnyGroup, headerRowCount))
    let frozenTemplate = $derived(buildColumnTemplate(frozenInfos))
    let scrollableTemplate = $derived(buildColumnTemplate(scrollableInfos))
</script>

{#if hasVerticalScrollbar}
    {@const padding = verticalScrollbarWidth > 0 ? `${verticalScrollbarWidth}px` : '0px'}
    {@const baseStyle = style ?? ''}
    {@const heightStyle = `height: calc(${HEADER_BASE_PX * headerRowCount}px * var(--scale-ratio, 1));`}
    {@const headerStyle = `${baseStyle ? `${baseStyle}; ` : ''}${heightStyle}; padding-right: ${padding}`}
    <div class="dynamic-table-header {className}" style={headerStyle} {...rest}>
        <div class="header-frozen">
            <div class="header-grid" style={`grid-template-columns: ${frozenTemplate}; grid-template-rows: ${Array(headerRowCount).fill(HEADER_ROW_HEIGHT).join(' ')};`}>
                {#each frozenCells as cell}
                    <div class="header-cell" style={getHeaderCellStyle(cell)} title={cell.label == null ? '' : String(cell.label)}>
                        {#if cell.type === 'selection'}
                            <input type="checkbox" checked={isAllSelected} onclick={toggleAll} class="custom-checkbox" />
                        {:else if cell.type === 'index'}{:else}
                            {@html String(cell.label ?? '')}
                        {/if}
                    </div>
                {/each}
            </div>
        </div>
        <div class="header-scroll" bind:this={scrollEl}>
            <div class="header-grid" style={`grid-template-columns: ${scrollableTemplate}; grid-template-rows: ${Array(headerRowCount).fill(HEADER_ROW_HEIGHT).join(' ')};`}>
                {#each scrollableCells as cell}
                    <div class="header-cell" style={getHeaderCellStyle(cell)} title={cell.label == null ? '' : String(cell.label)}>
                        {#if cell.type === 'selection'}
                            <input type="checkbox" checked={isAllSelected} onclick={toggleAll} class="custom-checkbox" />
                        {:else if cell.type === 'index'}{:else}
                            {@html String(cell.label ?? '')}
                        {/if}
                    </div>
                {/each}
            </div>
        </div>
    </div>
{:else}
    {@const baseStyle = style ?? ''}
    {@const heightStyle = `height: calc(${HEADER_BASE_PX * headerRowCount}px * var(--scale-ratio, 1));`}
    {@const headerStyle = baseStyle ? `${baseStyle}; ${heightStyle}` : heightStyle}
    <div class="dynamic-table-header {className}" style={headerStyle} {...rest}>
        <div class="header-frozen">
            <div class="header-grid" style={`grid-template-columns: ${frozenTemplate}; grid-template-rows: ${Array(headerRowCount).fill(HEADER_ROW_HEIGHT).join(' ')};`}>
                {#each frozenCells as cell}
                    <div class="header-cell" style={getHeaderCellStyle(cell)} title={cell.label == null ? '' : String(cell.label)}>
                        {#if cell.type === 'selection'}
                            <input type="checkbox" checked={isAllSelected} onclick={toggleAll} class="custom-checkbox" />
                        {:else if cell.type === 'index'}{:else}
                            {@html String(cell.label ?? '')}
                        {/if}
                    </div>
                {/each}
            </div>
        </div>
        <div class="header-scroll" bind:this={scrollEl}>
            <div class="header-grid" style={`grid-template-columns: ${scrollableTemplate}; grid-template-rows: ${Array(headerRowCount).fill(HEADER_ROW_HEIGHT).join(' ')};`}>
                {#each scrollableCells as cell}
                    <div class="header-cell" style={getHeaderCellStyle(cell)} title={cell.label == null ? '' : String(cell.label)}>
                        {#if cell.type === 'selection'}
                            <input type="checkbox" checked={isAllSelected} onclick={toggleAll} class="custom-checkbox" />
                        {:else if cell.type === 'index'}{:else}
                            {@html String(cell.label ?? '')}
                        {/if}
                    </div>
                {/each}
            </div>
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
        font-size: calc(15px * var(--scale-ratio, 1));
    }
    .header-frozen {
        display: flex;
        flex: 0 0 auto;
        overflow: hidden;
        z-index: 2;
        background: inherit;
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
    .header-grid {
        display: grid;
        width: max-content;
        min-width: 100%;
    }
    .header-cell {
        height: 100%;
        min-height: calc(36px * var(--scale-ratio, 1));
        box-sizing: border-box;
        padding: 0 calc(4px * var(--scale-ratio, 1));
        border-right: calc(1px * var(--scale-ratio, 1)) dashed rgb(29, 143, 211);
        flex: 0 0 auto;
    }
</style>
