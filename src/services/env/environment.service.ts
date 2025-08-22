/**
 * 环境判断工具服务
 * - LITE=true: 生产精简模式
 *
 * 环境变量说明：
 * - LITE=true: 生产精简模式
 * - import.meta.env.PROD: 标准生产模式
 * - import.meta.env.DEV: 开发模式
 */

/**
 * 判断是否为精简模式
 * 当LITE=true时返回true
 */
export function isLiteMode(): boolean {
  return import.meta.env.LITE === 'true';
}

/**
 * 判断是否为标准生产模式
 * 仅在PROD=true且LITE=false时返回true
 */
export function isStandardProdMode(): boolean {
  return import.meta.env.PROD && !isLiteMode();
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
  return import.meta.env.PROD || isLiteMode();
}

/**
 * 获取当前环境信息
 */
export function getEnvironmentInfo(): {
  mode: string;
  isDev: boolean;
  isStandardProd: boolean;
  isLite: boolean;
} {
  return {
    mode: import.meta.env.MODE,
    isDev: isDevMode(),
    isStandardProd: isStandardProdMode(),
    isLite: isLiteMode()
  };
}