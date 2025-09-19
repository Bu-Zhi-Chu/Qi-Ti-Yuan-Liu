<!-- DataEditor.svelte
     节点数据绑定编辑器
     现在只支持JavaScript代码方式，不再处理dataProps
-->
<script lang="ts">
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    import { getNodeProps as _getNodeProps, getNodePropsStore, updateNodeProps, getFullNode } from '../../../services/property-panel/property-panel.service'
    import PropertyRow from './PropertyRow.svelte'
    import PropertySelect from './PropertySelect.svelte'

    let { selectedId = null } = $props<{ selectedId?: string | null }>()
    let dataSnapshot = $state<ReturnType<typeof _getNodeProps> | null>(null)

    let unsubscribe = () => {}
    $effect(() => {
        unsubscribe()
        if (selectedId) {
            const store = getNodePropsStore(selectedId)
            dataSnapshot = _getNodeProps(selectedId)
            unsubscribe = store.subscribe(() => {
                dataSnapshot = _getNodeProps(selectedId)
            })
        } else {
            dataSnapshot = null
        }
        return () => {
            unsubscribe()
            unsubscribe = () => {}
        }
    })

    // 当前值
    let currentValues = $state<Record<string, any>>({})
    $effect(() => {
        currentValues = { ...(dataSnapshot?.attributes || {}) }
    })

    function handleAttrChange(key: string, value: any) {
        if (!selectedId) return
        updateNodeProps(selectedId, { attributes: { [key]: value } })
    }
</script>

<div class="data-editor">
    <PropertyRow label="数据接入">
        <PropertySelect
            value={currentValues.dataSource ?? 'json'}
            options={[
                { value: 'json', label: '临时数据' },
                { value: 'real', label: '真实请求' }
            ]}
            change={(v) => handleAttrChange('dataSource', v)}
        />
    </PropertyRow>
</div>

<style>
    .data-editor {
        padding: calc(20px * var(--scale-ratio, 1));
        color: #e2e8f0;
    }

    /* 行间距：仅作用于本页签，其他面板已自带 */
    :global(.data-editor .property-row:not(:last-child)) {
        margin-bottom: calc(12px * var(--scale-ratio, 1));
    }
</style>
