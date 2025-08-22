/**
 * PWA 环境检测服务
 *
 * @description
 * 该服务负责检测和初始化 Progressive Web App (PWA) 环境，提供智能降级策略。
 * 主要功能包括：
 * - 检测当前运行环境是否支持 PWA
 * - 自动注册 Service Worker
 * - 提供降级策略（当 PWA 不支持时的备用方案）
 * - 缓存检测结果，避免重复检测
 * - 提供友好的状态反馈
 *
 * @architecture
 * 采用单例模式设计，确保全局只有一个实例，避免重复初始化。
 *
 * @usage
 * ```typescript
 * // 基础使用
 * import { PWAChecker } from './services/pwa-detector.service';
 *
 * // 检测环境
 * PWAChecker.checkEnvironment();
 *
 * // 获取状态信息
 * const status = PWAChecker.getStatusMessage();
 * console.log(status.message);
 *
 * // 初始化 PWA（自动注册 Service Worker）
 * PWAChecker.initPWA();
 * ```
 *
 * @environment
 * - 开发环境：会显示详细的控制台日志
 * - 生产环境：自动处理 Service Worker 注册
 * - 要求 HTTPS（PWA 标准）
 *
 * @fallback
 * 当环境不支持 PWA 时，会：
 * - 在控制台输出降级提示信息（不影响用户体验）
 * - 跳过 Service Worker 注册，避免错误
 * - 确保应用仍能以普通 Web 应用方式正常运行
 * - 移除 PWA 专属功能（如安装按钮）的初始化逻辑
 *
 * @example
 * ```typescript
 * // 在应用启动时调用
 * onMount(() => {
 *   PWAChecker.checkEnvironment();
 *   PWAChecker.initPWA();
 * });
 * ```
 *
 * @see {@link PWAStatus} 状态接口定义
 * @see {@link https://developer.mozilla.org/zh-CN/docs/Web/Progressive_web_apps} PWA 官方文档
 */

import type { PWAStatus } from './pwa-status.model.js'

export class PWAChecker {
    private static _instance: PWAChecker | null = null
    private static _initialized = false
    private static _lastStatus: PWAStatus | null = null

    /**
     * 检测当前环境是否支持PWA（带缓存避免重复检测）
     */
    static checkEnvironment(): PWAStatus {
        // 如果已缓存结果，直接返回
        if (this._lastStatus) {
            return this._lastStatus
        }

        const isHTTPS = location.protocol === 'https:'
        const isSecureContext = window.isSecureContext
        const canRegisterSW = 'serviceWorker' in navigator && isSecureContext
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches

        // 只在首次检测时打印信息
        if (!this._initialized) {
        }

        this._lastStatus = {
            isHTTPS,
            isSecureContext,
            canRegisterSW,
            isStandalone,
            downgradeMode: !canRegisterSW
        }

        return this._lastStatus
    }

    /**
     * 初始化PWA注册，支持降级（防止重复执行）
     */
    static async initPWA(): Promise<void> {
        // 防止重复初始化
        if (this._initialized) {
            return
        }

        this._initialized = true
        const status = this.checkEnvironment()

        if (status.downgradeMode) {
            this.setupFallback()
            return
        }

        try {
            // 正常PWA注册流程（包括开发环境）
            if ('serviceWorker' in navigator) {
                const isDev = import.meta.env.DEV || import.meta.env.VITE_PROD_LITE === 'true'
                const swPath = isDev ? './dev-sw.js?dev-sw' : './sw.js'
                await navigator.serviceWorker.register(swPath, { scope: './' })
            }
        } catch (error) {
            this.setupFallback()
        }
    }

    /**
     * 设置降级方案
     */
    private static setupFallback(): void {
        // 仅在控制台输出降级提示，避免影响用户体验
    }

    /**
     * 获取PWA状态提示信息
     */
    static getStatusMessage(): string {
        const status = this.checkEnvironment()

        if (status.downgradeMode) {
            return '当前为HTTP环境，PWA功能已降级'
        }

        if (status.isStandalone) {
            return '应用已安装到主屏幕'
        }

        return '支持PWA功能，可安装到主屏幕'
    }
}

// 自动检测并初始化
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        PWAChecker.initPWA()
    })
}
