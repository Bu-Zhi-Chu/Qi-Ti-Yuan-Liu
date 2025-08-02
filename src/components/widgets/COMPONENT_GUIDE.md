# 七巧板创意工坊 - 组件封装规范

## 🎯 核心原则

**所有UI组件必须使用`ResponsiveBox`作为根容器**，禁止直接使用原生HTML元素。

## 📋 组件创建规范

### 1. 基础模板

```svelte
<!--
 * 组件功能描述
 * 使用ResponsiveBox实现自适应布局
 * @param {string} [style=""] - 内联样式字符串
 * @param {string} [data-id=""] - 外部指定的数据标识符，用于低代码平台定位
-->

<script lang="ts">
    import ResponsiveBox from '../Core/ResponsiveBox.svelte'

    interface Props {
        style?: string
        'data-id'?: string
        // 其他自定义props
    }

    let { style = '', 'data-id': dataId = '', ...otherProps }: Props = $props()

    // 组件逻辑...
</script>

<ResponsiveBox {style} data-id={dataId}>
    <!-- 组件内容 -->
</ResponsiveBox>

<style>
    /* 组件样式 */
</style>
```

### 2. 命名规范

- **文件命名**: 使用PascalCase，如`UserCard.svelte`
- **组件命名**: 与文件名保持一致
- **props命名**:
  - `style` - 内联样式字符串（必需）
  - 其他使用camelCase
  - **注意**: 不再使用className，完全通过style控制样式

### 3. 样式处理规范

#### ✅ 正确做法
```svelte
<ResponsiveBox
    style="color: red; font-size: 16px; {style}"
>
    内容
</ResponsiveBox>
```

#### ❌ 错误做法
```svelte
<!-- 禁止使用原生HTML元素 -->
<div style={style}>
    内容
</div>

<!-- 禁止直接使用className -->
<ResponsiveBox class={className} style={style}>
    内容
</ResponsiveBox>
```

### 4. 响应式特性

所有组件自动获得以下能力：
- **自适应缩放**: 基于容器宽度自动缩放
- **px单位转换**: `100px` → `calc(100px * var(--scale-ratio, 1))`
- **ResizeObserver**: 精确监听容器尺寸变化
- **降级兼容**: 支持旧版浏览器的resize事件

### 5. 组件层级规范

```
src/components/
├── Core/                # 基础组件（仅ResponsiveBox、SimpleBox）
├── widgets/            # 功能组件（时钟、按钮等）
├── forms/              # 表单组件
├── navigation/         # 导航组件
├── pages/              # 页面级组件
└── demo/               # 演示组件
```

### 6. 类型安全要求

```typescript
// 必须定义Props接口
interface Props {
    style?: string  // 必需属性，用于样式控制
    // 其他props必须有类型定义
}

// 使用$props解构
let { style = '', ...rest }: Props = $props()
```

### 7. 最佳实践示例

#### 按钮组件
```svelte
<script lang="ts">
    import ResponsiveBox from '../Core/ResponsiveBox.svelte'

    interface Props {
        style?: string
        label: string
        variant?: 'primary' | 'secondary'
        onclick?: () => void
    }

    let { style = '', label, variant = 'primary', onclick }: Props = $props()
</script>

<ResponsiveBox
    style="padding: 10px 20px; cursor: pointer; background: {variant === 'primary' ? '#007bff' : '#6c757d'}; color: white; border: none; border-radius: 4px; {style}"
    {onclick}
>
    {label}
</ResponsiveBox>

<style>
    /* 样式通过style属性控制，无需额外CSS */
</style>
```

#### 卡片组件
```svelte
<script lang="ts">
    import ResponsiveBox from '../Core/ResponsiveBox.svelte'

    interface Props {
        style?: string
        title?: string
        content?: string
    }

    let { style = '', title = '', content = '' }: Props = $props()
</script>

<ResponsiveBox
    style="border: 1px solid #ddd; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); {style}"
>
    {#if title}
        <h3 style="margin: 0 0 10px 0;">{title}</h3>
    {/if}
    <p style="margin: 0;">{content}</p>
</ResponsiveBox>

<style>
    /* 样式通过style属性控制，无需额外CSS */
</style>
```

### 6. 嵌套规范与data-id处理

#### ✅ 推荐做法
- **单层结构**: 组件直接使用一个ResponsiveBox作为根容器
- **data-id传递**: 通过props接收外部data-id并传递给根ResponsiveBox
- **SimpleBox降级**: 如需内部嵌套，使用SimpleBox作为轻量级容器

```svelte
<!-- ✅ 单层结构示例 -->
<ResponsiveBox
    style="width: 200px; height: 100px; {style}"
    data-id={dataId}
>
    <!-- 组件内容 -->
</ResponsiveBox>

<!-- ✅ 必要时使用SimpleBox -->
<ResponsiveBox style={style} data-id={dataId}>
    <SimpleBox style="display: flex; align-items: center;">
        <!-- 子内容 -->
    </SimpleBox>
</ResponsiveBox>
```

#### ❌ 避免做法
- **多层嵌套**: 避免多个ResponsiveBox嵌套
- **重复data-id**: 不要在内部元素重复设置data-id
- **原生元素**: 禁止使用原生div作为根容器

### 7. data-id规范

- **来源**: 由外部组件通过props传入
- **作用**: 用于低代码平台精确定位组件
- **传递**: 必须传递给根ResponsiveBox
- **唯一性**: 在同一页面中保持唯一
- **格式**: 字符串类型，可为空

## 🔍 检查清单

创建新组件时必须确认：
- [ ] 使用ResponsiveBox作为根容器
- [ ] 通过props接收data-id并传递给根ResponsiveBox
- [ ] 仅传递style属性（不再使用className）
- [ ] Props接口包含style和data-id
- [ ] 所有样式通过style属性内联控制
- [ ] 避免多层ResponsiveBox嵌套
- [ ] 文件位置符合层级规范
- [ ] 添加详细注释说明
- [ ] 通过`npm run check`类型检查

## 📚 参考示例

- `RealTimeClock.svelte` - 时钟组件最佳实践
- `ResponsiveBoxDemo.svelte` - 演示组件用法

## ⚠️ 禁止事项

1. **禁止使用原生HTML元素**作为组件根容器
2. **禁止直接操作DOM** - 使用Svelte响应式系统
3. **禁止硬编码尺寸** - 使用相对单位或自适应缩放
4. **禁止忽略类型定义** - 所有props必须有TypeScript类型
5. **禁止使用className属性**（已废弃）
6. **禁止在style属性中使用calc()**（ResponsiveBox会自动处理）
7. **禁止在组件内部使用!important**
8. **禁止在组件内部使用CSS作用域样式**