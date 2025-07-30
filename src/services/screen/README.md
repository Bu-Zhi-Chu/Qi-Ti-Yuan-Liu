# 屏幕检测服务 (Screen Detection Service)

## 功能描述

这是一个专用的屏幕信息检测服务，专为七巧板低代码工具优化设计。提供以下功能：

- 屏幕物理尺寸和分辨率检测
- 视口尺寸和缩放比例计算
- 设备类型识别（移动/平板/桌面）
- 响应式监听屏幕变化
- 像素密度等级评估
- 推荐缩放比例计算

## 使用方法

### 基础使用

```typescript
import { screenDetector } from '@services/screen';

// 获取当前屏幕信息
const screenInfo = screenDetector.getScreenInfo();
console.log('屏幕信息:', screenInfo);

// 获取设备类型
const deviceType = screenDetector.getDeviceType(); // 'mobile' | 'tablet' | 'desktop'

// 获取推荐缩放比例
const scale = screenDetector.getRecommendedScale();
```

### 响应式使用 (Svelte5)

```typescript
import { screenInfo } from '@services/screen';

// 在Svelte组件中使用响应式store
$: console.log('当前屏幕信息:', $screenInfo);
```

### 监听屏幕变化

```typescript
import { screenDetector } from '@services/screen';

// 添加监听器
const unsubscribe = screenDetector.onChange((info) => {
  console.log('屏幕发生变化:', info);
});

// 移除监听器
unsubscribe();
```

## 类型定义

类型定义已分离到独立的类型文件中：

```typescript
import type { ScreenInfo, ScreenChangeCallback, DeviceType, PixelDensityLevel } from '@services/screen/screen.types.js';
```

### 主要类型

#### ScreenInfo

```typescript
interface ScreenInfo {
  physical: {
    width: number;        // 屏幕物理宽度
    height: number;        // 屏幕物理高度
    pixelRatio: number;    // 设备像素比
    isHighDPI: boolean;    // 是否高DPI屏幕
    orientation: string;   // 屏幕方向
    colorDepth: number;    // 颜色深度
    availWidth: number;    // 可用宽度
    availHeight: number;   // 可用高度
    dpi: number;          // DPI值
    dpiX: number;        // 水平DPI
    dpiY: number;        // 垂直DPI
  };
  viewport: {
    width: number;        // 视口宽度
    height: number;       // 视口高度
    scale: number;        // 缩放比例
    scrollX: number;      // 水平滚动位置
    scrollY: number;      // 垂直滚动位置
  };
  device: {
    isTouch: boolean;     // 是否支持触摸
    isMobile: boolean;    // 是否移动设备
    platform: string;     // 平台信息
    userAgent: string;    // 用户代理
  };
  timestamp: number;      // 时间戳
}
```

## 注意事项

- 这是一个单例服务，全局共享一个实例
- 自动监听窗口大小变化和方向变化
- 使用 ResizeObserver 和 orientationchange 事件
- 提供清理方法 `destroy()` 用于释放资源
- 支持 TypeScript 类型安全
- 兼容 Svelte5 响应式系统