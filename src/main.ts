import { mount } from 'svelte'
import './style/app.css'
import App from './/App.svelte'
import { PWAChecker } from './services/pwa/pwa-detector.service.js'

// 初始化PWA检测和降级处理
PWAChecker.initPWA()

const app = mount(App, {
    target: document.getElementById('app')!
})

export default app
