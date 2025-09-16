// 图片上传处理工具函数，聚合 WebP 转换 + 图片尺寸读取
// 仅处理逻辑，不涉及任何 UI 代码

import { convertTo } from './image-utils'

export async function getImageSize(blob: Blob): Promise<{ width: number; height: number }> {
    return new Promise<{ width: number; height: number }>((resolve, reject) => {
        const img = new Image()
        const objUrl = URL.createObjectURL(blob)
        img.onload = () => {
            URL.revokeObjectURL(objUrl)
            resolve({ width: img.naturalWidth, height: img.naturalHeight })
        }
        img.onerror = (e) => {
            URL.revokeObjectURL(objUrl)
            reject(e)
        }
        img.src = objUrl
    })
}

/**
 * 统一处理图片上传逻辑：
 * 1. 校验 WebP 是否更优；
 * 2. 返回最终 Blob 及其原始尺寸。
 */
export async function processImageUpload(file: File, quality = 0.85): Promise<{ blob: Blob; imageSize: { width: number; height: number } | null }> {
    let finalBlob: Blob = file
    try {
        const webpBlob = await convertTo(file, 'webp', quality)
        if (webpBlob.size < file.size) {
            finalBlob = webpBlob
        }
    } catch (e) {
        console.warn('WebP 转换失败，使用原始文件', e)
    }

    try {
        const size = await getImageSize(finalBlob)
        return { blob: finalBlob, imageSize: size }
    } catch (e) {
        console.warn('获取图片尺寸失败', e)
        return { blob: finalBlob, imageSize: null }
    }
}