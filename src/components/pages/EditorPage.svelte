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
    import { isStandardProdMode, isDevMode, isLiteMode } from '../../services/env/environment.service'

    /* 新增：Dom 区域与 Dom 树列表组件 */
    import DomCanvas from '../widgets/DomCanvas.svelte'
    import DomTreeList from '../widgets/DomTreeList.svelte'
    import PropertyPanel from '../widgets/property-panel/PropertyPanel.svelte'
    import Icon from '../widgets/Icon.svelte'
    import { applyLogConfig } from '../../services/utils/log-switch'

    // 引入 DOM 树集中式状态管理
    import { domTree, selectedId, removeNodeById } from '../../services/repository/dom-tree.store.svelte'

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
    let unregisterDelKey: () => void = () => {}

    onMount(async () => {
        // 初始化项目模式
        await initializeProjectMode()

        console.log('注册Ctrl+E快捷键用于Konami Code验证')

        // 替换原有的Ctrl+E快捷键为Konami验证器
        unregister = registerShortcut('Ctrl+E', () => {
            console.log('Ctrl+E快捷键被触发')
            startKonamiVerification()
        })

        // 注册DEL键删除选中节点的快捷键
        unregisterDelKey = registerShortcut('Delete', () => {
            const currentSelectedId = selectedId()
            if (currentSelectedId && currentSelectedId !== 'root') {
                console.log('DEL键删除节点:', currentSelectedId)
                removeNodeById(currentSelectedId).then((success) => {
                    if (success) {
                        console.log('节点删除成功:', currentSelectedId)
                    } else {
                        console.warn('节点删除失败:', currentSelectedId)
                    }
                })
            } else {
                console.log('DEL键按下，但没有选中节点或选中的是根节点')
            }
        })
    })

    onDestroy(() => {
        unregister && unregister()
        stopKonamiVerification()
        unregisterDelKey && unregisterDelKey()
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

        // 非精简模式下跳过验证，直接进入编辑模式
        if (!isLiteMode()) {
            console.log('非精简模式：跳过Konami Code验证，直接进入编辑模式')
            showWorkspace = true
            updateProjectMode()
            return
        }

        // 精简模式下从正常模式切换到编辑模式需要验证
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

        // 非精简模式下不处理键盘事件
        if (!isLiteMode()) {
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
    // 更新项目模式
    import DexieService from '../../services/database/dexie-service'
    // 缓存项目ID，避免重复查询
    let cachedProjectId: string | undefined
    async function getProjectId(): Promise<string | undefined> {
        if (cachedProjectId !== undefined) return cachedProjectId
        if (isLiteMode()) {
            try {
                const projects = await DexieService.getAllRecords('qi-qiao-ban', 'projects')
                cachedProjectId = (projects?.[0] as any)?.id as string | undefined
            } catch (e) {
                console.warn('获取项目ID失败', e)
            }
        } else {
            cachedProjectId = window.location.hash.split('/').pop()
        }
        return cachedProjectId
    }

    async function initializeProjectMode() {
        const projectId = await getProjectId()
        if (!projectId) {
            console.warn('无法获取项目ID')
            return
        }
        try {
            const project = await DexieService.getRecord<any>('qi-qiao-ban', 'projects', projectId)
            if (project && project.mode) {
                showWorkspace = project.mode === 'editing'
                console.log(`项目模式已初始化为: ${project.mode}`)
                if (project.name) {
                    document.title = project.name as string
                }
            } else {
                showWorkspace = false
                console.log('项目模式已初始化为: normal (默认模式)')
            }
        } catch (error) {
            console.error('初始化项目模式失败:', error)
            showWorkspace = false
        }
    }

    async function updateProjectMode() {
        const projectId = await getProjectId()
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
    let showLogsEnabled = $state<boolean | null>(null)
    onMount(async () => {
        try {
            const db = await DexieService.getDatabase('qi-qiao-ban')
            if (db) {
                const cfgRecord = (await db.table('config').toArray())[0]
                showLogsEnabled = (cfgRecord?.showLogs ?? cfgRecord?.value) === true
            }
        } catch {}
    })
</script>

<svelte:head>
    <title></title>
</svelte:head>

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
            {#if !isLiteMode()}
                <button onclick={() => (window.location.href = '/')} style="padding: calc(4px * var(--scale-ratio, 1)) calc(8px * var(--scale-ratio, 1));background: none;border: none;color: white;cursor: pointer;font-size: calc(12px * var(--scale-ratio, 1));">首页</button>
            {/if}

            <!-- 开发环境构建按钮 -->
            {#if isDevMode() && !isLiteMode()}
                <button
                    onclick={async (event) => {
                        const button = event.target as HTMLButtonElement

                        // 打印环境变量，快速确认 LITE 模式是否生效
                        console.log('当前环境变量:', import.meta.env)
                        console.log('LITE 模式:', import.meta.env.LITE)

                        try {
                            console.log('开始构建项目...')

                            // 显示构建中状态
                            const originalText = button.textContent
                            button.textContent = '精简构建中...'
                            button.disabled = true

                            // 若当前处于编辑模式，先切回正常模式并保存
                            if (showWorkspace) {
                                showWorkspace = false
                                await updateProjectMode()
                            }

                            // 获取项目ID

                            const projectId = await getProjectId()
                            if (!projectId) {
                                throw new Error('无法获取项目ID')
                            }

                            // 导入服务
                            const { BuildService } = await import('../../services/build/build.service')
                            const { liteExportService } = await import('../../services/export/lite-export.service')
                            const buildService = BuildService.getInstance()

                            // 预检查：确保API端点可用
                            try {
                                const healthCheck = await fetch('/api/build', {
                                    method: 'OPTIONS'
                                }).catch(() => null)
                                console.log('API健康检查:', healthCheck ? '通过' : '跳过')
                            } catch (e) {
                                console.warn('API健康检查失败，继续构建...', e)
                            }

                            let buildOptions: any = {
                                mode: 'production',
                                sourcemap: false,
                                minify: true
                            }

                            const projectBlob = await liteExportService.exportLiteData(projectId)
                            console.log('导出的项目Blob大小:', projectBlob.size)
                            buildOptions.liteData = {
                                projectBlob,
                                filename: 'project-data.json'
                            }
                            console.log('项目数据导出完成 (Blob)')

                            // 执行构建和预览
                            const result = await buildService.buildAndPreview(buildOptions)

                            console.log('构建完成:', result.build)
                            console.log('预览地址:', result.preview.url)

                            // 恢复按钮状态
                            button.textContent = originalText
                            button.disabled = false
                        } catch (error) {
                            console.error('构建失败:', error)

                            // 在控制台打印详细错误信息
                            console.error('构建失败:', error)

                            // 在控制台打印详细错误信息
                            console.error('构建失败详细错误:', {
                                message: (error as Error).message,
                                stack: (error as Error).stack
                            })

                            // 恢复按钮状态
                            button.textContent = '精简构建'
                            button.disabled = false
                        }
                    }}
                    style="padding: calc(4px * var(--scale-ratio, 1)) calc(8px * var(--scale-ratio, 1));background: none;border: none;color: white;cursor: pointer;font-size: calc(12px * var(--scale-ratio, 1));"
                >
                    精简构建
                </button>
            {/if}

            <!-- 日志开关按钮（所有模式均可见） -->
            <button
                onclick={async (event) => {
                    const button = event.target as HTMLButtonElement
                    try {
                        // 获取数据库实例
                        const db = await DexieService.getDatabase('qi-qiao-ban')
                        if (!db) throw new Error('无法获取数据库')

                        // 读取现有配置（取首条记录）
                        const cfgRecord = (await db.table('config').toArray())[0] || { showLogs: false }
                        const newVal = !cfgRecord.showLogs

                        // 更新数据库配置（清空后写入，因主键为 showLogs）
                        await db.table('config').clear()
                        try {
                            await db.table('config').put({ showLogs: newVal })
                        } catch {
                            // 兼容旧版本 config 表主键为 key 的情况
                            await db.table('config').put({ key: 'showLogs', value: newVal })
                        }

                        // 立即应用配置
                        applyLogConfig(newVal)

                        // 更新按钮文本
                        button.textContent = newVal ? '关闭日志' : '开启日志'
                    } catch (e) {
                        console.error('切换日志开关失败', e)
                    }
                }}
                style="padding: calc(4px * var(--scale-ratio, 1)) calc(8px * var(--scale-ratio, 1));background: none;border: none;color: white;cursor: pointer;font-size: calc(12px * var(--scale-ratio, 1));"
            >
                {showLogsEnabled === null ? '加载中...' : showLogsEnabled ? '关闭日志' : '开启日志'}
            </button>
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
                <div
                    class="prop-tabbar"
                    style="width: 12%;height: 100%;display: flex;flex-direction: column;align-items: center;justify-content: flex-start;padding-top: calc(12px * var(--scale-ratio, 1));gap: calc(8px * var(--scale-ratio, 1));pointer-events: auto;background: rgba(30, 41, 59, 0.95);"
                >
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
