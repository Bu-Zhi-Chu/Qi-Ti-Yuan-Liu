/**
 * dom-node.types.ts
 * 统一定义编辑器内部的 DOM 树节点数据结构，作为各组件共享的单一真源。
 */

export interface DomNode {
  /** 唯一标识（随机或自增） */
  id: string
  /** 元素标签名，可选。默认为 SimpleBox 的 div 容器 */
  tagName?: string
  /** 更稳定的业务级标识（可选），优先用于查找 */
  dataId?: string
  /** 子节点列表 */
  children?: DomNode[]
  /** DOM 属性 */
  attributes?: Record<string, string>
  /** 行内样式 */
  styles?: Record<string, string>
  /** 事件映射，值为处理函数 */
  events?: Record<string, Function>
  /** 是否展开（树形控件用） */
  expanded?: boolean
}