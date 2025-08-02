/**
 * 路由配置定义文件
 *
 * 功能描述：
 * 定义应用的所有路由配置，包括页面路由、重定向和懒加载设置
 *
 * 使用方法：
 * 1. 在App.svelte中导入并使用Router组件
 * 2. 将routes数组传递给Router组件的routes属性
 * 3. 新增路由时在此文件中添加RouteConfig对象
 *
 * ⚠️ 404页面处理说明：
 * 本文件仅定义有效路由，404页面处理已在App.svelte中通过Router组件的statuses配置实现
 * 无需在此文件末尾添加通配符路由，避免路由冲突
 * 详见：study/svelte5-router-2.16.8学习总结.md
 *
 * 最佳实践：
 * - 使用静态导入提升首屏加载速度
 * - 路由命名规范：使用kebab-case命名
 * - 路径设计规范：使用小写字母和连字符
 */

import type { RouteConfig } from '@mateothegreat/svelte5-router'

// 页面组件导入
import HomePage from '../components/pages/HomePage.svelte'
import AboutPage from '../components/pages/AboutPage.svelte'
import SettingsPage from '../components/pages/SettingsPage.svelte'
import DemoPage from '../components/pages/DemoPage.svelte'


/**
 * 路由配置数组
 * 定义应用的所有路由规则
 */
export const routes: RouteConfig[] = [
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
    // 注意：404页面处理已移至App.svelte，通过Router的statuses配置实现
]

/**
 * 全局路由守卫钩子
 * 可用于权限验证、日志记录等全局处理
 */
let navigationCount = 0

export const globalHooks = {
    pre: async (route: any) => {
        navigationCount++
        if (navigationCount % 2 === 1) {

        } else {

        }
        return true // 返回true继续导航
    }
}
