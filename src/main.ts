import { mount } from 'svelte'
import './style/app.css'
import App from './/App.svelte'
import { PWAChecker } from './services/pwa/pwa-detector.service.js'
import { screenDetector } from './services/screen/screen-detector.service'

// 初始化PWA检测和降级处理
PWAChecker.initPWA()

// 初始化视口缩放（基于设计稿1912x1000）
screenDetector.initViewportScale()

const app = mount(App, {
    target: document.getElementById('app')!
})

export default app
