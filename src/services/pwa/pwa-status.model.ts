/**
 * PWA状态模型定义
 */

export interface PWAStatus {
  isHTTPS: boolean;
  isSecureContext: boolean;
  canRegisterSW: boolean;
  isStandalone: boolean;
  downgradeMode: boolean;
}