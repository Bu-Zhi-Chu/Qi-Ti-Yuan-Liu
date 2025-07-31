/**
 * 屏幕适配服务
 * 提供屏幕信息检测、设备识别和响应式缩放功能
 * 专为七巧板低代码工具优化设计
 */

import type { ScreenInfo, ScreenChangeCallback, DeviceType, PixelDensityLevel } from './screen.types.js';

interface ViewportScale {
    width: number
    height: number
    ratio: number
}

class ScreenDetector {
  private callbacks: Set<ScreenChangeCallback> = new Set();
  private resizeObserver: ResizeObserver | null = null;
  private currentInfo: ScreenInfo | null = null;
  private styleElement: HTMLStyleElement | null = null;
  private DESIGN_WIDTH = 1920;
  private DESIGN_HEIGHT = 1080;
  private isViewportScalingEnabled = false;

  constructor() {
    this.setupEventListeners();
  }

  /**
   * 获取当前屏幕信息
   */
  getScreenInfo(): ScreenInfo {
    // 计算DPI（每英寸点数）
    // 基于设备像素比和常见屏幕尺寸估算
    const dpi = Math.round(window.devicePixelRatio * 96); // 标准DPI为96，乘以设备像素比

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
        dpi: Math.round(dpi),
        dpiX: Math.round(dpi),
        dpiY: Math.round(dpi)
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
    };

