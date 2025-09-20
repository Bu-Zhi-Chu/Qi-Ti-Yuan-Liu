/**
 * @file 全局API相关类型定义
 */

/**
 * API响应的统一接口
 */
export interface ApiResponse<T = any> {
    /** 请求是否成功 */
    isSuccess: boolean
    /** 响应的核心数据 */
    result: T
    /** 数据是否来自缓存 */
    isCache: boolean
    /** 响应的时间戳 */
    timestamp: number
    /** 错误信息（如果请求失败） */
    error?: any
}