import { mount } from 'svelte'
import './style/app.css'
import App from './/App.svelte'
import { PWAChecker } from './services/pwa/pwa-detector.service.js'
import { screenDetector } from './services/screen/screen-detector.service'
import DexieService from './services/database/dexie-service'
import { isLiteMode } from './services/env/environment.service'
import { importInto } from 'dexie-export-import'
import { applyLogConfig } from './services/utils/log-switch'
import { authService } from './services/auth/auth.service'


// 根据环境初始化日志：开发环境默认开启，其余环境默认关闭
applyLogConfig(import.meta.env.DEV === true)

// 控制台日志始终开启，便于调试和监控

// 增强的Alt+Tab检测系统
let isHidden = false
let isInitialized = false
let lastActivity = Date.now()
let focusCheckInterval: number | null = null
let altKeyMonitorInterval: number | null = null
let isProcessingFocusChange = false
let lastFocusChangeTime = 0
const FOCUS_CHANGE_DEBOUNCE = 50 // 防抖时间50ms

// releaseAltKey 功能已合并到 checkAltKeyState，移除重复代码

function checkAltKeyState() {
    // 同步释放Alt键，避免异步延迟
    console.log('释放Alt键...')

    // 快速释放左右Alt键
    const leftAltEvent = new KeyboardEvent('keyup', {
        key: 'Alt',
        code: 'AltLeft',
        keyCode: 18,
        altKey: false,
        bubbles: true
    })

    const rightAltEvent = new KeyboardEvent('keyup', {
        key: 'Alt',
        code: 'AltRight',
        keyCode: 18,
        altKey: false,
        bubbles: true
    })

    document.dispatchEvent(leftAltEvent)
    document.dispatchEvent(rightAltEvent)

    // 同时触发window事件
    window.dispatchEvent(leftAltEvent)
    window.dispatchEvent(rightAltEvent)
}

function handleVisibilityChange(isVisible: boolean, source: string) {
    const now = Date.now()

    // 防抖处理：如果距离上次焦点变化时间太近，忽略此次变化
    if (now - lastFocusChangeTime < FOCUS_CHANGE_DEBOUNCE) {
        return
    }

    // 同步处理：如果正在处理焦点变化，排队等待
    if (isProcessingFocusChange) {
        setTimeout(() => {
            handleVisibilityChange(isVisible, source)
        }, FOCUS_CHANGE_DEBOUNCE)
        return
    }

    isProcessingFocusChange = true
    lastFocusChangeTime = now

    try {
        if (isVisible) {
            console.log(`[${source}] TAB+ALT切换回来浏览器了 (${now - lastActivity}ms)`)
            isHidden = false

            // 同步释放Alt键，避免延迟
            checkAltKeyState()

        } else {
            console.log(`[${source}] TAB+ALT切换离开浏览器了`)
            isHidden = true
        }

        lastActivity = now
    } finally {
        // 确保状态重置
        setTimeout(() => {
            isProcessingFocusChange = false
        }, FOCUS_CHANGE_DEBOUNCE)
    }
}

// 增强的焦点检测，使用多种方法
function initFocusDetection() {
    if (isInitialized) return
    isInitialized = true

    // 方法1: 直接的焦点事件
    window.addEventListener('blur', () => handleVisibilityChange(false, 'blur'))
    window.addEventListener('focus', () => handleVisibilityChange(true, 'focus'))

    // 方法2: 页面可见性变化
    document.addEventListener('visibilitychange', () => {
        handleVisibilityChange(!document.hidden, 'visibility')
    })

    // 方法3: 鼠标离开/进入检测
    document.addEventListener('mouseenter', () => handleVisibilityChange(true, 'mouse'))
    document.addEventListener('mouseleave', () => handleVisibilityChange(false, 'mouse'))

    // 方法4: 定时器检测（处理某些浏览器不触发事件的情况）
    focusCheckInterval = window.setInterval(() => {
        const hasFocus = document.hasFocus()
        const isVisible = !document.hidden

        // 如果状态变化了，触发事件
        if (hasFocus && isVisible && isHidden) {
            handleVisibilityChange(true, 'interval')
        } else if ((!hasFocus || !isVisible) && !isHidden) {
            handleVisibilityChange(false, 'interval')
        }
    }, 1000)

    // 方法5: 键盘活动检测
    document.addEventListener('keydown', () => {
        lastActivity = Date.now()
        if (isHidden) {
            handleVisibilityChange(true, 'keyboard')
        }
    })

    // 方法6: 鼠标活动检测
    document.addEventListener('mousedown', () => {
        lastActivity = Date.now()
        if (isHidden) {
            handleVisibilityChange(true, 'mouse')
        }
    })

    // 方法7: Alt键状态监控 - 改为事件驱动，避免定时器
    // 在每次焦点变化时同步处理，不再使用定时器

    // 初始状态
    const initialHasFocus = document.hasFocus()
    const initialIsVisible = !document.hidden

    console.log(`初始化焦点检测: hasFocus=${initialHasFocus}, visible=${initialIsVisible}`)
    isHidden = !initialHasFocus || !initialIsVisible

    if (isHidden) {
        console.log('页面初始状态：未聚焦')
    } else {
        console.log('页面初始状态：已聚焦')
    }
}

