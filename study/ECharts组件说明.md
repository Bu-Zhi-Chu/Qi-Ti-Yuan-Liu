# ECharts 图表组件说明

## 1. 组件概述

ECharts 组件是一个基于 Apache ECharts 的数据可视化组件，支持通过 JavaScript 代码配置图表，并提供数据源切换、动态数据映射、实时编辑等功能。

### 1.1 最近更新（2025年）

**数据映射机制重大改进**：
- **实例数据优先**：优先从 ECharts 实例获取真实数据，而非从代码解析
- **智能数据替换**：通过深度比较定位数据位置，支持更复杂的数据结构
- **多轴支持**：支持替换 series.data、xAxis.data、yAxis.data 中的数据
- **数据完整性**：移除数据长度限制，保持原始数据长度，避免数据截断
- **图例同步**：自动根据 `legend.data` 更新 `series.name`，保持显示一致性
- **调试增强**：提供详细的匹配调试信息，帮助开发者追踪数据替换过程

> 本文档梳理了项目中 **ECharts** 图表区块从「元数据定义 → 编辑器面板 → 运行时渲染」的完整链路，便于后续二次开发与排错。

## 1. 元数据：`blocks.config.json`

| 字段 | 说明 |
| ---- | ---- |
| `featureProps` | 控制 **特性面板 (FeatureEditor)** 的表单项。当前包含 `designWidth/Height`、`renderer`、`code`、图表案例链接等。 |
| `dataSource`  | 控制 **数据面板 (DataEditor)** 的表单项。提供三种数据接入方式：`json / mock / real`，通过 `dataSource.dataAccess` 字段配置。|

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

* `dataSource.dataAccess` = `json`：直接编辑 `seriesData`（由代码中 `data: [...]` 自动解析提取）。
* `dataSource.dataAccess` = `mock`：填写接口路径 & 映射 `mockSeriesMapping` 字段。
* `dataSource.dataAccess` = `real`：填写真实请求路径 & 映射 `requestSeriesMapping` 字段。

> **注意**：配置中使用 `dataSource.dataAccess` 字段定义，但在组件代码中通过 `dataSource` 属性读取，并提供了兼容性处理：`currentValues.dataSource ?? dataSourceConfig?.default ?? 'json'`。在 DataEditor 中，优先使用节点属性中的 `dataSource` 值，如果没有则使用组件配置的默认值，最后回退到 `'json'`。

### 3.2 序列提取逻辑

通过 `series-extractor.service`：

1. **实例数据提取**（新实现）：优先从 ECharts 实例中获取实际数据，包括 series.data、legend.data、xAxis.data；
2. **数据提取** 使用 `extractDataMatches(code)` 函数，该函数：
   - **实例数据优先**：如果存在 ECharts 实例，直接读取 `chartInst.getOption()` 获取真实数据
   - **多类型数据支持**：提取 series.data、legend.data、xAxis.data 等不同类型的数据
   - **返回结果**：`RegExpMatchArray[]` 数组，保持与旧接口兼容
3. **legend 数据提取**：额外调用 `extractLegendData(code)` 提取 `legend.data` 配置用于图例显示
4. **数据解析**：将提取到的数据字符串通过 `JSON.parse` 或 `Function` 构造器解析为可用的数组格式
5. **结果整合**：返回包含 `dataArrays`（数据数组）、`matches`（匹配结果）、`legendData`（图例数据）的完整提取结果
6. **支持多序列、一键同步写回**；

**数据映射机制**（新实现）：
- **智能数据匹配**：`executeJavaScriptCode` 函数通过深度比较来定位数据位置，而非简单的正则替换
- **多位置支持**：支持替换 series.data、xAxis.data、yAxis.data 中的数据
- **数据兼容性**：移除数据长度限制，保持原始数据长度，避免截断或填充
- **调试信息**：提供详细的匹配调试信息，帮助开发者追踪数据替换过程

**DataEditor 中的序列计数修复**：
- **问题**：当切换数据源或刷新页面时，`seriesCount` 可能为 0，导致无法显示动态映射字段
- **原因**：`extractSeriesFromCode` 返回的 `matches` 数组为空，但 `seriesData` 实际有数据
- **解决方案**：在 `DataEditor.svelte` 的 `derivedState` 函数中添加多重保护机制：
  1. **无 code 情况**：当 `!code` 时，使用 `seriesData.length` 创建空的 `matches` 数组
  2. **缓存修复**：当使用缓存且 `matches.length === 0` 但 `seriesData` 有数据时，创建空的 `matches` 数组
  3. **解析修复**：当 `extractSeriesFromCode` 返回空 `matches` 但 `seriesData` 有数据时，创建空的 `matches` 数组
