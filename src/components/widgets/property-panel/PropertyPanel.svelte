<!--
  PropertyPanel.svelte
  右侧属性面板骨架组件，包含三个 Tab：属性、样式、事件
  注意：仅提供最小 UI 结构，后续再填充编辑逻辑。
-->
<script lang="ts">
    import AttrEditor from './AttrEditor.svelte'
    import StyleEditor from './StyleEditor.svelte'
    import EventEditor from './EventEditor.svelte'
    import { selectedId as getSelectedId } from '../../../services/repository/dom-tree.store.svelte'

    // 当前激活的 Tab
    export let activeTab: 'attr' | 'style' | 'event' = 'attr'

    // 当前选中节点 id，响应式刷新
    let currentId: string | null = getSelectedId()
    $: currentId = getSelectedId()
</script>

<div class="panel">
    <div class="body">
        {#if activeTab === 'attr'}
            <AttrEditor selectedId={currentId} />
        {:else if activeTab === 'style'}
            <StyleEditor selectedId={currentId} />
        {:else}
            <EventEditor selectedId={currentId} />
        {/if}
    </div>
</div>

<style>
    .panel {
        width: 100%;
        height: 100%;
        border-left: 1px solid var(--border-color, #e5e5e5);
        display: flex;
        flex-direction: column;
        background: var(--panel-bg, #fafafa);
    }

    .body {
        flex: 1;
        overflow: auto;
        padding: 12px;
    }
</style>
