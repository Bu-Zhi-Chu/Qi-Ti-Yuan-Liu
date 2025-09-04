<!-- FeatureEditor.svelte
     根据不同节点类型展示特性设置行
-->
<script lang="ts">
    import { getNodePropsStore, getNodeProps as _getNodeProps } from '../../../services/property-panel/property-panel.service'

    let { selectedId = null } = $props<{ selectedId?: string | null }>()

    // 当前节点 props 快照
    let propsSnapshot = $state<ReturnType<typeof _getNodeProps> | null>(null)
    // 订阅节点属性变化
    let unsubscribe = () => {}
    $effect(() => {
        unsubscribe()
        if (selectedId) {
            const store = getNodePropsStore(selectedId)
            propsSnapshot = _getNodeProps(selectedId)
            unsubscribe = store.subscribe(() => {
                propsSnapshot = _getNodeProps(selectedId)
            })
        } else {
            propsSnapshot = null
        }
        return () => {
            unsubscribe()
            unsubscribe = () => {}
        }
    })
</script>

<div class="feature-editor">
    {#if selectedId && propsSnapshot}
        <p class="placeholder">这里根据节点类型渲染特性设置（待实现）</p>
    {:else}
        <p class="placeholder">请选择一个节点</p>
    {/if}
</div>

<style>
    .feature-editor {
        padding: calc(20px * var(--scale-ratio, 1));
        color: #e2e8f0;
    }

    .placeholder {
        margin: 0;
        font-size: calc(14px * var(--scale-ratio, 1));
        color: #94a3b8;
    }
</style>