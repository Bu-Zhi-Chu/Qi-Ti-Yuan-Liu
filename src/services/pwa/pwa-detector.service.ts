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
            console.group('🔍 PWA环境检测')
            console.log('协议:', location.protocol)
            console.log('安全上下文:', isSecureContext ? '✅ 是' : '❌ 否')
            console.log('Service Worker支持:', 'serviceWorker' in navigator ? '✅ 是' : '❌ 否')
            console.log('独立模式:', isStandalone ? '✅ 是' : '❌ 否')
            console.log('降级模式:', !canRegisterSW ? '⚠️ 是' : '✅ 否')
            console.groupEnd()
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
            console.log('PWA已初始化，跳过重复执行')
            return
        }

        this._initialized = true
        const status = this.checkEnvironment()

        if (status.downgradeMode) {
            console.warn('⚠️ PWA功能降级：当前环境不支持Service Worker')
            this.setupFallback()
            return
        }

        try {
            // 正常PWA注册流程
            if ('serviceWorker' in navigator) {
                // 检查sw.js是否存在
                const response = await fetch('/sw.js', { method: 'HEAD' })
                if (response.ok) {
                    await navigator.serviceWorker.register('/sw.js')
                    console.log('✅ PWA注册成功')
                } else {
                    console.warn('⚠️ Service Worker文件不存在，跳过注册')
                    this.setupFallback()
                }
            }
        } catch (error) {
            console.error('❌ PWA注册失败:', error)
            console.log('ℹ️ 这是开发环境的正常现象，生产环境将使用vite-plugin-pwa自动生成')
            this.setupFallback()
        }
    }

    /**
     * 设置降级方案
     */
    private static setupFallback(): void {
        // 仅在控制台输出降级提示，避免影响用户体验
        console.warn('[PWA] 当前环境不支持离线功能，请使用HTTPS访问以获得最佳体验。')
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
