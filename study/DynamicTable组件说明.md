# DynamicTable 动态表格组件说明

## 组件概述

DynamicTable 是一个功能强大的动态表格组件，支持多种数据源配置、灵活的列映射、自定义样式和响应式设计。该组件能够处理静态 JSON 数据、模拟接口数据和真实 API 数据，适用于各种数据展示场景。

## 核心特性

### 1. 多数据源支持
- **JSON 模式**：直接编写 JavaScript 代码生成对象数组
- **Mock 模式**：连接模拟接口获取数据
- **Real 模式**：连接真实 API 获取数据

### 2. 智能列映射
- 支持动态表头配置
- JSON 数据字段映射到表格列
- 自动推断列数和表头
- 支持部分映射（允许空映射）

### 3. 灵活样式配置
- 表头和数据行独立背景色设置
- 文字颜色自定义
- 列宽比例配置（columnFlexRatios）
- 背景图片支持（rowBackgroundImageUrl）

### 4. 响应式设计
- 自动适应不同屏幕尺寸
- 移动端优化显示
- 自定义滚动条样式

## 组件属性

### 基础属性

| 属性名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `tableIdPrefix` | `string` | `""` | 表格 ID 前缀 |
| `headers` | `string[]` | `[]` | 表头数组 |
| `columnLabels` | `string[]` | `[]` | 列标签数组（优先级高于 headers） |
| `bodyData` | `any[][]` | `[]` | 表格数据（二维数组） |
| `columnFlexRatios` | `number[]` | `[]` | 列宽比例配置 |

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

### 事件属性

| 属性名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `onclick` | `function` | `undefined` | 点击事件处理函数 |

## 数据源配置

### JSON 数据源配置

在 `blocks.config.json` 中的配置：

```json
{
  "type": "DynamicTable",
  "nameZh": "动态表格",
  "dataBindable": true,
  "featureProps": {
    "columnLabels": {
      "label": "表头列名",
      "type": "columnLabels",
      "default": ["列1", "列2", "列3"]
    }
  }
}
```

### 数据映射机制

#### JSON 模式数据流

1. **代码解析**：用户在临时数据编辑器中输入 JavaScript 代码
2. **数据提取**：通过 `extractResultArray` 服务提取对象数组
3. **字段映射**：将 JSON 对象的 key 映射到表格列
4. **数据生成**：根据映射关系生成 `bodyData`

#### 核心代码逻辑

```javascript
// 数据提取和映射流程
function updateDynamicTableData(code: string) {
  // 1. 提取对象数组
  const resultArray = extractResultArray(code)
  
  // 2. 提取字段 key
  const keys = Object.keys(resultArray[0])
  jsonMappingKeys = keys
  
  // 3. 保存原始数据
  handleAttrChange('jsonData', resultArray)
}

// 根据映射生成表格数据
function regenerateBodyData() {
  const mapping = jsonColumnMapping()
  const data = currentValues.jsonData
  const headers = tableHeaders()

  // 根据映射关系生成二维数组
  const newBody = data.map((row) => 
    mapping.map((key) => 
      key && jsonMappingKeys.includes(key) ? (row[key] ?? '') : ''
    )
  )
  handleAttrChange('bodyData', newBody)
}
```

## 使用示例

### 基础使用

```svelte
<DynamicTable
  headers={['姓名', '年龄', '城市']}
  bodyData={[
    ['张三', '25', '北京'],
    ['李四', '30', '上海'],
    ['王五', '28', '广州']
  ]}
/>
```

### JSON 数据源

```javascript
// 在临时数据编辑器中输入
const data = [
  { name: '张三', age: 25, city: '北京' },
  { name: '李四', age: 30, city: '上海' },
  { name: '王五', age: 28, city: '广州' }
];
return data;
```

然后配置列映射：
- 第一列映射 → name
- 第二列映射 → age  
- 第三列映射 → city

### 样式自定义

```svelte
<DynamicTable
  columnLabels={['产品', '价格', '库存']}
  bodyData={productData}
  headerBackgroundColor="rgba(59, 130, 246, 0.3)"
  bodyBackgroundColor="rgba(255, 255, 255, 0.05)"
  headerTextColor="#3b82f6"
  bodyTextColor="#e2e8f0"
  columnFlexRatios={[2, 1, 1]}
/>
```

