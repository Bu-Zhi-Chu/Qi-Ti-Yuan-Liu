import { writable, type Writable } from 'svelte/store'
import { onDestroy } from 'svelte'
import { registerBlobUrl } from './blob-url-manager'

/**
 * useBlobUrl - 为组件提供统一的 Blob → ObjectURL 生命周期管理
 *
 * 使用方式：
 * ```svelte
 * const urlStore = useBlobUrl(blobOrString)
 * $: url = $urlStore
 * ```
 *
 * 当传入 Blob 时，自动调用 URL.createObjectURL 并通过 registerBlobUrl 记录。
 * 切换源或组件卸载时会自动 revoke 旧 URL，避免泄漏。
 */
export function useBlobUrl(source: Blob | string | null | undefined): Writable<string | null> {
    const url: Writable<string | null> = writable(null)

    let currentObjectUrl: string | null = null

    function revokeCurrent() {
        if (currentObjectUrl) {
            URL.revokeObjectURL(currentObjectUrl)
            currentObjectUrl = null
        }
    }

    function update(src: typeof source) {
        revokeCurrent()
        if (src instanceof Blob) {
            const objUrl = URL.createObjectURL(src)
            currentObjectUrl = objUrl
            registerBlobUrl(objUrl)
            url.set(objUrl)
        } else if (typeof src === 'string') {
            url.set(src || null)
        } else {
            url.set(null)
        }
    }

    // 立即初始化
    update(source)

    // 提供外部手动更新的函数
    ;(url as any).updateSource = (newSrc: typeof source) => update(newSrc)

    // 组件卸载清理
    onDestroy(() => {
        revokeCurrent()
    })

    return url
}