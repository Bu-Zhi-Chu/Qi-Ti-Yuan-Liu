/**
 * uuid.util.ts
 * UUID 生成工具函数
 * 
 * 提供生成标准UUID v4的工具函数，用于统一节点标识符生成
 */

/**
 * 生成标准UUID v4
 * @returns 生成的UUID字符串
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    // 使用现代浏览器的原生API
    return crypto.randomUUID();
  } else {
    // 兼容性实现
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

/**
 * 检查是否为根节点
 * 根节点定义为parentNodeId为null的节点
 * @param nodeId 节点ID
 * @param parentNodeId 父节点ID
 * @returns 是否为根节点
 */
export function isRootNode(nodeId: string, parentNodeId: string | null): boolean {
  return parentNodeId === null;
}