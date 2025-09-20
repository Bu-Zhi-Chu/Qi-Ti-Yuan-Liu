/**
 * 屏幕适配服务
 * 提供屏幕信息检测、设备识别和响应式缩放功能
 * 专为七巧板低代码工具优化设计
 */

import type { ScreenInfo, ScreenChangeCallback, DeviceType, PixelDensityLevel } from './screen.types.js'
import DexieService from '../database/dexie-service'
import { DEFAULT_DB_NAME } from '../database/database.config'
import { get } from 'svelte/store'
import { projectId } from '../../stores/dom-tree.store.svelte'

interface ViewportScale {
    width: number
    height: number
    ratio: number
}

class ScreenDetector {
    private callbacks: Set<ScreenChangeCallback> = new Set()
    private currentInfo: ScreenInfo | null = null
    private styleElement: HTMLStyleElement | null = null
    private DESIGN_WIDTH = 1920
    private DESIGN_HEIGHT = 1000
    private isViewportScalingEnabled = false

    constructor() {
        this.setupEventListeners()
        // 根据当前 URL 中的项目ID设置设计尺寸（如果有）
        this.applyProjectDesignSize()
    }

    /**
     * 获取当前屏幕信息
     */
    getScreenInfo(): ScreenInfo {
        // 计算DPI（每英寸点数）
        const dpi = Math.round(window.devicePixelRatio * 96)

        const info: ScreenInfo = {
            physical: {
                width: screen.width,
                height: screen.height,
                pixelRatio: window.devicePixelRatio,
                isHighDPI: window.devicePixelRatio > 1,
                orientation: screen.orientation?.type || 'unknown',
                colorDepth: screen.colorDepth || 24,
                availWidth: screen.availWidth,
                availHeight: screen.availHeight,
                dpi,
                dpiX: dpi,
                dpiY: dpi
            },
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight,
                scale: Math.round((screen.width / window.innerWidth) * 100) / 100,
                scrollX: window.scrollX || 0,
                scrollY: window.scrollY || 0
            },
            device: {
                isTouch: 'ontouchstart' in window,
                isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
                platform: navigator.platform || 'unknown',
                userAgent: navigator.userAgent
            },
            timestamp: Date.now()
        }

