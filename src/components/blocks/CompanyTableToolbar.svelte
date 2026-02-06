<script lang="ts">
    import { getContext } from 'svelte'
    import DatePicker from './DatePicker.svelte'

    interface QueryCondition {
        id?: string
        name?: string
        type?: 'input' | 'select' | 'date' | 'datetime' | 'year'
        disabled?: boolean
    }

    interface ActionButtonConfig {
        name?: string
        icon?: string
        buttonType?: string
        disabled?: boolean
    }

    interface Props {
        style?: string
        class?: string
        queryConditions?: QueryCondition[]
        actionButtons?: ActionButtonConfig[]
        [key: string]: any
    }

    let { style = '', class: className = '', queryConditions, actionButtons, ...rest }: Props = $props()

    const normalizedConditions = $derived((): QueryCondition[] => {
        const source = queryConditions
        if (!Array.isArray(source) || source.length === 0) {
            return [
                {
                    name: '条件一',
                    type: 'input',
                    disabled: false
                }
            ]
        }
        return source.map((item: any): QueryCondition => {
            if (typeof item === 'string') {
                return {
                    name: item,
                    type: 'input' as const,
                    disabled: false
                }
            }
            if (!item || typeof item !== 'object') {
                return {
                    name: '',
                    type: 'input' as const,
                    disabled: false
                }
            }
            const name = typeof item.name === 'string' ? item.name : ''
            const type = item.type === 'select' || item.type === 'date' || item.type === 'datetime' || item.type === 'year' ? item.type : 'input'
            const disabled = item.disabled === true
            return { name, type, disabled }
        })
    })

    const normalizedButtons = $derived((): ActionButtonConfig[] => {
        const fallback: ActionButtonConfig[] = [
            { name: '查询', icon: 'search', buttonType: 'search', disabled: false },
            { name: '新增', icon: 'add', buttonType: 'add', disabled: false },
            { name: '删除', icon: 'delete', buttonType: 'delete', disabled: false },
            { name: '输出excel', icon: 'excel', buttonType: 'export', disabled: false }
        ]
        if (!Array.isArray(actionButtons) || actionButtons.length === 0) {
            return fallback
        }
        return actionButtons.map((item: any, index): ActionButtonConfig => {
            if (!item || typeof item !== 'object') {
                return fallback[index] || fallback[0]
            }
            const name = typeof item.name === 'string' && item.name ? item.name : fallback[index]?.name || fallback[0].name
            const icon = typeof item.icon === 'string' && item.icon ? item.icon : fallback[index]?.icon || fallback[0].icon
            const buttonType = typeof item.buttonType === 'string' && item.buttonType ? item.buttonType : fallback[index]?.buttonType || fallback[0].buttonType
            const disabled = item.disabled === true
            return { name, icon, buttonType, disabled }
        })
    })

    const context = getContext<any>('company-table')

    const baseUrl = import.meta.env.BASE_URL || '/'
    const searchIcon = `${baseUrl}img/hold/search.png`
    const addIcon = `${baseUrl}img/hold/edit_add.png`
    const removeIcon = `${baseUrl}img/hold/edit_remove.png`
    const excelIcon = `${baseUrl}img/hold/excel.png`

    function resolveIcon(key?: string) {
        if (key === 'search') return searchIcon
        if (key === 'add') return addIcon
        if (key === 'delete') return removeIcon
        if (key === 'excel') return excelIcon
        return searchIcon
    }

    function handleAddClick() {
        context?.toggleExtraRegion?.()
    }

    function handleButtonClick(btn: ActionButtonConfig) {
        if (btn.buttonType === 'add') {
            handleAddClick()
        }
    }

    const currentYear = new Date().getFullYear()
    let yearValues = $state<Record<number, number>>({})

    function getYearDisplay(index: number): number {
        const v = yearValues[index]
        return typeof v === 'number' && Number.isFinite(v) ? v : currentYear
    }

    function setYearValue(index: number, value: number) {
        if (!Number.isFinite(value)) return
        yearValues = { ...yearValues, [index]: value }
    }

</script>

<div {style} class={className} {...rest}>
    {#if normalizedConditions().length > 0}
        {#each normalizedConditions().filter((c: QueryCondition) => !c.disabled) as cond, index}
            <div class="company-table-condition" style={index === 0 ? 'margin-left: calc(5px * var(--scale-ratio, 1));' : ''}>
                {#if cond?.name}
                    <span class="company-table-condition-label">{cond.name}</span>
                {/if}
                {#if cond?.type === 'select'}
                    <select class="company-table-input">
                        <option value="">请选择</option>
                    </select>
                {:else if cond?.type === 'date'}
                    <DatePicker mode="date" />
                {:else if cond?.type === 'datetime'}
                    <DatePicker mode="datetime" />
                {:else if cond?.type === 'year'}
                    {@const year = getYearDisplay(index)}
                    <DatePicker
                        mode="year"
                        value={new Date(year, 0, 1)}
                        disabled={cond?.disabled}
                        onChange={(d) => {
                            const y = d.getFullYear()
                            setYearValue(index, y)
                        }}
                    />
                {:else}
                    <input class="company-table-input" type="text" placeholder="" />
                {/if}
            </div>
        {/each}
    {/if}
    {#each normalizedButtons().filter((b) => !b.disabled) as btn}
        <button type="button" class="company-table-btn" onclick={() => handleButtonClick(btn)}>
            <img class="company-table-btn-icon" src={resolveIcon(btn.icon)} alt="" />
            {btn.name}
        </button>
    {/each}
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
