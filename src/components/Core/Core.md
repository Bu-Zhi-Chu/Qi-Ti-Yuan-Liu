# ResponsiveBox 响应式容器组件文档

## 组件概述

`ResponsiveBox` 是一个智能响应式容器组件，它能够自动将样式中的像素值转换为基于屏幕宽度的相对单位，实现真正的自适应布局。
是UI唯一的核心组件,基于他封装的组件,逐步会取代一切html标签,实现更灵活的布局

## 核心特性

- **自动转换**：自动将 `style` 属性中的 `px` 值转换为 `calc()` 表达式
- **智能缩放**：基于 375px 设计稿宽度进行等比例缩放
- **零配置**：无需额外配置，开箱即用
- **性能优化**：使用 Svelte 5 Runes 系统，最小化重渲染
- **类型安全**：完整的 TypeScript 支持

## 使用方法

### 基础用法

```svelte
<script>
  import ResponsiveBox from '$lib/components/Core/ResponsiveBox.svelte'
</script>

<ResponsiveBox style="width: 100px; height: 50px; background: red;">
  这是一个自适应的盒子
</ResponsiveBox>
```

### 复杂样式示例

```svelte
<ResponsiveBox
  style="width: 200px; height: 100px; padding: 16px; margin: 8px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
  复杂样式的自适应容器
</ResponsiveBox>
```

### 响应式定位

```svelte
<ResponsiveBox
  style="position: absolute; top: 100px; left: 50px; width: 300px; height: 200px;">
  绝对定位的自适应元素
</ResponsiveBox>
```

## 技术实现

### 缩放原理

组件使用以下公式计算缩放比例：

```typescript
scaleRatio = window.innerWidth / 375
```

- **基准宽度**：375px（iPhone 6/7/8 的标准宽度）
- **动态计算**：在窗口大小改变时实时更新
- **最小适配**：支持从 320px 到 768px 的屏幕宽度

### 转换规则

组件会自动转换以下格式的像素值：

| 原始样式 | 转换后样式 |
|---------|-----------|
| `width: 100px` | `width: calc(100px * var(--scale-ratio, 1))` |
| `height: 50.5px` | `height: calc(50.5px * var(--scale-ratio, 1))` |
| `margin: 10px 20px` | `margin: calc(10px * var(--scale-ratio, 1)) calc(20px * var(--scale-ratio, 1))` |

### 支持的样式属性

所有包含像素单位的样式属性都会被自动转换，包括但不限于：

- 尺寸：`width`, `height`, `min-width`, `max-width`, `min-height`, `max-height`
- 间距：`margin`, `padding`, `margin-top`, `padding-left` 等
- 定位：`top`, `left`, `right`, `bottom`
- 边框：`border-width`, `border-radius`
- 变换：`transform: translate(10px, 20px)`
- 阴影：`box-shadow: 0 2px 4px rgba(0,0,0,0.1)`

## API 参考

### Props 接口

```typescript
interface Props {
  style?: string                    // CSS样式字符串，支持任意CSS属性
  children?: import('svelte').Snippet  // 子内容插槽
  [key: string]: any               // 支持传递任意HTML属性
}
```

### 响应式变量

- `scaleRatio`: 当前缩放比例（基于窗口宽度/375）
- `finalStyle`: 转换后的最终样式字符串

## 最佳实践

### 1. 设计稿适配

假设设计稿基于 375px 宽度：

```svelte
<!-- 设计稿中 100px 宽的按钮 -->
<ResponsiveBox style="width: 100px; height: 44px; background: #007AFF; border-radius: 8px;">
  按钮
</ResponsiveBox>
```

### 2. 组合使用

与其他响应式组件组合使用：

```svelte
<ResponsiveBox style="display: flex; gap: 16px;">
  <ResponsiveBox style="width: 100px; height: 100px; background: #FF3B30;"/>
  <ResponsiveBox style="width: 100px; height: 100px; background: #34C759;"/>
</ResponsiveBox>
```

### 3. 媒体查询配合

虽然组件主要处理像素适配，但仍可配合媒体查询：

