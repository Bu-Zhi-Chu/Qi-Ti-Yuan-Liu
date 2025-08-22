import { mount } from 'svelte'
import './style/app.css'
import App from './/App.svelte'
import { PWAChecker } from './services/pwa/pwa-detector.service.js'
import { screenDetector } from './services/screen/screen-detector.service'
import DexieService from './services/database/dexie-service'
import { isLiteMode } from './services/env/environment.service'

// 控制台日志始终开启，便于调试和监控

let app: ReturnType<typeof mount> | undefined // 提前声明，供导出使用

    // 初始化 Dexie 数据库并随后挂载应用
    ; (async () => {
        try {
            // 精简模式下跳过数据库初始化和检查
            if (isLiteMode()) {
                console.log('【数据库交互】精简模式：跳过数据库初始化和检查')
            } else {
                console.log('【数据库交互】应用启动时检查数据库')
                if (!(await DexieService.databaseExists('qi-qiao-ban'))) {
                    console.log('【数据库交互】数据库不存在，创建数据库')
                    await DexieService.createDatabase('qi-qiao-ban')
                } else {
                    console.log('【数据库交互】数据库已存在')
                }
            }

            // 挂载 Svelte 应用
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
