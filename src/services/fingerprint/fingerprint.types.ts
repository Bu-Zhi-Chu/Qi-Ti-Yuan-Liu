/**
 * 浏览器指纹相关类型定义
 */

/**
 * 指纹收集选项
 */
export interface FingerprintOptions {
  /** 是否包含Canvas指纹 */
  includeCanvas?: boolean;
  /** 是否包含WebGL指纹 */
  includeWebGL?: boolean;
  /** 是否包含字体检测 */
  includeFonts?: boolean;
  /** 是否包含音频指纹 */
  includeAudio?: boolean;
  /** 是否包含插件信息 */
  includePlugins?: boolean;
  /** 字体检测超时时间（毫秒） */
  fontDetectionTimeout?: number;
  /** 音频指纹超时时间（毫秒） */
  audioTimeout?: number;
}

/**
 * 指纹收集结果
 */
export interface FingerprintResult {
  /** 指纹哈希值 */
  hash: string;
  /** 收集时间戳 */
  timestamp: number;
  /** 收集耗时（毫秒） */
  duration: number;
  /** 是否成功收集所有信息 */
  complete: boolean;
  /** 收集过程中的错误信息 */
  errors?: string[];
}

/**
 * 设备信息
 */
export interface DeviceInfo {
  /** 设备类型 */
  type: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  /** 操作系统 */
  os: string;
  /** 浏览器名称 */
  browser: string;
  /** 浏览器版本 */
  browserVersion: string;
  /** 是否为移动设备 */
  isMobile: boolean;
  /** 是否为触摸设备 */
  isTouch: boolean;
}

/**
 * 指纹稳定性信息
 */
export interface FingerprintStability {
  /** 指纹值 */
  fingerprint: string;
  /** 首次生成时间 */
  firstSeen: number;
  /** 最后更新时间 */
  lastSeen: number;
  /** 变化次数 */
  changeCount: number;
  /** 稳定性评分 (0-1) */
  stabilityScore: number;
}

/**
 * 指纹组件权重配置
 */
export interface FingerprintWeights {
  userAgent: number;
  screen: number;
  timezone: number;
  language: number;
  canvas: number;
  webgl: number;
  fonts: number;
  plugins: number;
  audio: number;
  hardware: number;
}

/**
 * 默认指纹组件权重
 */
export const DEFAULT_FINGERPRINT_WEIGHTS: FingerprintWeights = {
  userAgent: 0.1,
  screen: 0.15,
  timezone: 0.05,
  language: 0.05,
  canvas: 0.2,
  webgl: 0.15,
  fonts: 0.15,
  plugins: 0.05,
  audio: 0.05,
  hardware: 0.05
};

/**
 * 默认指纹收集选项
 */
export const DEFAULT_FINGERPRINT_OPTIONS: FingerprintOptions = {
  includeCanvas: true,
  includeWebGL: true,
  includeFonts: true,
  includeAudio: true,
  includePlugins: true,
  fontDetectionTimeout: 3000,
  audioTimeout: 1000
};