```svelte
<ResponsiveBox
  style="width: 300px;
         @media (max-width: 375px) { width: 280px; }">
  响应式卡片
</ResponsiveBox>
```

## 注意事项

### 1. 单位限制

- 只转换 `px` 单位，其他单位（`em`, `rem`, `%`, `vw`, `vh`）保持不变
- 小数像素值会被正确处理（如 `10.5px`）

### 2. 性能考虑

- 组件在 `onMount` 中添加 resize 监听器，组件卸载时自动清理
- 使用 `$derived` 优化样式计算，避免不必要的重计算

### 3. 边界情况

- 空样式字符串：`style=""` 会被正常处理
- 无像素值：不包含 `px` 的样式字符串会原样返回
- 负值：`-10px` 会被正确转换为 `calc(-10px * var(--scale-ratio, 1))`

## 示例代码

### 完整示例组件

```svelte
<!-- ExampleCard.svelte -->
<script>
  import ResponsiveBox from './ResponsiveBox.svelte'
</script>

<ResponsiveBox
  style="
    width: 350px;
    height: 200px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.1);
    color: white;
    font-size: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
  ">
  这是一个完整的响应式卡片示例
</ResponsiveBox>
```

---

## 2. DynamicComponent.svelte - 核心组件切换逻辑

### 组件定位
低代码平台的动态组件容器，支持通过属性面板切换任意组件类型。

### 核心特性
- **动态加载**：基于 `type` 属性异步加载对应组件
- **统一接口**：标准化的 props 和事件透传机制
- **可扩展**：通过 `componentMap` 轻松添加新组件类型
- **低代码友好**：专为可视化编辑器设计

### 组件映射表
```typescript
const componentMap = {
  RealTimeClock: () => import('../widgets/RealTimeClock.svelte'),
  ResponsiveBox: () => import('./ResponsiveBox.svelte')
  // 可扩展更多组件类型
}
```

### 使用示例
```svelte
<!-- 动态加载时钟组件 -->
<DynamicComponent
  type="RealTimeClock"
  props={{format: "datetime"}}
  style="width: 200px; height: 100px;"
/>

<!-- 动态加载响应式容器 -->
<DynamicComponent
  type="ResponsiveBox"
  props={{style: "width: 300px; height: 200px;"}}
>
  子内容
</DynamicComponent>
```

---

## 架构协作模式

### 层级关系
```
低代码平台
├── DynamicComponent (组件调度层)
│   └── ResponsiveBox (基础容器层)
│       └── 业务组件内容
└── 其他动态组件
```

### 使用场景对比

| 场景 | 使用组件 | 说明 |
|------|----------|------|
| 基础布局 | ResponsiveBox | 直接用作容器，提供响应式能力 |
| 动态切换 | DynamicComponent | 在低代码平台中通过属性面板切换组件类型 |
| 嵌套组合 | DynamicComponent + ResponsiveBox | 动态加载的组件内部继续使用ResponsiveBox |

---

## API 参考

### DynamicComponent Props
```typescript
interface Props {
  type: 'RealTimeClock' | 'ResponsiveBox' // 组件类型
  props?: Record<string, any>     // 传递给目标组件的props
  children?: any                  // 子内容插槽
  style?: string                  // 容器样式
  class?: string                 // 容器类名
  [key: string]: any             // 支持任意HTML属性透传
}
```

---

## 扩展指南

### 添加新的动态组件类型

1. 在 `DynamicComponent.svelte` 的 `componentMap` 中添加映射：
```typescript
const componentMap = {
  ...
  NewComponent: () => import('../widgets/NewComponent.svelte')
}
```

2. 确保新组件支持标准 props 接口

3. 在类型定义中添加新的组件类型

---

## 更新日志

### v2.0.0
- 重构为双组件架构
- 新增 DynamicComponent 动态切换能力
- 优化 ResponsiveBox 作为底层容器
- 完善 TypeScript 类型定义

### v1.0.0
- ResponsiveBox 初始版本
- 支持基础响应式缩放
- 实现窗口大小监听