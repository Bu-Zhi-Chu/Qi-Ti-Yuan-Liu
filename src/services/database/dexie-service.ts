/**
 * Dexie.js 数据库服务类
 * 提供完整的数据库管理功能：创建/销毁、表管理、数据增删改查
 *
 * 使用说明：
 * 1. 导入：import { DexieService } from '../services/database/dexie-service';
 * 2. 初始化：await DexieService.init();
 * 3. 使用：const projects = await DexieService.getProjects();
 *
 * @author 拖拽平台开发团队
 * @version 1.0.0
 * @since 2025-07-01
 */

import Dexie, { type EntityTable } from 'dexie'

// 数据类型定义
export interface Project {
    id?: number
    name: string
    description: string
    thumbnail?: string
    pages: Page[]
    settings: Record<string, any>
    createdAt: Date
    updatedAt: Date
    version: string
    isArchived?: boolean
}

export interface Page {
    id: string
    name: string
    width: number
    height: number
    background: string
    components: DragComponent[]
    meta: Record<string, any>
}

export interface DragComponent {
    id?: number
    type: string
    x: number
    y: number
    width: number
    height: number
    styles: Record<string, any>
    props: Record<string, any>
    events: Record<string, string>
    pageId: string
    parentId?: string
    zIndex: number
    isLocked?: boolean
    createdAt: Date
    updatedAt: Date
}

export interface HistoryRecord {
    id?: number
    projectId: number
    action: string
    data: any
    timestamp: Date
    userId?: string
}

// 数据库类定义
class DragDropDatabase extends Dexie {
    projects!: EntityTable<Project, 'id'>
    components!: EntityTable<DragComponent, 'id'>
    history!: EntityTable<HistoryRecord, 'id'>

    constructor() {
        super('drag-drop-platform-v1')

        this.version(1).stores({
            projects: '++id, name, &name, createdAt, updatedAt, version, isArchived',
            components: '++id, type, pageId, parentId, [type+pageId], [x+y], zIndex, isLocked, createdAt, updatedAt',
            history: '++id, projectId, action, timestamp'
        })
    }
}

/**
 * Dexie.js 数据库服务类
 * 提供完整的数据库操作封装
 */
export class DexieService {
    private static db: DragDropDatabase
    private static isInitialized = false

    /**
     * 初始化数据库
     * @returns Promise<void>
     */
    static async init(): Promise<void> {
        if (this.isInitialized) return

        try {
            this.db = new DragDropDatabase()
            await this.db.open()
            this.isInitialized = true
            console.log('✅ 数据库初始化成功')
        } catch (error) {
            console.error('❌ 数据库初始化失败:', error)
            throw new Error(`数据库初始化失败: ${(error as Error).message}`)
        }
    }

    /**
     * 检查数据库是否已初始化
     * @returns boolean
     */
    static isReady(): boolean {
        return this.isInitialized
    }

    /**
     * 销毁数据库（完全删除）
     * @returns Promise<void>
     */
    static async destroy(): Promise<void> {
        if (!this.isInitialized) return

        try {
            await this.db.delete()
            this.isInitialized = false
            console.log('🗑️ 数据库已销毁')
        } catch (error) {
            console.error('❌ 销毁数据库失败:', error)
            throw new Error(`销毁数据库失败: ${(error as Error).message}`)
        }
    }

    /**
     * 重置数据库（删除后重新创建）
     * @returns Promise<void>
     */
    static async reset(): Promise<void> {
        await this.destroy()
        await this.init()
        console.log('🔄 数据库已重置')
    }

    /**
     * 获取数据库实例
     * @returns Dexie 数据库实例
     */
    static getDatabase(): DragDropDatabase {
        if (!this.isInitialized) {
            throw new Error('数据库未初始化，请先调用 DexieService.init()')
        }
        return this.db
    }

    // ==================== 项目管理 ====================

    /**
     * 创建新项目
     * @param projectData 项目数据
     * @returns 项目ID
     */
    static async createProject(projectData: Omit<Project, 'id'>): Promise<number> {
        this.ensureInitialized()

        const project = {
            ...projectData,
            createdAt: new Date(),
            updatedAt: new Date(),
            version: '1.0.0',
            isArchived: false
        }

        return await this.db.projects.add(project)
    }

    /**
     * 获取所有项目
     * @returns 项目列表
     */
    static async getProjects(): Promise<Project[]> {
        this.ensureInitialized()
        return await this.db.projects.orderBy('updatedAt').reverse().toArray()
    }

    /**
     * 根据ID获取项目
     * @param id 项目ID
     * @returns 项目数据或undefined
     */
    static async getProject(id: number): Promise<Project | undefined> {
        this.ensureInitialized()
        return await this.db.projects.get(id)
    }

