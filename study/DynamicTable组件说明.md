# DynamicTable 动态表格组件说明

## 组件概述

DynamicTable 是一个功能强大的动态表格组件，支持多种数据源配置、灵活的列映射、自定义样式和响应式设计。该组件能够处理静态 JSON 数据、模拟接口数据和真实 API 数据，适用于各种数据展示场景。

## 核心特性

### 1. 强大的数据源支持
- **JSON 模式**：在属性面板中直接编写 JavaScript 代码（返回一个对象数组）作为数据源。
- **Mock 模式**：配置一个模拟接口的 URL (`mockPath`)，组件将自动发起请求获取数据。
- **Real 模式**：配置一个真实 API 的 URL (`requestPath`)，组件将自动发起请求获取数据。

### 2. 智能数据与列映射
- **自动字段提取**：无论是 JSON、Mock 还是 Real 模式，组件都会自动解析返回数据的第一个对象，提取所有字段作为可映射项。
- **可视化映射**：在属性面板中，表格的每一列都会对应一个下拉框，可将从数据源中提取的字段映射到指定列。
- **动态更新**：当数据源的 URL (`mockPath` 或 `requestPath`) 变更时，旧的列映射会自动清除，需要重新进行映射。
- **部分映射支持**：允许某些列不选择任何映射字段，该列将显示为空。

### 3. 灵活样式配置
- 表头和数据行独立背景色、文字颜色自定义。
- 通过 `columnFlexRatios` 属性精确控制各列的宽度比例。
- 支持通过 `rowBackgroundImageUrl` 为每一行设置统一的背景图片。

## 组件属性

### 基础属性

| 属性名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `id` | `string` | - | 组件唯一标识 |
| `headers` | `string[]` | `[]` | 表头数组（当 `columnLabels` 未提供时生效） |
| `columnLabels` | `string[]` | `[]` | 列标签数组（优先级高于 `headers`） |
| `bodyData` | `any[][]` | `[]` | 表格数据（二维数组），主要用于 JSON 模式的初始化和回写。 |
| `columnFlexRatios` | `number[]` | `[]` | 列宽比例配置数组，如 `[2, 1, 1]` |

### 数据源属性

| 属性名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `dataSource` | `'json' \| 'mock' \| 'real'` | `'json'` | 数据源类型 |
| `requestPath` | `string` | `''` | “真实”模式下的数据请求 URL |
| `mockPath` | `string` | `''` | “模拟”模式下的数据请求 URL |
| `requestSeriesMapping` | `(string \| null)[]` | `[]` | “真实”模式下的列映射关系数组 |
| `mockSeriesMapping` | `(string \| null)[]` | `[]` | “模拟”模式下的列映射关系数组 |

### 样式属性

| 属性名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `headerBackgroundColor` | `string` | `"rgba(0, 212, 255, 0.2)"` | 表头背景色 |
| `bodyBackgroundColor` | `string` | `"rgba(255, 255, 255, 0.1)"` | 数据行背景色 |
| `headerTextColor` | `string` | `"#a1a5a9"` | 表头文字颜色 |
| `bodyTextColor` | `string` | `"white"` | 数据行文字颜色 |
| `tableWidth` | `string` | `"100%"` | 表格宽度 |
| `marginTop` | `string` | `"0"` | 顶部边距 |
| `rowBackgroundImageUrl` | `string` | `""` | 行背景图片 URL |
| `className` | `string` | `""` | 自定义 CSS 类名 |
| `style` | `string` | `""` | 内联样式 |

## 数据处理与映射机制

### JSON 模式数据流

1. **代码编写**：用户在“临时数据”编辑器中输入一段返回对象数组的 JavaScript 代码。
2. **数据提取**：`DataEditor` 解析代码，提取 `result` 数组，并分析第一个对象，获取所有 `key` 作为“可映射字段” (`jsonMappingKeys`)。
3. **列映射**：用户在属性面板为每一列选择一个 `key` 进行映射，映射关系保存在 `jsonColumnMapping` 中。
4. **数据生成**：`DataEditor` 根据 `jsonColumnMapping` 和原始的 `jsonData`，生成最终的二维数组 `bodyData` 并传递给 `DynamicTable`。

### Mock/Real 模式数据流

