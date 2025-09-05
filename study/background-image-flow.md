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

## 2. AVIF / WebP 转换（按支持度降序）

```ts
const supportAvif = await canDecode('image/avif')
const supportWebp = await canDecode('image/webp')
const targetFmt = supportAvif ? 'avif' : supportWebp ? 'webp' : null
const finalBlob = targetFmt ? await convertTo(file, targetFmt, 0.85) : file
```

-   先运行 **特性检测**：`canDecode('image/avif'|'image/webp')`；
-   若浏览器支持 AVIF，则优先尝试 AVIF；否则尝试 WebP；两者都不支持时跳过压缩；
-   转换流程：`createImageBitmap` → canvas → `toBlob(targetFmt)`；
-   仅当转换后体积更小才使用 `finalBlob`，否则保留原文件。

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
-   原图尺寸由 `imageStore` 字段 `width/height` 提供，无需再写入节点 attributes。

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
| 上传完图片后        | 通过 `imageStore.get(hash)` 取得 `width/height` 存入 `imageSize`，启用“一键匹配”按钮（无需再写 `data-img-*` attributes） |
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

## 11. IndexedDB 图片表（`imageStore`）

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `projectId` | string | 所在项目 ID |
| `hash` | string | 图片内容哈希（SHA-1/xxhash64 等），主键 |
| `blob` | Blob | 图片二进制数据 |
| `name` | string | 原文件名 |
| `width` | number | 像素宽 |
| `height` | number | 像素高 |
| `refCount` | number | 被节点引用次数 |

### 新工作流

1. 先对 **原始文件 Blob** 执行 `await hashBlob(file)` 计算 `hash`（哈希基于未压缩图片内容，确保同一图片在不同压缩质量下哈希一致），并在 `imageStore` 中查找。
   - 若已存在，直接执行 `refCount++` 并返回记录，**无需再进行 WebP 优化或存储**；
   -    - 若不存在，再根据支持度依次尝试 AVIF / WebP 优化：
       ```ts
       const supportAvif = await canDecode('image/avif')
       const supportWebp = await canDecode('image/webp')
       const fmt = supportAvif ? 'avif' : supportWebp ? 'webp' : null
       const finalBlob = fmt ? await convertTo(file, fmt, 0.85) : file
       ```
       如优化后体积更小则使用 `finalBlob`，否则仍用原 Blob；
   - 将选定的 Blob 以同一 `hash` 保存到 `imageStore`，并初始化 `refCount = 1`；
   - 将 `hash` 写入节点样式：
   - **异步解码 + LQIP 占位**：上传完成后立即生成一个极小尺寸 LQIP（可使用 `drawImage` 缩至 32×32 并 `canvas.toDataURL('image/jpeg',0.4)` 或 `URL.createObjectURL` 生成临时 Blob URL），先写入节点让画布即时出现模糊预览；待高清 Blob 解码完成后替换为高清 URL，并在替换后立即 `URL.revokeObjectURL(lqipUrl)` 或清空 dataURL，确保不会遗留占位资源。
     ```ts
     styles.backgroundImage = hash
     ```
2. 渲染阶段，`NodeRenderer.svelte` 判断 `backgroundImage` 是否为哈希，并通过 **哈希 → URL 的 LRU 缓存** 复用 Blob URL：
   ```ts
   import { LRUMap } from 'lru_map' // 也可手写简单 LRU

   // 全局缓存：键为 hash，值为 URL，容量可按实际调优
   const urlCache = new LRUMap<string, string>(128)

   function revokeOld(key: string, val: string) {
       URL.revokeObjectURL(val)
   }
   urlCache.shift = function() {
       const [k, v] = LRUMap.prototype.shift.call(this)
       revokeOld(k as string, v as string)
       return [k, v]
   }

   async function getUrlByHash(hash: string) {
       let url = urlCache.get(hash)
       if (!url) {
           const { blob } = await imageStore.get(hash)
           url = URL.createObjectURL(blob)
           urlCache.set(hash, url)
       }
       return url
   }

   if (/^[a-f0-9]{40,}$/.test(v)) {
       const url = await getUrlByHash(v)
       value = `url(${url})`
   }
   ```
   - 同一哈希全局只生成一次 URL，避免重复 `createObjectURL` 调用；
   - 当 LRU 淘汰条目时自动 `revokeObjectURL` 释放内存；
   - 渲染器可批量预取即将进入视口的哈希填充缓存，进一步优化滚动性能。
