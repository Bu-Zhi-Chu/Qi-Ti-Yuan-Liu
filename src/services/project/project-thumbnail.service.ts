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

interface DomNode {
  projectId: string
  id: string
  parentId?: string
  type: string
  attributes?: Record<string, any>
  style?: Record<string, any>
  textContent?: string
}

export class ProjectThumbnailService {
  // 已创建默认缩略图的项目缓存，避免频繁重复写入
  private static defaultThumbnailCreated: Set<string> = new Set()

  /**
   * 将背景图片同步为项目缩略图
   * @param projectId 项目ID
   * @param backgroundImage 背景图片（可以是 Blob 或 URL 字符串）
   */
  static async syncBackgroundToThumbnail(projectId: string, backgroundImage: string | Blob): Promise<void> {
    if (!projectId || !backgroundImage) {
      console.warn('项目ID或背景图片为空，无法同步缩略图')
      return
    }

    try {
      let thumbnailBlob: Blob

      // 处理不同类型的背景图片
      if (backgroundImage instanceof Blob) {
        // 如果已经是 Blob，直接使用
        thumbnailBlob = backgroundImage
      } else if (typeof backgroundImage === 'string') {
        if (backgroundImage.startsWith('data:')) {
          // DataURL 转换为 Blob
          thumbnailBlob = await this.dataURLToBlob(backgroundImage)
        } else if (backgroundImage.startsWith('url(')) {
          const urlMatch = backgroundImage.match(/url\(['"]?([^'"]+)['"]?\)/)
          const url = urlMatch?.[1] || ''
          if (url.startsWith('data:')) {
            thumbnailBlob = await this.dataURLToBlob(url)
          } else if (url.startsWith('blob:')) {
            // blob URL 转换为 Blob
            const response = await fetch(url)
            thumbnailBlob = await response.blob()
          } else {
            console.warn('不支持的图片URL格式:', url)
            return
          }
        } else {
          console.warn('不支持的背景图片格式:', backgroundImage)
          return
        }
      } else {
        console.warn('不支持的背景图片类型:', typeof backgroundImage)
        return
      }

      // 更新项目缩略图（存储为 Blob）
      console.log(`【数据库交互】保存项目缩略图: 项目ID=${projectId}, Blob大小=${thumbnailBlob.size}字节`)
      const updateSuccess = await DexieService.updateRecord(
        'qi-qiao-ban',
        'projects',
        projectId,
        { thumbnail: thumbnailBlob }
      )

      if (updateSuccess) {
        console.log('项目缩略图已更新为Blob:', projectId)
        // 背景图同步后，移除默认缩略图标记，允许后续再次创建默认缩略图
        ProjectThumbnailService.defaultThumbnailCreated.delete(projectId)
      } else {
        console.warn('更新项目缩略图失败:', projectId)
      }
    } catch (error) {
      console.error('同步项目缩略图失败:', error)
    }
  }



  /**
   * 自动生成项目缩略图（从根节点背景）
   * @param projectId 项目ID
   */
  static async autoGenerateThumbnail(projectId: string): Promise<void> {
    try {
      // 从doms表获取根节点数据
      console.log(`【数据库交互】获取项目缩略图: 项目ID=${projectId}`)
      const rootNodes = await DexieService.queryRecords('qi-qiao-ban', 'doms')
      const rootNode = (rootNodes as DomNode[]).find((node) => node.projectId === projectId && node.id === 'root')

      if (!rootNode) {
        console.warn('根节点数据为空，无法生成缩略图')
        return
      }

      // 从根节点样式中提取背景图片
      const backgroundImage = rootNode.style?.backgroundImage || ''
      if (backgroundImage) {
        await this.syncBackgroundToThumbnail(projectId, backgroundImage)
      }
    } catch (error) {
      console.error('自动生成项目缩略图失败:', error)
    }
  }

  /**
   * 将 DataURL 转换为 Blob
   * @param dataURL DataURL 字符串
   * @returns Blob 对象
   */
  private static async dataURLToBlob(dataURL: string): Promise<Blob> {
    const arr = dataURL.split(',')
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
   * 创建默认项目缩略图
   * @param projectId 项目ID
   * @param backgroundColor 背景颜色（可选）
   */
  static async createDefaultThumbnail(projectId: string, backgroundColor?: string): Promise<void> {
    if (!projectId) {
      console.warn('项目ID为空，无法创建默认缩略图')
      return
    }

    // 如果已为该项目创建过默认缩略图，则直接返回，避免重复写入
    if (ProjectThumbnailService.defaultThumbnailCreated.has(projectId)) {
      return
    }

    try {
      // 若项目已存在缩略图（例如之前同步过背景图），无需再生成默认缩略图
      const existing = await DexieService.getRecord<any>('qi-qiao-ban', 'projects', projectId)
      if (existing?.thumbnail) {
        return
      }

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
      const svgBlob = new Blob([svgContent], { type: 'image/svg+xml' })

      // 更新项目缩略图（存储为Blob）
      const updateSuccess = await DexieService.updateRecord(
        'qi-qiao-ban',
        'projects',
        projectId,
        { thumbnail: svgBlob }
      )

      if (updateSuccess) {
        console.log('默认项目缩略图已创建为Blob:', projectId)
        ProjectThumbnailService.defaultThumbnailCreated.add(projectId)
      } else {
        console.warn('创建默认项目缩略图失败:', projectId)
      }
    } catch (error) {
      console.error('创建默认项目缩略图失败:', error)
    }
  }
}