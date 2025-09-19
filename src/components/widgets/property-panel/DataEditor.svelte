<!-- DataEditor.svelte
     节点数据绑定编辑器
     现在只支持JavaScript代码方式，不再处理dataProps
-->
<script lang="ts">
    import { getNodeProps as _getNodeProps, getNodePropsStore, updateNodeProps } from '../../../services/property-panel/property-panel.service'
    import PropertyRow from './PropertyRow.svelte'
    import PropertySelect from './PropertySelect.svelte'

    let { selectedId = null } = $props<{ selectedId?: string | null }>()

    // 1. 快照 + 订阅（完全照抄 FeatureEditor）
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

    // 2. 合并 attributes + styles（和 FeatureEditor 完全一致）
    let currentValues = $state<Record<string, any>>({})
    $effect(() => {
        const attrs = dataSnapshot?.attributes || {}
        const styles = dataSnapshot?.styles || {}
        currentValues = { ...attrs, ...styles }   // 样式覆盖属性，保持与 NodeRenderer 同样优先级
    })

    let dataArrays = $state<string[]>([])
    let codeMatches: RegExpMatchArray[] = []

    /** 当 code 变化时解析其中的 data: [] 数组 */
    $effect(() => {
        const code = currentValues.code as unknown as string | undefined
        if (typeof code === 'string') {
            const regex = /data\s*:\s*\[[^\]]*\]/g
            codeMatches = [...code.matchAll(regex)]
            dataArrays = codeMatches.map((m) =>
                m[0]
                    .replace(/^[^\[]*\[/, '')
                    .replace(/\]$/, '')
                    .trim()
            )
        } else {
            codeMatches = []
            dataArrays = []
        }
    })

    /** 实时更新第 index 个 data 数组的内容 */
    function updateDataArray(index: number, newValue: string) {
        if (!selectedId) return
        const oldCode = currentValues.code as unknown as string | undefined
        if (typeof oldCode !== 'string') return

        let i = 0
        const newCode = oldCode.replace(/data\s*:\s*\[[^\]]*\]/g, (match) => {
            if (i === index) {
                i++
                return `data: [${newValue}]`
            }
            i++
            return match
        })
        // 立即触发属性更新
        handleAttrChange('code', newCode)
    }

    function handleAttrChange(key: string, value: any) {
        if (!selectedId) return
        // DataEditor 只改 attributes；styles 由别的面板处理
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

    {#each dataArrays as arr, idx}
        <PropertyRow label={`数据数组 ${idx + 1}`}>
            <!-- 实时绑定 + 实时同步 -->
            <textarea
                class="input-style"
                rows="3"
                bind:value={dataArrays[idx]}
                oninput={() => updateDataArray(idx, dataArrays[idx])}
            ></textarea>
        </PropertyRow>
    {/each}
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
