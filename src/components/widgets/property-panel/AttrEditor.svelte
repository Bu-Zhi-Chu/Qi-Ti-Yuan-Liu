<!-- AttrEditor.svelte
     节点属性编辑器
     提供节点属性的可视化编辑界面
-->
<script lang="ts">
    import { getNodeProps, updateNodeProps } from '../../../services/property-panel/property-panel.service'

    // 当前选中节点 id（来自外部）
    export let selectedId: string | null = null

    // 当前节点属性快照 & id 值
    let propsSnapshot: ReturnType<typeof getNodeProps> | null = null
    let currentId: string = ''
    let currentName: string = ''
    // 新增根节点判断
    let isRoot = false
    $: isRoot = selectedId === 'root'

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
    } else {
        currentId = ''
        currentName = ''
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
            {#if !isRoot}
                <div class="attr-item">
                    <label for="node-name">name:</label>
                    <input id="node-name" type="text" bind:value={currentName} oninput={(e) => handleNameChange(e.currentTarget.value)} placeholder="输入节点名称..." />
                    <span class="unit-placeholder"></span>
                </div>
            {/if}
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
        box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.1);
    }
    input::placeholder {
        color: #9ca3af;
    }
    .placeholder {
        color: #64748b;
        font-style: italic;
        text-align: center;
        margin-top: calc(40px * var(--scale-ratio, 1));
        font-size: calc(14px * var(--scale-ratio, 1));
    }
</style>
