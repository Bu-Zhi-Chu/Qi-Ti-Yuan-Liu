
import { cleanupCache } from '../database/cache-store.service';
import { CACHE_CLEANUP_INTERVAL, CACHE_MAX_AGE } from '../../config/config';



let cleanupTimer: ReturnType<typeof setInterval> | undefined;

/**
 * 执行缓存清理任务。
 */
async function runCleanup(): Promise<void> {
  console.log('Running cache cleanup...');
  try {
    await cleanupCache(CACHE_MAX_AGE);
    console.log('Cache cleanup finished.');
  } catch (error) {
    console.error('Error during cache cleanup:', error);
  }
}

/**
 * 启动定期缓存清理。
 * 如果已经有一个计时器在运行，它会先被清除。
 */
export function startCacheCleanup(): void {
  // 确保在浏览器环境中运行
  if (typeof window === 'undefined') {
    return;
  }

  // 如果已经有一个计时器在运行，先停止它
  if (cleanupTimer) {
    stopCacheCleanup();
  }

  if ('requestIdleCallback' in window) {
    // 使用 requestIdleCallback 来避免影响主线程性能
    // 立即执行一次，然后在后台定期执行
    (window as any).requestIdleCallback(runCleanup);
    cleanupTimer = setInterval(() => {
      (window as any).requestIdleCallback(runCleanup);
    }, CACHE_CLEANUP_INTERVAL);
  } else {
    // 兼容不支持 requestIdleCallback 的环境
    runCleanup(); // 立即执行
    cleanupTimer = setInterval(runCleanup, CACHE_CLEANUP_INTERVAL);
  }
}

/**
 * 停止定期缓存清理。
 */
export function stopCacheCleanup(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = undefined;
  }
}