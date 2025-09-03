/**
 * DexieService - IndexedDB 封装服务
 * 功能：
 *   - databaseExists: 判断指定数据库是否存在
 *   - createDatabase: 初始化数据库并插入默认模板
 *   - queryRecords:   查询指定表的数据
 */

import Dexie from 'dexie'

export default class DexieService {
    /**
     * 缓存数据库存在状态，避免频繁调用 indexedDB.databases()
     * key 为数据库名，value 为是否存在
     */
    private static dbExistenceCache: Map<string, boolean> = new Map()
    /**
     * 判断数据库是否存在
     */
    static async databaseExists(dbName: string): Promise<boolean> {
        // 优先使用缓存，避免频繁调用 indexedDB.databases()
        if (DexieService.dbExistenceCache.has(dbName)) {
            return DexieService.dbExistenceCache.get(dbName) as boolean
        }

        // DatabaseLogger.checkingDatabase(dbName)
        try {
            const dbs = await indexedDB.databases()
            const exists = dbs.some(db => db.name === dbName)
            // 写入缓存
            DexieService.dbExistenceCache.set(dbName, exists)
            // DatabaseLogger.databaseExists(dbName, exists)
            return exists
        } catch (error) {
            // DatabaseLogger.operationError(`检查数据库是否存在: ${dbName}`, error)
            return false
        }
    }

    /**
     * 创建数据库并插入默认模板
     * @param dbName 数据库名称
     * @param isLiteMode 是否为精简模式，默认为false。在精简模式下不会添加默认模板数据
     */
    static async createDatabase(dbName: string, isLiteMode: boolean = false): Promise<void> {
        // DatabaseLogger.creatingDatabase(dbName)
        const db = new Dexie(dbName)

        // 开发环境无需修改版本号
        const stores: Record<string, string> = {
            projects: 'id, name, templateId, createdAt, updatedAt, canvasState, mode, exportTime, designWidth, designHeight',
            doms: '[projectId+id], projectId, parentId, type, attributes, style, textContent',
            config: '++id, showLogs'
        }

        // 精简模式下不创建templates表
        if (!isLiteMode) {
            stores.templates = '++id, name, desc, cover, tag, thumbnailUrl, domStructure'
        }

        db.version(1).stores(stores)

        await db.open()
        // 打开成功后写入缓存，避免后续重复检查
        DexieService.dbExistenceCache.set(dbName, true)

        // 插入默认配置（首次创建时）
        const cfgCount = await db.table('config').count()
        if (cfgCount === 0) {
            await db.table('config').put({ showLogs: false })
        }
        // DatabaseLogger.databaseCreated(dbName)

        // 精简模式下不插入默认模板
        if (isLiteMode) {
            return
        }

        // 插入默认模板
        const count = await db.table('templates').count()
        if (count === 0) {
            // 空白模板
            const blankBlob = new Blob(
                [
                    `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150">
                        <rect width="200" height="150" fill="#f5f5f5"/>
                        <text x="100" y="75" text-anchor="middle" dominant-baseline="middle" font-family="Arial" font-size="14" fill="#999">空白项目</text>
                    </svg>`
                ],
                { type: 'image/svg+xml' }
            )



            await db.table('templates').bulkAdd([
                {
                    id: 'blank',
                    name: '空白项目',
                    desc: '从零开始创建',
                    cover: blankBlob,
                    tag: '默认',
                    thumbnailUrl: blankBlob,
                    domStructure: [
                        {
                            projectId: 'template-blank',
                            id: 'root',
                            parentId: null,
                            type: 'SimpleBox',
                            attributes: {
                                expanded: true,
                                hidden: undefined
                            },
                            style: {
                                overflow: 'hidden',
                                backgroundColor: '#ffffff',
                                height: '100%',
                                pointerEvents: 'auto',
                                width: '100%',
                                boxSizing: 'border-box'
                            },
                            textContent: ''
                        }
                    ]
                }
            ])
        }
    }

