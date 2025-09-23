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
import { getStableDeviceKey, getStableDeviceKeyHash } from './services/fingerprint/browser-fingerprint.service'
import { ENABLE_AUTH_VERIFICATION } from './config/config'
import { DEFAULT_DB_NAME } from './config/config'

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

            isHidden = false

            // 同步释放Alt键，避免延迟
            checkAltKeyState()

        } else {

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

    isHidden = !initialHasFocus || !initialIsVisible

    if (isHidden) {

    } else {

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

// 清理所有资源的函数
function cleanupAllResources() {
    cleanupFocusDetection()
    authService.destroy()
    console.log('🧹【资源清理】所有资源已清理')
}

// 监听页面卸载事件，确保清理资源
window.addEventListener('beforeunload', cleanupAllResources)
window.addEventListener('unload', cleanupAllResources)

// 延迟初始化以确保DOM完全加载
setTimeout(() => {
    try {
        initFocusDetection()
    } catch (error) {

    }
}, 100)

let app: ReturnType<typeof mount> | undefined // 提前声明，供导出使用

// 数据库初始化函数
async function initializeDatabase() {
    try {
        // 精简模式下从project-data.qqb导入数据并还原数据库
        if (isLiteMode()) {
            // 精简模式先清空网页标题，防止显示旧项目名称或默认标题
            document.title = ''
            // console.log('【数据交互】精简模式：从project-data.qqb导入数据')
            try {
                // 导入项目数据
                const response = await fetch('./data/project-data.qqb')
                let projectData: any

                // 读取文件内容
                let text = await response.text()
                const magic = 'QQB1'
                const shift = 0x40
                if (text.startsWith(magic)) {
                    const shifted = text.slice(magic.length)
                    const base64 = Array.from(shifted)
                        .map(c => String.fromCharCode((c.charCodeAt(0) - shift + 256) & 0xff))
                        .join('')
                    text = decodeURIComponent(escape(atob(base64)))
                }
                projectData = JSON.parse(text)


                // 检查数据库是否存在，不存在则创建
                const dbExists = await DexieService.databaseExists(DEFAULT_DB_NAME)
                if (!dbExists) {
                    await DexieService.createDatabase(DEFAULT_DB_NAME, true)
                }

                const db = await DexieService.getDatabaseUnsafe(DEFAULT_DB_NAME)
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
                        console.warn('【数据交互】无法获取现有导出时间', error)
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
                        console.log('📊【数据交互】projectsTable', projectsTable)
                        if (projectsTable && projectsTable.rows && projectsTable.rows.length > 0) {
                            jsonExportTime = projectsTable.rows[0].exportTime
                        }
                    }

                    // 打印两侧时间戳以便调试
                    console.log(`⏰【数据交互】时间对比 - JSON时间: ${jsonExportTime || '未提供'}, 数据库时间: ${dbExportTime || '无'}`)

                    // 比较导出时间，决定是否导入
                    const shouldImport = existingProjectCount === 0 ||
                        !dbExportTime ||
                        (jsonExportTime && new Date(jsonExportTime) > new Date(dbExportTime))

                    if (shouldImport) {


                        // 清空旧数据，避免数据污染
                        console.log('【数据交互】清空数据库旧数据')
                        await db.table('projects').clear()
                        await db.table('doms').clear()

                        console.log('📦【数据交互】使用dexie-export-import导入数据')

                        // 将JSON数据转换为Blob，然后使用importInto导入
                        const jsonString = JSON.stringify(projectData)
                        const blob = new Blob([jsonString], { type: 'application/json' })
                        await importInto(db, blob, { overwriteValues: true })


                        console.log('【数据交互】dexie-export-import导入完成')

                        // 重置所有项目的 canvasState 为默认值，确保初始缩放一致
                        try {
                            await db.table('projects').toCollection().modify((proj: any) => {
                                proj.canvasState = { x: 0, y: 0, scale: 0.5 }
                            })
                            console.log('🔄【数据交互】已重置项目 canvasState 为默认值 (scale=0.5, x=0, y=0)')
                        } catch (resetErr) {
                            console.warn('⚠️【数据交互】重置 canvasState 失败', resetErr)
                        }
                    } else {
                        console.log(`⏭️【数据交互】数据库已是最新，跳过导入 - JSON时间: ${jsonExportTime}, 数据库时间: ${dbExportTime || '无'}`)
                    }





                    // 验证导入的数据
                    const finalProjectCount = await db.table('projects').count()
                    const finalDomCount = await db.table('doms').count()
                    console.log(`✅【数据交互】精简模式：验证完成 - 项目: ${finalProjectCount}个, DOM节点: ${finalDomCount}个`)
                    console.log(`🔇【数据交互】默认关闭日志打印`)

                } else {
                    throw new Error('无法获取数据库实例')
                }


            } catch (error) {
                console.error('❌【数据交互】精简模式：数据库导入失败', error)
                // 导入失败时不创建空数据库，让应用继续运行
                console.warn('⚠️【数据交互】精简模式：数据库导入失败，应用将以无数据状态运行')
            }
        } else {
            if (!(await DexieService.databaseExists(DEFAULT_DB_NAME))) {
                await DexieService.createDatabase(DEFAULT_DB_NAME, false)
            } else {
            }

            // 再次读取并应用日志配置（数据库已存在场景）
            try {
                const db = await DexieService.getDatabaseUnsafe(DEFAULT_DB_NAME)
                if (db) {
                    const cfgRecord = (await db.table('config').toArray())[0]
                    applyLogConfig(cfgRecord ? (cfgRecord.showLogs ?? cfgRecord.value) === true : import.meta.env.DEV === true)
                }
            } catch { }
        }
    } catch (error) {
        console.error('【数据交互】数据库初始化失败', error)
        throw error
    }
}

