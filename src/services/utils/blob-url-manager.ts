/**
 * 全局 Blob URL 管理器：统一注册与释放 Object URL
 */

const blobUrlSet = new Set<string>()

/** 注册新创建的 Blob URL */
export function registerBlobUrl(url: string): void {
    blobUrlSet.add(url)
}

/**
 * 释放已注册的 Blob URL
 * @param urls 可选，需要释放的 URL 集合；不传则全部释放
 */
export function cleanupBlobUrls(urls?: Iterable<string>): void {
    if (urls) {
        for (const url of urls) {
            if (blobUrlSet.has(url)) {
                URL.revokeObjectURL(url)
                blobUrlSet.delete(url)
            }
        }
    } else {
        for (const url of blobUrlSet) {
            URL.revokeObjectURL(url)
        }
        blobUrlSet.clear()
    }
}

/** 释放并清空全部已注册的 Blob URL（向后兼容别名） */
export const cleanupAllBlobUrls = cleanupBlobUrls;

export default {
    registerBlobUrl,
    cleanupBlobUrls
}