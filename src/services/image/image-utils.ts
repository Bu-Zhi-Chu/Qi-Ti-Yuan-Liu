/**
 * 计算 Blob 的 SHA-1 哈希（40 位十六进制）。
 */
export async function hashBlob(blob: Blob): Promise<string> {
    const buffer = await blob.arrayBuffer()
    // Web Crypto API 在浏览器侧使用 SubtleCrypto，Node 环境回退至 crypto 包
    if (typeof crypto !== 'undefined' && crypto.subtle) {
        const hashBuffer = await crypto.subtle.digest('SHA-1', buffer)
        return Array.from(new Uint8Array(hashBuffer))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('')
    }
    // Node 环境（例如 SSR 或单测）
    const { createHash } = await import('crypto')
    return createHash('sha1').update(Buffer.from(buffer)).digest('hex')
}

/**
 * 判断浏览器是否支持指定 mimeType 的解码能力（Chrome ≥85 支持 canDecode）。
 */
export async function canDecode(mimeType: string): Promise<boolean> {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (typeof ImageDecoder !== 'undefined' && ImageDecoder.isTypeSupported) {
        // 新版 API
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        return ImageDecoder.isTypeSupported(mimeType)
    }
    // 兼容方案：创建 Image 元素尝试加载 1×1 DataURL
    return new Promise<boolean>((resolve) => {
        const img = new Image()
        img.onload = () => resolve(true)
        img.onerror = () => resolve(false)
        img.src = `data:${mimeType};base64,AAAA` // 无效数据，仅用于触发
    })
}

/**
 * 将图片 Blob 转换为指定格式（avif/webp）。若转换失败则回退原 Blob。
 * @param blob     原始图片 Blob
 * @param fmt      目标格式 avif | webp | null
 * @param quality  质量，默认 0.85
 */
export async function convertTo(blob: Blob, fmt: 'avif' | 'webp' | null, quality = 0.85): Promise<Blob> {
    if (!fmt) return blob

    const bitmap = await createImageBitmap(blob)
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return blob

    ctx.drawImage(bitmap, 0, 0)

    const mime = fmt === 'avif' ? 'image/avif' : 'image/webp'

    return new Promise<Blob>((resolve) => {
        canvas.toBlob(
            (outBlob) => {
                if (outBlob && outBlob.size < blob.size) {
                    resolve(outBlob)
                } else {
                    resolve(blob)
                }
            },
            mime,
            quality
        )
    })
}