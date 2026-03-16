<script lang="ts">
    import { getContext } from 'svelte'
    import NodeRenderer from '../widgets/NodeRenderer.svelte'
    import type { DomNode } from '../../types/dom-node.types'

    interface ActionButtonConfig {
        name?: string
        buttonType?: string
        disabled?: boolean
    }

    interface Props {
        style?: string
        class?: string
        queryConditions?: any[]
        actionButtons?: ActionButtonConfig[]
        childrenNodes?: DomNode[]
        selectedId?: string | null
        editing?: boolean
        selectionBorderDisabled?: boolean
        select?: (id: string) => void
        [key: string]: any
    }

    let { style = '', class: className = '', queryConditions, actionButtons, childrenNodes = [], selectedId = null, editing = false, selectionBorderDisabled = false, select, ...rest }: Props = $props()

    const normalizedButtons = $derived((): ActionButtonConfig[] => {
        const fallback: ActionButtonConfig[] = [
            { name: '查询', buttonType: 'search', disabled: false },
            { name: '新增', buttonType: 'add', disabled: false },
            { name: '删除', buttonType: 'delete', disabled: false },
            { name: '输出excel', buttonType: 'export', disabled: false }
        ]
        if (!Array.isArray(actionButtons) || actionButtons.length === 0) {
            return fallback
        }
        return actionButtons.map((item: any, index): ActionButtonConfig => {
            if (!item || typeof item !== 'object') {
                return fallback[index] || fallback[0]
            }
            const name = typeof item.name === 'string' && item.name ? item.name : fallback[index]?.name || fallback[0].name
            const buttonType = typeof item.buttonType === 'string' && item.buttonType ? item.buttonType : fallback[index]?.buttonType || fallback[0].buttonType
            const disabled = item.disabled === true
            return { name, buttonType, disabled }
        })
    })

    const context = getContext<any>('company-table')

    function handleAddClick() {
        context?.toggleExtraRegion?.()
    }

    function handleButtonClick(btn: ActionButtonConfig) {
        if (btn.buttonType === 'add') {
            handleAddClick()
        }
    }

    const conditionNodes: () => DomNode[] = $derived(() => (childrenNodes ?? []).filter((n) => n.componentType === 'ConditionInput'))
    const buttonNodes: () => DomNode[] = $derived(() => (childrenNodes ?? []).filter((n) => n.componentType === 'Button'))
</script>

<div {style} class={className} {...rest}>
    {#if conditionNodes().length > 0}
        {#each conditionNodes() as condNode, index}
            {@const condConfig = Array.isArray(queryConditions) ? queryConditions[index] : null}
            {#if !condConfig || condConfig.disabled !== true}
                {@const displayName = condConfig && typeof condConfig.name === 'string' && condConfig.name.trim().length > 0 ? condConfig.name : condNode.attributes?.['data-name']}
                <div class="company-table-condition" style={index === 0 ? 'margin-left: calc(5px * var(--scale-ratio, 1));' : ''}>
                    {#if displayName}
                        <span class="company-table-condition-label">{displayName}</span>
                    {/if}
                    <NodeRenderer node={condNode} {selectedId} {editing} {selectionBorderDisabled} {select} />
                </div>
            {/if}
        {/each}
    {/if}
    {#if buttonNodes().length > 0}
        {#each buttonNodes() as btnNode}
            <NodeRenderer node={btnNode} {selectedId} {editing} {selectionBorderDisabled} {select} />
        {/each}
    {:else}
        {#each normalizedButtons().filter((b) => !b.disabled) as btn}
            <button type="button" class="company-table-btn" onclick={() => handleButtonClick(btn)}>
                {btn.name}
            </button>
        {/each}
    {/if}
</div>

<style>
    .company-table-condition {
        display: inline-flex;
        align-items: center;
        gap: calc(8px * var(--scale-ratio, 1));
    }

    .company-table-condition-label {
        font-size: calc(14px * var(--scale-ratio, 1));
        color: rgb(51, 51, 51);
        white-space: nowrap;
    }

    .company-table-input {
        width: calc(125px * var(--scale-ratio, 1));
        height: calc(28px * var(--scale-ratio, 1));
        padding: 0 calc(8px * var(--scale-ratio, 1));
        border-radius: 0;
        border: calc(1px * var(--scale-ratio, 1)) solid rgb(26, 156, 254);
        background: #ffffff;
        color: #000000;
        font-size: calc(13px * var(--scale-ratio, 1));
        box-sizing: border-box;
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
</style>
