<!-- DataEditor.svelte
     节点数据绑定编辑器（占位空页）
     后续可在此处实现节点与数据源的绑定逻辑
-->
<script lang="ts">
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    import { getNodeProps as _getNodeProps, getNodePropsStore } from '../../../services/property-panel/property-panel.service'

    let { selectedId = null } = $props<{ selectedId?: string | null }>()
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
</script>

<div class="data-editor">
    {#if selectedId && dataSnapshot}
        <h3>数据绑定</h3>
        <!-- 未来在此添加数据绑定相关 UI -->
    {:else}
        <p class="placeholder">请选择一个节点</p>
    {/if}
</div>

<style>
    .data-editor {
        padding: calc(20px * var(--scale-ratio, 1));
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