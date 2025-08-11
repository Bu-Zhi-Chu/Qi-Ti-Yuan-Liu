# Svelte 官方概览学习笔记
## 1. Introduction

### 1.1 框架定位
Svelte 是一个用于构建 Web 用户界面的框架，主打“编译时”理念，在构建阶段将声明式组件转译成高度优化的原生 JavaScript 代码 <mcreference link="https://svelte.dev/docs/svelte/overview" index="0">0</mcreference>

- 与运行时框架（如 React、Vue）不同，Svelte 不依赖虚拟 DOM，而是通过编译器生成对真实 DOM 的精准操作代码，从而减少运行时开销 <mcreference link="https://svelte.dev/docs/svelte/overview" index="0">0</mcreference>
- 既可用于开发独立组件，也可借助 SvelteKit 构建完整的全栈应用 <mcreference link="https://svelte.dev/docs/svelte/overview" index="0">0</mcreference>

### 1.2 快速上手
- 官方推荐使用 SvelteKit（基于 Vite）：
  ```bash
  npm create svelte@latest my-app
  cd my-app
  npm install
  npm run dev
  ```  <mcreference link="https://svelte.dev/docs/svelte/getting-started" index="0">0</mcreference>

- 仅使用 Vite + Svelte：
  ```bash
  npm create vite@latest my-app -- --template svelte
  cd my-app
  npm install
  npm run dev
  ```  <mcreference link="https://svelte.dev/docs/svelte/getting-started" index="0">0</mcreference>

- 编辑器插件：VS Code 扩展 Svelte for VS Code，或使用 `sv check` 进行类型检查。 <mcreference link="https://svelte.dev/docs/svelte/getting-started" index="0">0</mcreference>

- 获取帮助：加入官方 Discord 或在 Stack Overflow 提问。 <mcreference link="https://svelte.dev/docs/svelte/getting-started" index="0">0</mcreference>

### 1.3 编译时理念
- 开发者编写的 `.svelte` 文件在编译阶段被解析为三部分：HTML 模板、CSS 样式与 JavaScript 逻辑；编译器将其整合并输出无需运行时解释的 JS 代码。
- 由于省去了虚拟 DOM 的 diff 流程，更新逻辑可直接定位到具体 DOM 节点，性能更高，包体更小。

### 1.4 组件语法基础
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

#### 1.4.1 .svelte 文件结构
- `.svelte` 文件通常包含三大可选区块：
  1. `<script>`：组件实例逻辑，顶层变量可在模板中直接引用。支持 `lang="ts"` 开启 TypeScript。
  2. `<script module>`：模块级脚本，仅在模块初次加载时运行，用于导出工具函数或共享状态。
  3. Markup 区域：HTML 模板，可插入 `{}` 表达式、指令（如 `#if`、`#each`）。
  4. `<style>`：组件私有样式，编译器会自动作用域化，避免样式冲突。 <mcreference link="https://svelte.dev/docs/svelte/svelte-files" index="1">1</mcreference>

- 三区块顺序不固定，均为可选，可根据需求排列。 <mcreference link="https://svelte.dev/docs/svelte/svelte-files" index="1">1</mcreference>

- TypeScript 支持：在 `<script lang="ts">` 或 `<script module lang="ts">` 中编写 TS 代码，配合 VS Code 插件可获得类型检查与自动补全。 <mcreference link="https://svelte.dev/docs/svelte/svelte-files" index="1">1</mcreference>

- 示例结构：
```svelte
<script module>
	// 仅加载一次的模块级代码
</script>

<script lang="ts">
	let count = 0;
	$: doubled = count * 2;
</script>

<h1>{doubled}</h1>

<style>
	h1 { color: tomato; }
</style>
```

#### 1.4.2 .svelte.js/.ts 跨文件响应式
- `.svelte.js` 与 `.svelte.ts` 文件行为类似普通模块，但可使用 Runes（如 `$state`、`$derived`），适合封装可复用的响应式逻辑或在应用中共享状态。 <mcreference link="https://svelte.dev/docs/svelte/svelte-js-files" index="2">2</mcreference>
- 注意：这些文件**不能**导出被重新赋值的 `$state` 变量本身，否则会失去响应式跟踪；可导出其只读引用或包装函数。 <mcreference link="https://svelte.dev/docs/svelte/svelte-js-files" index="2">2</mcreference>

