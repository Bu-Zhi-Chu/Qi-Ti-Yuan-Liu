/**
 * 环境判断工具服务
 * 
 * 提供统一的环境变量访问接口，支持生产精简模式
 * 
 * 环境变量说明：
 * - VITE_PROD_LITE=true: 生产精简模式
 * - import.meta.env.PROD: 标准生产模式
 * - import.meta.env.DEV: 开发模式
 */

/**
 * 判断是否为生产精简模式
 * 当VITE_PROD_LITE=true时返回true，即使PROD也为true
 */
export function isProdLiteMode(): boolean {
  return import.meta.env.VITE_PROD_LITE === 'true';
}

/**
 * 判断是否为标准生产模式
 * 仅在PROD=true且VITE_PROD_LITE=false时返回true
 */
export function isStandardProdMode(): boolean {
  return import.meta.env.PROD && !isProdLiteMode();
}

/**
 * 判断是否为开发模式
 */
export function isDevMode(): boolean {
  return import.meta.env.DEV;
}

/**
 * 判断是否为任何生产模式（包括标准生产和精简生产）
 */
export function isAnyProdMode(): boolean {
  return import.meta.env.PROD || isProdLiteMode();
}

/**
 * 获取当前环境信息
 */
export function getEnvironmentInfo(): {
  mode: string;
  isDev: boolean;
  isStandardProd: boolean;
  isProdLite: boolean;
} {
  return {
    mode: import.meta.env.MODE,
    isDev: isDevMode(),
    isStandardProd: isStandardProdMode(),
    isProdLite: isProdLiteMode()
  };
}