/**
 * draw-mode.action.ts
 * --------------------------------------------------------------
 * Svelte Action: 提供「B 键 + 左键拖动」在选中节点内绘制矩形的能力。
 * - 使用 draw-mode.store.ts 管理绘制相关响应式状态
 * - 依赖工具函数 calculateRelativeRect / createDrawNode
 * - 依赖 DomTree store 提供的 selectedId / addNodeToParent
 *
 * 使用示例：
 * <div
 *   use:drawMode={{
 *     editingAccessor: () => editing,
 *     scaleAccessor: () => scale,
 *   }}
 * />
 */

import type { Action } from 'svelte/action'
import {
  isDrawMode as isDrawModeGetter,
  isDrawing as isDrawingGetter,
  drawStart as drawStartGetter,
  drawRect as drawRectGetter,
  targetNodeId as targetNodeIdGetter,
  enterDrawMode,
  exitDrawMode,
  startDrawing,
  updateDrawRect,
  resetDrawState,
} from '../repository/draw-mode.store.svelte'
import { registerMouseLeftPressRelease } from '../interactions/shortcut.service'
import { calculateRelativeRect, createDrawNode, clampPointToRect } from '../utils/draw-mode.util'
import { getElementByNodeId } from '../utils/dom-geometry.util'
import { selectedId, addNodeToParent, domTree, findNodeById } from '../repository/dom-tree.store.svelte'
import type { Guideline } from '../repository/draw-align.store.svelte'
import { openAlign, closeAlign, setGuidelines, clearGuidelines, isAlignOpen } from '../repository/draw-align.store.svelte'

export interface DrawModeOptions {
  /** 是否处于编辑模式的 accessor */
  editingAccessor: () => boolean
  /** 读取当前容器缩放比例 */
  scaleAccessor: () => number
}

interface UnregisterGroup {
  unregisterDrawMode?: () => void
  unregisterMouse?: () => void
}