    /**
     * 更新项目
     * @param id 项目ID
     * @param updates 更新数据
     * @returns 更新是否成功
     */
    static async updateProject(id: number, updates: Partial<Omit<Project, 'id'>>): Promise<boolean> {
        this.ensureInitialized()

        const result = await this.db.projects.update(id, {
            ...updates,
            updatedAt: new Date()
        })
        return result > 0
    }

    /**
     * 删除项目（级联删除相关组件和历史记录）
     * @param id 项目ID
     * @returns 删除是否成功
     */
    static async deleteProject(id: number): Promise<boolean> {
        this.ensureInitialized()

        await this.db.transaction('rw', [this.db.projects, this.db.components, this.db.history], async () => {
            // 删除相关组件
            await this.db.components.where('pageId').startsWith(`project-${id}-`).delete()

            // 删除历史记录
            await this.db.history.where('projectId').equals(id).delete()

            // 删除项目
            await this.db.projects.delete(id)
        })
        return true
    }

    /**
     * 分页查询项目
     * @param page 页码（从1开始）
     * @param limit 每页数量
     * @returns 分页结果
     */
    static async getProjectsPaginated(page: number = 1, limit: number = 10): Promise<{ projects: Project[]; total: number; totalPages: number }> {
        this.ensureInitialized()

        const offset = (page - 1) * limit
        const [projects, total] = await Promise.all([this.db.projects.orderBy('updatedAt').reverse().offset(offset).limit(limit).toArray(), this.db.projects.count()])

        return {
            projects,
            total,
            totalPages: Math.ceil(total / limit)
        }
    }

    // ==================== 组件管理 ====================

    /**
     * 创建组件
     * @param componentData 组件数据
     * @returns 组件ID
     */
    static async createComponent(componentData: Omit<DragComponent, 'id'>): Promise<number> {
        this.ensureInitialized()

        const component = {
            ...componentData,
            createdAt: new Date(),
            updatedAt: new Date(),
            isLocked: false
        }

        return await this.db.components.add(component)
    }

    /**
     * 批量创建组件
     * @param components 组件数据数组
     * @returns 组件ID数组
     */
    static async createComponents(components: Omit<DragComponent, 'id'>[]): Promise<number[]> {
        this.ensureInitialized()

        const componentsWithTimestamps = components.map((comp) => ({
            ...comp,
            createdAt: new Date(),
            updatedAt: new Date(),
            isLocked: false
        }))

        return await this.db.components.bulkAdd(componentsWithTimestamps)
    }

    /**
     * 获取指定页面的所有组件
     * @param pageId 页面ID
     * @returns 组件列表
     */
    static async getComponentsByPage(pageId: string): Promise<DragComponent[]> {
        this.ensureInitialized()
        return await this.db.components.where('pageId').equals(pageId).sortBy('zIndex')
    }

    /**
     * 获取指定类型的组件
     * @param type 组件类型
     * @returns 组件列表
     */
    static async getComponentsByType(type: string): Promise<DragComponent[]> {
        this.ensureInitialized()
        return await this.db.components.where('type').equals(type).toArray()
    }

    /**
     * 更新组件
     * @param id 组件ID
     * @param updates 更新数据
     * @returns 更新是否成功
     */
    static async updateComponent(id: number, updates: Partial<Omit<DragComponent, 'id'>>): Promise<boolean> {
        this.ensureInitialized()

        const result = await this.db.components.update(id, {
            ...updates,
            updatedAt: new Date()
        })
        return result > 0
    }

    /**
     * 批量更新组件
     * @param updates 更新数据数组
     * @returns 更新结果数组
     */
    static async updateComponents(updates: Array<{ id: number; data: Partial<Omit<DragComponent, 'id'>> }>): Promise<number[]> {
        this.ensureInitialized()

        return await this.db.transaction('rw', this.db.components, async () => {
            const promises = updates.map(({ id, data }) => this.db.components.update(id, { ...data, updatedAt: new Date() }))
            const results = await Promise.all(promises)
            return results.filter((r): r is number => typeof r === 'number')
        })
    }

    /**
     * 删除组件
     * @param id 组件ID
     * @returns 删除是否成功
     */
    static async deleteComponent(id: number): Promise<boolean> {
        this.ensureInitialized()
        await this.db.components.delete(id)
        return true
    }

    /**
     * 批量删除组件
     * @param ids 组件ID数组
     * @returns 删除结果
     */
    static async deleteComponents(ids: number[]): Promise<number> {
        this.ensureInitialized()
        return await this.db.components.bulkDelete(ids)
    }

    /**
     * 获取指定区域内的组件
     * @param pageId 页面ID
     * @param bounds 区域边界
     * @returns 组件列表
     */
    static async getComponentsInArea(pageId: string, bounds: { x: number; y: number; width: number; height: number }): Promise<DragComponent[]> {
        this.ensureInitialized()

        const { x, y, width, height } = bounds

        return await this.db.components
            .where('pageId')
            .equals(pageId)
            .and((comp: DragComponent) => comp.x < x + width && comp.x + comp.width > x && comp.y < y + height && comp.y + comp.height > y)
            .toArray()
    }

