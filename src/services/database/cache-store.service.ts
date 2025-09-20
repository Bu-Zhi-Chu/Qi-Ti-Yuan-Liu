import DexieService from './dexie-service'
import { DEFAULT_DB_NAME } from '../../config/config'
import type { CacheRecord } from '../cache/types'

const TABLE = 'requestCache'

/**
 * 根据 key 获取缓存记录
 */
export async function getCache<T>(key: string): Promise<CacheRecord<T> | undefined> {
    return await DexieService.getRecord<CacheRecord<T>>(DEFAULT_DB_NAME, TABLE, key)
}

/**
 * 设置缓存记录（存在则更新，不存在则插入）
 */
export async function setCache<T>(record: CacheRecord<T>): Promise<void> {
    const existing = await getCache<T>(record.key)
    if (existing) {
        await DexieService.updateRecord(DEFAULT_DB_NAME, TABLE, record.key, record)
    } else {
        await DexieService.addRecord(DEFAULT_DB_NAME, TABLE, record)
    }
}

/**
 * 删除指定 key 的缓存
 */
export async function deleteCache(key: string): Promise<void> {
    await DexieService.deleteRecord(DEFAULT_DB_NAME, TABLE, key)
}

/**
 * 清空整张缓存表
 */
export async function clearCache(): Promise<void> {
    await DexieService.transaction(DEFAULT_DB_NAME, TABLE, async (db, table) => {
        await table.clear()
    })
}

/**
 * 清理过期缓存
 * @param maxAge 最大缓存时间（毫秒）
 * @returns 删除的记录数量
 */
export async function cleanupCache(maxAge: number): Promise<number> {
    try {
        // 使用不带验证的方法获取数据库实例，避免循环依赖
        const db = await DexieService.getDatabaseUnsafe(DEFAULT_DB_NAME)
        const allRecords = await db.table(TABLE).toArray()
        const cutoff = Date.now() - maxAge
        let deletedCount = 0

        // 删除过期记录
        for (const record of allRecords) {
            if (record.lastAccess < cutoff) {
                await db.table(TABLE).delete(record.key)
                deletedCount++
            }
        }

        return deletedCount
    } catch (error) {
        return 0
    }
}