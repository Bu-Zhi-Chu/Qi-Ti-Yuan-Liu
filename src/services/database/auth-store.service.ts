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
        try {
            // 使用不带验证的方法获取数据库实例，避免循环依赖
            const db = await DexieService.getDatabaseUnsafe(dbName)
            const configRecords = await db.table('config').toArray()
            const configRecord = configRecords[0] || { showLogs: false, perfMonitor: true, authCache: null }

            await db.table('config').clear()
            await db.table('config').put({ ...configRecord, authCache: cacheData })
        } catch (error) {
            throw new Error(`Save auth cache failed: ${error}`)
        }
    }

    /**
 * 从数据库读取授权缓存
 * @param dbName 数据库名称
 * @returns 缓存数据或null
 */
    static async readAuthCache(dbName: string): Promise<{ deviceKeyHash: string; timestamp: number; lastVerified: string } | null> {
        try {
            // 使用不带验证的方法获取数据库实例，避免循环依赖
            const db = await DexieService.getDatabaseUnsafe(dbName)
            const configRecords = await db.table('config').toArray()
            const configRecord = configRecords[0]

            return configRecord?.authCache || null
        } catch (error) {
            return null
        }
    }

    /**
 * 清空数据库中的授权缓存
 * @param dbName 数据库名称
 */
    static async clearAuthCache(dbName: string): Promise<void> {
        try {
            // 使用不带验证的方法获取数据库实例，避免循环依赖
            const db = await DexieService.getDatabaseUnsafe(dbName)
            const configRecords = await db.table('config').toArray()
            const configRecord = configRecords[0] || { showLogs: false, perfMonitor: true, authCache: null }

            await db.table('config').clear()
            await db.table('config').put({ ...configRecord, authCache: null })
        } catch (error) {
            throw new Error(`Clear auth cache failed: ${error}`)
        }
    }

    /**
     * 保存下次定期验证的时间戳（毫秒）
     */
    static async saveNextVerificationAt(dbName: string, timestamp: number): Promise<void> {
        try {
            const db = await DexieService.getDatabaseUnsafe(dbName)
            const configRecords = await db.table('config').toArray()
            const configRecord = configRecords[0] || { showLogs: false, perfMonitor: true, authCache: null }

            await db.table('config').clear()
            await db.table('config').put({ ...configRecord, nextVerificationAt: timestamp })
        } catch (error) {
            throw new Error(`Save nextVerificationAt failed: ${error}`)
        }
    }

    /**
     * 读取下次定期验证的时间戳（毫秒）
     * 若不存在返回 null
     */
    static async readNextVerificationAt(dbName: string): Promise<number | null> {
        try {
            const db = await DexieService.getDatabaseUnsafe(dbName)
            const configRecords = await db.table('config').toArray()
            const configRecord = configRecords[0]
            return configRecord?.nextVerificationAt ?? null
        } catch (error) {
            return null
        }
    }
}