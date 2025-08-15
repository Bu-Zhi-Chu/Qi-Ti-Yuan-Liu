<!-- AttrEditor.svelte
     节点属性编辑器
     提供节点属性的可视化编辑界面
-->
<script lang="ts">
    import { getNodeProps, updateNodeProps } from '../../../services/property-panel/property-panel.service'
    import blocksConfig from '../../blocks/blocks.config.json' assert { type: 'json' }
    interface BlockItem {
        type: string
        nameZh: string
        path: string
    }
    const componentOptions: BlockItem[] = blocksConfig as BlockItem[]

    // 当前选中节点 id（来自外部）
    export let selectedId: string | null = null

    // 当前节点属性快照 & id 值
    let propsSnapshot: ReturnType<typeof getNodeProps> | null = null
    let currentId: string = ''
    let currentName: string = ''
    let currentType: string = ''
    let currentRemark: string = ''
    // 新增根节点判断
    let isRoot = false
    $: isRoot = selectedId === 'root'

    // 可用的组件类型列表
    // 删除原先硬编码
    // const componentTypes = ['SimpleBox', 'ResponsiveBox', 'RealTimeClock']

    // 当选中节点变化时，刷新快照与输入框值
    $: if (selectedId) {
        propsSnapshot = getNodeProps(selectedId)
        currentId = propsSnapshot?.attributes?.id ?? selectedId
        const snapshotName = propsSnapshot?.attributes?.['data-name']
        if (snapshotName !== undefined) {
            currentName = snapshotName
        } else {
            const el = document.querySelector<HTMLElement>(`[data-id="${selectedId}"]`)
            currentName = el?.getAttribute('data-name') ?? ''
        }

        // 获取当前组件类型
        currentType = propsSnapshot?.attributes?.type ?? ''
        // 新增：备注字段读取
        currentRemark = propsSnapshot?.attributes?.['data-remark'] ?? ''
        // 若为根节点，固定名称为“画布”
        if (isRoot) {
            currentName = '画布'
        }
    } else {
        currentId = ''
        currentName = ''
        currentType = ''
        currentRemark = ''
    }

    // 修改 id —— 通过 attributes.id，而不是节点主键 node.id
    function handleIdChange(newId: string) {
        if (!selectedId) return
        currentId = newId
        updateNodeProps(selectedId, {
            attributes: { id: newId }
        })
    }

    function handleNameChange(newName: string) {
        if (!selectedId) return
        currentName = newName
        updateNodeProps(selectedId, {
            attributes: { 'data-name': newName }
        })
    }

    // 修改组件类型
    function handleTypeChange(newType: string) {
        if (!selectedId) return
        currentType = newType
        updateNodeProps(selectedId, {
            attributes: { type: newType }
        })
    }

    // 新增：修改备注
    function handleRemarkChange(newRemark: string) {
        if (!selectedId) return
        currentRemark = newRemark
        updateNodeProps(selectedId, {
            attributes: { 'data-remark': newRemark }
        })
    }
</script>

