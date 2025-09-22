import type { EChartsType } from 'echarts/core'

// 全局 Map，用于存储 ECharts 图表实例，key 为组件 id，value 为实例
const echartsInstanceMap = new Map<string, EChartsType>()

/**
 * 注册（或更新）图表实例
 * @param id   组件唯一 id
 * @param inst ECharts 实例
 */
export function setEChartsInstance(id: string, inst: EChartsType) {
  echartsInstanceMap.set(id, inst)
}

/**
 * 根据组件 id 获取对应的 ECharts 实例
 * @param id 组件唯一 id
 */
export function getEChartsInstance(id: string): EChartsType | undefined {
  return echartsInstanceMap.get(id)
}

/**
 * 移除已被销毁的图表实例
 * @param id 组件唯一 id
 */
export function removeEChartsInstance(id: string) {
  echartsInstanceMap.delete(id)
}

// 仅供调试：暴露整个 Map
export { echartsInstanceMap }