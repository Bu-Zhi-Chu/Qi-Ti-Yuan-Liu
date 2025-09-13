import { writable } from 'svelte/store'

// 全局性能监视开关（FPS / 内存）
// 默认开启 true
export const perfMonitorEnabled = writable<boolean>(true)