/**
 * ColorPaletteService - 颜色卡服务
 * 功能：
 *   - saveColor: 保存用户选择的颜色到颜色卡
 *   - getColorPalette: 获取指定项目的颜色卡
 *   - clearColorPalette: 清空指定项目的颜色卡
 */

import DexieService from '../database/dexie-service'
import { DEFAULT_DB_NAME } from '../database/database.config'

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
    // 颜色写入逻辑不再单独持久化到 colorPalette 表，而是直接同步到 doms 表。
    static async saveColor(projectId: string, componentId: string, color: string): Promise<void> {
        console.log(`【数据库交互】保存颜色到颜色卡: 项目ID=${projectId}, 组件ID=${componentId}, 颜色=${color}`)
        try {
            // 检查数据库是否存在
            const dbExists = await DexieService.databaseExists(DEFAULT_DB_NAME)
            if (!dbExists) {
                console.warn('【数据库交互】数据库不存在，无法保存颜色')
                return
            }

            // 直接同步到 doms 表，保持与 updateColorInDoms 一致
            await ColorPaletteService.updateColorInDoms(projectId, componentId, color)
            // 删除缓存，下一次读取重新统计
            ColorPaletteService.componentColorCache.delete(projectId)
        } catch (error) {
            console.error('【数据库交互】保存颜色卡失败:', error)
        }
    }

    /**
     * 兼容旧逻辑获取颜色卡（已废弃，改用 getComponentColors）
     * 为防止外部遗留调用，这里直接调用 getComponentColors 返回去重结果。
     */
    static async getColorPalette(projectId: string): Promise<ColorPaletteItem[]> {
        const colors = await ColorPaletteService.getComponentColors(projectId)
        return colors.map(c => ({ projectId, componentId: '', color: c, updatedAt: new Date() }))
    }

    /**
     * 获取指定项目的所有颜色历史（用于ColorPicker的颜色卡）
     * 查询时只用项目ID，查出多少个记录就是多少个色卡
     */
    // 从 doms 表中统计项目的所有背景颜色并去重，替代原 colorPalette 表。
    static async getComponentColors(projectId: string, forceRefresh = false): Promise<string[]> {
        // 优先返回缓存结果，保持与写入频率一致
        if (!forceRefresh && ColorPaletteService.componentColorCache.has(projectId)) {
            return ColorPaletteService.componentColorCache.get(projectId)!
        }
        console.log(`【数据库交互】获取项目全部色卡值: 项目ID=${projectId}`)
        try {
            // 检查数据库是否存在
            const dbExists = await DexieService.databaseExists(DEFAULT_DB_NAME)
            if (!dbExists) {
                console.warn('【数据库交互】数据库不存在，无法获取颜色卡')
                return []
            }

            const db = await DexieService.getDatabase(DEFAULT_DB_NAME)
            if (!db) return []

            const nodes = await db.table('doms')
                .where('projectId')
                .equals(projectId)
                .toArray()

            // 提取背景色，过滤透明色与空值
            const colors = nodes
                .map((n: any) => n.styles?.backgroundColor as string)
                .filter((c: string) => !!c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent')
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
            // 检查数据库是否存在
            const dbExists = await DexieService.databaseExists(DEFAULT_DB_NAME)
            if (!dbExists) {
                console.warn('【数据库交互】数据库不存在，无法获取节点颜色')
                return null
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
            // 检查数据库是否存在
            const dbExists = await DexieService.databaseExists(DEFAULT_DB_NAME)
            if (!dbExists) {
                console.warn('【数据库交互】数据库不存在，无法更新节点颜色')
                return
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
                .modify((node: any) => {
                    if (!node.styles) {
                        node.styles = {}
                    }
                    node.styles.backgroundColor = hexColor
                    node.styles.opacity = a
                })

            // 更新缓存，保证颜色卡即时刷新
            ColorPaletteService.componentColorCache.delete(projectId)

        } catch (error) {
            console.error('更新doms表颜色值失败:', error)
        }
    }

    /**
     * 兼容旧逻辑清空颜色卡（已废弃，无需操作）
     */
    static async clearColorPalette(_projectId: string): Promise<void> {
        console.warn('ColorPaletteService.clearColorPalette 已废弃')
    }

    /**
     * 删除指定颜色值从颜色卡
     */
    // 通过遍历 doms 表将匹配颜色的节点置为透明并删除缓存。
    static async deleteColor(projectId: string, color: string): Promise<void> {
        try {
            // 检查数据库是否存在
            const dbExists = await DexieService.databaseExists(DEFAULT_DB_NAME)
            if (!dbExists) {
                console.warn('【数据库交互】数据库不存在，无法删除颜色')
                return
            }

            const db = await DexieService.getDatabase(DEFAULT_DB_NAME)
            if (!db) return

            const matchingNodes = await db.table('doms')
                .where('projectId')
                .equals(projectId)
                .and((n: any) => n.styles?.backgroundColor === color)
                .toArray()

            for (const node of matchingNodes) {
                await db.table('doms').update(node.id, {
                    styles: {
                        ...node.styles,
                        backgroundColor: 'transparent',
                        opacity: 1
                    }
                })
            }
            ColorPaletteService.componentColorCache.delete(projectId)
        } catch (error) {
            console.error('删除颜色失败:', error)
        }
    }

    /**
     * 兼容旧逻辑的去重函数（已废弃，无需操作）
     */
    static async cleanupDuplicateColors(_projectId: string): Promise<void> {
        console.warn('ColorPaletteService.cleanupDuplicateColors 已废弃')
    }
}