        this.currentInfo = info
        return info
    }

    /**
     * 监听屏幕变化
     */
    onChange(callback: ScreenChangeCallback): () => void {
        this.callbacks.add(callback)

        // 返回取消订阅函数
        return () => {
            this.callbacks.delete(callback)
        }
    }

    /**
     * 获取设备类型
     */
    getDeviceType(): DeviceType {
        const width = window.innerWidth
        if (width < 768) return 'mobile'
        if (width < 1024) return 'tablet'
        return 'desktop'
    }

    /**
     * 获取推荐缩放比例
     */
    getRecommendedScale(): number {
        const { width, height } = this.getScreenInfo().viewport
        const baseWidth = 1920
        const baseHeight = 1000

        const scaleX = width / baseWidth
        const scaleY = height / baseHeight

        return Math.min(scaleX, scaleY, 1)
    }

    /**
     * 判断是否为横屏
     */
    isLandscape(): boolean {
        return window.innerWidth > window.innerHeight
    }

    /**
     * 获取像素密度等级
     */
    getPixelDensityLevel(): PixelDensityLevel {
        const ratio = window.devicePixelRatio
        if (ratio < 1.5) return 'low'
        if (ratio < 2.5) return 'medium'
        return 'high'
    }

    /**
     * 清理资源
     */
    destroy(): void {
        this.callbacks.clear()
        this.stopViewportScale()

        window.removeEventListener('resize', this.handleResize)
        window.removeEventListener('orientationchange', this.handleOrientationChange)
        window.removeEventListener('pageshow', this.handlePageShow)

        if (screen.orientation) {
            screen.orientation.removeEventListener('change', this.handleOrientationChange)
        }
    }

    /**
     * 初始化视口缩放
     */
    initViewportScale(): void {

        this.isViewportScalingEnabled = true
        this.createStyleElement()
        this.refreshViewportScale()
    }

    /**
     * 停止视口缩放
     */
    stopViewportScale(): void {
        this.isViewportScalingEnabled = false

        if (this.styleElement && this.styleElement.parentNode) {
            this.styleElement.parentNode.removeChild(this.styleElement)
        }
        this.styleElement = null

        // 清除CSS变量
        document.documentElement.style.removeProperty('--vw-ratio')
        document.documentElement.style.removeProperty('--vh-ratio')
        document.documentElement.style.removeProperty('--scale-ratio')
    }

    /**
     * 获取当前视口缩放比例
     */
    getViewportScale(): ViewportScale {
        const docWidth = document.documentElement.clientWidth
        const docHeight = document.documentElement.clientHeight
        const scale = {
            width: docWidth / this.DESIGN_WIDTH,
            height: docHeight / this.DESIGN_HEIGHT,
            ratio: Math.min(docWidth / this.DESIGN_WIDTH, docHeight / this.DESIGN_HEIGHT)
        }

        return scale
    }

    /**
     * 设置设计稿尺寸
     */
    setDesignSize(width: number, height: number): void {
        this.DESIGN_WIDTH = width
        this.DESIGN_HEIGHT = height
        if (this.isViewportScalingEnabled) {
            this.refreshViewportScale()
        }
    }

    /**
     * 使用store中的项目ID读取项目的设计尺寸
     */
    private async applyProjectDesignSize(): Promise<void> {
        // 从dom-tree.store获取当前项目ID（已静态导入，移除动态导入）
        const currentProjectId = get(projectId)
        if (!currentProjectId) return

        try {
            const project: any = await DexieService.getRecord(DEFAULT_DB_NAME, 'projects', currentProjectId)
            if (project && project.designWidth && project.designHeight) {
                this.setDesignSize(project.designWidth, project.designHeight)
            }
        } catch { }
    }

    /**
     * 创建样式元素
     */
    private createStyleElement(): void {

        this.styleElement = document.createElement('style')
        document.documentElement.firstElementChild?.appendChild(this.styleElement)
    }

    /**
     * 刷新视口缩放比例（使用viewport单位实现自适应）
     */
    private refreshViewportScale(): void {
        const scale = this.getViewportScale()


        // 计算vw/vh比例因子
        const vwRatio = (100 / this.DESIGN_WIDTH) * scale.ratio
        const vhRatio = (100 / this.DESIGN_HEIGHT) * scale.ratio

        // 仅更新CSS变量，不创建或修改样式元素
        document.documentElement.style.setProperty('--vw-ratio', vwRatio.toString())
        document.documentElement.style.setProperty('--vh-ratio', vhRatio.toString())
        document.documentElement.style.setProperty('--scale-ratio', scale.ratio.toString())
    }

    private setupEventListeners(): void {
        // 监听窗口大小变化（同时处理屏幕信息更新和视口缩放）
        window.addEventListener('resize', this.handleResize)

        // 监听方向变化
        window.addEventListener('orientationchange', this.handleOrientationChange)
        if (screen.orientation) {
            screen.orientation.addEventListener('change', this.handleOrientationChange)
        }

        // 监听页面显示事件（处理浏览器缓存）
        window.addEventListener('pageshow', this.handlePageShow)
    }

    private handleResize = (): void => {
        const info = this.getScreenInfo()
        this.callbacks.forEach((callback) => callback(info))

        // 如果启用了视口缩放，刷新缩放比例
        if (this.isViewportScalingEnabled) {
            this.refreshViewportScale()
        }
    }

    private handleOrientationChange = (): void => {
        // 延迟执行，确保尺寸已更新
        setTimeout(() => {
            const info = this.getScreenInfo()
            this.callbacks.forEach((callback) => callback(info))

            if (this.isViewportScalingEnabled) {
                this.refreshViewportScale()
            }
        }, 100)
    }

    private handlePageShow = (e: PageTransitionEvent): void => {
        if (e.persisted) {
            const info = this.getScreenInfo()
            this.callbacks.forEach((callback) => callback(info))

            if (this.isViewportScalingEnabled) {
                this.refreshViewportScale()
            }
        }
    }
}

// 创建单例实例
export const screenDetector = new ScreenDetector()

// 向后兼容：导出 viewportScaleService
export const viewportScaleService = {
    init: () => screenDetector.initViewportScale(),
    destroy: () => screenDetector.stopViewportScale(),
    getScale: () => screenDetector.getViewportScale()
}

// 响应式封装（Svelte5专用）
import { readable } from 'svelte/store'

/**
 * Svelte5响应式屏幕信息store
 */
export const screenInfo = readable<ScreenInfo>(screenDetector.getScreenInfo(), (set) => {
    const unsubscribe = screenDetector.onChange(set)
    return unsubscribe
})

/**
 * 设备类型响应式store
 */
export const deviceType = readable<'mobile' | 'tablet' | 'desktop'>(screenDetector.getDeviceType(), (set) => screenDetector.onChange(() => set(screenDetector.getDeviceType())))

/**
 * 推荐缩放比例响应式store
 */
export const recommendedScale = readable<number>(screenDetector.getRecommendedScale(), (set) => screenDetector.onChange(() => set(screenDetector.getRecommendedScale())))

/**
 * 视口缩放比例响应式store
 */
export const viewportScale = readable<ViewportScale>(screenDetector.getViewportScale(), (set) => screenDetector.onChange(() => set(screenDetector.getViewportScale())))
