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

    // 是否显示工作区，默认显示工作区
    let showWorkspace = $state(true)

    // 属性面板标签控制
    const tabs = [
        { key: 'attr', icon: 'Sliders', title: '主要属性' },
        { key: 'position', icon: 'Move', title: '定位样式' },
        { key: 'layout', icon: 'Layout', title: '布局样式' },
        { key: 'background', icon: 'Image', title: '背景样式' },
        { key: 'text', icon: 'Type', title: '文字样式' },
        { key: 'border', icon: 'SquareDashed', title: '边框样式' },
        { key: 'event', icon: 'Workflow', title: '事件处理' }
    ] as const

    // 根据选中节点的 activePropertyTab 动态设置 activeTab
    let activeTab: 'attr' | 'position' | 'layout' | 'background' | 'text' | 'border' | 'event' = $derived.by(() => {
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
                return tabValue as 'attr' | 'position' | 'background' | 'border' | 'event'
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

    // Konami Code验证器状态
    let isVerifying = $state(false)
    let konamiSequence: string[] = []
    const KONAMI_CODE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a', 'b', 'a']
    let verificationTimeout: number | null = null
    const VERIFICATION_TIMEOUT_MS = 15000 // 15秒超时，给用户足够时间输入

    // 注册/注销快捷键和Konami验证器
    let unregister: () => void
    let unregisterKonami: () => void = () => {}

    onMount(async () => {
        // 初始化项目模式
        await initializeProjectMode()

        console.log('注册Ctrl+E快捷键用于Konami Code验证')

        // 替换原有的Ctrl+E快捷键为Konami验证器
        unregister = registerShortcut('Ctrl+E', () => {
            console.log('Ctrl+E快捷键被触发')
            startKonamiVerification()
        })
    })

    onDestroy(() => {
        unregister && unregister()
        stopKonamiVerification()
    })

    // Konami Code验证器相关函数
    function startKonamiVerification() {
        if (isVerifying) return

        console.log('开始Konami Code验证...')

        // 如果当前是编辑模式，直接切换回正常模式，不需要验证
        if (showWorkspace) {
            showWorkspace = false
            updateProjectMode()
            return
        }

        // 开发模式下跳过验证，直接进入编辑模式
        if (!import.meta.env.PROD) {
            console.log('开发模式：跳过Konami Code验证，直接进入编辑模式')
            showWorkspace = true
            updateProjectMode()
            return
        }

        // 从正常模式切换到编辑模式需要验证
        isVerifying = true
        konamiSequence = []

        console.log('Konami Code序列:', KONAMI_CODE)

        // 设置15秒超时
        verificationTimeout = window.setTimeout(() => {
            console.log('Konami Code验证超时')
            stopKonamiVerification()
        }, VERIFICATION_TIMEOUT_MS)

        // 注册键盘监听
        const handleKeyDown = (e: KeyboardEvent) => {
            handleKonamiKey(e)
        }

        document.addEventListener('keydown', handleKeyDown)
        unregisterKonami = () => {
            document.removeEventListener('keydown', handleKeyDown)
        }
    }

    function handleKonamiKey(e: KeyboardEvent) {
        if (!isVerifying) return

        // 开发模式下不处理键盘事件
        if (!import.meta.env.PROD) {
            return
        }

        console.log('键盘事件:', e.key, '当前序列:', [...konamiSequence, e.key])

        // 添加当前按键到序列
        konamiSequence.push(e.key)

        // 检查序列是否匹配
        for (let i = 0; i < konamiSequence.length; i++) {
            if (konamiSequence[i] !== KONAMI_CODE[i]) {
                console.log('序列不匹配，重置。期望:', KONAMI_CODE[i], '实际:', konamiSequence[i])
                // 输入错误，重置序列
                resetKonamiSequence()
                return
            }
        }

        console.log('序列匹配进度:', konamiSequence.length, '/', KONAMI_CODE.length)

        // 检查是否完成整个序列
        if (konamiSequence.length === KONAMI_CODE.length) {
            console.log('Konami Code验证成功！')
            // 验证成功，切换编辑模式
            showWorkspace = !showWorkspace
            updateProjectMode()
            stopKonamiVerification()
        }
    }

    function resetKonamiSequence() {
        konamiSequence = []
    }

    function stopKonamiVerification() {
        isVerifying = false
        konamiSequence = []

        if (verificationTimeout) {
            clearTimeout(verificationTimeout)
            verificationTimeout = null
        }

        unregisterKonami()
    }

    // 初始化项目模式
    async function initializeProjectMode() {
        const projectId = window.location.hash.split('/').pop()
        if (!projectId) return

        try {
            const project = await DexieService.getRecord<any>('qi-qiao-ban', 'projects', projectId)
            if (project && project.mode) {
                // 根据数据库中的模式设置工作区显示状态
                showWorkspace = project.mode === 'editing'
                console.log(`项目模式已初始化为: ${project.mode}`)
            } else {
                // 如果没有模式字段，默认为编辑模式
                showWorkspace = true
                await updateProjectMode() // 保存默认模式
            }
        } catch (error) {
            console.error('初始化项目模式失败:', error)
            // 出错时默认为编辑模式
            showWorkspace = true
        }
    }

    // 手动保存功能
    import { saveDomTreeToProjectsData } from '../../services/repository/dom-tree.store.svelte'
    import DexieService from '../../services/database/dexie-service'

    async function handleManualSave() {
        const success = await saveDomTreeToProjectsData()
        if (success) {
            console.log('项目数据已手动保存')
        } else {
            console.error('保存失败')
        }
    }

    // 更新项目模式
    async function updateProjectMode() {
        // 从URL获取项目ID
        const projectId = window.location.hash.split('/').pop()
        if (!projectId) return

        const newMode = showWorkspace ? 'editing' : 'normal'
        try {
            const success = await DexieService.updateRecord('qi-qiao-ban', 'projects', projectId, { mode: newMode })
            if (success) {
                console.log(`项目模式已更新为: ${newMode}`)
            }
        } catch (error) {
            console.error('更新项目模式失败:', error)
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
                    <PropertyPanel showToolbar={false} {activeTab} onTabChange={setTab} />
                </div>
                <!-- 标签切换按钮栏 -->
                <div class="prop-tabbar" style="width: 12%;height: 100%;display: flex;flex-direction: column;align-items: center;justify-content: flex-start;padding-top: calc(12px * var(--scale-ratio, 1));gap: calc(8px * var(--scale-ratio, 1));pointer-events: auto;background: rgba(30, 41, 59, 0.95);">
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
