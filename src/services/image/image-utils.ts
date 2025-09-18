/**
 * 计算 Blob 的 SHA-1 哈希（40 位十六进制）。
 */
export async function hashBlob(blob: Blob, salt = ""): Promise<string> {
    const buffer = await blob.arrayBuffer()
    // 使用浏览器原生 Web Crypto API
    const saltBytes = new TextEncoder().encode(salt)
    const combined = new Uint8Array(saltBytes.length + buffer.byteLength)
    combined.set(saltBytes, 0)
    combined.set(new Uint8Array(buffer), saltBytes.length)
    const hashBuffer = await window.crypto.subtle.digest('SHA-1', combined)
    return Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
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

    // First, try to use jSquash WASM codecs for high-efficiency encoding
    try {
        let encodeFn: (img: ImageData, opts: any) => Promise<ArrayBuffer>
        if (fmt === 'avif') {
            const { default: encodeAvif, init: initAvif } = await import('@jsquash/avif/encode')
            await initAvif(undefined, {
                locateFile: () => avifWasmUrl
            })
            encodeFn = encodeAvif as typeof encodeAvif
        } else {
            const { default: encodeWebp, init: initWebp } = await import('@jsquash/webp/encode')
            // @ts-ignore
            const wasmUrl: string = (await import('@jsquash/webp/codec/enc/webp_enc.wasm?url')).default
            await initWebp({
                locateFile: () => webpWasmUrl
            })
            encodeFn = encodeWebp as typeof encodeWebp
        }

        // Draw onto canvas to obtain raw RGBA data for the encoder
        const bitmap = await createImageBitmap(blob)
        const canvasTmp = document.createElement('canvas')
        canvasTmp.width = bitmap.width
        canvasTmp.height = bitmap.height
        const ctxTmp = canvasTmp.getContext('2d')!
        ctxTmp.drawImage(bitmap, 0, 0)
        const imageData = ctxTmp.getImageData(0, 0, canvasTmp.width, canvasTmp.height)

        const arrBuf = await encodeFn(imageData, { quality: Math.round(quality * 100) })
        const outBlob = new Blob([arrBuf], { type: fmt === 'avif' ? 'image/avif' : 'image/webp' })
        console.info(`[convertTo] 原始大小: ${blob.size}B, 编码格式: ${fmt}, 编码后大小: ${outBlob.size}B`)
        if (outBlob.size < blob.size) {
            return outBlob
        }
        // fallthrough if not smaller
    } catch (e) {
        console.warn('jSquash encode failed, falling back to canvas method', e)
    }

    // --- Fallback: use browser native encoder via canvas.toBlob ---
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
                if (outBlob) {
                    console.info(`[convertTo] 原始大小: ${blob.size}B, canvas 转换格式: ${fmt}, 转换后大小: ${outBlob.size}B`)
                }
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
import avifWasmUrl from '@jsquash/avif/codec/enc/avif_enc.wasm?url'
import webpWasmUrl from '@jsquash/webp/codec/enc/webp_enc.wasm?url'