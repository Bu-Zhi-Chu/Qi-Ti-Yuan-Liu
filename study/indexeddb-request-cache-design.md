# IndexedDB 数据请求缓存机制设计

## 概述

本文档详细描述了基于 IndexedDB 的通用数据请求缓存机制的设计方案，该方案采用"缓存优先"策略，能够显著提升应用性能和用户体验。

## 核心设计思路

### 缓存策略
- **缓存优先 (Cache First)**：优先返回缓存数据，然后异步更新
- **渐进式更新**：先展示缓存，后台对比更新
- **离线可用**：网络断开时仍可提供基础功能

### 技术架构
```
用户请求 → 检查缓存 → 返回缓存数据 → 异步请求真实数据 → 对比更新 → 更新缓存
```

## 详细实现方案

### 1. 缓存层设计

#### IndexedDB 表结构
```javascript
// 缓存表结构
interface CacheRecord {
  key: string;           // 请求唯一标识 (URL + params)
  data: any;            // 响应数据
  timestamp: number;    // 缓存时间戳
  etag?: string;        // 数据版本标识
  expires: number;      // 过期时间
}

// 数据库配置
const DB_CONFIG = {
  name: 'RequestCache',
  version: 1,
  stores: {
    cache: {
      keyPath: 'key',
      indexes: ['timestamp', 'expires']
    }
  }
}
```

#### 缓存键生成策略
```javascript
function generateCacheKey(url: string, params: any): string {
  const paramsStr = JSON.stringify(params || {});
  return `${url}:${paramsStr}`;
}
```

### 2. 缓存管理器实现

#### 核心缓存管理类
```javascript
class RequestCacheManager {
  private db: Dexie;
  private defaultTTL: number = 5 * 60 * 1000; // 5分钟默认过期

  constructor() {
    this.db = new Dexie(DB_CONFIG.name);
    this.initDatabase();
  }

  // 初始化数据库
  private async initDatabase() {
    this.db.version(DB_CONFIG.version).stores({
      cache: 'key, timestamp, expires'
    });
  }

  // 获取缓存数据
  async getCache(key: string): Promise<CacheRecord | null> {
    try {
      const record = await this.db.cache.get(key);
      if (!record) return null;

      // 检查是否过期
      if (Date.now() > record.expires) {
        await this.deleteCache(key);
        return null;
      }

      return record;
    } catch (error) {
      console.warn('Cache get error:', error);
      return null;
    }
  }

  // 设置缓存数据
  async setCache(key: string, data: any, ttl?: number): Promise<void> {
    try {
      const record: CacheRecord = {
        key,
        data,
        timestamp: Date.now(),
        expires: Date.now() + (ttl || this.defaultTTL)
      };

      await this.db.cache.put(record);
    } catch (error) {
      console.warn('Cache set error:', error);
    }
  }

  // 删除缓存
  async deleteCache(key: string): Promise<void> {
    try {
      await this.db.cache.delete(key);
    } catch (error) {
      console.warn('Cache delete error:', error);
    }
  }

  // 清理过期缓存
  async cleanupExpiredCache(): Promise<void> {
    try {
      const now = Date.now();
      await this.db.cache.where('expires').below(now).delete();
    } catch (error) {
      console.warn('Cache cleanup error:', error);
    }
  }
}
```

### 3. 请求缓存包装器

