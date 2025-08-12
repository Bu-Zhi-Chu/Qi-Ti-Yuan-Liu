/**
 * get-scale-ratio.util.ts
 * -------------------------------------------------------------
 * 获取当前全局视口缩放比例（--scale-ratio CSS 变量）。
 * 该工具提供统一读取接口，便于在各业务模块/Action中复用，
 * 避免重复解析 CSS 变量或直接耦合 DOM。
 * -------------------------------------------------------------
 */

/**
 * 读取全局 --scale-ratio 变量，若未设置则返回 1。
 */
export function getScaleRatio(): number {
    return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--scale-ratio') || '1') || 1
}