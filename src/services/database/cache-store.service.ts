import DexieService from './dexie-service'
import { DEFAULT_DB_NAME } from './database.config'
import type { CacheRecord } from '../cache/types'

const TABLE = 'requestCache'

/**
 * 根据 key 获取缓存记录
 */
export async function getCache<T>(key: string): Promise<CacheRecord<T> | undefined> {
    const db = await DexieService.getDatabase(DEFAULT_DB_NAME)
    return db.table<CacheRecord<T>>(TABLE).get(key)
}

/**
 * 设置缓存记录
 */
export async function setCache<T>(record: CacheRecord<T>): Promise<void> {
    const db = await DexieService.getDatabase(DEFAULT_DB_NAME)
    await db.table(TABLE).put(record)
}

/**
 * 删除指定 key 的缓存
 */
export async function deleteCache(key: string): Promise<void> {
    const db = await DexieService.getDatabase(DEFAULT_DB_NAME)
    await db.table(TABLE).delete(key)
}

/**
 * 清空所有缓存
 */
export async function clearCache(): Promise<void> {
    const db = await DexieService.getDatabase(DEFAULT_DB_NAME)
    await db.table(TABLE).clear()
}

/**
 * 清理过期的缓存（按 lastAccess 时间）
 * @param maxAge 最大存活时间（毫秒）
 */
export async function cleanupCache(maxAge: number): Promise<void> {
    const db = await DexieService.getDatabase(DEFAULT_DB_NAME)
    const cutoff = Date.now() - maxAge
    await db.table(TABLE).where('lastAccess').below(cutoff).delete()
}