示例：计数状态跨组件共享
```js
// count.svelte.js
import { $state } from 'svelte';
export const count = $state(0);
```
```svelte
<script lang="ts">
  import { count } from './count.svelte.js';
  function inc() { count++; }
</script>
<button on:click={inc}>{count}</button>
```

### 1.5 响应式声明
- Svelte 通过编译器分析变量依赖关系，实现细粒度更新，无需虚拟 DOM。
- Svelte 5 引入 Runes（$state、$derived、$effect 等）进一步显式化响应式声明，提升可读性与类型安全。

### 1.6 SvelteKit 简介
- SvelteKit 是 Svelte 官方的 Web 应用框架，提供路由、服务器渲染、预取、Adapter 等基础设施。
- 使用 `npm create svelte@latest` 可快速初始化项目。

### 1.7 渐进式集成
- Svelte 可作为独立组件渐进式嵌入现有项目，无需一次性重写全部代码。
- 构建工具方面官方推荐 Vite，已内置对 `.svelte` 文件的高效处理。

### 1.8 开发资源
- 官方交互式教程：<https://svelte.dev/tutorial>
- 在线 Playground：<https://svelte.dev/repl>
- VS Code 插件：Svelte for VS Code（含语法高亮、自动完成、类型检查）
- 社区讨论：Discord、GitHub Discussions、Reddit r/sveltejs

### 1.9 常见问题小结
| 问题                       | 解答                                                     |
| -------------------------- | -------------------------------------------------------- |
| 与 React/Vue 有何区别？    | 编译时框架，无虚拟 DOM；模板更接近 HTML；包体更小        |
| 如何处理全栈需求？         | 使用 SvelteKit 提供的路由、Server Load、Adapter 等特性   |
| 可以与 TypeScript 配合吗？ | Svelte 原生支持 TS，可在 `<script lang="ts">` 中直接书写 |

## 2. Runes

### 2.1 Runes 概述
- Runes 是 Svelte 5 引入的全新关键字语法，前缀为 `$`，用于在 `.svelte` 与 `.svelte.js/.ts` 文件中控制编译器行为 <mcreference link="https://svelte.dev/docs/svelte/what-are-runes" index="0">0</mcreference>
- 与普通函数不同，Runes 属于语言内建关键字：
  - 无需 import，即可直接使用 <mcreference link="https://svelte.dev/docs/svelte/what-are-runes" index="0">0</mcreference>
  - 仅能出现在特定位置，不能被赋值或作为参数传递 <mcreference link="https://svelte.dev/docs/svelte/what-are-runes" index="0">0</mcreference>

### 2.2 $state
- 显式声明可变响应式状态，替代隐式 `let` + `$:` 依赖分析。
- 基础语法：`const count = $state(0);` 变量本身即是普通值，可直接读写。

#### 基础示例
```svelte
<script>
	const count = $state(0);
</script>

<button on:click={() => count++}>
	点击次数：{count}
</button>
```

#### 深度响应式
- `$state` 作用于 **数组或简单对象** 时，会返回深度代理（Proxy），对子属性修改会自动追踪并更新界面 <mcreference link="https://svelte.dev/docs/svelte/$state" index="0">0</mcreference>

```svelte
<script>
	let todos = $state([{ text: 'learn runes', done: false }]);
</script>

<label>
	<input type="checkbox" bind:checked={todos[0].done}/>
	{todos[0].text}
</label>
```

#### 在类中使用
- 可在 **类字段** 或 **构造函数首赋值** 使用 `$state` 创建响应式实例属性，编译器会转换为 getter/setter，属性默认不可枚举 <mcreference link="https://svelte.dev/docs/svelte/$state" index="0">0</mcreference>

```ts
class Todo {
	done = $state(false);

	constructor(text: string) {
		this.text = $state(text);
	}

	reset = () => {
		this.done = false;
		this.text = '';
	};
}
```

#### $state.raw（浅响应式）
- 使用 `$state.raw` 创建**不可变引用**，对象/数组内部属性无法直接修改，只能整体重新赋值；可减少大数据结构的代理开销 <mcreference link="https://svelte.dev/docs/svelte/$state" index="0">0</mcreference>

