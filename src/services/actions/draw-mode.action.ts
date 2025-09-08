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
import { selectedId, addNodeToParent } from '../repository/dom-tree.store.svelte'
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
    const guidelines: Guideline[] = []
    const children = Array.from(targetEl.children).filter((el) => !el.hasAttribute('data-align-ignore')) as HTMLElement[]
    children.forEach((child) => {
      const childRect = child.getBoundingClientRect()
      // 垂直
      if (Math.abs(e.clientX - childRect.left) <= THRESHOLD) {
        guidelines.push({ type: 'vertical', position: (childRect.left - rect.left) / scale })
      }
      if (Math.abs(e.clientX - childRect.right) <= THRESHOLD) {
        guidelines.push({ type: 'vertical', position: (childRect.right - rect.left) / scale })
      }
      // 水平
      if (Math.abs(e.clientY - childRect.top) <= THRESHOLD) {
        guidelines.push({ type: 'horizontal', position: (childRect.top - rect.top) / scale })
      }
      if (Math.abs(e.clientY - childRect.bottom) <= THRESHOLD) {
        guidelines.push({ type: 'horizontal', position: (childRect.bottom - rect.top) / scale })
      }
    })
    if (alignEnabled) {
      setGuidelines(guidelines)
    } else {
      clearGuidelines()
    }

    e.preventDefault()
    e.stopPropagation()
  }

  /** ------------- 初始化监听 ------------ */
  function initListeners() {
    cleanup()

    // 键盘状态标记
    let bPressed = false
    let altPressed = false

    // 键盘长按 B 进入绘画模式，B + Alt 进入对齐检测；松开任一键退出；按 Esc 可随时退出
    const keydownHandler = (e: KeyboardEvent) => {
      if (e.repeat) return // 忽略长按自动重复事件
      // 记录状态
      if (e.key === 'b' || e.key === 'B') {
        bPressed = true
        // 进入绘制模式（仅需 B 键）
        if (options.editingAccessor && !options.editingAccessor()) return
        if (!isDrawModeGetter()) {
          enterDrawMode()
          node.style.cursor = 'crosshair'
        }
        // 如 Alt 已按下则开启对齐
        if (altPressed) openAlign()
        return
      }
      if (e.key === 'Alt') {
        // 仅当 B 已按下时才处理 Alt，避免与画布缩放冲突
        if (!bPressed) return
        altPressed = true
        openAlign()
        e.preventDefault()
        return
      }
      if (e.key === 'Escape') {
        if (isDrawModeGetter()) {
          exitDrawMode()
          node.style.cursor = 'default'
        }
        closeAlign()
        bPressed = false
        altPressed = false
      }
    }
    const keyupHandler = (e: KeyboardEvent) => {
      if (e.key === 'b' || e.key === 'B') {
        bPressed = false
        if (isDrawModeGetter()) {
          exitDrawMode()
          node.style.cursor = 'default'
        }
        closeAlign()
        return
      }
      if (e.key === 'Alt') {
        // 若未按 B，则忽略 Alt 弹起
        if (!bPressed) return
        altPressed = false
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
      (e: MouseEvent) => {
        // 按下左键开始绘制（此时才开启对齐检测）
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
        // 松开左键结束绘制
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