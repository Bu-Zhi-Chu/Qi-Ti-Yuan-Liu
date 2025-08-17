<!--
 * PropTabBar.svelte
 * ---------------------------------------------------------------------
 * 属性面板竖排标签栏
 *
 * 功能：
 *   1. 渲染竖排按钮列表
 *   2. 管理标签页切换及高亮
 *   3. 使用 Svelte 5 Runes API
 *   4. 通过 createEventDispatcher 向上传递变更事件
 *
 * 使用方法：
 *   <PropTabBar
 *     tabs={[{ key: 'attr', icon: '⚙️', title: '属性' }]}
 *     on:change={e => activeTab = e.detail.tab}
 *   />
 * ---------------------------------------------------------------------
 -->

<script lang="ts">
    import { createEventDispatcher } from 'svelte'
    import Icon from '../Icon.svelte'

    /**
     * 标签项类型
     */
    interface TabItem {
        key: string
        icon: string
        title: string
    }

    /* --------------------------- Props (Runes) --------------------------- */
    // 接收 tabs 和可选的 initialTab
    let { tabs = [], initialTab = '' } = $props<{ tabs: TabItem[]; initialTab?: string }>()

    /* --------------------------- 内部状态 --------------------------- */
    // 当前激活的标签页（使用 $state 以支持响应式更新）
    let activeTab = $state(initialTab || (tabs.length > 0 ? tabs[0].key : ''))

    /* --------------------------- 事件处理 --------------------------- */
    // 创建事件分发器（用于向父组件传递 change 事件）
    const dispatch = createEventDispatcher<{
        change: { tab: string }
    }>()

    // 切换标签页并派发 change 事件
    function setTab(key: string) {
        if (activeTab !== key) {
            activeTab = key
            dispatch('change', { tab: key })
        }
    }

    // 初始化完成后，如果传入了 initialTab，派发一次 change 事件
    $effect(() => {
        if (initialTab && initialTab !== activeTab) {
            activeTab = initialTab
        }
    })
</script>

<!--
  竖排标签栏容器
  高度 100%，顶部对齐，按钮固定方形尺寸并保持间距
-->
<div class="prop-tabbar">
    {#each tabs as t}
        <button class:active={activeTab === t.key} onclick={() => setTab(t.key)} title={t.title} aria-label={t.title}>
            <Icon name={t.icon} size={16} />
        </button>
    {/each}
</div>

<style>
    .prop-tabbar {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        /* 顶部留白与按钮间距 */
        padding-top: calc(12px * var(--scale-ratio, 1));
        gap: calc(8px * var(--scale-ratio, 1));
        pointer-events: auto;
    }

    /* 按钮统一方形圆角样式 */
    .prop-tabbar button {
        width: calc(32px * var(--scale-ratio, 1));
        height: calc(32px * var(--scale-ratio, 1));
        background: rgba(255, 255, 255, 0.08);
        color: #fff;
        border-radius: calc(6px * var(--scale-ratio, 1));
        border: none;
        cursor: pointer;
        font-size: calc(16px * var(--scale-ratio, 1));
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s ease;
    }

    .prop-tabbar button:hover {
        background: rgba(255, 255, 255, 0.18);
    }

    /* 激活状态样式 */
    .prop-tabbar button.active {
        background: rgba(255, 255, 255, 0.28);
    }
</style>
