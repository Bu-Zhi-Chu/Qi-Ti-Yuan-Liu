# 屏幕适配服务 (Screen Adaptation Service)

## 功能概述

这是一个现代化的屏幕适配服务，专为炁体源流低代码工具优化设计。基于 CSS 变量和 viewport 单位实现响应式布局，彻底解决传统 transform 缩放导致的定位问题，确保在不同设备上提供一致的用户体验。

## 核心功能

### 📱 屏幕检测与识别

-   **物理屏幕检测**: 屏幕尺寸、分辨率、DPI、像素密度
-   **设备类型识别**: 自动识别 mobile/tablet/desktop
-   **视口计算**: 实时获取窗口尺寸和缩放状态
-   **响应式监听**: 监听屏幕变化和方向切换

### 🎯 现代化响应式方案

#### Viewport Scale（推荐）

-   **CSS 变量驱动**: 使用 CSS 变量实现动态响应式计算
-   **无定位问题**: 避免 transform 缩放导致的绝对定位偏移
-   **高性能**: 纯 CSS 实现，无 JavaScript 性能开销
-   **易维护**: 样式集中在 app.css，便于统一管理
-   **兼容性**: 支持现代浏览器，IE11+兼容

#### 已废弃方案

-   **Transform Scale**: 已废弃，存在定位偏移问题
-   **旧版服务**: transform-scale.service.ts 已标记为废弃

## 使用方法

### 基础使用

```typescript
import { screenDetector } from '@services/screen'

// 获取当前屏幕信息
const screenInfo = screenDetector.getScreenInfo()
console.log('屏幕信息:', screenInfo)

// 获取设备类型
const deviceType = screenDetector.getDeviceType() // 'mobile' | 'tablet' | 'desktop'

// 获取推荐缩放比例
const scale = screenDetector.getRecommendedScale()
```

### 响应式使用 (Svelte5)

```typescript
import { screenInfo } from '@services/screen'

// 在Svelte组件中使用响应式store
$: console.log('当前屏幕信息:', $screenInfo)
```

### 监听屏幕变化

```typescript
import { screenDetector } from '@services/screen'

// 添加监听器
const unsubscribe = screenDetector.onChange((info) => {
    console.log('屏幕发生变化:', info)
})

// 移除监听器
unsubscribe()
```

### 响应式缩放功能（CSS 变量方案）

基于 CSS 变量的现代化响应式方案，解决传统缩放导致的定位问题：

```typescript
import { screenDetector } from '@services/screen'

// 初始化响应式缩放（自动设置CSS变量）
screenDetector.initViewportScale()

// 获取当前缩放比例
const scale = screenDetector.getViewportScale()

// 设置自定义设计稿尺寸
screenDetector.setDesignSize(1920, 1000)

// 停止响应式缩放
screenDetector.stopViewportScale()
```

### CSS 变量使用方法

在样式中使用预定义的 CSS 变量实现响应式布局：

```css
/* 使用缩放比例 */
.my-element {
    width: calc(100px * var(--scale-ratio));
    height: calc(50px * var(--scale-ratio));
    font-size: calc(16px * var(--scale-ratio));
}

/* 使用vw/vh比例 */
.responsive-box {
    width: calc(100 * var(--vw-ratio) * 1vw);
    height: calc(100 * var(--vh-ratio) * 1vh);
}

/* 响应式容器 */
.responsive-container {
    width: 100vw;
    height: 100vh;
    max-width: 100vw;
    max-height: 100vh;
}
```

## 文件结构

screen/
├── screen-detector.service.ts # 屏幕适配核心服务（CSS 变量方案）
├── screen.types.ts # 类型定义
├── transform-scale/ # 已废弃的 Transform 方案（保留向后兼容）
│ ├── transform-scale.service.ts # ⚠️ 已废弃：Transform 缩放服务
│ └── README.md # 废弃方案文档
└── README.md # 服务总览

## 迁移指南

### 从旧版 Transform 方案迁移

**旧版代码（已废弃）：**

```typescript
// ❌ 已废弃的使用方式
import { transformScaleService } from '@services/screen/transform-scale/transform-scale.service'
transformScaleService.init()
```

**新版代码（推荐）：**

```typescript
// ✅ 推荐的使用方式
import { screenDetector } from '@services/screen'
screenDetector.initViewportScale()
```

### 样式迁移

**旧版样式（需要 transform）：**

```css
/* ❌ 已废弃：使用transform缩放 */
.container {
    transform: scale(var(--scale-ratio));
    transform-origin: top left;
}
```

**新版样式（使用 CSS 变量）：**

```css
/* ✅ 推荐：使用CSS变量 */
.my-element {
    width: calc(100px * var(--scale-ratio));
    height: calc(50px * var(--scale-ratio));
}
```

## 类型定义

类型定义已分离到独立的类型文件中：

```typescript
import type { ScreenInfo, ScreenChangeCallback, DeviceType, PixelDensityLevel } from '@services/screen/screen.types.js'
```

### 主要类型

#### ScreenInfo

```typescript
interface ScreenInfo {
    physical: {
        width: number // 屏幕物理宽度
        height: number // 屏幕物理高度
        pixelRatio: number // 设备像素比
        isHighDPI: boolean // 是否高DPI屏幕
        orientation: string // 屏幕方向
        colorDepth: number // 颜色深度
        availWidth: number // 可用宽度
        availHeight: number // 可用高度
        dpi: number // DPI值
        dpiX: number // 水平DPI
        dpiY: number // 垂直DPI
    }
    viewport: {
        width: number // 视口宽度
        height: number // 视口高度
        scale: number // 缩放比例
        scrollX: number // 水平滚动位置
        scrollY: number // 垂直滚动位置
    }
    device: {
        isTouch: boolean // 是否支持触摸
        isMobile: boolean // 是否移动设备
        platform: string // 平台信息
        userAgent: string // 用户代理
    }
    timestamp: number // 时间戳
}
```

## 注意事项

-   这是一个单例服务，全局共享一个实例
-   自动监听窗口大小变化和方向变化
-   使用 ResizeObserver 和 orientationchange 事件
-   提供清理方法 `destroy()` 用于释放资源
-   支持 TypeScript 类型安全
-   兼容 Svelte5 响应式系统