3. **引用计数减法适用三种场景**：
   - **节点删除**：当用户在画布中删除节点（含递归删除子节点）时，遍历被移除节点的 `backgroundImage`，逐一执行引用计数 `--`；
   - **背景图片移除按钮**：点击属性面板中的“移除背景图片”按钮时，对当前节点的图片哈希执行引用计数 `--`；
   - **路由守卫全量清空**：在路由守卫（如 `beforeRouteLeave`）里项目整体卸载或切换路由时，批量遍历当前页面缓存的所有图片哈希并执行引用计数 `--`。

   统一流程：先以 `projectId + hash` 查询对应图片记录，`refCount--`；当减到 `0` 时删除该记录，并调用 `URL.revokeObjectURL(url)` 彻底释放 Blob 与内存。


### 优势

- **去重**：同一图片多次上传仅存一份 Blob，显著节省空间。
- **引用计数**：自动垃圾回收不再使用的图片。
- **简化节点样式**：节点仅保存 ~40 字节哈希，避免冗长 URL。
- **延续跨会话方案**：哈希 → Blob → 运行时 URL，兼容第 10 节设计。

### 与渐变模式的兼容性须知

- 本节哈希方案仅作用于「图片背景」分支，纯色与渐变背景的现有实现保持不变；
- 在 `BackgroundEditor.svelte` 中切换模式时，仍须遵循图片/渐变互斥的既定逻辑，勿同时修改 `backgroundImage` 与 `gradientColors`；
- 对 `updateBackgroundStyles`、`initBackgroundProps` 等核心函数的后续调整，必须确保 **渐变颜色交叉功能**（如多重渐变、渐变预览）在所有场景继续正常工作。

### `backgroundImage` 字段处理要点

1. 可存在两类值：
    - **渐变字符串**：如 `linear-gradient(...)` / `radial-gradient(...)`；
    - **图片哈希**：符合 `/^[a-f0-9]{40,}$/` 正则；
    - 不需要考虑旧数据兼容 我们确定不要用blob了
2. 解析顺序建议：先检测 `linear-gradient` 前缀 → 再判断哈希正则。
3. 仅替换 **图片分支** 的解析及存储逻辑，不得改动渐变字符串的写入与渲染方式。

## 12. 升级实施清单（阶段 1~7）

1. **数据层（IndexedDB + Dexie）**
   - 建表 `imageStore`：`{projectId, hash (PK), blob, name, width, height, refCount}`。
   - 提供工具函数 `hashBlob(file)`、`convertTo(blob, fmt, quality)` 等。
   - 上传、引用计数增减、删除等操作使用事务包装，确保一致性。
2. **上传管道（BackgroundEditor.svelte）**
   - 读取文件后 `hashBlob` 查库；如已存在仅 `refCount++`。
   - 如不存在：按 AVIF → WebP → 原图顺序压缩并存储最优 Blob。
   - 写节点样式 `styles.backgroundImage = hash`。
   - 同步生成 LQIP 占位，高清解码后替换并释放占位资源。
3. **渲染层（NodeRenderer.svelte）**
   - 解析哈希后调用 `getUrlByHash`：优先从 LRU 缓存获取 URL，未命中则从 IndexedDB 取 Blob 并 `createObjectURL`。
   - 自定义 `shift` 在淘汰时 `URL.revokeObjectURL`，支持批量预取加速滚动。
4. **内存 & 生命周期**
   - 组件级 `Set<string>` 追踪已用 URL，`onDestroy` 统一释放。
   - 节点删除 / 背景移除 / 路由卸载：引用计数 `--`，当为 0 时删除记录并 `revokeObjectURL`。
5. **公共工具 & Hook**
   - `useBlobUrl(hash)`：返回可复用 URL。
   - `useLQIP(file|blob)`：生成占位 dataURL 或小 Blob URL。
   - `cleanupBlobUrls(urlSet)`：批量释放。
6. **依赖与配置**
   - 新增依赖 `lru_map`（或自实现）。
   - 在 `env.d.ts` 补充 `canDecode` 类型，在 `vite.config.ts` 允许导入 AVIF/WebP。
7. **UI/UX 调整**
   - 上传按钮增加“优化中…”进度细分。
   - 属性面板继续保留“一键匹配原尺寸”按钮，逻辑沿用。
