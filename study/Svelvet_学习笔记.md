# Svelvet 学习笔记

> 本笔记基于官方文档 & GitHub 仓库整理，记录 **Svelvet**（Svelte 节点-连线 UI 库）的安装、核心概念与简单示例，便于后续集成到项目中。

---

## 1. 简介

Svelvet 是一个轻量级的 **Svelte 组件库**，用于构建交互式节点式 UI 与图形编辑器，灵感来源于 React Flow。提供可拖拽节点、连线、缩放平移、迷你地图等功能，全部以 Svelte 组件形式暴露，天然契合 Svelte 应用。<mcreference link="https://github.com/open-source-labs/Svelvet" index="1">1</mcreference>

- **语言 / 类型**：TypeScript 编写
- **许可证**：MIT（商业可用）
- **适用场景**：流程图、数据流、蓝图编辑器、可视化编程等

## 2. 安装

在项目根目录执行：

```bash
npm install svelvet
# 或者
pnpm add svelvet
```

安装完成后即可在 `.svelte` 文件中直接引入。<mcreference link="https://svelvet.mintlify.app/getting-started/installation" index="0">0</mcreference>

> Svelvet 不依赖其他框架，仅需 Svelte 环境即可。

## 3. 核心组件

| 组件 | 作用 |
|------|------|
| `Svelvet` | **主画布**，所有节点/边必须作为其子节点渲染 |
| `Node` | 定义一个节点，可自定义样式与插槽 |
| `Edge` | 连接两个节点的连线，由库内部根据锚点自动生成 |
| `Controls` | 可选控制条（缩放、平移、锁定等） |
| `Minimap` | 迷你地图，展示整体拓扑 |

> Svelvet 还支持分组 `Group`、背景 `Background` 等扩展组件，使用方式与普通 Svelte 组件一致。<mcreference link="https://svelvet.mintlify.app/introduction" index="4">4</mcreference>

## 4. 最小示例

```svelte
<script lang="ts">
  import { Svelvet, Node } from 'svelvet'

  const nodes = [
    { id: 1, x: 100, y: 100, content: 'A' },
    { id: 2, x: 300, y: 200, content: 'B' }
  ]
</script>

<Svelvet width={800} height={600} backgroundColor="#f9fafb">
  {#each nodes as n}
    <Node id={n.id} x={n.x} y={n.y}>
      {n.content}
    </Node>
  {/each}
</Svelvet>
```

- 传入画布尺寸、背景色等 props
- `Node` 默认带单个锚点，可通过 props/slot 自定义多个锚点、样式

## 5. 自定义节点与连线

1. **节点**：`Node` 内部可嵌套任意 Svelte 组件，实现复杂 UI；可通过 `width`、`height`、`style` 控制外观。
2. **连线**：`Edge` 支持曲线样式、箭头、动画；若使用库的自动连线，锚点对齐即可。
3. **事件**：节点/边均触发 `on:click`、`on:dblclick`、`on:drag` 等原生 DOM 事件；也可订阅 Svelvet store 监听全局状态。

## 6. 进阶功能

- **Store 集成**：Svelvet 提供 store API，可保存/恢复节点 & 边状态，实现撤销、历史记录等。
- **布局算法**：可与 Dagre、ELK 等外部库结合，实现自动布局。
- **性能**：对大量节点场景可开启虚拟化、简化节点渲染。

## 7. 与其他库对比

| 功能              | Svelvet | Drawflow | Rete.js |
|-------------------|---------|----------|---------|
| Svelte 原生支持   | ✅       | 需手动封装 | 插件提供 |
| 自定义组件灵活度   | ✅       | ✅        | ✅       |
| 插件生态           | ⚪️（新）| ⚪️       | ✅       |
| 许可证            | MIT     | MIT      | MIT     |

Svelvet 目前生态较年轻，但上手门槛低，适合 Svelte 项目快速构建蓝图编辑器。

## 8. 常见问题

1. **与 Tailwind 冲突？** 组件内部使用 Shadow DOM 方式隔离样式，无全局污染，可与 Tailwind 共存。<mcreference link="https://www.svelvet.io/" index="2">2</mcreference>
2. **支持 SSR 吗？** 由于依赖 DOM API，需在客户端渲染（可动态 import）。
3. **节点大量重绘卡顿？** 尝试开启节点虚拟化，或降级为 Canvas/WebGL 渲染方案。

---

## 9. 参考链接

- 官方文档 & 示例：<https://svelvet.io/>
- Docs (Mintlify)：<https://svelvet.mintlify.app/>
- GitHub 仓库：<https://github.com/open-source-labs/Svelvet>

> 更新时间：{{DATE}}