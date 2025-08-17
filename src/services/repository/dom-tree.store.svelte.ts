/**
 * dom-tree.store.svelte.ts
 * DOM 树状态存储服务 - 使用 Svelte 5 Runes
 *
 * 提供集中式状态管理，解决组件树中状态同步问题。
 * 当使用 addNodeToParent 等方法操作数据时，所有订阅该 store 的组件都会自动更新。
 */

import type { DomNode } from '../../types/dom-node.types';
import DexieService from '../database/dexie-service';
import Dexie from 'dexie';

// 初始 domTree 数据结构
const domTreeData = $state<DomNode>({
  id: 'root',
  componentType: 'SimpleBox',
  styles: {
    width: '100%',
    height: '100%',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    pointerEvents: 'auto'
  },
  expanded: true,
  children: [

  ]
});

// 当前选中的节点ID
let selectedNodeId = $state<string | null>('root');

// 当前项目ID
let currentProjectId = $state<string>('');

// 导出只读引用
export const domTree = domTreeData;
const _selectedId = $derived(() => selectedNodeId);

// 导出函数以获取当前选中节点 ID，避免直接导出派生状态
export function selectedId() {
  return _selectedId();
}

/**
 * 设置当前项目ID
 */
export function setProjectId(projectId: string): void {
  currentProjectId = projectId;
}

/**
 * 从doms表加载DOM树数据
 */
async function loadDomNodesFromDomsTable(projectId: string): Promise<DomNode | null> {
  try {
    const db = new Dexie('qi-qiao-ban');
    await db.open();
    const nodes = await db.table('doms').where('projectId').equals(projectId).toArray();

    if (nodes.length === 0) {
      return null;
    }

    // 构建节点映射
    const nodeMap = new Map<string, DomNode>();

    // 创建所有节点
    for (const nodeData of nodes) {
      const node: DomNode = {
        id: nodeData.nodeId, // 唯一标识符
        componentType: nodeData.type,
        styles: nodeData.style || {},
        attributes: nodeData.attributes || {},
        textContent: nodeData.textContent,
        expanded: nodeData.attributes?.expanded !== false,
        hidden: nodeData.attributes?.hidden || false,
        children: []
      };
      nodeMap.set(nodeData.nodeId, node);
    }

    // 构建树结构
    let rootNode: DomNode | null = null;
    for (const nodeData of nodes) {
      const node = nodeMap.get(nodeData.nodeId)!;

      if (nodeData.parentNodeId === null) {
        // 根节点
        rootNode = node;
      } else {
        // 子节点，添加到父节点
        const parent = nodeMap.get(nodeData.parentNodeId);
        if (parent) {
          if (!parent.children) parent.children = [];
          parent.children.push(node);
        }
      }
    }

    return rootNode;
  } catch (error) {
    console.error('从doms表加载DOM树失败:', error);
    return null;
  }
}

/**
 * 从数据库加载domTree数据
 */
export async function loadDomTreeFromDatabase(projectId: string): Promise<boolean> {
  if (!projectId) {
    console.warn('项目ID为空，无法加载domTree数据');
    return false;
  }

  try {
    // 首先尝试从doms表加载
    const domTreeFromDoms = await loadDomNodesFromDomsTable(projectId);
    if (domTreeFromDoms) {
      Object.assign(domTreeData, domTreeFromDoms);
      console.log('已从doms表加载DOM树数据');
      return true;
    }

    // 如果doms表没有数据，尝试从projects表加载
    const project = await DexieService.getRecord<any>('qi-qiao-ban', 'projects', projectId);
    if (project && project.data) {
      try {
        let loadedData: any;

        // 检查数据类型，避免重复解析
        if (typeof project.data === 'string') {
          loadedData = JSON.parse(project.data);
        } else if (typeof project.data === 'object') {
          loadedData = project.data;
        } else {
          console.error('不支持的domTree数据格式:', typeof project.data);
          return false;
        }

        // 更新domTree数据
        Object.assign(domTreeData, loadedData);
        console.log('已从projects表加载domTree数据');

        // 同时迁移到doms表
        await saveDomNodesToDomsTable(projectId, domTreeData);

        return true;
      } catch (error) {
        console.error('解析domTree数据失败:', error);
        return false;
      }
    } else {
      console.log('未找到domTree数据，使用默认结构');
      return false;
    }
  } catch (error) {
    console.error('加载domTree数据失败:', error);
    return false;
  }
}

