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
 */

import type { RouteConfig } from '@mateothegreat/svelte5-router'

// 页面组件导入
import HomePage from '../components/pages/HomePage.svelte'
import AboutPage from '../components/pages/AboutPage.svelte'
import SettingsPage from '../components/pages/SettingsPage.svelte'
import Page404 from '../components/pages/404.svelte'

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
        // 404页面 - 捕获所有未匹配的路由
        path: '/(.*)*',
        component: Page404,
        name: 'not-found'
    }
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
            console.log('🔵 第一次路由导航:', route)
        } else {
            console.log('🟢 第二次路由导航:', route)
        }
        return true // 返回true继续导航
    }
}
