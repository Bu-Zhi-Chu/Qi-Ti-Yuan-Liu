/**
 * 屏幕信息类型定义
 * 定义屏幕检测服务使用的所有类型和接口
 */

/**
 * 屏幕物理信息接口
 * 包含屏幕的物理特性和显示能力
 */
export interface ScreenPhysicalInfo {
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
}

/**
 * 视口信息接口
 * 包含当前可视区域的信息
 */
export interface ViewportInfo {
  width: number;
  height: number;
  scale: number;
  scrollX: number;
  scrollY: number;
}

/**
 * 设备信息接口
 * 包含设备特性和能力
 */
export interface DeviceInfo {
  isTouch: boolean;
  isMobile: boolean;
  platform: string;
  userAgent: string;
}

/**
 * 完整的屏幕信息接口
 * 整合物理、视口和设备信息
 */
export interface ScreenInfo {
  physical: ScreenPhysicalInfo;
  viewport: ViewportInfo;
  device: DeviceInfo;
  timestamp: number;
}

/**
 * 屏幕变化回调函数类型
 * 当屏幕信息发生变化时调用的回调函数
 */
export interface ScreenChangeCallback {
  (info: ScreenInfo): void;
}

/**
 * 设备类型枚举
 * 表示设备的分类
 */
export type DeviceType = 'mobile' | 'tablet' | 'desktop';

/**
 * 像素密度等级枚举
 * 表示设备的像素密度级别
 */
export type PixelDensityLevel = 'low' | 'medium' | 'high';