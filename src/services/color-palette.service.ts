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
    // 缓存项目组件颜色卡，避免频繁重复查询
    private static componentColorCache: Map<string, string[]> = new Map()
    /**
     * 保存颜色到颜色卡（每个组件只保存一个颜色记录）
     * @param projectId 项目ID
     * @param componentId 颜色组件ID
     * @param color 颜色值
     */
    static async saveColor(projectId: string, componentId: string, color: string): Promise<void> {
        console.log(`【数据库交互】保存颜色到颜色卡: 项目ID=${projectId}, 组件ID=${componentId}, 颜色=${color}`)
        try {
            // 确保数据库已初始化
            const dbExists = await DexieService.databaseExists(DEFAULT_DB_NAME)
            if (!dbExists) {
                console.log('【数据库交互】数据库不存在，开始创建数据库')
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

            // 使用事务确保原子性操作
            await db.transaction('rw', db.table('colorPalette'), async () => {
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
            })
            // 更新缓存，下一次读取时重新查询
            ColorPaletteService.componentColorCache.delete(projectId)
        } catch (error) {
            console.error('【数据库交互】保存颜色卡失败:', error)
        }
    }

    /**
     * 获取指定项目的颜色卡（按更新时间倒序排列）
     */
    static async getColorPalette(projectId: string): Promise<ColorPaletteItem[]> {
        console.log(`【数据库交互】获取项目颜色卡: 项目ID=${projectId}`)
        try {
            // 确保数据库已初始化
            const dbExists = await DexieService.databaseExists(DEFAULT_DB_NAME)
            if (!dbExists) {
                console.log('【数据库交互】数据库不存在，开始创建数据库')
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
            console.error('【数据库交互】获取颜色卡失败:', error)
            return []
        }
    }

    /**
     * 获取指定项目的所有颜色卡（供 ColorPicker 使用）
     * 查询时只用项目ID，查出多少个记录就是多少个色卡
     */
    static async getComponentColors(projectId: string, forceRefresh = false): Promise<string[]> {
        // 优先返回缓存结果，保持与写入频率一致
        if (!forceRefresh && ColorPaletteService.componentColorCache.has(projectId)) {
            return ColorPaletteService.componentColorCache.get(projectId)!
        }
        console.log(`【数据库交互】获取项目组件颜色卡: 项目ID=${projectId}`)
        try {
            // 确保数据库已初始化
            const dbExists = await DexieService.databaseExists(DEFAULT_DB_NAME)
            if (!dbExists) {
                console.log('【数据库交互】数据库不存在，开始创建数据库')
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

            const colors = items.map(item => item.color)
            ColorPaletteService.componentColorCache.set(projectId, colors)
            return colors
        } catch (error) {
            console.error('【数据库交互】获取项目颜色卡失败:', error)
            return []
        }
    }

    /**
     * 从doms表获取指定节点的当前颜色值
     * @param projectId 项目ID
     * @param componentId 节点ID
     * @returns 颜色值（RGBA格式）
     */
    static async getColorFromDoms(projectId: string, componentId: string): Promise<string | null> {
        console.log(`【数据库交互】从doms表获取节点颜色: 项目ID=${projectId}, 组件ID=${componentId}`)
        try {
            // 确保数据库已初始化
            const dbExists = await DexieService.databaseExists(DEFAULT_DB_NAME)
            if (!dbExists) {
                console.log('【数据库交互】数据库不存在，开始创建数据库')
                await DexieService.createDatabase(DEFAULT_DB_NAME)
            }

            const db = await DexieService.getDatabase(DEFAULT_DB_NAME)
            if (!db) return null

            // 从doms表查询指定节点
            const node = await db.table('doms')
                .where('[projectId+id]')
                .equals([projectId, componentId])
                .first()

            if (!node || !node.styles) {
                return null
            }

            // 获取背景颜色
            const bgColor = node.styles.backgroundColor
            if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
                // 如果已经是RGBA格式，直接返回
                if (bgColor.startsWith('rgba')) {
                    return bgColor
                }

                // 如果是HEX格式，转换为RGBA
                if (bgColor.startsWith('#')) {
                    const r = parseInt(bgColor.slice(1, 3), 16)
                    const g = parseInt(bgColor.slice(3, 5), 16)
                    const b = parseInt(bgColor.slice(5, 7), 16)
                    const a = node.styles.opacity ? parseFloat(node.styles.opacity) : 1
                    return `rgba(${r}, ${g}, ${b}, ${a})`
                }

                // 如果是RGB格式
                const rgbMatch = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
                if (rgbMatch) {
                    const r = parseInt(rgbMatch[1])
                    const g = parseInt(rgbMatch[2])
                    const b = parseInt(rgbMatch[3])
                    const a = node.styles.opacity ? parseFloat(node.styles.opacity) : 1
                    return `rgba(${r}, ${g}, ${b}, ${a})`
                }
            }

            return null
        } catch (error) {
            console.error('【数据库交互】从doms表获取颜色值失败:', error)
            return null
        }
    }

    /**
     * 更新doms表中指定节点的颜色值
     * @param projectId 项目ID
     * @param componentId 节点ID
     * @param color 颜色值（RGBA格式）
     */
    static async updateColorInDoms(projectId: string, componentId: string, color: string): Promise<void> {
        console.log(`【数据库交互】更新doms表节点颜色: 项目ID=${projectId}, 组件ID=${componentId}, 颜色=${color}`)
        try {
            // 确保数据库已初始化
            const dbExists = await DexieService.databaseExists(DEFAULT_DB_NAME)
            if (!dbExists) {
                console.log('【数据库交互】数据库不存在，开始创建数据库')
                await DexieService.createDatabase(DEFAULT_DB_NAME)
            }

            const db = await DexieService.getDatabase(DEFAULT_DB_NAME)
            if (!db) return

            // 解析RGBA颜色值
            const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
            if (!rgbaMatch) return

            const r = parseInt(rgbaMatch[1])
            const g = parseInt(rgbaMatch[2])
            const b = parseInt(rgbaMatch[3])
            const a = rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1

            // 转换为HEX格式
            const hexColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`

            // 更新doms表中对应节点的样式
            await db.table('doms')
                .where('[projectId+id]')
                .equals([projectId, componentId])
                .modify(node => {
                    if (!node.styles) {
                        node.styles = {}
                    }
                    node.styles.backgroundColor = hexColor
                    node.styles.opacity = a
                })

        } catch (error) {
            console.error('更新doms表颜色值失败:', error)
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

    /**
     * 清理指定项目的重复颜色记录（保留最新的）
     */
    static async cleanupDuplicateColors(projectId: string): Promise<void> {
        try {
            // 确保数据库已初始化
            const dbExists = await DexieService.databaseExists(DEFAULT_DB_NAME)
            if (!dbExists) {
                await DexieService.createDatabase(DEFAULT_DB_NAME)
            }

            const db = await DexieService.getDatabase(DEFAULT_DB_NAME)
            if (!db) return

            await db.transaction('rw', db.table('colorPalette'), async () => {
                // 获取所有记录
                const allRecords = await db.table('colorPalette')
                    .where('projectId')
                    .equals(projectId)
                    .toArray()

                // 按componentId分组
                const grouped = new Map<string, ColorPaletteItem[]>()
                for (const record of allRecords) {
                    const key = `${record.projectId}_${record.componentId}`
                    if (!grouped.has(key)) {
                        grouped.set(key, [])
                    }
                    grouped.get(key)!.push(record)
                }

                // 删除重复记录，保留最新的
                for (const [key, records] of grouped) {
                    if (records.length > 1) {
                        // 按更新时间排序，最新的在前面
                        records.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

                        // 保留最新的记录，删除其余的
                        const toDelete = records.slice(1)
                        for (const record of toDelete) {
                            if (record.id) {
                                await db.table('colorPalette').delete(record.id)
                            }
                        }

                        console.log(`清理了 ${toDelete.length} 条重复记录，组件: ${records[0].componentId}`)
                    }
                }
            })
        } catch (error) {
            console.error('清理重复颜色记录失败:', error)
        }
    }
}