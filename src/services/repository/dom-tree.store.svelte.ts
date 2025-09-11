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
import { writable } from 'svelte/store';
import { isLiteMode } from '../env/environment.service'
import { get } from 'svelte/store'
import { getImage, addOrIncrement } from '../database/image-store.service'
import { decrementOrDelete } from '../database/image-store.service'

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
/** domTree 版本号：每次数据变动都会递增，用于属性面板订阅刷新 */
let domTreeVersionData = $state(0);

/** 可订阅的 domTree 版本号 store */
export const domTreeVersionStore = writable(0);

/** 内部工具：递增版本号 */
function bumpDomTreeVersion() {
  domTreeVersionData = domTreeVersionData + 1;
  domTreeVersionStore.update(n => n + 1);
}

// 导出项目ID的store，用于订阅变化
export const projectId = writable('');

// 导出函数以获取当前选中节点 ID，避免直接导出派生状态
export function selectedId() {
  return selectedNodeId;
}

/**
 * 设置当前项目ID（由EditorPage统一设置）
 */
export function setProjectId(newProjectId: string): void {
  currentProjectId = newProjectId;
  projectId.set(newProjectId);
  console.log('设置项目ID:', newProjectId);
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
      const attributes = nodeData.attributes || {};
      const componentType = attributes.type ?? nodeData.componentType ?? 'SimpleBox';
      const textContent = attributes.textContent ?? nodeData.textContent ?? '';
      delete attributes.type;
      delete attributes.textContent;

      const node: DomNode = {
        id: nodeData.id,
        componentType: componentType,
        styles: nodeData.style || {},
        attributes: attributes,
        textContent: textContent,
        expanded: nodeData.attributes?.expanded !== false,
        hidden: nodeData.attributes?.hidden || false,
        children: []
      } as DomNode & { order?: number };
      (node as any).order = nodeData.order ?? 0;
      nodeMap.set(nodeData.id, node);
    }

    // 构建树结构
    let rootNode: DomNode | null = null;
    for (const nodeData of nodes) {
      const node = nodeMap.get(nodeData.id)!;

      if (nodeData.parentId === null) {
        // 根节点
        rootNode = node;
      } else {
        // 子节点，添加到父节点
        const parent = nodeMap.get(nodeData.parentId);
        if (parent) {
          if (!parent.children) parent.children = [];
          parent.children.push(node);
          // 根据order字段排序，确保兄弟节点顺序正确
          parent.children.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
        }
      }
    }

    return rootNode;
  } catch (error) {
    console.error('【数据库交互】从doms表加载DOM树失败:', error);
    return null;
  }
}

/**
 * 从数据库加载domTree数据
 */
