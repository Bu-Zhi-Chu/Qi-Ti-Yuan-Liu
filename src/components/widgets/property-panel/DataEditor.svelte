<!-- DataEditor.svelte
     节点数据绑定编辑器
     现在只支持JavaScript代码方式，不再处理dataProps
-->
<script lang="ts">
    import { getNodeProps as _getNodeProps, getNodePropsStore, updateNodeProps, getFullNode } from '../../../services/property-panel/property-panel.service'
    import PropertyRow from './PropertyRow.svelte'
    import PropertySelect from './PropertySelect.svelte'
    import CodeEditor from '../CodeEditor.svelte'
    import blocksConfig from '../../blocks/blocks.config.json'
    import { dataMappingKeysStore } from '../../../stores/data-mapping.store.svelte'

    let { selectedId = null } = $props<{ selectedId?: string | null }>()

    // 1. 快照 + 订阅（完全照抄 FeatureEditor）
    let dataSnapshot = $state<ReturnType<typeof _getNodeProps> | null>(null)
    let unsubscribe = () => {}
    let dataMappingKeys = $state<string[]>([])

    $effect(() => {
        unsubscribe()
        if (selectedId) {
            const store = getNodePropsStore(selectedId)
            dataSnapshot = _getNodeProps(selectedId)
            unsubscribe = store.subscribe(() => {
                dataSnapshot = _getNodeProps(selectedId)
            })

            // 订阅数据映射键
            const dataMappingUnsubscribe = dataMappingKeysStore.subscribe((allKeys) => {
                dataMappingKeys = allKeys[selectedId] || []
            })

            // 在清理时取消订阅
            return () => {
                unsubscribe()
                dataMappingUnsubscribe()
            }
        } else {
            dataSnapshot = null
            dataMappingKeys = []
        }
        return () => {
            unsubscribe()
            unsubscribe = () => {}
        }
    })

    // 2. 使用 $derived 进行响应式状态派生
    let currentValues = $derived(dataSnapshot ? { ...(dataSnapshot.attributes || {}), ...(dataSnapshot.styles || {}) } : {})

    // 导入序列提取服务
    import { extractSeriesFromCode, getSeriesMapping } from '../../../services/property-panel/series-extractor.service'

    const derivedState = $derived(() => {
        const code = currentValues.code as string | undefined
        const seriesData = currentValues.seriesData as string[] | undefined

        if (!code) {
            return {
                finalData: seriesData || [],
                matches: [] as RegExpMatchArray[],
                needsWriteBack: false
            }
        }

        // JSON 模式下，使用序列提取服务
        const extraction = extractSeriesFromCode(code, seriesData)
        const needsWriteBack = JSON.stringify(seriesData) !== JSON.stringify(extraction.dataArrays)

        return { finalData: extraction.dataArrays, matches: extraction.matches, needsWriteBack }
    })

    let dataArrays = $derived(derivedState().finalData)
    let codeMatches = $derived(derivedState().matches)

    let seriesMapping = $derived(() => {
        const mapping = currentValues.seriesMapping as string[] | undefined
        if (mapping && Array.isArray(mapping) && mapping.length === dataArrays.length) {
            return mapping
        }
        return Array(dataArrays.length).fill('')
    })

    // 3. 使用 $effect 单独处理副作用（回写）
    $effect(() => {
        if (selectedId && derivedState().needsWriteBack) {
            handleAttrChange('seriesData', dataArrays)
        }
    })

    // 派生状态：获取当前组件类型
    let componentType = $derived(selectedId ? getFullNode(selectedId)?.componentType || null : null)

    // 派生状态：获取组件级别的 dataSource 配置
    let dataSourceConfig = $derived(componentType ? getComponentDataSourceConfig(componentType) : null)

    // 派生状态：获取最终的 dataSource 值
    let dataSource = $derived(currentValues.dataSource ?? dataSourceConfig?.default ?? 'json')

    // 派生状态：获取完整的 dataSource 配置（包含 dataAccess 和其他配置）
    let fullDataSourceConfig = $derived(componentType ? getFullDataSourceConfig(componentType) : null)

    /** 实时更新第 index 个 data 数组的内容 */
    function updateDataArray(index: number, newValue: string) {
        if (!selectedId || dataArrays[index] === newValue) return

        // 创建新数组以触发状态更新
        const newDataArrays = [...dataArrays]
        newDataArrays[index] = newValue

        // 直接更新 seriesData 属性
        handleAttrChange('seriesData', newDataArrays)
    }

    /** 实时更新第 index 个 data 映射路径 */
    function updateSeriesMapping(index: number, path: string) {
        if (!selectedId || seriesMapping()[index] === path) return

        const newMapping = [...seriesMapping()]
        newMapping[index] = path

        handleAttrChange('seriesMapping', newMapping)
    }

    // 获取序列数量（用于映射）
    function getSeriesCount(): number {
        if (dataSource === 'json') {
            return dataArrays.length
        } else {
            return currentValues.seriesData?.length || 0
        }
    }

    function handleAttrChange(key: string, value: any) {
        if (!selectedId) return
        // DataEditor 只改 attributes；styles 由别的面板处理
        const attributesToUpdate: { [k: string]: any } = { [key]: value }
        if (key === 'dataSource' && (value === 'mock' || value === 'real')) {
            attributesToUpdate.seriesData = undefined
        }
        // 当切换回 json 模式时，清除 seriesMapping
        if (key === 'dataSource' && value === 'json') {
            attributesToUpdate.seriesMapping = undefined
        }
        updateNodeProps(selectedId, { attributes: attributesToUpdate })
    }

    // 工具函数：获取组件级别的 dataSource 配置
    function getComponentDataSourceConfig(componentType: string): any | null {
        const componentConfig = (blocksConfig as any[]).find((b) => b.type === componentType)
        return componentConfig?.dataSource?.dataAccess || null
    }

    // 工具函数：获取完整的 dataSource 配置
    function getFullDataSourceConfig(componentType: string): any | null {
        const componentConfig = (blocksConfig as any[]).find((b) => b.type === componentType)
        return componentConfig?.dataSource || null
    }

    // 获取中文序数词函数
    const getChineseOrdinal = (num: number) => {
        const ordinals = ['第一', '第二', '第三', '第四', '第五', '第六', '第七', '第八', '第九', '第十']
        return ordinals[num] || `第${num + 1}`
    }
