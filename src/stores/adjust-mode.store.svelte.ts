/**
 * adjust-mode.store.svelte.ts
 * 调整模式状态管理 - 使用 Svelte 5 Runes
 *
 * 提供调整模式相关状态管理，解耦自 DomCanvas 组件
 * 用于控制调整模式开关状态、调整中状态、调整区域等信息
 */

// 调整模式开关状态
let isAdjustModeState = $state(false);

// 调整中状态
let isAdjustingState = $state(false);

// 调整起点
let adjustStartState = $state<{ x: number; y: number } | null>(null);

// 目标节点ID
let targetNodeIdState = $state<string | null>(null);

// 操作来源标志（防止循环更新）
let operationSourceState = $state<'drag' | 'panel' | null>(null);

// 导出状态读取函数
export function isAdjustMode() {
  return isAdjustModeState;
}

export function isAdjusting() {
  return isAdjustingState;
}

export function adjustStart() {
  return adjustStartState;
}

export function targetNodeId() {
  return targetNodeIdState;
}

export function operationSource() {
  return operationSourceState;
}

/**
 * 开启调整模式
 */
export function enterAdjustMode(): void {
  isAdjustModeState = true; // Cursor 切换交由组件自身处理
}

/**
 * 退出调整模式
 */
export function exitAdjustMode(): void {
  isAdjustModeState = false; // 恢复光标交由组件自身处理
  resetAdjustState();
}

/**
 * 切换调整模式
 */
export function toggleAdjustMode(): void {
  if (isAdjustModeState) {
    exitAdjustMode();
  } else {
    enterAdjustMode();
  }
}

/**
 * 开始调整
 * @param startPoint 起始点坐标
 * @param nodeId 目标节点ID
 */
export function startAdjusting(startPoint: { x: number; y: number }, nodeId: string): void {
  isAdjustingState = true;
  adjustStartState = startPoint;
  targetNodeIdState = nodeId;
  operationSourceState = 'drag';
}

/**
 * 设置操作来源
 * @param source 操作来源
 */
export function setOperationSource(source: 'drag' | 'panel' | null): void {
  operationSourceState = source;
}

/**
 * 重置调整状态
 */
export function resetAdjustState(): void {
  isAdjustingState = false;
  adjustStartState = null;
  targetNodeIdState = null;
  operationSourceState = null;
}