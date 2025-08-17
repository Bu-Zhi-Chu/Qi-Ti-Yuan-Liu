/**
 * image-blob.service.ts
 * 图片Blob存储服务
 * 功能：
 * - 将图片文件存储为Blob对象到IndexedDB
 * - 管理Blob引用和URL生命周期
 * - 提供Blob的增删改查功能
 * - 支持将Base64 Data URL转换为Blob存储
 */

import DexieService from '../database/dexie-service'

export interface ImageBlobData {
  blobId: string
  blob: Blob
  fileName: string
  fileType: string
  createdAt: number
}

export class ImageBlobService {
  private static readonly TABLE_NAME = 'imageBlobs'
  private static readonly DB_NAME = 'qi-qiao-ban'

  /**
   * 存储图片为Blob对象
   * @param file 图片文件
   * @returns 返回生成的blobId
   */
  static async storeImageBlob(file: File): Promise<string> {
    const blobId = this.generateBlobId()
    const blobData: ImageBlobData = {
      blobId,
      blob: file,
      fileName: file.name,
      fileType: file.type,
      createdAt: Date.now()
    }

    try {
      await DexieService.addRecord(this.DB_NAME, this.TABLE_NAME, blobData)
      return blobId
    } catch (error) {
      console.error('存储图片Blob失败:', error)
      throw new Error('存储图片Blob失败')
    }
  }

  /**
   * 获取Blob对象的URL
   * @param blobId Blob ID
   * @returns Blob URL，如果不存在则返回null
   */
  static async getImageBlobUrl(blobId: string): Promise<string | null> {
    try {
      const blobData = await DexieService.getRecord<ImageBlobData>(this.DB_NAME, this.TABLE_NAME, blobId)
      
      if (!blobData) {
        return null
      }

      return URL.createObjectURL(blobData.blob)
    } catch (error) {
      console.error('获取Blob URL失败:', error)
      return null
    }
  }

  /**
   * 移除Blob对象
   * @param blobId Blob ID
   */
  static async removeImageBlob(blobId: string): Promise<void> {
    try {
      const blobData = await DexieService.getRecord<ImageBlobData>(this.DB_NAME, this.TABLE_NAME, blobId)
      if (blobData) {
        // 创建临时URL并立即释放，确保内存清理
        const url = URL.createObjectURL(blobData.blob)
        URL.revokeObjectURL(url)
      }

      await DexieService.deleteRecord(this.DB_NAME, this.TABLE_NAME, blobId)
    } catch (error) {
      console.error('移除Blob失败:', error)
    }
  }

  /**
   * 获取Blob元数据
   * @param blobId Blob ID
   */
  static async getImageBlobMetadata(blobId: string): Promise<Omit<ImageBlobData, 'blob'> | null> {
    try {
      const blobData = await DexieService.getRecord<ImageBlobData>(this.DB_NAME, this.TABLE_NAME, blobId)
      
      if (!blobData) {
        return null
      }

      const { blob, ...metadata } = blobData
      return metadata
    } catch (error) {
      console.error('获取Blob元数据失败:', error)
      return null
    }
  }

  /**
   * 清理过期的Blob对象（可选功能）
   * @param maxAge 最大存活时间（毫秒），默认7天
   */
  static async cleanupExpiredBlobs(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    try {
      // 获取所有记录并手动过滤
      const allBlobs = await DexieService.queryRecords<ImageBlobData>(this.DB_NAME, this.TABLE_NAME)
      const cutoffTime = Date.now() - maxAge
      
      const expiredBlobs = allBlobs.filter((blob: ImageBlobData) => blob.createdAt < cutoffTime)

      for (const blobData of expiredBlobs) {
        await this.removeImageBlob(blobData.blobId)
      }
    } catch (error) {
      console.error('清理过期Blob失败:', error)
    }
  }

  /**
   * 生成唯一的Blob ID
   */
  private static generateBlobId(): string {
    return `blob_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 将Base64 Data URL转换为Blob并存储
   * @param dataUrl Base64 Data URL
   * @param fileName 文件名
   * @returns 返回生成的blobId
   */
  static async convertDataUrlToBlob(dataUrl: string, fileName: string = 'image.png'): Promise<string> {
    try {
      // 解析Data URL
      const arr = dataUrl.split(',')
      const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png'
      const bstr = atob(arr[1])
      let n = bstr.length
      const u8arr = new Uint8Array(n)
      
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n)
      }

      const blob = new Blob([u8arr], { type: mime })
      const file = new File([blob], fileName, { type: mime })
      
      return await this.storeImageBlob(file)
    } catch (error) {
      console.error('转换Data URL到Blob失败:', error)
      throw new Error('转换Data URL到Blob失败')
    }
  }
}