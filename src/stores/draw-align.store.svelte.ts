/**
 * draw-align.store.svelte.ts
 * --------------------------------------------------------------
 * 对齐辅助线状态管理（Svelte 5 Runes）
 *
 * 提供绘制模式下的对齐辅助线状态管理：
 * - openState       ：是否启用对齐检测
 * - guidelinesState ：当前需渲染的辅助线集合
 *
 * 设计要点：
 * 1. 组件化：与 draw-mode.store 解耦，避免文件过大。
 * 2. 高性能：对齐检测结果以列表形式批量更新，避免频繁 push/shift。
 * 3. API 语义化：开启/关闭/设置/清空 四个操作函数。
 */



/** 辅助线类型 */
export type Guideline =
  | { type: 'vertical'; /** 相对于父元素的 X 坐标(px) */ position: number }
  | { type: 'horizontal'; /** 相对于父元素的 Y 坐标(px) */ position: number }

/* -------------------------------------------------------------------------- */
/*                               Runes 状态声明                               */
/* -------------------------------------------------------------------------- */

/** 是否已启用对齐检测（由 B 键按下/抬起控制） */
let openState = $state(false)
/** 当前需要渲染的辅助线列表 */
let guidelinesState = $state<Guideline[]>([])

/* -------------------------------------------------------------------------- */
/*                               状态读取函数                                 */
/* -------------------------------------------------------------------------- */

/** 对齐检测是否开启 */
export function isAlignOpen(): boolean {
  return openState
}

/** 当前辅助线列表 */
export function guidelines(): Guideline[] {
  return guidelinesState
}

/* -------------------------------------------------------------------------- */
/*                               状态修改函数                                 */
/* -------------------------------------------------------------------------- */

/** 开启对齐检测 */
export function openAlign(): void {
  openState = true
}

/** 关闭对齐检测并清空辅助线 */
export function closeAlign(): void {
  openState = false
  guidelinesState = []
}

/**
 * 批量设置辅助线
 * @param lines Guideline[]
 */
export function setGuidelines(lines: Guideline[]): void {
  guidelinesState = lines
}

/** 清空辅助线 */
export function clearGuidelines(): void {
  guidelinesState = []
}