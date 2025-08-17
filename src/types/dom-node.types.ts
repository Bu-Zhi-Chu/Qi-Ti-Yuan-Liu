/**
 * dom-node.types.ts
 * 统一定义编辑器内部的 DOM 树节点数据结构，作为各组件共享的单一真源。
 */

export interface DomNode {
  /** 唯一标识符，用于节点选中、查找和同步 */
  id: string
  /** 节点类型（属性面板中的类型），可选 */
  type?: string

  /** 组件类型，指定使用 DynamicComponent 中的哪种组件，默认为 'SimpleBox' */
  componentType?: 'RealTimeClock' | 'ResponsiveBox' | 'SimpleBox'
  /** 传递给组件的属性 */
  componentProps?: Record<string, any>
  /** 子节点列表 */
  children?: DomNode[]
  /** DOM 属性 */
  attributes?: Record<string, string>
  /** 行内样式 */
  styles?: Record<string, string>
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
}