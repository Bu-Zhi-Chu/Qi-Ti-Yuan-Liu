<!-- AttrEditor.svelte
     节点属性编辑器
     提供节点属性的可视化编辑界面
-->
<script lang="ts">
    import type { DomNode } from '../../../types/dom-node.types'
    import { ATTR_WHITELIST } from '../../../services/property-panel/constants'
    import { getNodeProps, updateNodeProps } from '../../../services/property-panel/property-panel.service'
    import { findNodeById, domTree } from '../../../services/repository/dom-tree.store.svelte'

    // 属性面板需要的参数
    export let selectedId: string | null = null
    let propsSnapshot: ReturnType<typeof getNodeProps> | null = null
    let currentAttributes: Record<string, string> = {}
    let selectedNode: DomNode | null = null

    $: if (selectedId) {
        propsSnapshot = getNodeProps(selectedId)
        currentAttributes = propsSnapshot?.attributes || {}
        selectedNode = findNodeById(domTree, selectedId)
    }

    // 获取映射后的属性值
    function getMappedValue(key: string): string {
        if (!selectedNode) return ''

        // id 映射到真实 id
        if (key === 'id') {
            return currentAttributes['id'] || selectedNode.id || ''
        }
        
        // name 映射到 data-name
        if (key === 'name') {
            return currentAttributes['name'] || ''
        }
        
        // 类型 映射到 componentType
        if (key === '类型') {
            return selectedNode.componentType || 'SimpleBox'
        }
        
        return currentAttributes[key] || ''
    }

    // 设置映射后的属性值
    function handleAttributeChange(key: string, value: string) {
        if (!selectedId || !selectedNode) return

        // 特殊属性映射处理
        if (key === 'id') {
            // 直接更新真实 id
            currentAttributes['id'] = value
            updateNodeProps(selectedId, {
                attributes: { 'id': value }
            })
            return
        }
        
        if (key === 'name') {
            // 更新 data-name（实际是 name 属性）
            currentAttributes['name'] = value
            updateNodeProps(selectedId, {
                attributes: { 'name': value }
            })
            return
        }
        
        if (key === '类型') {
            // 更新组件类型 - 这需要通过其他方式处理
            // 目前我们只显示类型，暂不支持修改
            // 如需支持修改，需要修改 DomNode 中的 componentType
            return
        }

        // 常规属性处理
        currentAttributes[key] = value
        updateNodeProps(selectedId, {
            attributes: { [key]: value }
        })
    }

    function handleAttributeRemove(key: string) {
        if (!selectedId) return

        // 特殊属性不允许删除
        if (key === 'id' || key === '类型') return

        delete currentAttributes[key]
        updateNodeProps(selectedId, {
            attributes: { [key]: undefined }
        })
    }
</script>

<div class="attr-editor">
    {#if selectedId && propsSnapshot}
        <h3>节点属性</h3>
        <div class="attr-list">
            {#each ATTR_WHITELIST as attrKey}
                <div class="attr-item">
                    <label for="attr-{attrKey}">{attrKey}:</label>
                    <input id="attr-{attrKey}" type="text" value={getMappedValue(attrKey)} on:input={(e) => handleAttributeChange(attrKey, e.currentTarget.value)} placeholder={`输入${attrKey}值...`} disabled={attrKey==='类型' || attrKey==='id'} />
                    {#if currentAttributes[attrKey] && attrKey !== 'id' && attrKey !== '类型' }
                        <button class="remove-btn" on:click={() => handleAttributeRemove(attrKey)} title="移除属性">×</button>
                    {/if}
                </div>
            {/each}
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
        background: rgba(239, 68, 68, 0.3);
        transform: scale(1.1);
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
