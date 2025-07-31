/**
 * 响应式样式工具
 * 提供简洁的API来管理响应式样式，避免重复的calc计算
 *
 * 使用方法：
 * import { createResponsiveStyle } from '@/services/utils/responsive-style';
 *
 * const style = createResponsiveStyle({
 *   width: 100,
 *   height: 100,
 *   fontSize: 16
 * });
 *
 * <!-- 在组件中使用 -->
 * <div style:width="{style.width}" style:height="{style.height}">内容</div>
 */

import { onMount } from 'svelte'

export interface ResponsiveStyleOptions {
    width?: number
    height?: number
    fontSize?: number
    padding?: number
    margin?: number
    top?: number
    left?: number
    right?: number
    bottom?: number
    borderRadius?: number
    borderWidth?: number
    [key: string]: number | undefined
}

export interface ResponsiveStyle {
    scaleRatio: number
    getStyleValue: (value: number) => string
    styles: Record<string, string>
}

/**
 * 创建响应式样式
 * @param baseValues 基础样式值（设计稿尺寸）
 * @returns 响应式样式对象
 */
export function createResponsiveStyle(baseValues: ResponsiveStyleOptions = {}): ResponsiveStyle {
    let scaleRatio = 1

    onMount(() => {
        const updateScale = () => {
            scaleRatio = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--scale-ratio')) || 1
        }

        updateScale()
        window.addEventListener('resize', updateScale)

        return () => window.removeEventListener('resize', updateScale)
    })

    const getStyleValue = (value: number): string => `${value * scaleRatio}px`

    const styles = Object.fromEntries(
        Object.entries(baseValues).map(([key, value]) => [
            key.replace(/([A-Z])/g, '-$1').toLowerCase(), // 转换为CSS属性名
            value ? getStyleValue(value) : '0px'
        ])
    )

    return {
        scaleRatio,
        getStyleValue,
        styles
    }
}

/**
 * 快速获取单个响应式值
 * @param value 基础值
 * @returns 计算后的响应式值字符串
 */
export function getResponsiveValue(value: number): string {
    const scaleRatio = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--scale-ratio')) || 1
    return `${value * scaleRatio}px`
}

/**
 * 批量获取响应式值
 * @param values 基础值对象
 * @returns 计算后的响应式值对象
 */
export function getResponsiveValues(values: ResponsiveStyleOptions): Record<string, string> {
    const scaleRatio = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--scale-ratio')) || 1

    return Object.fromEntries(Object.entries(values).map(([key, value]) => [key.replace(/([A-Z])/g, '-$1').toLowerCase(), value ? `${value * scaleRatio}px` : '0px']))
}
