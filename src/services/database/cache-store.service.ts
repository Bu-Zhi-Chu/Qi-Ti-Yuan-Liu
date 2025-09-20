import DexieService from './dexie-service'
import { DEFAULT_DB_NAME } from './database.config'
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
 * 清理超过 maxAge 的缓存
 */
export async function cleanupCache(maxAge: number): Promise<number> {
    const cutoff = Date.now() - maxAge
    let count = 0
    await DexieService.transaction(DEFAULT_DB_NAME, TABLE, async (db, table) => {
        const keys = await table.where('lastAccess').below(cutoff).primaryKeys()
        await table.bulkDelete(keys as string[])
        count = keys.length
    })
    return count
}