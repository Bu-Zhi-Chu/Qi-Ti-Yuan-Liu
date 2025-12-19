/*
 * property-panel.service.ts
 * 属性面板业务逻辑服务
 * 暴露节点属性读写接口（撤销/重做功能已移除）
 */

import type { DomNode } from '../../types/dom-node.types';
import { domTree, findNodeById, updateNodeProperties, updateNodeStyles } from '../../stores/dom-tree.store.svelte';

// -------------------- 类型定义 --------------------
export interface PropPatch {
  attributes?: Record<string, any | undefined>;
  styles?: Record<string, string | undefined>;
  events?: Record<string, Function | undefined>;
}

import { derived } from 'svelte/store';
import { domTreeVersionStore } from '../../stores/dom-tree.store.svelte';

// -------------------- 查询接口 --------------------
/**
 * 获取节点属性快照（深拷贝）
 */
export function getNodeProps(
  id: string,
): Required<Pick<DomNode, 'attributes' | 'styles' | 'events'>> | null {
  const node = findNodeById(domTree, id);
  if (!node) return null;
  return {
    attributes: { ...(node.attributes ?? {}) },
    styles: { ...(node.styles ?? {}) },
    events: { ...(node.events ?? {}) },
  };
}

/**
 * 获取完整节点对象
 */
export function getFullNode(id: string): DomNode | null {
  return findNodeById(domTree, id);
}

/**
 * 获取节点属性的可订阅 store
 * 当 domTreeVersion 递增时自动推导最新属性快照
 */
export function getNodePropsStore(id: string) {
  return derived(domTreeVersionStore, () => getNodeProps(id));
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
        // 支持Blob和string类型
        node.styles[key] = val as string | Blob;
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

  // 触发自动保存到数据库
  if (patch.attributes) {
    const validAttributes: Record<string, string> = {};
    Object.entries(patch.attributes).forEach(([key, val]) => {
      if (val !== undefined) {
        validAttributes[key] = val;
      }
    });
    updateNodeProperties(id, validAttributes);
  }
  if (patch.styles) {
    const validStyles: Record<string, string> = {};
    Object.entries(patch.styles).forEach(([key, val]) => {
      if (val !== undefined) {
        validStyles[key] = val;
      }
    });
    updateNodeStyles(id, validStyles);
  }

  domTreeVersionStore.update((v) => v + 1);

  return true;
}
