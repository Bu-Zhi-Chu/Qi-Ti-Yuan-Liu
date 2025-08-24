# 属性面板回显差异分析

## 现象
1. **节点编号（ID）** 刷新后能够始终正确回显。
2. 其他属性编辑器（定位、布局、背景、文本、边框、事件等）刷新后常显示默认值，需手动切换节点或再次操作才更新。

## 原因对比
| 项目 | 依赖关系 | 首次刷新流程 |
|------|----------|--------------|
| 节点编号 | 仅依赖 `selectedId` | `selectedId` 在应用启动时即可获得 → 直接回显 |
| 其他属性字段 | 同时依赖 `selectedId` **与** `getNodeProps(selectedId)` | 启动早期 `domTree`（IndexedDB→Dexie）尚未加载完成 → `getNodeProps` 返回 `undefined` → 反应块填入默认值并停止更新 |

> 当 `domTree` 随后加载完毕时，`selectedId` 未发生变化，响应式 `$:` 块不会重新触发，因此默认值一直保留，看似“回显失败”。

## 解决思路
1. **让响应式块订阅 `domTreeVersion`**
   ```svelte
   import { domTreeVersion } from '@/services/repository/dom-tree.store.svelte'
   $: if (selectedId && domTreeVersion) {
       styleSnapshot = getNodeProps(selectedId);
       // ...同步 currentX 变量
   }
   ```
2. **封装 `getNodePropsStore(id)`**
   * 在 `property-panel.service` 返回可订阅派生值，内部依赖 `domTree`，自动推送更新。
3. **使用 `$effect` 监听多依赖**
   ```svelte
   $effect(() => {
     if (!selectedId) return;
     const snapshot = getNodeProps(selectedId);
     // ...同步
   }, [selectedId, domTree])
   ```
4. **在 `domTree` 初始化完成后触发一次 `selectedId` 更新**（权宜之计）。

## 推荐方案
优先采用 **方案 1 或 2**：
* 侵入性小，保持组件内聚；
* 数据源变化可即时推送，彻底解决回显不一致问题。

## 定位样式页签为何能够正确回显？

1. **默认值掩盖了问题**
   PositionEditor 在初始化时将 `currentPosition` 设为 `static`、其余尺寸字段设为空字符串，这与大多数节点在数据库中的初始值保持一致。即使 `getNodeProps()` 首轮返回 `undefined`，UI 仍呈现与真实数据吻合的“默认”形态。

2. **空值视觉上等同于真实值**
   宽高、边距等字段通过 `parseSize()` 解析后得到 `['', '%']`。输入框留空再加上下拉框默认 `static`，用户难以察觉与真实样式的差异。

3. **仅在显式设置时才暴露缺陷**
   如果节点确实提前写入了 `top/left` 等定位值，`domTree` 尚未完成时这些值同样会缺失；只是常规场景很少预设这些属性，因此问题不常显现。

4. **根因与其他页签一致**
   PositionEditor 的 `$:` 依赖依旧只有 `selectedId`，并未订阅 `domTree` 变化。它之所以“正常”纯属默认值巧合遮蔽了竞态。本质上仍应采用上一节推荐的 **订阅 `domTreeVersion` 或派生 store** 方案来彻底根治。

### 对比总结

| 编辑器 | 默认值策略 | 竞态后视觉效果 |
|--------|-----------|----------------|
| AttrEditor / LayoutEditor 等 | 预设占位 (`block`, `%`, `auto`...) | 与真实数据不符，明显“回显失败” |
| PositionEditor | 空字符串 + `static` 默认 | 大部分情况下与真实数据一致，不易察觉 |
| 节点编号 | 直接取 `selectedId` | 一定正确 |

---
> 文档生成于 2025-08，适用于当前 `svelte5` + `dexie` 项目结构。