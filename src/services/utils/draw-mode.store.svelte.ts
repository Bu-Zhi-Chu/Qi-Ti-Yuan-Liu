/**
 * draw-mode.store.ts
 * 绘画模式状态管理 - 使用 Svelte 5 Runes
 *
 * 提供绘画模式相关状态管理，解耦自 DomCanvas 组件
 * 用于控制绘画模式开关状态、绘制中状态、绘制区域等信息
 */

// 绘画模式开关状态
let isDrawModeState = $state(false);

// 绘制中状态
let isDrawingState = $state(false);

// 绘制起点
let drawStartState = $state<{ x: number; y: number } | null>(null);

// 绘制矩形
let drawRectState = $state<{ left: number; top: number; width: number; height: number } | null>(null);

// 目标节点ID
let targetNodeIdState = $state<string | null>(null);

// 导出状态读取函数
export function isDrawMode() {
  return isDrawModeState;
}

export function isDrawing() {
  return isDrawingState;
}

export function drawStart() {
  return drawStartState;
}

export function drawRect() {
  return drawRectState;
}

export function targetNodeId() {
  return targetNodeIdState;
}

/**
 * 开启绘画模式
 */
export function enterDrawMode(): void {
  isDrawModeState = true;
  document.body.style.cursor = 'crosshair';
}

/**
 * 退出绘画模式
 */
export function exitDrawMode(): void {
  isDrawModeState = false;
  document.body.style.cursor = 'default';
  resetDrawState();
}

/**
 * 切换绘画模式
 */
export function toggleDrawMode(): void {
  if (isDrawModeState) {
    exitDrawMode();
  } else {
    enterDrawMode();
  }
}

/**
 * 开始绘制
 * @param startPoint 起始点坐标
 * @param rect 初始矩形数据
 * @param nodeId 目标节点ID
 */
export function startDrawing(startPoint: { x: number; y: number }, rect: { left: number; top: number; width: number; height: number }, nodeId: string): void {
  isDrawingState = true;
  drawStartState = startPoint;
  drawRectState = rect;
  targetNodeIdState = nodeId;
}

/**
 * 更新绘制矩形
 * @param rect 矩形数据
 */
export function updateDrawRect(rect: { left: number; top: number; width: number; height: number }): void {
  drawRectState = rect;
}

/**
 * 重置绘制状态
 */
export function resetDrawState(): void {
  isDrawingState = false;
  drawStartState = null;
  drawRectState = null;
  targetNodeIdState = null;
}