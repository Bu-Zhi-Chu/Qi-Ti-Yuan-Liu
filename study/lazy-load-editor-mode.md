# 懒加载编辑模式方案

## 背景

编辑器功能体积大，正常浏览页面时无需加载，懒加载可减少首屏体积与解析时间。

## 实施步骤

1. **把编辑区封装成独立组件**
   - 在 `src/components/pages/workspace/` 创建 `Workspace.svelte`，将 `#if showWorkspace` 内的所有内容剪切过去。
   - 该组件通过 props 或全局 store 读取所需数据。

2. **在 `EditorPage.svelte` 中动态导入组件**

   ```svelte
   {#if showWorkspace}
       {#await import('../workspace/Workspace.svelte') then Mod}
           <svelte:component this={Mod.default} />
       {:catch e}
           <div style="color:white">加载编辑器失败：{e.message}</div>
       {/await}
   {/if}
   ```

   Vite 会自动为 `Workspace` 及其依赖生成独立 chunk；只有切换到编辑模式时才下载并执行。

3. **编辑模式专属服务 / store 懒注册**
   - 将快捷键注册、事件监听等放在 `Workspace` 的 `onMount` 中；`Workspace` 卸载时自动清理。
   - 正常模式下完全没有这些监听。

4. **加载指示**
   - 在 `await` 块里显示简单的 Loading：`正在加载编辑器...`，避免白屏。

5. **持久化数据不受影响**
   - 数据仍存 `Dexie/IndexedDB`，懒加载不会影响读取；组件加载后正常读取即可。

6. **预加载（推荐）**
   - 在空闲时间或高概率进入编辑模式前，提前拉取 chunk。
   - 提供一个可复用的工具函数：

     ```ts
     // src/utils/preload-workspace.ts
     export const preloadWorkspace = () => import('../components/pages/workspace/Workspace.svelte');
     ```

   - 在可能触发编辑的 UI 事件中调用，例如按钮 `mouseover`、`focus` 或路由守卫：

     ```svelte
     <!-- 首页某个进入编辑按钮 -->
     <button on:mouseover={() => preloadWorkspace()} on:focus={() => preloadWorkspace()}>
       开始编辑
     </button>
     ```

   - 对于使用 `svelte-spa-router` 或自定义路由，可在路由切换前预加载：

     ```ts
     // routes.ts
     import { preloadWorkspace } from '../utils/preload-workspace';

     router.beforeEach((to) => {
       if (to.name === 'workspace') preloadWorkspace();
     });
     ```

   通过预加载，可将首次进入编辑模式的等待控制在 50–100 ms（HTTP 缓存命中时近乎零等待）。

---

## WebAssembly + 轻量 JS Loader 进阶

在以上懒加载基础上，若希望进一步压缩 JS 体积并隐藏核心算法，可将 **批量几何计算 / 布局更新 / 数据压缩** 等性能敏感逻辑迁移到 WebAssembly（WASM），只保留一个极简 Loader：

1. **可迁移逻辑**
   - 节点几何运算：对齐、分布、吸附、变形。
   - 布局算法：自动栅格 / 约束求解。
   - 二进制快照：状态序列化 + 压缩（LZ4、ZSTD）。

2. **项目结构示例**

   ```text
   packages/
   └─ qiqiaoban-core   # Rust/Go crate，输出 wasm pkg
   src/
   ├─ wasm-loader.ts   # 动态加载 init & 导出函数
   └─ components/
       └─ pages/
           └─ workspace/
               └─ Workspace.svelte
   ```

3. **使用方式（浏览器端）**

   ```ts
   // wasm-loader.ts
   import init, { apply_command } from 'qiqiaoban-core';

   let wasmReady: Promise<void> | null = null;
   export const ensureWasm = () =>
       wasmReady ??= init(); // 首次调用时拉取 .wasm 并初始化
   export const runCmd = async (state, cmd) => {
       await ensureWasm();
       return apply_command(state, cmd); // 返回 delta
   };
   ```

   在 `Workspace.svelte` 中：

   ```svelte
   import { runCmd } from '@/wasm-loader';

   async function onMove(id, dx, dy) {
       const delta = await runCmd(canvasState, {
           type: 'move',
           payload: { id, dx, dy }
       });
       patchCanvas(delta);
   }
   ```

4. **渐进替换策略**
   1. 先把“对齐/分布”操作迁移到 WASM，测量性能 & 数据往返开销。
   2. 如果收益明显，再迁移复杂布局与快照压缩逻辑。
   3. dev 环境保留原生 JS path，prod 环境才启用 WASM，确保调试体验。

5. **收益 & 注意事项**
   - 🚀 **性能**：重计算提速 1.5–5×，主线程更流畅。
   - 🔒 **安全性**：WASM 字节码较难还原源码，配合 keep_fnames 提供双层保护。
   - ⚠️ **数据序列化**：高频调用建议使用 `SharedArrayBuffer` 或二进制结构体，避免 JSON 序列化开销。

通过“懒加载 Workspace + WASM 计算核心”，既降低首屏成本，又保证编辑模式的性能与代码安全性。

**效果**：首屏 JS 体积显著减少，页面可交互时间提前；编辑模式资源按需加载，退出后卸载监听与组件，降低内存占用并消除无用事件监听。