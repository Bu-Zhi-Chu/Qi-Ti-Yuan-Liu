/**
 * DexieService - IndexedDB 封装服务
 * 功能：
 *   - databaseExists: 判断指定数据库是否存在
 *   - createDatabase: 初始化数据库并插入默认模板
 *   - queryRecords:   查询指定表的数据
 */

import Dexie from 'dexie'
import { DB_VERSION } from './database.config'
import { getStableDeviceKeyHash } from '../fingerprint/browser-fingerprint.service'

export default class DexieService {
    /**
     * 缓存数据库存在状态，避免频繁调用 indexedDB.databases()
     * key 为数据库名，value 为是否存在
     */
    private static dbExistenceCache: Map<string, boolean> = new Map()

    /**
     * 授权缓存键名
     */
    private static readonly AUTH_CACHE_KEY = 'qi-qiao-ban-auth-cache'

    /**
     * 快速本地授权验证
     * 通过比较当前设备密钥与缓存中的密钥来验证授权
     * @returns 是否通过本地验证
     */
    private static async quickLocalAuthCheck(): Promise<boolean> {
        try {
            // 获取当前设备密钥哈希
            const currentDeviceKeyHash = await getStableDeviceKeyHash()

            // 读取缓存中的授权信息
            const cacheData = localStorage.getItem(DexieService.AUTH_CACHE_KEY)
            if (!cacheData) {
                return false
            }

            const parsed = JSON.parse(cacheData)
            const cachedDeviceKeyHash = parsed.deviceKeyHash

            // 比较密钥
            if (currentDeviceKeyHash === cachedDeviceKeyHash) {
                return true
            } else {
                return false
            }
        } catch (error) {
            return false
        }
    }
    /**
     * 判断数据库是否存在
     */
    static async databaseExists(dbName: string): Promise<boolean> {
        // 先进行本地授权验证
        const isAuthorized = await DexieService.quickLocalAuthCheck()
        if (!isAuthorized) {
            throw new Error('Unauthorized: Local auth check failed')
        }

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
        // 先进行本地授权验证
        const isAuthorized = await DexieService.quickLocalAuthCheck()
        if (!isAuthorized) {
            throw new Error('Unauthorized: Local auth check failed')
        }

        // DatabaseLogger.creatingDatabase(dbName)
        const db = new Dexie(dbName)

        // 使用全局版本号，结构变更需同步递增
        const stores: Record<string, string> = {
            projects: 'id, name, templateId, createdAt, updatedAt, canvasState, mode, exportTime, designWidth, designHeight',
            doms: '[projectId+id], projectId, parentId, attributes, style',
            config: '++id, showLogs, perfMonitor',
            imageStore: 'hash, [projectId+hash], blob, name, width, height, refCount'
        }

        // 精简模式下不创建templates表
        if (!isLiteMode) {
            stores.templates = '++id, name, desc, cover, tag, thumbnailUrl, domStructure'
        }

        db.version(DB_VERSION).stores(stores)

        await db.open()
        // 打开成功后写入缓存，避免后续重复检查
        DexieService.dbExistenceCache.set(dbName, true)

        // 插入默认配置（首次创建时）
        const cfgCount = await db.table('config').count()
        if (cfgCount === 0) {
            // 根据环境决定日志默认值：开发环境默认开启，其他环境默认关闭
            await db.table('config').put({ showLogs: import.meta.env.DEV === true, perfMonitor: true })
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
                            attributes: {
                                type: 'SimpleBox',
                                textContent: '',
                                expanded: true,
                                hidden: undefined
                            },
                            style: {
                                overflow: 'hidden',
                                backgroundColor: '#ffffff',
                                height: '100%',
                                pointerEvents: 'auto',
                                width: '100%',
                                boxSizing: 'border-box',
                                backgroundPositionX: '50%',
                                backgroundPositionY: '50%',
                                backgroundSizeX: '100%',
                                backgroundSizeY: '100%'
                            }
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
        // 先进行本地授权验证
        const isAuthorized = await DexieService.quickLocalAuthCheck()
        if (!isAuthorized) {
            throw new Error('Unauthorized: Local auth check failed')
        }

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
        // 先进行本地授权验证
        const isAuthorized = await DexieService.quickLocalAuthCheck()
        if (!isAuthorized) {
            throw new Error('Unauthorized: Local auth check failed')
        }

        const db = new Dexie(dbName)
        await db.open()
        const result = await db.table(tableName).toArray()
        return result
    }

    /**
     * 获取指定主键的记录
     */
    static async getRecord<T>(dbName: string, tableName: string, key: any): Promise<T | undefined> {
        // 先进行本地授权验证
        const isAuthorized = await DexieService.quickLocalAuthCheck()
        if (!isAuthorized) {
            console.error('❌【数据库访问】授权验证失败，拒绝获取单条记录操作')
            throw new Error('Unauthorized: Local auth check failed')
        }

        // DatabaseLogger.gettingRecord(dbName, tableName, key)
        const db = await DexieService.getDatabase(dbName)
        const result = await db.table(tableName).get(key)
        // DatabaseLogger.recordFound(!!result)
        return result
    }

    /**
     * 删除表中指定主键记录
     * @param dbName   数据库名称
     * @param tableName 表名
     * @param primaryKey 主键值
     */
    static async deleteRecord(dbName: string, tableName: string, primaryKey: any): Promise<void> {
        // 先进行本地授权验证
        const isAuthorized = await DexieService.quickLocalAuthCheck()
        if (!isAuthorized) {
            throw new Error('Unauthorized: Local auth check failed')
        }

        const db = new Dexie(dbName)
        await db.open()
        await db.table(tableName).delete(primaryKey)
    }

    static async addRecord<T>(dbName: string, tableName: string, data: T): Promise<any> {
        // 先进行本地授权验证
        const isAuthorized = await DexieService.quickLocalAuthCheck()
        if (!isAuthorized) {
            console.error('❌【数据库访问】授权验证失败，拒绝添加记录操作')
            throw new Error('Unauthorized: Local auth check failed')
        }

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
     * 插入记录到表中
     */
    static async insertRecord<T>(dbName: string, tableName: string, record: T): Promise<void> {
        // 先进行本地授权验证
        const isAuthorized = await DexieService.quickLocalAuthCheck()
        if (!isAuthorized) {
            throw new Error('Unauthorized: Local auth check failed')
        }

        const db = new Dexie(dbName)
        await db.open()
        await db.table(tableName).add(record)
    }

    /**
     * 更新表中指定主键记录
     * @param dbName   数据库名称
     * @param tableName 表名
     * @param primaryKey 主键值
     * @param updates   更新的字段
     */
    static async updateRecord<T>(dbName: string, tableName: string, primaryKey: any, updates: Partial<T>): Promise<void> {
        // 先进行本地授权验证
        const isAuthorized = await DexieService.quickLocalAuthCheck()
        if (!isAuthorized) {
            throw new Error('Unauthorized: Local auth check failed')
        }

        const db = new Dexie(dbName)
        await db.open()
        await db.table(tableName).update(primaryKey, updates)
    }


    /**
     * 清空数据库中的所有表数据（保留表结构）
     * @param dbName 数据库名称
     * @returns 清空是否成功
     */
    static async clearDatabase(dbName: string): Promise<boolean> {
        try {
            const db = new Dexie(dbName)
            await db.open()

            // 获取所有表名
            const tableNames = db.tables.map(table => table.name)
            console.log(`🗑️【数据库清空】准备清空数据库 ${dbName} 的所有表: ${tableNames.join(', ')}`)

            // 清空所有表的数据
            for (const tableName of tableNames) {
                await db.table(tableName).clear()
                console.log(`✅【数据库清空】已清空表: ${tableName}`)
            }

            console.log(`✅【数据库清空】数据库 ${dbName} 清空完成`)
            return true
        } catch (error) {
            console.error(`❌【数据库清空】清空数据库 ${dbName} 失败:`, error)
            return false
        }
    }

    /**
     * 数据库实例缓存，避免重复创建实例
     */
    private static dbInstanceCache: Map<string, Dexie> = new Map()

    /**
     * 获取数据库实例（单例模式）
     * 注意：使用此方法前必须确保数据库已创建
     */
    static async getDatabase(dbName: string): Promise<Dexie> {
        if (DexieService.dbInstanceCache.has(dbName)) {
            // 有缓存，直接返回
            return DexieService.dbInstanceCache.get(dbName)!
        } else {
            // 无缓存，创建并缓存后返回
            const db = new Dexie(dbName)
            await db.open()
            DexieService.dbInstanceCache.set(dbName, db)
            return db
        }
    }
}