    /**
     * 查询表数据
     */
    static async queryRecords<T>(dbName: string, tableName: string): Promise<T[]> {
        // // // // // DatabaseLogger.queryingRecords(dbName, tableName)
        const db = new Dexie(dbName)
        await db.open()
        const result = await db.table(tableName).toArray()
        // // // // // DatabaseLogger.queryResults(result.length)
        return result
    }

    /**
     * 获取表中的所有记录
     */
    static async getAllRecords<T>(dbName: string, tableName: string): Promise<T[]> {
        const db = new Dexie(dbName)
        await db.open()
        const result = await db.table(tableName).toArray()
        return result
    }

    /**
     * 获取指定主键的记录
     */
    static async getRecord<T>(dbName: string, tableName: string, key: any): Promise<T | undefined> {
        // DatabaseLogger.gettingRecord(dbName, tableName, key)
        const db = await DexieService.getDatabase(dbName)
        if (!db) {
            // DatabaseLogger.operationError(`获取数据库实例失败: ${dbName}`, new Error('db is null'))
            return undefined
        }
        const result = await db.table(tableName).get(key)
        // DatabaseLogger.recordFound(!!result)
        return result
    }

    /**
     * 删除表中指定主键记录
     * @param dbName   数据库名称
     * @param tableName 表名
     * @param key       主键值
     * @returns 删除是否成功
     */
    static async deleteRecord(dbName: string, tableName: string, key: any): Promise<boolean> {
        // DatabaseLogger.deletingRecord(dbName, tableName, key)
        try {
            const db = new Dexie(dbName)
            await db.open()
            await db.table(tableName).delete(key)
            // DatabaseLogger.recordDeleted(true)
            return true
        } catch (error) {
            // DatabaseLogger.operationError(`删除记录: ${tableName}.${key}`, error)
            return false
        }
    }

    static async addRecord<T>(dbName: string, tableName: string, data: T): Promise<any> {
        // DatabaseLogger.addingRecord(dbName, tableName)
        try {
            const db = new Dexie(dbName)
            await db.open()
            const id = await db.table(tableName).add(data as any)
            // DatabaseLogger.recordAdded(id)
            return id
        } catch (error) {
            // DatabaseLogger.operationError(`添加记录: ${tableName}`, error)
            throw error
        }
    }

    /**
     * 更新表中指定主键记录
     * @param dbName   数据库名称
     * @param tableName 表名
     * @param key       主键值
     * @param data      要更新的数据
     * @returns 更新是否成功
     */
    static async updateRecord<T>(dbName: string, tableName: string, key: any, data: Partial<T>): Promise<boolean> {
        try {
            const db = new Dexie(dbName)
            await db.open()
            await db.table(tableName).update(key, data as any)
            return true
        } catch (error) {
            return false
        }
    }


    /**
     * 数据库实例缓存，避免重复创建实例
     */
    private static dbInstanceCache: Map<string, Dexie> = new Map()

    /**
     * 获取数据库实例（单例模式）
     */
    static async getDatabase(dbName: string): Promise<Dexie | null> {
        try {
            // 如果已缓存，直接返回
            if (DexieService.dbInstanceCache.has(dbName)) {
                return DexieService.dbInstanceCache.get(dbName)!
            }

            // 创建新的数据库实例
            const db = new Dexie(dbName)

            // 定义表结构（与createDatabase保持一致）
            const stores: Record<string, string> = {
                projects: 'id, name, templateId, createdAt, updatedAt, canvasState, mode, exportTime, designWidth, designHeight',
                doms: '[projectId+id], projectId, parentId, type, attributes, style, textContent',
                templates: '++id, name, desc, cover, tag, thumbnailUrl, domStructure',
                config: '++id, showLogs'
            }

            db.version(1).stores(stores)
            await db.open()

            // 缓存实例
            DexieService.dbInstanceCache.set(dbName, db)

            return db
        } catch (error) {
            return null
        }
    }
}
