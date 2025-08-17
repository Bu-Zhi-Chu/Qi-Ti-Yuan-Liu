/**
 * project-thumbnail.service.ts
 * 项目缩略图同步服务
 *
 * 功能：
 * - 将画布背景图片同步为项目缩略图
 * - 支持Blob数据存储
 * - 自动更新项目预览图
 *
 * 使用方法：
 * import { ProjectThumbnailService } from '../services/project/project-thumbnail.service'
 * await ProjectThumbnailService.syncBackgroundToThumbnail(projectId, backgroundImage)
 */

import DexieService from '../database/dexie-service'
import { BlobStorageService } from '../storage/blob-storage.service'

export class ProjectThumbnailService {
  /**
   * 将背景图片同步为项目缩略图
   * @param projectId 项目ID
   * @param backgroundImage 背景图片URL（可以是base64或blob URL）
   */
  static async syncBackgroundToThumbnail(projectId: string, backgroundImage: string): Promise<void> {
    if (!projectId || !backgroundImage) {
      console.warn('项目ID或背景图片为空，无法同步缩略图')
      return
    }

    try {
      let blobData: Blob

      // 处理不同类型的图片URL
      if (backgroundImage.startsWith('data:image')) {
        // 将base64转换为Blob
        blobData = this.base64ToBlob(backgroundImage)
      } else if (backgroundImage.startsWith('url(')) {
        // 从CSS url()中提取URL
        const urlMatch = backgroundImage.match(/url\(['"]?([^'"]+)['"]?\)/)
        const imageUrl = urlMatch?.[1] || ''

        if (imageUrl.startsWith('data:image')) {
          blobData = this.base64ToBlob(imageUrl)
        } else if (imageUrl.startsWith('blob:')) {
          // 将blob URL转换为Blob
          const response = await fetch(imageUrl)
          blobData = await response.blob()
        } else {
          console.warn('不支持的图片URL格式:', imageUrl)
          return
        }
      } else if (backgroundImage.startsWith('blob:')) {
        // 直接处理blob URL
        const response = await fetch(backgroundImage)
        blobData = await response.blob()
      } else {
        console.warn('不支持的背景图片格式:', backgroundImage)
        return
      }

      // 更新项目缩略图（存储为Blob）
      const updateSuccess = await DexieService.updateRecord(
        'qi-qiao-ban',
        'projects',
        projectId,
        { thumbnail: blobData }
      )

      if (updateSuccess) {
        console.log('项目缩略图已更新为Blob:', projectId)
      } else {
        console.warn('更新项目缩略图失败:', projectId)
      }
    } catch (error) {
      console.error('同步项目缩略图失败:', error)
    }
  }

  /**
   * 将base64字符串转换为Blob对象
   * @param base64 base64字符串
   * @returns Blob对象
   */
  private static base64ToBlob(base64: string): Blob {
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
   * 从项目数据中获取背景图片
   * @param domTreeData DOM树数据
   * @returns 背景图片URL或空字符串
   */
  static extractBackgroundFromRoot(domTreeData: any): string {
    if (!domTreeData || !domTreeData.styles) {
      return ''
    }

    return domTreeData.styles.backgroundImage || ''
  }

  /**
   * 自动生成项目缩略图（从根节点背景）
   * @param projectId 项目ID
   */
  static async autoGenerateThumbnail(projectId: string): Promise<void> {
    try {
      // 获取项目数据
      const project = await DexieService.getRecord<any>('qi-qiao-ban', 'projects', projectId)
      if (!project || !project.data) {
        console.warn('项目数据为空，无法生成缩略图')
        return
      }

      // 从项目数据中提取背景图片
      const backgroundImage = this.extractBackgroundFromRoot(project.data)
      if (backgroundImage) {
        await this.syncBackgroundToThumbnail(projectId, backgroundImage)
      }
    } catch (error) {
      console.error('自动生成项目缩略图失败:', error)
    }
  }

  /**
   * 创建默认项目缩略图
   * @param projectId 项目ID
   * @param backgroundColor 背景颜色（可选）
   */
  static async createDefaultThumbnail(projectId: string, backgroundColor?: string): Promise<void> {
    if (!projectId) {
      console.warn('项目ID为空，无法创建默认缩略图')
      return
    }

    try {
      const color = backgroundColor || '#ffffff'
      const svgContent = `
        <svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#f3f4f6;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#e5e7eb;stop-opacity:1" />
            </linearGradient>
          </defs>
          <rect width="300" height="200" fill="url(#grad)"/>
          <text x="150" y="100" text-anchor="middle" dominant-baseline="middle"
                font-family="Arial, sans-serif" font-size="16" fill="#6b7280">
            新建项目
          </text>
        </svg>
      `.trim()

      // 将SVG转换为Blob
      const blobData = new Blob([svgContent], { type: 'image/svg+xml' })

      // 更新项目缩略图（存储为Blob）
      const updateSuccess = await DexieService.updateRecord(
        'qi-qiao-ban',
        'projects',
        projectId,
        { thumbnail: blobData }
      )

      if (updateSuccess) {
        console.log('默认项目缩略图已创建为Blob:', projectId)
      } else {
        console.warn('创建默认项目缩略图失败:', projectId)
      }
    } catch (error) {
      console.error('创建默认项目缩略图失败:', error)
    }
  }
}