## 组件实现细节

### 数据优先级

1. `columnLabels`（最高优先级）
2. `headers`（次要优先级）
3. 根据 `bodyData` 自动推断
4. `blocks.config.json` 中的默认值

### 响应式处理

```javascript
// 显示表头计算
let displayHeaders = $derived(() => {
  if (columnLabels && columnLabels.length > 0) {
    return columnLabels;
  }
  if (headers && headers.length > 0) {
    return headers;
  }
  // 根据 bodyData 推断
  if (bodyData && bodyData.length > 0) {
    return Array.from({ length: bodyData[0].length }, (_, i) => `列${i + 1}`);
  }
  // 默认列名
  return ['列1', '列2', '列3'];
});
```

### 样式计算

```javascript
// 单元格样式生成
function getHeaderCellStyle(index: number) {
  if (useFlexRatios && columnFlexRatios[index] !== undefined) {
    return `flex: ${columnFlexRatios[index]};`;
  }
  return `flex: 1;`;
}

// 背景样式
function getRowBackgroundStyle(rowIndex: number) {
  if (rowBackgroundImageUrl) {
    return `background-image: url(${rowBackgroundImageUrl}); background-size: cover; background-position: center;`;
  }
  return rowIndex % 2 === 0 ? 'var(--bg-even)' : 'var(--bg-odd)';
}
```

## 最近更新 (2025年)

### JSON 数据映射优化
- **智能数据提取**：新增 `extractResultArray` 服务，支持从复杂 JavaScript 代码中提取对象数组
- **字段映射机制**：支持将 JSON 对象的 key 动态映射到表格列
- **部分映射支持**：允许某些列映射为空，提高灵活性
- **实时数据同步**：列映射变更时立即重新生成表格数据

### 数据编辑器增强
- **临时数据编辑器**：新增 JavaScript 代码编辑器，支持语法高亮
- **自动字段提取**：自动识别 JSON 数据中的可用字段
- **中文序数词支持**：映射选择器使用中文序数词（第一、第二等）
- **错误处理优化**：完善的错误提示和异常处理机制

### 性能优化
- **缓存机制**：避免重复解析相同的代码字符串
- **防抖处理**：减少不必要的数据更新操作
- **响应式优化**：使用 `$derived` 和 `$effect` 优化响应式性能

## 扩展指南

### 添加新的数据处理器

在 `data-extractor.service.ts` 中添加自定义数据提取逻辑：

```typescript
export function extractCustomData(code: string): any[] {
  // 自定义数据提取逻辑
  // return 提取的数据数组
}
```

### 扩展样式配置

在组件的样式部分添加新的 CSS 变量：

```css
.dynamic-table-cell {
  --custom-color: v-bind(customColor);
  --custom-border: v-bind(customBorder);
}
```

### 添加新的事件处理

扩展组件的 props 接口：

```typescript
export interface Props {
  // ... 现有属性
  onRowClick?: (rowData: any[], rowIndex: number) => void;
  onCellClick?: (cellData: any, rowIndex: number, colIndex: number) => void;
}
```

## 调试与错误处理

### 调试信息

组件提供详细的调试日志：

```
[DynamicTable] 接收到的数据: { headers, columnLabels, bodyData }
[DynamicTable] 显示的数据: { displayHeaders, displayBodyData }
[DataEditor] extractResultArray 结果: [提取的数据]
[DataEditor] 提取到的字段: [可用的 key 列表]
```

### 常见问题

1. **数据不显示**：检查 JSON 代码是否正确返回对象数组
2. **映射不生效**：确认列映射配置是否正确
3. **样式异常**：检查颜色值格式和 CSS 变量设置
4. **响应式问题**：验证 viewport 设置和 CSS 媒体查询

## 最佳实践

1. **数据格式规范**：确保 JSON 数据为统一的对象数组结构
2. **映射配置**：合理配置列映射，避免过多空映射
3. **样式一致性**：保持表头和数据行的视觉协调
4. **性能考虑**：避免频繁的大数据量更新操作
5. **错误处理**：添加适当的错误边界和用户体验优化