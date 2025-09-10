# 组件仓库拖拽至画布流程解析

> 适用版本：`src/components/widgets` 目录下当前实现。

---

## 总览

拖拽分为 **三大阶段**：

1. **Drag Start** —— 在组件仓库(`TabbedPanel.svelte`)开始拖动
2. **Drag Over** —— 拖动过程中经过画布(`DomCanvas.svelte`)时的反馈
3. **Drop** —— 在画布 (`DomCanvas.svelte`) 释放鼠标时落点计算 & 节点创建

下文对每一阶段的事件、数据流、关键函数作逐步说明，并指出可扩展/可定制点。

---

## 1. Drag Start – TabbedPanel.svelte

| 步骤 | 位置/函数 | 说明 |
| --- | --- | --- |
| 1 | `.warehouse-item` 按钮 | `draggable="true"` 允许拖拽。为避免浏览器默认拖拽 `<img>`，图标 `<img … draggable="false">`。 |
| 2 | <mcsymbol name="handleDragStart" filename="TabbedPanel.svelte" path="src/components/widgets/TabbedPanel.svelte" startline="81" type="function"></mcsymbol> | 在 `ondragstart` 中调用，构造 payload 并写入 `DataTransfer`。 |

```ts
function handleDragStart(e: DragEvent, item: WarehouseItem) {
  const payload = {
    type: item.type,        // 组件类型
    name: item.name,        // 默认展示名
    presetStyles: item.presetStyles ?? {}
  }
  e.dataTransfer!.setData('application/json', JSON.stringify(payload))
  e.dataTransfer!.effectAllowed = 'copy'
}
```

> **结果**：浏览器开始拖拽，光标附带 `application/json` 类型的自定义数据。

---

## 2. Drag Over – DomCanvas.svelte

`<div class="canvas-container">` 上注册：

```svelte
ondragover={handleDragOver}
```

```ts
function handleDragOver(event: DragEvent) {
  event.preventDefault();     // 允许进入 drop 区域
  event.dataTransfer!.dropEffect = 'copy'; // 光标显示加号
}
```

此阶段可扩展：

* **自动滚动** 当拖到容器边缘时滚动画布。
* **吸附网格 / 对齐辅助线** 实时计算吸附目标。

---

## 3. Drop – DomCanvas.svelte

注册：

```svelte
ondrop={handleDrop}
```

核心流程代码片段（精简）：

```ts
function handleDrop(event: DragEvent) {
  event.preventDefault();
  const dataStr = event.dataTransfer?.getData('application/json');
  if (!dataStr) return;
  const payload = JSON.parse(dataStr);

  // 1. 选定父节点 (当前选中节点 or root)
  const parentId = selectedId() || 'root';
  const parentEl = getElementByNodeId(parentId) ?? canvasContainerRef;
  const parentRect = parentEl.getBoundingClientRect();

  // 2. 解析初始宽高 (百分比)
  let widthPercent = 10, heightPercent = 10;
  if (payload.presetStyles) {
    /* 若 presetStyles.width="30%" 则覆盖默认 */
  }

  // 3. 根据鼠标位置计算百分比坐标
  const dropX = event.clientX;
  const dropY = event.clientY;
  const relativeX = ((dropX - parentRect.left) / parentRect.width) * 100;
  const relativeY = ((dropY - parentRect.top) / parentRect.height) * 100;
  const leftPercent = relativeX - widthPercent / 2;
  const topPercent  = relativeY - heightPercent / 2;

  // 4. 生成唯一 displayName (避免重名)
  const displayName = generateUniqueDataName(payload.name ?? payload.type);

  // 5. 构造新节点
  const newNode = {
    id: crypto.randomUUID(),
    componentType: payload.type,
    styles: {
      position: 'absolute',
      left: `${leftPercent}%`,
      top: `${topPercent}%`,
      width: `${widthPercent}%`,
      height: `${heightPercent}%`,
      ...payload.presetStyles
    },
    attributes: { 'data-name': displayName },
    children: []
  };

  addNodeToParent(parentId, newNode);
}
```

**注意点**：

* `setSelectedId` 被注释，保持原选中节点；如果需要拖完后切换选中可恢复。
* `position: absolute` 且百分比尺寸配合父元素自动缩放。
* `crypto.randomUUID` 作为节点唯一 `id`，兼容回退 `Date.now()`。

---

## 4. 视图更新

`domTree` Store 变化会触发 `<NodeRenderer>` 重新遍历树并动态导入对应的 Svelte 组件，实现画布实时渲染。

---

## 可扩展/优化清单

| 点 | 说明 |
| --- | --- |
| 自定义 `dragImage` | `e.dataTransfer.setDragImage(elem, x, y)` 以显示组件缩略图预览 |
| 放置策略 | 拖到节点上 -> 作为其 `children`；拖到空白处->root |
| 自动对齐 | 在 `handleDragOver` 中实时吸附网格/对齐线 |
| 多选拖拽 | Payload 可携带多个节点信息，以批量复制 |
| 撤销/重做 | 将 `addNodeToParent` 包装进命令并入全局历史栈 |