// 防抖定时器
let saveTimeout: ReturnType<typeof setTimeout> | null = null;

/**
 * 将DOM树节点保存到doms表
 */
async function saveDomNodesToDomsTable(projectId: string, domTree: DomNode): Promise<void> {
  try {
    // 先删除该项目的所有旧节点
    const db = new Dexie('qi-qiao-ban');
    await db.open();
    await db.table('doms').where('projectId').equals(projectId).delete();

    // 递归保存所有节点到doms表
    const saveNode = async (node: DomNode, parentNodeId: string | null) => {
      // 确保数据是可序列化的
      const safeAttributes = node.attributes ? JSON.parse(JSON.stringify(node.attributes)) : {};
      const safeStyles = node.styles ? JSON.parse(JSON.stringify(node.styles)) : {};

      await DexieService.addRecord('qi-qiao-ban', 'doms', {
        projectId,
        nodeId: node.id, // 不变的节点UUID
        parentNodeId,
        type: node.componentType,
        attributes: {
          dataName: node.dataName,
          expanded: node.expanded,
          hidden: node.hidden,
          ...safeAttributes
        },
        style: safeStyles,
        textContent: node.textContent || ''
      });

      // 递归保存子节点
      if (node.children) {
        for (const child of node.children) {
          await saveNode(child, node.id);
        }
      }
    };

    // 从根节点开始保存
    await saveNode(domTree, null);
    console.log('所有DOM节点已保存到doms表');
  } catch (error) {
    console.error('保存DOM节点到doms表失败:', error);
  }
}

/**
 * 手动保存domTree数据到projects表的data字段
 * 由用户点击按钮触发，避免频繁自动保存
 */
export async function saveDomTreeToProjectsData(): Promise<boolean> {
  if (!currentProjectId) {
    console.warn('项目ID为空，无法保存domTree数据');
    return false;
  }

  try {
    console.log('手动保存domTree数据到projects表:', currentProjectId);

    const success = await DexieService.updateRecord('qi-qiao-ban', 'projects', currentProjectId, {
      data: JSON.stringify(domTreeData),
      updatedAt: Date.now()
    });

    if (success) {
      console.log('domTree数据已手动保存到projects表');
      return true;
    } else {
      console.warn('保存domTree数据失败');
      return false;
    }
  } catch (error) {
    console.error('保存domTree数据失败:', error);
    return false;
  }
}

/**
 * 自动保存到doms表（细粒度存储，性能影响小）
 */
function autoSaveToDomsTable(): void {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  saveTimeout = setTimeout(() => {
    if (currentProjectId) {
      saveDomNodesToDomsTable(currentProjectId, domTreeData);
    }
  }, 500); // 500ms防抖
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
  if (node.id === id) {
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
    // 自动保存到doms表（不影响projects表）
    autoSaveToDomsTable();
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
    if (child.id === targetId) return true;
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
    if (child.id === targetId) return node;
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
  const index = parent.children.findIndex(c => c.id === targetId);
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
  const index = parent.children.findIndex(c => c.id === targetId);
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
      idToNode.set(child.id, child);
    }
  const newChildren: DomNode[] = [];
  for (const cidOrNode of orderedChildIds) {
    const cid = typeof cidOrNode === 'string' ? cidOrNode : cidOrNode.id;
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
    // 自动保存到doms表（不影响projects表）
    autoSaveToDomsTable();
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
    // 自动保存到doms表（不影响projects表）
    autoSaveToDomsTable();
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
  const added = addNodeToParent(newParentId, node);
  if (added) {
    // 自动保存到doms表（不影响projects表）
    autoSaveToDomsTable();
  }
  return added;
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
      if (child.id === targetId) {
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
      child.id !== nodeId
    );
    // 自动保存到doms表（不影响projects表）
    autoSaveToDomsTable();
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
    // 自动保存到doms表（不影响projects表）
    autoSaveToDomsTable();
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
    // 自动保存到doms表（不影响projects表）
    autoSaveToDomsTable();
    return true;
  }
  return false;
}