export async function loadDomTreeFromDatabase(projectId: string): Promise<boolean> {
  if (!projectId) {
    console.warn('项目ID为空，无法加载domTree数据');
    console.log('【数据库交互】项目ID为空，跳过DOM树数据加载');
    return false;
  }

  try {
    // 先从数据库读取之前保存的选中节点ID
    const project = await DexieService.getRecord<any>('qi-qiao-ban', 'projects', projectId);
    const savedSelectedNodeId = project?.selectedNodeId || null;

    // 立即清空旧数据，确保无残影
    console.log('【数据库交互】立即清空DOM树数据，避免残影');
    Object.assign(domTreeData, {
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
      children: []
    });
    selectedNodeId = savedSelectedNodeId || 'root';

    // 首先尝试从doms表加载
    const domTreeFromDoms = await loadDomNodesFromDomsTable(projectId);
    if (domTreeFromDoms) {
      Object.assign(domTreeData, domTreeFromDoms);
      console.log('【数据库交互】已从doms表加载DOM树数据');

      // 恢复之前保存的选中节点，如果节点存在的话
      const targetSelectedId = savedSelectedNodeId && hasNodeWithId(domTreeData, savedSelectedNodeId)
        ? savedSelectedNodeId
        : 'root';
      await setSelectedId(targetSelectedId);
      return true;
    }

    // doms表没有数据时使用默认结构
    console.log('【数据库交互】未找到domTree数据，使用默认结构');
    return false;
  } catch (error) {
    console.error('【数据库交互】加载domTree数据失败:', error);
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
    console.log('【数据库交互】开始删除项目旧节点，项目ID:', projectId);
    await db.table('doms').where({ projectId }).delete();

    // 递归保存所有节点到doms表
    const saveNode = async (node: DomNode, parentId: string | null, order: number) => {
      // 确保数据是可序列化的
      const safeAttributes = node.attributes ? JSON.parse(JSON.stringify(node.attributes)) : {};

      // 处理样式数据，保留Blob类型
      const safeStyles: Record<string, string | Blob> = {};
      if (node.styles) {
        for (const [key, value] of Object.entries(node.styles)) {
          if (value instanceof Blob) {
            // 保留Blob对象
            safeStyles[key] = value;
          } else {
            // 其他类型正常序列化
            safeStyles[key] = JSON.parse(JSON.stringify(value));
          }
        }
      }

      await DexieService.addRecord('qi-qiao-ban', 'doms', {
        projectId,
        id: node.id, // 不变的节点UUID
        parentId,
        attributes: {
          expanded: node.expanded,
          hidden: node.hidden,
          ...safeAttributes,
          type: node.componentType,
          textContent: node.textContent || ''
        },
        style: safeStyles,
        order
      });

      // 递归保存子节点
      if (node.children) {
        for (let i = 0; i < node.children.length; i++) {
          const child = node.children[i];
          await saveNode(child, node.id, i);
        }
      }
    };

    // 从根节点开始保存
    await saveNode(domTree, null, 0);
    console.log('【数据库交互】所有DOM节点已保存到doms表');
  } catch (error) {
    console.error('【数据库交互】保存DOM节点到doms表失败:', error);
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
    if (!currentProjectId) {
      console.warn('【数据库交互】项目ID为空，跳过自动保存');
      return;
    }



    saveDomNodesToDomsTable(currentProjectId, domTreeData);
  }, 500); // 500ms防抖
}

/**
 * 设置选中的节点ID
 * 仅在节点ID发生变化时更新数据库，避免重复保存
 */
export async function setSelectedId(id: string | null): Promise<void> {
  // 如果选择的节点ID与当前相同，则跳过更新
  if (selectedNodeId === id) {
    return;
  }

  selectedNodeId = id;

  // 仅在节点ID变化时更新数据库中的selectedNodeId
  if (currentProjectId) {
    try {
      console.log(`【数据库交互】更新项目选中节点ID: 项目ID=${currentProjectId}, 选中节点ID=${id}`)
      await DexieService.updateRecord('qi-qiao-ban', 'projects', currentProjectId, {
        selectedNodeId: id
      });
      console.log('【数据库交互】项目选中节点ID已更新到数据库')
    } catch (error) {
      console.error('【数据库交互】更新数据库中的selectedNodeId失败:', error);
    }
  }
}

/**
 * 查找节点
 * @param node 起始节点
 * @param id 目标节点ID
 * @returns 找到的节点或null
 */
