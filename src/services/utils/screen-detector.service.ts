/**
 * 屏幕信息检测服务
 * 提供屏幕、视口、设备信息的检测和监听功能
 * 专为七巧板低代码工具优化设计
 */

export interface ScreenInfo {
  physical: {
    width: number;
    height: number;
    pixelRatio: number;
    isHighDPI: boolean;
    orientation: string;
    colorDepth: number;
    availWidth: number;
    availHeight: number;
    dpi: number;
    dpiX: number;
    dpiY: number;
  };
  viewport: {
    width: number;
    height: number;
    scale: number;
    scrollX: number;
    scrollY: number;
  };
  device: {
    isTouch: boolean;
    isMobile: boolean;
    platform: string;
    userAgent: string;
  };
  timestamp: number;
}

export interface ScreenChangeCallback {
  (info: ScreenInfo): void;
}

class ScreenDetector {
  private callbacks: Set<ScreenChangeCallback> = new Set();
  private resizeObserver: ResizeObserver | null = null;
  private currentInfo: ScreenInfo | null = null;

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
  getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
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
  getPixelDensityLevel(): 'low' | 'medium' | 'high' {
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
  }

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