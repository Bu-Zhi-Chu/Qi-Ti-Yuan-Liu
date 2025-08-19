<!--
  PropertyPanel.svelte
  右侧属性面板完整组件
  包含四个 Tab：属性、定位、背景、事件，以及撤销/重做功能

  使用说明：
  - showToolbar: 是否显示顶部工具栏，由外部控制，默认为true
  - activeTab: 当前激活的标签页，由外部控制
  - 当showToolbar为false时，标签切换和撤销/重做功能需由外部实现
-->
<script lang="ts">
    import AttrEditor from './AttrEditor.svelte'
    import PositionEditor from './PositionEditor.svelte'
    import BackgroundEditor from './BackgroundEditor.svelte'
    import BorderEditor from './BorderEditor.svelte'
    import TextEditor from './TextEditor.svelte'
    import LayoutEditor from './LayoutEditor.svelte'
    import EventEditor from './EventEditor.svelte'
    import { selectedId as getSelectedId, findNodeById, domTree } from '../../../services/repository/dom-tree.store.svelte'
    import Icon from '../Icon.svelte'

    // Runes props - 使用 $props 代替 export let
    let {
        activeTab = 'attr',
        showToolbar = true,
        onTabChange
    } = $props<{
        activeTab?: 'attr' | 'position' | 'background' | 'border' | 'text' | 'layout' | 'event'
        showToolbar?: boolean
        onTabChange?: (tab: 'attr' | 'position' | 'background' | 'border' | 'text' | 'layout' | 'event') => void
    }>()

    // 当前选中节点 id，响应式刷新
    const currentId = $derived.by(() => getSelectedId())

    // activeTab的保存逻辑现在由EditorPage处理，避免循环依赖

    // 当选中节点改变时，EditorPage会通过$derived自动设置activeTab
    // 这里不再需要恢复逻辑，避免循环更新
</script>

<div class="panel">
    <!-- 内容区域 -->
    <div class="body">
        {#if activeTab === 'attr'}
            <AttrEditor selectedId={currentId} />
        {:else if activeTab === 'position'}
            <PositionEditor selectedId={currentId} />
        {:else if activeTab === 'layout'}
            <LayoutEditor selectedId={currentId} />
        {:else if activeTab === 'background'}
            <BackgroundEditor selectedId={currentId} />
        {:else if activeTab === 'border'}
            <BorderEditor selectedId={currentId} />
        {:else if activeTab === 'text'}
            <TextEditor />
        {:else}
            <EventEditor selectedId={currentId} />
        {/if}
    </div>
</div>

<style>
    .panel {
        width: 100%;
        height: 100%;
        border-left: 1px solid rgba(15, 23, 42, 0.3);
        display: flex;
        flex-direction: column;
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
        box-shadow: -2px 0 8px rgba(0, 0, 0, 0.3);
    }

    .body {
        flex: 1;
        overflow: auto;
        padding: 0;
    }
</style>
