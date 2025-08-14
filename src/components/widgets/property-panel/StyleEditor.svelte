<!-- StyleEditor.svelte
     节点样式编辑器
     提供节点样式的可视化编辑界面
-->
<script lang="ts">
    import { STYLE_WHITELIST } from '../../../services/property-panel/constants'
    import { getNodeProps, updateNodeProps } from '../../../services/property-panel/property-panel.service'

    export let selectedId: string | null = null
    let styleSnapshot: ReturnType<typeof getNodeProps> | null = null
    let currentStyles: Record<string, string> = {}

    $: if (selectedId) {
        styleSnapshot = getNodeProps(selectedId)
        currentStyles = styleSnapshot?.styles || {}
    }

    function handleStyleChange(key: string, value: string) {
        if (!selectedId) return

        currentStyles[key] = value
        updateNodeProps(selectedId, {
            styles: { [key]: value }
        })
    }

    function handleStyleRemove(key: string) {
        if (!selectedId) return

        delete currentStyles[key]
        updateNodeProps(selectedId, {
            styles: { [key]: undefined }
        })
    }
</script>

<div class="style-editor">
    {#if selectedId && styleSnapshot}
        <h3>节点样式</h3>
        <div class="style-list">
            {#each STYLE_WHITELIST as styleKey}
                <div class="style-item">
                    <label for="style-{styleKey}">{styleKey}:</label>
                    <input id="style-{styleKey}" type="text" value={currentStyles[styleKey] || ''} on:input={(e) => handleStyleChange(styleKey, e.currentTarget.value)} placeholder={`输入${styleKey}值...`} />
                    {#if currentStyles[styleKey]}
                        <button class="remove-btn" on:click={() => handleStyleRemove(styleKey)} title="移除样式">×</button>
                    {/if}
                </div>
            {/each}
        </div>
    {:else}
        <p class="placeholder">请选择一个节点来编辑样式</p>
    {/if}
</div>

<style>
    .style-editor {
        padding: calc(20px * var(--scale-ratio, 1));
    }

    h3 {
        margin: 0 0 calc(16px * var(--scale-ratio, 1)) 0;
        font-size: calc(16px * var(--scale-ratio, 1));
        font-weight: 600;
        color: #cbd5e1;
    }

    .style-list {
        display: flex;
        flex-direction: column;
        gap: calc(12px * var(--scale-ratio, 1));
    }

    .style-item {
        display: flex;
        align-items: center;
        gap: calc(12px * var(--scale-ratio, 1));
        padding: calc(12px * var(--scale-ratio, 1));
        background: white;
        border-radius: calc(8px * var(--scale-ratio, 1));
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        transition: all 0.3s ease;
    }

    .style-item:hover {
        box-shadow: 0 4px 8px rgba(99, 102, 241, 0.1);
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
        border: 1px solid #e5e7eb;
        border-radius: calc(6px * var(--scale-ratio, 1));
        font-size: calc(13px * var(--scale-ratio, 1));
        background: #f9fafb;
        transition: all 0.3s ease;
    }

    input:focus {
        outline: none;
        border-color: #6366f1;
        background: white;
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    }

    input::placeholder {
        color: #9ca3af;
    }

    .remove-btn {
        width: calc(24px * var(--scale-ratio, 1));
        height: calc(24px * var(--scale-ratio, 1));
        padding: 0;
        border: none;
        background: rgba(239, 68, 68, 0.2);
        color: #f87171;
        border-radius: 50%;
        cursor: pointer;
        font-size: calc(14px * var(--scale-ratio, 1));
        line-height: 1;
        transition: all 0.3s ease;
    }

    .remove-btn:hover {
        background: linear-gradient(135deg, #dc2626, #b91c1c);
        transform: scale(1.1);
        box-shadow: 0 4px 8px rgba(239, 68, 68, 0.3);
    }

    .remove-btn:active {
        transform: scale(0.95);
    }

    .placeholder {
        color: #64748b;
        font-style: italic;
        text-align: center;
        margin-top: calc(40px * var(--scale-ratio, 1));
        font-size: calc(14px * var(--scale-ratio, 1));
    }
</style>
