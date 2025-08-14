<!-- AttrEditor.svelte
     节点属性编辑器
     提供节点属性的可视化编辑界面
-->
<script lang="ts">
  import type { DomNode } from '../../../types/dom-node.types';
  import { ATTR_WHITELIST } from '../../../services/property-panel/constants';
  import { getNodeProps, updateNodeProps } from '../../../services/property-panel/property-panel.service';

  // 属性面板需要的参数
  export let selectedId: string | null = null;
  let propsSnapshot: ReturnType<typeof getNodeProps> | null = null;
  let currentAttributes: Record<string, string> = {};

  $: if (selectedId) {
    propsSnapshot = getNodeProps(selectedId);
    currentAttributes = propsSnapshot?.attributes || {};
  }

  function handleAttributeChange(key: string, value: string) {
    if (!selectedId) return;
    
    currentAttributes[key] = value;
    updateNodeProps(selectedId, {
      attributes: { [key]: value }
    });
  }

  function handleAttributeRemove(key: string) {
    if (!selectedId) return;
    
    delete currentAttributes[key];
    updateNodeProps(selectedId, {
      attributes: { [key]: undefined }
    });
  }
</script>

<div class="attr-editor">
  {#if selectedId && propsSnapshot}
    <h3>节点属性</h3>
    <div class="attr-list">
      {#each ATTR_WHITELIST as attrKey}
        <div class="attr-item">
          <label for="attr-{attrKey}">{attrKey}:</label>
          <input
            id="attr-{attrKey}"
            type="text"
            value={currentAttributes[attrKey] || ''}
            on:input={(e) => handleAttributeChange(attrKey, e.currentTarget.value)}
            placeholder={`输入${attrKey}值...`}
          />
          {#if currentAttributes[attrKey]}
            <button 
              class="remove-btn"
              on:click={() => handleAttributeRemove(attrKey)}
              title="移除属性"
            >
              ×
            </button>
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