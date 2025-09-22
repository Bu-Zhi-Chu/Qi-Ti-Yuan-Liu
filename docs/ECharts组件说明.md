# ECharts 图表组件说明

> 本文档梳理了项目中 **ECharts** 图表区块从「元数据定义 → 编辑器面板 → 运行时渲染」的完整链路，便于后续二次开发与排错。

## 1. 元数据：`blocks.config.json`

| 字段 | 说明 |
| ---- | ---- |
| `featureProps` | 控制 **特性面板 (FeatureEditor)** 的表单项。当前包含 `designWidth/Height`、`renderer`、`code`、图表案例链接等。 |
| `dataSource`  | 控制 **数据面板 (DataEditor)** 的表单项。提供三种数据接入方式：`json / mock / real`，通过 `dataAccess` 字段配置。|

依赖元数据的优势：

1. **零硬编码** – 面板 UI 100 % 由 JSON 决定；
2. **扩展简单** – 只需在此文件添加/修改字段即可同步到编辑器。

---

## 2. FeatureEditor – 特性面板

* 动态读取 `featureProps` 渲染行；
* 内置 `switch / select / number / size / image / code` 等输入类型的统一处理；
* 对 ECharts 特有逻辑：
  * 调整 `designWidth / designHeight` → 影响渲染组件的缩放；
  * 代码编辑框 `code`：存储 JS 配置片段；
  * `renderer`：Canvas / SVG 渲染器切换（通过开关控制）；
  * 图表案例链接：提供官方案例和社区案例的外部链接。

> 所有更改均通过 `updateNodeProps` 写回 **DOM Tree**。

---

## 3. DataEditor – 数据面板

### 3.1 数据源切换

* `dataAccess` = `json`：直接编辑 `seriesData`（由代码中 `data: [...]` 自动解析提取）。
* `dataAccess` = `mock`：填写接口路径 & 映射 `mockSeriesMapping` 字段。
* `dataAccess` = `real`：填写真实请求路径 & 映射 `requestSeriesMapping` 字段。

> **注意**：配置中使用 `dataAccess` 字段，但在组件内部统一映射为 `dataSource` 进行处理。

### 3.2 序列提取逻辑

通过 `series-extractor.service`：

1. **正则扫描** `code` 中的 `data: [...]`（排除 tooltip 相关数据）；
2. **数据提取** 使用 `extractDataMatches(code)` 函数，该函数：
   - 使用正则表达式 `/data\s*:\s*(\[[^\]]*\])/g` 匹配所有 `data: [...]` 结构
   - **过滤机制**：检查每个匹配项前20个字符，排除包含 `tooltip` 的数据（避免提取 tooltip 中的示例数据）
   - **返回结果**：`RegExpMatchArray[]` 数组，每个匹配项包含完整的数据数组字符串
3. **legend 数据提取**：额外调用 `extractLegendData(code)` 提取 `legend.data` 配置用于图例显示
4. **数据解析**：将提取到的数据字符串通过 `JSON.parse` 或 `Function` 构造器解析为可用的数组格式
5. **结果整合**：返回包含 `dataArrays`（数据数组）、`matches`（匹配结果）、`legendData`（图例数据）的完整提取结果
6. **支持多序列、一键同步写回**；

**extractDataMatches 函数详解**：
```typescript
export function extractDataMatches(code: string): RegExpMatchArray[] {
  const allMatches = [...code.matchAll(/data\s*:\s*(\[[^\]]*\])/g)]
  return allMatches.filter((match) => {
    const matchStart = match.index!
    const beforeMatch = code.substring(Math.max(0, matchStart - 20), matchStart)
    return !beforeMatch.includes('tooltip')
  })
}
```
- **输入**：ECharts 配置代码字符串
- **输出**：过滤后的数据数组匹配结果
- **核心逻辑**：匹配 → 过滤 tooltip → 返回有效数据

**使用场景**：
- 在 `DataEditor.svelte` 中用于计算序列数量：`getSeriesCount(code)` → 调用 `extractDataMatches(code).length`
- 在 `extractSeriesFromCode` 中用于提取数据：`const matches = extractDataMatches(code)`
- 过滤 tooltip 数据的原因：避免将 tooltip 中的示例数据误识别为图表数据序列

