import type { Route } from '@dvcol/svelte-simple-router/models'
import { cleanupBlobUrls } from '../services/utils/blob-url-manager'

// 页面组件导入
import HomePage from '../components/pages/HomePage.svelte'
import AboutPage from '../components/pages/AboutPage.svelte'
import SettingsPage from '../components/pages/SettingsPage.svelte'
import DemoPage from '../components/pages/DemoPage.svelte'
import PlaygroundPage from '../components/pages/PlaygroundPage.svelte'
import EditorPage from '../components/pages/EditorPage.svelte'

/**
 * 路由配置数组
 * 定义应用的所有路由规则
 */
export const routes: Readonly<Route<any>[]> = [
    {
        // 首页路由 - 根路径
        path: '/',
        component: HomePage,
        name: 'home'
    },
    {
        // 首页路由 - /home路径
        path: '/home',
        component: HomePage,
        name: 'home-direct'
    },
    {
        // 关于页面
        path: '/about',
        component: AboutPage,
        name: 'about'
    },
    {
        // 设置页面
        path: '/settings',
        component: SettingsPage,
        name: 'settings'
    },
    {
        // ResponsiveBox演示页面
        path: '/demo',
        component: DemoPage,
        name: 'demo'
    },
    {
        // Playground 示例运行页面
        path: '/playground/:id',
        component: PlaygroundPage,
        name: 'playground'
    },
    {
        // Playground 基础页，无ID
        path: '/playground',
        component: PlaygroundPage,
        name: 'playground-base'
    },
    {
        // 编辑器页面-带项目ID
        path: '/editor/:id',
        component: EditorPage,
        name: 'editor-project'
    },
    {
        // 编辑器页面
        path: '/editor',
        component: EditorPage,
        name: 'editor'
    },
    {
        // 404 通配符路由
        path: '*',
        component: () => import('../components/pages/404.svelte'),
        name: 'not-found'
    }
] as const

// Router 全局配置，启用 hash 模式以保证子目录部署可正常访问
export const routerOptions = {
    routes,
    hash: true
} as const

/**
 * 导航计数器（用于统计路由切换次数）
 */
export let navigationCount = 0
