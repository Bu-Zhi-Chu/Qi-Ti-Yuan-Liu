/**
 * adjust-mode.action.ts
 * --------------------------------------------------------------
 * Svelte Action: 提供「V 键 + 左键拖动」调整选中非根节点位置的能力。
 * - 使用 adjust-mode.store.ts 管理调整相关响应式状态
 * - 依赖 DomTree store 提供的 selectedId
 * - 依赖 property-panel.service 更新节点属性
 *
 * 使用示例：
 * <div
 *   use:useAdjustMode={{
 *     key: 'KeyV',
 *     editingAccessor: () => editing,
 *     scaleAccessor: () => scale,
 *     selectedNodeAccessor: () => selectedNodeId,
 *     isRootNodeAccessor: (nodeId) => nodeId === rootNodeId,
 *     onAdjust: handleAdjust
 *   }}
 * />
 */

import type { Action } from 'svelte/action'
import {
  isAdjustMode as isAdjustModeGetter,
  isAdjusting as isAdjustingGetter,
  adjustStart as adjustStartGetter,
  targetNodeId as targetNodeIdGetter,
  operationSource as operationSourceGetter,
  enterAdjustMode,
  exitAdjustMode,
  startAdjusting,
  resetAdjustState,
  setOperationSource
} from '../repository/adjust-mode.store.svelte'
import { registerMouseLeftPressRelease } from '../interactions/shortcut.service'
import { getElementByNodeId } from '../utils/dom-geometry.util'


export interface AdjustModeOptions {
  /** 触发键，默认为 KeyV */
  key?: string
  /** 是否处于编辑模式的 accessor */
  editingAccessor: () => boolean
  /** 读取当前容器缩放比例 */
  scaleAccessor: () => number
  /** 读取当前选中节点ID */
  selectedNodeAccessor: () => string | null
  /** 判断是否为根节点 */
  isRootNodeAccessor: (nodeId: string) => boolean
  /** 调整回调 */
  onAdjust?: (payload: { nodeId: string; x: number; y: number }) => void
}

/**
 * 调整模式 Action
 */
