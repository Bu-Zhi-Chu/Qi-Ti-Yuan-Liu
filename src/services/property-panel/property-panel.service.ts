/*
 * property-panel.service.ts
 * 属性面板业务逻辑服务
 * 1. 暴露节点属性读写接口
 * 2. 维护简单的撤销 / 重做栈（仅保存 patch）
 * 3. 避免与 DomTreeStore 逻辑重复，直接复用其 API
 */

import type { DomNode } from '../../types/dom-node.types';
import { findNodeById, domTree } from '../repository/dom-tree.store.svelte';

// --- 内部工具类型 -----------------------------------------------------------
export interface PropPatch {
  attributes?: Record<string, string | undefined>
  styles?: Record<string, string | undefined>
  events?: Record<string, Function | undefined>
}

interface HistoryItem {
  nodeId: string
  patch: PropPatch
}

// --- 撤销 / 重做栈 -----------------------------------------------------------
const undoStack: HistoryItem[] = [];
const redoStack: HistoryItem[] = [];
const MAX_HISTORY = 50;

function pushHistory(stack: HistoryItem[], item: HistoryItem) {
  stack.push(item);
  if (stack.length > MAX_HISTORY) stack.shift();
}

// --- 基础 API ---------------------------------------------------------------
/**
 * 获取节点属性快照（深拷贝）
 */
export function getNodeProps(id: string): Required<Pick<DomNode, 'attributes' | 'styles' | 'events'>> | null {
  const node = findNodeById(domTree, id);
  if (!node) return null;
  return {
    attributes: { ...(node.attributes ?? {}) },
    styles: { ...(node.styles ?? {}) },
    events: { ...(node.events ?? {}) }
  };
}

/**
 * 更新节点属性，patch 中 undefined 表示删除该字段
 * 自动记录历史用于撤销 / 重做
 */
export function updateNodeProps(id: string, patch: PropPatch): boolean {
  const node = findNodeById(domTree, id);
  if (!node) return false;

  // 生成反向 patch 便于撤销
  const inversePatch: PropPatch = {};

  // attributes
  if (patch.attributes) {
    inversePatch.attributes = {};
    for (const [key, val] of Object.entries(patch.attributes)) {
      if (!inversePatch.attributes) inversePatch.attributes = {};
      inversePatch.attributes[key] = node.attributes?.[key];
      if (val === undefined) {
        if (node.attributes) delete node.attributes[key];
      } else {
        if (!node.attributes) node.attributes = {};
        node.attributes[key] = val as string;
      }
    }
  }

  // styles
  if (patch.styles) {
    inversePatch.styles = {};
    for (const [key, val] of Object.entries(patch.styles)) {
      inversePatch.styles[key] = node.styles?.[key];
      if (val === undefined) {
        if (node.styles) delete node.styles[key];
      } else {
        if (!node.styles) node.styles = {};
        node.styles[key] = val as string;
      }
    }
  }

  // events
  if (patch.events) {
    inversePatch.events = {};
    for (const [key, val] of Object.entries(patch.events)) {
      inversePatch.events[key] = node.events?.[key];
      if (val === undefined) {
        if (node.events) delete node.events[key];
      } else {
        if (!node.events) node.events = {};
        node.events[key] = val as Function;
      }
    }
  }

  // 入栈
  pushHistory(undoStack, { nodeId: id, patch: inversePatch });
  // 清空重做栈
  redoStack.length = 0;
  return true;
}

/** 撤销上一次属性变更 */
export function undo(): boolean {
  const last = undoStack.pop();
  if (!last) return false;
  const success = updateNodeProps(last.nodeId, last.patch);
  if (success) pushHistory(redoStack, last);
  return success;
}

/** 重做上一次撤销 */
export function redo(): boolean {
  const last = redoStack.pop();
  if (!last) return false;
  // 重新应用原先 patch（与 inverse 一致）
  const success = updateNodeProps(last.nodeId, last.patch);
  if (success) pushHistory(undoStack, last);
  return success;
}

// --- 订阅 domTree store 工具 -----------------------------------------------