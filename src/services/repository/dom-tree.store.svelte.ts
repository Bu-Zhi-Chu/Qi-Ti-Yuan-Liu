/**
 * dom-tree.store.svelte.ts
 * DOM 树状态存储服务 - 使用 Svelte 5 Runes
 *
 * 提供集中式状态管理，解决组件树中状态同步问题。
 * 当使用 addNodeToParent 等方法操作数据时，所有订阅该 store 的组件都会自动更新。
 */

import type { DomNode } from '../../types/dom-node.types';

// 初始 domTree 数据结构
const domTreeData = $state<DomNode>({
  id: 'root',
  dataId: 'root',
  componentType: 'SimpleBox',
  styles: {
    width: '100%',
    height: '100%',
    backgroundColor: '#ffffff'
  },
  expanded: true,
  children: [

  ]
});

// 当前选中的节点ID
let selectedNodeId = $state<string | null>('root');

// 导出只读引用
export const domTree = domTreeData;
const _selectedId = $derived(() => selectedNodeId);

// 导出函数以获取当前选中节点 ID，避免直接导出派生状态
export function selectedId() {
  return _selectedId();
}

/**
 * 设置选中的节点ID
 */
export function setSelectedId(id: string | null): void {
  selectedNodeId = id;
}

/**
 * 查找节点
 * @param node 起始节点
 * @param id 目标节点ID
 * @returns 找到的节点或null
 */
export function findNodeById(node: DomNode, id: string): DomNode | null {
  if ((node.id === id) || (node.dataId === id)) {
    return node;
  }

  if (node.children) {
    for (const child of node.children) {
      const found = findNodeById(child, id);
      if (found) return found;
    }
  }

  return null;
}

/**
 * 添加新节点到指定父节点
 * @param parentId 父节点ID
 * @param newNode 新节点数据
 * @returns 是否添加成功
 */
export function addNodeToParent(parentId: string, newNode: DomNode): boolean {
  const parent = findNodeById(domTreeData, parentId);
  if (parent) {
    // 确保children数组存在
    if (!parent.children) {
      parent.children = [];
    }
    // 添加新节点并触发响应式更新
    parent.children = [...parent.children, newNode];
    return true;
  }
  return false;
}

/**
 * 从父节点移除指定节点
 * @param nodeId 要移除的节点ID
 * @returns 是否移除成功
 */
export function removeNodeById(nodeId: string): boolean {
  if (nodeId === 'root') return false; // 禁止删除根节点

  // 递归查找节点的父节点
  function findParentNode(node: DomNode, targetId: string): DomNode | null {
    if (!node.children) return null;

    for (const child of node.children) {
      if ((child.id === targetId) || (child.dataId === targetId)) {
        return node;
      }

      const found = findParentNode(child, targetId);
      if (found) return found;
    }

    return null;
  }

  const parent = findParentNode(domTreeData, nodeId);
  if (parent && parent.children) {
    // 过滤掉要删除的节点并触发响应式更新
    parent.children = parent.children.filter(child =>
      (child.id !== nodeId) && (child.dataId !== nodeId)
    );
    return true;
  }

  return false;
}

/**
 * 更新节点属性
 * @param nodeId 节点ID
 * @param updates 更新的属性
 * @returns 是否更新成功
 */
export function updateNodeProperties(nodeId: string, updates: Partial<DomNode>): boolean {
  const node = findNodeById(domTreeData, nodeId);
  if (node) {
    // 合并更新并触发响应式更新
    Object.assign(node, updates);
    return true;
  }
  return false;
}

/**
 * 更新节点样式
 * @param nodeId 节点ID
 * @param styles 样式对象
 * @returns 是否更新成功
 */
export function updateNodeStyles(nodeId: string, styles: Record<string, string>): boolean {
  const node = findNodeById(domTreeData, nodeId);
  if (node) {
    // 确保styles对象存在
    if (!node.styles) {
      node.styles = {};
    }
    // 合并样式并触发响应式更新
    node.styles = { ...node.styles, ...styles };
    return true;
  }
  return false;
}