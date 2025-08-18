/**
 * ColorPaletteService - 颜色卡服务
 * 功能：
 *   - saveColor: 保存用户选择的颜色到颜色卡
 *   - getColorPalette: 获取指定项目的颜色卡
 *   - clearColorPalette: 清空指定项目的颜色卡
 */

import DexieService from './database/dexie-service'
import { DEFAULT_DB_NAME } from './database/database.config'

export interface ColorPaletteItem {
    id?: number
    projectId: string
    componentId: string
    color: string
    updatedAt: Date
}

export default class ColorPaletteService {
    /**
     * 保存颜色到颜色卡（为每个组件保存多个历史颜色）
     * @param projectId 项目ID
     * @param componentId 颜色组件ID
     * @param color 颜色值
     */
    static async saveColor(projectId: string, componentId: string, color: string): Promise<void> {
        try {
            // 确保数据库已初始化
            const dbExists = await DexieService.databaseExists(DEFAULT_DB_NAME)
            if (!dbExists) {
                await DexieService.createDatabase(DEFAULT_DB_NAME)
            }

            const db = await DexieService.getDatabase(DEFAULT_DB_NAME)
            if (!db) return

            const colorItem: ColorPaletteItem = {
                projectId,
                componentId,
                color,
                updatedAt: new Date()
            }

            // 使用复合索引查找是否已存在记录
            const existing = await db.table('colorPalette')
                .where('[projectId+componentId]')
                .equals([projectId, componentId])
                .first()

            if (existing) {
                // 更新已存在的记录
                await db.table('colorPalette').update(existing.id!, {
                    color: color,
                    updatedAt: new Date()
                })
            } else {
                // 添加新记录
                await db.table('colorPalette').add(colorItem)
            }
        } catch (error) {
            console.error('保存颜色卡失败:', error)
        }
    }

    /**
     * 获取指定项目的颜色卡（按更新时间倒序排列）
     */
    static async getColorPalette(projectId: string): Promise<ColorPaletteItem[]> {
        try {
            // 确保数据库已初始化
            const dbExists = await DexieService.databaseExists(DEFAULT_DB_NAME)
            if (!dbExists) {
                await DexieService.createDatabase(DEFAULT_DB_NAME)
            }

            const db = await DexieService.getDatabase(DEFAULT_DB_NAME)
            if (!db) return []

            return await db.table('colorPalette')
                .where('projectId')
                .equals(projectId)
                .reverse()
                .toArray()
        } catch (error) {
            console.error('获取颜色卡失败:', error)
            return []
        }
    }

    /**
     * 获取指定项目的所有颜色历史（用于ColorPicker的颜色卡）
     * 查询时只用项目ID，查出多少个记录就是多少个色卡
     */
    static async getComponentColors(projectId: string): Promise<string[]> {
        try {
            // 确保数据库已初始化
            const dbExists = await DexieService.databaseExists(DEFAULT_DB_NAME)
            if (!dbExists) {
                await DexieService.createDatabase(DEFAULT_DB_NAME)
            }

            const db = await DexieService.getDatabase(DEFAULT_DB_NAME)
            if (!db) return []

            // 只按项目ID查询所有颜色记录
            const items = await db.table('colorPalette')
                .where('projectId')
                .equals(projectId)
                .reverse()
                .toArray()

            return items.map(item => item.color)
        } catch (error) {
            console.error('获取项目颜色卡失败:', error)
            return []
        }
    }

    /**
     * 清空指定项目的颜色卡
     */
    static async clearColorPalette(projectId: string): Promise<void> {
        try {
            // 确保数据库已初始化
            const dbExists = await DexieService.databaseExists(DEFAULT_DB_NAME)
            if (!dbExists) {
                await DexieService.createDatabase(DEFAULT_DB_NAME)
            }

            const db = await DexieService.getDatabase(DEFAULT_DB_NAME)
            if (!db) return

            await db.table('colorPalette')
                .where('projectId')
                .equals(projectId)
                .delete()
        } catch (error) {
            console.error('清空颜色卡失败:', error)
        }
    }

    /**
     * 删除指定颜色值从颜色卡
     */
    static async deleteColor(projectId: string, color: string): Promise<void> {
        try {
            // 确保数据库已初始化
            const dbExists = await DexieService.databaseExists(DEFAULT_DB_NAME)
            if (!dbExists) {
                await DexieService.createDatabase(DEFAULT_DB_NAME)
            }

            const db = await DexieService.getDatabase(DEFAULT_DB_NAME)
            if (!db) return

            // 删除匹配的颜色记录
            await db.table('colorPalette')
                .where('projectId')
                .equals(projectId)
                .and(item => item.color === color)
                .delete()
        } catch (error) {
            console.error('删除颜色失败:', error)
        }
    }
}