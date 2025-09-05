// 通用日志开关工具
const __originLog = (console as any).__originLog || console.log.bind(console)
  ; (console as any).__originLog = __originLog

// 额外存储 info、debug 原始方法，避免多次替换导致丢失
const __originInfo = (console as any).__originInfo || console.info.bind(console)
  ; (console as any).__originInfo = __originInfo
const __originDebug = (console as any).__originDebug || console.debug.bind(console)
  ; (console as any).__originDebug = __originDebug

/**
 * 根据配置启用或禁用 console.log
 * @param enable true 启用日志，false 关闭日志
 */
export function applyLogConfig(enable: boolean) {
  console.log = enable ? __originLog : () => { }
  console.info = enable ? __originInfo : () => { }
  console.debug = enable ? __originDebug : () => { }
}