const useAdjustMode: Action<HTMLElement, AdjustModeOptions> = (node, options) => {
  const {
    key = 'KeyV',
    editingAccessor,
    scaleAccessor,
    selectedNodeAccessor,
    isRootNodeAccessor,
    onAdjust
  } = options

  // 拖动过程中无需回调，仅在结束时触发
  const onAdjustRef = onAdjust

  let keyPressed = false
  let startX = 0
  let startY = 0
  let initialLeft = ''
  let initialTop = ''
  // 记录初始单位，拖拽结束时用于保持单位不变
  let initialLeftUnit: string = 'px'
  let initialTopUnit: string = 'px'
  // 缓存目标元素引用，避免在 mousemove 中重复查询
  let targetElRef: HTMLElement | null = null
  let updateNodePropsFn: ((id: string, props: any) => void) | null = null



  /**
   * 键盘按下处理
   */
  function keydownHandler(e: KeyboardEvent) {
    if (e.code !== key) return
    if (!editingAccessor()) return

    // 仅在选中非根节点时启用调整模式
    const selectedId = selectedNodeAccessor()
    if (!selectedId || isRootNodeAccessor(selectedId)) return

    if (!keyPressed) {
      keyPressed = true
      enterAdjustMode()
      node.classList.add('adjust-mode')
      node.style.cursor = 'move'
    }
  }

  /**
   * 键盘释放处理
   */
  function keyupHandler(e: KeyboardEvent) {
    if (e.code !== key) return

    if (keyPressed) {
      keyPressed = false
      exitAdjustMode()
      node.classList.remove('adjust-mode')
      node.style.cursor = ''
    }
  }

  /**
   * 鼠标按下处理
   */
  function handleMouseDown(e: MouseEvent) {
    if (!keyPressed) return
    if (!editingAccessor()) return

    const selectedId = selectedNodeAccessor()
    if (!selectedId || isRootNodeAccessor(selectedId)) return

    // 获取目标元素
    const targetEl = getElementByNodeId(selectedId)
    if (!targetEl) return
    targetElRef = targetEl

    // 获取初始位置（优先行内样式，保持原单位；若未设置则退回计算样式）
    const inlineLeft = targetEl.style.left
    const inlineTop = targetEl.style.top
    const computedStyle = window.getComputedStyle(targetEl)
    initialLeft = inlineLeft || computedStyle.left
    initialTop = inlineTop || computedStyle.top

    // 记录初始单位（% 或 px）
    const unitRegex = /[%a-z]+$/i
    initialLeftUnit = (initialLeft.match(unitRegex) ?? ['px'])[0]
    initialTopUnit = (initialTop.match(unitRegex) ?? ['px'])[0]

    // 计算对应单位的转换值，便于调试观察（公式同 PositionEditor）
    const parentEl = targetEl.parentElement as HTMLElement | null
    const parentWidth = parentEl?.offsetWidth || 1
    const parentHeight = parentEl?.offsetHeight || 1
    const sr = scaleAccessor() || 1
    // 提取数值，兼容 calc(123px * var(--scale-ratio, 1)) 形式
    const extractNumeric = (val: string): number => {
      if (!val) return 0
      const calcMatch = val.match(/calc\([^\d]*([\d.]+)px/i)
      if (calcMatch && calcMatch[1]) {
        return parseFloat(calcMatch[1]) || 0
      }
      const num = parseFloat(val)
      return isNaN(num) ? 0 : num
    }

    const initialLeftValueNum = extractNumeric(initialLeft)
    const initialTopValueNum = extractNumeric(initialTop)

    // % → 设计px (需除全局缩放比)
    const percentToPx = (percent: number, base: number) => ((percent / 100) * base) / sr
    // 设计px → % (需乘全局缩放比)
    const pxToPercent = (px: number, base: number) => ((px * sr) / base) * 100

    const initialLeftPx = initialLeftUnit === '%' ? percentToPx(initialLeftValueNum, parentWidth) : initialLeftValueNum
    const initialTopPx = initialTopUnit === '%' ? percentToPx(initialTopValueNum, parentHeight) : initialTopValueNum
    const initialLeftPercent = initialLeftUnit === '%' ? initialLeftValueNum : pxToPercent(initialLeftValueNum, parentWidth)
    const initialTopPercent = initialTopUnit === '%' ? initialTopValueNum : pxToPercent(initialTopValueNum, parentHeight)

    const convertedLeft = initialLeftUnit === '%' ? `${Math.round(initialLeftPx)}px` : `${Math.round(initialLeftPercent * 10) / 10}%`
    const convertedTop = initialTopUnit === '%' ? `${Math.round(initialTopPx)}px` : `${Math.round(initialTopPercent * 10) / 10}%`

    // 记录起始位置
    startX = e.clientX
    startY = e.clientY

    // 开始调整
    startAdjusting({ x: e.clientX, y: e.clientY }, selectedId)
    node.style.cursor = 'move'
    // 标记操作来源为拖动，便于属性面板区分
    console.log('[AdjustMode] start drag', {
      nodeId: selectedId,
      initialLeft,
      initialLeftUnit,
      convertedLeft,
      initialTop,
      initialTopUnit,
      convertedTop,
      startX,
      startY
    })
  }

  /**
   * 鼠标移动处理
   */
  function handleMouseMove(e: MouseEvent) {
    if (!isAdjustingGetter()) return

    const nodeId = targetNodeIdGetter()
    if (!nodeId) return

    // 直接复用按下时缓存的元素
    const targetEl = targetElRef
    if (!targetEl) return

    // 计算位移
    const scale = scaleAccessor()
    const dx = (e.clientX - startX) / scale
    const dy = (e.clientY - startY) / scale

    // 提取数值工具函数，兼容 calc(...) 形式
    const extractNumeric = (val: string): number => {
      if (!val) return 0
      const calcMatch = val.match(/calc\([^\d]*([\d.]+)px/i)
      if (calcMatch && calcMatch[1]) return parseFloat(calcMatch[1]) || 0
      const num = parseFloat(val)
      return isNaN(num) ? 0 : num
    }

    // 解析初始位置
    let initialLeftValue = extractNumeric(initialLeft)
    let initialTopValue = extractNumeric(initialTop)

    // 若初始单位为百分比，则在拖拽前转换为像素，拖拽过程中统一使用像素单位
    const parentEl = targetEl.parentElement as HTMLElement | null
    const parentWidth = parentEl?.offsetWidth || 1
    const parentHeight = parentEl?.offsetHeight || 1
    if (initialLeftUnit === '%') {
      initialLeftValue = (initialLeftValue / 100) * parentWidth
    }
    if (initialTopUnit === '%') {
      initialTopValue = (initialTopValue / 100) * parentHeight
    }

    // 计算新位置（像素值）
    const newLeftPx = initialLeftValue + dx
    const newTopPx = initialTopValue + dy

    // 根据初始单位生成对应格式的字符串
    let newLeft: string
    let newTop: string
    if (initialLeftUnit === '%') {
      newLeft = `${(newLeftPx / parentWidth) * 100}%`
    } else {
      newLeft = `calc(${Math.round(newLeftPx)}px * var(--scale-ratio, 1))`
    }
    if (initialTopUnit === '%') {
      newTop = `${(newTopPx / parentHeight) * 100}%`
    } else {
      newTop = `calc(${Math.round(newTopPx)}px * var(--scale-ratio, 1))`
    }

    // 更新样式
    targetEl.style.left = newLeft
    targetEl.style.top = newTop

    // 实时回调
    onAdjustRef?.({ nodeId, x: newLeftPx, y: newTopPx })

    // 实时写入数据库
    if (!updateNodePropsFn) {
      import('../../services/property-panel/property-panel.service').then(({ updateNodeProps }) => {
        updateNodePropsFn = updateNodeProps
        const position = window.getComputedStyle(targetEl).position
        const isStatic = position === 'static'
        const styles: Record<string, string> = {}
        if (isStatic) {
          styles.marginLeft = newLeft
          styles.marginTop = newTop
        } else {
          styles.left = newLeft
          styles.top = newTop
        }
        updateNodePropsFn(nodeId, { styles })
      })
    } else {
      const position = window.getComputedStyle(targetEl).position
      const isStatic = position === 'static'
      const styles: Record<string, string> = {}
      if (isStatic) {
        styles.marginLeft = newLeft
        styles.marginTop = newTop
      } else {
        styles.left = newLeft
        styles.top = newTop
      }
      updateNodePropsFn(nodeId, { styles })
    }

  }

  /**
   * 鼠标释放处理
   */
  function handleMouseUp() {
    if (!isAdjustingGetter()) return

    const nodeId = targetNodeIdGetter()
    if (!nodeId) return

    // 复用缓存元素
    const targetEl = targetElRef
    if (!targetEl) return

    // 读取最终位置样式
    const computedStyle = window.getComputedStyle(targetEl)
    const newLeft = computedStyle.left
    const newTop = computedStyle.top

    // 判断节点当前定位类型
    const position = computedStyle.position
    const isStatic = position === 'static'

    // 解析数值与单位
    const parseSize = (val: string): [number, string] => {
      const m = val.match(/^([\d.-]+)(.*)$/) || ['0', '0', 'px']
      return [parseFloat(m[1]) || 0, m[2] || 'px']
    }
    const [leftVal, leftUnit] = parseSize(newLeft)
    const [topVal, topUnit] = parseSize(newTop)


    // 根据定位类型写入对应字段，保持拖拽前的单位不变
    const parentEl = targetEl.parentElement as HTMLElement | null
    const parentWidth = parentEl?.offsetWidth || 1
    const parentHeight = parentEl?.offsetHeight || 1

    const toUnitValue = (valPx: number, initUnit: string, base: number): string => {
      let result: string
      if (initUnit === '%') {
        const percent = (valPx / base) * 100
        // 保留1位小数
        result = `${Math.round(percent * 10) / 10}%`
      } else {
        // 默认保持 px
        result = `${Math.round(valPx)}px`
      }
      // console.log('[AdjustMode] toUnitValue', { valPx, initUnit, base, result })
      return result
    }

    const styles: Record<string, string> = {}
    if (isStatic) {
      styles.marginLeft = toUnitValue(leftVal, initialLeftUnit, parentWidth)
      styles.marginTop = toUnitValue(topVal, initialTopUnit, parentHeight)
    } else {
      styles.left = toUnitValue(leftVal, initialLeftUnit, parentWidth)
      styles.top = toUnitValue(topVal, initialTopUnit, parentHeight)
    }



    // 已在拖拽过程中实时写入数据库，这里无需重复持久化
    // 重置调整状态
    resetAdjustState()
    targetElRef = null
    node.style.cursor = keyPressed ? 'move' : ''
  }

  // 注册事件监听
  document.addEventListener('keydown', keydownHandler)
  document.addEventListener('keyup', keyupHandler)
  const unregisterMouseEvents = registerMouseLeftPressRelease(handleMouseDown, handleMouseUp)
  window.addEventListener('mousemove', handleMouseMove)

  return {
    destroy() {
      document.removeEventListener('keydown', keydownHandler)
      document.removeEventListener('keyup', keyupHandler)
      unregisterMouseEvents()
      window.removeEventListener('mousemove', handleMouseMove)

    }
  }
}

export default useAdjustMode