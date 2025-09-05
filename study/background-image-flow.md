# 背景图片上传-回显-销毁完整流程

> 适用组件：`src/components/widgets/property-panel/BackgroundEditor.svelte`

## 1. 触发上传

| 场景           | 入口                                   |
| -------------- | -------------------------------------- |
| 点击上传按钮   | 隐藏的 `<input type="file">` 被触发    |
| 拖拽图片至区域 | `dragover / drop` 事件调用同一处理函数 |

执行 `handleImageUpload(event)`：

1. 校验文件类型：`file.type.startsWith('image/')`。
2. 校验文件大小：≤ 10 MB。
3. 设置状态：`isUploading = true`、`uploadProgress = 0`。

## 2. WebP 转换

```ts
const webpBlob = await convertToWebp(file, 0.85)
```

-   通过 **`createImageBitmap` → canvas → `toBlob('image/webp')`** 实现；
-   若 WebP 体积更小则取代原文件；否则使用原文件。

## 3. 生成并写入 Blob URL

```ts
const blobUrl = URL.createObjectURL(finalBlob)
updateNodeProps(projectId, selectedId, {
    styles: {
        backgroundImage: blobUrl,
        backgroundSizeX: '100',
        backgroundSizeY: '100'
    },
    attributes: {
        'data-img-width': img.width,
        'data-img-height': img.height
    }
})
```

-   `backgroundImage` 直接保存 URL 字符串，避免 base64 臃肿；
-   原图尺寸写入 attributes 便于后续“匹配原尺寸”。

## 4. 回显机制

`getNodePropsStore(selectedId)` → `initBackgroundProps()` 监听样式变更：

1. 读取 `styles.backgroundImage` 并赋给组件状态 `backgroundImage`；
2. 在工作画布的 DOM 元素上即时渲染该 URL，实现所见即所得；
3. 读回 `data-img-width/height` 复原 `imageSize`，启用“匹配原尺寸”按钮。

## 5. 清除 / 切换模式

### 手动点击“清除背景”

```ts
cleanupBlobUrls() // revoke 旧 URL
backgroundImage = ''
updateBackgroundStyles()
```

### 切换到渐变或纯色时

-   若存在图片，同样先 `cleanupBlobUrls()`，再清空 `backgroundImage`。
-   渐变切换会同时重置 `gradientColors`，纯色切换会保留颜色。

`updateBackgroundStyles()` 最终写入：

```ts
styles.backgroundImage = ''
delete attributes['data-img-width']
delete attributes['data-img-height']
```

## 6. 组件卸载

`onDestroy` 钩子：

```ts
cleanupBlobUrls() // 最终 revoke
unsubscribe() // 取消 store 订阅
```

保证会话结束或切换节点时释放内存。

## 7. 关键状态变量

| 变量                  | 类型                               | 作用                          |
| --------------------- | ---------------------------------- | ----------------------------- |
| `backgroundImage`     | string \| Blob                     | 当前背景图 URL / Blob         |
| `lastBackgroundImage` | string                             | 上一次生成的 URL，便于 revoke |
| `imageSize`           | {width:number,height:number}\|null | 原图尺寸匹配                  |
| `isUploading`         | boolean                            | 上传状态指示                  |
| `uploadProgress`      | number                             | 上传进度（预留扩展）          |

## 8. 内存与性能保障

1. 通过 **WebP 压缩** 在前端压缩大图；
2. 使用 **Blob URL** 代替 base64，降低内存占用与渲染压力；
3. **`URL.revokeObjectURL`** 在移除或组件卸载时立即释放；
4. 支持尺寸自适应：`calc(px * var(--scale-ratio))` 与画布缩放比同步。

## 9. 图片尺寸匹配

| 场景                | 行为                                                                                                |
| ------------------- | --------------------------------------------------------------------------------------------------- |
| 上传完图片后        | 读取 `data-img-width/height` 存入 `imageSize`，启用“一键匹配”按钮                                   |
| 点击 Ratio 图标按钮 | 触发 `applyImageDimensions()`：将节点 `width`/`height` 设置为 `calc(图片像素 * var(--scale-ratio))` |
| 按钮禁用条件        | `!imageSize` \|\| 选中节点为 `root` \|\| `isDimensionMatched=true`                                  |
| 匹配状态检测        | `ResizeObserver` + `updateDimensionMatch()` 比较节点设计尺寸与 `imageSize`，误差 < 0.5px 时视为匹配 |

> 该逻辑保证节点可一键同步到图片原尺寸，并在尺寸已一致时自动禁用按钮避免误操作。

## 10. Blob URL 跨会话持久化

| 关键点               | 说明                                                                                                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **持久化对象**       | 序列化到 IndexedDB 的是 **Blob 对象** 本身，而非 `blob:` URL 字符串。浏览器结构化克隆可直接存储二进制。                                                                        |
| **运行时再生成 URL** | 项目刷新或重开后，`NodeRenderer.svelte` 从数据库取出 Blob，检测到值为 Blob 时使用 `URL.createObjectURL` 重新生成临时 URL，并缓存于 `WeakMap<Blob,string>`，确保 URL 始终有效。 |
| **统一释放**         | 生成的 URL 同时推入 `Set<string>`，在组件 `onDestroy` 遍历 `URL.revokeObjectURL` 释放，防止内存泄漏。                                                                          |
| **对比传统路径**     | 传统写死 `/uploads/xxx.png` 依赖本地服务器，重启或路径变化即 404；本方案完全本地化，无需 HTTP，天然跨会话。                                                                    |

> 小结：**“Blob 持久化 + 运行时即时 URL”** 让背景图片跨刷新、跨会话安全显示，同时配合 `revokeObjectURL` 杜绝泄漏。
