import { cachedFetch } from './cache/cached-fetch'

/**
 * 统一请求封装。
 * 直接发起真实网络请求。
 */
// 移除 Mirage 相关逻辑，直接发起真实网络请求
export async function request<T = any>(url: string, init?: RequestInit): Promise<T> {
    const res = await cachedFetch(url, init)

    if (!res.ok) {
        throw new Error(`Request failed: ${res.status} ${res.statusText}`)
    }

    return (await res.json()) as T
}