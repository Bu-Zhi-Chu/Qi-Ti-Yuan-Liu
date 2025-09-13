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

**效果**：首屏 JS 体积显著减少，页面可交互时间提前；编辑模式资源按需加载，退出后卸载监听与组件，降低内存占用并消除无用事件监听。