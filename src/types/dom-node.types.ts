/**
 * dom-node.types.ts
 * 统一定义编辑器内部的 DOM 树节点数据结构，作为各组件共享的单一真源。
 */

export interface DomNode {
  /** 唯一标识符，用于节点选中、查找和同步 */
  id: string
  /** 组件类型，使用 DynamicComponent 中注册的组件名 */
  componentType?: string
  /** 传递给组件的属性 */
  componentProps?: Record<string, any>
  /** 子节点列表 */
  children?: DomNode[]
  /** DOM 属性 */
  attributes?: Record<string, any>

  /** 父节点ID */
  parentId?: string | null
  /** 行内样式 - 支持字符串和 Blob 类型 */
  styles?: Record<string, string | Blob>

  /** 节点文本内容 */
  textContent?: string
  /** 节点名称（用于显示） */
  dataName?: string
  /** 事件映射，值为处理函数 */
  events?: Record<string, Function>
  /** 是否展开（树形控件用） */
  expanded?: boolean
  /** 是否隐藏（树形控件用） */
  hidden?: boolean
  /** 是否锁定（锁定后属性面板只读） */
  locked?: boolean
  /** 自身锁定：独立于父级 */
  selfLocked?: boolean
  /** 继承锁定：由父级传递 */
  inheritedLocked?: boolean
  /** 开关状态：用于switch或navigation按钮 */
  toggled?: boolean
  /** 按钮类型，如 'switch' | 'navigation' | 'trigger' */
  buttonType?: string
}