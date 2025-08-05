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
    import ResponsiveBox from '../Core/ResponsiveBox.svelte'
    import SimpleBox from '../Core/SimpleBox.svelte'
    import { onMount, onDestroy } from 'svelte'
    import { registerShortcut } from '../../services/utils/shortcut.service'

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
<ResponsiveBox style="width: 100%;height: 100%;position: absolute;background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);z-index: 0;">
    <!-- 画布 -->
    <div class="canvas" class:editing={showWorkspace} style="background: white;"></div>
</ResponsiveBox>

<!-- 工作区 -->
{#if showWorkspace}
    <ResponsiveBox class="workspace" style="position: absolute;width: 100%;height: 100%;z-index: 10;">
        <!-- 顶部导航区 -->
        <div style="display: block;width: 100%;height: 4%;background: rgba(1, 255, 255, 0.3);"></div>

        <div style="display: flex;justify-content: space-between;width: 100%;height: 94%;">
            <!-- 左侧 -->
            <div style=" display: flex;width: 22.5%;height: 100%;">
                <!-- 工具栏 -->
                <div style="width: 12%; height: 100%;background: rgba(255, 1, 255, 0.3);"></div>
                <!-- dom树列表 -->
                <div style="width: 88%;height: 100%;background: rgba(1, 1, 255, 0.3);"></div>
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
    </ResponsiveBox>
{/if}

<style>
    .canvas {
        position: relative;
        width: 100%;
        height: 100%;
        display: block;
    }

    .editing {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%) scale(0.5);
        transform-origin: center center;
        z-index: 5;
    }
</style>