#### 带缓存的请求函数
```javascript
class CachedRequestService {
  private cacheManager: RequestCacheManager;

  constructor() {
    this.cacheManager = new RequestCacheManager();
  }

  // 带缓存的请求方法
  async cachedRequest<T>(
    url: string,
    options: RequestInit = {},
    cacheConfig: {
      ttl?: number;
      forceRefresh?: boolean;
      onUpdate?: (data: T) => void;
    } = {}
  ): Promise<T> {
    const { ttl, forceRefresh = false, onUpdate } = cacheConfig;
    const cacheKey = generateCacheKey(url, options.body);

    // 步骤1: 尝试获取缓存数据
    if (!forceRefresh) {
      const cachedData = await this.cacheManager.getCache(cacheKey);
      if (cachedData) {
        // 立即返回缓存数据
        const cacheResult = cachedData.data;

        // 步骤2: 异步获取最新数据并对比
        this.fetchAndCompare(url, options, cacheKey, cacheResult, onUpdate).catch(error => {
          console.warn('Background update failed:', error);
        });

        return cacheResult;
      }
    }

    // 步骤3: 无缓存或强制刷新，直接请求
    const response = await this.fetchWithTimeout(url, options);
    const data = await response.json();

    // 步骤4: 更新缓存
    await this.cacheManager.setCache(cacheKey, data, ttl);

    return data;
  }

  // 后台对比更新逻辑
  private async fetchAndCompare<T>(
    url: string,
    options: RequestInit,
    cacheKey: string,
    cachedData: T,
    onUpdate?: (data: T) => void
  ): Promise<void> {
    try {
      const response = await this.fetchWithTimeout(url, options);
      const newData = await response.json();

      // 数据对比逻辑
      if (this.isDataDifferent(cachedData, newData)) {
        // 数据有更新
        await this.cacheManager.setCache(cacheKey, newData);

        if (onUpdate) {
          onUpdate(newData);
        }
      }
    } catch (error) {
      console.warn('Background fetch failed:', error);
    }
  }

  // 数据对比函数
  private isDataDifferent(oldData: any, newData: any): boolean {
    return JSON.stringify(oldData) !== JSON.stringify(newData);
  }

  // 带超时的fetch
  private async fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
}
```

### 4. 使用示例

#### 基础使用
```javascript
const cacheService = new CachedRequestService();

// 基础缓存请求
const data = await cacheService.cachedRequest('/api/charts/data');

// 自定义缓存时间 (10分钟)
const data2 = await cacheService.cachedRequest(
  '/api/charts/data',
  {},
  { ttl: 10 * 60 * 1000 }
);
```

#### 带更新回调的使用
```javascript
// 图表数据缓存，支持实时更新
const chartData = await cacheService.cachedRequest(
  '/api/charts/bar-chart',
  {},
  {
    ttl: 5 * 60 * 1000,
    onUpdate: (newData) => {
      // 当后台发现数据更新时调用
      updateChart(newData);
      showUpdateNotification('图表数据已更新');
    }
  }
);
```

#### 强制刷新
```javascript
// 强制获取最新数据
const freshData = await cacheService.cachedRequest(
  '/api/charts/data',
  {},
  { forceRefresh: true }
);
```

## 性能优化策略

### 1. 内存缓存层
```javascript
class MemoryCache {
  private cache = new Map<string, { data: any; expires: number }>();
  private maxSize = 100; // 最大缓存数量

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  set(key: string, data: any, ttl: number): void {
    if (this.cache.size >= this.maxSize) {
      // LRU清理策略
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      expires: Date.now() + ttl
    });
  }
}
```

### 2. 缓存预热
```javascript
// 应用启动时预加载关键数据
async function preloadCriticalData() {
  const criticalEndpoints = [
    '/api/user/config',
    '/api/charts/default-data',
    '/api/navigation/menu'
  ];

  for (const endpoint of criticalEndpoints) {
    try {
      await cacheService.cachedRequest(endpoint);
    } catch (error) {
      console.warn(`Preload failed for ${endpoint}:`, error);
    }
  }
}
```

### 3. 智能缓存清理
```javascript
// 定期清理策略
class CacheCleanupService {
  constructor(private cacheManager: RequestCacheManager) {}

  // 基于使用频率的清理
  async cleanupByUsage(): Promise<void> {
    // 清理最久未使用的缓存
    await this.cacheManager.cleanupExpiredCache();
  }

  // 基于存储空间的清理
  async cleanupByStorage(): Promise<void> {
    const usage = await navigator.storage?.estimate();
    if (usage && usage.usage / usage.quota > 0.8) {
      // 存储使用率超过80%，清理缓存
      await this.cleanupByUsage();
    }
  }
}
```

## 错误处理与降级

### 1. 网络异常处理
```javascript
async cachedRequestWithFallback<T>(
  url: string,
  options: RequestInit = {},
  fallbackData?: T
): Promise<T> {
  try {
    return await this.cachedRequest<T>(url, options);
  } catch (error) {
    if (fallbackData) {
      console.warn('Request failed, using fallback data:', error);
      return fallbackData;
    }
    throw error;
  }
}
```

