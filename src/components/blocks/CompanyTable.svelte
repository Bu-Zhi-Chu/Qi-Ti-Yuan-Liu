<script lang="ts">
    import { setContext } from 'svelte'
    import ResponsiveBox from '../core/ResponsiveBox.svelte'
    import NodeRenderer from '../widgets/NodeRenderer.svelte'
    import type { DomNode } from '../../types/dom-node.types'

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
            <div class="company-table-right-extra {extraHeightPercent > 0 ? 'expanded' : ''}" style={`height: ${extraHeightPercent}%;`}></div>
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
    }
    .company-table-right-extra.expanded {
        border: calc(1px * var(--scale-ratio, 1)) solid rgb(26, 156, 254);
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