**示例**：
```javascript
// 输入代码
option = {
  series: [{
    data: [120, 200, 150, 80, 70, 110, 130],  // ✓ 会被提取
    type: 'bar'
  }],
  tooltip: {
    data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日']  // ✗ 会被过滤
  }
};

// 提取结果：只返回 series 中的 data 数组，忽略 tooltip 中的 data

### 3.3 `第 X 序列 / 第 X 映射` 动态属性编辑流程


1. **序列数量计算**：DataEditor 使用 `getSeriesCount(code)` 计算当前图表的序列个数（基于正则扫描用户 JS 中的 `data: [...]` 结构，返回匹配个数）。
2. **渲染输入控件**：
   * 当 `dataAccess === 'json'` 时，为每条序列渲染一个 `<CodeEditor>`，标题显示为「第一序列 / 第二序列 …」。
   * 当 `dataAccess === 'mock'` 或 `real` 时，为每条序列渲染一个 `<PropertySelect>` 或输入框，标题显示为「第一映射 / 第二映射 …」。
     * `PropertySelect` 的下拉选项来源于全局 `dataMappingKeysStore`，该 store 在运行时由 `ECharts.svelte` 根据实际请求到的数据字段动态填充，确保可视化选择。
3. **序列/映射数据来源**：
   * `seriesData`：来自 `extractSeriesFromCode` 对用户 JS 的解析结果，初次加载即写入节点属性；
   * `mockSeriesMapping` / `requestSeriesMapping`：初始为空，由用户在面板选择或输入后产生；

4. **实时回写**：用户修改后调用对应函数：
   * `updateDataArray(idx, value)` → 更新 `seriesData`；
   * `updateMockSeriesMapping(idx, path)` → 更新 `mockSeriesMapping`；
   * `updateRequestSeriesMapping(idx, path)` → 更新 `requestSeriesMapping`。
   这些函数均通过 `handleAttrChange(key, value)` 调用 `updateNodeProps()` 将新值写入节点 `attributes`。
5. **状态同步**：`updateNodeProps` 更新 **DOM Tree Store**，触发 `getNodePropsStore` 的订阅，DataEditor 与 `ECharts.svelte` 均会收到最新属性。
6. **图表刷新**：`ECharts.svelte` 在 `$derived(option)` 阶段根据最新 `seriesData` / 映射数组重新注入数据后执行 `chart.setOption()`，从而实现图表的实时更新。

---

## 4. 渲染组件：`ECharts.svelte`

核心职责：

| 模块 | 关键点 |
| ---- | ---- |
| 尺寸缩放 | 依据 `designWidth/Height` 或全局 store 计算 `scale`，在外层容器应用 `transform: scale()`，保证多分辨率自适应。 |
| 数据接入 | ① `json`：用 `seriesData` 替换代码里的 `data` 数组；② `mock/real`：调用 `cachedFetch` 拉取数据，并暴露字段到 `dataMappingKeysStore` 供面板下拉。 |
| 代码执行 | `executeJavaScriptCode` 在 **沙箱**（with + Function）中运行用户 JS，注入 `echarts.graphic` & `data` 等安全对象，返回最终 option。 |
| Option 生成 | 统一在 `$derived(option)` 中完成：loading / error / legendData 补齐 / data 替换 / 映射数据注入等。 |
| 渲染 | 当 `chartReady`（容器有尺寸）后渲染 `<Chart this={ECharts}>`。支持 `bind:ready` 事件获取实例。 |
| 错误处理 | 提供详细的错误提示和加载状态管理，包括代码执行错误和数据加载失败处理。

---

## 5. echarts-core.ts – 按需注册 & init 包装

```ts
import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
// ...use GridComponent、TooltipComponent 等
import { CanvasRenderer, SVGRenderer } from 'echarts/renderers';

echarts.use([...components]);
export default function (dom, theme, opts) {
  return echarts.init(dom, theme, { useCoarsePointer: true, ...opts });
}
```

* 集中管理 **图表类型 / 组件 / 渲染器**；
* 增加图表类型 → 只需在此 `use()` 即可。

---

## 6. 数据流概览

```mermaid
graph LR
  A[blocks.config.json] --> B(FeatureEditor / DataEditor)
  B -->|updateNodeProps| C(DOM Tree Store)
  C --> D(ECharts.svelte)
  D --> E[渲染效果]
  D --> F[dataMappingKeysStore]
  F --> B
```

---

## 7. 扩展指引

---

## 8. 图表初始化流程

1. **DOM 挂载**：`ECharts.svelte` 在 Svelte `onMount` 阶段将 `div.chart` 挂入文档，并通过 `<ECharts>` 组件的 `init` 回调执行 `echartsInit(dom, theme, opts)`（封装于 `echarts-core.ts`）。
2. **实例创建**：`echartsInit` 内部调用 `echarts.init(dom, theme, { renderer, useCoarsePointer: true, ...opts })` 获得 `chartInstance` 并返回。
3. **首次 setOption**：`svelte-echarts`（第三方库）监听 `options` prop 的初值，当检测到非空时立刻执行 `chartInstance.setOption(options, true)` 完成首渲。
4. **响应式更新**：后续只要 `options` 或 `theme/renderer` 等 prop 变化，该封装组件会再次执行 `setOption` 或 `chartInstance.dispose()+init`，从而保持图表与状态实时同步。
5. **尺寸监听**：`svelte-echarts` 默认监听父容器 ResizeObserver；在 `ECharts.svelte` 内也会根据缩放 `scale` 变化调用 `chart.resize()`，确保在编辑器缩放场景下不会出现错位。

这样即可实现「挂载→实例→首渲→更新→销毁」的完整生命周期管理，无需手动调用 `setOption()`。

---

## 9. 条件显示机制

配置支持 `showIf` 条件显示，可根据其他字段的值动态控制字段的显示/隐藏：

```json
{
  "showIf": {
    "key": "dataAccess",      // 依赖的字段名
    "value": "mock"          // 依赖字段的值
  }
}
```

---

## 10. 扩展指南

1. **添加面板字段**：在 `blocks.config.json` 的 `featureProps` 或 `dataSource` 添加条目即可；面板 UI 自动更新。
   - 支持字段类型：`switch / select / number / size / image / code / text / linkGroup`
   - 支持条件显示：`showIf` 机制
2. **支持新图表类型**：
   * 在 `echarts-core.ts` 引入并 `echarts.use()`；
   * 在示例 JS `code` 中按 ECharts 规则书写即可。
3. **自定义数据解析**：若标准 `seriesData` 替换无法满足，可修改 `extractSeriesFromCode` 实现更复杂解析逻辑。
4. **添加辅助链接**：通过 `linkGroup` 类型可添加外部链接，如图表案例和模拟平台链接。

---

> 如有疑问或改进建议，欢迎提 Issue 😉