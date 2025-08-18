<!-- EventEditor.svelte
     节点事件编辑器
     事件配置将通过其他方式处理
-->
<script lang="ts">
    import { getNodeProps } from '../../../services/property-panel/property-panel.service'

    export let selectedId: string | null = null
    let eventSnapshot: ReturnType<typeof getNodeProps> | null = null

    $: if (selectedId) {
        eventSnapshot = getNodeProps(selectedId)
    }
</script>

<div class="event-editor">
    {#if selectedId && eventSnapshot}
        <h3>事件配置</h3>
    {:else}
        <p class="placeholder">请选择一个节点</p>
    {/if}
</div>

<style>
    .event-editor {
        padding: calc(20px * var(--scale-ratio, 1));
        /* 背景继承父级渐变 */
        color: #e2e8f0;
    }

    h3 {
        margin: 0 0 calc(16px * var(--scale-ratio, 1)) 0;
        font-size: calc(16px * var(--scale-ratio, 1));
        font-weight: 600;
        color: #cbd5e1;
    }

    .placeholder {
        color: #64748b;
        font-style: italic;
        text-align: center;
        margin-top: calc(40px * var(--scale-ratio, 1));
        font-size: calc(14px * var(--scale-ratio, 1));
    }
</style>
