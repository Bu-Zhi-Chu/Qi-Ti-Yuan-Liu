import { cachedFetch } from '../../services/cache/cached-fetch'
import type { ApiResponse } from '../../types/api.types'

/**
 * 一个可复用的Svelte 5组合式函数（runes），用于处理缓存数据获取的通用逻辑。
 *
 * @param requestPath - 要获取数据的API路径。这是一个响应式状态，当它改变时会自动重新获取数据。
 * @returns 返回一个包含响应式数据、加载状态和错误信息的对象。
 */
export function useCachedFetch(requestPath: () => string | null | undefined) {
    let data = $state<ApiResponse | null>(null)
    let isLoading = $state(false)
    let error = $state<any>(null)

    $effect(() => {
        const path = requestPath()
        if (!path) {
            data = null
            return
        }

        let isActive = true
        async function fetchData() {
            if (!path) return

            isLoading = true
            error = null

            try {
                const initialData = await cachedFetch(path, {},
                    {
                        onUpdate: (updatedData) => {
                            if (isActive && JSON.stringify(updatedData) !== JSON.stringify(initialData)) {
                                console.log('[useCachedFetch] 数据已更新, 触发UI刷新')
                                data = updatedData
                            }
                        }
                    }
                )
                if (isActive) {
                    data = initialData
                }
            } catch (e) {
                if (isActive) {
                    console.error('[useCachedFetch] 数据请求失败:', e)
                    error = e
                    data = null
                }
            } finally {
                if (isActive) {
                    isLoading = false
                }
            }
        }

        fetchData()

        return () => {
            isActive = false
        }
    })

    return {
        get data() { return data },
        get isLoading() { return isLoading },
        get error() { return error },
    }
}