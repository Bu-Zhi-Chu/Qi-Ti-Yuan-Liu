# PWA 功能模块 (Progressive Web App)

## 功能概述

PWA 模块为炁体源流低代码工具提供完整的渐进式 Web 应用支持，包括环境检测、Service Worker 管理、智能降级策略等功能。

## 模块结构

```
src/services/pwa/
├── pwa-detector.service.ts   # PWA环境检测与初始化服务
├── pwa-status.model.ts       # PWA状态数据模型定义
└── README.md                 # 使用文档
```

## 核心功能

### 1. 环境检测 (`PWAChecker`)

自动检测当前运行环境是否支持 PWA 功能，包括：

-   HTTPS 协议检测
-   安全上下文验证
-   Service Worker 支持检测
-   独立运行模式识别
-   智能降级策略

### 2. 状态管理 (`PWAStatus`)

提供标准化的 PWA 状态数据结构：

```typescript
interface PWAStatus {
    isHTTPS: boolean // 是否HTTPS协议
    isSecureContext: boolean // 是否安全上下文
    canRegisterSW: boolean // 是否支持Service Worker
    isStandalone: boolean // 是否独立运行模式
    downgradeMode: boolean // 是否降级模式
}
```

## 使用方法

### 基础集成

在应用启动时自动初始化 PWA 功能：

```typescript
// src/main.ts 或 App.svelte
import { PWAChecker } from './services/pwa/pwa-detector.service'

// 方式1：自动初始化（推荐）
// 已自动在window.load事件中执行，无需手动调用

// 方式2：手动控制
onMount(() => {
    PWAChecker.checkEnvironment()
    PWAChecker.initPWA()
})
```

### 状态检测

```typescript
import { PWAChecker } from './services/pwa/pwa-detector.service'

// 获取PWA状态
const status = PWAChecker.checkEnvironment()
console.log('PWA支持状态:', status)

// 获取用户友好的状态信息
const message = PWAChecker.getStatusMessage()
console.log('状态提示:', message)
```

### 条件渲染示例

```svelte
<script lang="ts">
  import { PWAChecker } from './services/pwa/pwa-detector.service'

  let pwaStatus = $state(PWAChecker.checkEnvironment())
  let statusMessage = $state(PWAChecker.getStatusMessage())

  // 监听状态变化
  $effect(() => {
    const updateStatus = () => {
      pwaStatus = PWAChecker.checkEnvironment()
      statusMessage = PWAChecker.getStatusMessage()
    }

    window.addEventListener('resize', updateStatus)
    return () => window.removeEventListener('resize', updateStatus)
  })
</script>

<div class="pwa-status">
  {#if pwaStatus.isStandalone}
    <span class="installed">✅ 已安装到主屏幕</span>
  {:else if pwaStatus.canRegisterSW}
    <button class="install-btn">📱 安装应用</button>
  {:else}
    <span class="warning">⚠️ 请使用HTTPS访问以获得完整体验</span>
  {/if}
</div>
```

## 环境适配

### 开发环境

-   自动跳过 Service Worker 注册（避免开发干扰）
-   显示详细的控制台调试信息
-   支持 HTTP 协议（降级模式）

### 生产环境

-   自动注册 Service Worker
-   使用 vite-plugin-pwa 生成优化的 Service Worker
-   要求 HTTPS 协议（PWA 标准）

### 降级策略

当环境不支持 PWA 时：

-   自动跳过 Service Worker 注册
-   移除 PWA 专属 UI 元素
-   保持普通 Web 应用功能
-   在控制台输出友好提示

## 浏览器兼容性

| 浏览器      | 支持状态    | 备注                |
| ----------- | ----------- | ------------------- |
| Chrome 89+  | ✅ 完全支持 | 推荐                |
| Firefox 85+ | ✅ 完全支持 | 推荐                |
| Safari 14+  | ✅ 完全支持 | iOS 14.3+           |
| Edge 89+    | ✅ 完全支持 | 基于 Chromium       |
| IE11        | ❌ 不支持   | 降级到普通 Web 应用 |

## 最佳实践

### 1. 错误处理

```typescript
try {
    await PWAChecker.initPWA()
} catch (error) {
    console.error('PWA初始化失败:', error)
    // 降级到普通Web应用
}
```

### 2. 性能优化

-   检测结果缓存避免重复检测
-   单例模式避免重复初始化
-   懒加载 PWA 相关功能

### 3. 用户体验

-   提供清晰的安装提示
-   处理各种网络环境
-   优雅降级保证可用性

## 调试指南

### 控制台输出

```
🔍 PWA环境检测
协议: https:
安全上下文: ✅ 是
Service Worker支持: ✅ 是
独立模式: ❌ 否
降级模式: ✅ 否
```

### 开发者工具

1. **Application > Service Workers**: 查看注册状态
2. **Application > Manifest**: 验证 manifest 配置
3. **Console**: 查看 PWA 初始化日志

### 测试命令

```bash
# 本地HTTPS测试
npm run dev -- --https

# 构建并预览
npm run build && npm run preview
```

## 相关资源

-   [PWA 官方文档](https://developer.mozilla.org/zh-CN/docs/Web/Progressive_web_apps)
-   [Service Worker API](https://developer.mozilla.org/zh-CN/docs/Web/API/Service_Worker_API)
-   [Web App Manifest](https://developer.mozilla.org/zh-CN/docs/Web/Manifest)
-   [vite-plugin-pwa 文档](https://vite-pwa-org.netlify.app/)

## 更新日志

### v1.0.0

-   ✅ 基础 PWA 环境检测
-   ✅ 自动 Service Worker 注册
-   ✅ 智能降级策略
-   ✅ TypeScript 类型支持
-   ✅ Svelte5 兼容性

### 后续计划

-   🔄 离线缓存策略优化
-   🔄 安装提示 UI 组件
-   🔄 更新通知机制
-   🔄 后台同步功能
