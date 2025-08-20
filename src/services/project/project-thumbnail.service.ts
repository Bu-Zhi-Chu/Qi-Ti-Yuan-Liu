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

export class ProjectThumbnailService {
  // 已创建默认缩略图的项目缓存，避免频繁重复写入
  private static defaultThumbnailCreated: Set<string> = new Set()

  /**
   * 将背景图片同步为项目缩略图
   * @param projectId 项目ID
   * @param backgroundImage 背景图片URL（仅支持blob URL）
   */
  static async syncBackgroundToThumbnail(projectId: string, backgroundImage: string): Promise<void> {
    if (!projectId || !backgroundImage) {
      console.warn('项目ID或背景图片为空，无法同步缩略图')
      return
    }

    try {
      // 提取 DataURL（Base64 字符串）
      let dataUrl = ''

      if (backgroundImage.startsWith('data:')) {
        dataUrl = backgroundImage
      } else if (backgroundImage.startsWith('url(')) {
        const urlMatch = backgroundImage.match(/url\(['"]?([^'"]+)['"]?\)/)
        dataUrl = urlMatch?.[1] || ''
        if (!dataUrl.startsWith('data:')) {
          console.warn('不支持的图片URL格式:', dataUrl)
          return
        }
      } else {
        console.warn('不支持的背景图片格式:', backgroundImage)
        return
      }

      // 更新项目缩略图（存储为Base64字符串）
      console.log(`【数据库交互】保存项目缩略图: 项目ID=${projectId}, DataURL长度=${dataUrl.length}字符`)
      const updateSuccess = await DexieService.updateRecord(
        'qi-qiao-ban',
        'projects',
        projectId,
        { thumbnail: dataUrl }
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
      console.log(`【数据库交互】获取项目缩略图: 项目ID=${projectId}`)
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

      // 转成Base64 DataURL 便于持久化
      const encoded = btoa(unescape(encodeURIComponent(svgContent)))
      const dataUrl = `data:image/svg+xml;base64,${encoded}`

      // 更新项目缩略图（存储为DataURL）
      const updateSuccess = await DexieService.updateRecord(
        'qi-qiao-ban',
        'projects',
        projectId,
        { thumbnail: dataUrl }
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