export function findNodeById(node: DomNode, id: string): DomNode | null {
  if (!node || !id) return null;

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
    // 递增版本号，通知订阅者刷新
    bumpDomTreeVersion();
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
export async function insertNodeBefore(targetId: string, nodeId: string): Promise<boolean> {
  if (targetId === 'root' || nodeId === 'root' || targetId === nodeId) return false;
  const parent = findParentById(domTreeData, targetId);
  const movingNode = findNodeById(domTreeData, nodeId);
  if (!parent || !parent.children || !movingNode) return false;
  if (isDescendant(movingNode, targetId)) return false;
  // 先从原位置移除（不影响计数）
  await removeNodeByIdForMove(nodeId);
  const index = parent.children.findIndex(c => c.id === targetId);
  parent.children.splice(index, 0, movingNode);
  return true;
}

/**
 * 将 nodeId 对应节点插入到 targetId 对应节点之后（同级）
 */
export async function insertNodeAfter(targetId: string, nodeId: string): Promise<boolean> {
  if (targetId === 'root' || nodeId === 'root' || targetId === nodeId) return false;
  const parent = findParentById(domTreeData, targetId);
  const movingNode = findNodeById(domTreeData, nodeId);
  if (!parent || !parent.children || !movingNode) return false;
  if (isDescendant(movingNode, targetId)) return false;
  // 先从原位置移除（不影响计数）
  await removeNodeByIdForMove(nodeId);
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
export async function moveNodeToParent(nodeId: string, newParentId: string): Promise<boolean> {
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
export async function moveNode(nodeId: string, newParentId: string): Promise<boolean> {
  if (nodeId === 'root' || nodeId === newParentId) return false;
  const node = findNodeById(domTreeData, nodeId);
  if (!node) return false;
  const removed = await removeNodeByIdForMove(nodeId);
  if (!removed) return false;
  const added = addNodeToParent(newParentId, node);
  if (added) autoSaveToDomsTable();
  return added;
}

/**
 * 从父节点移除指定节点（拖拽移动专用，不释放图片引用计数）
 * @param nodeId 要移除的节点ID
 * @returns 是否移除成功
 */
export async function removeNodeById(nodeId: string): Promise<boolean> {
  if (nodeId === 'root') return false;
  const parent = findParentById(domTreeData, nodeId);
  if (!parent || !parent.children) return false;
  const targetNode = parent.children.find(c => c.id === nodeId);
  if (targetNode) releaseNodeResources(targetNode);
  if (selectedNodeId === nodeId) await setSelectedId('root');
  parent.children = parent.children.filter(c => c.id !== nodeId);

  // 如果父节点是 ButtonGroup 且已无子节点，则一并删除父节点
  if (parent.componentType === 'ButtonGroup' || (parent.attributes as any)?.type === 'ButtonGroup') {
    if (parent.children.length === 0) {
      // 递归删除父节点，但防止死循环
      await removeNodeById(parent.id);
      return true;
    }
  }

  bumpDomTreeVersion();
  autoSaveToDomsTable();
  return true;
}

// 拖拽专用删除：不释放图片引用计数
export async function removeNodeByIdForMove(nodeId: string): Promise<boolean> {
  if (nodeId === 'root') return false;
  const parent = findParentById(domTreeData, nodeId);
  if (!parent || !parent.children) return false;
  if (selectedNodeId === nodeId) await setSelectedId('root');
  parent.children = parent.children.filter(c => c.id !== nodeId);
  autoSaveToDomsTable();
  return true;
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
    bumpDomTreeVersion();
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
export function updateNodeStyles(nodeId: string, styles: Record<string, string | Blob>): boolean {
  const node = findNodeById(domTreeData, nodeId);
  if (node) {
    // 确保styles对象存在
    if (!node.styles) {
      node.styles = {};
    }
    // 合并样式并触发响应式更新
    node.styles = { ...node.styles, ...styles };
    bumpDomTreeVersion();
    // 自动保存到doms表（不影响projects表）
    autoSaveToDomsTable();
    return true;
  }
  return false;
}

/**
 * 重置所有节点的 activePropertyTab 属性
 */
export function resetActivePropertyTab(): void {
  function resetNodeTab(node: DomNode): void {
    if (node.attributes) {
      delete node.attributes.activePropertyTab;
    }
    if (node.children) {
      node.children.forEach(resetNodeTab);
    }
  }
  resetNodeTab(domTreeData);
  console.log('所有节点的 activePropertyTab 已重置');
}

/**
 * 检查指定ID的节点是否存在于DOM树中
 */
export function hasNodeWithId(node: DomNode, targetId: string): boolean {
  if (!node || !targetId) return false;

  if (node.id === targetId) return true;

  if (node.children && Array.isArray(node.children)) {
    for (const child of node.children) {
      if (hasNodeWithId(child, targetId)) return true;
    }
  }

  return false;
}

/**
 * 清理内存状态的函数
 */
export function clearMemoryState(): void {
  // 重置根节点
  Object.assign(domTreeData, {
    id: 'root',
    componentType: 'SimpleBox',
    styles: {
      width: '100%',
      height: '100%',
      backgroundColor: '#ffffff',
      overflow: 'hidden',
      pointerEvents: 'auto'
    },
    attributes: {},
    events: {},
    textContent: '',
    expanded: true,
    children: []
  });
  selectedNodeId = 'root';
  currentProjectId = '';
  resetActivePropertyTab(); // 新增：重置 activePropertyTab
  console.log('内存状态已清理');
}

// 哈希检测正则，用于背景图等资源引用
const hashRegex = /^[a-f0-9]{40,}$/

// 深拷贝工具：使用 JSON 序列化避免函数导致的 DataCloneError
function deepCopyNode<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}


// 递归释放节点资源：对子节点逐一扣减背景图引用计数
function releaseNodeResources(node: DomNode) {
  const styles: any = node.styles || {}
  const candidates = [styles.backgroundImage, styles.highlightImage]
  const pid = get(projectId)
  if (pid) {
    for (const v of candidates) {
      if (typeof v === 'string' && hashRegex.test(v.trim())) {
        decrementOrDelete(pid, v.trim())
      }
    }
  }
  if (node.children && node.children.length) {
    node.children.forEach((child) => releaseNodeResources(child))
  }
}

// 生成唯一 dataName 辅助函数
function generateUniqueDataName(baseName: string): string {
  if (!baseName) return baseName;
  // 收集当前树中的所有 dataName
  const names = new Set<string>();
  function collect(node: DomNode) {
    if (node.dataName) names.add(node.dataName);
    const attrName = node.attributes?.['data-name'] as string | undefined;
    if (attrName) names.add(attrName);
    node.children?.forEach(collect);
  }
  collect(domTreeData);
  // 初始候选名："原名 Copy"
  let candidate = `${baseName} Copy`;
  if (!names.has(candidate)) return candidate;
  // 若冲突则追加序号
  let index = 1;
  while (names.has(`${candidate} ${index}`)) {
    index++;
  }
  return `${candidate} ${index}`;
}

// 剪贴板临时存储
let clipboardNode: DomNode | null = null;
// 标记当前剪贴板内容是否来自剪切操作
let clipboardIsCut = false;

/**
 * 复制当前选中节点及其子树到剪贴板
 */
export function copySelectedNode(): boolean {
  if (!selectedNodeId || selectedNodeId === 'root') return false;
  const node = findNodeById(domTreeData, selectedNodeId);
  if (!node) return false;
  clipboardNode = deepCopyNode(node);
  clipboardIsCut = false;
  console.log('已复制节点:', clipboardNode!.id);
  return true;
}

/**
 * 剪切当前选中节点：复制到剪贴板并删除原节点
 */
export async function cutSelectedNode(): Promise<boolean> {
  if (!selectedNodeId || selectedNodeId === 'root') return false;
  const node = findNodeById(domTreeData, selectedNodeId);
  if (!node) return false;
  const deleted = await removeNodeById(selectedNodeId);
  if (!deleted) return false;
  clipboardNode = deepCopyNode(node);
  clipboardIsCut = true;
  console.log('已剪切节点:', clipboardNode!.id);
  return true;
}

/**
 * 递归克隆节点并为每一层生成新的 ID，同时收集背景图哈希
 */
function cloneNodeWithNewIds(node: DomNode, hashes: string[] = []): DomNode {
  const newId = globalThis.crypto?.randomUUID?.() ?? `node-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const clonedOriginal = deepCopyNode(node);
  const cloned: DomNode = { ...clonedOriginal, id: newId };
  // 同步更新 attributes 中的 "data-name"
  const originalAttrName = (clonedOriginal.attributes as any)?.['data-name'] as string | undefined;
  if (originalAttrName) {
    cloned.attributes = { ...(cloned.attributes ?? {}), 'data-name': generateUniqueDataName(originalAttrName) } as any;
  }
  const bg = (cloned.styles as any)?.backgroundImage;
  if (typeof bg === 'string' && hashRegex.test(bg.trim())) {
    hashes.push(bg.trim());
  }
  if (cloned.children?.length) {
    cloned.children = cloned.children.map((c) => cloneNodeWithNewIds(c, hashes));
  }
  return cloned;
}

/**
 * 将剪贴板中的节点粘贴到当前选中节点（作为其子节点）
 */
export async function pasteNodeToSelectedParent(toParent: boolean = false, selectAfterPaste: boolean = false): Promise<string | null> {
  if (!clipboardNode) {
    console.warn('剪贴板为空，无法粘贴');
    return null;
  }
  let targetParentId: string = selectedNodeId || 'root';
  if (toParent) {
    // 指定粘贴到父容器
    if (selectedNodeId && selectedNodeId !== 'root') {
      const parentNode = findParentById(domTreeData, selectedNodeId);
      targetParentId = parentNode?.id ?? 'root';
    }
  }
  let nodeToPaste: DomNode;
  let hashes: string[] = [];
  if (clipboardIsCut) {
    // 剪切操作：直接使用原节点，不修改 data-name
    nodeToPaste = deepCopyNode(clipboardNode);
  } else {
    // 复制操作：克隆并生成新 ID / data-name
    hashes = [];
    nodeToPaste = cloneNodeWithNewIds(clipboardNode, hashes);
  }
  const added = addNodeToParent(targetParentId, nodeToPaste);
  if (added && selectAfterPaste) {
    await setSelectedId(nodeToPaste.id);
  }
  if (!clipboardIsCut && added && currentProjectId) {
    for (const h of hashes) {
      const img = await getImage(currentProjectId, h);
      if (img) await addOrIncrement(img, 1);
    }
  }
  // 粘贴完成后，重置剪切标记（保持剪贴板内容）
  clipboardIsCut = false;
  console.log('已粘贴节点到:', targetParentId);
  return added ? nodeToPaste.id : null;
}

/**
 * 根据搜索关键字过滤节点列表，隐藏不匹配且其子树均不匹配的节点
 * @param query 搜索关键词，忽略大小写。若为空字符串则全部显示
 */
export function filterDomTreeBySearch(query: string): void {
  const qLower = query.trim().toLowerCase();

  function matches(node: DomNode): boolean {
    if (!qLower) return true;
    const displayName = (node.attributes?.['data-name'] || node.componentType || (node.attributes as any)?.type || '元素').toString().toLowerCase();
    return displayName.includes(qLower);
  }

  function dfs(node: DomNode, isRoot = false): boolean {
    let selfMatch = matches(node);
    let childrenMatch = false;
    if (node.children && node.children.length) {
      for (const child of node.children) {
        const childVisible = dfs(child);
        childrenMatch = childrenMatch || childVisible;
      }
    }
    const visible = selfMatch || childrenMatch;
    if (!isRoot) {
      node.hidden = !visible;
    }
    return visible;
  }

  // 根节点始终可见
  dfs(domTreeData, true);
  bumpDomTreeVersion();
}

// 当前页面 Screen ID（用于 SPA 页面切换）
let currentPageId = $state<string | null>(null)
export const currentPage = writable<string | null>(null)

/** 切换当前页面 */
export function setCurrentPage(id: string | null) {
  currentPageId = id
  currentPage.set(id)
}