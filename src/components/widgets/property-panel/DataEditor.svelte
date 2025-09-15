<!-- DataEditor.svelte
     节点数据绑定编辑器
     负责展示和编辑节点的 dataProps
-->
<script lang="ts">
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    import { getNodeProps as _getNodeProps, getNodePropsStore, updateNodeProps, getFullNode } from '../../../services/property-panel/property-panel.service'
    import blocksConfig from '../../blocks/blocks.config.json'
    import PropertyRow from './PropertyRow.svelte'
    import PropertySelect from './PropertySelect.svelte'
    import SizeInput from './SizeInput.svelte'

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

    // derive dataProps definition for current node type
    const dataPropsDef = $derived(() => {
        if (!selectedId) return null
        const node = getFullNode(selectedId)
        if (!node) return null
        const type = (node.componentType || (node.attributes as any)?.type) as string | undefined
        if (!type) return null
        return (blocksConfig as any[]).find((c) => c.type === type)?.dataProps ?? null
    })

    // 属性条目
    type PropEntry = { key: string; label: string; type: string; options?: any[]; min?: number; max?: number; default?: any }
    const propEntries: () => PropEntry[] = $derived(() => {
        const dp = dataPropsDef()
        if (!dp) return []
        return Object.entries(dp).map(([key, cfg]: [string, any]) => ({ key, ...cfg }))
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
    {#if selectedId && propEntries().length}
        <h3>数据绑定</h3>
        {#each propEntries() as p (p.key)}
            <PropertyRow label={p.label}>
                {#if p.type === 'select'}
                    <PropertySelect value={currentValues[p.key]} options={p.options} change={(v) => handleAttrChange(p.key, v)} />
                {:else if p.type === 'number'}
                    <input type="number" min={p.min} max={p.max} value={currentValues[p.key] ?? ''} oninput={(e) => handleAttrChange(p.key, +(e.currentTarget as HTMLInputElement).value)} />
                {:else if p.type === 'size'}
                    <SizeInput value={currentValues[p.key] ?? ''} unit="px" unitOptions={['px']} convert={(v) => v} on:change={({ detail }) => handleAttrChange(p.key, detail.value)} />
                {:else if p.type === 'json'}
                    <textarea
                        rows="6"
                        oninput={(e) => {
                            try {
                                const val = JSON.parse((e.currentTarget as HTMLTextAreaElement).value)
                                handleAttrChange(p.key, val)
                            } catch {}
                        }}
                    >{JSON.stringify(currentValues[p.key] ?? p.default, null, 2)}</textarea>
                {:else}
                    <input type="text" value={currentValues[p.key] ?? ''} oninput={(e) => handleAttrChange(p.key, (e.currentTarget as HTMLInputElement).value)} />
                {/if}
            </PropertyRow>
        {/each}
    {:else}
        <p class="placeholder">{selectedId ? '当前组件没有可绑定的数据项' : '请选择一个节点'}</p>
    {/if}
</div>

<style>
    .data-editor {
        padding: calc(20px * var(--scale-ratio, 1));
        color: #e2e8f0;
    }

    h3 {
        margin: 0 0 calc(16px * var(--scale-ratio, 1)) 0;
        font-size: calc(16px * var(--scale-ratio, 1));
        font-weight: 600;
        color: #cbd5e1;
    }

    .placeholder {
        color: #64748b;
        font-style: italic;
        text-align: center;
        margin-top: calc(40px * var(--scale-ratio, 1));
        font-size: calc(14px * var(--scale-ratio, 1));
    }
</style>