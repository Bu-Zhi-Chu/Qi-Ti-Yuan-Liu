<!--
 * 编辑器页面（初始布局）
 *
 * 功能：提供一个 100% 宽高的外层容器，背景色与首页 / DemoPage 保持一致；
 *       后续在此容器内嵌入编辑器各子模块。
 *
 * 使用方法：通过路由 /editor 访问此页面。
 *           后续子组件请在 <ResponsiveBox> 内部继续扩展。
 *
 * 设计：
 * - 背景渐变：linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)
 * - 使用 ResponsiveBox 统一布局，方便后续自适应缩放处理。
 -->

<script lang="ts">
    import { onMount, onDestroy } from 'svelte'
    import { registerShortcut } from '../../services/interactions/shortcut.service'

    /* 新增：Dom 区域与 Dom 树列表组件 */
    import DomCanvas from '../widgets/DomCanvas.svelte'
    import DomTreeList from '../widgets/DomTreeList.svelte'
    import PropertyPanel from '../widgets/property-panel/PropertyPanel.svelte'

    // 引入 DOM 树集中式状态管理

    // 是否显示工作区，默认正常模式隐藏
    let showWorkspace = false

    // 属性面板标签控制
    const tabs = [
        { key: 'attr', icon: '⚙️', title: '属性' },
        { key: 'style', icon: '🎨', title: '样式' },
        { key: 'event', icon: '📡', title: '事件' }
    ] as const
    let activeTab: 'attr' | 'style' | 'event' = 'attr'
    function setTab(k: (typeof tabs)[number]['key']) {
        activeTab = k
    }

    // 注册/注销快捷键
    let unregister: () => void
    onMount(() => {
        unregister = registerShortcut('Ctrl+E', () => {
            showWorkspace = !showWorkspace
        })
    })

    onDestroy(() => {
        unregister && unregister()
    })
</script>

<!-- 背景 -->
<div style="width: 100%;height: 100%;position: absolute;background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);z-index: 0;overflow: hidden;">
    <!-- 画布包裹元素，承担缩放与定位 -->
    <!-- @ts-ignore: props typing still WIP -->
    <DomCanvas editing={showWorkspace} />
</div>

<!-- 工作区 -->
{#if showWorkspace}
    <div class="workspace" style="position: absolute;width: 100%;height: 100%;z-index: 10;pointer-events: none;">
        <!-- 顶部导航区 -->
        <div style="display: block;width: 100%;height: 4%;background: rgba(1, 255, 255, 0.3);"></div>

        <div style="display: flex;justify-content: space-between;width: 100%;height: 94%;">
            <!-- 左侧 -->
            <div style=" display: flex;width: 22.5%;height: 100%;">
                <!-- 工具栏 -->
                <div style="width: 12%; height: 100%;background: rgba(255, 1, 255, 0.3);"></div>
                <!-- dom树列表 -->
                <div style="width: 88%;height: 100%;background: rgba(30, 41, 59, 0.8);pointer-events: auto">
                    <!-- @ts-ignore: props typing still WIP -->
                    <DomTreeList />
                </div>
            </div>

            <!-- 右侧 -->
            <div style="display: flex;width: 22.5%;height: 100%;">
                <!-- 属性面板 -->
                <div style="width: 88%;height: 100%;pointer-events: auto;">
                    <!-- @ts-ignore: Work In Progress -->
                    <PropertyPanel showToolbar={false} {activeTab} />
                </div>
                <!-- 标签切换按钮栏 -->
                <div class="prop-tabbar">
                    {#each tabs as t}
                        <button class:active={activeTab === t.key} on:click={() => setTab(t.key)} title={t.title}>
                            {t.icon}
                        </button>
                    {/each}
                </div>
            </div>
        </div>

        <!-- 底部状态栏 -->
        <div style="width: 100%; height: 2%;background: rgba(1, 255, 255, 0.3);"></div>
    </div>
{/if}

<style>
    .workspace {
        width: 100%;
        height: 100%;
        position: relative;
        top: 0;
        left: 0;
        z-index: 10;
        pointer-events: none;
    }
    .prop-tabbar {
        width: 12%;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: stretch;
        justify-content: flex-start;
        padding-top: calc(12px * var(--scale-ratio, 1));
        gap: calc(12px * var(--scale-ratio, 1));
        pointer-events: auto;
        background: rgba(255, 255, 255, 0.04);
    }
    .prop-tabbar button {
        width: 100%;
        height: calc(40px * var(--scale-ratio, 1));
        border: none;
        background: transparent;
        color: #e2e8f0;
        cursor: pointer;
        font-size: calc(18px * var(--scale-ratio, 1));
        transition:
            background 0.2s ease,
            border-color 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        border-left: 4px solid transparent;
    }
    .prop-tabbar button:hover {
        background: rgba(255, 255, 255, 0.06);
    }
    .prop-tabbar button.active {
        background: rgba(59, 130, 246, 0.18);
        border-left-color: #3b82f6;
        color: #fff;
    }
</style>
