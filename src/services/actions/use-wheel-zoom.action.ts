// use-wheel-zoom.action.ts
// --------------------------------------------------
// Svelte Action: 提供 Alt + 鼠标滚轮 的平滑缩放能力，可应用于画布等容器。
// - 按下指定按键(默认 Alt)时显示放大镜光标 (zoom-in)
// - 滚轮上/下滚动分别触发放大/缩小，同时切换光标为 zoom-in/zoom-out
// - 支持自定义最小/最大缩放比例
// - 支持以第一次滚动位置为缩放中心调整位移偏移
// - 滚动静止一段时间(stopDelay, 默认 200ms)后重置内部滚动序列状态
// --------------------------------------------------
import type { Action } from 'svelte/action'

export interface WheelZoomContext {
  /** 当前缩放比例 */
  getScale: () => number
  /** 设置缩放比例 */
  setScale: (scale: number) => void
  /** 获取当前位移 */
  getOffsets: () => { x: number; y: number }
  /** 设置位移 */
  setOffsets: (o: { x: number; y: number }) => void
  /** 缩放回调 */
  onZoom?: (payload: { scale: number; x: number; y: number; event: WheelEvent }) => void
}

export interface WheelZoomOptions extends WheelZoomContext {
  /** 触发缩放的按键，默认 Alt */
  key?: string
  /** 最小缩放比例，默认 0.2 */
  minScale?: number
  /** 最大缩放比例，默认 3 */
  maxScale?: number
  /** 每次滚轮增量，默认 0.1 (10%) */
  step?: number
  /** 滚动结束判定延迟，默认 200ms */
  stopDelay?: number
}

const DEFAULTS: Required<Pick<WheelZoomOptions, 'key' | 'minScale' | 'maxScale' | 'step' | 'stopDelay'>> = {
  key: 'Alt',
  minScale: 0.2,
  maxScale: 3,
  step: 0.1,
  stopDelay: 200,
}

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max)
}

const useWheelZoom: Action<HTMLElement, WheelZoomOptions> = (node, opts) => {
  let options: WheelZoomOptions = { ...DEFAULTS, ...opts }

  let keyPressed = false
  let sequenceTimer: number | null = null
  let pivot: { x: number; y: number } | null = null

  function resetSequence() {
    pivot = null
    if (!keyPressed) {
      node.style.cursor = ''
      document.body.style.cursor = ''
    } else {
      node.style.cursor = 'ns-resize'
      document.body.style.cursor = 'ns-resize'
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === options.key && !keyPressed) {
      e.preventDefault()
      keyPressed = true
      node.style.cursor = 'ns-resize'
      document.body.style.cursor = 'ns-resize'
    }
  }

  function handleKeyUp(e: KeyboardEvent) {
    if (e.key === options.key) {
      e.preventDefault()
      keyPressed = false
      if (sequenceTimer) {
        window.clearTimeout(sequenceTimer)
        sequenceTimer = null
      }
      // 立即恢复默认光标
      node.style.cursor = ''
      document.body.style.cursor = ''
      pivot = null
    }
  }

  function handleWheel(e: WheelEvent) {
    if (!keyPressed) return

    e.preventDefault()

    // 启动/重置序列计时器
    if (sequenceTimer) window.clearTimeout(sequenceTimer)
    sequenceTimer = window.setTimeout(resetSequence, options.stopDelay!)

    // 记录序列 pivot
    if (!pivot) {
      const rect = node.getBoundingClientRect()
      pivot = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }

    // 根据滚轮方向计算新缩放，使用非线性缩放因子
    const dir = e.deltaY < 0 ? 1 : -1
    
    // 根据当前缩放级别调整步长，实现更自然的缩放体验
    const currentScale = options.getScale()
    const adaptiveStep = options.step! * Math.min(1, 0.8 / Math.sqrt(currentScale))
    const factor = 1 + adaptiveStep * dir
    
    const newScale = clamp(currentScale * factor, options.minScale!, options.maxScale!)
    const scaleFactor = newScale / currentScale

    // 获取容器尺寸，用于计算相对于容器中心的位置
    const rect = node.getBoundingClientRect()
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    // 计算鼠标相对于容器中心的偏移
    const mouseX = pivot!.x - centerX
    const mouseY = pivot!.y - centerY

    // 计算基于缩放中心点的位移调整（保持鼠标位置不变）
    const { x: offsetX, y: offsetY } = options.getOffsets()
    
    // 使用精确的鼠标位置保持算法
    const newOffsetX = offsetX - mouseX * (scaleFactor - 1)
    const newOffsetY = offsetY - mouseY * (scaleFactor - 1)

    // 更新状态
    options.setScale(newScale)
    options.setOffsets({ x: newOffsetX, y: newOffsetY })
    options.onZoom?.({ scale: newScale, x: newOffsetX, y: newOffsetY, event: e })

    // 更新光标样式
    const cursor = dir > 0 ? 'zoom-in' : 'zoom-out'
    node.style.cursor = cursor
    document.body.style.cursor = cursor
  }

  // -------------------- 监听 --------------------
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
  node.addEventListener('wheel', handleWheel, { passive: false })

  return {
    update(newOpts) {
      options = { ...options, ...newOpts }
    },
    destroy() {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      node.removeEventListener('wheel', handleWheel)
      // 恢复光标
      node.style.cursor = ''
      document.body.style.cursor = ''
    },
  }
}

export default useWheelZoom