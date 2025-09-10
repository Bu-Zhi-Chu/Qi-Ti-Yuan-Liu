# 网格单元数量与子节点数量自动同步机制

## 概述
在`LayoutEditor.svelte`组件中，当用户将显示类型切换为`grid`后，系统会自动确保网格单元数量与子节点数量保持一致。这一机制通过`syncGridChildren`函数实现，能够智能地添加或删除子节点，无需用户手动干预。

## 同步流程

### 1. 计算目标数量
系统首先根据用户设置的行列数计算所需子节点总数：

```typescript
const desired = rows * cols  // 根据行列数计算所需子节点总数
const current = node.children?.length ?? 0  // 获取当前子节点数量
```

### 2. 添加不足的子节点
当网格单元数量 > 当前子节点数量时，系统自动创建新节点：

#### 2.1 节点创建规范
- **节点类型**：`SimpleBox`（基础矩形组件）
- **样式设置**：半透明背景色 `rgba(255,255,255,0.05)`
- **属性设置**：自动命名 `单元格 N`
- **节点ID**：使用 `crypto.randomUUID()` 生成唯一标识符
- **添加方式**：通过 `addNodeToParent` 服务将新节点添加到父容器中

#### 2.2 代码实现
```typescript
// 添加不足部分
for (let i = 0; i < desired - current; i++) {
    const childId = globalThis.crypto?.randomUUID?.() ?? `node-${Date.now()}-${Math.random()}`
    addNodeToParent(selectedId, {
        id: childId,
        componentType: 'SimpleBox',
        styles: { backgroundColor: 'rgba(255,255,255,0.05)' },
        attributes: { 'data-name': `单元格 ${current + i + 1}` },
        children: []
    } as any)
}
```

### 3. 删除多余的子节点
当当前子节点数量 > 网格单元数量时：

#### 3.1 删除策略
- **节点选择**：使用 `slice(desired)` 获取需要删除的节点列表
- **删除方式**：通过 `removeNodeById` 服务逐个删除多余节点
- **异步支持**：支持异步操作，确保DOM更新的一致性

#### 3.2 代码实现
```typescript
// 删除多余部分
if (current > desired && node.children) {
    const extras = node.children.slice(desired)
    for (const c of extras) {
        await removeNodeById(c.id)
    }
}
```

## 触发场景

### 1. 用户手动调整
当用户通过界面输入框修改网格列数或行数时：
- 调用 `handleGridColsChange(n: number)` 或 `handleGridRowsChange(n: number)`
- 自动触发 `syncGridChildren(gridRowsCount, gridColsCount)`

### 2. 初始化切换
从其他布局类型切换到grid布局时：
- 系统计算最优行列数：
  ```typescript
  const rows = Math.ceil(Math.sqrt(count))
  const cols = Math.ceil(count / rows)
  ```
- 自动设置网格模板：
  ```typescript
  gridTemplateRows: `repeat(${rows}, 1fr)`
  gridTemplateColumns: `repeat(${cols}, 1fr)`
  ```

### 3. 样式清理
在切换为grid布局时，系统还会：
- 清理子节点宽高：重置为 `''`（默认值）
- 重置定位方式：从 `absolute` 改为 `static`，确保网格布局正常工作

## 用户体验优化

### 1. 无感知操作
用户只需调整行列数值，系统自动处理节点增删，无需手动干预。

### 2. 样式一致性
新增节点采用统一的视觉样式（半透明背景），保持界面一致性。

### 3. 命名规范
自动生成有意义的节点名称（"单元格 1"、"单元格 2"等），便于识别和管理。

### 4. 智能计算
系统根据现有子节点数量智能计算最优行列数，减少用户手动调整次数。

## 技术亮点

### 1. 响应式设计
使用Svelte的响应式系统，确保状态变化能够即时反映在UI上。

### 2. 类型安全
使用TypeScript确保代码的类型安全，减少运行时错误。

### 3. 异步处理
支持异步操作，确保DOM更新的一致性，避免界面闪烁或状态不同步。

### 4. 唯一标识
使用`crypto.randomUUID()`生成全局唯一节点ID，避免ID冲突。

## 总结
这一自动同步机制体现了现代低代码平台"用户做简单选择，系统完成复杂技术细节"的核心理念。通过智能的节点管理，用户可以轻松创建和调整复杂的网格布局，而无需了解底层的技术实现细节。