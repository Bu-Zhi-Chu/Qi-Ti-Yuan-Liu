/**
 * blob-storage.service.ts
 * Blob存储服务 - 用于持久化存储图片等二进制数据
 * 功能：
 * - 将图片文件转换为base64格式进行持久化存储
 * - 提供图片数据的存储和读取接口
 * - 管理图片数据的生命周期
 */

export interface BlobData {
  data: string; // base64格式的图片数据
  type: string; // MIME类型
  size: number; // 文件大小
  name?: string; // 文件名
}

export class BlobStorageService {
  /**
   * 将File对象转换为base64字符串
   */
  static async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  /**
   * 将base64字符串转换回Blob对象
   */
  static base64ToBlob(base64: string): Blob {
    const arr = base64.split(',')
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png'
    const bstr = atob(arr[1])
    let n = bstr.length
    const u8arr = new Uint8Array(n)
    
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n)
    }
    
    return new Blob([u8arr], { type: mime })
  }

  /**
   * 验证base64字符串格式
   */
  static isValidBase64(data: string): boolean {
    return /^data:image\/[a-zA-Z+]+;base64,/.test(data)
  }

  /**
   * 获取图片的MIME类型
   */
  static getImageType(base64: string): string {
    const match = base64.match(/^data:(image\/[a-zA-Z+]+);base64,/)
    return match ? match[1] : 'image/png'
  }

  /**
   * 压缩图片（可选功能）
   */
  static async compressImage(file: File, maxWidth: number = 1920, maxHeight: number = 1080, quality: number = 0.8): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        reject(new Error('Canvas context not available'))
        return
      }

      img.onload = () => {
        let { width, height } = img

        // 计算压缩比例
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width *= ratio
          height *= ratio
        }

        canvas.width = width
        canvas.height = height

        // 绘制压缩后的图片
        ctx.drawImage(img, 0, 0, width, height)

        // 转换为base64
        const compressedDataUrl = canvas.toDataURL(file.type, quality)
        resolve(compressedDataUrl)
      }

      img.onerror = reject
      img.src = URL.createObjectURL(file)
    })
  }
}