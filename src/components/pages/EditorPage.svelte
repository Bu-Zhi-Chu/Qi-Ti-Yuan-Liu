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
    import Icon from '../widgets/Icon.svelte'

    // 引入 DOM 树集中式状态管理
    import { domTree, selectedId } from '../../services/repository/dom-tree.store.svelte'
    import DexieService from '../../services/database/dexie-service'

    // 是否显示工作区，根据项目模式决定
    let showWorkspace = $state(false)
    let projectMode = $state('normal')
    let projectId = $state('')

    // 属性面板标签控制
    const tabs = [
        { key: 'attr', icon: 'BookA', title: '主要属性' },
        { key: 'layout', icon: 'Layout', title: '布局样式' },
        { key: 'position', icon: 'Move', title: '定位样式' },
        { key: 'background', icon: 'Image', title: '背景样式' },
        { key: 'border', icon: 'SquareDashed', title: '边框样式' },
        { key: 'text', icon: 'Type', title: '文字样式' },
        { key: 'event', icon: 'Workflow', title: '事件处理' }
    ] as const

    // 根据选中节点的 activePropertyTab 动态设置 activeTab
    let activeTab: 'attr' | 'position' | 'background' | 'border' | 'text' | 'layout' | 'event' = $derived.by(() => {
        const currentSelectedId = selectedId()

        if (!currentSelectedId) return 'attr'

        const findNode = (node: any): any => {
            if (node.id === currentSelectedId) {
                return node
            }
            if (node.children) {
                for (const child of node.children) {
                    const found = findNode(child)
                    if (found) return found
                }
            }
            return null
        }

        // 从根节点开始查找
        const selectedNode = findNode(domTree)
        if (selectedNode?.attributes?.activePropertyTab) {
            // 处理旧数据兼容性问题（'style' -> 'position'）
            const tabValue = selectedNode.attributes.activePropertyTab
            if (tabValue === 'style') return 'position'
            if (tabs.some((t) => t.key === tabValue)) {
                return tabValue as 'attr' | 'position' | 'background' | 'border' | 'text' | 'layout' | 'event'
            }
        }
        return 'attr'
    })

    function setTab(k: (typeof tabs)[number]['key']) {
        // 将新的标签页保存到当前选中节点的属性中
        const currentSelectedId = selectedId()
        if (currentSelectedId) {
            import('../../services/property-panel/property-panel.service').then(({ updateNodeProps }) => {
                updateNodeProps(currentSelectedId, { attributes: { activePropertyTab: k } })
            })
        }
    }

    // 注册/注销快捷键
    let unregister: () => void
    onMount(() => {
        // 从URL获取项目ID
        const hash = window.location.hash
        const match = hash.match(/\/editor\/(.+)/)
        if (match) {
            projectId = match[1]
            loadProjectMode(projectId)
        }

        unregister = registerShortcut('Ctrl+E', async () => {
            const newMode = showWorkspace ? 'normal' : 'edit'
            showWorkspace = !showWorkspace

            // 更新数据库中的mode字段
            if (projectId) {
                try {
                    await DexieService.updateRecord('qi-qiao-ban', 'projects', projectId, { mode: newMode })
                    projectMode = newMode
                    console.log(`项目模式已更新为: ${newMode}`)
                } catch (error) {
                    console.error('更新项目模式失败:', error)
                }
            }
        })
    })

    async function loadProjectMode(projectId: string) {
        try {
            const project = (await DexieService.getRecord('qi-qiao-ban', 'projects', projectId)) as { mode?: 'edit' | 'normal' }
            if (project && project.mode) {
                projectMode = project.mode
                showWorkspace = project.mode === 'edit'
            } else {
                projectMode = 'normal'
                showWorkspace = false
            }
        } catch (error) {
            console.error('加载项目模式失败:', error)
            projectMode = 'normal'
            showWorkspace = false
        }
    }

    onDestroy(() => {
        unregister && unregister()
    })

    // 手动保存功能
    import { saveDomTreeToProjectsData } from '../../services/repository/dom-tree.store.svelte'

    async function handleManualSave() {
        const success = await saveDomTreeToProjectsData()
        if (success) {
            console.log('项目数据已手动保存')
        } else {
            console.error('保存失败')
        }
    }
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
        <div style="display: flex;align-items: center;justify-content: flex-start;gap: 10px;padding: 0 10px;width: 100%;height: 4%;background: rgba(1, 255, 255, 0.3);pointer-events: auto;">
            <button onclick={handleManualSave} style="padding: calc(4px * var(--scale-ratio, 1)) calc(8px * var(--scale-ratio, 1));background: none;border: none;color: white;cursor: pointer;font-size: calc(12px * var(--scale-ratio, 1));">保存</button>
            <button onclick={() => (window.location.href = '/')} style="padding: calc(4px * var(--scale-ratio, 1)) calc(8px * var(--scale-ratio, 1));background: none;border: none;color: white;cursor: pointer;font-size: calc(12px * var(--scale-ratio, 1));">首页</button>
        </div>

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
                    <PropertyPanel {activeTab} />
                </div>
                <!-- 标签切换按钮栏 -->
                <div class="prop-tabbar" style="width: 12%;height: 100%;display: flex;flex-direction: column;align-items: center;justify-content: flex-start;padding-top: calc(12px * var(--scale-ratio, 1));gap: calc(8px * var(--scale-ratio, 1));pointer-events: auto;">
                    {#each tabs as t}
                        <button class:active={activeTab === t.key} onclick={() => setTab(t.key)} title={t.title}>
                            <Icon name={t.icon} size={16} style="width: calc(16px * var(--scale-ratio, 1)); height: calc(16px * var(--scale-ratio, 1))" />
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
    .prop-tabbar button {
        width: calc(32px * var(--scale-ratio, 1));
        height: calc(32px * var(--scale-ratio, 1));
        border: none;
        background: rgba(255, 255, 255, 0.08);
        color: #fff;
        border-radius: calc(6px * var(--scale-ratio, 1));
        cursor: pointer;
        font-size: calc(16px * var(--scale-ratio, 1));
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .prop-tabbar button:hover {
        background: rgba(255, 255, 255, 0.18);
    }
    .prop-tabbar button.active {
        background: rgba(255, 255, 255, 0.28);
    }
</style>
