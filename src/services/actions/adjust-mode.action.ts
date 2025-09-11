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
import { moveDomByOffset } from '../utils/move-dom.util'
import { getElementByNodeId } from '../utils/dom-geometry.util'
import { copySelectedNode, pasteNodeToSelectedParent } from '../repository/dom-tree.store.svelte'


// 提取数值工具函数，兼容 calc(...) 表达式，文件级复用
function extractNumeric(val: string): number {
  if (!val) return 0
  const calcMatch = val.match(/calc\([^\d]*([\d.]+)px/i)
  if (calcMatch && calcMatch[1]) return parseFloat(calcMatch[1]) || 0
  const num = parseFloat(val)
  return isNaN(num) ? 0 : num
}

// 提取单位正则，供全文件复用
const UNIT_REGEX = /[%a-z]+$/i

// 将像素值转为指定单位
const toUnitValue = (valPx: number, initUnit: string, base: number): string => {
  if (initUnit === '%') {
    const percent = (valPx / base) * 100
    return `${Math.round(percent * 10) / 10}%`
  }
  // px 单位统一使用 calc 与 --scale-ratio 保持缩放一致
  return `calc(${Math.round(valPx)}px * var(--scale-ratio, 1))`
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
  let shiftPressed = false
  // Shift 锁轴状态: 'x' 表示锁定水平，仅水平位移；'y' 表示锁定垂直，仅垂直位移；null 表示未锁定
  let axisLocked: 'x' | 'y' | null = null
  let ctrlCopyPressed = false
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
  // 新增覆盖层引用
  let overlayEl: HTMLElement | null = null
  // 当前已添加覆盖层的节点 ID
  let currentOverlayNodeId: string | null = null
  // requestAnimationFrame 任务 ID，用于取消
  let monitorRAF = 0

  // ===== 尺寸调整相关状态 =====
  let isResizing = false
  let resizeDir: 'e' | 's' | 'se' | 'w' | 'n' | 'nw' | 'ne' | 'sw' | null = null
  let initialWidth = ''
  let initialHeight = ''
  let initialWidthUnit: string = 'px'
  let initialHeightUnit: string = 'px'
  // 标记初始尺寸是否来自计算样式（computedStyle），若是则需除以全局缩放比 sr
  let initialWidthFromComputed = false
  let initialHeightFromComputed = false



  // 开始尺寸调整
  function startResize(dir: 'e' | 's' | 'se' | 'w' | 'n' | 'nw' | 'ne' | 'sw', ev: MouseEvent) {
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
    initialWidthUnit = (initialWidth.match(UNIT_REGEX) ?? ['px'])[0]
    initialHeightUnit = (initialHeight.match(UNIT_REGEX) ?? ['px'])[0]
    if (initialWidthUnit === 'auto') initialWidthUnit = 'px'
    if (initialHeightUnit === 'auto') initialHeightUnit = 'px'
    // 记录是否取自计算样式（当行内样式为空或为 calc(...) 时）
    initialWidthFromComputed = !inlineWidth || inlineWidth.includes('calc(')
    initialHeightFromComputed = !inlineHeight || inlineHeight.includes('calc(')
    // 捕获初始 left / top，用于 w/n 及其组合方向补偿
    if (dir.includes('w') || dir.includes('n')) {
      const computedPosStyle = window.getComputedStyle(el)
      isStaticLayoutRef = computedPosStyle.position === 'static'
      if (dir.includes('w')) {
        const inlineLeftVal = el.style.left
        initialLeft = inlineLeftVal || computedPosStyle.left
        initialLeftUnit = (initialLeft.match(UNIT_REGEX) ?? ['px'])[0]
        if (initialLeftUnit === 'auto') initialLeftUnit = 'px'
      }
      if (dir.includes('n')) {
        const inlineTopVal = el.style.top
        initialTop = inlineTopVal || computedPosStyle.top
        initialTopUnit = (initialTop.match(UNIT_REGEX) ?? ['px'])[0]
        if (initialTopUnit === 'auto') initialTopUnit = 'px'
      }
    }
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
          h.addEventListener('mousedown', (ev) => startResize('n', ev))
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
          h.addEventListener('mousedown', (ev) => startResize('w', ev))
          break
        case 'nw':
          h.style.left = 'calc(0px * var(--scale-ratio, 1))'
          h.style.top = 'calc(0px * var(--scale-ratio, 1))'
          h.style.cursor = 'nwse-resize'
          // 角落不设置 transform，保持方块贴边
          h.addEventListener('mousedown', (ev) => startResize('nw', ev))
          break
        case 'ne':
          h.style.right = 'calc(0px * var(--scale-ratio, 1))'
          h.style.top = 'calc(0px * var(--scale-ratio, 1))'
          h.style.cursor = 'nesw-resize'
          h.addEventListener('mousedown', (ev) => startResize('ne', ev))
          break
        case 'se':
          h.style.right = 'calc(0px * var(--scale-ratio, 1))'
          h.style.bottom = 'calc(0px * var(--scale-ratio, 1))'
          h.style.cursor = 'nwse-resize'
          h.addEventListener('mousedown', (ev) => startResize('se', ev))
          break
        case 'sw':
          h.style.left = 'calc(0px * var(--scale-ratio, 1))'
          h.style.bottom = 'calc(0px * var(--scale-ratio, 1))'
          h.style.cursor = 'nesw-resize'
          h.addEventListener('mousedown', (ev) => startResize('sw', ev))
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

  // 创建覆盖层并添加手柄
  function addOverlayWithHandles(targetEl: HTMLElement) {
    // 保证仅存在一个覆盖层
    removeOverlay()

    // 若目标元素无定位上下文，强制设为 relative，确保绝对定位参考
    if (getComputedStyle(targetEl).position === 'static') {
      targetEl.style.position = 'relative'
    }

    // 外层 100% 尺寸绝对容器
    const wrapper = document.createElement('div')
    Object.assign(wrapper.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: '9998'
    } as CSSStyleDeclaration)

    // 内层真正可交互的覆盖层
    const overlay = document.createElement('div')
    overlay.className = 'adjust-overlay'
    Object.assign(overlay.style, {
      position: 'relative',
      width: '100%',
      height: '100%',
      pointerEvents: 'auto',
      boxSizing: 'border-box',
      background: 'transparent'
    } as CSSStyleDeclaration)

    wrapper.appendChild(overlay)
    targetEl.appendChild(wrapper)
    overlayEl = wrapper
    currentOverlayNodeId = targetEl.getAttribute('node-id') || selectedNodeAccessor() || null

    // 在覆盖层内部挂载操作手柄
    addHandles(overlay)
  }

  // 移除覆盖层及其内部手柄
  function removeOverlay() {
    if (overlayEl) {
      removeHandles()
      overlayEl.remove()
      overlayEl = null
    }
  }

  // 在调整模式下阻止点击选中
  // 仅在点击事件发生于覆盖层内部时才阻止冒泡，避免拦截工具栏等其他操作
  function preventClick(e: MouseEvent) {
    if (overlayEl && overlayEl.contains(e.target as Node)) {
      e.stopPropagation()
      e.preventDefault()
    }
  }

  /**
   * 键盘按下处理
   */
  function keydownHandler(e: KeyboardEvent) {
    // 若正在输入框/文本域/可编辑区域中输入，则忽略快捷键
    const target = e.target as HTMLElement | null;
    if (
      target &&
      (['INPUT', 'TEXTAREA'].includes(target.tagName) ||
        (typeof (target as any).closest === 'function' && target.closest('[contenteditable="true"]')))
    ) {
      return;
    }
    if (e.code !== key) return
    // 避免 Ctrl+V 等组合键触发独立 V 功能
    if (e.ctrlKey || e.metaKey) return

    if (!editingAccessor()) return

    // 仅在选中非根节点时启用调整模式
    const selectedId = selectedNodeAccessor()
    if (!selectedId || isRootNodeAccessor(selectedId)) return

    if (!keyPressed) {
      keyPressed = true
      enterAdjustMode()
      node.classList.add('adjust-mode')
      node.style.cursor = 'move'
      // 阻止点击/右键菜单事件
      document.addEventListener('click', preventClick, true)
      document.addEventListener('contextmenu', preventClick, true)
      const targetEl = getElementByNodeId(selectedId)
      if (targetEl) {
        addOverlayWithHandles(targetEl)
      }
      // 启动选中节点监视，保证切换节点时同步更新手柄
      const monitor = () => {
        if (!keyPressed) return
        const curId = selectedNodeAccessor()
        if (!curId || isRootNodeAccessor(curId)) {
          // 选中根节点或无节点时，自动退出调整模式
          const evt = new KeyboardEvent('keyup', {
            key: 'v',
            code: key,
            bubbles: true,
            cancelable: true
          })
          document.dispatchEvent(evt)
          return
        }
        if (curId !== currentOverlayNodeId) {
          const newEl = getElementByNodeId(curId)
          removeOverlay()
          if (newEl) addOverlayWithHandles(newEl)
        }
        monitorRAF = requestAnimationFrame(monitor)
      }
      monitorRAF = requestAnimationFrame(monitor)
    }
  }

  /**
   * 键盘释放处理
   */
  function keyupHandler(e: KeyboardEvent) {
    const target = e.target as HTMLElement | null;
    if (
      target &&
      (['INPUT', 'TEXTAREA'].includes(target.tagName) ||
        (typeof (target as any).closest === 'function' && target.closest('[contenteditable="true"]')))
    ) {
      return;
    }
    if (e.code !== key) return
    if (e.ctrlKey || e.metaKey) return

    if (keyPressed) {
      keyPressed = false
      exitAdjustMode()
      node.classList.remove('adjust-mode')
      node.style.cursor = ''
      // 解除点击/右键菜单阻止
      document.removeEventListener('click', preventClick, true)
      document.removeEventListener('contextmenu', preventClick, true)
      // 清理手柄
      removeHandles()
      // 清理覆盖层
      removeOverlay()
      cancelAnimationFrame(monitorRAF)
    }
  }

  /**
   * Ctrl 键按下处理（复制并切换为新节点）
   */
  function ctrlKeydownHandler(e: KeyboardEvent) {
    if (!keyPressed) return
    if (ctrlCopyPressed) return
    if (e.key !== 'Control') return

    ctrlCopyPressed = true
    const copied = copySelectedNode()
    if (!copied) return
    pasteNodeToSelectedParent(true, true).then((newId) => {
      if (!newId) return
      const newEl = getElementByNodeId(newId)
      if (newEl) {
        removeOverlay()
        addOverlayWithHandles(newEl)
        targetElRef = newEl
      }
      // 复制粘贴后不立即进入拖动，等待用户再次按住 V 并拖动
    })
  }

  function ctrlKeyupHandler(e: KeyboardEvent) {

    if (e.key !== 'Control') return
    ctrlCopyPressed = false
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
    initialLeftUnit = (initialLeft.match(UNIT_REGEX) ?? ['px'])[0]
    initialTopUnit = (initialTop.match(UNIT_REGEX) ?? ['px'])[0]
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
        const stylesToUpdate: any = { width: newWidth }
        onAdjustRef?.({ nodeId, x: newPx, y: 0 })
        if (!updateNodePropsFn) {
          import('../../services/property-panel/property-panel.service').then(({ updateNodeProps }) => {
            updateNodePropsFn = updateNodeProps
            updateNodePropsFn(nodeId, { styles: stylesToUpdate })
          })
        } else {
          updateNodePropsFn(nodeId, { styles: stylesToUpdate })
        }
      } else if (resizeDir === 'se') {
        const dx = (e.clientX - startX) / (initialWidthUnit === '%' ? scale : scale * sr)
        const dy = (e.clientY - startY) / (initialHeightUnit === '%' ? scale : scale * sr)

        const initWVal = extractNumeric(initialWidth)
        const initHPx = extractNumeric(initialHeight)

        const initWxPx = initialWidthUnit === '%' ? (initWVal / 100) * parentWidth : (initialWidthFromComputed ? initWVal / sr : initWVal)
        const initHyPx = initialHeightUnit === '%' ? (initHPx / 100) * parentHeight : (initialHeightFromComputed ? initHPx / sr : initHPx)

        const newWxPx = initWxPx + dx
        const newHyPx = initHyPx + dy

        let newWidth: string
        let newHeight: string
        if (initialWidthUnit === '%') {
          newWidth = `${(newWxPx / parentWidth) * 100}%`
        } else {
          newWidth = `calc(${Math.round(newWxPx)}px * var(--scale-ratio, 1))`
        }
        if (initialHeightUnit === '%') {
          newHeight = `${(newHyPx / parentHeight) * 100}%`
        } else {
          newHeight = `calc(${Math.round(newHyPx)}px * var(--scale-ratio, 1))`
        }
        targetEl.style.width = newWidth
        targetEl.style.height = newHeight
        const stylesToUpdate: any = { width: newWidth, height: newHeight }
        onAdjustRef?.({ nodeId, x: newWxPx, y: newHyPx })
        if (!updateNodePropsFn) {
          import('../../services/property-panel/property-panel.service').then(({ updateNodeProps }) => {
            updateNodePropsFn = updateNodeProps
            updateNodePropsFn(nodeId, { styles: stylesToUpdate })
          })
        } else {
          updateNodePropsFn(nodeId, { styles: stylesToUpdate })
        }
      } else if (resizeDir === 'nw') {
        const dxDesign = (e.clientX - startX) / (initialWidthUnit === '%' ? scale : scale * sr);
        const dyDesign = (e.clientY - startY) / (initialHeightUnit === '%' ? scale : scale * sr);
        const parentEl = targetEl.parentElement as HTMLElement | null;
        const parentWidth = parentEl?.offsetWidth || 1;
        const parentHeight = parentEl?.offsetHeight || 1;
        const handleMoveAndResize = () => {
          moveDomByOffset({
            targetEl,
            nodeId,
            dxScreen: e.clientX - startX,
            dyScreen: e.clientY - startY,
            scale,
            initialLeft,
            initialTop,
            initialLeftUnit,
            initialTopUnit,
            isStaticLayout: isStaticLayoutRef,
            updateNodeProps: updateNodePropsFn!,
            onAdjust: undefined
          });
          const initWVal = extractNumeric(initialWidth);
          const initHVal = extractNumeric(initialHeight);
          const initWxPx = initialWidthUnit === '%' ? (initWVal / 100) * parentWidth : (initialWidthFromComputed ? initWVal / sr : initWVal);
          const initHyPx = initialHeightUnit === '%' ? (initHVal / 100) * parentHeight : (initialHeightFromComputed ? initHVal / sr : initHVal);
          const newWxPx = initWxPx - dxDesign;
          const newHyPx = initHyPx - dyDesign;
          const newWidth = initialWidthUnit === '%' ? `${(newWxPx / parentWidth) * 100}%` : `calc(${Math.round(newWxPx)}px * var(--scale-ratio, 1))`;
          const newHeight = initialHeightUnit === '%' ? `${(newHyPx / parentHeight) * 100}%` : `calc(${Math.round(newHyPx)}px * var(--scale-ratio, 1))`;
          targetEl.style.width = newWidth;
          targetEl.style.height = newHeight;
          updateNodePropsFn!(nodeId, { styles: { width: newWidth, height: newHeight } });
          onAdjustRef?.({ nodeId, x: newWxPx, y: newHyPx });
        };
        if (!updateNodePropsFn) {
          import('../../services/property-panel/property-panel.service').then(({ updateNodeProps }) => {
            updateNodePropsFn = updateNodeProps;
            handleMoveAndResize();
          });
        } else {
          handleMoveAndResize();
        }
      } else if (resizeDir === 'ne') {
        const dxDesign = (e.clientX - startX) / (initialWidthUnit === '%' ? scale : scale * sr);
        const dyDesign = (e.clientY - startY) / (initialHeightUnit === '%' ? scale : scale * sr);
        const parentEl = targetEl.parentElement as HTMLElement | null;
        const parentWidth = parentEl?.offsetWidth || 1;
        const parentHeight = parentEl?.offsetHeight || 1;
        const handleMoveAndResize = () => {
          // 仅补偿顶部
          moveDomByOffset({
            targetEl,
            nodeId,
            dxScreen: 0,
            dyScreen: e.clientY - startY,
            scale,
            initialLeft,
            initialTop,
            initialLeftUnit,
            initialTopUnit,
            isStaticLayout: isStaticLayoutRef,
            updateNodeProps: updateNodePropsFn!,
            onAdjust: undefined
          });
          const initWVal = extractNumeric(initialWidth);
          const initHVal = extractNumeric(initialHeight);
          const initWxPx = initialWidthUnit === '%' ? (initWVal / 100) * parentWidth : (initialWidthFromComputed ? initWVal / sr : initWVal);
          const initHyPx = initialHeightUnit === '%' ? (initHVal / 100) * parentHeight : (initialHeightFromComputed ? initHVal / sr : initHVal);
          const newWxPx = initWxPx + dxDesign;
          const newHyPx = initHyPx - dyDesign;
          const newWidth = initialWidthUnit === '%' ? `${(newWxPx / parentWidth) * 100}%` : `calc(${Math.round(newWxPx)}px * var(--scale-ratio, 1))`;
          const newHeight = initialHeightUnit === '%' ? `${(newHyPx / parentHeight) * 100}%` : `calc(${Math.round(newHyPx)}px * var(--scale-ratio, 1))`;
          targetEl.style.width = newWidth;
          targetEl.style.height = newHeight;
          updateNodePropsFn!(nodeId, { styles: { width: newWidth, height: newHeight } });
          onAdjustRef?.({ nodeId, x: newWxPx, y: newHyPx });
        };
        if (!updateNodePropsFn) {
          import('../../services/property-panel/property-panel.service').then(({ updateNodeProps }) => {
            updateNodePropsFn = updateNodeProps;
            handleMoveAndResize();
          });
        } else {
          handleMoveAndResize();
        }
      } else if (resizeDir === 'sw') {
        const dxDesign = (e.clientX - startX) / (initialWidthUnit === '%' ? scale : scale * sr);
        const dyDesign = (e.clientY - startY) / (initialHeightUnit === '%' ? scale : scale * sr);
        const parentEl = targetEl.parentElement as HTMLElement | null;
        const parentWidth = parentEl?.offsetWidth || 1;
        const parentHeight = parentEl?.offsetHeight || 1;
        const handleMoveAndResize = () => {
          // 仅补偿左侧
          moveDomByOffset({
            targetEl,
            nodeId,
            dxScreen: e.clientX - startX,
            dyScreen: 0,
            scale,
            initialLeft,
            initialTop,
            initialLeftUnit,
            initialTopUnit,
            isStaticLayout: isStaticLayoutRef,
            updateNodeProps: updateNodePropsFn!,
            onAdjust: undefined
          });
          const initWVal = extractNumeric(initialWidth);
          const initHVal = extractNumeric(initialHeight);
          const initWxPx = initialWidthUnit === '%' ? (initWVal / 100) * parentWidth : (initialWidthFromComputed ? initWVal / sr : initWVal);
          const initHyPx = initialHeightUnit === '%' ? (initHVal / 100) * parentHeight : (initialHeightFromComputed ? initHVal / sr : initHVal);
          const newWxPx = initWxPx - dxDesign;
          const newHyPx = initHyPx + dyDesign;
          const newWidth = initialWidthUnit === '%' ? `${(newWxPx / parentWidth) * 100}%` : `calc(${Math.round(newWxPx)}px * var(--scale-ratio, 1))`;
          const newHeight = initialHeightUnit === '%' ? `${(newHyPx / parentHeight) * 100}%` : `calc(${Math.round(newHyPx)}px * var(--scale-ratio, 1))`;
          targetEl.style.width = newWidth;
          targetEl.style.height = newHeight;
          updateNodePropsFn!(nodeId, { styles: { width: newWidth, height: newHeight } });
          onAdjustRef?.({ nodeId, x: newWxPx, y: newHyPx });
        };
        if (!updateNodePropsFn) {
          import('../../services/property-panel/property-panel.service').then(({ updateNodeProps }) => {
            updateNodePropsFn = updateNodeProps;
            handleMoveAndResize();
          });
        } else {
          handleMoveAndResize();
        }
      } else if (resizeDir === 'w') {
        // 以设计像素为基准的横向位移（不受单位差异影响）
        const dxDesign = (e.clientX - startX) / (initialWidthUnit === '%' ? scale : scale * sr);
        const parentEl = targetEl.parentElement as HTMLElement | null;
        const parentWidth = parentEl?.offsetWidth || 1;

        // 1. 先利用 moveDomByOffset 处理左侧定位补偿
        if (!updateNodePropsFn) {
          import('../../services/property-panel/property-panel.service').then(({ updateNodeProps }) => {
            updateNodePropsFn = updateNodeProps;

            // 仅处理水平方向移动，垂直方向不变
            moveDomByOffset({
              targetEl,
              nodeId,
              dxScreen: e.clientX - startX,
              dyScreen: 0, // 垂直方向不变
              scale,
              initialLeft,
              initialTop,
              initialLeftUnit,
              initialTopUnit,
              isStaticLayout: isStaticLayoutRef,
              updateNodeProps: updateNodePropsFn,
              // 暂不触发回调，等宽度一起处理
              onAdjust: undefined
            });

            // 2. 单独处理宽度变化
            const initWidthVal = extractNumeric(initialWidth);
            const initWidthPx = initialWidthUnit === '%' ? (initWidthVal / 100) * parentWidth : (initialWidthFromComputed ? initWidthVal / sr : initWidthVal);
            const newWidthPx = initWidthPx - dxDesign;

            // 按原始单位回写宽度
            const newWidth = initialWidthUnit === '%' ? `${(newWidthPx / parentWidth) * 100}%` : `calc(${Math.round(newWidthPx)}px * var(--scale-ratio, 1))`;
            targetEl.style.width = newWidth;

            // 更新宽度
            updateNodePropsFn(nodeId, { styles: { width: newWidth } });

            // 回调
            onAdjustRef?.({ nodeId, x: newWidthPx, y: 0 });
          });
        } else {
          // 仅处理水平方向移动，垂直方向不变
          moveDomByOffset({
            targetEl,
            nodeId,
            dxScreen: e.clientX - startX,
            dyScreen: 0, // 垂直方向不变
            scale,
            initialLeft,
            initialTop,
            initialLeftUnit,
            initialTopUnit,
            isStaticLayout: isStaticLayoutRef,
            updateNodeProps: updateNodePropsFn,
            // 暂不触发回调，等宽度一起处理
            onAdjust: undefined
          });

          // 2. 单独处理宽度变化
          const initWidthVal = extractNumeric(initialWidth);
          const initWidthPx = initialWidthUnit === '%' ? (initWidthVal / 100) * parentWidth : (initialWidthFromComputed ? initWidthVal / sr : initWidthVal);
          const newWidthPx = initWidthPx - dxDesign;

          // 按原始单位回写宽度
          const newWidth = initialWidthUnit === '%' ? `${(newWidthPx / parentWidth) * 100}%` : `calc(${Math.round(newWidthPx)}px * var(--scale-ratio, 1))`;
          targetEl.style.width = newWidth;

          // 更新宽度
          updateNodePropsFn(nodeId, { styles: { width: newWidth } });

          // 回调
          onAdjustRef?.({ nodeId, x: newWidthPx, y: 0 });
        }
      } else if (resizeDir === 'n') {
        // 以设计像素为基准的纵向位移
        const dyDesign = (e.clientY - startY) / (initialHeightUnit === '%' ? scale : scale * sr);
        const parentEl = targetEl.parentElement as HTMLElement | null;
        const parentHeight = parentEl?.offsetHeight || 1;

        // 1. 先利用 moveDomByOffset 处理上侧定位补偿
        const handleMoveAndHeight = () => {
          // 仅处理垂直方向移动，水平方向不变
          moveDomByOffset({
            targetEl,
            nodeId,
            dxScreen: 0,
            dyScreen: e.clientY - startY,
            scale,
            initialLeft,
            initialTop,
            initialLeftUnit,
            initialTopUnit,
            isStaticLayout: isStaticLayoutRef,
            updateNodeProps: updateNodePropsFn!,
            onAdjust: undefined
          });

          // 2. 单独处理高度变化
          const initHeightVal = extractNumeric(initialHeight);
          const initHeightPx = initialHeightUnit === '%' ? (initHeightVal / 100) * parentHeight : (initialHeightFromComputed ? initHeightVal / sr : initHeightVal);
          const newHeightPx = initHeightPx - dyDesign;

          const newHeight = initialHeightUnit === '%' ? `${(newHeightPx / parentHeight) * 100}%` : `calc(${Math.round(newHeightPx)}px * var(--scale-ratio, 1))`;
          targetEl.style.height = newHeight;

          // 更新高度
          updateNodePropsFn!(nodeId, { styles: { height: newHeight } });

          // 回调
          onAdjustRef?.({ nodeId, x: 0, y: newHeightPx });
        };

        if (!updateNodePropsFn) {
          import('../../services/property-panel/property-panel.service').then(({ updateNodeProps }) => {
            updateNodePropsFn = updateNodeProps;
            handleMoveAndHeight();
          });
        } else {
          handleMoveAndHeight();
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
    const rawDx = e.clientX - startX
    const rawDy = e.clientY - startY
    let dxScreen = rawDx
    let dyScreen = rawDy
    if (shiftPressed) {
      const threshold = 8 // 像素阈值，避免轻微抖动触发切换
      // 首次按下 Shift 时，根据超过阈值的方向锁定轴向
      if (!axisLocked) {
        if (Math.abs(rawDx) > threshold || Math.abs(rawDy) > threshold) {
          axisLocked = Math.abs(rawDx) > Math.abs(rawDy) ? 'x' : 'y'
        }
      }
      if (!axisLocked) {
        // 未锁定前 DOM 不移动
        dxScreen = 0
        dyScreen = 0
      } else if (axisLocked === 'x') {
        dyScreen = 0
      } else if (axisLocked === 'y') {
        dxScreen = 0
      }
    } else {
      axisLocked = null
    }
    // 使用 moveDomByOffset 封装逻辑
    if (!updateNodePropsFn) {
      import('../../services/property-panel/property-panel.service').then(({ updateNodeProps }) => {
        updateNodePropsFn = updateNodeProps
        moveDomByOffset({
          targetEl,
          nodeId,
          dxScreen: dxScreen,
          dyScreen: dyScreen,
          scale,
          initialLeft,
          initialTop,
          initialLeftUnit,
          initialTopUnit,
          isStaticLayout: isStaticLayoutRef,
          updateNodeProps: updateNodePropsFn,
          onAdjust: onAdjustRef
        })
      })
    } else {
      moveDomByOffset({
        targetEl,
        nodeId,
        dxScreen: dxScreen,
        dyScreen: dyScreen,
        scale,
        initialLeft,
        initialTop,
        initialLeftUnit,
        initialTopUnit,
        isStaticLayout: isStaticLayoutRef,
        updateNodeProps: updateNodePropsFn,
        onAdjust: onAdjustRef
      })
    }
    return


  }

  /**
   * 鼠标释放处理
   */
  function handleMouseUp() {
    // 鼠标释放后重置 Shift 状态，防止异常残留
    shiftPressed = false
    axisLocked = null
    if (isResizing) {
      const nodeId = targetNodeIdGetter()
      if (nodeId && targetElRef) {
        const computed = window.getComputedStyle(targetElRef)
        const parentEl = targetElRef.parentElement as HTMLElement | null
        const parentWidth = parentEl?.offsetWidth || 1
        const parentHeight = parentEl?.offsetHeight || 1



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
  document.addEventListener('keydown', ctrlKeydownHandler)
  document.addEventListener('keyup', ctrlKeyupHandler)

  // Shift 锁轴键按下/释放
  function shiftKeydownHandler(e: KeyboardEvent) {
    if (e.key !== 'Shift') return
    shiftPressed = true
  }
  function shiftKeyupHandler(e: KeyboardEvent) {
    if (e.key !== 'Shift') return
    shiftPressed = false
    axisLocked = null
  }
  document.addEventListener('keydown', shiftKeydownHandler)
  document.addEventListener('keyup', shiftKeyupHandler)
  const unregisterMouseEvents = registerMouseLeftPressRelease(handleMouseDown, handleMouseUp)
  window.addEventListener('mousemove', handleMouseMove)

  return {
    destroy() {
      document.removeEventListener('keydown', keydownHandler)
      document.removeEventListener('keyup', keyupHandler)
      document.removeEventListener('keydown', ctrlKeydownHandler)
      document.removeEventListener('keyup', ctrlKeyupHandler)
      document.removeEventListener('keydown', shiftKeydownHandler)
      document.removeEventListener('keyup', shiftKeyupHandler)
      unregisterMouseEvents()
      window.removeEventListener('mousemove', handleMouseMove)
      // 移除覆盖层及手柄
      removeOverlay()
      cancelAnimationFrame(monitorRAF)
    }
  }
}

export default useAdjustMode