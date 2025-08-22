import { mount } from 'svelte'
import './style/app.css'
import App from './/App.svelte'
import { PWAChecker } from './services/pwa/pwa-detector.service.js'
import { screenDetector } from './services/screen/screen-detector.service'
import DexieService from './services/database/dexie-service'
import { isLiteMode } from './services/env/environment.service'
import { importInto } from 'dexie-export-import'

// 控制台日志始终开启，便于调试和监控

let app: ReturnType<typeof mount> | undefined // 提前声明，供导出使用

    // 初始化 Dexie 数据库并随后挂载应用
    ; (async () => {
        try {
            // 精简模式下从project-data.json导入数据并还原数据库
            if (isLiteMode()) {
                console.log('【数据库交互】精简模式：从project-data.json导入数据')
                try {
                    // 导入项目数据
                    const response = await fetch('./data/project-data.json')
                    const projectData = await response.json()

                    // 检查数据库是否存在，不存在则创建
                    const dbExists = await DexieService.databaseExists('qi-qiao-ban')
                    if (!dbExists) {
                        await DexieService.createDatabase('qi-qiao-ban', true)
                    }

                    const db = await DexieService.getDatabase('qi-qiao-ban')
                    if (db) {
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

                        // 比较导出时间，决定是否导入
                        const jsonExportTime = projectData.exportTime
                        const shouldImport = existingProjectCount === 0 ||
                            !dbExportTime ||
                            (jsonExportTime && new Date(jsonExportTime) > new Date(dbExportTime))

                        if (shouldImport) {
                            console.log(`【数据库交互】需要导入数据 - JSON时间: ${jsonExportTime}, 数据库时间: ${dbExportTime || '无'}`)

                            // 清空旧数据，避免数据污染
                            console.log('【数据库交互】清空数据库旧数据')
                            await db.table('projects').clear()
                            await db.table('doms').clear()

                            // 清理Service Worker缓存
                            if ('caches' in window) {
                                try {
                                    const cacheNames = await caches.keys()
                                    await Promise.all(cacheNames.map(name => caches.delete(name)))
                                    console.log('【缓存清理】Service Worker缓存已清理')
                                } catch (error) {
                                    console.warn('【缓存清理】清理Service Worker缓存失败', error)
                                }
                            }

                            // 清理localStorage和sessionStorage中的相关数据
                            const keysToRemove = [
                                'qi-qiao-ban-data',
                                'qi-qiao-ban-cache',
                                'pwa-cache',
                                'offline-data'
                            ]
                            keysToRemove.forEach(key => {
                                localStorage.removeItem(key)
                                sessionStorage.removeItem(key)
                            })
                            console.log('【缓存清理】本地存储数据已清理')

                            // 处理自定义格式的项目数据导入
                            if (projectData.projects && Array.isArray(projectData.projects)) {
                                // 导入项目数据
                                for (const project of projectData.projects) {
                                    await db.table('projects').put(project)
                                    console.log(`【数据库交互】精简模式：导入项目数据 ${project.id}`)
                                }
                            }

                            if (projectData.doms && Array.isArray(projectData.doms)) {
                                // 导入DOM数据
                                for (const dom of projectData.doms) {
                                    await db.table('doms').put(dom)
                                    console.log(`【数据库交互】精简模式：导入DOM数据 ${dom.id}`)
                                }
                            }
                        } else {
                            console.log(`【数据库交互】跳过导入 - JSON时间: ${jsonExportTime}, 数据库时间: ${dbExportTime || '无'}`)
                        }

                        // 验证导入的数据
                        const finalProjectCount = await db.table('projects').count()
                        const finalDomCount = await db.table('doms').count()
                        console.log(`【数据库交互】精简模式：导入完成 - 项目: ${finalProjectCount}个, DOM节点: ${finalDomCount}个`)
                    } else {
                        throw new Error('无法获取数据库实例')
                    }

                    console.log('【数据库交互】精简模式：数据库导入成功')
                } catch (error) {
                    console.error('【数据库交互】精简模式：数据库导入失败', error)
                    // 导入失败时不创建空数据库，让应用继续运行
                    console.warn('【数据库交互】精简模式：数据库导入失败，应用将以无数据状态运行')
                }
            } else {
                console.log('【数据库交互】应用启动时检查数据库')
                if (!(await DexieService.databaseExists('qi-qiao-ban'))) {
                    console.log('【数据库交互】数据库不存在，创建数据库')
                    await DexieService.createDatabase('qi-qiao-ban', false)
                } else {
                    console.log('【数据库交互】数据库已存在')
                }
            }

            // 挂载 Svelte 应用 - 精简模式也启用PWA功能
            await PWAChecker.checkEnvironment()
            await PWAChecker.initPWA()
            app = mount(App, {
                target: document.getElementById('app')!
            })
            // 初始化视口缩放（基于设计稿1912x1000）
            screenDetector.initViewportScale()
        } catch (error) {
            console.error('应用初始化失败', error)
        }
    })()

export default app
