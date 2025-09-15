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
        let dp: any = dataPropsDef()
        if (!dp) return []

        // 若按图表类型区分，则根据当前节点属性中的 chartType 选择
        if (dp && typeof dp === 'object' && !Array.isArray(dp)) {
            const ct = dataSnapshot?.attributes?.chartType ?? 'bar'
            if (dp[ct]) dp = dp[ct]
        }

        const entries: PropEntry[] = []
        const globalLabelMap: any = dp.label || {}
        const globalType: string = dp.type || 'json'

        for (const [key, cfg] of Object.entries(dp)) {
            if (["label", "type"].includes(key)) continue
            // 新增 name/value 字段支持
            if (key === "name" || key === "value") {
                const labelKey = key === "name" ? "name" : "value"
                const labelText = globalLabelMap[labelKey] || (key === "name" ? "名称" : "数值")
                const defVal = cfg && typeof cfg === "object" && "default" in cfg ? (cfg as any).default : cfg
                const isPrimitiveArray = Array.isArray(defVal) && defVal.every((v) => ["string", "number", "boolean"].includes(typeof v))
                entries.push({ key, label: labelText, type: isPrimitiveArray ? "array" : globalType, default: defVal })
                continue
            }
            if (key === "default") {
                // 其他图表使用 data 字段
                entries.push({ key: "data", label: globalLabelMap.name ?? "数据", type: globalType, default: cfg })
            } else {
                const label = globalLabelMap && globalLabelMap[key] ? globalLabelMap[key] : key
                const defVal = cfg && typeof cfg === "object" && "default" in cfg ? (cfg as any).default : cfg
                const isPrimitiveArray = Array.isArray(defVal) && defVal.every((v) => ["string", "number", "boolean"].includes(typeof v))
                entries.push({ key, label, type: isPrimitiveArray ? "array" : globalType, default: defVal })
            }
        }
        return entries
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
                { value: 'mock', label: '虚拟接口' },
                { value: 'real', label: '真实请求' }
            ]}
            change={(v) => handleAttrChange('dataSource', v)}
        />
    </PropertyRow>

    {#if selectedId && propEntries().length}
        {#each propEntries() as p (p.key)}
            {#if (currentValues.dataSource ?? 'json') === 'json'}
                <PropertyRow label={p.label}>
                    {#if p.type === 'select'}
                        <PropertySelect value={currentValues[p.key]} options={p.options} change={(v) => handleAttrChange(p.key, v)} />
                    {:else if p.type === 'number'}
                        <input type="number" min={p.min} max={p.max} value={currentValues[p.key] ?? ''} oninput={(e) => handleAttrChange(p.key, +(e.currentTarget as HTMLInputElement).value)} />
                    {:else if p.type === 'size'}
                        <SizeInput value={currentValues[p.key] ?? ''} unit="px" unitOptions={['px']} convert={(v) => v} on:change={({ detail }) => handleAttrChange(p.key, detail.value)} />
                    {:else if p.type === 'array'}
                        <textarea
                            rows="4"
                            oninput={(e) => {
                                const txt = (e.currentTarget as HTMLTextAreaElement).value
                                try {
                                    const val = JSON.parse(txt)
                                    if (Array.isArray(val)) {
                                        handleAttrChange(p.key, val)
                                    }
                                } catch {
                                    // ignore parse errors
                                }
                            }}
                        >
                            {JSON.stringify(currentValues[p.key] ?? p.default)}
                        </textarea>
                    {:else if p.type === 'json'}
                        <textarea
                            rows="6"
                            oninput={(e) => {
                                try {
                                    const val = JSON.parse((e.currentTarget as HTMLTextAreaElement).value)
                                    handleAttrChange(p.key, val)
                                } catch {}
                            }}
                        >
                            {JSON.stringify(currentValues[p.key] ?? p.default, null, 2)}
                        </textarea>
                    {:else}
                        <input type="text" value={currentValues[p.key] ?? ''} oninput={(e) => handleAttrChange(p.key, (e.currentTarget as HTMLInputElement).value)} />
                    {/if}
                </PropertyRow>
            {/if}
        {/each}

        {#if (currentValues.dataSource ?? 'json') === 'real'}
            <PropertyRow label="请求路径">
                <input type="text" value={currentValues.requestPath ?? ''} oninput={(e) => handleAttrChange('requestPath', (e.currentTarget as HTMLInputElement).value)} placeholder="/api/chart-data" />
            </PropertyRow>
        {/if}
    {:else}
        <p class="placeholder">{selectedId ? '当前组件没有可绑定的数据项' : '请选择一个节点'}</p>
    {/if}
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

    .placeholder {
        color: #64748b;
        font-style: italic;
        text-align: center;
        margin-top: calc(40px * var(--scale-ratio, 1));
        font-size: calc(14px * var(--scale-ratio, 1));
    }
</style>
