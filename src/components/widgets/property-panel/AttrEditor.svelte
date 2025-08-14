<!-- AttrEditor.svelte
     节点属性编辑器
     提供节点属性的可视化编辑界面
-->
<script lang="ts">
    import { updateNodeProperties } from '../../../services/repository/dom-tree.store.svelte'

    // 属性面板需要的参数
    export let selectedId: string | null = null
    let currentId: string = ''

    $: if (selectedId) {
        currentId = selectedId
    }

    function handleIdChange(newId: string) {
        if (!selectedId) return
        updateNodeProperties(selectedId, { id: newId })
    }
</script>

<div class="attr-editor">
    {#if selectedId}
        <h3>节点属性</h3>
        <div class="attr-list">
            <div class="attr-item">
                <label for="node-id">id:</label>
                <input 
                    id="node-id" 
                    type="text" 
                    bind:value={currentId}
                    on:input={(e) => handleIdChange(e.currentTarget.value)} 
                    placeholder="输入节点ID..." 
                />
            </div>
        </div>
    {:else}
        <p class="placeholder">请选择一个节点来编辑属性</p>
    {/if}
</div>

<style>
    .attr-editor {
        padding: calc(20px * var(--scale-ratio, 1));
        background: #0f172a;
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
        display: flex;
        align-items: center;
        gap: calc(12px * var(--scale-ratio, 1));
        padding: calc(12px * var(--scale-ratio, 1));
        background: rgba(255, 255, 255, 0.05);
        border-radius: calc(8px * var(--scale-ratio, 1));
        transition: all 0.3s ease;
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
        border: 1px solid rgba(255, 255, 255, 0.2);
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
