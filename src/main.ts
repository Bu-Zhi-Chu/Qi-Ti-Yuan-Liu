import { mount } from 'svelte'
import './style/app.css'
import App from './/App.svelte'
import { PWAChecker } from './services/pwa/pwa-detector.service.js'
import { screenDetector } from './services/screen/screen-detector.service'

// ------------------------------------------------------------
// 全局调试开关
// 生产环境默认关闭 console.log / console.debug
// 若需在生产环境排查问题，可在控制台执行：
//     localStorage.setItem('debug', 'true'); location.reload();
// 亦可在 Vite 的 .env 文件中设置 VITE_DEBUG=true 强制开启日志。
// ------------------------------------------------------------
const DEBUG_MODE: boolean = import.meta.env.DEV ||
    (typeof localStorage !== 'undefined' && localStorage.getItem('debug') === 'true') ||
    (import.meta.env.VITE_DEBUG === 'true')

if (!DEBUG_MODE) {
    console.log = () => { }
    console.debug = () => { }
}


// 初始化PWA检测和降级处理
PWAChecker.initPWA()

// 初始化视口缩放（基于设计稿1912x1000）
screenDetector.initViewportScale()

const app = mount(App, {
    target: document.getElementById('app')!
})

export default app
