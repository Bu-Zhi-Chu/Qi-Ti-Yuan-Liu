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
import { selectedId, addNodeToParent, domTree } from '../repository/dom-tree.store.svelte'

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
    if (!isDrawingGetter() || !drawStartGetter() || !targetNodeIdGetter()) return

    const targetEl = getElementByNodeId(targetNodeIdGetter() as string)
    if (!targetEl) return

    const rect = targetEl.getBoundingClientRect()
    const scale = options.scaleAccessor()
    const endPoint = clampPointToRect({ x: e.clientX, y: e.clientY }, rect)
    const nextRect = calculateRelativeRect(
      drawStartGetter() as { x: number; y: number },
      endPoint,
      rect,
      scale,
    )
    updateDrawRect(nextRect)

    e.preventDefault()
    e.stopPropagation()
  }

  /** ------------- 初始化监听 ------------ */
  function initListeners() {
    cleanup()

    // 键盘长按 B 进入绘画模式，松开 B 退出；按 Esc 可随时退出
    const keydownHandler = (e: KeyboardEvent) => {
      if (e.repeat) return // 忽略长按自动重复事件
      if (e.key === 'b' || e.key === 'B') {
        if (options.editingAccessor && !options.editingAccessor()) return
        if (!isDrawModeGetter()) {
          enterDrawMode()
          node.style.cursor = 'crosshair'
        }
        return
      }
      if (e.key === 'Escape') {
        if (isDrawModeGetter()) {
          exitDrawMode()
          node.style.cursor = 'default'
        }
      }
    }
    const keyupHandler = (e: KeyboardEvent) => {
      if (e.key === 'b' || e.key === 'B') {
        if (isDrawModeGetter()) {
          exitDrawMode()
          node.style.cursor = 'default'
        }
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
        // 按下左键开始绘制
        if (!isDrawModeGetter() || isDrawingGetter()) return
        if (options.editingAccessor && !options.editingAccessor()) return
        let id = selectedId()
        if (!id) {
          // 若未选中任何节点，则默认使用根节点 id
          id = domTree.id
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