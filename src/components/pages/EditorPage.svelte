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

    // 引入 DOM 树集中式状态管理

    // 是否显示工作区，默认正常模式隐藏
    let showWorkspace = false

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
                <div style="width: 88%;height: 100%;background: rgba(30, 41, 59, 0.8);pointer-events: auto;">
                    <!-- @ts-ignore: props typing still WIP -->
                    <DomTreeList />
                </div>
            </div>

            <!-- 右侧 -->
            <div style="display: flex;width: 22.5%;height: 100%;">
                <!-- 属性栏 -->
                <div style="width: 88%;height: 100%;background: rgba(1, 1, 255, 0.3);"></div>
                <!-- 属性切换按钮 -->
                <div style="width: 12%;height: 100%;background: rgba(255, 1, 255, 0.3);"></div>
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
</style>
