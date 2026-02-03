<script lang="ts">
    import { setContext } from 'svelte'
    import ResponsiveBox from '../core/ResponsiveBox.svelte'
    import NodeRenderer from '../widgets/NodeRenderer.svelte'
    import type { DomNode } from '../../types/dom-node.types'
    import { domTreeVersionStore, domTree, findNodeById } from '../../stores/dom-tree.store.svelte'

    interface Props {
        style?: string
        'data-id'?: string
        childrenNodes?: DomNode[]
        selectedId?: string | null
        editing?: boolean
        select?: (id: string) => void
        [key: string]: any
    }

    let { style = '', 'data-id': dataId = '', childrenNodes = [], selectedId = null, editing = false, select, ...restProps }: Props = $props()

    let containerRef: HTMLDivElement
    let leftWidthPercent = $state(11.8)
    let extraHeightPercent = $state(0)

    const rightWidthPercent = $derived(87 + (11.8 - leftWidthPercent))
    const rightLeftPercent = $derived(leftWidthPercent + 0.7)
    const splitPercent = $derived(leftWidthPercent + 0.45)

    const baseUrl = import.meta.env.BASE_URL || '/'
    const searchIcon = `${baseUrl}img/hold/search.png`
    const addIcon = `${baseUrl}img/hold/edit_add.png`
    const removeIcon = `${baseUrl}img/hold/edit_remove.png`
    const excelIcon = `${baseUrl}img/hold/excel.png`

    function handleAddClick() {
        extraHeightPercent = extraHeightPercent === 0 ? 26 : 0
    }

    const toolbarContext = {
        toggleExtraRegion: () => {
            handleAddClick()
        }
    }

    setContext('company-table', toolbarContext)

    let isDragging = false

    function handleResizerPointerDown(event: PointerEvent) {
        if (!containerRef) return
        isDragging = true
        const move = (e: PointerEvent) => {
            if (!isDragging || !containerRef) return
            const rect = containerRef.getBoundingClientRect()
            if (rect.width <= 0) return
            const rel = ((e.clientX - rect.left) / rect.width) * 100
            let next = rel - 0.55
            const min = 0
            const max = 98.8
            if (next < min) next = min
            if (next > max) next = max
            leftWidthPercent = next
        }
        const up = () => {
            isDragging = false
            window.removeEventListener('pointermove', move)
            window.removeEventListener('pointerup', up)
        }
        window.addEventListener('pointermove', move)
        window.addEventListener('pointerup', up)
        event.preventDefault()
    }

    function fillChild(node: DomNode | undefined): DomNode | null {
        if (!node) return null
        const styles = { ...(node.styles ?? {}) }
        styles.width = '100%'
        styles.height = '100%'
        styles.left = '0%'
        styles.top = '0%'
        styles.position = 'absolute'
        return { ...node, styles }
    }

    const treeNode = $derived.by(() => fillChild(childrenNodes.find((n) => n.componentType === 'FilterTree') ?? childrenNodes[0]))
    const tableNode = $derived.by(() => fillChild(childrenNodes.find((n) => n.componentType === 'DynamicTable') ?? childrenNodes[1]))
    const toolbarNode = $derived.by(() => childrenNodes.find((n) => n.componentType === 'CompanyTableToolbar') ?? null)

    const addFormFields = $derived.by(() => {
        // Track dom tree version to ensure updates when properties change
        $domTreeVersionStore

        // Find the raw table node directly from childrenNodes to get the ID
        const rawTableNode = childrenNodes.find((n) => n.componentType === 'DynamicTable') ?? childrenNodes[1]

        if (!rawTableNode) return []

        // Fetch the latest node data from the global store to ensure we have the most up-to-date properties
        const latestTableNode = findNodeById(domTree, rawTableNode.id) || rawTableNode

        // Default column labels if componentProps or columnLabels is missing
        const defaultLabels = ['列1', '列2', '列3']
        // Access properties directly from the latest node
        const props = latestTableNode.componentProps || {}
        const attrs = latestTableNode.attributes || {}
        let labels = attrs.columnLabels || props.columnLabels
        if (!labels || labels.length === 0) {
            labels = attrs.headers || props.headers
        }
        if (!labels || labels.length === 0) {
            labels = defaultLabels
        }

        return labels
            .map((col: any, index: number) => {
                if (typeof col === 'string') {
                    return { label: col, index, type: 'default' }
                }
                return {
                    label: col?.label || `列${index + 1}`,
                    index,
                    type: col?.type || 'default'
                }
            })
            .filter((col: any) => !['index', 'selection', 'operation'].includes(col.type))
    })

    let currentPage = $state(0)
    const itemsPerPage = 12 // 3 columns * 4 rows

    const pages = $derived.by(() => {
        const result = []
        for (let i = 0; i < addFormFields.length; i += itemsPerPage) {
            result.push(addFormFields.slice(i, i + itemsPerPage))
        }
        return result
    })

    function goToPage(index: number) {
        if (index >= 0 && index < pages.length) {
            currentPage = index
        }
    }
