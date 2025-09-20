// z/X/qi-qiao-ban/src/services/cache/cached-fetch.ts

import { generateCacheKey } from './cache-key';
import { memoryCache } from './memory-cache';
import { indexedDBCache } from './indexeddb-cache';
import { startCacheCleanup } from './cache-cleanup';
import type { CacheConfig, CacheRecord } from './types';

// 启动后台缓存清理
startCacheCleanup();

// 用于跟踪正在进行的请求，以避免并发重复请求
const ongoingRequests = new Map<string, Promise<any>>();

/**
 * 一个带有缓存功能的 fetch 实现。
 * @param url - 请求的 URL。
 * @param options - fetch 的请求选项。
 * @param config - 缓存配置。
 * @returns 返回一个解析为 Response 对象的 Promise。
 */
export async function cachedFetch<T = any>(
  url: string,
  options: RequestInit = {},
  config: CacheConfig<T> = {}
): Promise<T> {
  const key = await generateCacheKey(url, options);

  // --- 并发处理 ---
  if (ongoingRequests.has(key)) {
    return ongoingRequests.get(key)!;
  }

  const requestPromise = (async () => {
    try {
      // 1. 强制刷新或非 GET 请求，直接发起网络请求
      if (config.forceRefresh || options.method?.toUpperCase() !== 'GET') {
        return await networkFetchAndCache<T>(url, options, key);
      }

      // 2. 检查内存缓存
      const memoryRecord = memoryCache.get<T>(key);
      if (memoryRecord) {
        // 异步更新后台数据
        if (config.onUpdate) {
          networkFetchAndCache<T>(url, options, key).then(config.onUpdate).catch(console.error);
        }
        return memoryRecord.data;
      }

      // 3. 检查 IndexedDB 缓存
      const dbRecord = await indexedDBCache.get<T>(key);
      if (dbRecord) {
        // 将数据存入内存缓存以备下次快速访问
        memoryCache.set(key, dbRecord);
        // 异步更新后台数据
        if (config.onUpdate) {
          networkFetchAndCache<T>(url, options, key).then(config.onUpdate).catch(console.error);
        }
        return dbRecord.data;
      }

      // 4. 如果缓存未命中，则执行网络请求
      return await networkFetchAndCache<T>(url, options, key);

    } finally {
      // 请求完成后，从正在进行的请求映射中移除
      ongoingRequests.delete(key);
    }
  })();

  // 将 Promise 存入正在进行的请求映射
  ongoingRequests.set(key, requestPromise);

  return requestPromise;
}

/**
 * 执行网络请求并将结果存入缓存。
 * @param url - 请求的 URL。
 * @param options - fetch 的请求选项。
 * @param key - 缓存键。
 * @returns 返回网络请求的响应数据。
 */
async function networkFetchAndCache<T>(
  url: string,
  options: RequestInit,
  key: string
): Promise<T> {
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();

  const record: CacheRecord<T> = {
    key,
    url,
    params: JSON.stringify(options.body || {}),
    data,
    lastAccess: Date.now(),
    etag: response.headers.get('etag') || undefined,
  };

  // 同时写入内存和 IndexedDB 缓存
  memoryCache.set(key, record);
  await indexedDBCache.set(key, record);

  return data;
}