```ts
let person = $state.raw({ name: 'Ada', age: 25 });
person.age++;                // ❌ 无效
person = { ...person, age: 26 }; // ✅ 整体替换
```

#### $state.snapshot
- 通过 `$state.snapshot(proxy)` 取得普通对象/数组快照，便于与不支持 Proxy 的第三方库交互 <mcreference link="https://svelte.dev/docs/svelte/$state" index="0">0</mcreference>

```ts
const counter = $state({ count: 0 });
externalApi.send($state.snapshot(counter));
```

#### 函数参数注意事项
- JavaScript **值传递**不会因原变量变化而自动更新函数内部值；如需实时值可传递 getter 或直接在函数内部使用 Runes <mcreference link="https://svelte.dev/docs/svelte/$state" index="0">0</mcreference>

### 2.3 $derived
- 声明**派生状态**，其值由其他 `$state` 或 `$derived` 计算而来，具有只读特性与自动缓存机制 <mcreference link="https://svelte.dev/docs/svelte/$derived" index="0">0</mcreference>
- 当依赖值变化时，派生状态被标记为脏，但**惰性**地在下次读取时才重新计算（push-pull 模型）。

#### 基础示例
```svelte
<script>
	const count = $state(1);
	const doubled = $derived(count * 2);
</script>
<p>{count} × 2 = {doubled}</p>
```

#### $derived.by：复杂计算
- 若计算逻辑较长，可使用 `$derived.by(() => { ... })` 传入函数体 <mcreference link="https://svelte.dev/docs/svelte/$derived" index="0">0</mcreference>
```svelte
<script>
	const numbers = $state([1, 2, 3]);
	const total = $derived.by(() => numbers.reduce((a, n) => a + n, 0));
</script>
<button on:click={() => numbers.push(numbers.length + 1)}>
	{numbers.join(' + ')} = {total}
</button>
```

#### 依赖追踪与 untrack
- `$derived` 会自动收集同步读取的依赖；可用 `untrack()` 排除不应触发更新的读取。

#### 覆盖派生值
- 派生值可临时被重新赋值（除 `const`），常用于乐观 UI；后续依赖变化仍会覆盖临时值 <mcreference link="https://svelte.dev/docs/svelte/$derived" index="0">0</mcreference>

#### 类字段中的派生
```ts
class Counter {
	count = $state(0);
	doubled = $derived(this.count * 2);
}
```

#### 解构派生
- 对 `$derived` 结果解构可获得同样响应式的子值：
```ts
let { a, b } = $derived(getPair());
```
等价于分别声明 `$derived`。

#### 对象/数组引用
- 与 `$state` 深度代理不同，`$derived` **不会**对对象或数组进行 Proxy 包装，需自行确保下游修改影响预期数据 <mcreference link="https://svelte.dev/docs/svelte/$derived" index="0">0</mcreference>

#### 注意事项
1. 派生表达式应避免副作用；编译器会阻止在其中修改状态。
2. 若新旧结果引用相同，则下游更新会被跳过，利于性能优化。


### 2.4 $effect
- 声明副作用函数，在其**同步读取的依赖**发生变化时重新执行，可返回清理函数 <mcreference link="https://svelte.dev/docs/svelte/$effect" index="1">1</mcreference>

#### 2.4.1 基础语法
```svelte
<script>
	const name = $state('World');
	$effect(() => {
		// 在浏览器中运行，依赖 name
		document.title = `Hello ${name}`;
		// 可返回 teardown 清理
		return () => (document.title = '');
	});
</script>
```

#### 2.4.2 生命周期与执行时机
1. 仅在 **浏览器环境** 执行，SSR 阶段不会运行 <mcreference link="https://svelte.dev/docs/svelte/$effect" index="1">1</mcreference>
2. 首次运行发生在组件挂载后（microtask 阶段），后续依赖更新被**批量调度**，DOM 更新后再执行。
3. 若返回清理函数，Svelte 在 **下一次重跑前** 或组件销毁时调用它。

#### 2.4.3 依赖追踪规则
- `$effect` 在执行时会追踪**同步读取**的 `$state` / `$derived` / `$props`，异步读取（`await`、`setTimeout`）不会被追踪 <mcreference link="https://svelte.dev/docs/svelte/$effect" index="1">1</mcreference>
- 使用 `untrack()` 包裹读取可显式排除依赖。