    // ==================== 历史记录管理 ====================

    /**
     * 添加历史记录
     * @param record 历史记录数据
     * @returns 记录ID
     */
    static async addHistory(record: Omit<HistoryRecord, 'id'>): Promise<number> {
        this.ensureInitialized()
        return await this.db.history.add(record)
    }

    /**
     * 获取项目的历史记录
     * @param projectId 项目ID
     * @param limit 限制数量
     * @returns 历史记录列表
     */
    static async getHistory(projectId: number, limit: number = 50): Promise<HistoryRecord[]> {
        this.ensureInitialized()
        return await this.db.history.where('projectId').equals(projectId).reverse().limit(limit).toArray()
    }

    /**
     * 清理项目的历史记录
     * @param projectId 项目ID
     * @returns 清理的记录数量
     */
    static async clearHistory(projectId: number): Promise<number> {
        this.ensureInitialized()
        return await this.db.history.where('projectId').equals(projectId).delete()
    }

    // ==================== 工具方法 ====================

    /**
     * 获取数据库统计信息
     * @returns 统计信息
     */
    static async getStats(): Promise<{
        projects: number
        components: number
        history: number
        totalSize: number
    }> {
        this.ensureInitialized()

        const [projects, components, history] = await Promise.all([this.db.projects.count(), this.db.components.count(), this.db.history.count()])

        // 估算数据库大小（粗略计算）
        const totalSize = projects * 1024 + components * 512 + history * 256

        return { projects, components, history, totalSize }
    }

    /**
     * 导出项目数据
     * @param projectId 项目ID
     * @returns JSON格式的项目数据
     */
    static async exportProject(projectId: number): Promise<string> {
        this.ensureInitialized()

        const project = await this.db.projects.get(projectId)
        if (!project) {
            throw new Error(`项目 ${projectId} 不存在`)
        }

        const components = await this.getComponentsByPage(project.pages[0]?.id || '')
        const history = await this.getHistory(projectId, 100)

        const exportData = {
            project,
            components,
            history,
            exportedAt: new Date().toISOString(),
            version: '1.0.0'
        }

        return JSON.stringify(exportData, null, 2)
    }

    /**
     * 导入项目数据
     * @param jsonData JSON格式的项目数据
     * @returns 新创建的项目ID
     */
    static async importProject(jsonData: string): Promise<number> {
        this.ensureInitialized()

        const { project, components = [], history = [] } = JSON.parse(jsonData) as {
            project: Project
            components: DragComponent[]
            history: HistoryRecord[]
        }

        return await this.db.transaction('rw', [this.db.projects, this.db.components, this.db.history], async () => {
            const { id: _id, ...projectData } = project
            const newProjectId = await this.createProject({
                ...projectData,
                name: `${project.name} - 导入`
            })

            if (components.length > 0) {
                const newComponents = components.map(({ id: _compId, ...comp }) => ({
                    ...comp,
                    pageId: project.pages[0]?.id || `project-${newProjectId}-page-1`
                }))
                await this.createComponents(newComponents)
            }

            if (history.length > 0) {
                const newHistory = history.map(({ id: _histId, ...record }) => ({
                    ...record,
                    projectId: newProjectId
                }))
                await this.db.history.bulkAdd(newHistory)
            }

            return newProjectId
        })
    }

    /**
     * 备份数据库
     * @returns 备份数据
     */
    static async backup(): Promise<{
        projects: Project[]
        components: DragComponent[]
        history: HistoryRecord[]
        timestamp: string
    }> {
        this.ensureInitialized()

        const [projects, components, history] = await Promise.all([this.db.projects.toArray(), this.db.components.toArray(), this.db.history.toArray()])

        return {
            projects,
            components,
            history,
            timestamp: new Date().toISOString()
        }
    }

    /**
     * 从备份恢复数据库
     * @param backupData 备份数据
     * @returns 恢复是否成功
     */
    static async restore(backupData: any): Promise<boolean> {
        try {
            const { projects = [], components = [], history = [] } = backupData as {
                projects: Project[]
                components: DragComponent[]
                history: HistoryRecord[]
            }

            await this.reset()

            await this.db.transaction('rw', [this.db.projects, this.db.components, this.db.history], async () => {
                if (projects.length > 0) {
                    await this.db.projects.bulkAdd(projects)
                }
                if (components.length > 0) {
                    await this.db.components.bulkAdd(components)
                }
                if (history.length > 0) {
                    await this.db.history.bulkAdd(history)
                }
            })

            return true
        } catch (error) {
            console.error('恢复数据库失败:', error)
            return false
        }
    }

    // ==================== 私有方法 ====================

    /**
     * 确保数据库已初始化
     * @private
     */
    private static ensureInitialized(): void {
        if (!this.isInitialized) {
            throw new Error('数据库未初始化，请先调用 DexieService.init()')
        }
    }
}

// 导出单例实例
export default DexieService