<div class="attr-editor">
    {#if selectedId}
        <h3>节点属性</h3>
        <div class="attr-list">
            <div class="attr-item">
                <label for="node-id">id:</label>
                <input id="node-id" type="text" bind:value={currentId} oninput={(e) => handleIdChange(e.currentTarget.value)} placeholder="输入节点ID..." />
                <span class="unit-placeholder"></span>
            </div>
            <div class="attr-item">
                <label for="node-name">name:</label>
                <input id="node-name" type="text" bind:value={currentName} oninput={(e) => handleNameChange(e.currentTarget.value)} placeholder="输入节点名称..." disabled={isRoot} />
                <span class="unit-placeholder"></span>
            </div>
            <div class="attr-item">
                <label for="node-type">type:</label>
                {#if isRoot}
                    <input id="node-type-text" type="text" value="画布" disabled />
                {:else}
                    <select id="node-type" bind:value={currentType} onchange={(e) => handleTypeChange(e.currentTarget.value)}>
                        <option value="">请选择组件类型...</option>
                        {#each componentOptions as item}
                            <option value={item.type}>{item.nameZh}</option>
                        {/each}
                    </select>
                {/if}
                <span class="unit-placeholder"></span>
            </div>
            <!-- 新增备注字段 -->
            <div class="attr-item">
                <label for="node-remark">备注:</label>
                <textarea id="node-remark" rows="3" bind:value={currentRemark} oninput={(e) => handleRemarkChange(e.currentTarget.value)} placeholder="输入备注..." style="resize: vertical;"></textarea>
                <span class="unit-placeholder"></span>
            </div>
        </div>
    {:else}
        <p class="placeholder">请选择一个节点来编辑属性</p>
    {/if}
</div>

<style>
    .attr-editor {
        padding: calc(20px * var(--scale-ratio, 1));
        color: #e2e8f0;
    }
    h3 {
        margin: 0 0 calc(16px * var(--scale-ratio, 1)) 0;
        font-size: calc(16px * var(--scale-ratio, 1));
        font-weight: 600;
        color: #cbd5e1;
    }
    .attr-list {
        display: flex;
        flex-direction: column;
        gap: calc(12px * var(--scale-ratio, 1));
    }
    .attr-item {
        display: grid;
        grid-template-columns: calc(40px * var(--scale-ratio, 1)) 1fr calc(40px * var(--scale-ratio, 1));
        align-items: center;
        gap: calc(8px * var(--scale-ratio, 1));
        padding: calc(12px * var(--scale-ratio, 1));
        background: rgba(255, 255, 255, 0.05);
        border-radius: calc(8px * var(--scale-ratio, 1));
        transition: all 0.3s ease;
    }
    .unit-placeholder {
        width: 100%;
        height: 100%;
    }
    .attr-item:hover {
        background: rgba(255, 255, 255, 0.08);
        transform: translateY(-1px);
    }
    label {
        min-width: calc(80px * var(--scale-ratio, 1));
        font-size: calc(13px * var(--scale-ratio, 1));
        font-weight: 500;
        color: #94a3b8;
    }
    input {
        flex: 1;
        padding: calc(8px * var(--scale-ratio, 1)) calc(12px * var(--scale-ratio, 1));
        border: calc(1px * var(--scale-ratio, 1)) solid rgba(255, 255, 255, 0.2);
        border-radius: calc(6px * var(--scale-ratio, 1));
        font-size: calc(13px * var(--scale-ratio, 1));
        background: rgba(255, 255, 255, 0.1);
        color: #e2e8f0;
        transition: all 0.3s ease;
    }
    input:focus {
        outline: none;
        border-color: #cbd5e1;
        background: rgba(255, 255, 255, 0.15);
        box-shadow: 0 0 0 calc(3px * var(--scale-ratio, 1)) rgba(255, 255, 255, 0.1);
    }
    input::placeholder {
        color: #9ca3af;
    }
    /* 新增：统一下拉框样式 */
    select {
        flex: 1;
        padding: calc(8px * var(--scale-ratio, 1)) calc(12px * var(--scale-ratio, 1));
        border: calc(1px * var(--scale-ratio, 1)) solid rgba(255, 255, 255, 0.2);
        border-radius: calc(6px * var(--scale-ratio, 1));
        font-size: calc(13px * var(--scale-ratio, 1));
        background: rgba(255, 255, 255, 0.1);
        color: #e2e8f0;
        transition: all 0.3s ease;
        appearance: none;
    }
    select:focus {
        outline: none;
        border-color: #cbd5e1;
        background: rgba(255, 255, 255, 0.15);
        box-shadow: 0 0 0 calc(3px * var(--scale-ratio, 1)) rgba(255, 255, 255, 0.1);
    }
    /* 新增：下拉选项面板默认白底，统一成深色背景提高可读性 */
    select option {
        background: #1e293b;
        color: #e2e8f0;
    }
    /* 统一禁用态样式 */
    input:disabled,
    select:disabled {
        cursor: not-allowed;
        opacity: 0.6;
    }
    .placeholder {
        color: #64748b;
        font-style: italic;
        text-align: center;
        margin-top: calc(40px * var(--scale-ratio, 1));
        font-size: calc(14px * var(--scale-ratio, 1));
    }
    /* 新增：textarea 样式与 input 保持一致 */
    textarea {
        flex: 1;
        padding: calc(8px * var(--scale-ratio, 1)) calc(12px * var(--scale-ratio, 1));
        border: calc(1px * var(--scale-ratio, 1)) solid rgba(255, 255, 255, 0.2);
        border-radius: calc(6px * var(--scale-ratio, 1));
        font-size: calc(13px * var(--scale-ratio, 1));
        background: rgba(255, 255, 255, 0.1);
        color: #e2e8f0;
        transition: all 0.3s ease;
        min-height: calc(60px * var(--scale-ratio, 1));
    }
    textarea:focus {
        outline: none;
        border-color: #cbd5e1;
        background: rgba(255, 255, 255, 0.15);
        box-shadow: 0 0 0 calc(3px * var(--scale-ratio, 1)) rgba(255, 255, 255, 0.1);
    }
    textarea::placeholder {
        color: #9ca3af;
    }
</style>
