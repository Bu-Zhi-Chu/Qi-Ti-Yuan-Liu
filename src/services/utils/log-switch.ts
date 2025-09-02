// 通用日志开关工具
const __originLog = (console as any).__originLog || console.log.bind(console)
;(console as any).__originLog = __originLog

/**
 * 根据配置启用或禁用 console.log
 * @param enable true 启用日志，false 关闭日志
 */
export function applyLogConfig(enable: boolean) {
  console.log = enable ? __originLog : () => {}
}