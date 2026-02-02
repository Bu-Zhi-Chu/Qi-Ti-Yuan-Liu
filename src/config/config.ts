/** 应用配置 */

/** 授权验证开关 */
export const ENABLE_AUTH_VERIFICATION = false

/** 授权验证目标URL */
export const TARGET_URL = 'https://buzhichu.netlify.app/societies/99%20asset/json/qi-qiao-ban.json'
/** 授权验证间隔时间（毫秒） */
export const VERIFICATION_INTERVAL = 10 * 60 * 1000
/** 授权缓存过期时间（毫秒） */
export const CACHE_EXPIRY_TIME = 5 * 60 * 1000

/** CORS代理URL */
export const PROXY_URL = 'https://api.allorigins.win/get?url='

/** 数据库配置 */
export const DEFAULT_DB_NAME = 'qi-ti-yuan-liu'
export const DB_VERSION = 1

/** 缓存配置 */
export const CACHE_MAX_SIZE = 100 // 内存缓存的最大记录数
export const CACHE_CLEANUP_INTERVAL = 24 * 60 * 60 * 1000 // 缓存清理间隔时间（毫秒）
export const CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000 // 缓存最长保留时间（毫秒）

/** 图片处理配置 */
export const LQIP_QUALITY = 0.6 // 低分辨率占位图输出质量（0-1）
