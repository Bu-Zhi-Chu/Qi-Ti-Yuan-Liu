/*
 * property-panel.service.ts
 * 属性面板业务逻辑服务
 * 暴露节点属性读写接口（撤销/重做功能已移除）
 */

import type { DomNode } from '../../types/dom-node.types';
import { findNodeById, domTree } from '../repository/dom-tree.store.svelte';

// -------------------- 类型定义 --------------------
export interface PropPatch {
  attributes?: Record<string, string | undefined>;
  styles?: Record<string, string | undefined>;
  events?: Record<string, Function | undefined>;
  imageBlobs?: Record<string, any>;
}

// -------------------- 查询接口 --------------------
/**
 * 获取节点属性快照（深拷贝）
 */
export function getNodeProps(
  id: string,
): Required<Pick<DomNode, 'attributes' | 'styles' | 'events' | 'imageBlobs'>> | null {
  const node = findNodeById(domTree, id);
  if (!node) return null;
  return {
    attributes: { ...(node.attributes ?? {}) },
    styles: { ...(node.styles ?? {}) },
    events: { ...(node.events ?? {}) },
    imageBlobs: { ...(node.imageBlobs ?? {}) },
  };
}

// -------------------- 更新接口 --------------------
/**
 * 更新节点属性，patch 中 undefined 表示删除该字段
 */
export function updateNodeProps(id: string, patch: PropPatch): boolean {
  const node = findNodeById(domTree, id);
  if (!node) return false;

  // attributes
  if (patch.attributes) {
    for (const [key, val] of Object.entries(patch.attributes)) {
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
    for (const [key, val] of Object.entries(patch.styles)) {
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
    for (const [key, val] of Object.entries(patch.events)) {
      if (val === undefined) {
        if (node.events) delete node.events[key];
      } else {
        if (!node.events) node.events = {};
        node.events[key] = val as Function;
      }
    }
  }

  // imageBlobs
  if (patch.imageBlobs) {
    for (const [key, val] of Object.entries(patch.imageBlobs)) {
      if (val === undefined || val === null) {
        if (node.imageBlobs) delete node.imageBlobs[key];
      } else {
        if (!node.imageBlobs) node.imageBlobs = {};
        node.imageBlobs[key] = val;
      }
    }
  }

  // 触发自动保存到数据库
  import('../repository/dom-tree.store.svelte').then(({ updateNodeProperties }) => {
    updateNodeProperties(id, patch.attributes || {});
  });

  return true;
}