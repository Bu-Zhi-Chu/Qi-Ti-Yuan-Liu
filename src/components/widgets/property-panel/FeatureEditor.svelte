<!-- FeatureEditor.svelte
     根据不同节点类型展示特性设置行
-->
<script lang="ts">
    import { getNodePropsStore, getNodeProps as _getNodeProps, getFullNode, updateNodeProps } from '../../../services/property-panel/property-panel.service'
    import blocksConfig from '../../blocks/blocks.config.json'
    import PropertyRow from './PropertyRow.svelte'
    import PropertySelect from './PropertySelect.svelte'
    import ToggleSwitch from '../ToggleSwitch.svelte'

    // 派生当前选中节点的 featureProps
    const featureProps = $derived(() => {
        if (!selectedId) return null
        const node = getFullNode(selectedId)
        if (!node) return null
        const type = (node.componentType || (node.attributes as any)?.type) as string | undefined
        if (!type) return null
        return (blocksConfig as any[]).find((c) => c.type === type)?.featureProps ?? null
    })

    let { selectedId = null } = $props<{ selectedId?: string | null }>()

    // 当前节点 props 快照
    let propsSnapshot = $state<ReturnType<typeof _getNodeProps> | null>(null)
    // 订阅节点属性变化
    let unsubscribe = () => {}
    $effect(() => {
        unsubscribe()
        if (selectedId) {
            const store = getNodePropsStore(selectedId)
            propsSnapshot = _getNodeProps(selectedId)
            unsubscribe = store.subscribe(() => {
                propsSnapshot = _getNodeProps(selectedId)
            })
        } else {
            propsSnapshot = null
        }
        return () => {
            unsubscribe()
            unsubscribe = () => {}
        }
    })

    // 派生下拉 options

    // 派生属性描述数组
    type PropEntry = { key: string; label: string; type: string; options?: any[]; min?: number; max?: number; default?: any }
    const propEntries: () => PropEntry[] = $derived(() => {
        const fp = featureProps()
        if (!fp) return []
        return Object.entries(fp).map(([key, cfg]: [string, any]) => ({ key, ...cfg }))
    })

    // 当前各属性绑定值
    let currentValues = $state<Record<string, any>>({})
    $effect(() => {
        const attrs = propsSnapshot?.attributes || {}
        // 更新 currentValues，同时保留响应式引用
        currentValues = { ...attrs }
    })
    function handleAttrChange(key: string, value: any) {
        currentValues[key] = value
        if (selectedId) {
            updateNodeProps(selectedId, { attributes: { [key]: value } })
        }
    }

    // 当选中节点切换或 propEntries 更新时，若某些特性属性未设置，则赋默认值（取 options 第一个值）
    $effect(() => {
        if (!selectedId) return
        const entries = propEntries()
        if (!entries.length) return
        const updates: Record<string, any> = {}
        for (const p of entries) {
            if ((currentValues as any)[p.key] === undefined) {
                if (p.type === 'select' && p.options?.length) {
                    updates[p.key] = p.options[0].value
                } else if (p.type === 'number' && p.default !== undefined) {
                    updates[p.key] = p.default
                } else if (p.type === 'switch') {
                    // 默认为配置的 default 或 false，避免 undefined 造成 Svelte 报错
                    updates[p.key] = p.default !== undefined ? p.default : false
                }
                // 未来可在此扩展其他类型默认值
            }
        }
        if (Object.keys(updates).length) {
            currentValues = { ...currentValues, ...updates }
            updateNodeProps(selectedId, { attributes: updates })
        }
    })
</script>

{#if propEntries().length}
    <div class="feature-editor">
        <h3>特性设置</h3>
        {#each propEntries() as p (p.key)}
            <PropertyRow label={`${p.label}`}>
                {#if p.type === 'select'}
                    <PropertySelect bind:value={currentValues[p.key]} options={p.options} change={(v) => handleAttrChange(p.key, v)} />
                {:else if p.type === 'number'}
                    <input type="number" min={p.min} max={p.max} bind:value={currentValues[p.key]} oninput={(e) => handleAttrChange(p.key, +(e.currentTarget as HTMLInputElement).value)} class="number-input" />
                {:else if p.type === 'switch'}
                    <ToggleSwitch checked={currentValues[p.key] ?? false} on:change={(e) => handleAttrChange(p.key, e.detail)} />
                {/if}
                <!-- 其他类型控件可在此扩展 -->
            </PropertyRow>
        {/each}
    </div>
{/if}

<style>
    .feature-editor {
        padding: calc(20px * var(--scale-ratio, 1));
        color: #e2e8f0;
    }
    h3 {
        margin: 0 0 calc(16px * var(--scale-ratio, 1)) 0;
        font-size: calc(16px * var(--scale-ratio, 1));
        font-weight: 600;
        color: #cbd5e1;
    }
</style>