</script>

<ResponsiveBox {style} data-id={dataId} {...restProps}>
    <div class="company-table" bind:this={containerRef}>
        <div class="company-table-left" style={`width: ${leftWidthPercent}%;`}>
            {#if treeNode}
                <NodeRenderer node={treeNode} {selectedId} {editing} {select} />
            {/if}
        </div>
        <div class="company-table-resizer" style={`left: ${splitPercent}%;`} onpointerdown={handleResizerPointerDown}></div>
        <div class="company-table-right" style={`width: ${rightWidthPercent}%; left: ${rightLeftPercent}%;`}>
            {#if toolbarNode}
                <NodeRenderer node={toolbarNode} {selectedId} {editing} {select} />
            {:else}
                <div class="company-table-right-toolbar">
                    <button type="button" class="company-table-btn">
                        <img class="company-table-btn-icon" src={searchIcon} alt="" />
                        查询
                    </button>
                    <button type="button" class="company-table-btn" onclick={handleAddClick}>
                        <img class="company-table-btn-icon" src={addIcon} alt="" />
                        新增
                    </button>
                    <button type="button" class="company-table-btn">
                        <img class="company-table-btn-icon" src={removeIcon} alt="" />
                        删除
                    </button>
                    <button type="button" class="company-table-btn">
                        <img class="company-table-btn-icon" src={excelIcon} alt="" />
                        输出excel
                    </button>
                </div>
            {/if}
            <div class="company-table-right-extra {extraHeightPercent > 0 ? 'expanded' : ''}" style={`height: ${extraHeightPercent}%;`}>
                <div class="company-table-right-extra-wrapper">
                    <div class="company-table-right-extra-slider" style={`transform: translateX(-${currentPage * (100 / (pages.length || 1))}%) translateZ(0); width: ${pages.length * 100}%;`}>
                        {#each pages as page, pageIndex}
                            <div class="company-table-right-extra-page" style={`width: ${100 / pages.length}%;`}>
                                {#each page as field (field.label + '_' + field.index)}
                                    <div class="company-table-input-group">
                                        <span class="company-table-input-label">{field.label}</span>
                                        <input class="company-table-input" type="text" />
                                    </div>
                                {/each}
                            </div>
                        {/each}
                    </div>
                </div>
                {#if pages.length > 1}
                    <div class="company-table-pagination">
                        <div class="pagination-track">
                            <div class="pagination-line"></div>
                            <div class="pagination-active-dot" style={`left: calc(${currentPage} * 72px * var(--scale-ratio, 1) + 36px * var(--scale-ratio, 1));`}></div>
                            <div class="pagination-items">
                                {#each pages as _, i}
                                    <button type="button" class="pagination-item" onclick={() => goToPage(i)} aria-label={`跳转到第${i + 1}页`} aria-current={currentPage === i ? 'page' : undefined}>
                                        <div class="pagination-dot-anchor"></div>
                                        <span class="pagination-number {currentPage === i ? 'active' : ''}">{i + 1}</span>
                                    </button>
                                {/each}
                            </div>
                        </div>
                    </div>
                {/if}
            </div>
            <div class="company-table-right-table">
                {#if tableNode}
                    <NodeRenderer node={tableNode} {selectedId} {editing} {select} />
                {/if}
            </div>
        </div>
    </div>
</ResponsiveBox>

<style>
    .company-table {
        position: relative;
        width: 100%;
        height: 100%;
        box-sizing: border-box;
    }
    .company-table-left,
    .company-table-right {
        position: absolute;
        box-sizing: border-box;
    }
    .company-table-left {
        height: 98.1%;
        top: 0.7%;
        left: 0.2%;
    }
    .company-table-right {
        height: 99.1%;
        top: 0.1%;
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
        padding: calc(4px * var(--scale-ratio, 1));
        gap: calc(8px * var(--scale-ratio, 1));
    }
    .company-table-right-toolbar {
        flex: 0 0 auto;
        height: 3.4%;
        display: flex;
        justify-content: flex-start;
        align-items: center;
        gap: calc(16px * var(--scale-ratio, 1));
    }
    .company-table-btn {
        min-width: calc(56px * var(--scale-ratio, 1));
        height: calc(28px * var(--scale-ratio, 1));
        padding: 0 calc(8px * var(--scale-ratio, 1));
        border-radius: calc(5px * var(--scale-ratio, 1));
        border: calc(1px * var(--scale-ratio, 1)) solid rgb(106, 177, 239);
        background: rgb(0, 128, 236);
        color: #ffffff;
        font-size: calc(15px * var(--scale-ratio, 1));
        line-height: 1;
        cursor: pointer;
        box-sizing: border-box;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: calc(4px * var(--scale-ratio, 1));
    }
    .company-table-btn:hover {
        background: rgb(60, 160, 245);
    }
    .company-table-btn-icon {
        width: calc(16px * var(--scale-ratio, 1));
        height: calc(16px * var(--scale-ratio, 1));
        display: block;
    }
    .company-table-right-extra {
        flex: 0 0 auto;
        height: 0;
        transition: height 0.25s ease;
        box-sizing: border-box;
        border-radius: calc(5px * var(--scale-ratio, 1));
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }
    .company-table-right-extra.expanded {
        border: calc(1px * var(--scale-ratio, 1)) solid rgb(26, 156, 254);
    }
    .company-table-right-extra-wrapper {
        flex: 1;
        width: 100%;
        overflow: hidden;
        position: relative;
    }
    .company-table-right-extra-slider {
        display: flex;
        height: 100%;
        transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);
    }
    .company-table-right-extra-page {
        height: 100%;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        grid-template-rows: repeat(4, min-content);
        align-content: start;
        padding: calc(16px * var(--scale-ratio, 1));
        row-gap: calc(16px * var(--scale-ratio, 1));
        column-gap: calc(56px * var(--scale-ratio, 1));
        box-sizing: border-box;
        overflow-y: auto;
    }
    .company-table-pagination {
        flex: 0 0 auto;
        height: calc(48px * var(--scale-ratio, 1));
        display: flex;
        justify-content: center;
        align-items: flex-start;
        padding-bottom: calc(8px * var(--scale-ratio, 1));
    }
    .pagination-track {
        position: relative;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
    }
    .pagination-items {
        display: flex;
        gap: 0;
        position: relative;
        z-index: 1;
    }
    .pagination-item {
        width: calc(72px * var(--scale-ratio, 1));
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        position: relative;
        gap: calc(4px * var(--scale-ratio, 1));
        border: none;
        background: transparent;
        padding: 0;
    }
    .pagination-number {
        font-size: calc(12px * var(--scale-ratio, 1));
        color: #999;
        transition: color 0.2s;
    }
    .pagination-number.active {
        color: rgb(26, 156, 254);
        font-weight: bold;
    }
    .pagination-dot-anchor {
        width: calc(14px * var(--scale-ratio, 1));
        height: calc(14px * var(--scale-ratio, 1));
        border-radius: 50%;
        border: calc(1px * var(--scale-ratio, 1)) solid #ddd;
        background-color: #fff;
        box-sizing: border-box;
        box-shadow: 0 0 0 calc(4px * var(--scale-ratio, 1)) #fff;
    }
    .pagination-line {
        position: absolute;
        top: calc(7px * var(--scale-ratio, 1));
        left: calc(36px * var(--scale-ratio, 1));
        right: calc(36px * var(--scale-ratio, 1));
        height: calc(1px * var(--scale-ratio, 1));
        border-bottom: calc(1px * var(--scale-ratio, 1)) dashed #ddd;
        width: auto;
    }
    .pagination-active-dot {
        position: absolute;
        top: calc(7px * var(--scale-ratio, 1));
        width: calc(14px * var(--scale-ratio, 1));
        height: calc(14px * var(--scale-ratio, 1));
        background-color: rgb(26, 156, 254);
        border-radius: 50%;
        transform: translate(-50%, -50%);
        transition: left 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);
        z-index: 2;
    }

    .company-table-input-group {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: calc(8px * var(--scale-ratio, 1));
        min-width: calc(120px * var(--scale-ratio, 1));
    }
    .company-table-input-label {
        font-size: calc(12px * var(--scale-ratio, 1));
        color: #000;
        white-space: nowrap;
        flex-shrink: 0;
        width: calc(120px * var(--scale-ratio, 1));
        text-align: right;
    }
    .company-table-input {
        width: calc(225px * var(--scale-ratio, 1));
        height: calc(28px * var(--scale-ratio, 1));
        border: calc(1px * var(--scale-ratio, 1)) solid rgb(26, 156, 254);
        padding: 0 calc(8px * var(--scale-ratio, 1));
        font-size: calc(13px * var(--scale-ratio, 1));
        outline: none;
        box-sizing: border-box;
    }
    .company-table-input:focus {
        border-color: rgb(26, 156, 254);
    }
    .company-table-right-table {
        flex: 1 1 auto;
        min-height: 0;
        position: relative;
        box-sizing: border-box;
        overflow: hidden;
    }
    .company-table-resizer {
        position: absolute;
        top: 0;
        bottom: 0;
        width: calc(6px * var(--scale-ratio, 1));
        transform: translateX(-50%);
        cursor: ew-resize;
    }
</style>
