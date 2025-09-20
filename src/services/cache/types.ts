// z/X/qi-qiao-ban/src/services/cache/types.ts

/**
 * 缓存记录结构
 */
export interface CacheRecord<T = any> {
  key: string;           // 请求唯一标识：Method + 排序后 URL+Query+Body（不同参数=不同 key）
  url: string;          // 请求路径（不含参数）
  params: string;       // 排序后 Query/Body 字符串，便于单独分析
  data: T;            // 响应数据
  lastAccess: number;   // 最后访问时间戳（毫秒）
  etag?: string;        // 数据版本标识
}

/**
 * cachedFetch 函数的配置选项
 */
export interface CacheConfig<T = any> {
  forceRefresh?: boolean;    // 强制刷新，跳过缓存
  onUpdate?: (data: T) => void; // 后台数据更新回调
}