import { cachedFetch } from './cache/cached-fetch'

/**
 * 统一请求封装。
 * 使用带缓存的 fetch 实现。
 */
export function request<T = any>(url: string, init?: RequestInit): Promise<T> {
    return cachedFetch(url, init)
}