    this.currentInfo = info;
    return info;
  }

  /**
   * 监听屏幕变化
   */
  onChange(callback: ScreenChangeCallback): () => void {
    this.callbacks.add(callback);

    // 返回取消订阅函数
    return () => {
      this.callbacks.delete(callback);
    };
  }

  /**
   * 获取设备类型
   */
  getDeviceType(): DeviceType {
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  /**
   * 获取推荐缩放比例
   */
  getRecommendedScale(): number {
    const { width, height } = this.getScreenInfo().viewport;
    const baseWidth = 1920;
    const baseHeight = 1080;

    const scaleX = width / baseWidth;
    const scaleY = height / baseHeight;

    return Math.min(scaleX, scaleY, 1);
  }

  /**
   * 判断是否为横屏
   */
  isLandscape(): boolean {
    return window.innerWidth > window.innerHeight;
  }

  /**
   * 获取像素密度等级
   */
  getPixelDensityLevel(): PixelDensityLevel {
    const ratio = window.devicePixelRatio;
    if (ratio < 1.5) return 'low';
    if (ratio < 2.5) return 'medium';
    return 'high';
  }

  /**
   * 清理资源
   */
  destroy(): void {
    this.callbacks.clear();

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('orientationchange', this.handleOrientationChange);
    window.removeEventListener('pageshow', this.handlePageShow);

    if (this.styleElement && this.styleElement.parentNode) {
      this.styleElement.parentNode.removeChild(this.styleElement);
    }
    this.styleElement = null;
  }

  /**
   * 初始化视口缩放
   */
  initViewportScale(): void {
    this.isViewportScalingEnabled = true;
    this.createStyleElement();
    this.refreshViewportScale();
    this.bindViewportScaleEvents();
  }

  /**
   * 停止视口缩放
   */
  stopViewportScale(): void {
    this.isViewportScalingEnabled = false;
    
    if (this.styleElement && this.styleElement.parentNode) {
      this.styleElement.parentNode.removeChild(this.styleElement);
    }
    this.styleElement = null;
    
    // 清除body的样式
    document.body.style.cssText = '';
  }

  /**
   * 获取当前视口缩放比例
   */
  getViewportScale(): ViewportScale {
    const docWidth = document.documentElement.clientWidth;
    const docHeight = document.documentElement.clientHeight;

    return {
      width: docWidth / this.DESIGN_WIDTH,
      height: docHeight / this.DESIGN_HEIGHT,
      ratio: Math.min(docWidth / this.DESIGN_WIDTH, docHeight / this.DESIGN_HEIGHT)
    };
  }

  /**
   * 设置设计稿尺寸
   */
  setDesignSize(width: number, height: number): void {
    this.DESIGN_WIDTH = width;
    this.DESIGN_HEIGHT = height;
    if (this.isViewportScalingEnabled) {
      this.refreshViewportScale();
    }
  }

  /**
   * 创建样式元素
   */
  private createStyleElement(): void {
    this.styleElement = document.createElement('style');
    this.styleElement.innerHTML = `body{width:${this.DESIGN_WIDTH}px;height:${this.DESIGN_HEIGHT}px!important;}`;
    document.documentElement.firstElementChild?.appendChild(this.styleElement);
  }

  /**
   * 刷新视口缩放比例
   */
  private refreshViewportScale(): void {
    const scale = this.getViewportScale();

    // 应用缩放变换
    document.body.style.cssText = `
      width: ${this.DESIGN_WIDTH}px;
      height: ${this.DESIGN_HEIGHT}px;
      transform: scale(${scale.width}, ${scale.height});
      transform-origin: left top;
      overflow: hidden;
    `;

    // 延迟检查是否需要重新计算
    setTimeout(() => {
      const lateWidth = document.documentElement.clientWidth;
      const lateHeight = document.documentElement.clientHeight;
      const docWidth = document.documentElement.clientWidth;

      if (lateWidth !== docWidth) {
        const newScale = {
          width: lateWidth / this.DESIGN_WIDTH,
          height: lateHeight / this.DESIGN_HEIGHT
        };

        document.body.style.cssText = `
          width: ${this.DESIGN_WIDTH}px;
          height: ${this.DESIGN_HEIGHT}px;
          transform: scale(${newScale.width}, ${newScale.height});
          transform-origin: left top;
          overflow: hidden;
        `;
      }
    }, 0);
  }

  /**
   * 绑定视口缩放事件监听器
   */
  private bindViewportScaleEvents(): void {
    window.addEventListener('resize', this.handleViewportResize);
    window.addEventListener('pageshow', this.handlePageShow);
  }

  /**
   * 处理视口缩放窗口大小变化
   */
  private handleViewportResize = (): void => {
    if (this.isViewportScalingEnabled) {
      this.refreshViewportScale();
    }
  };

  /**
   * 处理页面显示事件（处理浏览器后退/前进缓存）
   */
  private handlePageShow = (e: PageTransitionEvent): void => {
    if (e.persisted && this.isViewportScalingEnabled) {
      this.refreshViewportScale();
    }
  };

  private setupEventListeners(): void {
    // 监听窗口大小变化
    window.addEventListener('resize', this.handleResize);

    // 监听方向变化
    window.addEventListener('orientationchange', this.handleOrientationChange);

    // 监听屏幕方向变化（现代浏览器）
    if (screen.orientation) {
      screen.orientation.addEventListener('change', this.handleOrientationChange);
    }
  }

  private handleResize = (): void => {
    const info = this.getScreenInfo();
    this.callbacks.forEach(callback => callback(info));
  };

  private handleOrientationChange = (): void => {
    // 延迟执行，确保尺寸已更新
    setTimeout(() => {
      const info = this.getScreenInfo();
      this.callbacks.forEach(callback => callback(info));
    }, 100);
  };
}

// 创建单例实例
export const screenDetector = new ScreenDetector();

// 向后兼容：导出 viewportScaleService
export const viewportScaleService = {
  init: () => screenDetector.initViewportScale(),
  destroy: () => screenDetector.stopViewportScale(),
  getScale: () => screenDetector.getViewportScale()
};

// 响应式封装（Svelte5专用）
import { readable } from 'svelte/store';

/**
 * Svelte5响应式屏幕信息store
 */
export const screenInfo = readable<ScreenInfo>(screenDetector.getScreenInfo(), (set) => {
  const unsubscribe = screenDetector.onChange(set);
  return unsubscribe;
});

/**
 * 设备类型响应式store
 */
export const deviceType = readable<'mobile' | 'tablet' | 'desktop'>(
  screenDetector.getDeviceType(),
  (set) => screenDetector.onChange(() => set(screenDetector.getDeviceType()))
);

/**
 * 推荐缩放比例响应式store
 */
export const recommendedScale = readable<number>(
  screenDetector.getRecommendedScale(),
  (set) => screenDetector.onChange(() => set(screenDetector.getRecommendedScale()))
);

/**
 * 视口缩放比例响应式store
 */
export const viewportScale = readable<ViewportScale>(
  screenDetector.getViewportScale(),
  (set) => screenDetector.onChange(() => set(screenDetector.getViewportScale()))
);