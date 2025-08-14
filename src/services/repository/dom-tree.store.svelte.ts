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
    // 确保新节点默认展开
    if (newNode.expanded === undefined) {
      newNode.expanded = true;
    }
    // 自动展开父节点以显示新添加的子节点
    parent.expanded = true;
    // 添加新节点并触发响应式更新
    parent.children = [...parent.children, newNode];
    return true;
  }
  return false;
}

/**
 * 判断 node 是否为 targetId 对应节点的祖先
 */
function isDescendant(root: DomNode, targetId: string): boolean {
  if (!root.children) return false;
  for (const child of root.children) {
    if ((child.id === targetId) || (child.dataId === targetId)) return true;
    if (isDescendant(child, targetId)) return true;
  }
  return false;
}

/**
 * 查找 targetId 的直接父节点
 */
function findParentById(node: DomNode, targetId: string): DomNode | null {
  if (!node.children) return null;
  for (const child of node.children) {
    if ((child.id === targetId) || (child.dataId === targetId)) return node;
    const found = findParentById(child, targetId);
    if (found) return found;
  }
  return null;
}

/**
 * 将 nodeId 对应节点插入到 targetId 对应节点之前（同级）
 */
export function insertNodeBefore(targetId: string, nodeId: string): boolean {
  if (targetId === 'root' || nodeId === 'root' || targetId === nodeId) return false;
  const parent = findParentById(domTreeData, targetId);
  const movingNode = findNodeById(domTreeData, nodeId);
  if (!parent || !parent.children || !movingNode) return false;
  if (isDescendant(movingNode, targetId)) return false;
  // 先从原位置移除
  removeNodeById(nodeId);
  const index = parent.children.findIndex(c => (c.id === targetId) || (c.dataId === targetId));
  parent.children.splice(index, 0, movingNode);
  return true;
}

/**
 * 将 nodeId 对应节点插入到 targetId 对应节点之后（同级）
 */
export function insertNodeAfter(targetId: string, nodeId: string): boolean {
  if (targetId === 'root' || nodeId === 'root' || targetId === nodeId) return false;
  const parent = findParentById(domTreeData, targetId);
  const movingNode = findNodeById(domTreeData, nodeId);
  if (!parent || !parent.children || !movingNode) return false;
  if (isDescendant(movingNode, targetId)) return false;
  // 先从原位置移除
  removeNodeById(nodeId);
  const index = parent.children.findIndex(c => (c.id === targetId) || (c.dataId === targetId));
  parent.children.splice(index + 1, 0, movingNode);
  return true;
}

/**
 * 重新排序指定父节点的子节点顺序
 * @param parentId 父节点 ID
 * @param orderedChildIds 子节点 ID 的新顺序数组
 * @returns 是否排序成功
 */
export function reorderChildren(parentId: string, orderedChildIds: string[] | DomNode[], _opts?: any): boolean {
  const parent = findNodeById(domTreeData, parentId);
  if (!parent || !parent.children) return false;
  // 创建一个映射，快速根据 id 查找节点
  const idToNode = new Map<string, DomNode>();
  for (const child of parent.children) {
    idToNode.set(child.dataId ?? child.id, child);
  }
  const newChildren: DomNode[] = [];
  for (const cidOrNode of orderedChildIds) {
    const cid = typeof cidOrNode === 'string' ? cidOrNode : (cidOrNode.dataId ?? cidOrNode.id);
    const node = idToNode.get(cid);
    if (node) {
      newChildren.push(node);
    }
  }
  // 如果新数组与旧数组长度不一致，说明有未知 ID，放弃操作
  if (newChildren.length !== parent.children.length) return false;
  parent.children = newChildren;
  return true;
}

/**
 * 将节点移动到新的父节点（兼容旧 API 名称）
 * @param nodeId 要移动的节点 ID
 * @param newParentId 新的父节点 ID
 * @returns 是否移动成功
 */
export function moveNodeToParent(nodeId: string, newParentId: string): boolean {
  return moveNode(nodeId, newParentId);
}

/**
 * 切换节点展开状态
 * @param nodeId 节点ID
 * @returns 是否切换成功
 */
export function toggleExpanded(nodeId: string): boolean {
  const node = findNodeById(domTreeData, nodeId);
  if (node) {
    node.expanded = !node.expanded;
    return true;
  }
  return false;
}

/**
 * 切换节点隐藏状态
 * @param nodeId 节点ID
 * @returns 是否切换成功
 */
export function toggleHidden(nodeId: string): boolean {
  if (nodeId === 'root') return false; // 根节点不可隐藏
  const node = findNodeById(domTreeData, nodeId);
  if (node) {
    node.hidden = !node.hidden;
    return true;
  }
  return false;
}

/**
 * 移动节点到新的父节点
 * @param nodeId 要移动的节点ID
 * @param newParentId 新父节点ID
 * @returns 是否移动成功
 */
export function moveNode(nodeId: string, newParentId: string): boolean {
  if (nodeId === 'root' || nodeId === newParentId) return false;
  const node = findNodeById(domTreeData, nodeId);
  if (!node) return false;
  const removed = removeNodeById(nodeId);
  if (!removed) return false;
  return addNodeToParent(newParentId, node);
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