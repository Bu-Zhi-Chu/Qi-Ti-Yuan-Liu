# ECharts 图表组件说明

> 本文档梳理了项目中 **ECharts** 图表区块从「元数据定义 → 编辑器面板 → 运行时渲染」的完整链路，便于后续二次开发与排错。

## 1. 元数据：`blocks.config.json`

| 字段 | 说明 |
| ---- | ---- |
| `featureProps` | 控制 **特性面板 (FeatureEditor)** 的表单项。当前包含 `designWidth/Height`、`renderer`、`code` 等。 |
| `dataSource`  | 控制 **数据面板 (DataEditor)** 的表单项。提供三种数据接入方式：`json / mock / real`。|

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
  * `renderer`：Canvas / SVG 渲染器切换。

> 所有更改均通过 `updateNodeProps` 写回 **DOM Tree**。

---

## 3. DataEditor – 数据面板

### 3.1 数据源切换

* `dataSource` = `json`：直接编辑 `seriesData`（由代码中 `data: [...]` 自动解析提取）。
* `dataSource` = `mock`：填写接口路径 & 映射 `mockSeriesMapping` 字段。
* `dataSource` = `real`：填写真实请求路径 & 映射 `requestSeriesMapping` 字段。

### 3.2 序列提取逻辑

通过 `series-extractor.service`：

1. 正则扫描 `code` 中的 `data: [...]`；
2. 将结果写入 `seriesData`，供面板 JSON 编辑；
3. 支持多序列、一键同步写回。

### 3.3 `第 X 序列 / 第 X 映射` 动态属性编辑流程


1. **序列数量计算**：DataEditor 使用 `getSeriesCount(code)` 计算当前图表的序列个数（基于正则扫描用户 JS 中的 `series: [ ... ]` 结构，返回子数组个数）。
2. **渲染输入控件**：
   * 当 `dataSource === 'json'` 时，为每条序列渲染一个 `<CodeEditor>`，标题显示为「第一序列 / 第二序列 …」。
   * 当 `dataSource === 'mock'` 或 `real` 时，为每条序列渲染一个 `<PropertySelect>` 或输入框，标题显示为「第一映射 / 第二映射 …」。
     * `PropertySelect` 的下拉选项来源于全局 `dataMappingKeysStore`，该 store 在运行时由 `ECharts.svelte` 根据实际请求到的数据字段动态填充，确保可视化选择。
3. **序列/映射数据来源**：
   * `seriesData`：来自 `extractSeriesFromCode` 对用户 JS 的解析结果，初次加载即写入节点属性；
   * `mockSeriesMapping` / `requestSeriesMapping`：初始为空，由用户在面板选择或输入后产生；

4. **实时回写**：用户修改后调用对应函数：
   * `updateDataArray(idx, value)` → 更新 `seriesData`；
   * `updateMockSeriesMapping(idx, path)` → 更新 `mockSeriesMapping`；
   * `updateRequestSeriesMapping(idx, path)` → 更新 `requestSeriesMapping`。
   这些函数均通过 `handleAttrChange(key, value)` 调用 `updateNodeProps()` 将新值写入节点 `attributes`。
4. **状态同步**：`updateNodeProps` 更新 **DOM Tree Store**，触发 `getNodePropsStore` 的订阅，DataEditor 与 `ECharts.svelte` 均会收到最新属性。
5. **图表刷新**：`ECharts.svelte` 在 `$derived(option)` 阶段根据最新 `seriesData` / 映射数组重新注入数据后执行 `chart.setOption()`，从而实现图表的实时更新。

---

## 4. 渲染组件：`ECharts.svelte`

核心职责：

| 模块 | 关键点 |
| ---- | ---- |
| 尺寸缩放 | 依据 `designWidth/Height` 或全局 store 计算 `scale`，在外层容器应用 `transform: scale()`，保证多分辨率自适应。 |
| 数据接入 | ① `json`：用 `seriesData` 替换代码里的 `data` 数组；② `mock/real`：调用 `cachedFetch` 拉取数据，并暴露字段到 `dataMappingKeysStore` 供面板下拉。 |
| 代码执行 | `executeJavaScriptCode` 在 **沙箱**（with + Function）中运行用户 JS，注入 `echarts.graphic` & `data` 等安全对象，返回最终 option。 |
| Option 生成 | 统一在 `$derived(option)` 中完成：loading / error / legendData 补齐 / data 替换等。
| 渲染 | 当 `chartReady`（容器有尺寸）后渲染 `<Chart this={ECharts}>`。支持 `bind:ready` 事件获取实例。

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
```

---

## 7. 扩展指引

1. **添加面板字段**：在 `blocks.config.json` 的 `featureProps` 或 `dataSource` 添加条目即可；面板 UI 自动更新。
2. **支持新图表类型**：
   * 在 `echarts-core.ts` 引入并 `echarts.use()`；
   * 在示例 JS `code` 中按 ECharts 规则书写即可。
3. **自定义数据解析**：若标准 `seriesData` 替换无法满足，可修改 `extractSeriesFromCode` 实现更复杂解析逻辑。

---

> 如有疑问或改进建议，欢迎提 Issue 😉