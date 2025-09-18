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
    import { perfMonitorEnabled } from '../../stores/perf-monitor.store.svelte'
    import { get } from 'svelte/store'
    import { registerShortcut } from '../../services/interactions/shortcut.service'
    import { isStandardProdMode, isDevMode, isLiteMode } from '../../services/env/environment.service'
    import { copySelectedNode, pasteNodeToSelectedParent, cutSelectedNode } from '../../stores/dom-tree.store.svelte'

    /* 新增：Dom 区域与 Dom 树列表组件 */
    import DomCanvas from '../widgets/DomCanvas.svelte'
    import TabbedPanel from '../widgets/TabbedPanel.svelte'
    import PropertyPanel from '../widgets/property-panel/PropertyPanel.svelte'
    import Icon from '../widgets/Icon.svelte'
    import blocksConfig from '../blocks/blocks.config.json'
    import { applyLogConfig } from '../../services/utils/log-switch'

    // 引入 DOM 树集中式状态管理
    import { domTree, selectedId, removeNodeById, projectId, findNodeById } from '../../stores/dom-tree.store.svelte'
    import DexieService from '../../services/database/dexie-service'
    import StatusBar from '../widgets/StatusBar.svelte'
    import { screenDetector } from '../../services/screen/screen-detector.service'
    // 是否显示工作区，默认显示工作区
    let showWorkspace = $state(true)

    // 属性面板标签控制
    const tabs = [
        { key: 'attr', icon: 'Sliders', title: '主要属性' },
        { key: 'position', icon: 'Scan', title: '定位样式' },
        { key: 'layout', icon: 'Layout', title: '布局样式' },
        { key: 'background', icon: 'Image', title: '背景样式' },
        { key: 'text', icon: 'Type', title: '文字样式' },
        { key: 'border', icon: 'SquareDashed', title: '边框样式' },
        { key: 'feature', icon: 'Puzzle', title: '特性样式' },
        { key: 'data', icon: 'Database', title: '数据绑定' },
        { key: 'event', icon: 'Activity', title: '事件处理' }
    ] as const

    // 根据组件类型判断是否展示特性页签
    const blocksMap = new Map(blocksConfig.map((b: any) => [b.type, b]))

    function isFeatureTabEnabledForType(type?: string) {
        if (!type) return false
        const cfg = blocksMap.get(type)
        return cfg?.showFeatureTab === true
    }

    function isDataTabEnabledForType(type?: string) {
        if (!type) return false
        const cfg = blocksMap.get(type)
        return cfg?.dataBindable === true
    }

    // 根据当前选中节点类型，决定是否展示特性与数据页签
    const computeTabStates = () => {
        const currentSelectedId = selectedId()
        if (!currentSelectedId) return { feature: false, data: false }

        const findNode = (node: any): any => {
            if (node.id === currentSelectedId) return node
            if (node.children) {
                for (const child of node.children) {
                    const found = findNode(child)
                    if (found) return found
                }
            }
            return null
        }
        const selectedNode = findNode(domTree)
        const type = selectedNode?.componentType || (selectedNode?.attributes as any)?.type
        return {
            feature: isFeatureTabEnabledForType(type),
            data: isDataTabEnabledForType(type)
        }
    }

    let showFeatureTab = $derived.by(() => computeTabStates().feature)
    let showDataTab = $derived.by(() => computeTabStates().data)

    // 可见标签数组
    let visibleTabs = $derived.by(() => tabs)

    /* ----------------------------------------
       左侧工具栏按钮定义
    ---------------------------------------- */
    const tools = [
        { key: 'move', icon: 'Move', title: '移动画布', type: 'toggle' },
        { key: 'zoom', icon: 'Search', title: '缩放画布', type: 'toggle' },
        { key: 'focus', icon: 'Crosshair', title: '聚焦节点', type: 'trigger' },
        { key: 'draw', icon: 'Brush', title: '绘制节点', type: 'toggle' },
        { key: 'adjust', icon: 'LayoutDashboard', title: '调整节点', type: 'toggle' },
        { key: 'delete', icon: 'SquareX', title: '删除节点', type: 'trigger' }
    ] as const

    let activeTool: (typeof tools)[number]['key'] | null = $state(null)

    function setTool(k: (typeof tools)[number]['key']) {
        const selected = tools.find((t) => t.key === k)
        if (!selected) return

        const prevTool = activeTool

        // 若之前处于绘制模式且本次点击的不是绘制工具，需先触发一次 b 键抬起以退出绘制模式
        if (prevTool === 'draw' && k !== 'draw') {
            const evt = new KeyboardEvent('keyup', {
                key: 'b',
                code: 'KeyB',
                bubbles: true,
                cancelable: true
            })
            document.dispatchEvent(evt)
        }

        // 若之前处于缩放模式且本次点击的不是缩放工具，需触发一次 Alt 键抬起以退出缩放模式
        if (prevTool === 'zoom' && k !== 'zoom') {
            const evt = new KeyboardEvent('keyup', {
                key: 'Alt',
                code: 'AltLeft',
                bubbles: true,
                cancelable: true
            })
            document.dispatchEvent(evt)
        }

        // 若之前处于调整模式且本次点击的不是调整工具，需触发一次 v 键抬起以退出调整模式
        if (prevTool === 'adjust' && k !== 'adjust') {
            const evt = new KeyboardEvent('keyup', {
                key: 'v',
                code: 'KeyV',
                bubbles: true,
                cancelable: true
            })
            document.dispatchEvent(evt)
        }

        // 若之前是移动工具且此次点击的不是移动工具，无论新类型如何，都要先松开空格并清理状态
        if (prevTool === 'move' && k !== 'move') {
            const evtUp = new KeyboardEvent('keyup', {
                key: ' ',
                code: 'Space',
                bubbles: true,
                cancelable: true
            })
            document.dispatchEvent(evtUp)
            activeTool = null
        }

        if (selected.type === 'toggle') {
            activeTool = activeTool === k ? null : k

            // 点击移动画布本身，按需按下/松开空格
            if (k === 'move') {
                if (activeTool === 'move') {
                    // 触发一次 keydown Space
                    const evt = new KeyboardEvent('keydown', {
                        key: ' ',
                        code: 'Space',
                        bubbles: true,
                        cancelable: true
                    })
                    document.dispatchEvent(evt)
                } else {
                    // 触发一次 keyup Space
                    const evt = new KeyboardEvent('keyup', {
                        key: ' ',
                        code: 'Space',
                        bubbles: true,
                        cancelable: true
                    })
                    document.dispatchEvent(evt)
                }
            }

            // 点击缩放画布按钮，按需按下/松开 Alt 键，模拟快捷缩放准备模式
            if (k === 'zoom') {
                if (activeTool === 'zoom') {
                    const evt = new KeyboardEvent('keydown', {
                        key: 'Alt',
                        code: 'AltLeft',
                        bubbles: true,
                        cancelable: true
                    })
                    document.dispatchEvent(evt)
                } else {
                    const evt = new KeyboardEvent('keyup', {
                        key: 'Alt',
                        code: 'AltLeft',
                        bubbles: true,
                        cancelable: true
                    })
                    document.dispatchEvent(evt)
                }
            }
            // 点击绘制节点按钮，按需按下/松开 B 键，模拟快捷绘制准备模式
            if (k === 'draw') {
                if (activeTool === 'draw') {
                    const evt = new KeyboardEvent('keydown', {
                        key: 'b',
                        code: 'KeyB',
                        bubbles: true,
                        cancelable: true
                    })
                    document.dispatchEvent(evt)
                } else {
                    const evt = new KeyboardEvent('keyup', {
                        key: 'b',
                        code: 'KeyB',
                        bubbles: true,
                        cancelable: true
                    })
                    document.dispatchEvent(evt)
                }
            }
            // 点击调整节点按钮，按需按下/松开 V 键，模拟调整准备模式（仅当选中非根节点时生效）
            if (k === 'adjust') {
                const currentSelectedId = selectedId()
                if (!currentSelectedId || currentSelectedId === 'root') {
                    // 如果是根节点，强制取消调整工具
                    activeTool = null
                } else {
                    if (activeTool === 'adjust') {
                        const evt = new KeyboardEvent('keydown', {
                            key: 'v',
                            code: 'KeyV',
                            bubbles: true,
                            cancelable: true
                        })
                        document.dispatchEvent(evt)
                    } else {
                        const evt = new KeyboardEvent('keyup', {
                            key: 'v',
                            code: 'KeyV',
                            bubbles: true,
                            cancelable: true
                        })
                        document.dispatchEvent(evt)
                    }
                }
            }
        } else if (selected.type === 'trigger') {
            // trigger 类型：点击后立即执行操作，同时关闭可能存在的 toggle 工具
            if (selected.key === 'focus') {
                // 触发快捷键 F 聚焦当前节点（或根节点）
                const evt = new KeyboardEvent('keydown', {
                    key: 'f',
                    code: 'KeyF',
                    bubbles: true,
                    cancelable: true
                })
                document.dispatchEvent(evt)
                const evtUp = new KeyboardEvent('keyup', {
                    key: 'f',
                    code: 'KeyF',
                    bubbles: true,
                    cancelable: true
                })
                document.dispatchEvent(evtUp)
            } else if (selected.key === 'delete') {
                // 触发 Delete 键删除逻辑，等同于按下 DEL
                const currentSelectedId = selectedId()
                if (currentSelectedId && currentSelectedId !== 'root') {
                    console.log('点击删除按钮，删除节点:', currentSelectedId)
                    removeNodeById(currentSelectedId).then((success) => {
                        if (success) {
                            console.log('节点删除成功:', currentSelectedId)
                        } else {
                            console.warn('节点删除失败:', currentSelectedId)
                        }
                    })
                } else {
                    console.log('点击删除按钮，但没有选中节点或选中的是根节点')
                }
            }
            activeTool = null
        }
    }

    // 根据选中节点的 activePropertyTab 动态设置 activeTab
    let activeTab: 'attr' | 'feature' | 'position' | 'layout' | 'background' | 'text' | 'border' | 'event' = $derived.by(() => {
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
            const tabValue = selectedNode.attributes.activePropertyTab
            if (tabs.some((t) => t.key === tabValue)) {
                return tabValue as 'attr' | 'feature' | 'position' | 'background' | 'border' | 'event'
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
    let unregisterCopy: () => void
    let unregisterCut: () => void
    let unregisterPaste: () => void
    let unregisterTabShortcuts: (() => void)[] = []
    // 新增保存相关变量及注销函数

    let saveAsButton = $state<HTMLButtonElement | null>(null)

    let unregisterSaveAsShortcut: (() => void) | undefined
    let unregisterHomeShortcut: (() => void) | undefined
    let unregisterSaveAsCapture: (() => void) | undefined

    onMount(async () => {
        // 初始化项目ID（兼容精简/路由两种场景）
        if (isLiteMode()) {
            try {
                const projects = await DexieService.getAllRecords('qi-qiao-ban', 'projects')
                const id = (projects?.[0] as any)?.id as string | undefined
                if (id) projectId.set(id)
            } catch (e) {
                console.warn('获取项目ID失败', e)
            }
        } else {
            const id = window.location.hash.split('/').pop()
            if (id) projectId.set(id)
        }

        // 初始化项目模式
        await initializeProjectMode()

        // 替换原有的Ctrl+E快捷键为Konami验证器
        unregister = registerShortcut('Ctrl+E', () => {
            console.log('Ctrl+E快捷键被触发')
            startKonamiVerification()
        })

        // 注册DEL键删除选中节点的快捷键
        unregisterDelKey = registerShortcut('Delete', () => {
            if (!showWorkspace) return
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
        unregisterCopy = registerShortcut('Ctrl+C', () => {
            if (!showWorkspace) return
            copySelectedNode()
        })
        unregisterCut = registerShortcut('Ctrl+X', () => {
            if (!showWorkspace) return
            cutSelectedNode()
        })
        unregisterPaste = registerShortcut('Ctrl+V', () => {
            if (!showWorkspace) return
            pasteNodeToSelectedParent(false, false)
        })

        // 仅保留另存为快捷键
        unregisterSaveAsShortcut = registerShortcut('Ctrl+S', (e) => {
            if (!showWorkspace) return
            e.preventDefault()
            saveAsButton?.click()
        })
        unregisterHomeShortcut = registerShortcut('Home', () => {
            if (!showWorkspace) return
            window.location.href = '/'
        })
        unregisterTabShortcuts = tabs.slice(0, 9).map((t, idx) =>
            registerShortcut(`Alt+${idx + 1}`, () => {
                // 如果是特性设置页签且当前不显示，则忽略
                if ((t.key === 'feature' && !showFeatureTab) || (t.key === 'data' && !showDataTab)) return
                setTab(t.key)
            })
        )
    })

    onDestroy(() => {
        // 离开编辑器页面时恢复默认设计尺寸，避免主页UI被放大
        screenDetector.setDesignSize(1920, 1080)
        unregister && unregister()
        stopKonamiVerification()
        unregisterDelKey && unregisterDelKey()
        unregisterCopy && unregisterCopy()
        unregisterCut && unregisterCut()
        unregisterPaste && unregisterPaste()
        unregisterTabShortcuts.forEach((fn) => fn())

        // 新增：注销快捷键，仅保留另存为
        unregisterSaveAsShortcut && unregisterSaveAsShortcut()
        unregisterHomeShortcut && unregisterHomeShortcut()
        unregisterSaveAsCapture && unregisterSaveAsCapture()
    })

    // Konami Code验证器相关函数
    function startKonamiVerification() {
        if (isVerifying) return

        // 如果当前是编辑模式，直接切换回正常模式，不需要验证
        if (showWorkspace) {
            showWorkspace = false
            updateProjectMode()
            return
        }

        // 非精简模式下跳过验证，直接进入编辑模式
        if (!isLiteMode()) {
            showWorkspace = true
            updateProjectMode()
            return
        }

        // 精简模式下从正常模式切换到编辑模式需要验证
        isVerifying = true
        konamiSequence = []

        // 设置15秒超时
        verificationTimeout = window.setTimeout(() => {
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

        // 将按键规范化：字符键一律转为小写，方向键保持原样
        const key = e.key.length === 1 ? e.key.toLowerCase() : e.key

        // 添加当前按键到序列
        konamiSequence.push(key)

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

    // 计算当前项目ID（同步读取 store）
    let currentProjectId = $derived($projectId)

    async function initializeProjectMode() {
        if (!currentProjectId) {
            console.warn('无法获取项目ID')
            return
        }
        try {
            const project = await DexieService.getRecord<any>('qi-qiao-ban', 'projects', currentProjectId)
            if (project && project.mode) {
                showWorkspace = project.mode === 'editing'

                if (project.name) {
                    document.title = project.name as string
                }
            } else {
                showWorkspace = false
            }
        } catch (error) {
            console.error('初始化项目模式失败:', error)
            showWorkspace = false
        }
    }

    async function updateProjectMode() {
        if (!currentProjectId) return
        const newMode = showWorkspace ? 'editing' : 'normal'
        try {
            await DexieService.updateRecord('qi-qiao-ban', 'projects', currentProjectId, { mode: newMode })
            console.log(`项目模式已更新为: ${newMode}`)
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
                // 更新性能监视开关，默认为 true
                perfMonitorEnabled.set(cfgRecord?.perfMonitor !== false)
            }
        } catch {}
    })

    // track if space key pressed to set move tool highlight
    let spacePressing = false
    let altPressing = false
    let bPressing = false
    let vPressing = false // track V key state for adjust tool

    function onSpaceDown(e: KeyboardEvent) {
        if (!e.isTrusted) return // 忽略 ourselves派发的合成事件
        const target = e.target as HTMLElement | null
        if (target && (['INPUT', 'TEXTAREA'].includes(target.tagName) || (typeof (target as any).closest === 'function' && target.closest('[contenteditable="true"]')))) {
            return
        }
        if (e.code === 'Space' && !spacePressing) {
            spacePressing = true
            if (activeTool !== 'move') {
                activeTool = 'move'
            }
            // 派发键盘事件给画布action
            const evt = new KeyboardEvent('keydown', {
                key: ' ',
                code: 'Space',
                bubbles: true,
                cancelable: true
            })
            document.dispatchEvent(evt)
        }
    }

    function onSpaceUp(e: KeyboardEvent) {
        if (!e.isTrusted) return
        const target = e.target as HTMLElement | null
        if (target && (['INPUT', 'TEXTAREA'].includes(target.tagName) || (typeof (target as any).closest === 'function' && target.closest('[contenteditable="true"]')))) {
            return
        }
        if (e.code === 'Space' && spacePressing) {
            spacePressing = false
            // 仅当是按空格触发的高亮时才移除
            if (activeTool === 'move') {
                activeTool = null
            }
            // 派发键盘事件给画布action
            const evt = new KeyboardEvent('keyup', {
                key: ' ',
                code: 'Space',
                bubbles: true,
                cancelable: true
            })
            document.dispatchEvent(evt)
        }
    }
    function onAltDown(e: KeyboardEvent) {
        if (!e.isTrusted) return
        if (e.key === 'Alt' && !altPressing) {
            altPressing = true
            if (activeTool !== 'zoom') {
                activeTool = 'zoom'
            }
            // 派发键盘事件给画布action
            const evt = new KeyboardEvent('keydown', {
                key: 'Alt',
                code: 'AltLeft',
                bubbles: true,
                cancelable: true
            })
            document.dispatchEvent(evt)
        }
    }

    function onAltUp(e: KeyboardEvent) {
        if (!e.isTrusted) return
        if (e.key === 'Alt' && altPressing) {
            altPressing = false
            if (activeTool === 'zoom') {
                activeTool = null
            }
            // 派发键盘事件给画布action
            const evt = new KeyboardEvent('keyup', {
                key: 'Alt',
                code: 'AltLeft',
                bubbles: true,
                cancelable: true
            })
            document.dispatchEvent(evt)
        }
    }
    function isSelectedNodeLocked(): boolean {
        const id = selectedId()
        if (!id) return false
        const node = findNodeById(domTree, id)
        return node?.locked === true
    }

    // 按住 B 进入绘制节点准备模式
    function onBDown(e: KeyboardEvent) {
        if (!e.isTrusted) return
        const target = e.target as HTMLElement | null
        if (target && (['INPUT', 'TEXTAREA'].includes(target.tagName) || (typeof (target as any).closest === 'function' && target.closest('[contenteditable="true"]')))) {
            return
        }
        if (isSelectedNodeLocked()) {
            e.preventDefault()
            e.stopImmediatePropagation?.()
            return
        }
        if ((e.key === 'b' || e.key === 'B') && !bPressing) {
            bPressing = true
            if (activeTool !== 'draw') {
                activeTool = 'draw'
            }
        }
    }

    function onBUp(e: KeyboardEvent) {
        if (!e.isTrusted) return
        const target = e.target as HTMLElement | null
        if (target && (['INPUT', 'TEXTAREA'].includes(target.tagName) || (typeof (target as any).closest === 'function' && target.closest('[contenteditable="true"]')))) {
            return
        }
        if ((e.key === 'b' || e.key === 'B') && bPressing) {
            bPressing = false
            if (activeTool === 'draw') {
                activeTool = null
            }
        }
    }

    // 按住 V 进入调整节点准备模式（仅当选中非根节点时生效）
    function onVDown(e: KeyboardEvent) {
        if (!e.isTrusted) return
        const target = e.target as HTMLElement | null
        if (target && (['INPUT', 'TEXTAREA'].includes(target.tagName) || (typeof (target as any).closest === 'function' && target.closest('[contenteditable="true"]')))) {
            return
        }
        if ((e.key === 'v' || e.key === 'V') && !vPressing && !isSelectedNodeLocked()) {
            const id = selectedId()
            if (!id || id === 'root') return // 根节点不可调整
            vPressing = true
            if (activeTool !== 'adjust') {
                activeTool = 'adjust'
            }
        }
    }

    function onVUp(e: KeyboardEvent) {
        if (!e.isTrusted) return
        const target = e.target as HTMLElement | null
        if (target && (['INPUT', 'TEXTAREA'].includes(target.tagName) || (typeof (target as any).closest === 'function' && target.closest('[contenteditable="true"]')))) {
            return
        }
        if ((e.key === 'v' || e.key === 'V') && vPressing) {
            vPressing = false
            if (activeTool === 'adjust') {
                activeTool = null
            }
        }
    }

    onMount(() => {
        document.addEventListener('keydown', onSpaceDown)
        document.addEventListener('keyup', onSpaceUp)
        document.addEventListener('keydown', onAltDown)
        document.addEventListener('keyup', onAltUp)
        document.addEventListener('keydown', onBDown)
        document.addEventListener('keyup', onBUp)
        document.addEventListener('keydown', onVDown)
        document.addEventListener('keyup', onVUp)
        return () => {
            document.removeEventListener('keydown', onSpaceDown)
            document.removeEventListener('keyup', onSpaceUp)
            document.removeEventListener('keydown', onAltDown)
            document.removeEventListener('keyup', onAltUp)
            document.removeEventListener('keydown', onBDown)
            document.removeEventListener('keyup', onBUp)
            document.removeEventListener('keydown', onVDown)
            document.removeEventListener('keyup', onVUp)
        }
    })

    onMount(() => {
        let lastSwitch = 0
        const MIN_INTERVAL = 100 // ms

        function wheelHandler(e: WheelEvent) {
            if (!e.ctrlKey) return
            // 屏蔽浏览器默认缩放
            e.preventDefault()
            const now = Date.now()
            if (now - lastSwitch < MIN_INTERVAL) return
            lastSwitch = now
            // 在输入框/可编辑区域时不切换
            const target = e.target as HTMLElement
            const tagName = target.tagName.toLowerCase()
            if (['input', 'textarea', 'select'].includes(tagName) || target.isContentEditable) return

            const dir = e.deltaY > 0 ? 1 : -1
            const idx = visibleTabs.findIndex((t) => t.key === activeTab)
            const len = visibleTabs.length
            let nextIdx = idx
            do {
                nextIdx = (nextIdx + dir + len) % len
            } while ((visibleTabs[nextIdx].key === 'feature' && !showFeatureTab) || (visibleTabs[nextIdx].key === 'data' && !showDataTab))

            setTab(visibleTabs[nextIdx].key)
        }
        window.addEventListener('wheel', wheelHandler, { passive: false })
        return () => {
            window.removeEventListener('wheel', wheelHandler)
        }
    })

    // 新增：注册捕获阶段监听，强制屏蔽浏览器 Ctrl+Shift+S（Edge 截图等）
    const saveAsCaptureHandler = (e: KeyboardEvent) => {
        if (!showWorkspace) return
        if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 's') {
            e.preventDefault()
            e.stopPropagation()
            saveAsButton?.click()
        }
    }
    document.addEventListener('keydown', saveAsCaptureHandler, true)
    unregisterSaveAsCapture = () => document.removeEventListener('keydown', saveAsCaptureHandler, true)
</script>

<svelte:head>
    <title></title>
</svelte:head>

<!-- 背景 -->
<div style="width: 100%;height: 100%;position: absolute;background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);z-index: 0;overflow: hidden;">
    {#if $projectId}
        <!-- 画布包裹元素，承担缩放与定位 -->
        <!-- @ts-ignore: props typing still WIP -->
        <DomCanvas editing={showWorkspace} />
    {/if}
</div>

<!-- 工作区 -->
{#if showWorkspace}
    <div class="workspace" style="position: absolute;width: 100%;height: 100%;z-index: 10;pointer-events: none;">
        <!-- 顶部导航区 -->
        <div style="display: flex;align-items: center;justify-content: flex-start;gap: 10px;padding: 0 10px;width: 100%;height: 4%;background:rgb(15, 20, 29);pointer-events: auto;">
            {#if !isLiteMode()}
                <button onclick={() => (window.location.href = '/')} style="padding: calc(4px * var(--scale-ratio, 1)) calc(8px * var(--scale-ratio, 1));background: none;border: none;color: white;cursor: pointer;font-size: calc(12px * var(--scale-ratio, 1));">首页</button>
            {/if}
            {#if $projectId}
                {#if typeof window !== 'undefined' && 'showSaveFilePicker' in window}
                    <button
                        bind:this={saveAsButton}
                        onclick={async (event) => {
                            const button = event.target as HTMLButtonElement
                            try {
                                if (!currentProjectId) throw new Error('无法获取项目ID')
                                button.disabled = true
                                button.textContent = '保存中...'
                                const { liteExportService } = await import('../../services/export/lite-export.service')
                                const blob = await liteExportService.exportLiteData(currentProjectId)
                                // @ts-ignore File System Access API
                                const handle = await window.showSaveFilePicker({
                                    suggestedName: 'project-data.json',
                                    types: [
                                        {
                                            description: 'JSON 文件',
                                            accept: { 'application/json': ['.json'] }
                                        }
                                    ]
                                })
                                // @ts-ignore
                                const writable = await handle.createWritable()
                                await writable.write(blob)
                                await writable.close()
                                button.textContent = '保存'
                            } catch (e) {
                                console.error('另存失败', e)
                                button.textContent = '保存'
                            } finally {
                                button.disabled = false
                            }
                        }}
                        style="padding: calc(4px * var(--scale-ratio, 1)) calc(8px * var(--scale-ratio, 1));background: none;border: none;color: white;cursor: pointer;font-size: calc(12px * var(--scale-ratio, 1));"
                    >
                        保存
                    </button>
                {/if}
            {/if}
            <button
                onclick={async (event) => {
                    const button = event.target as HTMLButtonElement
                    try {
                        const db = await DexieService.getDatabase('qi-qiao-ban')
                        if (!db) throw new Error('无法获取数据库')
                        const cfgRecord = (await db.table('config').toArray())[0] || { showLogs: false, perfMonitor: true }
                        const newVal = !cfgRecord.perfMonitor
                        await db.table('config').clear()
                        await db.table('config').put({ ...cfgRecord, perfMonitor: newVal })
                        perfMonitorEnabled.set(newVal)
                    } catch (e) {
                        console.error('切换性能监视失败', e)
                    }
                }}
                style="padding: calc(4px * var(--scale-ratio, 1)) calc(8px * var(--scale-ratio, 1));background: none;border: none;color: white;cursor: pointer;font-size: calc(12px * var(--scale-ratio, 1));"
            >
                {$perfMonitorEnabled ? '关闭性能监视' : '开启性能监视'}
            </button>

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
                        await db.table('config').put({ ...cfgRecord, showLogs: newVal })

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

                            if (!currentProjectId) {
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

                            const projectBlob = await liteExportService.exportLiteData(currentProjectId)
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
        </div>

        <div style="display: flex;justify-content: space-between;width: 100%;height: 94%;">
            <!-- 左侧 -->
            <div style=" display: flex;width: 22.5%;height: 100%;">
                <!-- 工具栏 -->

                <div class="tool-bar" style="width: 12%; height: 100%;background: rgb(15, 20, 29);display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding-top: calc(12px * var(--scale-ratio, 1));gap: calc(8px * var(--scale-ratio, 1));pointer-events:auto;">
                    {#each tools as t}
                        <button
                            class:active={activeTool === t.key}
                            onclick={(e) => {
                                setTool(t.key)
                                ;(e.currentTarget as HTMLButtonElement).blur()
                            }}
                            title={t.title}
                        >
                            <Icon name={t.icon} size={16} style="width: calc(16px * var(--scale-ratio, 1)); height: calc(16px * var(--scale-ratio, 1))" />
                        </button>
                    {/each}
                </div>
                <!-- dom树列表 -->
                <div style="width: 88%;height: 100%;background: rgba(30, 41, 59, 0.8);pointer-events: auto">
                    <TabbedPanel />
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
                <div class="prop-tabbar" style="width: 12%;height: 100%;display: flex;flex-direction: column;align-items: center;justify-content: flex-start;padding-top: calc(12px * var(--scale-ratio, 1));gap: calc(8px * var(--scale-ratio, 1));pointer-events: auto;background: rgb(15, 20, 29);">
                    {#each visibleTabs as t}
                        <button disabled={(t.key === 'feature' && !showFeatureTab) || (t.key === 'data' && !showDataTab)} class:active={activeTab === t.key} onclick={() => setTab(t.key)} title={t.title}>
                            <Icon name={t.icon} size={16} style="width: calc(16px * var(--scale-ratio, 1)); height: calc(16px * var(--scale-ratio, 1))" />
                        </button>
                    {/each}
                </div>
            </div>
        </div>

        <!-- 底部状态栏 -->
        <div style="background: rgb(15, 20, 29);width: 100%; height: 2%;pointer-events: none;"><StatusBar /></div>
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
    /* 禁用状态样式 */
    .prop-tabbar button:disabled {
        background: rgba(255, 255, 255, 0.04);
        cursor: not-allowed;
        opacity: 0.4;
    }
    .prop-tabbar button:disabled:hover {
        background: rgba(255, 255, 255, 0.04);
    }
    .prop-tabbar button.active {
        background: rgba(255, 255, 255, 0.28);
    }

    /* 左侧工具栏按钮同样使用相同样式 */
    .tool-bar button {
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
    .tool-bar button:hover {
        background: rgba(255, 255, 255, 0.18);
    }
    .tool-bar button.active {
        background: rgba(255, 255, 255, 0.28);
    }
</style>