const drawModeAction: Action<HTMLElement, DrawModeOptions> = (node, opts) => {
  let options: DrawModeOptions = opts

  const unregisters: UnregisterGroup = {}

  function cleanup() {
    if (unregisters.unregisterDrawMode) {
      unregisters.unregisterDrawMode()
      unregisters.unregisterDrawMode = undefined
    }
    if (unregisters.unregisterMouse) {
      unregisters.unregisterMouse()
      unregisters.unregisterMouse = undefined
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }

  // 当前可吸附位置（相对于容器、未除scale）
  let currentSnapX: number | null = null
  let currentSnapY: number | null = null

  /** ------------- 绘制过程鼠标移动 ------------- */
  function handleMouseMove(e: MouseEvent) {

    const alignEnabled = isAlignOpen()

    // 选择容器：绘制中使用 targetNodeIdGetter，否则回退到当前选中节点
    const baseId = (targetNodeIdGetter() as string | null) || selectedId()
    if (!baseId) {
      clearGuidelines()
      return
    }
    const targetEl = getElementByNodeId(baseId)
    if (!targetEl) {
      clearGuidelines()
      return
    }

    const rect = targetEl.getBoundingClientRect()
    const scale = options.scaleAccessor()

    // 绘制中才更新预览矩形
    if (isDrawingGetter() && drawStartGetter()) {
      const endPoint = clampPointToRect({ x: e.clientX, y: e.clientY }, rect)
      // 吸附预览终点
      if (currentSnapX !== null) endPoint.x = rect.left + currentSnapX * scale
      if (currentSnapY !== null) endPoint.y = rect.top + currentSnapY * scale
      const nextRect = calculateRelativeRect(
        drawStartGetter() as { x: number; y: number },
        endPoint,
        rect,
        scale,
      )
      updateDrawRect(nextRect)
    }

    // ---------------- 对齐检测 ----------------
    // 阈值：基准 4px，随画布缩放反向自适应，缩放越大阈值越小
    const BASE_THRESHOLD = 4
    const THRESHOLD = BASE_THRESHOLD / scale

    // 最近原则：垂直、水平各保留距离指针最近的一条辅助线
    let nearestVertical: Guideline | null = null
    let nearestVerticalDist = Number.POSITIVE_INFINITY
    let nearestHorizontal: Guideline | null = null
    let nearestHorizontalDist = Number.POSITIVE_INFINITY

    const children = Array.from(targetEl.children).filter((el) => !el.hasAttribute('data-align-ignore')) as HTMLElement[]
    children.forEach((child) => {
      const childRect = child.getBoundingClientRect()

      // 垂直方向（左右边缘）
      const leftDist = Math.abs(e.clientX - childRect.left)
      if (leftDist <= THRESHOLD && leftDist < nearestVerticalDist) {
        nearestVerticalDist = leftDist
        nearestVertical = {
          type: 'vertical',
          position: (childRect.left - rect.left) / scale,
        }
      }
      const rightDist = Math.abs(e.clientX - childRect.right)
      if (rightDist <= THRESHOLD && rightDist < nearestVerticalDist) {
        nearestVerticalDist = rightDist
        nearestVertical = {
          type: 'vertical',
          position: (childRect.right - rect.left) / scale,
        }
      }

      // 水平方向（上下边缘）
      const topDist = Math.abs(e.clientY - childRect.top)
      if (topDist <= THRESHOLD && topDist < nearestHorizontalDist) {
        nearestHorizontalDist = topDist
        nearestHorizontal = {
          type: 'horizontal',
          position: (childRect.top - rect.top) / scale,
        }
      }
      const bottomDist = Math.abs(e.clientY - childRect.bottom)
      if (bottomDist <= THRESHOLD && bottomDist < nearestHorizontalDist) {
        nearestHorizontalDist = bottomDist
        nearestHorizontal = {
          type: 'horizontal',
          position: (childRect.bottom - rect.top) / scale,
        }
      }
    })

    const guidelines: Guideline[] = []
    if (nearestVertical) guidelines.push(nearestVertical)
    if (nearestHorizontal) guidelines.push(nearestHorizontal)

    if (alignEnabled) {
      setGuidelines(guidelines)
      if (nearestVertical !== null) {
        currentSnapX = (nearestVertical as Guideline).position
      } else {
        currentSnapX = null
      }
      if (nearestHorizontal !== null) {
        currentSnapY = (nearestHorizontal as Guideline).position
      } else {
        currentSnapY = null
      }
    } else {
      clearGuidelines()
      currentSnapX = null
      currentSnapY = null
    }

    e.preventDefault()
    e.stopPropagation()
  }

  /** ------------- 初始化监听 ------------ */
  function initListeners() {
    cleanup()

    function isSelectedNodeLocked(): boolean {
      const id = selectedId()
      if (!id) return false
      const target = findNodeById(domTree, id)
      return target ? (target.selfLocked ?? false) || (target.inheritedLocked ?? false) : false
    }

    // 键盘状态标记
    let bPressed = false
    let shiftPressed = false

    // 键盘长按 B 进入绘画模式，B + Shift 进入对齐检测；松开任一键退出；按 Esc 可随时退出
    const keydownHandler = (e: KeyboardEvent) => {
      if (e.repeat) return // 忽略长按自动重复事件
      // 输入框/可编辑区域内打字时忽略快捷键，避免误触
      const target = e.target as HTMLElement | null
      if (
        target &&
        (['INPUT', 'TEXTAREA'].includes(target.tagName) ||
          (typeof (target as any).closest === 'function' && target.closest('[contenteditable="true"]')))
      ) {
        return
      }
      // 记录状态
      if (e.key === 'b' || e.key === 'B') {
        if (isSelectedNodeLocked()) return
        bPressed = true
        // 进入绘制模式（仅需 B 键）
        if (options.editingAccessor && !options.editingAccessor()) return
        if (!isDrawModeGetter()) {
          enterDrawMode()
          node.style.cursor = 'crosshair'
        }
        // 如 Shift 已按下则开启对齐
        if (shiftPressed) openAlign()
        return
      }
      if (e.key === 'Shift') {
        // 仅当 B 已按下时才处理 Alt，避免与画布缩放冲突
        if (!bPressed) return
        shiftPressed = true
        openAlign()
        return
      }
      if (e.key === 'Escape') {
        if (isDrawModeGetter()) {
          exitDrawMode()
          node.style.cursor = 'default'
        }
        closeAlign()
        bPressed = false
        shiftPressed = false
      }
    }
    const keyupHandler = (e: KeyboardEvent) => {
      // 输入框/可编辑区域内打字时忽略快捷键对应状态变化
      const target = e.target as HTMLElement | null
      if (
        target &&
        (['INPUT', 'TEXTAREA'].includes(target.tagName) ||
          (typeof (target as any).closest === 'function' && target.closest('[contenteditable="true"]')))
      ) {
        return
      }
      if (e.key === 'b' || e.key === 'B') {
        // 松开 B：结束绘画，并同步关闭对齐状态
        bPressed = false
        if (isDrawModeGetter()) {
          exitDrawMode()
          node.style.cursor = 'default'
        }
        closeAlign()
        // 同步重置 Shift 状态，避免残留
        shiftPressed = false
        return
      }
      if (e.key === 'Shift') {
        // 若未按 B，则忽略 Alt 弹起
        if (!bPressed) return
        shiftPressed = false
        closeAlign()
      }
    }
    document.addEventListener('keydown', keydownHandler)
    document.addEventListener('keyup', keyupHandler)
    unregisters.unregisterDrawMode = () => {
      document.removeEventListener('keydown', keydownHandler)
      document.removeEventListener('keyup', keyupHandler)
    }


    // 鼠标按压/释放
    unregisters.unregisterMouse = registerMouseLeftPressRelease(
      (e: MouseEvent) => {      // 按下左键开始绘制（此时才开启对齐检测）\n        // 再次执行一次对齐检测，确保使用最新吸附坐标\n        handleMouseMove(e);
        if (!isDrawModeGetter() || isDrawingGetter()) return
        if (options.editingAccessor && !options.editingAccessor()) return
        let id = selectedId()
        if (!id) {
          // 若未选中任何节点，则默认使用根节点 id
          id = 'root'
        }
        const targetEl = id ? getElementByNodeId(id) : null
        if (!targetEl) return

        const rect = targetEl.getBoundingClientRect()
        const scale = options.scaleAccessor()
        const clampedStart = clampPointToRect({ x: e.clientX, y: e.clientY }, rect)
        // 吸附起点
        if (currentSnapX !== null) clampedStart.x = rect.left + currentSnapX * scale
        if (currentSnapY !== null) clampedStart.y = rect.top + currentSnapY * scale
        const start = clampedStart
        const initRect = {
          left: ((clampedStart.x - rect.left) / scale / rect.width) * 100,
          top: ((clampedStart.y - rect.top) / scale / rect.height) * 100,
          width: 0,
          height: 0,
        }
        startDrawing(start, initRect, id as string)

        e.preventDefault()
        e.stopPropagation()
      },
      (e: MouseEvent) => {
        // 松开左键结束绘制\n        // 结束前再次执行对齐检测，保证终点吸附\n        handleMouseMove(e);
        if (!isDrawingGetter() || !drawStartGetter() || !drawRectGetter() || !targetNodeIdGetter()) return

        const targetEl = getElementByNodeId(targetNodeIdGetter() as string)
        if (!targetEl) {
          resetDrawState()
          clearGuidelines()
          closeAlign()
          return
        }

        const rect = targetEl.getBoundingClientRect()
        const scale = options.scaleAccessor()
        const endPoint = clampPointToRect({ x: e.clientX, y: e.clientY }, rect)
        // 吸附终点
        if (currentSnapX !== null) endPoint.x = rect.left + currentSnapX * scale
        if (currentSnapY !== null) endPoint.y = rect.top + currentSnapY * scale
        const finalRect = calculateRelativeRect(drawStartGetter() as { x: number; y: number }, endPoint, rect, scale)

        if ((finalRect.width * rect.width) / 100 > 5 && (finalRect.height * rect.height) / 100 > 5) {
          const newNode = createDrawNode(finalRect)
          addNodeToParent(targetNodeIdGetter() as string, newNode)
        }

        resetDrawState()

        e.preventDefault()
        e.stopPropagation()
      },
    )

    // mousemove
    window.addEventListener('mousemove', handleMouseMove)
  }

  initListeners()

  return {
    update(newOpts) {
      options = { ...options, ...newOpts }
      initListeners()
    },
    destroy() {
      cleanup()
    },
  }
}

export default drawModeAction