- **实现**：创建兼容的 `RegExpMatchArray` 对象，确保 `seriesCount = matches.length` 正确反映实际序列数量

**ECharts 实例数据优先级**（新实现）：
- **实例数据优先**：`extractDataMatches` 函数优先从 ECharts 实例获取数据，而非从代码解析
- **实时同步**：在数据编辑时，ECharts 实例数据会实时更新，确保提取的数据是最新的
- **图例同步**：自动根据 `legend.data` 更新 `series.name`，保持图例与序列名称一致
- **兼容性保证**：即使无法获取实例数据，也会回退到代码解析模式

**extractDataMatches 函数详解**（新实现）：
```typescript
export function extractDataMatches(code: string): RegExpMatchArray[] {
  // 1. 优先从 ECharts 实例获取数据
  const currentId = selectedId?.()
  let instanceSeriesData: any[] = []
  let instanceLegendData: any[] | undefined = undefined
  let instanceXAxisData: any[] | undefined = undefined
  let originalOption: any = null

  if (currentId) {
    const chartInst = getEChartsInstance(currentId)
    if (chartInst && typeof chartInst.getOption === 'function') {
      try {
        const option = chartInst.getOption()
        originalOption = option

        // 提取 series 数据
        let series = (option?.series ?? []) as any[]
        if (!Array.isArray(series)) series = [series]
        instanceSeriesData = series
          .filter(s => Array.isArray(s?.data))
          .map(s => s.data)

        // 提取 legend 数据
        const legend = option?.legend ?? {}
        if (Array.isArray(legend)) {
          instanceLegendData = legend[0]?.data ?? undefined
        } else if (legend && typeof legend === 'object') {
          instanceLegendData = (legend as any).data
        }

        // 提取 xAxis 数据
        const xAxis = option?.xAxis ?? {}
        if (Array.isArray(xAxis)) {
          instanceXAxisData = xAxis[0]?.data ?? undefined
        } else if (xAxis && typeof xAxis === 'object') {
          instanceXAxisData = (xAxis as any).data
        }
      } catch (err) {
        console.warn('[series-extractor] 读取 ECharts 实例 option 时失败', err)
      }
    }
  }

  // 2. 将实例数据转换为伪 RegExpMatchArray，保持旧接口兼容
  const fakeMatches: RegExpMatchArray[] = []

  // 优先添加 legend 数据
  if (instanceLegendData && Array.isArray(instanceLegendData)) {
    const legendStr = JSON.stringify(instanceLegendData)
    fakeMatches.push([`legend.data: ${legendStr}`, legendStr] as unknown as RegExpMatchArray)

    // 同步更新 series[].name，确保与 legend.data 一致
    if (originalOption && originalOption.series && Array.isArray(originalOption.series)) {
      originalOption.series.forEach((series: any, index: number) => {
        if (instanceLegendData && instanceLegendData[index]) {
          series.name = instanceLegendData[index]
        }
      })
    }
  }

  // 添加 xAxis 数据
  if (instanceXAxisData && Array.isArray(instanceXAxisData)) {
    const xAxisStr = JSON.stringify(instanceXAxisData)
    fakeMatches.push([`xAxis.data: ${xAxisStr}`, xAxisStr] as unknown as RegExpMatchArray)
  }

  // 添加各 series.data
  instanceSeriesData.forEach((arr) => {
    const arrStr = JSON.stringify(arr)
    fakeMatches.push([`series.data: ${arrStr}`, arrStr] as unknown as RegExpMatchArray)
  })

  return fakeMatches
}
```
- **输入**：ECharts 配置代码字符串（备用）
- **输出**：从实例获取的真实数据，格式化为 RegExpMatchArray
- **核心逻辑**：实例数据优先 → 转换为兼容格式 → 返回有效数据

**使用场景**：
- 在 `DataEditor.svelte` 中用于计算序列数量：调用 `extractSeriesFromCode(code)` 后使用 `matches.length` 获取序列个数
- 在 `extractSeriesFromCode` 中用于提取数据：`const matches = extractDataMatches(code)`
- **优势**：使用真实运行时的数据，比正则提取更准确可靠

### 3.3 数据配置清理机制

当用户在 **FeatureEditor** 中清空 `code` 字段时，系统会自动清除所有相关的数据配置，包括：
- `seriesData`：序列数据
- `mockPath`：模拟数据接口路径
- `mockSeriesMapping`：模拟数据字段映射
- `requestPath`：真实数据接口路径
- `requestSeriesMapping`：真实数据字段映射