1. **配置 URL**：用户在属性面板中将 `dataSource` 切换为 `mock` 或 `real`，并填入 `mockPath` 或 `requestPath`。
2. **数据请求**：`DynamicTable` 组件监听到 `dataSource` 或路径变化，自动调用 `fetchTableData` 函数，通过 `cachedFetch` 服务请求数据。
3. **字段提取**：请求成功后，`DynamicTable` 解析返回的 JSON 数据，提取第一个对象的 `key`，并通过 `dataMappingKeysStore` 将这些 `key` 共享出去。
4. **UI 更新**：`DataEditor` 监听到 `dataMappingKeysStore` 的变化，为表格的每一列动态生成一个下拉选择框，选项即为提取到的 `key`。
5. **用户映射**：用户为每一列选择映射字段，映射关系保存在 `mockSeriesMapping` 或 `requestSeriesMapping` 中。
6. **数据渲染**：`DynamicTable` 内部的 `processedTableData`派生状态会根据当前选定的映射关系，实时处理从接口获取的原始数据，生成最终在表格中显示的二维数组。

## 使用示例

### JSON 数据源

1.  在属性面板中，将数据源设置为 `json`。
2.  在“临时数据”编辑器中输入以下代码：
    ```javascript
    const data = [
      { name: '张三', age: 25, city: '北京' },
      { name: '李四', age: 30, city: '上海' },
      { name: '王五', age: 28, city: '广州' }
    ];
    return data;
    ```
3.  在下方出现的“列映射”部分，进行如下配置：
    -   第一映射 → `name`
    -   第二映射 → `age`
    -   第三映射 → `city`

### Mock/Real 数据源

1.  在属性面板中，将数据源设置为 `mock` 或 `real`。
2.  在 `mockPath` 或 `requestPath` 输入框中，填入一个返回对象数组的 API 地址，例如 `https://api.example.com/users`。
3.  组件会自动请求数据。请求成功后，下方会为表格的每一列生成一个映射下拉框。
4.  假设接口返回的数据结构为 `{ "id": 1, "username": "john.doe", "email": "john.doe@example.com" }`，则下拉框中会包含 `id`, `username`, `email` 等选项。
5.  根据需要，将接口字段映射到表格的相应列。

## 最近更新

### `mock` 和 `real` 数据源集成
- **动态数据查询**: `DynamicTable` 组件现在可以直接从 `mockPath` 或 `requestPath` 配置的 URL 中获取数据。
- **自动字段提取与映射**: 与 JSON 模式类似，组件会自动从接口返回的数据中提取字段，并在属性面板提供可视化界面，用于将数据字段映射到表格列。
- **统一数据处理流程**: 组件内部实现了 `processedTableData` 派生状态，用于统一处理来自 `json`、`mock`、`real` 等不同数据源的数据和映射逻辑。
- **编辑器智能联动**: `DataEditor` 现在完全支持 `DynamicTable` 的新数据模式。当 `mockPath` 或 `requestPath` 发生改变时，之前配置的列映射会自动清空，以确保数据一致性。

### JSON 数据映射优化
- **智能数据提取**：新增 `extractResultArray` 服务，支持从复杂 JavaScript 代码中提取对象数组。
- **实时数据同步**：列映射变更时立即重新生成表格数据。

## 调试与错误处理

### 调试信息

组件在关键步骤提供了详细的控制台日志，方便调试：

```
// DynamicTable 组件日志
[DynamicTable] 接收到的数据: { ... }
[DynamicTable] 数据请求中...
[DynamicTable] 数据请求成功: { ... }
[DynamicTable] 数据请求失败: ...
[DynamicTable] 提取数据字段: [ ... ]

// DataEditor 编辑器日志
[DataEditor] extractResultArray 结果: [ ... ]
[DataEditor] 提取到的字段: [ ... ]
[DataEditor] mockPath changed, clearing mockSeriesMapping
[DataEditor] requestPath changed, clearing requestSeriesMapping
```

### 常见问题

1.  **数据不显示**：
    -   **JSON 模式**：检查代码是否正确返回了对象数组。
    -   **Mock/Real 模式**：检查网络请求是否成功，以及返回的数据是否为对象数组格式。
2.  **映射下拉框不出现**：
    -   检查数据源是否已正确配置并成功返回数据。只有成功获取到数据并提取出字段后，映射选项才会出现。
3.  **样式异常**：检查颜色值格式和 CSS 变量设置。