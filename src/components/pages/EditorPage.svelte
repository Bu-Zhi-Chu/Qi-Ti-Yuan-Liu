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
    import { registerShortcut } from '../../services/utils/shortcut.service'

    /* 新增：Dom 区域与 Dom 树列表组件 */
    import DomCanvas from '../widgets/DomCanvas.svelte'
    import DomTreeList from '../widgets/DomTreeList.svelte'

    // 引入 DomNode 类型，统一维护
    import type { DomNode } from '../../types/dom-node.types'

    // DOM 树作为单一数据源（普通 let 声明以避免类型检查问题）
    let domTree: DomNode = {
        id: 'root',
        dataId: 'root',
        componentType: 'SimpleBox', // 根容器使用 SimpleBox
        styles: {
            width: '100%',
            height: '100%',
            backgroundColor: '#ffffff'
        },
        expanded: true,
        children: [
            {
                id: 'header',
                dataId: 'header',
                componentType: 'SimpleBox', // 头部区域使用 SimpleBox
                styles: {
                    height: '10%',
                    width: '10%',
                    top: '10%',
                    left: '10%',
                    position: 'absolute',
                    backgroundColor: '#f87171'
                },
                children: []
            },
            {
                id: 'clock',
                dataId: 'clock',
                componentType: 'RealTimeClock', // 实时时钟组件
                styles: {
                    height: '8%',
                    width: '15%',
                    top: '25%',
                    left: '10%',
                    position: 'absolute',
                    backgroundColor: '#60a5fa',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '8px'
                },
                componentProps: {
                    format: 'HH:mm:ss' // 传递给时钟组件的格式参数
                },
                children: []
            },
            {
                id: 'responsive-container',
                dataId: 'responsive-container',
                componentType: 'ResponsiveBox', // 响应式容器
                styles: {
                    height: '20%',
                    width: '30%',
                    top: '40%',
                    left: '10%',
                    position: 'absolute',
                    backgroundColor: '#34d399',
                    borderRadius: '12px'
                },
                componentProps: {
                    padding: '16px' // 传递给响应式容器的内边距
                },
                children: [
                    {
                        id: 'inner-box',
                        dataId: 'inner-box',
                        componentType: 'SimpleBox',
                        styles: {
                            width: '100%',
                            height: '50%',
                            backgroundColor: '#fbbf24',
                            borderRadius: '8px'
                        },
                        children: []
                    }
                ]
            }
        ]
    }

    // 当前选中的节点 nodeId
    let selectedId: string | null = 'root'

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
    <DomCanvas editing={showWorkspace} {domTree} bind:selectedId />
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
                    <DomTreeList {domTree} bind:selectedId />
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
