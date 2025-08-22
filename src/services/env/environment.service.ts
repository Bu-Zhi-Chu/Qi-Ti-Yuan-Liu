/**
 * 环境判断工具服务
 * - LITE=true: 生产精简模式
 * - import.meta.env.PROD: 标准生产模式
 * - import.meta.env.DEV: 开发模式
 *
 * 环境变量说明：
 * - LITE=true: 精简生产模式（独立的构建模式）
 * - import.meta.env.PROD: 标准生产模式
 * - import.meta.env.DEV: 开发模式
 * 这三种模式是互斥的，不会同时存在
 */

/**
 * 判断是否为精简模式
 * 当LITE=true时返回true（精简生产模式）
 */
export function isLiteMode(): boolean {
  return import.meta.env.LITE === 'true';
}

/**
 * 判断是否为标准生产模式
 * 仅在import.meta.env.PROD=true且LITE=false时返回true
 */
export function isStandardProdMode(): boolean {
  return import.meta.env.PROD === true && !isLiteMode();
}

/**
 * 判断是否为开发模式
 */
export function isDevMode(): boolean {
  return import.meta.env.DEV === true;
}

/**
 * 判断是否为生产模式（标准生产或精简生产）
 * 当不是开发模式时即为生产模式
 */
export function isProdMode(): boolean {
  return !isDevMode();
}

/**
 * 获取当前环境信息
 */
export function getEnvironmentInfo(): {
  mode: string;
  isDev: boolean;
  isStandardProd: boolean;
  isLite: boolean;
  isProd: boolean;
} {
  return {
    mode: import.meta.env.MODE,
    isDev: isDevMode(),
    isStandardProd: isStandardProdMode(),
    isLite: isLiteMode(),
    isProd: isProdMode()
  };
}