/**
 * AuthCacheService - 授权缓存服务
 * 功能：
 *   - saveAuthCache:   保存授权缓存到数据库
 *   - readAuthCache:   从数据库读取授权缓存
 *   - clearAuthCache:  清空数据库中的授权缓存
 */

import DexieService from '../database/dexie-service'

export default class AuthCacheService {
    /**
     * 保存授权缓存到数据库
     * @param dbName 数据库名称
     * @param cacheData 缓存数据
     */
    static async saveAuthCache(dbName: string, cacheData: { deviceKeyHash: string; timestamp: number; lastVerified: string }): Promise<void> {
        const db = await DexieService.getDatabase(dbName)
        const configRecords = await db.table('config').toArray()
        const configRecord = configRecords[0] || { showLogs: false, perfMonitor: true, authCache: null }

        await db.table('config').clear()
        await db.table('config').put({ ...configRecord, authCache: cacheData })
    }

    /**
     * 从数据库读取授权缓存
     * @param dbName 数据库名称
     * @returns 缓存数据或null
     */
    static async readAuthCache(dbName: string): Promise<{ deviceKeyHash: string; timestamp: number; lastVerified: string } | null> {
        const db = await DexieService.getDatabase(dbName)
        const configRecords = await db.table('config').toArray()
        const configRecord = configRecords[0]

        return configRecord?.authCache || null
    }

    /**
     * 清空数据库中的授权缓存
     * @param dbName 数据库名称
     */
    static async clearAuthCache(dbName: string): Promise<void> {
        const db = await DexieService.getDatabase(dbName)
        const configRecords = await db.table('config').toArray()
        const configRecord = configRecords[0] || { showLogs: false, perfMonitor: true, authCache: null }

        await db.table('config').clear()
        await db.table('config').put({ ...configRecord, authCache: null })
    }
}