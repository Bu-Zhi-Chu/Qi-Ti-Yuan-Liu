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
        currentValues = { ...attrs, ...styles } // 样式覆盖属性，保持与 NodeRenderer 同样优先级
    })

    let dataArrays = $state<string[]>([])
    let codeMatches: RegExpMatchArray[] = []

    // 派生状态：获取当前组件类型
    let componentType = $derived(selectedId ? getFullNode(selectedId)?.componentType || null : null)

    // 派生状态：获取组件级别的 dataSource 配置
    let dataSourceConfig = $derived(componentType ? getComponentDataSourceConfig(componentType) : null)

    // 派生状态：获取完整的 dataSource 配置（包含 dataAccess 和其他配置）
    let fullDataSourceConfig = $derived(componentType ? getFullDataSourceConfig(componentType) : null)

    /** 当 code 变化时解析其中的 data: [] 数组 */
    $effect(() => {
        const code = currentValues.code as unknown as string | undefined
        if (typeof code === 'string') {
            // 匹配 data: [] 数组，但排除 legend.data 等配置数据
            const allMatches = [...code.matchAll(/data\s*:\s*(\[[^\]]*\])/g)]

            // 过滤掉 legend.data 等非系列数据
            codeMatches = allMatches.filter((match) => {
                const matchStart = match.index!
                const beforeMatch = code.substring(Math.max(0, matchStart - 20), matchStart)
                // 检查是否是 legend.data 或其他非系列配置
                return !beforeMatch.includes('legend') && !beforeMatch.includes('tooltip')
            })

            dataArrays = codeMatches.map((m) => m[1]) // 只存储数组内容 [x,x] 格式，不包含 data:
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

        let matchIndex = 0
        const newCode = oldCode.replace(/data\s*:\s*\[[^\]]*\]/g, (match, offset) => {
            // 检查这个匹配是否是 legend.data 或其他非系列配置
            const beforeMatch = oldCode.substring(Math.max(0, offset - 20), offset)
            if (beforeMatch.includes('legend') || beforeMatch.includes('tooltip')) {
                return match // 跳过 legend.data 等配置
            }

            if (matchIndex === index) {
                matchIndex++
                return `data: ${newValue}` // newValue 只包含数组内容，需要添加 data: 前缀
            }
            matchIndex++
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

    /** 获取中文序数词 */
    function getChineseOrdinal(num: number): string {
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

    <!-- 当 code 属性存在、有 data 数组且数据源为 json（虚拟数据）时显示序列编辑器 -->
    {#if currentValues.code && dataArrays.length > 0 && (currentValues.dataSource ?? dataSourceConfig?.default ?? 'json') === 'json'}
        {#each dataArrays as arr, idx}
            <PropertyRow label={`${getChineseOrdinal(idx)}序列`}>
                <!-- 使用 CodeEditor 显示完整的 [x,x] 数组格式 -->
                <CodeEditor bind:code={dataArrays[idx]} language="javascript" theme="one-dark" height="calc(80px * var(--scale-ratio, 1))" run={(code: string) => updateDataArray(idx, code)} toolbar={false} autoRun={true} wrap={true} showLineNumbers={false} style="flex:1; width:0;" />
            </PropertyRow>
        {/each}
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
