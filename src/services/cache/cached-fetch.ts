
import { generateCacheKey } from './cache-key';
import { memoryCache } from './memory-cache';
import { getCache, setCache } from '../database/cache-store.service';
import { startCacheCleanup } from './cache-cleanup';
import type { CacheConfig, CacheRecord } from './types';

// 启动后台缓存清理
startCacheCleanup();

// 用于跟踪正在进行的请求，以避免并发重复请求
const ongoingRequests = new Map<string, Promise<any>>();

function shouldIgnoreError(err: unknown): boolean {
    return (
        !!err &&
        typeof err === 'object' &&
        'name' in err &&
        (err as any).name === 'AbortError'
    );
}

function normalizeUrlInput(raw: string): string {
    let s = (raw || '').trim();
    if (!s) return '';

    if (
        (s.startsWith('`') && s.endsWith('`')) ||
        (s.startsWith('"') && s.endsWith('"')) ||
        (s.startsWith("'") && s.endsWith("'"))
    ) {
        s = s.slice(1, -1).trim();
    }

    while (s && /[`\s"'(<]/.test(s[0])) s = s.slice(1);
    while (s && /[`\s"'()<>:,]/.test(s[s.length - 1])) s = s.slice(0, -1);

    return s.trim();
}

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
    const normalizedUrl = normalizeUrlInput(url);
    const effectiveUrl = normalizedUrl || url;
    const legacyUrl = normalizedUrl && normalizedUrl !== url ? url : '';

    if (legacyUrl) {
        console.log(`[CacheFlow] step=url-normalize from=${url} to=${normalizedUrl}`);
    }

    const key = await generateCacheKey(effectiveUrl, options);
    const legacyKey = legacyUrl ? await generateCacheKey(legacyUrl, options) : '';
    console.log(`[CacheFlow] start url=${effectiveUrl} method=${(options.method || 'GET').toUpperCase()}`);
    console.log(`[CacheFlow] step=key key=${key}${legacyKey ? ` legacyKey=${legacyKey}` : ''}`);
    console.log(`[Cache] Generated key for URL (${effectiveUrl}): ${key}`);

    // --- 并发处理 ---
    if (ongoingRequests.has(key)) {
        console.log(`[CacheFlow] step=dedupe-hit key=${key}`);
        console.log(`[Cache] Request for key ${key} is already ongoing. Returning existing promise.`);
        return ongoingRequests.get(key)!;
    }

    const requestPromise = (async () => {
        try {
            // 1. 强制刷新或非 GET 请求，直接发起网络请求
            if (config.forceRefresh || (options.method && options.method.toUpperCase() !== 'GET')) {
                console.log(`[CacheFlow] step=force-network key=${key}`);
                console.log(`[Cache] Force refresh or non-GET method. Fetching from network for key: ${key}`);
                return await networkFetchAndCache<T>(effectiveUrl, options, key);
            }

            // 2. 检查内存缓存
            console.log(`[Cache] Checking memory cache for key: ${key}`);
            const memoryRecord = memoryCache.get<T>(key);
            if (memoryRecord) {
                console.log(`[CacheFlow] step=memory-hit key=${key} action=return-cache`);
                console.log(`[Cache] Memory cache HIT for key: ${key}`, memoryRecord);
                // 异步更新后台数据
                if (config.onUpdate) {
                    console.log(`[CacheFlow] step=revalidate-start key=${key} source=memory`);
                    networkFetchAndCache<T>(effectiveUrl, options, key)
                        .then(config.onUpdate)
                        .catch((err) => {
                            if (shouldIgnoreError(err)) return;
                            console.error(err);
                        });
                }
                return memoryRecord.data;
            }
            console.log(`[CacheFlow] step=memory-miss key=${key}`);
            console.log(`[Cache] Memory cache MISS for key: ${key}`);


            // 3. 检查 IndexedDB 缓存
            console.log(`[Cache] Checking IndexedDB cache for key: ${key}`);
            const dbRecord = await getCache<T>(key);
            if (dbRecord) {
                console.log(`[CacheFlow] step=indexeddb-hit key=${key} action=return-cache`);
                console.log(`[Cache] IndexedDB HIT for key: ${key}`, dbRecord);
                // 将数据存入内存缓存以备下次快速访问
                memoryCache.set(key, dbRecord);
                // 异步更新后台数据
                if (config.onUpdate) {
                    console.log(`[CacheFlow] step=revalidate-start key=${key} source=indexeddb`);
                    networkFetchAndCache<T>(effectiveUrl, options, key)
                        .then(config.onUpdate)
                        .catch((err) => {
                            if (shouldIgnoreError(err)) return;
                            console.error(err);
                        });
                }
                return dbRecord.data;
            }
            console.log(`[CacheFlow] step=indexeddb-miss key=${key}`);
            console.log(`[Cache] IndexedDB MISS for key: ${key}`);

            if (legacyKey) {
                console.log(`[CacheFlow] step=legacy-lookup legacyKey=${legacyKey}`);
                const legacyMemory = memoryCache.get<T>(legacyKey);
                if (legacyMemory) {
                    console.log(`[CacheFlow] step=legacy-memory-hit legacyKey=${legacyKey} action=migrate-to-key`);
                    const migrated: CacheRecord<T> = { ...legacyMemory, key, url: effectiveUrl };
                    memoryCache.set(key, migrated);
                    await setCache(migrated);
                    if (config.onUpdate) {
                        console.log(`[CacheFlow] step=revalidate-start key=${key} source=legacy-memory`);
                        networkFetchAndCache<T>(effectiveUrl, options, key)
                            .then(config.onUpdate)
                            .catch((err) => {
                                if (shouldIgnoreError(err)) return;
                                console.error(err);
                            });
                    }
                    return legacyMemory.data;
                }

                const legacyDb = await getCache<T>(legacyKey);
                if (legacyDb) {
                    console.log(`[CacheFlow] step=legacy-indexeddb-hit legacyKey=${legacyKey} action=migrate-to-key`);
                    const migrated: CacheRecord<T> = { ...legacyDb, key, url: effectiveUrl };
                    memoryCache.set(key, migrated);
                    await setCache(migrated);
                    if (config.onUpdate) {
                        console.log(`[CacheFlow] step=revalidate-start key=${key} source=legacy-indexeddb`);
                        networkFetchAndCache<T>(effectiveUrl, options, key)
                            .then(config.onUpdate)
                            .catch((err) => {
                                if (shouldIgnoreError(err)) return;
                                console.error(err);
                            });
                    }
                    return legacyDb.data;
                }
            }

            // 4. 如果缓存未命中，则执行网络请求
            console.log(`[CacheFlow] step=network-fetch key=${key} reason=all-miss`);
            console.log(`[Cache] All caches MISS for key: ${key}. Fetching from network...`);
            return await networkFetchAndCache<T>(effectiveUrl, options, key);

        } finally {
            // 请求完成后，从正在进行的请求映射中移除
            ongoingRequests.delete(key);
            console.log(`[CacheFlow] step=done key=${key}`);
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
    console.log(`[CacheFlow] step=network-start key=${key}`);
    console.log(`[Cache] Executing network fetch for key: ${key}`);
    const response = await fetch(url, options);

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`[CacheFlow] step=network-ok key=${key} action=store-cache`);

    const record: CacheRecord<T> = {
        key,
        url,
        params: JSON.stringify(options.body || {}),
        data,
        lastAccess: Date.now(),
        etag: response.headers.get('etag') || undefined,
    };

    console.log(`[Cache] Storing new record in cache for key: ${key}`, record);
    // 同时写入内存和 IndexedDB 缓存
    memoryCache.set(key, record);
    await setCache(record);

    return data;
}
