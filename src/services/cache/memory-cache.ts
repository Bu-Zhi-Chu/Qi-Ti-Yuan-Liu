// z/X/qi-qiao-ban/src/services/cache/memory-cache.ts

import type { CacheRecord } from './types';

const MAX_SIZE = 100; // 内存缓存的最大记录数

class MemoryCache {
  private cache = new Map<string, CacheRecord>();
  private lruKeys: string[] = []; // 用于实现 LRU

  /**
   * 从内存缓存中获取一条记录。
   * @param key - 缓存键。
   * @returns 缓存记录或 undefined。
   */
  get<T>(key: string): CacheRecord<T> | undefined {
    const record = this.cache.get(key);
    if (record) {
      // 将访问过的 key 移动到队尾，表示最近使用
      this.updateLru(key);
      record.lastAccess = Date.now();
      return record as CacheRecord<T>;
    }
    return undefined;
  }

  /**
   *向内存缓存中设置一条记录。
   * @param key - 缓存键。
   * @param record - 要缓存的记录。
   */
  set<T>(key: string, record: CacheRecord<T>): void {
    if (this.cache.size >= MAX_SIZE && !this.cache.has(key)) {
      // 如果缓存已满且是新记录，则移除最久未使用的记录
      const oldestKey = this.lruKeys.shift();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(key, record);
    this.updateLru(key);
  }

  /**
   * 从内存缓存中删除一条记录。
   * @param key - 缓存键。
   */
  delete(key: string): void {
    this.cache.delete(key);
    const index = this.lruKeys.indexOf(key);
    if (index > -1) {
      this.lruKeys.splice(index, 1);
    }
  }

  /**
   * 清空整个内存缓存。
   */
  clear(): void {
    this.cache.clear();
    this.lruKeys = [];
  }

  /**
   * 更新 LRU 列表，将指定键移至末尾。
   * @param key - 要更新的键。
   */
  private updateLru(key: string): void {
    const index = this.lruKeys.indexOf(key);
    if (index > -1) {
      // 如果 key 已存在，先移除
      this.lruKeys.splice(index, 1);
    }
    // 将 key 添加到队尾
    this.lruKeys.push(key);
  }
}

export const memoryCache = new MemoryCache();