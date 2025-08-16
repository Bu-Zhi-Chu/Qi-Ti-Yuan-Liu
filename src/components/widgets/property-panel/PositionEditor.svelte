<!-- PositionEditor.svelte
     节点定位属性编辑器
     提供节点定位相关属性的可视化编辑界面
-->
<script lang="ts">
    import { getNodeProps, updateNodeProps } from '../../../services/property-panel/property-panel.service'

    // 外部传入当前选中节点 id
    export let selectedId: string | null = null

    // 当前节点样式快照
    let isRoot: boolean = false
    let styleSnapshot: ReturnType<typeof getNodeProps> | null = null

    // 本地可编辑字段
    let currentPosition: 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky' = 'static'

    // 根节点判定
    $: isRoot = selectedId === 'root'

    // 当选中节点变化时，同步样式
    $: if (selectedId) {
        styleSnapshot = getNodeProps(selectedId)
        currentPosition = (styleSnapshot?.styles?.position as any) || 'static'
    } else {
        currentPosition = 'static'
    }

    function handlePositionChange(val: string) {
        if (!selectedId || isRoot) return
        currentPosition = val as any
        updateNodeProps(selectedId, { styles: { position: val } })
    }
</script>

<div class="position-editor">
    {#if selectedId}
        <h3>定位属性</h3>
        <div class="position-list">
            <div class="position-item">
                <label for="node-position">定位类型:</label>
                {#if isRoot}
                    <input id="node-position-text" type="text" value="静态 (static)" disabled class="disabled-input" />
                {:else}
                    <select id="node-position" bind:value={currentPosition} onchange={(e) => handlePositionChange(e.currentTarget.value)}>
                        <option value="static">静态 (static)</option>
                        <option value="relative">相对 (relative)</option>
                        <option value="absolute">绝对 (absolute)</option>
                        <option value="fixed">固定 (fixed)</option>
                        <option value="sticky">粘性 (sticky)</option>
                    </select>
                {/if}
                <span class="unit-placeholder"></span>
            </div>
        </div>
    {:else}
        <p class="placeholder">请选择一个节点来编辑样式</p>
    {/if}
</div>

<style>
    .position-editor {
        padding: calc(20px * var(--scale-ratio, 1));
        color: #e2e8f0;
    }
    h3 {
        margin: 0 0 calc(16px * var(--scale-ratio, 1)) 0;
        font-size: calc(16px * var(--scale-ratio, 1));
        font-weight: 600;
        color: #cbd5e1;
    }
    .position-list {
        display: flex;
        flex-direction: column;
        gap: calc(12px * var(--scale-ratio, 1));
    }
    .position-item {
        display: flex;
        align-items: center;
        gap: calc(10px * var(--scale-ratio, 1));
        border-radius: calc(8px * var(--scale-ratio, 1));
        transition: all 0.3s ease;
    }

    .unit-placeholder {
        width: calc(40px * var(--scale-ratio, 1));
    }

    label {
        min-width: calc(30px * var(--scale-ratio, 1));
        font-size: calc(13px * var(--scale-ratio, 1));
        font-weight: 500;
        color: #94a3b8;
    }
    input,
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

    select:focus,
    input:focus {
        outline: none;
        border-color: #cbd5e1;
        background: rgba(255, 255, 255, 0.15);
        box-shadow: 0 0 0 calc(3px * var(--scale-ratio, 1)) rgba(255, 255, 255, 0.1);
    }
    select option {
        background: #1e293b;
        color: #e2e8f0;
    }

    /* 统一禁用态样式 */
    select:disabled,
    input:disabled {
        cursor: not-allowed;
        opacity: 0.5;
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