// 应用初始化函数
async function initializeApp() {
    try {
        // 初始化PWA
        await PWAChecker.checkEnvironment()
        await PWAChecker.initPWA()

        app = mount(App, {
            target: document.getElementById('app')!
        })
        // 初始化视口缩放（基于设计稿1920x1000）
        screenDetector.initViewportScale()
    } catch (error) {
        console.error('应用初始化失败', error)
        throw error
    }
}

// 主初始化流程 - 数据库优先创建，再进行授权验证
; (async () => {
    try {
        // 欢迎横幅
        console.log(
            '%c 🧩  欢迎使用七巧板 · 低代码开发工具 ',
            'background:linear-gradient(90deg,#f97316,#fb923c);color:#fff;font-weight:bold;font-size:16px;padding:4px 10px;border-radius:6px'
        )

        console.group('%c📜 版权声明', 'color:#16a34a;font-weight:bold;font-size:14px;')
        console.log('%c1. 七巧板版权完全属于 %c"步知处社团"%c 全体开发成员所有。',
            'color:#6b7280;font-size:12px;',
            'color:#f59e0b;font-size:12px;font-weight:bold;',
            'color:#6b7280;font-size:12px;')
        console.log('%c2. 七巧板软件包，任何个人或组织获取授权后在遵守下列条件的前提下可以使用：',
            'color:#6b7280;font-size:12px;')
        console.log('%c   • 不进行任何形式的破解和裁剪，程序包完整引用；', 'color:#6b7280;font-size:12px;')
        console.log('%c   • 保留此版权信息在控制台输出。', 'color:#6b7280;font-size:12px;')
        console.log('%c3. 我们保留对此版权信息的最终解释权。', 'color:#6b7280;font-size:12px;')
        console.groupEnd()



        // 先初始化数据库（必须先创建数据库，因为授权验证需要读取config表）
        await initializeDatabase()

        // ===== 统一授权验证（精简/非精简都走这里） =====
        // 可通过环境变量彻底关闭验证
        if (ENABLE_AUTH_VERIFICATION) {
            await authService.verifyToken()

            // 等待首次验证成功
            await new Promise<void>((resolve, reject) => {
                let unsubscribe: (() => void) | null = null

                unsubscribe = authService.subscribe((status, isAuthorized) => {
                    if (status === 'authorized' && isAuthorized) {
                        // 首次验证成功，启动定期验证（不立即触发）
                        authService.startPeriodicVerification(false)
                        unsubscribe?.()
                        resolve()
                    } else if (status === 'unauthorized') {
                        unsubscribe?.()
                        reject(new Error('设备未授权'))
                    } else if (status === 'error') {
                        unsubscribe?.()
                        reject(new Error('授权验证失败'))
                    }
                    // 如果是 'checking' 状态，继续等待
                })

                // 设置超时，避免无限等待
                setTimeout(() => {
                    unsubscribe?.()
                    reject(new Error('授权验证超时'))
                }, 30000) // 30秒超时
            })
        } else {
            // ⚙️ 验证被关闭：直接放行
            console.log('⚙️【应用启动】授权验证已关闭，直接放行')
        }

        await initializeApp()


    } catch (error) {
        console.error('💥【应用启动】初始化失败:', error)

        // 打印当前浏览器密钥信息用于调试
        try {
            const deviceKey = await getStableDeviceKey()
            const deviceKeyHash = await getStableDeviceKeyHash()
            // console.log('🔑【浏览器密钥】当前设备密钥:', deviceKey)
            // console.log('🔑【浏览器密钥】当前设备密钥哈希:', deviceKeyHash)
        } catch (keyError) {
            console.error('❌【浏览器密钥】获取设备密钥失败:', keyError)
        }

        // 显示错误信息给用户
        const errorDiv = document.createElement('div')
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
            border-radius: 8px;
            padding: 20px;
            color: #f87171;
            font-family: system-ui, -apple-system, sans-serif;
            text-align: center;
            z-index: 9999;
            backdrop-filter: blur(10px);
        `

        if (error instanceof Error) {
            if (error.message.includes('未授权')) {
                errorDiv.innerHTML = `
                    <h3>🔒 设备令牌无效</h3>
                    <p>此设备令牌未获得远程授权，无法访问应用功能。</p>
                    <p>请联系管理员获取授权。</p>
                `
            } else if (error.message.includes('验证失败') || error.message.includes('验证超时')) {
                errorDiv.innerHTML = `
                    <h3>🌐 令牌验证失败</h3>
                    <p>无法连接到授权服务器进行验证。</p>
                    <p>请检查网络连接后刷新页面重试。</p>
                    <button onclick="location.reload()" style="
                        margin-top: 10px;
                        padding: 8px 16px;
                        background: #f87171;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                    ">刷新页面</button>
                `
            } else {
                errorDiv.innerHTML = `
                    <h3>⚠️ 应用初始化失败</h3>
                    <p>应用启动过程中发生错误。</p>
                    <p>错误信息: ${error.message}</p>
                    <button onclick="location.reload()" style="
                        margin-top: 10px;
                        padding: 8px 16px;
                        background: #f87171;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                    ">刷新页面</button>
                `
            }
        }

        document.body.appendChild(errorDiv)
    }
})()

export default app
