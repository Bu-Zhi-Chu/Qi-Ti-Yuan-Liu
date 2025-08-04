# svelte-splitpanes / @svelte-put/split-pane 学习笔记

> 本笔记聚焦 **Svelte5** 项目中实现可拖拽分栏布局的两种主流库：`svelte-splitpanes` 与 `@svelte-put/split-pane`（简称 *split-pane*），总结安装、API、实战技巧与兼容性差异。

## 1. 两者对比速览

| 特性                     | svelte-splitpanes                    | @svelte-put/split-pane |
| ------------------------ | ------------------------------------ | ---------------------- |
| 安装包名                 | `svelte-splitpanes`                  | `@svelte-put/split-pane`|
| 方向支持                 | 垂直 / 水平                          | 垂直 / 水平            |
| 多级嵌套                 | 支持                                  | 支持                  |
| 最小/最大尺寸限制        | 支持 `minSize` / `maxSize`           | 支持 `minSize` / `maxSize`|
| 双击最大化               | `dblClickSplitter`                   | 需手动实现            |
| 事件                     | `resize` / `resized` / `pane-maximize`等 | `onDrag` / `onStop`    |
| 主题自定义               | 通过 `theme` 或覆盖 CSS               | 覆盖 CSS              |
| 维护活跃度（2025-08）   | ⭐⭐⭐（最近仍有 commit）               | ⭐⭐（偶尔更新）        |

## 2. svelte-splitpanes

### 安装
```bash
pnpm add svelte-splitpanes
```

### 基本用法
```svelte
<script lang="ts">
  import { Splitpanes, Pane } from 'svelte-splitpanes';
</script>
<Splitpanes>
  <Pane minSize={20}>左侧</Pane>
  <Pane>右侧</Pane>
</Splitpanes>
```

### 关键 Props
- `horizontal` (boolean)：水平布局（默认垂直）。
- `minSize / maxSize`：百分比，约束面板尺寸。
- `dblClickSplitter`：双击分割条最大化相邻 Pane。
- `pushOtherPanes`：拖动时推动其余 Pane（默认为 `true`）。

### 事件
```svelte
<Splitpanes on:resized={(e)=>console.log(e.detail)}>
```
- `resize`：持续拖动时触发。
- `resized`：拖动结束后触发，回调提供各 Pane 尺寸。
- `pane-maximize`：双击最大化触发。

### CSS 定制
```css
:global(.splitpanes__splitter){
  background: var(--divider-color,#888);
}
```

## 3. @svelte-put/split-pane

### 安装
```bash
pnpm add @svelte-put/split-pane
```

### 基本用法
```svelte
<script lang="ts">
  import SplitPane from '@svelte-put/split-pane';
  let sizes = [50, 50]; // 可绑定双向数据
</script>
<SplitPane bind:sizes minSize={20} direction="horizontal">
  <div slot="pane">编辑器</div>
  <div slot="pane">预览区</div>
</SplitPane>
```

### 关键 Props
- `direction`：`vertical` | `horizontal`。
- `sizes`：数组，百分比占比，可绑定实现程序化控制。
- `minSize / maxSize`：同名限制。

### 事件
- `onDrag`：拖动分割条实时返回 `sizes`。
- `onStop`：拖动结束。

### 高级场景
- **动态 Pane**：使用 `#each` 渲染多个 `pane` slot。
- **保存布局**：在 `onStop` 中将 `sizes` 持久化到 IndexedDB（Dexie）或 `localStorage`。

## 4. 集成最佳实践

1. **高度继承**：父级容器必须设置 `height: 100%`，否则 Pane 无法填充。
2. **与 iframe 搭配**：在预览区使用 `<iframe sandbox="allow-scripts">`，保证拖动时 iframe 内容不遮挡 splitter（设置 `pointer-events: none` 在拖动中）
3. **可访问性**：为分割条添加 `aria-orientation`、`role="separator"` 并实现键盘左右/上下键调整。
4. **移动端优化**：可增加分割条触控区域，例如 `.splitpanes__splitter { touch-action: none; padding: 4px; }`。
5. **SSR 兼容**：组件需在客户端挂载后渲染（`onMount`），避免 `document` 未定义。

## 5. 踩坑记录

- **闪烁问题**：初始 `sizes` 未设置时，布局计算为 0，先占位后设值可避免。
- **拖动卡顿**：在 `resize` 事件中过度 `console.log` 导致性能下降；生产环境关闭日志。
- **双击事件冲突**：自定义全屏按钮与 `dblClickSplitter` 同时存在时需要停止事件冒泡。

## 6. 参考链接
- `svelte-splitpanes` 官方仓库 <https://github.com/orefalo/svelte-splitpanes>
- Demo & Docs <https://orefalo.github.io/svelte-splitpanes/>
- `@svelte-put/split-pane` NPM <https://www.npmjs.com/package/@svelte-put/split-pane>

---
> ⚠️ **选择建议**：若需高级特性（嵌套、多 Pane、双击最大化）且社区维护活跃，推荐 `svelte-splitpanes`；若倾向轻量、Sizes 双向绑定更直观，可选 `@svelte-put/split-pane`。

## 7. 2025 更新速览
- 2025-06 `svelte-splitpanes` 发布 v4.5.0：新增 `rtl` 支持、`snapOffset` 属性、修复双击最大化在 nested pane 中失效的问题 <mcreference link="https://github.com/orefalo/svelte-splitpanes" index="1">1</mcreference> <mcreference link="https://orefalo.github.io/svelte-splitpanes/" index="3">3</mcreference>
- 2025-04 `@svelte-put/split-pane` v1.3.2：`onStop` 回调新增 `direction` 参数，帮助区分水平 / 垂直场景 <mcreference link="https://www.npmjs.com/package/@svelte-put/split-pane" index="2">2</mcreference>

> **升级提示**：`svelte-splitpanes` v4 需 Svelte 4+，在 Svelte5 下兼容良好；升级后需检查自定义 CSS 变量前缀是否变动。