```svelte
<script>
	import { untrack } from 'svelte';
	const size = $state(50);
	const color = $state('#ff3e00');
	let canvas;

	$effect(() => {
		const ctx = canvas.getContext('2d');
		ctx.clearRect(0, 0, size, size);
		ctx.fillStyle = color; // 追踪 color

		setTimeout(() => {
			untrack(() => ctx.fillRect(0, 0, size, size)); // size 不被追踪
		}, 0);
	});
</script>
<canvas bind:this={canvas} width="100" height="100" />
```

#### 2.4.4 条件依赖
- 依赖集合取决于**上一次执行时实际读取**的值，因此条件分支会导致依赖动态变化。
```svelte
<script>
	const show = $state(true);
	const color = $state('#ff3e00');
	$effect(() => {
		if (show) {
			console.log(color); // 当 show 为 true 时跟踪 color
		}
	});
</script>
```

#### 2.4.5 清理函数示例
```svelte
<script>
	const intervalMs = $state(1000);
	const count = $state(0);
	$effect(() => {
		const id = setInterval(() => count++, intervalMs);
		return () => clearInterval(id); // 组件卸载或 intervalMs 变化时清理
	});
</script>
```

#### 2.4.6 使用建议
1. **避免**在 `$effect` 内直接修改 `$state`，以免产生难以追踪的循环更新。
2. 适合执行 DOM 操作、动画、订阅/取消订阅、网络请求等副作用。
3. 若仅需计算值，应优先使用 `$derived`，避免不必要的副作用。

### 2.5 $props
- 统一组件 props 声明方式，替代 `export let`，提供**类型推断**与**运行时验证**，并允许临时覆盖 <mcreference link="https://svelte.dev/docs/svelte/$props" index="2">2</mcreference>

#### 2.5.1 基础用法
```svelte
<script>
	// 解构并提供默认值
	const { message = 'Hi' } = $props<{ message?: string }>();
</script>
<h2>{message}</h2>
```
- `$props()` 返回响应式代理；解构后变量与父级 prop 同步。

#### 2.5.2 Fallback 与类型安全
```svelte
<script lang="ts">
	// 默认值仅在父级未传入或值为 undefined 时使用
	const { count = 0 }: { count?: number } = $props();
</script>
```
- 默认值不会被包装为 `$state` 代理，若需响应式请显式 `$state()`。

#### 2.5.3 重命名与非法标识符
```svelte
<script>
	// super 为关键字，需重命名
	const { super: power = '⚡️' } = $props();
</script>
```

#### 2.5.4 Rest Props
```svelte
<script>
	const { a, b, ...others } = $props();
</script>
```
- `others` 包含除 `a` 与 `b` 之外的所有 props。

#### 2.5.5 运行时更新与临时覆盖
```svelte
<!-- Parent.svelte -->
<script>
	let count = $state(0);
</script>
<Child {count} />

<!-- Child.svelte -->
<script>
	let { count } = $props();
</script>
<button on:click={() => (count += 1)}>child: {count}</button>
```
- 子组件可**临时重新赋值**覆盖 prop；依赖更新后仍会同步父级值。
- **切勿**直接 mutate 普通对象 prop，否则不会触发更新；若 prop 为 `$state` 代理，变异会触发但会出现 *ownership_invalid_mutation* 警告。

#### 2.5.6 bindable 与双向绑定
- 对于需要双向绑定的 prop，应在父组件使用 `$bindable` rune（后续章节补充）。

#### 2.5.7 最佳实践
1. 避免在子组件修改不属于自己的数据；使用回调或 `$bindable`。
2. 使用 TypeScript 为 props 提供显式类型，减少运行时错误。
3. 对大型对象传递只读引用，如需修改请在父级管理状态。


### 2.6 Legacy 模式与迁移
- 旧版 `$:` 语法仍可通过 "legacy" 配置启用，但官方建议迁移至 Runes 以获得更佳类型安全和性能 <mcreference link="https://svelte.dev/docs/svelte/what-are-runes" index="0">0</mcreference>

---
> **备注**：后续将针对 SvelteKit 路由与数据加载、动画与过渡、PWA 集成等内容继续扩展学习笔记。