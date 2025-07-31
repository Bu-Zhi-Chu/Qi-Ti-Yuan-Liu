# Transform Scale 方案

基于CSS transform scale的响应式缩放方案。

## 核心功能

- **动态计算**: 实时计算视口与设计稿的比例
- **居中显示**: 自动居中缩放后的内容
- **平滑过渡**: 窗口大小变化时平滑调整
- **无构建依赖**: 纯运行时方案，无需构建配置

## 使用场景

- 需要完全保持设计稿比例的展示
- 大屏展示、数据可视化
- 需要动态调整缩放比例的场景
- 对构建工具有限制的项目

## 核心文件

- `transform-scale.service.ts` - transform缩放核心服务

## 使用方法

```typescript
import { 
  calculateScaleRatio, 
  applyTransformScale, 
  onScaleChange 
} from '@services/responsive/transform-scale/transform-scale.service'

// 计算缩放比例
const scaleInfo = calculateScaleRatio(1920, 1080)
console.log('缩放比例:', scaleInfo.scale)

// 应用缩放
const container = document.getElementById('app')
applyTransformScale(container, 1920, 1080)

// 监听缩放变化
const unsubscribe = onScaleChange((scaleInfo) => {
  console.log('缩放比例已更新:', scaleInfo.scale)
})

// 取消监听
unsubscribe()
```

## 验证工具

```typescript
import { validateTransformScale } from '@services/responsive/transform-scale/transform-scale.service'

const result = validateTransformScale()
console.log('方案状态:', result.isWorking ? '正常' : '异常')
```