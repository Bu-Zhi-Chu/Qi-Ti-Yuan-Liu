/**
 * move-dom.util.ts
 * -------------------------------------------------------------
 * 封装“整体移动 DOM（按住 V 拖动）”的一揽子流程：
 * 1. 解析初始定位属性/单位
 * 2. 将鼠标位移(屏幕像素)转换为设计像素
 * 3. 计算并按原单位生成新的 left/top 或 marginLeft/marginTop
 * 4. 直接写入 DOM style
 * 5. 持久化到节点属性(store / IndexedDB)
 * -------------------------------------------------------------
 */

import { getScaleRatio } from './get-scale-ratio.util'

export interface MoveDomParams {
  /** 目标元素 */
  targetEl: HTMLElement
  /** 节点唯一标识，用于持久化 */
  nodeId: string
  /** 鼠标在屏幕坐标系下的位移 */
  dxScreen: number
  dyScreen: number
  /** 画布缩放比例 */
  scale: number
  /** 拖拽开始时读取的 initialLeft / initialTop 原始字符串 */
  initialLeft: string
  initialTop: string
  /** 拖拽开始时解析出的单位 */
  initialLeftUnit: string
  initialTopUnit: string
  /** 拖拽开始时判断出的布局是否 static */
  isStaticLayout: boolean
  /** 用于写库/IndexedDB 的更新函数 */
  updateNodeProps: (id: string, props: any) => void
  /** 拖动过程中的回调(可选) */
  onAdjust?: (payload: { nodeId: string; x: number; y: number }) => void
}

/** 提取数值 */
const extractNumeric = (val: string): number => parseFloat(val.replace(/[^\d.-]/g, '')) || 0

/**
 * 按给定屏幕位移量(dxScreen,dyScreen)整体移动 DOM，内部自动处理单位和数据存储。
 * 返回设计像素级别的 { x, y } 偏移量，方便调用方继续使用。
 */
export function moveDomByOffset(params: MoveDomParams): { x: number; y: number } {
  const {
    targetEl,
    nodeId,
    dxScreen,
    dyScreen,
    scale,
    initialLeft,
    initialTop,
    initialLeftUnit,
    initialTopUnit,
    isStaticLayout,
    updateNodeProps,
    onAdjust
  } = params

  // 全局缩放比(高分屏) —— 和 adjust-mode.action.ts 中保持一致
  const sr = getScaleRatio() || 1

  // 1. 将屏幕像素位移换算为“设计像素”
  const dxDesign = dxScreen / (initialLeftUnit === '%' ? scale : scale * sr)
  const dyDesign = dyScreen / (initialTopUnit === '%' ? scale : scale * sr)

  // 2. 若初始单位为 %，先转换为像素，计算时统一使用像素
  const parentEl = targetEl.parentElement as HTMLElement | null
  const parentWidth = parentEl?.offsetWidth || 1
  const parentHeight = parentEl?.offsetHeight || 1

  let initLeftPx = extractNumeric(initialLeft)
  let initTopPx = extractNumeric(initialTop)
  if (initialLeftUnit === '%') {
    initLeftPx = (initLeftPx / 100) * parentWidth
  }
  if (initialTopUnit === '%') {
    // 核心修正：静态布局下，margin-top 的百分比基于父容器【宽度】；绝对布局下 top 才基于【高度】
    const base = isStaticLayout ? parentWidth : parentHeight
    initTopPx = (initTopPx / 100) * base
  }

  // 3. 计算新位置(像素)
  const newLeftPx = initLeftPx + dxDesign
  const newTopPx = initTopPx + dyDesign

  // 4. 按原始单位生成字符串
  const newLeftStr =
    initialLeftUnit === '%'
      ? `${(newLeftPx / parentWidth) * 100}%`
      : `calc(${Math.round(newLeftPx)}px * var(--scale-ratio, 1))`
  const newTopStr =
    initialTopUnit === '%'
      ? `${(newTopPx / (isStaticLayout ? parentWidth : parentHeight)) * 100}%`
      : `calc(${Math.round(newTopPx)}px * var(--scale-ratio, 1))`

  // 5. 写入 DOM（仅在对应位移非 0 时更新，避免不必要的抖动）
  if (dxScreen !== 0) {
    if (isStaticLayout) {
      (targetEl.style as any).marginLeft = newLeftStr
    } else {
      targetEl.style.left = newLeftStr
    }
  }
  if (dyScreen !== 0) {
    if (isStaticLayout) {
      (targetEl.style as any).marginTop = newTopStr
    } else {
      targetEl.style.top = newTopStr
    }
  }

  // 6. 实时写库
  const styles: Record<string, string> = {}
  if (dxScreen !== 0) {
    if (isStaticLayout) {
      styles.marginLeft = newLeftStr
    } else {
      styles.left = newLeftStr
    }
  }
  if (dyScreen !== 0) {
    if (isStaticLayout) {
      styles.marginTop = newTopStr
    } else {
      styles.top = newTopStr
    }
  }
  updateNodeProps(nodeId, { styles })

  // 7. 回调
  onAdjust?.({ nodeId, x: newLeftPx, y: newTopPx })

  return { x: newLeftPx, y: newTopPx }
}