### 2. 缓存异常降级
```javascript
async safeCachedRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    // 尝试缓存请求
    return await this.cachedRequest<T>(url, options);
  } catch (cacheError) {
    console.warn('Cache failed, falling back to direct request:', cacheError);

    try {
      // 缓存失败，直接请求
      const response = await fetch(url, options);
      return await response.json();
    } catch (requestError) {
      console.error('Both cache and direct request failed:', requestError);
      throw requestError;
    }
  }
}
```

## 数据一致性保障

### 1. 版本控制
```javascript
interface CacheRecord {
  key: string;
  data: any;
  timestamp: number;
  version: string;      // 数据版本
  etag?: string;        // HTTP ETag
}

// 带版本检查的请求
async cachedRequestWithVersion<T>(
  url: string,
  currentVersion?: string
): Promise<T> {
  const cacheKey = generateCacheKey(url);
  const cached = await this.cacheManager.getCache(cacheKey);

  if (cached && cached.version === currentVersion) {
    return cached.data;
  }

  // 版本不匹配或没有缓存，重新请求
  const response = await fetch(url);
  const newData = await response.json();
  const newVersion = response.headers.get('X-Data-Version');

  await this.cacheManager.setCache(cacheKey, newData);
  return newData;
}
```

### 2. 增量更新
```javascript
// 支持增量数据更新的缓存
async cachedRequestWithDelta<T>(
  url: string,
  deltaUrl: string
): Promise<T> {
  const cacheKey = generateCacheKey(url);
  const cached = await this.cacheManager.getCache(cacheKey);

  if (cached) {
    // 获取增量更新
    const deltaResponse = await fetch(deltaUrl);
    const deltaData = await deltaResponse.json();

    // 合并增量数据
    const updatedData = this.mergeDeltaData(cached.data, deltaData);
    await this.cacheManager.setCache(cacheKey, updatedData);

    return updatedData;
  }

  // 没有缓存，获取全量数据
  const response = await fetch(url);
  const fullData = await response.json();
  await this.cacheManager.setCache(cacheKey, fullData);

  return fullData;
}
```

## 监控与调试

### 1. 缓存命中率监控
```javascript
class CacheMetrics {
  private hits = 0;
  private misses = 0;
  private updates = 0;

  recordHit(): void {
    this.hits++;
  }

  recordMiss(): void {
    this.misses++;
  }

  recordUpdate(): void {
    this.updates++;
  }

  getHitRate(): number {
    const total = this.hits + this.misses;
    return total === 0 ? 0 : this.hits / total;
  }

  getMetrics() {
    return {
      hits: this.hits,
      misses: this.misses,
      updates: this.updates,
      hitRate: this.getHitRate()
    };
  }
}
```

### 2. 调试模式
```javascript
// 开发环境调试信息
if (process.env.NODE_ENV === 'development') {
  window.__CACHE_DEBUG__ = {
    getCacheStatus: async (key: string) => {
      return await cacheManager.getCache(key);
    },
    clearAllCache: async () => {
      await cacheManager.clearAll();
    },
    getMetrics: () => {
      return cacheMetrics.getMetrics();
    }
  };
}
```

## 最佳实践建议

### 1. 缓存策略选择
- **静态数据**：长时间缓存 (1小时-24小时)
- **半动态数据**：中等时间缓存 (5-30分钟)
- **实时数据**：短时间缓存 (30秒-5分钟)
- **用户相关数据**：谨慎缓存或禁用缓存

### 2. 缓存键设计
- 包含所有影响响应的参数
- 避免过长的键名
- 考虑敏感信息的脱敏处理

### 3. 错误处理
- 始终提供降级方案
- 记录关键错误信息
- 设置合理的超时时间

### 4. 性能优化
- 定期清理过期缓存
- 合理设置缓存大小限制
- 使用内存缓存作为第一层

## 总结

基于 IndexedDB 的数据请求缓存机制通过"缓存优先"策略，能够：

1. **显著提升用户体验**：减少等待时间，支持离线访问
2. **降低服务器压力**：减少重复请求，节省带宽
3. **增强应用稳定性**：提供网络异常时的降级方案
4. **支持渐进式更新**：后台对比更新，保持数据新鲜度

该方案特别适合图表类应用，能够有效处理大量数据请求的缓存需求，同时保持数据的实时性和一致性。