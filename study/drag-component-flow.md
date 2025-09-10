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
