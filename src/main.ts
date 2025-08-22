import { mount } from 'svelte'
import './style/app.css'
import App from './/App.svelte'
import { PWAChecker } from './services/pwa/pwa-detector.service.js'
import { screenDetector } from './services/screen/screen-detector.service'
import DexieService from './services/database/dexie-service'

// ------------------------------------------------------------
// 全局调试开关
// 生产环境默认关闭 console.log / console.debug
// 若需在生产环境排查问题，可在控制台执行：
// localStorage.setItem('debug', 'true'); location.reload();
// 亦可在 Vite 的 .env 文件中设置 VITE_DEBUG=true 强制开启日志。
// ------------------------------------------------------------
const DEBUG_MODE: boolean = import.meta.env.DEV || (typeof localStorage !== 'undefined' && localStorage.getItem('debug') === 'true') || import.meta.env.VITE_DEBUG === 'true' || import.meta.env.VITE_PROD_LITE === 'true'

if (!DEBUG_MODE) {
    console.log = () => { }
    console.debug = () => { }
}

let app: ReturnType<typeof mount> | undefined // 提前声明，供导出使用

    // 初始化 Dexie 数据库并随后挂载应用
    ; (async () => {
        try {
            console.log('【数据库交互】应用启动时检查数据库')
            if (!(await DexieService.databaseExists('qi-qiao-ban'))) {
                console.log('【数据库交互】数据库不存在，创建数据库')
                await DexieService.createDatabase('qi-qiao-ban')
            } else {
                console.log('【数据库交互】数据库已存在')
            }
            // 数据库准备就绪后再挂载 Svelte 应用
            await PWAChecker.checkEnvironment()
            await PWAChecker.initPWA()
            app = mount(App, {
                target: document.getElementById('app')!
            })
            // 初始化视口缩放（基于设计稿1912x1000）
            screenDetector.initViewportScale()
        } catch (error) {
            console.error('数据库初始化失败', error)
        }
    })()

export default app
