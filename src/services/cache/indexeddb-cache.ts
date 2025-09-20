// z/X/qi-qiao-ban/src/services/cache/indexeddb-cache.ts

import Dexie, { type Table } from 'dexie';
import type { CacheRecord } from './types';

const DB_NAME = 'request-cache-db';
const TABLE_NAME = 'requests';

class RequestCacheDB extends Dexie {
  public requests!: Table<CacheRecord, string>;

  public constructor() {
    super(DB_NAME);
    this.version(1).stores({
      [TABLE_NAME]: 'key,lastAccess', // `key` is the primary key, `lastAccess` is indexed for cleanup
    });
  }
}

const db = new RequestCacheDB();

class IndexedDBCache {
  /**
   * 从 IndexedDB 获取一条缓存记录。
   * @param key - 缓存键。
   * @returns 缓存记录或 undefined。
   */
  async get<T>(key: string): Promise<CacheRecord<T> | undefined> {
    try {
      const record = await db.requests.get(key);
      if (record) {
        // 更新访问时间，但为了性能，可以批量或延迟更新
        db.requests.update(key, { lastAccess: Date.now() }).catch(console.error);
        return record as CacheRecord<T>;
      }
    } catch (error) {
      console.error('IndexedDB get error:', error);
    }
    return undefined;
  }

  /**
   * 向 IndexedDB 设置一条缓存记录。
   * @param key - 缓存键。
   * @param record - 要缓存的记录。
   */
  async set<T>(key: string, record: CacheRecord<T>): Promise<void> {
    try {
      await db.requests.put(record);
    } catch (error) {
      console.error('IndexedDB set error:', error);
    }
  }

  /**
   * 从 IndexedDB 删除一条记录。
   * @param key - 缓存键。
   */
  async delete(key: string): Promise<void> {
    try {
      await db.requests.delete(key);
    } catch (error) {
      console.error('IndexedDB delete error:', error);
    }
  }

  /**
   * 清空整个 IndexedDB 表。
   */
  async clear(): Promise<void> {
    try {
      await db.requests.clear();
    } catch (error) {
      console.error('IndexedDB clear error:', error);
    }
  }

  /**
   * 清理过期的缓存记录。
   * @param maxAge - 缓存最大年龄（毫秒）。
   */
  async cleanup(maxAge: number): Promise<void> {
    try {
      const cutoff = Date.now() - maxAge;
      await db.requests.where('lastAccess').below(cutoff).delete();
    } catch (error) {
      console.error('IndexedDB cleanup error:', error);
    }
  }
}

export const indexedDBCache = new IndexedDBCache();