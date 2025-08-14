<!--
  PropertyPanel.svelte
  右侧属性面板完整组件
  包含三个 Tab：属性、样式、事件，以及撤销/重做功能
  
  使用说明：
  - showToolbar: 是否显示顶部工具栏，由外部控制，默认为true
  - activeTab: 当前激活的标签页，由外部控制
  - 当showToolbar为false时，标签切换和撤销/重做功能需由外部实现
-->
<script lang="ts">
    import AttrEditor from './AttrEditor.svelte'
    import StyleEditor from './StyleEditor.svelte'
    import EventEditor from './EventEditor.svelte'
    import { selectedId as getSelectedId } from '../../../services/repository/dom-tree.store.svelte'
    import { undo, redo } from '../../../services/property-panel/property-panel.service'

    // 当前激活的 Tab
    export let activeTab: 'attr' | 'style' | 'event' = 'attr'
    
    // 是否显示工具栏，由外部控制
    export let showToolbar: boolean = true

    // 当前选中节点 id，响应式刷新
    let currentId: string | null = getSelectedId()
    $: currentId = getSelectedId()

    const tabs = [
        { key: 'attr', label: '属性', icon: '⚙️' },
        { key: 'style', label: '样式', icon: '🎨' },
        { key: 'event', label: '事件', icon: '📡' }
    ] as const

    // 键盘快捷键支持
    function handleKeyDown(event: KeyboardEvent) {
        if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
            event.preventDefault()
            undo()
        } else if ((event.ctrlKey || event.metaKey) && (event.key === 'y' || (event.key === 'z' && event.shiftKey))) {
            event.preventDefault()
            redo()
        }
    }

    // 添加和移除键盘事件监听
    import { onMount, onDestroy } from 'svelte'
    onMount(() => {
        window.addEventListener('keydown', handleKeyDown)
        return () => {
            window.removeEventListener('keydown', handleKeyDown)
        }
    })
</script>

<div class="panel">
    <!-- 顶部工具栏 - 由外部控制显示 -->
    {#if showToolbar}
        <div class="toolbar">
            <div class="tab-buttons">
                {#each tabs as tab}
                    <button
                        class="tab-button"
                        class:active={activeTab === tab.key}
                        on:click={() => activeTab = tab.key}
                        title={tab.label}
                    >
                        <span class="tab-icon">{tab.icon}</span>
                        <span class="tab-label">{tab.label}</span>
                    </button>
                {/each}
            </div>
            
            {#if currentId}
                <div class="history-buttons">
                    <button 
                        class="history-btn" 
                        on:click={undo}
                        title="撤销 (Ctrl+Z)"
                    >
                        ↶
                    </button>
                    <button 
                        class="history-btn" 
                        on:click={redo}
                        title="重做 (Ctrl+Y)"
                    >
                        ↷
                    </button>
                </div>
            {/if}
        </div>
    {/if}

    <!-- 内容区域 -->
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
        border-left: 1px solid rgba(15, 23, 42, 0.3);
        display: flex;
        flex-direction: column;
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
        box-shadow: -2px 0 8px rgba(0, 0, 0, 0.3);
    }

    .toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: calc(12px * var(--scale-ratio, 1)) calc(16px * var(--scale-ratio, 1));
        border-bottom: 1px solid rgba(99, 102, 241, 0.1);
        background: linear-gradient(135deg, #6366f1 0%, #7c3aed 100%);
        box-shadow: 0 2px 4px rgba(99, 102, 241, 0.1);
    }

    .tab-buttons {
        display: flex;
        gap: calc(4px * var(--scale-ratio, 1));
    }

    .tab-button {
        display: flex;
        align-items: center;
        gap: calc(4px * var(--scale-ratio, 1));
        padding: calc(8px * var(--scale-ratio, 1)) calc(12px * var(--scale-ratio, 1));
        border: none;
        background: rgba(255, 255, 255, 0.1);
        border-radius: calc(8px * var(--scale-ratio, 1));
        cursor: pointer;
        font-size: calc(12px * var(--scale-ratio, 1));
        color: rgba(255, 255, 255, 0.8);
        transition: all 0.3s ease;
        backdrop-filter: blur(10px);
    }

    .tab-button:hover {
        background: rgba(255, 255, 255, 0.2);
        color: white;
        transform: translateY(-1px);
    }

    .tab-button.active {
        background: rgba(255, 255, 255, 0.25);
        color: white;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        transform: translateY(-1px);
    }

    .tab-icon {
        font-size: calc(14px * var(--scale-ratio, 1));
    }

    .tab-label {
        font-size: calc(12px * var(--scale-ratio, 1));
        font-weight: 500;
    }

    .history-buttons {
        display: flex;
        gap: calc(4px * var(--scale-ratio, 1));
    }

    .history-btn {
        width: calc(28px * var(--scale-ratio, 1));
        height: calc(28px * var(--scale-ratio, 1));
        padding: 0;
        border: 1px solid rgba(255, 255, 255, 0.2);
        background: rgba(255, 255, 255, 0.1);
        border-radius: calc(6px * var(--scale-ratio, 1));
        cursor: pointer;
        font-size: calc(14px * var(--scale-ratio, 1));
        color: rgba(255, 255, 255, 0.8);
        transition: all 0.3s ease;
        backdrop-filter: blur(10px);
    }

    .history-btn:hover {
        background: rgba(255, 255, 255, 0.2);
        color: white;
        transform: translateY(-1px);
    }

    .history-btn:active {
        transform: scale(0.9);
    }

    .body {
        flex: 1;
        overflow: auto;
        padding: 0;
    }
</style>
