import { writable, type Writable } from 'svelte/store'
import { LQIP_QUALITY } from '../../config/config'

interface LqipOptions {
    /** 生成缩略图的最大边尺寸，默认 20px */
    size?: number
    /** toDataURL 输出的图片质量，0-1，默认使用全局配置 */
    quality?: number
}

/**
 * useLQIP - 低分辨率占位图生成钩子
 * @param source File | Blob | string | null
 * @param options 可选配置
 * @returns 可订阅的 dataURL 字符串（可能为 null，异步更新）
 */
export function useLQIP(
    source: File | Blob | string | null | undefined,
    options: LqipOptions = {}
): Writable<string | null> {
    const { size = 20, quality = LQIP_QUALITY } = options
    const lqipStore: Writable<string | null> = writable(null)

    /** Blob → DataURL */
    async function blobToDataURL(blob: Blob): Promise<string> {
        return await new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onloadend = () => {
                if (typeof reader.result === 'string') resolve(reader.result)
                else reject(new Error('readAsDataURL failed'))
            }
            reader.onerror = reject
            reader.readAsDataURL(blob)
        })
    }

    /** 生成缩略图并返回 DataURL */
    async function generateLQIP(blob: Blob): Promise<string | null> {
        try {
            const bitmap = await createImageBitmap(blob)
            const { width, height } = bitmap
            const scale = width > height ? size / width : size / height
            const targetW = Math.round(width * scale)
            const targetH = Math.round(height * scale)

            const canvas = new OffscreenCanvas(targetW, targetH)
            const ctx = canvas.getContext('2d')!
            ctx.drawImage(bitmap, 0, 0, targetW, targetH)
            const blobSmall = await canvas.convertToBlob({ type: 'image/jpeg', quality })
            const dataUrl = await blobToDataURL(blobSmall)
            return dataUrl
        } catch (err) {
            console.error('[useLQIP] 生成占位图失败', err)
            return null
        }
    }

    // DataURL 无需 revoke，保留空函数占位
    function revoke() { }

    async function update(src: typeof source) {
        revoke()
        if (src && typeof src !== 'string') {
            const durl = await generateLQIP(src as Blob)
            lqipStore.set(durl)
        } else if (typeof src === 'string') {
            lqipStore.set(src || null)
        } else {
            lqipStore.set(null)
        }
    }

    // 初始化
    update(source)

        ; (lqipStore as any).updateSource = (s: typeof source) => update(s)



    return lqipStore
}