// 清理函数
function cleanupFocusDetection() {
    if (focusCheckInterval) {
        clearInterval(focusCheckInterval)
        focusCheckInterval = null
    }
    // altKeyMonitorInterval 已移除，不再使用
}

// 延迟初始化以确保DOM完全加载
setTimeout(() => {
    try {
        initFocusDetection()
    } catch (error) {
        console.warn('初始化焦点检测失败:', error)
    }
}, 100)

let app: ReturnType<typeof mount> | undefined // 提前声明，供导出使用

    // 初始化 Dexie 数据库并随后挂载应用
    ; (async () => {
        try {
            // 精简模式下从project-data.json导入数据并还原数据库
            if (isLiteMode()) {
                // 精简模式先清空网页标题，防止显示旧项目名称或默认标题
                document.title = ''
                console.log('【数据库交互】精简模式：从project-data.json导入数据')
                try {
                    // 导入项目数据
                    const response = await fetch('./data/project-data.json')
                    let projectData: any
                    try {
                        const ct = response.headers.get('content-type') || ''
                        if (ct.includes('application/json')) {
                            projectData = await response.json()
                        } else {
                            const blob = await response.blob()
                            const text = await blob.text()
                            projectData = JSON.parse(text)
                        }
                    } catch (parseErr) {
                        const blob = await response.blob()
                        const text = await blob.text()
                        projectData = JSON.parse(text)
                    }


                    // 检查数据库是否存在，不存在则创建
                    const dbExists = await DexieService.databaseExists('qi-qiao-ban')
                    if (!dbExists) {
                        await DexieService.createDatabase('qi-qiao-ban', true)
                    }

                    const db = await DexieService.getDatabase('qi-qiao-ban')
                    if (db) {
                        // 读取并应用日志配置
                        try {
                            const cfgRecord = (await db.table('config').toArray())[0]
                            applyLogConfig(cfgRecord ? (cfgRecord.showLogs ?? cfgRecord.value) === true : import.meta.env.DEV === true)
                        } catch { }
                        // 获取数据库中最新项目的导出时间
                        let dbExportTime: string | null = null
                        let existingProjectCount = 0
                        try {
                            const existingProjects = await db.table('projects').toArray()
                            existingProjectCount = existingProjects.length
                            if (existingProjectCount > 0 && existingProjects[0].exportTime) {
                                dbExportTime = existingProjects[0].exportTime
                            }
                        } catch (error) {
                            console.warn('【数据库交互】无法获取现有导出时间', error)
                        }

                        // 对于dexie-export-import格式，尝试从元数据中获取导出时间
                        let jsonExportTime = projectData.exportTime
                        // 兼容 projectData.rows 结构提取 exportTime
                        // 兼容 projectData.rows 直接包含数据的结构
                        if (!jsonExportTime && Array.isArray((projectData as any).rows)) {
                            jsonExportTime = (projectData as any).rows[0]?.exportTime
                        }
                        // 兼容不同导出结构，获取 tables 数组
                        let tablesArray: any[] | undefined
                        if (projectData.data) {
                            if (Array.isArray(projectData.data)) {
                                tablesArray = projectData.data
                            } else if (Array.isArray((projectData.data as any).data)) {
                                tablesArray = (projectData.data as any).data
                            }
                        }
                        if (!jsonExportTime && tablesArray) {
                            // 查找projects表中是否有exportTime字段
                            const projectsTable = tablesArray.find((item: any) => item.tableName === 'projects')
                            console.log('【数据库交互】projectsTable', projectsTable)
                            if (projectsTable && projectsTable.rows && projectsTable.rows.length > 0) {
                                jsonExportTime = projectsTable.rows[0].exportTime
                            }
                        }

                        // 打印两侧时间戳以便调试
                        console.log(`【数据库交互】时间对比 - JSON时间: ${jsonExportTime || '未提供'}, 数据库时间: ${dbExportTime || '无'}`)

                        // 比较导出时间，决定是否导入
                        const shouldImport = existingProjectCount === 0 ||
                            !dbExportTime ||
                            (jsonExportTime && new Date(jsonExportTime) > new Date(dbExportTime))

                        if (shouldImport) {

                            // 清空旧数据，避免数据污染
                            console.log('【数据库交互】清空数据库旧数据')
                            await db.table('projects').clear()
                            await db.table('doms').clear()

                            console.log('【数据库交互】使用dexie-export-import导入数据')

                            // 将JSON数据转换为Blob，然后使用importInto导入
                            const jsonString = JSON.stringify(projectData)
                            const blob = new Blob([jsonString], { type: 'application/json' })
                            await importInto(db, blob, { overwriteValues: true })


                            console.log('【数据库交互】dexie-export-import导入完成')

                            // 重置所有项目的 canvasState 为默认值，确保初始缩放一致
                            try {
                                await db.table('projects').toCollection().modify((proj: any) => {
                                    proj.canvasState = { x: 0, y: 0, scale: 0.5 }
                                })
                                console.log('【数据库交互】已重置项目 canvasState 为默认值 (scale=0.5, x=0, y=0)')
                            } catch (resetErr) {
                                console.warn('【数据库交互】重置 canvasState 失败', resetErr)
                            }
                        } else {
                            console.log(`【数据库交互】跳过导入 - JSON时间: ${jsonExportTime}, 数据库时间: ${dbExportTime || '无'}`)
                        }


                        await db.table('config').clear()
                        await db.table('config').put({ showLogs: false })



                        // 验证导入的数据
                        const finalProjectCount = await db.table('projects').count()
                        const finalDomCount = await db.table('doms').count()
                        console.log(`【数据库交互】精简模式：验证完成 - 项目: ${finalProjectCount}个, DOM节点: ${finalDomCount}个`)
                        console.log(`【数据库交互】默认关闭日志打印`)
                        applyLogConfig(false)
                    } else {
                        throw new Error('无法获取数据库实例')
                    }


                } catch (error) {
                    console.error('【数据库交互】精简模式：数据库导入失败', error)
                    // 导入失败时不创建空数据库，让应用继续运行
                    console.warn('【数据库交互】精简模式：数据库导入失败，应用将以无数据状态运行')
                }
            } else {
                if (!(await DexieService.databaseExists('qi-qiao-ban'))) {
                    await DexieService.createDatabase('qi-qiao-ban', false)
                } else {
                }

                // 再次读取并应用日志配置（数据库已存在场景）
                try {
                    const db = await DexieService.getDatabase('qi-qiao-ban')
                    if (db) {
                        const cfgRecord = (await db.table('config').toArray())[0]
                        applyLogConfig(cfgRecord ? (cfgRecord.showLogs ?? cfgRecord.value) === true : import.meta.env.DEV === true)
                    }
                } catch { }
            }

            // 初始化PWA
            await PWAChecker.checkEnvironment()
            await PWAChecker.initPWA()
            
            // 启动令牌验证（异步执行，不阻塞应用启动）
            authService.verifyToken().catch(error => {
                console.error('令牌验证失败:', error)
            })
            
            app = mount(App, {
                target: document.getElementById('app')!
            })
            // 初始化视口缩放（基于设计稿1920x1000）
            screenDetector.initViewportScale()
        } catch (error) {
            console.error('应用初始化失败', error)
        }
    })()

export default app
