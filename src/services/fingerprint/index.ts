/**
 * 浏览器指纹服务入口文件
 * 统一导出所有指纹相关功能
 */

// 导出主要服务类和实例
export {
  BrowserFingerprintService,
  browserFingerprintService,
  getBrowserFingerprint,
  getBrowserFingerprintData,
  type BrowserFingerprintData
} from './browser-fingerprint.service';

// 导出类型定义
export {
  type FingerprintOptions,
  type FingerprintResult,
  type DeviceInfo,
  type FingerprintStability,
  type FingerprintWeights,
  DEFAULT_FINGERPRINT_WEIGHTS,
  DEFAULT_FINGERPRINT_OPTIONS
} from './fingerprint.types';

// 导出便捷函数
export { getBrowserFingerprint as getFingerprint } from './browser-fingerprint.service';