---

## 结论

当前实现已满足“从组件仓库拖拽 ➜ 画布生成节点”的基本需求，且采用百分比布局便于自适应缩放。借助本笔记可快速理解事件链路与数据结构，后续功能（对齐、吸附、动画、批量操作等）也可按上方扩展点无缝接入。

---

## 方案 A：自定义 Pointer 拖拽系统（单步“点-拖-放”）

> 摒弃浏览器原生 Drag&Drop，完全使用 `pointerdown / move / up` 自行管理拖拽流程，可实现点击即进入拖拽的顺滑体验。

### 事件流总览

```
仓库按钮 pointerdown ─┐         (在 TabbedPanel)
                     │ 创建代理 DOM（拖拽影像）并捕获指针
                     │
                     ├──── pointermove … … (document)
                     │        ↳ 移动代理 DOM 到光标位置
                     │        ↳ 可做吸附、网格、碰撞检测
                     │
                     └──── pointerup / pointercancel ─┐
                                                     │ 计算落点，写入 domTree
                                                     └ 销毁代理 DOM
```

### 1. pointerdown – TabbedPanel.svelte

| 步骤 | 说明 |
| --- | --- |
| 捕获指针 | `e.currentTarget.setPointerCapture(e.pointerId)`，确保后续 `move/up` 事件持续发送到按钮。 |
| 创建代理 DOM | 动态 `import()` 组件或使用 `<Component this={comp} …>` 创建 **真实组件实例**，附带 `presetStyles`。放到 `body` 并绝对定位。 |
| 计算初始偏移 | 记录 `offsetX/Y = e.clientX - btnRect.left` 用于后续光标对齐。 |
| 保存上下文 | 将 `payload = { type, name, presetStyles, offsetX, offsetY }` 存入闭包或 `window.__dragProxy`。 |

```ts
function handlePointerDown(e: PointerEvent, item: WarehouseItem) {
  const proxy = createProxyComponent(item);    // 返回 HTMLElement
  document.body.appendChild(proxy);

  const offsetX = e.clientX - e.currentTarget.getBoundingClientRect().left;
  const offsetY = e.clientY - e.currentTarget.getBoundingClientRect().top;

  dragContext = { proxy, item, offsetX, offsetY };
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
}
```

### 2. pointermove – 全局监听（可在 TabbedPanel 内 `window.addEventListener`）

```ts
function handlePointerMove(e: PointerEvent) {
  if (!dragContext) return;
  const { proxy, offsetX, offsetY } = dragContext;
  proxy.style.left = `${e.clientX - offsetX}px`;
  proxy.style.top  = `${e.clientY - offsetY}px`;
}
```

*可选增强*
- **吸附网格**：在此函数中计算最近对齐线，调整 `proxy` 坐标。
- **自动滚动**：判断光标接近容器边缘，调用 `scrollBy()`。

### 3. pointerup / pointercancel – 写入 domTree 并清理

```ts
function handlePointerUp(e: PointerEvent) {
  if (!dragContext) return;
  const { proxy, item, offsetX, offsetY } = dragContext;
  proxy.remove();

  // 计算落点百分比（与旧 handleDrop 类似）
  const canvasRect = canvasContainerRef.getBoundingClientRect();
  const dropX = e.clientX - offsetX + proxy.offsetWidth / 2;
  const dropY = e.clientY - offsetY + proxy.offsetHeight / 2;
  // ... 根据 presetStyles 计算 left/top/width/height
  addNodeToParent(parentId, newNode);

  dragContext = null;
}
```

### 4. DomCanvas 调整

* **不再使用** `ondragover/ondrop`；改为提供 `getBoundingClientRect()` 等辅助计算。
* 如需对齐/吸附，可暴露方法给 `handlePointerMove` 调用。

### 5. 销毁与异常处理

- 在 `pointercancel` 或 `Esc` 热键中调用同 `handlePointerUp` 的清理流程，但**不写入** domTree。
- 确保代理 DOM 始终位于最高层： `z-index: 9999; pointer-events: none;`。

### 6. 对比原生 Drag&Drop

| 维度 | 原生 DnD | Pointer 自定义 |
| --- | --- | --- |
| 启动方式 | 按下并移动 | 只需 pointerdown |
| setDragImage | 受安全限制 (需同源 img) | 直接移动代理，无限制 |
| 跨窗口 | 支持 | 需额外实现 |
| 可控性 | 较少 | 完全可控 |

### 7. 后续扩展

1. **多选**：一次 pointerdown 可克隆多个节点代理并一起移动。
2. **撤销/重做**：在 `addNodeToParent` 外包一层 command pattern。
3. **动画**：释放时可播放缩放/吸附动画，再写入节点。

> 实现自定义 Pointer 拖拽后，需删除旧的 `ondrag***` 相关代码，以免冲突。