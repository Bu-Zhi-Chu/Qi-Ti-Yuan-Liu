import { getMockSettingsFromDomTree } from '../stores/dom-tree.store.svelte'

/**
 * 统一请求封装。
 * 当启用 Mirage 时，自动确保 Mock Server 启动并转换 URL。
 */
export async function request<T = any>(url: string, init?: RequestInit): Promise<T> {
    const { useMock, mockBase } = getMockSettingsFromDomTree()

    let finalUrl = url
    if (useMock) {
        // 动态导入，避免在未启用 Mock 时增加初始包体积
        const { ensureMirage } = await import('../mirage')
        await ensureMirage()

        // 将原始 URL 编码后拼接到 mockBase 之后
        finalUrl = `${mockBase}${encodeURIComponent(url)}`
    }

    const res = await fetch(finalUrl, init)

    if (!res.ok) {
        throw new Error(`Request failed: ${res.status} ${res.statusText}`)
    }

    // 这里假设返回 JSON，可按需扩展 text/blob 等
    return (await res.json()) as T
}