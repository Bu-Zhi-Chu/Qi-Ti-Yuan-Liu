# 绘画模式 - 对齐辅助线显示流程

> 本文档整理了在 **绘画模式（Draw Mode）** 下，对齐辅助线（Alignment Guideline）的计算、存储与渲染完整链路，方便日后维护与功能扩展。

---

## 1. 入口：鼠标移动监听

- **文件位置**：<mcfile name="draw-mode.action.ts" path="src/services/actions/draw-mode.action.ts"></mcfile>
- **核心函数**：<mcsymbol name="handleMouseMove" filename="draw-mode.action.ts" path="src/services/actions/draw-mode.action.ts" startline="60" type="function"></mcsymbol>

#### 执行时机

按住 **`B` 键** 进入绘画模式后，画布捕获到的每一次 `mousemove` 事件都会调用 `handleMouseMove`。

#### 关键流程

1. **获取上下文**：
   - 目标容器元素（当前选中节点或 `targetNodeIdGetter()` 指定的节点）。
   - 画布缩放比例 `scale`。
2. **更新预览矩形**：若已处于绘制中状态，实时更新橡皮框并吸附到最近边缘（若有）。
3. **对齐检测**：
   - 设定动态阈值 `THRESHOLD = 4 / scale`（缩放越大，阈值越小）。
   - 遍历容器子元素，计算指针到每个子元素四条边的距离。
   - 选择距离最近且在阈值内的水平 / 垂直辅助线。
4. **结果写入 Store**：
   - 若对齐功能已开启（`isAlignOpen()` 返回 `true`），调用 `setGuidelines(guidelines)` 进行批量写入。
   - 同时记录吸附坐标 `currentSnapX / currentSnapY` 以便后续吸附。
   - 否则调用 `clearGuidelines()`。

---

## 2. Store：`draw-align.store.svelte.ts`

- **文件位置**：<mcfile name="draw-align.store.svelte.ts" path="src/services/repository/draw-align.store.svelte.ts"></mcfile>

| 属性 / 方法 | 作用 |
| --- | --- |
| `openState` | `boolean`，标记对齐检测是否开启 |
| `guidelinesState` | `Guideline[]`，当前需渲染的辅助线集合 |
| <mcsymbol name="openAlign" filename="draw-align.store.svelte.ts" path="src/services/repository/draw-align.store.svelte.ts" startline="50" type="function"></mcsymbol> / <mcsymbol name="closeAlign" filename="draw-align.store.svelte.ts" path="src/services/repository/draw-align.store.svelte.ts" startline="54" type="function"></mcsymbol> | 打开 / 关闭对齐检测，并在关闭时自动清空辅助线 |
| `setGuidelines(lines)` | 批量写入新的辅助线集合 |
| `guidelines()` / `isAlignOpen()` | 派生读取接口 |

---

## 3. 渲染层：`AlignmentOverlay.svelte`

- **文件位置**：<mcfile name="AlignmentOverlay.svelte" path="src/components/widgets/AlignmentOverlay.svelte"></mcfile>
- **引用位置**：<mcfile name="DomCanvas.svelte" path="src/components/widgets/DomCanvas.svelte"></mcfile> 中：

  ```svelte
  <!-- 对齐辅助线 -->
  <AlignmentOverlay {editing} />
  ```

#### 组件逻辑

1. 通过 `$derived` 订阅 `isAlignOpen()` 与 `guidelines()`。
2. 当 `editing`、`alignOpen` 同时为 `true` 且 `lines.length > 0` 时渲染。
3. 根据 `Guideline.type` 决定绘制竖线或横线，并计算 `left` / `top` 位置（相对容器）。
4. 利用 `portal` 指令把辅助线 DOM **挂载到目标容器** 的最顶层，确保处于其他内容之上。

---

## 4. 生命周期与快捷键

- **监听注册**：`draw-mode.action.ts` 的 `initListeners()` 在启用该 Action 时注册键盘事件。
- **快捷键**：
  - **`B`**：按下进入绘画模式 `enterDrawMode()`，松开退出 `exitDrawMode()`。
  - **`Shift` + `B`**：在绘画模式中同时按下 `Shift` 可临时开启对齐检测；松开任意键关闭。
  - **`Esc`**：随时退出绘画模式并关闭对齐。

> 以上逻辑保证了辅助线的 **启用 / 关闭** 与 **绘画模式的进入 / 退出** 始终同步，避免残留视觉元素或状态错乱。

---

## 5. 调试 & 扩展建议

- **调试**：可在 `draw-mode.action.ts` 中临时 `console.log(guidelines)` 查看实时检测结果；也可以在 `AlignmentOverlay.svelte` 中调整样式验证定位精度。
- **扩展方向**：
  1. 支持 **中心线** 或 **间距对齐** 检测。  
  2. 对齐时添加 **吸附动画** 或 **尺寸提示**。  
  3. 允许用户在设置中自定义 **吸附阈值** 或关闭辅助线显示。