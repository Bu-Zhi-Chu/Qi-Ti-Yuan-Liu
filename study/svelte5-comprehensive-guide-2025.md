# Svelte 官方概览学习笔记



## 1. 框架定位
Svelte 是一个用于构建 Web 用户界面的框架，主打“编译时”理念，在构建阶段将声明式组件转译成高度优化的原生 JavaScript 代码 <mcreference link="https://svelte.dev/docs/svelte/overview" index="0">0</mcreference>

- 与运行时框架（如 React、Vue）不同，Svelte 不依赖虚拟 DOM，而是通过编译器生成对真实 DOM 的精准操作代码，从而减少运行时开销 <mcreference link="https://svelte.dev/docs/svelte/overview" index="0">0</mcreference>
- 既可用于开发独立组件，也可借助 SvelteKit 构建完整的全栈应用 <mcreference link="https://svelte.dev/docs/svelte/overview" index="0">0</mcreference>

## 2. 编译时理念
- 开发者编写的 `.svelte` 文件在编译阶段被解析为三部分：HTML 模板、CSS 样式与 JavaScript 逻辑；编译器将其整合并输出无需运行时解释的 JS 代码。
- 由于省去了虚拟 DOM 的 diff 流程，更新逻辑可直接定位到具体 DOM 节点，性能更高，包体更小。

## 3. 组件语法基础
```svelte:示例组件
<script>
	function greet() {
		alert('Welcome to Svelte!');
	}
</script>

<button onclick={greet}>click me</button>

<style>
	button {
		font-size: 2em;
	}
</style>
```
- 模板语法贴近 HTML，学习曲线相对平缓。
- `<script>` 与 `<style>` 可加 `lang="ts"`、`lang="scss"` 等属性以启用预处理器。

## 4. 响应式声明
- Svelte 通过编译器分析变量依赖关系，实现细粒度更新，无需虚拟 DOM。
- Svelte 5 引入 Runes（$state、$derived、$effect 等）进一步显式化响应式声明，提升可读性与类型安全。

## 5. SvelteKit 简介
- SvelteKit 是 Svelte 官方的 Web 应用框架，提供路由、服务器渲染、预取、Adapter 等基础设施。
- 使用 `npm create svelte@latest` 可快速初始化项目。

## 6. 渐进式集成
- Svelte 可作为独立组件渐进式嵌入现有项目，无需一次性重写全部代码。
- 构建工具方面官方推荐 Vite，已内置对 `.svelte` 文件的高效处理。

## 7. 开发资源
- 官方交互式教程：<https://svelte.dev/tutorial>
- 在线 Playground：<https://svelte.dev/repl>
- VS Code 插件：Svelte for VS Code（含语法高亮、自动完成、类型检查）
- 社区讨论：Discord、GitHub Discussions、Reddit r/sveltejs

## 8. 常见问题小结
| 问题                       | 解答                                                     |
| -------------------------- | -------------------------------------------------------- |
| 与 React/Vue 有何区别？    | 编译时框架，无虚拟 DOM；模板更接近 HTML；包体更小        |
| 如何处理全栈需求？         | 使用 SvelteKit 提供的路由、Server Load、Adapter 等特性   |
| 可以与 TypeScript 配合吗？ | Svelte 原生支持 TS，可在 `<script lang="ts">` 中直接书写 |

---
> **备注**：后续将针对 Svelte 5 Runes、SvelteKit 路由与数据加载、动画与过渡、PWA 集成等内容继续扩展学习笔记。