这种清理机制确保了当图表配置被重置时，不会残留无效的数据映射配置，保持数据一致性。该逻辑在 `FeatureEditor.svelte` 的 `handleAttrChange` 函数中实现，仅在用户手动修改 `code` 时触发（切换页签等操作不会触发清理）。

**数据替换优化**（新实现）：
- **智能匹配**：`executeJavaScriptCode` 函数使用深度比较来定位数据位置，而非简单的正则匹配
- **原始数据解析**：尝试解析原始数据字符串，支持单引号格式，提高兼容性
- **多轴支持**：支持替换 series.data、xAxis.data、yAxis.data 中的数据
- **数据完整性**：移除数据长度限制，保持原始数据长度，避免数据截断或填充

### 3.4 `第 X 序列 / 第 X 映射` 动态属性编辑流程

1. **序列数量计算**：DataEditor 调用 `extractSeriesFromCode(code)`，并以其 `matches.length` 作为序列个数（优先使用实例数据，回退到代码解析）。
   - **修复机制**：当 `matches` 为空但 `seriesData` 有数据时，系统会创建空的 `matches` 数组确保 `seriesCount` 正确
   - **多重保护**：在无 code、缓存命中、解析结果为空等情况下都会确保 `seriesCount` 反映真实序列数量
2. **渲染输入控件**：
   * 当 `dataSource === 'json'` 时，为每条序列渲染一个 `<CodeEditor>`，标题显示为「第一序列 / 第二序列 …」。
   * 当 `dataSource === 'mock'` 或 `real` 时，为每条序列渲染一个 `<PropertySelect>` 或输入框，标题显示为「第一映射 / 第二映射 …」。
     * `PropertySelect` 的下拉选项来源于全局 `dataMappingKeysStore`，该 store 在运行时由 `ECharts.svelte` 根据实际请求到的数据字段动态填充，确保可视化选择。store 实现采用简单的键值对结构，以节点 ID 为键，字段数组为值，提供 `setKeys`、`clearKeys`、`clearAll` 等方法进行状态管理。
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

**修复效果**：通过以上机制，解决了切换数据源或刷新页面时动态映射字段不显示的问题，确保在各种场景下都能正确显示「第 X 映射」输入框。

### 3.5 性能优化：防抖机制

**防抖机制**：
- **实现位置**：`ECharts.svelte` 组件中
- **作用**：避免频繁的 option 变化导致重复渲染和日志输出
- **实现方式**：使用防抖逻辑对 `console.log('[ECharts] option(after seriesData override):', codeResult)` 进行节流处理
- **防抖延迟**：通过值比较实现，确保用户操作完成后再输出日志

**数据处理优化**（新实现）：
- **实例数据缓存**：`extractDataMatches` 函数优先使用 ECharts 实例数据，避免重复解析代码
- **智能数据映射**：`executeJavaScriptCode` 函数通过深度比较定位数据，提高替换效率
- **数据完整性保护**：保持原始数据长度，避免不必要的数据处理开销
- **调试信息优化**：提供详细的匹配调试信息，帮助快速定位问题

**问题原因**：
- 当切换组件或数据源时，多个属性（`dataSource`、`seriesData`、`code`、映射配置等）会依次更新
- Svelte 的 `$derived(option)` 会在每个依赖项变化时重新计算
- 由于属性更新不是原子性的，中间状态会触发多次计算

**解决方案**：
```typescript
// 通过比较前后值，只在真正有变化时才打印日志
const codeResultStr = JSON.stringify(codeResult)
const lastOptionStr = JSON.stringify(lastOptionValue)
if (codeResultStr !== lastOptionStr) {
    console.log('[ECharts] option(after seriesData override):', codeResult)
    lastOptionValue = codeResult
}
```

**效果**：避免了短时间内重复打印相同的 option 数据，让调试日志更加清晰，同时不影响功能。

### 3.6 调试和错误处理

**详细日志**：
- **日志位置**：`DataEditor.svelte` 中提供了详细的调试日志
- **日志内容**：
  - `seriesCount` 计算日志
  - `dataSource` 切换日志
  - `seriesData` 更新日志
  - 数据映射过程日志
- **日志格式**：使用 `[DataEditor]` 前缀标识数据来源

**错误处理**：
- **空值保护**：对 `null` 或 `undefined` 值进行处理，避免程序崩溃
- **类型检查**：对数组类型进行严格检查，确保数据格式正确
- **异常捕获**：使用 `try-catch` 块捕获可能的异常
- **回退机制**：当数据提取失败时提供默认值或空数组

**缓存机制**：
- **缓存位置**：`series-extractor.service.ts` 中实现了缓存机制
- **缓存作用**：避免重复解析相同的代码
- **缓存键**：使用代码内容作为缓存键
- **缓存策略**：在代码不变的情况下直接返回缓存结果