</script>

<div class="data-editor">
    {#if dataSourceConfig}
        <PropertyRow label={dataSourceConfig.label}>
            <PropertySelect value={currentValues.dataSource ?? dataSourceConfig.default ?? 'json'} options={dataSourceConfig.options || []} change={(v) => handleAttrChange('dataSource', v)} />
        </PropertyRow>
    {/if}

    <!-- 请求路径配置：只在选择真实请求时显示 -->
    {#if fullDataSourceConfig?.requestPath && (currentValues.dataSource ?? dataSourceConfig?.default ?? 'json') === 'real'}
        <PropertyRow label={fullDataSourceConfig.requestPath.label}>
            <input type="text" value={currentValues.requestPath ?? fullDataSourceConfig.requestPath.default ?? '/api/data'} onchange={(e) => handleAttrChange('requestPath', (e.target as HTMLInputElement).value)} class="request-path-input" placeholder="请输入请求路径" />
        </PropertyRow>
    {/if}

    <!-- 模拟平台链接组：只在选择模拟接口时显示 -->
    {#if fullDataSourceConfig?.mockPlatforms && (currentValues.dataSource ?? dataSourceConfig?.default ?? 'json') === 'mock'}
        <PropertyRow label={fullDataSourceConfig.mockPlatforms.label}>
            <div class="link-group" style="display:flex; gap: calc(8px * var(--scale-ratio, 1)); flex:1 1 0; width:0;">
                {#each fullDataSourceConfig.mockPlatforms.links || [] as link}
                    <a class="input-style link-btn" href={link.url} target="_blank" rel="noopener noreferrer" style="flex:1;">{link.label}</a>
                {/each}
            </div>
        </PropertyRow>
    {/if}

    <!-- 模拟路径配置：只在选择模拟接口时显示 -->
    {#if fullDataSourceConfig?.mockPath && (currentValues.dataSource ?? dataSourceConfig?.default ?? 'json') === 'mock'}
        <PropertyRow label={fullDataSourceConfig.mockPath.label}>
            <input type="text" value={currentValues.mockPath ?? fullDataSourceConfig.mockPath.default ?? '/api/mock'} onchange={(e) => handleAttrChange('mockPath', (e.target as HTMLInputElement).value)} class="request-path-input" placeholder="请输入模拟路径" />
        </PropertyRow>
    {/if}

    <!-- 根据数据源显示不同的编辑器 -->

    <!-- 虚拟数据(json)模式：编辑 seriesData -->
    {#if dataSource === 'json'}
        {#if currentValues.code && dataArrays.length > 0}
            {#each dataArrays as arr, idx}
                <PropertyRow label={`${getChineseOrdinal(idx)}序列`}>
                    <CodeEditor code={dataArrays[idx]} language="javascript" theme="one-dark" height="calc(80px * var(--scale-ratio, 1))" run={(code: string) => updateDataArray(idx, code)} toolbar={false} autoRun={true} wrap={true} showLineNumbers={false} style="flex:1; width:0;" />
                </PropertyRow>
            {/each}
        {/if}
    {/if}

    <!-- 动态数据(mock/real)模式：编辑 seriesMapping -->
    {#if dataSource === 'mock' || dataSource === 'real'}
        {#if getSeriesCount() > 0}
            {#each Array(getSeriesCount()) as _, idx}
                <PropertyRow label={`${getChineseOrdinal(idx)}映射`}>
                    {#if dataMappingKeys.length > 0}
                        <PropertySelect value={seriesMapping()[idx] || ''} options={dataMappingKeys.map((k) => ({ label: k, value: k }))} change={(v) => updateSeriesMapping(idx, v)} placeholder="选择数据字段" />
                    {:else}
                        <input type="text" class="request-path-input" placeholder="e.g., data.values" value={seriesMapping()[idx] || ''} onchange={(e) => updateSeriesMapping(idx, (e.target as HTMLInputElement).value)} />
                    {/if}
                </PropertyRow>
            {/each}
        {/if}
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

    /* 请求路径输入框样式 */
    .request-path-input {
        flex: 1;
        width: 0;
        background: rgba(15, 23, 42, 0.8);
        border: 1px solid rgba(51, 65, 85, 0.8);
        border-radius: calc(4px * var(--scale-ratio, 1));
        padding: calc(8px * var(--scale-ratio, 1)) calc(12px * var(--scale-ratio, 1));
        color: #e2e8f0;
        font-size: calc(14px * var(--scale-ratio, 1));
        transition: border-color 0.2s ease;
    }

    .request-path-input:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
    }

    .request-path-input::placeholder {
        color: rgba(148, 163, 184, 0.6);
    }

    /* 链接按钮样式 - 与FeatureEditor保持一致 */
    .link-btn {
        padding: calc(6px * var(--scale-ratio, 1)) calc(10px * var(--scale-ratio, 1));
        font-size: calc(12px * var(--scale-ratio, 1));
    }

    /* 链接按钮组样式 */
    .link-group {
        display: flex;
        gap: calc(8px * var(--scale-ratio, 1));
        flex: 1 1 0;
        width: 0;
    }

    /* 输入样式 - 与FeatureEditor保持一致 */
    .input-style {
        flex: 1;
        padding: calc(8px * var(--scale-ratio, 1)) calc(12px * var(--scale-ratio, 1));
        border: calc(1px * var(--scale-ratio, 1)) solid rgba(255, 255, 255, 0.2);
        border-radius: calc(6px * var(--scale-ratio, 1));
        font-size: calc(13px * var(--scale-ratio, 1));
        background: rgba(255, 255, 255, 0.1);
        color: #e2e8f0;
        transition: all 0.3s ease;
        cursor: pointer;
        text-align: center;
        text-decoration: none;
    }
    .input-style:hover {
        background: rgba(255, 255, 255, 0.15);
    }
    .input-style:focus {
        outline: none;
        border-color: #cbd5e1;
        background: rgba(255, 255, 255, 0.15);
        box-shadow: 0 0 0 calc(3px * var(--scale-ratio, 1)) rgba(255, 255, 255, 0.1);
    }
    .input-style:hover {
        border-color: rgba(99, 102, 241, 0.5);
    }
    .input-style:active,
    .input-style:focus {
        border-color: #6366f1;
        box-shadow: 0 0 0 calc(3px * var(--scale-ratio, 1)) rgba(99, 102, 241, 0.2);
    }
</style>
