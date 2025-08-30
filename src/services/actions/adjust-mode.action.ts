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
import { getScaleRatio } from '../utils/get-scale-ratio.util'
import { getElementByNodeId } from '../utils/dom-geometry.util'


// 提取数值工具函数，兼容 calc(...) 表达式，文件级复用
function extractNumeric(val: string): number {
  if (!val) return 0
  const calcMatch = val.match(/calc\([^\d]*([\d.]+)px/i)
  if (calcMatch && calcMatch[1]) return parseFloat(calcMatch[1]) || 0
  const num = parseFloat(val)
  return isNaN(num) ? 0 : num
}

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
  // 记录是否为静态布局（position: static）
  let isStaticLayoutRef = false
  // 缓存目标元素引用，避免在 mousemove 中重复查询
  let targetElRef: HTMLElement | null = null
  let updateNodePropsFn: ((id: string, props: any) => void) | null = null
  // V 键按下时为目标元素生成的 8 个手柄引用
  let handleEls: HTMLElement[] = []

  // ===== 尺寸调整相关状态 =====
  let isResizing = false
  let resizeDir: 'e' | 's' | null = null
  let initialWidth = ''
  let initialHeight = ''
  let initialWidthUnit: string = 'px'
  let initialHeightUnit: string = 'px'
  // 标记初始尺寸是否来自计算样式（computedStyle），若是则需除以全局缩放比 sr
  let initialWidthFromComputed = false
  let initialHeightFromComputed = false



  // 开始尺寸调整
  function startResize(dir: 'e' | 's', ev: MouseEvent) {
    if (!keyPressed) return
    ev.stopPropagation()
    ev.preventDefault()
    const selectedId = selectedNodeAccessor()
    if (!selectedId || isRootNodeAccessor(selectedId)) return
    const el = getElementByNodeId(selectedId)
    if (!el) return
    targetElRef = el
    isResizing = true
    resizeDir = dir
    startX = ev.clientX
    startY = ev.clientY
    // 若行内样式为 calc(...)，说明已切换至 px 模式；此时优先使用计算样式的纯像素值，避免再次解析失败
    const inlineWidth = el.style.width
    const inlineHeight = el.style.height
    const computedStyle = window.getComputedStyle(el)
    initialWidth = inlineWidth && !inlineWidth.includes('calc(') ? inlineWidth : computedStyle.width
    initialHeight = inlineHeight && !inlineHeight.includes('calc(') ? inlineHeight : computedStyle.height
    const unitRegex = /[%a-z]+$/i
    initialWidthUnit = (initialWidth.match(unitRegex) ?? ['px'])[0]
    initialHeightUnit = (initialHeight.match(unitRegex) ?? ['px'])[0]
    if (initialWidthUnit === 'auto') initialWidthUnit = 'px'
    if (initialHeightUnit === 'auto') initialHeightUnit = 'px'
    // 记录是否取自计算样式（当行内样式为空或为 calc(...) 时）
    initialWidthFromComputed = !inlineWidth || inlineWidth.includes('calc(')
    initialHeightFromComputed = !inlineHeight || inlineHeight.includes('calc(')
    startAdjusting({ x: ev.clientX, y: ev.clientY }, selectedId)
  }

  // 生成 8 个操作手柄
  function addHandles(targetEl: HTMLElement) {
    removeHandles()
    const positions = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const
    positions.forEach((pos) => {
      const h = document.createElement('div')
      h.className = `adjust-handle handle-${pos}`
      Object.assign(h.style, {
        position: 'absolute',
        width: 'calc(25px * var(--scale-ratio, 1))',
        height: 'calc(25px * var(--scale-ratio, 1))',
        background: '#409eff',
        border: 'calc(1px * var(--scale-ratio, 1)) solid #fff',
        boxSizing: 'border-box',
        pointerEvents: 'auto',
        // 移除默认 transform，后续按方向单独设置
        zIndex: '9999'
      } as CSSStyleDeclaration)
      switch (pos) {
        case 'n':
          h.style.top = 'calc(0px * var(--scale-ratio, 1))'
          h.style.left = '50%'
          h.style.transform = 'translate(-50%, 0)'
          h.style.cursor = 'ns-resize'
          break
        case 's':
          h.style.bottom = 'calc(0px * var(--scale-ratio, 1))'
          h.style.left = '50%'
          h.style.transform = 'translate(-50%, 0)'
          h.style.cursor = 'ns-resize'
          // 绑定鼠标按下事件，启用垂直方向尺寸调整
          h.addEventListener('mousedown', (ev) => startResize('s', ev))
          break
        case 'e':
          h.style.right = 'calc(0px * var(--scale-ratio, 1))'
          h.style.top = '50%'
          h.style.transform = 'translate(0, -50%)'
          h.style.cursor = 'ew-resize'
          h.addEventListener('mousedown', (ev) => startResize('e', ev))
          break
        case 'w':
          h.style.left = 'calc(0px * var(--scale-ratio, 1))'
          h.style.top = '50%'
          h.style.transform = 'translate(0, -50%)'
          h.style.cursor = 'ew-resize'
          break
        case 'nw':
          h.style.left = 'calc(0px * var(--scale-ratio, 1))'
          h.style.top = 'calc(0px * var(--scale-ratio, 1))'
          h.style.cursor = 'nwse-resize'
          // 角落不设置 transform，保持方块贴边
          break
        case 'ne':
          h.style.right = 'calc(0px * var(--scale-ratio, 1))'
          h.style.top = 'calc(0px * var(--scale-ratio, 1))'
          h.style.cursor = 'nesw-resize'
          break
        case 'se':
          h.style.right = 'calc(0px * var(--scale-ratio, 1))'
          h.style.bottom = 'calc(0px * var(--scale-ratio, 1))'
          h.style.cursor = 'nwse-resize'
          break
        case 'sw':
          h.style.left = 'calc(0px * var(--scale-ratio, 1))'
          h.style.bottom = 'calc(0px * var(--scale-ratio, 1))'
          h.style.cursor = 'nesw-resize'
          break
      }
      targetEl.appendChild(h)
      handleEls.push(h)
    })
  }

  // 移除全部手柄
  function removeHandles() {
    handleEls.forEach((el) => el.remove())
    handleEls = []
  }

  // 在调整模式下阻止点击选中
  function preventClick(e: MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
  }

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
      // 阻止点击事件
      document.addEventListener('click', preventClick, true)
      // 为当前选中节点添加 8 个操作手柄
      const targetEl = getElementByNodeId(selectedId)
      if (targetEl) {
        addHandles(targetEl)
      }
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
        +        // 解除点击事件阻止
        +        document.removeEventListener('click', preventClick, true)
      // 清理手柄
      removeHandles()
    }
  }

  /**
   * 鼠标按下处理
   */
  function handleMouseDown(e: MouseEvent) {
    // 若点在调整手柄本身，忽略整体移动逻辑
    const clickedEl = e.target as HTMLElement | null
    if (clickedEl && clickedEl.classList.contains('adjust-handle')) {
      return
    }
    if (!keyPressed) return
    if (!editingAccessor()) return

    const selectedId = selectedNodeAccessor()
    if (!selectedId || isRootNodeAccessor(selectedId)) return

    // 获取目标元素
    const targetEl = getElementByNodeId(selectedId)
    if (!targetEl) return
    targetElRef = targetEl

    // 获取元素定位类型，静态布局需使用 margin 进行偏移
    const computedStyle = window.getComputedStyle(targetEl)
    const position = computedStyle.position
    const isStaticLayout = position === 'static'
    // 缓存供 move / up 使用
    isStaticLayoutRef = isStaticLayout

    // 获取初始位置（优先行内样式，保持原单位；若未设置则退回计算样式）
    let inlineLeft = ''
    let inlineTop = ''
    if (isStaticLayout) {
      inlineLeft = (targetEl.style as any).marginLeft
      inlineTop = (targetEl.style as any).marginTop
      initialLeft = inlineLeft || computedStyle.marginLeft
      initialTop = inlineTop || computedStyle.marginTop
    } else {
      inlineLeft = targetEl.style.left
      inlineTop = targetEl.style.top
      initialLeft = inlineLeft || computedStyle.left
      initialTop = inlineTop || computedStyle.top
    }

    // 记录初始单位（% 或 px），将 auto 视为 0px
    const unitRegex = /[%a-z]+$/i
    initialLeftUnit = (initialLeft.match(unitRegex) ?? ['px'])[0]
    initialTopUnit = (initialTop.match(unitRegex) ?? ['px'])[0]
    if (initialLeftUnit === 'auto') initialLeftUnit = 'px'
    if (initialTopUnit === 'auto') initialTopUnit = 'px'

    // 计算对应单位的转换值，便于调试观察（公式同 PositionEditor）
    const parentEl = targetEl.parentElement as HTMLElement | null
    const parentWidth = parentEl?.offsetWidth || 1
    const parentHeight = parentEl?.offsetHeight || 1
    const sr = scaleAccessor() || 1
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
    const sr = getScaleRatio() || 1

    if (isResizing && resizeDir && targetEl) {
      const parentEl = targetEl.parentElement as HTMLElement | null
      const parentWidth = parentEl?.offsetWidth || 1
      const parentHeight = parentEl?.offsetHeight || 1
      if (resizeDir === 'e') {
        const dx = (e.clientX - startX) / (initialWidthUnit === '%' ? scale : scale * sr)
        const initVal = extractNumeric(initialWidth)
        const initPx = initialWidthUnit === '%' ? (initVal / 100) * parentWidth : (initialWidthFromComputed ? initVal / sr : initVal)
        const newPx = initPx + dx
        let newWidth: string
        if (initialWidthUnit === '%') {
          newWidth = `${(newPx / parentWidth) * 100}%`
        } else {
          newWidth = `calc(${Math.round(newPx)}px * var(--scale-ratio, 1))`
        }
        targetEl.style.width = newWidth
        onAdjustRef?.({ nodeId, x: newPx, y: 0 })
        if (!updateNodePropsFn) {
          import('../../services/property-panel/property-panel.service').then(({ updateNodeProps }) => {
            updateNodePropsFn = updateNodeProps
            updateNodePropsFn(nodeId, { styles: { width: newWidth } })
          })
        } else {
          updateNodePropsFn(nodeId, { styles: { width: newWidth } })
        }
      } else if (resizeDir === 's') {
        const dy = (e.clientY - startY) / (initialHeightUnit === '%' ? scale : scale * sr)
        const initVal = extractNumeric(initialHeight)
        const initPx = initialHeightUnit === '%' ? (initVal / 100) * parentHeight : (initialHeightFromComputed ? initVal / sr : initVal)
        const newPx = initPx + dy
        let newHeight: string
        if (initialHeightUnit === '%') {
          newHeight = `${(newPx / parentHeight) * 100}%`
        } else {
          newHeight = `calc(${Math.round(newPx)}px * var(--scale-ratio, 1))`
        }
        targetEl.style.height = newHeight
        onAdjustRef?.({ nodeId, x: 0, y: newPx })
        if (!updateNodePropsFn) {
          import('../../services/property-panel/property-panel.service').then(({ updateNodeProps }) => {
            updateNodePropsFn = updateNodeProps
            updateNodePropsFn(nodeId, { styles: { height: newHeight } })
          })
        } else {
          updateNodePropsFn(nodeId, { styles: { height: newHeight } })
        }
      }
      return
    }

    // 鼠标位移（屏幕像素）转设计像素：
    const dx = (e.clientX - startX) / (initialLeftUnit === '%' ? scale : scale * sr)
    const dy = (e.clientY - startY) / (initialTopUnit === '%' ? scale : scale * sr)

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
    if (isStaticLayoutRef) {
      ; (targetEl.style as any).marginLeft = newLeft;
      ; (targetEl.style as any).marginTop = newTop;
    } else {
      targetEl.style.left = newLeft
      targetEl.style.top = newTop
    }

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
    if (isResizing) {
      const nodeId = targetNodeIdGetter()
      if (nodeId && targetElRef) {
        const computed = window.getComputedStyle(targetElRef)
        const parentEl = targetElRef.parentElement as HTMLElement | null
        const parentWidth = parentEl?.offsetWidth || 1
        const parentHeight = parentEl?.offsetHeight || 1

        const toUnitValue = (valPx: number, initUnit: string, base: number): string => {
          if (initUnit === '%') {
            const percent = (valPx / base) * 100
            return `${Math.round(percent * 10) / 10}%`
          }
          // px 单位统一使用 calc 与 --scale-ratio 保持缩放一致
          return `calc(${Math.round(valPx)}px * var(--scale-ratio, 1))`
        }

        const rawWidthPx = parseFloat(computed.width) || 0
        const rawHeightPx = parseFloat(computed.height) || 0
        const sr = getScaleRatio() || 1
        const finalWidthPx = initialWidthFromComputed ? rawWidthPx / sr : rawWidthPx
        const finalHeightPx = initialHeightFromComputed ? rawHeightPx / sr : rawHeightPx

        const styles: Record<string, string> = {
          width: toUnitValue(finalWidthPx, initialWidthUnit, parentWidth),
          height: toUnitValue(finalHeightPx, initialHeightUnit, parentHeight)
        }
        if (!updateNodePropsFn) {
          import('../../services/property-panel/property-panel.service').then(({ updateNodeProps }) => {
            updateNodePropsFn = updateNodeProps
            updateNodePropsFn(nodeId, { styles })
          })
        } else {
          updateNodePropsFn(nodeId, { styles })
        }
      }
      isResizing = false
      resizeDir = null
      resetAdjustState()
      node.style.cursor = keyPressed ? 'move' : ''
      return
    }

    const nodeId = targetNodeIdGetter()
    if (!nodeId) return

    // 复用缓存元素
    const targetEl = targetElRef
    if (!targetEl) return

    // 读取最终位置样式
    const computedStyle = window.getComputedStyle(targetEl)
    const newLeft = isStaticLayoutRef ? computedStyle.marginLeft : computedStyle.left
    const newTop = isStaticLayoutRef ? computedStyle.marginTop : computedStyle.top

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
        // px 单位统一使用 calc 与 --scale-ratio 保持缩放一致
        result = `calc(${Math.round(valPx)}px * var(--scale-ratio, 1))`
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