**数据映射调试**（新实现）：
- **匹配调试**：`executeJavaScriptCode` 函数提供详细的匹配调试信息
- **数据追踪**：显示哪些数据被成功替换，哪些数据未找到匹配
- **错误提示**：当数据替换失败时，提供具体的错误信息和位置
- **兼容性处理**：支持单引号格式的数据解析，提高代码兼容性

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

### 4.2 数据流概览

```
blocks.config.json (元数据)
    ↓
FeatureEditor (特性面板) ←→ DataEditor (数据面板)
    ↓                           ↓
ECharts.svelte (渲染组件) ←→ series-extractor.service.ts
    ↓                           ↑
echarts-core.ts (核心初始化)   │
    ↓                           │
ECharts 实例 ←→ getOption() ────┘
```

**数据映射流程**（新实现）：
1. **实例数据优先**：`series-extractor.service.ts` 优先从 ECharts 实例获取真实数据
2. **智能数据替换**：`ECharts.svelte` 中的 `executeJavaScriptCode` 函数通过深度比较定位数据位置
3. **多轴支持**：支持替换 series.data、xAxis.data、yAxis.data 中的数据
4. **数据完整性**：保持原始数据长度，避免数据截断或填充
5. **实时同步**：图例数据与序列名称自动同步，确保显示一致性

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

## 9. legend.data 自动补全机制（json 模式）

**背景**：用户常在 `code` 里只写 `legend: {}`，导致 ECharts 用 `series.name` 自动生成的图例与 `legend.data` 不一致，出现"xxx series not exists"警告。

**解决**：在 `ECharts.svelte` 的 `$derived(option)` 阶段追加补全逻辑：

- **触发条件**：仅当 `dataSource === 'json'` 且 `codeResult.series.length > 0` **且用户提供了 `legend` 对象**（即使是空对象 `{}`）但 `legend.data` 缺失或为空数组时生效；
- **补全内容**：`legend.data = series.map(s => s.name || '')`，保证图例与系列一一对应；
- **优先级**：若用户已写 `legend.data`（非空数组），则完全尊重，不做覆盖；
- **关键区别**：
  - 当 `legend` 属性为 `{}`（缺省）：视为用户希望显示图例但没有提供具体数据，会触发自动补全机制；
  - 当 `legend` 属性**完全不存在**（缺失）：视为用户不希望显示图例，组件不会进行任何处理，图表将不显示图例；
- **日志**：控制台打印 `[ECharts] 自动填充 legend.data: [...]` 便于调试确认。

**代码位置**：`ECharts.svelte` → `// ---------- 自动补全 legend.data（仅 json 模式且用户提供了 legend 对象但 data 缺失时） ----------` 注释块。

**效果**：切换页签或刷新后，图例与系列保持同步，浏览器控制台不再出现图例警告，图表结构正常显示。同时确保当用户不希望显示图例时（即不提供 `legend` 属性），图表不会显示任何图例。

---

## 10. 条件显示机制

配置支持 `showIf` 条件显示，可根据其他字段的值动态控制字段的显示/隐藏：

```json
{
  "showIf": {
    "key": "dataSource",      // 依赖的字段名（实际存储的是dataSource值）
    "value": "mock"          // 依赖字段的值
  }
}
```

---

## 11. 扩展指南

1. **添加面板字段**：在 `blocks.config.json` 的 `featureProps` 或 `dataSource` 添加条目即可；面板 UI 自动更新。
   - 支持字段类型：`switch / select / number / size / image / code / text / linkGroup`
   - 支持条件显示：`showIf` 机制
2. **支持新图表类型**：
   * 在 `echarts-core.ts` 引入并 `echarts.use()`；
   * 在示例 JS `code` 中按 ECharts 规则书写即可。
3. **自定义数据解析**：若标准 `seriesData` 替换无法满足，可修改 `extractSeriesFromCode` 实现更复杂解析逻辑。
4. **添加辅助链接**：通过 `linkGroup` 类型可添加外部链接，如图表案例和模拟平台链接。

### 11.1 数据映射扩展（新实现）

1. **扩展数据位置**：在 `executeJavaScriptCode` 函数中添加新的数据位置支持
2. **自定义匹配逻辑**：修改深度比较算法，支持更复杂的数据结构
3. **实例数据扩展**：在 `extractDataMatches` 函数中添加新的 ECharts 组件数据提取
4. **调试信息扩展**：添加自定义的调试输出，帮助追踪数据映射过程

---

> 如有疑问或改进建议，欢迎提 Issue 😉