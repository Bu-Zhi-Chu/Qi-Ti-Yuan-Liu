# 编辑页面交互分析文档

本文档详细分析了编辑页面中的三个核心交互功能：空格移动画布、Alt 缩放画布以及 B 键绘制 DOM 元素的实现流程和 CSS 属性计算公式。

## 目录

1. [空格移动画布](#1-空格移动画布)

    - [实现原理](#11-实现原理)
    - [代码流程](#12-代码流程)
    - [CSS 变换公式](#13-css变换公式)

2. [Alt 缩放画布](#2-alt缩放画布)

    - [实现原理](#21-实现原理)
    - [代码流程](#22-代码流程)
    - [CSS 变换公式](#23-css变换公式)

3. [B 键绘制 DOM](#3-b键绘制dom)
    - [实现原理](#31-实现原理)
    - [代码流程](#32-代码流程)
    - [坐标计算公式](#33-坐标计算公式)

## 1. 空格移动画布

### 1.1 实现原理

空格移动画布功能通过自定义的 Svelte Action `usePan`实现，该 Action 将空格键+鼠标左键拖动转换为画布的平移操作。核心原理是：

-   监听空格键按下/释放事件
-   监听鼠标左键按下/移动/释放事件
-   计算鼠标移动的相对位移
-   应用位移到画布的 CSS 变量

### 1.2 代码流程

1. **初始化**：在`DomCanvas.svelte`中，通过`use:usePan`指令将 Action 应用到画布容器

```svelte
<div
    bind:this={canvasContainerRef}
    class="canvas-container"
    class:editing
    style="--offset-x: {offsetX}px; --offset-y: {offsetY}px; --scale: {scale};"
    use:usePan={{
        key: 'Space',
        onPan: handlePan,
        scaleAccessor: () => getScaleRatio(),
        offsetAccessor: () => ({ x: offsetX, y: offsetY }),
        editingAccessor: () => editing
    }}
    ...
>
```

2. **事件监听**：`use-pan.action.ts`中设置了以下事件监听：

    - `window.addEventListener('keydown', handleKeyDown)`：检测空格键按下
    - `window.addEventListener('keyup', handleKeyUp)`：检测空格键释放
    - `node.addEventListener('pointerdown', onPointerDown)`：检测鼠标按下
    - `node.addEventListener('pointermove', onPointerMove)`：检测鼠标移动
    - `node.addEventListener('pointerup', onPointerUp)`：检测鼠标释放

3. **状态管理**：内部维护了拖动状态和位置信息

    ```typescript
    const state: InternalState = {
        panActive: false,
        lastX: 0,
        lastY: 0,
        totalX: 0,
        totalY: 0,
        keyPressed: false,
        throttling: false
    }
    ```

4. **位移计算**：在鼠标移动时计算相对位移并应用缩放比例

    ```typescript
    const scale = options.scaleAccessor?.() ?? 1
    const dx = (e.clientX - state.lastX) / scale
    const dy = (e.clientY - state.lastY) / scale

    state.totalX += dx
    state.totalY += dy
    ```

5. **回调通知**：通过`onPan`回调将位移信息传递给组件

    ```typescript
    options.onPan?.({ dx, dy, x: next.x, y: next.y, event: e })
    ```

6. **应用位移**：在`DomCanvas.svelte`的`handlePan`回调中更新状态变量
    ```typescript
    function handlePan({ x, y, event }: { x: number; y: number; event: PointerEvent }) {
        offsetX = x
        offsetY = y
    }
    ```

### 1.3 CSS 变换公式

画布的位移通过 CSS 变量和 transform 属性实现：

```css
.canvas-container {
    width: 100%;
    height: 100%;
    position: relative;
}

.canvas-container.editing {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(calc(-50% + calc(var(--offset-x, 0px) * var(--scale-ratio, 1))), calc(-50% + calc(var(--offset-y, 0px) * var(--scale-ratio, 1)))) scale(calc(var(--scale, 1) * 0.5));
    transform-origin: center center;
    z-index: 5;
}
```

关键公式解析：

-   `--offset-x`和`--offset-y`：存储画布的位移值（像素）
-   `--scale-ratio`：全局视口缩放比例，通过`getScaleRatio()`获取
-   `--scale`：画布的缩放值

位移计算公式：

-   水平位移：`-50% + (offsetX * scaleRatio)`
-   垂直位移：`-50% + (offsetY * scaleRatio)`

## 2. Alt 缩放画布

### 2.1 实现原理

Alt 缩放画布功能通过自定义的 Svelte Action `useWheelZoom`实现，该 Action 将 Alt 键+鼠标滚轮操作转换为画布的缩放操作。核心原理是：

-   监听 Alt 键按下/释放事件
-   监听鼠标滚轮事件
-   根据滚轮方向计算新的缩放比例
-   应用缩放比例到画布的 CSS 变量

### 2.2 代码流程

1. **初始化**：在`DomCanvas.svelte`中，通过`use:useWheelZoom`指令将 Action 应用到画布容器

```svelte
<div
    ...
    use:useWheelZoom={{
        key: 'Alt',
        getScale: () => scale,
        setScale: (newScale) => (scale = newScale),
        getOffsets: () => ({ x: offsetX, y: offsetY }),
        setOffsets: ({ x, y }) => {
            offsetX = x;
            offsetY = y;
        },
        onZoom: handleZoom,
        minScale: 0.2,
        maxScale: 3,
        step: 0.1,
        stopDelay: 200,
        editingAccessor: () => editing
    }}
    ...
>
```

2. **事件监听**：`use-wheel-zoom.action.ts`中设置了以下事件监听：

    - `window.addEventListener('keydown', handleKeyDown)`：检测 Alt 键按下
    - `window.addEventListener('keyup', handleKeyUp)`：检测 Alt 键释放
    - `node.addEventListener('wheel', handleWheel, { passive: false })`：检测滚轮事件

3. **缩放计算**：在滚轮事件中计算新的缩放比例

    ```typescript
    const dir = e.deltaY < 0 ? 1 : -1
    const factor = 1 + options.step! * dir
    const currentScale = options.getScale()
    const newScale = clamp(currentScale * factor, options.minScale!, options.maxScale!)
    ```

4. **回调通知**：通过`onZoom`回调将缩放信息传递给组件

    ```typescript
    options.onZoom?.({ scale: newScale, x: offsetX, y: offsetY, event: e })
    ```

5. **应用缩放**：在`DomCanvas.svelte`的`handleZoom`回调中更新状态变量
    ```typescript
    function handleZoom({ scale: newScale, x, y, event }: { scale: number; x: number; y: number; event: WheelEvent }) {
        offsetX = x
        offsetY = y
        scale = newScale
    }
    ```

### 2.3 CSS 变换公式

画布的缩放通过 CSS 变量和 transform 属性实现：

```css
.canvas-container.editing {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(calc(-50% + calc(var(--offset-x, 0px) * var(--scale-ratio, 1))), calc(-50% + calc(var(--offset-y, 0px) * var(--scale-ratio, 1)))) scale(calc(var(--scale, 1) * 0.5));
    transform-origin: center center;
    z-index: 5;
}
```

关键公式解析：

-   `--scale`：存储画布的缩放值
-   编辑模式下，实际缩放值为`scale * 0.5`，这是为了在编辑模式下提供更合适的视图

缩放计算公式：

-   新缩放值 = 当前缩放值 _ (1 + step _ direction)
-   direction：滚轮向上为 1（放大），向下为-1（缩小）
-   step：缩放步长，默认为 0.1（10%）

## 3. B 键绘制 DOM

### 3.1 实现原理

B 键绘制 DOM 功能通过自定义的 Svelte Action `drawModeAction`实现，该 Action 将 B 键+鼠标左键拖动转换为在选中节点内绘制矩形的操作。核心原理是：

-   监听 B 键按下/释放事件进入/退出绘制模式
-   监听鼠标左键按下/移动/释放事件
-   计算拖动区域的相对坐标
-   创建新的 DOM 节点并添加到 DOM 树

### 3.2 代码流程

1. **初始化**：在`DomCanvas.svelte`中，通过`use:drawModeAction`指令将 Action 应用到画布容器

```svelte
<div
    ...
    use:drawModeAction={{
        editingAccessor: () => editing,
        scaleAccessor: () => (editing ? scale * 0.5 : scale)
    }}
    ...
>
```

2. **状态管理**：使用`draw-mode.store.svelte.ts`管理绘制相关的状态

    ```typescript
    // 绘画模式开关状态
    let isDrawModeState = $state(false)
    // 绘制中状态
    let isDrawingState = $state(false)
    // 绘制起点
    let drawStartState = $state<{ x: number; y: number } | null>(null)
    // 绘制矩形
    let drawRectState = $state<{ left: number; top: number; width: number; height: number } | null>(null)
    // 目标节点ID
    let targetNodeIdState = $state<string | null>(null)
    ```

3. **事件监听**：`draw-mode.action.ts`中设置了以下事件监听：

    - `document.addEventListener('keydown', keydownHandler)`：检测 B 键按下
    - `document.addEventListener('keyup', keyupHandler)`：检测 B 键释放
    - 使用`registerMouseLeftPressRelease`注册鼠标按下/释放事件
    - `window.addEventListener('mousemove', handleMouseMove)`：检测鼠标移动

4. **绘制流程**：

    - B 键按下：进入绘制模式（`enterDrawMode`）
    - 鼠标按下：开始绘制（`startDrawing`）
    - 鼠标移动：更新绘制矩形（`updateDrawRect`）
    - 鼠标释放：完成绘制，创建新节点（`createDrawNode`）并添加到 DOM 树（`addNodeToParent`）
    - B 键释放：退出绘制模式（`exitDrawMode`）

5. **预览显示**：使用`DrawModeOverlay.svelte`组件显示绘制预览

### 3.3 坐标计算公式

绘制矩形的坐标计算在`draw-mode.util.ts`中的`calculateRelativeRect`函数中实现：

```typescript
export function calculateRelativeRect(start: { x: number; y: number }, end: { x: number; y: number }, parentRect: DOMRect, scaleFactor = 1): RelativeRect {
    // 先计算去除缩放后的相对像素值
    const x1Px = (start.x - parentRect.left) / scaleFactor
    const y1Px = (start.y - parentRect.top) / scaleFactor
    const x2Px = (end.x - parentRect.left) / scaleFactor
    const y2Px = (end.y - parentRect.top) / scaleFactor

    // 使用未缩放尺寸计算百分比。getBoundingClientRect 返回的 width/height 已包含 scale，需除以 scaleFactor
    const effectiveWidth = parentRect.width / scaleFactor
    const effectiveHeight = parentRect.height / scaleFactor

    const leftPercent = (Math.min(x1Px, x2Px) / effectiveWidth) * 100
    const topPercent = (Math.min(y1Px, y2Px) / effectiveHeight) * 100
    const widthPercent = (Math.abs(x2Px - x1Px) / effectiveWidth) * 100
    const heightPercent = (Math.abs(y2Px - y1Px) / effectiveHeight) * 100

    return {
        left: leftPercent,
        top: topPercent,
        width: widthPercent,
        height: heightPercent
    }
}
```

关键公式解析：

1. **像素坐标计算**：

    - 起点像素坐标：`(start.x - parentRect.left) / scaleFactor`
    - 终点像素坐标：`(end.x - parentRect.left) / scaleFactor`

2. **百分比转换**：

    - 左边距百分比：`(Math.min(x1Px, x2Px) / effectiveWidth) * 100`
    - 上边距百分比：`(Math.min(y1Px, y2Px) / effectiveHeight) * 100`
    - 宽度百分比：`(Math.abs(x2Px - x1Px) / effectiveWidth) * 100`
    - 高度百分比：`(Math.abs(y2Px - y1Px) / effectiveHeight) * 100`

3. **新节点样式**：
    ```typescript
    export function createDrawNode(rect: RelativeRect): DomNode {
        return {
            id: globalThis.crypto?.randomUUID?.() ?? `node-${Date.now()}`,
            componentType: 'SimpleBox',
            styles: {
                position: 'absolute',
                left: `${rect.left}%`,
                top: `${rect.top}%`,
                width: `${rect.width}%`,
                height: `${rect.height}%`,
                backgroundColor: 'rgba(30, 41, 59, 0.15)',
                boxSizing: 'border-box',
                overflow: 'hidden',
                pointerEvents: 'auto'
            },
            attributes: {
                'data-name': '元素'
            },
            children: []
        }
    }
    ```

## 4. V 键调整模式

### 4.1 实现原理

V 键调整模式功能通过自定义的 Svelte Action `useAdjustMode`实现，该 Action 将 V 键+鼠标左键拖动转换为选中非根节点的整体移动操作。核心原理是：

-   监听 V 键按下/释放事件进入/退出调整模式
-   监听鼠标左键按下/移动/释放事件
-   计算鼠标移动的相对位移
-   应用位移到选中节点的位置属性
-   使用状态标志防止与属性面板的循环更新

### 4.2 代码流程

1. **初始化**：在`DomCanvas.svelte`中，通过`use:useAdjustMode`指令将 Action 应用到画布容器

```svelte
<div
    ...
    use:useAdjustMode={{
        key: 'KeyV',
        editingAccessor: () => editing,
        scaleAccessor: () => (editing ? scale * 0.5 : scale),
        selectedNodeAccessor: () => $selectedNodeId,
        isRootNodeAccessor: (nodeId) => nodeId === rootNodeId,
        onAdjust: handleAdjust
    }}
    ...
>
```

2. **状态管理**：使用`adjust-mode.store.svelte.ts`管理调整模式相关的状态

    ```typescript
    // 调整模式开关状态
    let isAdjustModeState = $state(false)
    // 调整中状态
    let isAdjustingState = $state(false)
    // 调整起点
    let adjustStartState = $state<{ x: number; y: number } | null>(null)
    // 目标节点ID
    let targetNodeIdState = $state<string | null>(null)
    // 操作来源标志（防止循环更新）
    let operationSourceState = $state<'drag' | 'panel' | null>(null)
    ```

3. **事件监听**：`adjust-mode.action.ts`中设置以下事件监听：

    - `document.addEventListener('keydown', keydownHandler)`：检测 V 键按下
    - `document.addEventListener('keyup', keyupHandler)`：检测 V 键释放
    - 使用`registerMouseLeftPressRelease`注册鼠标按下/释放事件
    - `window.addEventListener('mousemove', handleMouseMove)`：检测鼠标移动

4. **调整流程**：

    - V 键按下：进入调整模式（`enterAdjustMode`）
    - 鼠标按下：开始调整（`startAdjusting`）
    - 鼠标移动：更新节点位置（`updateNodePosition`）
    - 鼠标释放：完成调整（`finishAdjusting`）
    - V 键释放：退出调整模式（`exitAdjustMode`）

5. **光标样式**：在调整模式下更改鼠标光标样式
    ```css
    .canvas-container.adjust-mode {
        cursor: move;
    }
    ```

### 4.3 防止循环更新

为了避免拖动改变属性和属性栏改变属性之间的循环更新，实现了以下机制：

1. **操作来源标志**：使用`operationSourceState`标记当前操作的来源（'drag'或'panel'）

    ```typescript
    // 在拖动开始时设置操作来源
    function startAdjusting(e: MouseEvent) {
        // ...
        operationSourceState = 'drag'
        // ...
    }

    // 在属性面板输入时设置操作来源
    function handlePropertyPanelInput() {
        operationSourceState = 'panel'
        // 处理属性面板输入...
        operationSourceState = null
    }
    ```

2. **更新节点位置时检查操作来源**：

    ```typescript
    function updateNodePosition(nodeId: string, position: { left: string; top: string }) {
        // 如果当前操作来源是属性面板，则不触发拖动更新
        if (operationSourceState === 'panel') return

        // 设置操作来源为拖动
        operationSourceState = 'drag'

        // 更新节点位置
        updateDomNodeStyles(nodeId, { left: position.left, top: position.top })

        // 清除操作来源
        operationSourceState = null
    }
    ```

3. **属性面板监听器中检查操作来源**：

    ```typescript
    $: {
        // 监听选中节点的位置变化
        if ($selectedNode && $selectedNode.styles) {
            // 如果当前操作来源是拖动，则不触发属性面板更新
            if (operationSourceState !== 'drag') {
                updatePropertyPanelValues($selectedNode.styles)
            }
        }
    }
    ```

4. **使用防抖处理频繁更新**：

    ```typescript
    import { debounce } from 'lodash-es'

    // 使用防抖函数延迟数据库更新
    const debouncedSaveToDatabase = debounce((nodeId: string, styles: any) => {
        if (operationSourceState) return // 如果正在进行操作，不保存到数据库
        saveNodeToDatabase(nodeId, styles)
    }, 300)
    ```

这种方法通过操作来源标志和防抖机制，有效防止了拖动操作和属性面板输入之间的循环更新，同时减少了与数据库的频繁交互。

## 总结

编辑页面的四个核心交互功能（空格移动画布、Alt 缩放画布、B 键绘制 DOM、V 键调整模式）通过 Svelte Action 机制实现，具有以下特点：

1. **解耦设计**：

    - 使用 Action 将交互逻辑与组件视图分离
    - 使用 Store 管理状态，实现跨组件共享

2. **响应式更新**：

    - 使用 Svelte 5 的 Runes（$state, $derived）实现细粒度响应式
    - 状态变化自动触发视图更新

3. **性能优化**：

    - 使用 CSS 变量和 transform 实现高性能动画
    - 缩放和位移计算考虑了全局视口缩放比例
    - 使用操作来源标志和防抖机制避免循环更新

4. **坐标系转换**：
    - 屏幕坐标 → 相对坐标 → 百分比坐标的精确转换
    - 考虑了缩放因子对坐标计算的影响

这四个功能共同构成了编辑页面的核心交互体验，为用户提供了直观、流畅的界面操作方式。
