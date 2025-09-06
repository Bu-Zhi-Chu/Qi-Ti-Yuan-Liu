/**
 * TreeDragDropService.ts
 * DOM树拖拽排序服务
 *
 * 功能特性：
 * - 处理树形结构的拖拽排序
 * - 支持节点在父节点间移动
 * - 提供拖拽指示器
 * - 与dom-tree.store.svelte集成
 *
 * 使用方法：
 * import { TreeDragDropService } from '../services/interactions/tree-drag-drop.service'
 * const dragService = new TreeDragDropService()
 */

import { domTree, moveNode, insertNodeBefore, insertNodeAfter, findNodeById, hasNodeWithId } from '../repository/dom-tree.store.svelte'

export class TreeDragDropService {
  private draggingId: string | null = null
  private hoverTargetId: string | null = null
  private hoverZone: 'above' | 'inside' | 'below' | null = null

  private indicatorTop: HTMLDivElement | null = null
  private indicatorBottom: HTMLDivElement | null = null

  constructor(indicatorTop?: HTMLDivElement, indicatorBottom?: HTMLDivElement) {
    this.indicatorTop = indicatorTop || null
    this.indicatorBottom = indicatorBottom || null
    this.setupEventListeners()
  }

  /**
   * 更新拖拽指示器位置
   */
  private updateIndicators(rect: DOMRect, zone: 'above' | 'inside' | 'below'): void {
    if (!this.indicatorTop || !this.indicatorBottom) return

    const containerRect = this.indicatorTop.parentElement?.getBoundingClientRect()
    if (!containerRect) return

    const left = rect.left - containerRect.left
    const width = rect.width

    this.indicatorTop.style.left = `${left}px`
    this.indicatorTop.style.width = `${width}px`
    this.indicatorBottom.style.left = `${left}px`
    this.indicatorBottom.style.width = `${width}px`

    this.indicatorTop.style.top = `${rect.top - containerRect.top}px`
    // 使底部指示线紧贴节点底部
    this.indicatorBottom.style.top = `${rect.bottom - containerRect.top}px`

    this.indicatorTop.style.display = zone === 'above' ? 'block' : 'none'
    this.indicatorBottom.style.display = zone === 'below' ? 'block' : 'none'

    if (zone === 'inside') {
      this.indicatorTop.style.display = 'none'
      this.indicatorBottom.style.display = 'none'
    }
  }

  /**
   * 清除拖拽状态
   */
  private clearDragState(): void {
    this.draggingId = null
    this.hoverTargetId = null
    this.hoverZone = null

    if (this.indicatorTop) this.indicatorTop.style.display = 'none'
    if (this.indicatorBottom) this.indicatorBottom.style.display = 'none'
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 事件监听器由使用方在组件中设置
  }

  /**
   * 处理指针按下事件
   */
  public handlePointerDown(event: PointerEvent): void {
    const target = event.target as HTMLElement | null
    if (!target) return

    if (target.getAttribute('data-action') !== 'drag-handle') return

    this.draggingId = target.getAttribute('id')
    if (!this.draggingId) return

    event.preventDefault()
  }

  /**
   * 处理指针移动事件
   */
  public handlePointerMove(event: PointerEvent): void {
    if (!this.draggingId) return

    const el = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null
    if (!el) return

    const id = el.getAttribute('id') || el.closest('[id]')?.getAttribute('id')
    if (!id || id === 'root' || id === this.draggingId) return

    const nodeEl = el.closest('.tree-node') as HTMLElement | null
    if (!nodeEl) return


    // 仅获取当前节点自身内容区域（不含子节点），避免指示线位于其子区域内
    const contentEl = nodeEl.querySelector('.node-content') as HTMLElement | null
    const rect = contentEl ? contentEl.getBoundingClientRect() : nodeEl.getBoundingClientRect()
    const offsetY = event.clientY - rect.top

    let zone: 'above' | 'inside' | 'below'
    if (offsetY < rect.height / 3) zone = 'above'
    else if (offsetY > (rect.height * 2) / 3) zone = 'below'
    else zone = 'inside'

    this.hoverTargetId = id
    this.hoverZone = zone
    this.updateIndicators(rect, zone)
  }

  /**
   * 处理指针释放事件
   */
  public async handlePointerUp(): Promise<void> {
    if (this.draggingId && this.hoverTargetId && this.hoverZone) {
      // 如果目标节点是拖拽节点的子孙，则禁止此次操作
      const draggingNode = findNodeById(domTree, this.draggingId)
      if (draggingNode && hasNodeWithId(draggingNode, this.hoverTargetId)) {
        console.warn('禁止将父节点拖拽到其子孙节点内部或相邻位置，操作已取消')
        this.clearDragState()
        return
      }
      try {
        switch (this.hoverZone) {
          case 'inside':
            await moveNode(this.draggingId, this.hoverTargetId)
            break
          case 'above':
            await insertNodeBefore(this.hoverTargetId, this.draggingId)
            break
          case 'below':
            await insertNodeAfter(this.hoverTargetId, this.draggingId)
            break
        }
      } catch (error) {
        console.error('拖拽操作失败:', error)
      }
    }

    this.clearDragState()
  }

  /**
   * 获取当前拖拽状态
   */
  public getDragState() {
    return {
      draggingId: this.draggingId,
      hoverTargetId: this.hoverTargetId,
      hoverZone: this.hoverZone
    }
  }

  /**
   * 设置指示器元素
   */
  public setIndicators(indicatorTop: HTMLDivElement, indicatorBottom: HTMLDivElement): void {
    this.indicatorTop = indicatorTop
    this.indicatorBottom = indicatorBottom
  }

  /**
   * 销毁服务
   */
  public destroy(): void {
    this.clearDragState()
  }
}