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

#### 2.5.6 $bindable 与双向绑定
- 使用 `$bindable()` 将 prop 声明为 **可绑定**，允许父级通过 `bind:` 指令实现双向数据流 <mcreference link="https://svelte.dev/docs/svelte/$bindable" index="0">0</mcreference>
- 仅在确有必要时使用，避免破坏自上而下的数据流模型。

##### 2.5.6.1 基础示例
```svelte
<!-- FancyInput.svelte -->
<script>
	// 声明 value 为可绑定；其默认值为空字符串
	let { value = $bindable(), ...rest } = $props();
</script>
<input bind:value={value} {...rest} />
```
```svelte
<!-- App.svelte (parent) -->
<script>
	import FancyInput from './FancyInput.svelte';
	let message = $state('hello');
</script>
<FancyInput bind:value={message} />
<p>{message}</p>
```
- 当子组件修改 `value` 时，`message` 随之更新；反之同理。

##### 2.5.6.2 默认值与 Fallback
- `$bindable('fallback')` 可指定当父级未传入 prop 时的默认值；仍具备双向绑定能力。

```svelte
let { value = $bindable('fallback'), ...rest } = $props();
```

##### 2.5.6.3 类型安全
```ts
let { count = $bindable<number>(0) } = $props();
```
- 在 TS 中可为 `$bindable<T>()` 指定类型参数，获得完整类型推断。

##### 2.5.6.4 变异警告与最佳实践
1. 子组件可直接 **重新赋值** `value`，但若对对象/数组内部进行 *mutation* 会触发 *ownership_invalid_mutation* 警告。
2. 考虑使用回调 (`on:change`) 或向上传递事件代替双向绑定，保持数据单向流。
3. 对表单组件等输入场景使用 `$bindable` 最为合适，其余情况请审慎评估。


#### 2.5.7 最佳实践
1. 避免在子组件修改不属于自己的数据；使用回调或 `$bindable`。
2. 使用 TypeScript 为 props 提供显式类型，减少运行时错误。
3. 对大型对象传递只读引用，如需修改请在父级管理状态。


### 2.6 $inspect
- 调试 rune，在开发环境下类似 `console.log`，但会在依赖值变化时重新触发 <mcreference link="https://svelte.dev/docs/svelte/$inspect" index="0">0</mcreference>

#### 2.6.1 基础用法
```svelte
<script>
	let count = $state(0);
	let message = $state('hello');
	$inspect(count, message); // 任意依赖变化时打印
</script>
```

#### 2.6.2 $inspect.with
- `$inspect(...).with(callback)` 自定义处理输出，回调首参数为 "init" 或 "update"。
```svelte
$inspect(count).with((type, value) => {
	if (type === 'update') {
		console.debug('count changed:', value);
	}
});
```

#### 2.6.3 $inspect.trace
- 在 `$effect` 或 `$derived` 内部调用 `$inspect.trace()` 可追踪导致函数重跑的依赖。
```svelte
$effect(() => {
	$inspect.trace('draw');
	drawStuff();
});
```

#### 2.6.4 性能与生产环境
1. 仅在 **开发环境** 启用；生产构建中将被移除，不影响包体积。
2. 避免在高频循环内打印大型对象，防止控制台卡顿。

#### 2.6.5 最佳实践
- 配合浏览器 DevTools 的 Network、Performance 面板综合定位问题。
- 使用 `console.trace` 结合 Source Map 快速定位代码行。

### 2.7 $host
- 在将组件编译为 **自定义元素** (`<svelte:options customElement="my-tag" />`) 时，`$host()` Rune 可用于**获取宿主元素实例**，从而便捷地派发自定义事件或操作其属性/方法 <mcreference link="https://svelte.dev/docs/svelte/$host" index="1">1</mcreference>

#### 2.7.1 基础用法：派发事件
```svelte
<!-- Stepper.svelte -->
<svelte:options customElement="my-stepper" />
<script>
	function dispatch(type) {
		$host().dispatchEvent(new CustomEvent(type));
	}
</script>
<button on:click={() => dispatch('decrement')}>－</button>
<button on:click={() => dispatch('increment')}>＋</button>
```
```svelte
<!-- App.svelte -->
<script>
	import './Stepper.svelte';
	let count = $state(0);
</script>
<my-stepper ondecrement={() => count -= 1} onincrement={() => count += 1} />
<p>count: {count}</p>
```
- `$host()` 每次调用都会返回宿主元素，可按需缓存或直接使用。
- 与 `createEventDispatcher` 不同，派发的事件可**冒泡**至父级 DOM。

#### 2.7.2 读取/修改宿主属性
利用 DOM API 可读取或设置自定义元素属性/样式：
```svelte
$effect(() => {
	const el = $host();
	el.setAttribute('data-ready', '');
});
```

#### 2.7.3 注意事项
1. **仅在自定义元素模式**下有效；普通组件内返回值为 `null`。
2. `untrack()` 可用于在 `$effect` 中非响应式地访问宿主元素，避免无意义依赖。
3. 访问宿主元素时请关注 **SSR 环境**，避免在服务器渲染阶段触发 DOM 相关逻辑。

---

### 2.8 Legacy 模式与迁移
- 旧版 `$:` 语法仍可通过 "legacy" 配置启用，但官方建议迁移至 Runes 以获得更佳类型安全和性能 <mcreference link="https://svelte.dev/docs/svelte/what-are-runes" index="0">0</mcreference>

---
> **备注**：后续将针对 SvelteKit 路由与数据加载、动画与过渡、PWA 集成等内容继续扩展学习笔记。

---

## 3 Template syntax 模板语法
Svelte 的模板语法建立在 **HTML++** 之上，可视为“更强大的 HTML”。它支持在标记中直接编写 JavaScript 表达式、条件与循环语句、事件处理、双向绑定等特性，提供了比传统框架更自然、简洁的组件声明方式。以下基于官方文档 <mcreference link="https://svelte.dev/docs/svelte/basic-markup" index="0">0</mcreference> 进行归纳整理。

### 3.1 基本标记（Basic markup）
- **小写标签**：渲染普通 DOM 元素；**大写或点号写法**：渲染子组件。
- `<script>` 中通过 `import` 使用子组件；模板中直接写 `<Widget />` 即可。
```svelte
<script>
	import Widget from './Widget.svelte';
</script>
<div>
	<Widget />
</div>
```

### 3.2 属性与表达式（Attributes & Expressions）
1. 属性与 HTML 行为一致；若值为 *nullish*(`null | undefined`) 则被忽略。
2. 可直接写 **JavaScript 表达式**：
```svelte
<button disabled={!clickable}>Save</button>
<a href="/page/{id}">详情</a>
```
3. **布尔属性**：值为 truthy 时渲染属性名本身；falsy 时不渲染。
4. **属性名值相同** 可使用 **shorthand**：`<button {disabled}>` 等价于 `disabled={disabled}`。
5. **值为字符串表达式时无需加引号**，但在 Svelte 6 中会被强制转为字符串。

### 3.3 展开属性（Spread attributes）
- 使用 `{...obj}` 批量传递属性，后定义者覆盖先定义者。
```svelte
<Widget a="1" {...props} c="3" />
```
- 可在元素与组件上混用；顺序影响覆盖结果。

### 3.4 文本表达式（Text expressions）
- 直接在大括号中写 JS 表达式：`{count}`；`null/undefined` 会被忽略。
- 若需字面量 `{`、`}`，可写 `&lbrace;` / `&rbrace;` 或 `&#123;` / `&#125;`。
- **正则字面量** 需包裹在括号内避免解析歧义：`{(/abc/).test(str)}`。

### 3.5 条件渲染（{#if}/{:else if}/{:else}）
条件渲染通过 **if block** 在模板中按需插入或移除 DOM 片段，语法与 JavaScript `if` 语句高度一致。

#### 3.5.1 基础语法
```svelte
{#if loggedIn}
  <p>Welcome back!</p>
{/if}
```
- 表达式结果为 *truthy* 时渲染内部内容，为 *falsy* (`false`/`0`/`''`/`null`/`undefined`) 时不渲染。
- `if block` **无需包裹元素**，可直接放置纯文本或内联元素。

#### 3.5.2 `{:else if}` 与 `{:else}` 链式分支
```svelte
{#if temp > 100}
  <p>Too hot!</p>
{:else if temp < 80}
  <p>Too cold!</p>
{:else}
  <p>Just right!</p>
{/if}
```
- 任意数量的 `{:else if}` 可按需堆叠；`{:else}` **可选且最多一个**，位于末尾。
- 与 JS 不同，Svelte `if block` **不支持 switch**，复杂分支建议抽成派生值或组件。

#### 3.5.3 片段渲染与内联文本
`if block` 可包裹行内文本或元素片段，不必强行再包 `<div>`：
```svelte
<h1>
  {#if winner}
    🎉 {winner} wins!
  {:else}
    Game on…
  {/if}
</h1>
```
- 渲染结果仅包含当前分支的内容，避免多余节点。

#### 3.5.4 真值陷阱与类型提示
1. **空数组/对象** 在 JS 中为 truthy，会导致条件始终为真；必要时请显式判断长度或键数。
2. 使用 TypeScript 时，可通过类型收窄 (`value as T | undefined`) 获得更安全的条件检查。

#### 3.5.5 性能与可读性
- `if block` 会在条件切换时 **销毁并重新创建** DOM 片段；高频切换可考虑 `display: none` 或 CSS 类替代。
- 保持分支内部简洁，避免在 `if` 内写大量逻辑；建议提取为函数或子组件以提升可读性。

> **提示**：如需按条件 *迭代* 列表，可在 `each block` 外层包裹 `if block`，或在表达式中返回经过过滤的数组，择优选用以获得最清晰的代码结构。

### 3.6 列表渲染（{#each}）
`each block` 提供了在模板中 **迭代任意可迭代对象**（数组、类数组、`Map`、`Set` 等）的能力 <mcreference link="https://svelte.dev/docs/svelte/each" index="0">0</mcreference>

#### 3.6.1 基础语法
```svelte
{#each todos as todo}
  <li>{todo.text}</li>
{/each}
```
- `expression` 可以是任何可传入 `Array.from()` 的值。
- **作用域**：块内部可直接访问 `todo` 变量，无需额外绑定。

#### 3.6.2 获取索引
```svelte
{#each items as item, index}
  <li>{index + 1}. {item}</li>
{/each}
```
- 第二个参数自动接收 **索引**，等价于 `Array.prototype.map` 中的第二参。

#### 3.6.3 Keyed each
```svelte
{#each items as item (item.id)}
  <li>{item.name}</li>
{/each}
```
- 提供 `key` 表达式后，Svelte 会基于键 **智能最小化 DOM 变更**，避免因重排造成的闪烁。
- `key` 应当 **全局唯一且稳定**，推荐使用字符串或数字。

#### 3.6.4 解构与 Rest
```svelte
{#each users as { id, name, ...rest }, i (id)}
  <UserCard {id} {name} {...rest} />
{/each}
```
- 可在 `as` 右侧使用 **解构赋值**，同时支持 `...rest` 收集剩余属性。

#### 3.6.5 省略 `as`：固定次数渲染
```svelte
<div class="grid">
  {#each { length: 8 } }
    <span class={{ black: (i + j) % 2 === 1 }}></span>
  {/each}
</div>
```
- 当仅需渲染 *N* 次而无需项值，可直接省略 `as`，表达式应具有 `length` 属性。

#### 3.6.6 `{:else}` 空列表分支
```svelte
{#each posts as post}
  <PostCard {post} />
{:else}
  <p>暂无内容</p>
{/each}
```
- 当 `posts.length === 0` 或迭代对象为空迭代器时渲染 `{:else}`。

#### 3.6.7 性能与最佳实践
1. **尽量提供 key**，尤其在可变列表（增删改顺序）场景下。
2. 大列表中嵌套复杂组件时，可配合 [`Virtual List`](https://github.com/sveltejs/svelte-hackernews#virtual-list) 技术减少初始渲染量。
3. 对于静态或只添加尾部的列表，可不写 key 以节省比较成本。
4. 多层嵌套时保持逻辑单一，可将子层提取为组件提升可读性与复用性。

> **提示**：如需在 `each` 内部编写副作用代码，请使用子组件并在其中通过 `$effect` 处理，避免在父级循环块中产生重复副作用。

### 3.7 Key block（{#key}）
`key block` 会在 **表达式结果发生变化时强制销毁并重新创建**其内部内容，常用于重置组件状态或在数值变化时触发动画 <mcreference link="https://svelte.dev/docs/svelte/key" index="0">0</mcreference>

#### 3.7.1 基础语法
```svelte
{#key id}
  <p>{id}</p>
{/key}
```
- 当 `id` 变化时，段落节点会被销毁并重新创建。

#### 3.7.2 组件重新挂载
```svelte
{#key userId}
  <UserProfile {userId} />
{/key}
```
- `UserProfile` 在 `userId` 变化时会被重新实例化，重走生命周期，可用于**重置内部状态**或重新执行加载逻辑。

#### 3.7.3 数值变化过渡动画
```svelte
{#key value}
  <div transition:fade>{value}</div>
{/key}
```
- 利用销毁/创建周期，配合 `transition:` 令动画在每次值变化时重新播放。

#### 3.7.4 性能与最佳实践
1. 谨慎使用，**频繁销毁/创建** 可能带来性能开销。
2. 仅在需要“恢复初始状态”或 **确保完全重渲染** 的场景下使用。
3. 如果只是数据变化，无需重置内部状态，应采用普通条件或派生值刷新视图即可。

### 3.8 Await 块（{#await}）
`await block` 通过 **pending / fulfilled / rejected** 三分状态优雅地处理异步 Promise，并在模板中定义对应 UI <mcreference link="https://svelte.dev/docs/svelte/await" index="0">0</mcreference>

#### 3.8.1 基础语法
```svelte
{#await promise}
  <p>loading…</p>           <!-- pending -->
{:then value}
  <p>{value}</p>            <!-- fulfilled -->
{:catch error}
  <p class="error">{error.message}</p>  <!-- rejected -->
{/await}
```
- 三个分支 **全部可选**，缺省时将渲染空内容。
- `pending` 分支默认置顶；`then` 与 `catch` 可互换顺序，但推荐固定 `then→catch` 便于快速识别。

#### 3.8.2 速写与省略形态
1. **省略 pending**：
   ```svelte
   {#await promise then value}
     <p>{value}</p>
   {/await}
   ```
2. **仅展示错误**：
   ```svelte
   {#await promise catch err}
     <p class="error">{err.message}</p>
   {/await}
   ```
3. **无 Promise / 已解析值**：表达式非 Promise 时直接走 `then` 分支（含 SSR）。

#### 3.8.3 与组件懒加载
```svelte
{#await import('./Chart.svelte') then { default: Chart }}
  <Chart />
{/await}
```
- 利用动态 `import()` 的 Promise 特性，轻松实现 **按需加载组件**。
- **提示**：`import()` 被打包工具拆分为独立 chunk，首屏更轻。

#### 3.8.4 SSR 行为
- 服务端渲染 **仅输出 pending 分支**（若存在）。
- 若省略 pending，仅当表达式为非 Promise 时才渲染 then；否则输出空内容，由客户端接管。

#### 3.8.5 错误边界与重试
```svelte
{#await loadData() then data catch err}
  {#if err.retriable}
    <button on:click={() => reload()}>Retry</button>
  {:else}
    <p class="error">{err.message}</p>
  {/if}
{/await}
```
- `catch` 分支可与 `if block` 组合，实现 **细粒度错误处理与重试机制**。

#### 3.8.6 性能与可读性建议
1. **抽取异步逻辑** 至 `$effect` 或 service 层，使模板聚焦 UI。
2. 多个并行 Promise 可用 `Promise.all`/`race` 包装后再交给 `await block`。
3. 避免在 `pending` 分支执行重渲染密集的动画；必要时使用 CSS 动画减少 JS 负担。
4. 当只需在错误时替换组件，可考虑与 `{#key}` 或条件渲染结合，整体更简洁。

> **小结**：合理拆分分支、关注 SSR 行为并保持模板简洁，可让 `await block` 成为处理异步数据的利器。

### 3.9 事件处理（on:）
- 通过 `on:event` 监听 DOM 与自定义事件；属性值可为内联函数或函数引用。
```svelte
<button on:click={() => count += 1}>+</button>
<button on:click={handleClick}>-</button>
```
- 事件名大小写敏感；`onClick` 监听 `Click`（大写）事件，非 `click`。
- 支持 **修饰符**（如 `preventDefault`、`stopPropagation`）语法将于后续小节扩展。

### 3.10 双向绑定（bind:） <mcreference link="https://svelte.dev/docs/svelte/bind" index="0">0</mcreference>

#### 3.10.1 基础语法
```svelte
<input bind:value={message} />
<textarea bind:value={message} />
```
- `bind:prop={var}` 让 **数据从子到父** 反向流动；省略等号默认 `prop` 与变量同名。
- 在 `dev` 模式下，编译器会验证所绑定属性是否存在。

#### 3.10.2 常见元素绑定
| 元素类型                  | 可绑定属性                 | 说明                                                |
| ------------------------- | -------------------------- | --------------------------------------------------- |
| `<input>` / `<textarea>`  | `value`                    | 文本、数字、日期等输入；数字类型会自动转为 `number` |
| `<input type="checkbox">` | `checked`, `indeterminate` | `indeterminate` 为只读，需 `null` 作为 getter       |
| `<input type="radio">`    | `group`                    | 同组互斥，绑定单个标量                              |
| `<select>`                | `value`                    | 选中值                                              |
| 任意元素                  | `this`                     | 将 DOM 节点赋值给变量，实现 **模板引用**            |

```svelte
<label><input type="checkbox" bind:checked={accepted}/> Accept</label>
<canvas bind:this={canvasRef} width="100" height="100" />
```

#### 3.10.3 只读与表单重置
- 某些属性只读（如 `clientWidth`、`scrollTop`），绑定时只能 **单向流**。
- Svelte ≥5.6 对 `defaultValue`/`defaultChecked` 提供更符合原生表单的 **reset** 行为。

#### 3.10.4 组合绑定（group）
```svelte
<script>
  let tortilla = $state('Plain');
  let fillings = $state<string[]>([]);
</script>
<label><input type="radio" bind:group={tortilla} value="Plain"/> Plain</label>
<label><input type="checkbox" bind:group={fillings} value="Rice"/> Rice</label>
```
- **Radio**：同组互斥；**Checkbox**：将所选值推入数组。

#### 3.10.5 函数绑定（≥5.9）
```svelte
<input bind:value={
  () => name,
  v => name = v.trim()
}/>
```
- 传入 `[getter, setter]` 可在赋值前后自定义逻辑；只读绑定时 `getter=null`。

#### 3.10.6 组件绑定与 `$bindable`
```svelte
<!-- FancyInput.svelte -->
<script>
  export let value = '';
  $bindable('value');
</script>
<input bind:value/>

<!-- parent -->
<FancyInput bind:value={msg}/>
```
- 子组件通过 `$bindable()` 将 prop 声明为绑定目标；父组件即可 `bind:`。

#### 3.10.7 性能与最佳实践
1. 避免在高频输入上执行重计算；可在 setter 中节流/防抖。
2. 对大型表单可封装 `useForm` 管理状态，降低模板噪音。
3. 使用函数绑定时谨慎创建新闭包；提取至顶层函数或 `use:action`。

> **小结**：`bind:` 提供声明式双向数据流，配合 `$bindable`、函数绑定与重置策略，可覆盖表单、组件通信等大量场景，保持模板简洁。

### 3.11 类与样式绑定（class 属性 / style: 指令） <mcreference link="https://svelte.dev/docs/svelte/style" index="0">0</mcreference>
`class` 属性通过 **字符串 / 对象 / 数组** 写法灵活控制类名；`style:` 指令用于绑定 **行内样式**，二者均具备良好类型推断。

#### 3.11.1 类属性写法（字符串 / 对象 / 数组）
```svelte
<!-- 条件类名 -->
<div class={{ active: isActive }}>

<!-- 绑定动态样式 -->
<div style:width={size + 'px'} style:background-color={bg}/>```
```

- `style:prop={expr}`：设置行内样式；属性名自动转为 **kebab-case**，值可为任意表达式。

#### 3.11.2 ClassValue 类型（≥5.19）
```svelte
<div class={[active && 'active', hasError && 'error']} />
<div style:color style:font-weight={bold ? 600 : 400} />
```
- `style:color` 省略绑定值时默认与同名变量 `color` 绑定。
- 同一元素可在 `class` 属性中组合多个类，也可同时使用多个 `style:` 指令，与静态 `class`/`style` 属性叠加。

#### 3.11.3 动态样式 style: 基础
```svelte
<div style:color|important="red" />
```
- 在值后加 `|important` 标记，可自动附加 `!important`。
- `|important` 仅适用于 `style:` 指令。

#### 3.11.4 `|important` 修饰符与优先级
- 当同时存在静态 `style="color: blue"` 与 `style:color="red"`，**指令优先**，即使静态属性包含 `!important`。
- 与 CSS 类优先级相同，可通过 `|important` 强制覆盖。

#### 3.11.5 TypeScript 类型
Svelte 5 为 `style:` 自动推断属性类型；若需显式标注，可使用 `HTMLElement['style']`：
```ts
/** 运行时变量，IDE 提示 color 应为 CSSColor */
let color: HTMLElement['style']['color'] = 'tomato';
```

#### 3.11.6 性能与最佳实践
1. 对 **高频更新**（如滚动监听）避免直接修改 `style:`，可结合 `requestAnimationFrame` 降频。
2. 复杂样式建议使用 **CSS 变量** 并仅切换变量值，减少行内样式变动。
3. 避免在循环中创建过多条件类；可使用计算属性或 `$derived` 聚合状态。
4. 当类名与样式高度动态时，可封装组件提供统一 API。


```svelte
<!-- 对象写法：truthy key 会被添加 -->
<div class={{ cool, lame: !cool }}>

<!-- 数组写法：元素可嵌套对象/数组，会被 clsx 展平 -->
<div class={[faded && 'opacity-50', large && 'scale-150']} />
```
- **对象**：键名为类名，真值键会被串联；适合根据状态批量切换类。
- **数组**：元素可为字符串、对象或数组，最终由 `clsx` 展平为字符串，便于合并局部样式与外部传入类。
- 嵌套数组与对象亦会被展平，可轻松组合 `Tailwind` 或其他原子类。<mcreference link="https://svelte.dev/docs/svelte/class" index="0">0</mcreference>


Svelte 5.19 起公开 `ClassValue`，表示 **元素 `class` 属性可接受的值类型**：
```ts
import type { ClassValue } from 'svelte/elements';

// 组件 Props 类型安全示例
interface ButtonProps {
  class?: ClassValue;
}
```
- 用于 **组件 Props** 时可获得 IDE 提示与类型检查。


-
-

> **小结**：`class` 属性与 `style:` 指令让元素状态与样式绑定轻量且类型安全，配合 `|important` 与 CSS 变量，可在保持可读性的同时灵活控制视图。

### 3.12 其它补充
1. **Slots**：默认 `<slot>`、具名 `<slot name="header" />`、`let:` 作用域插槽。
2. **Self-closing 标签**：Svelte 自动补全无需 `/`，写 `<Component />` 即可。
3. **组件命名空间**：`<my.namespace.Component>` 便于组织大型项目。

> **小结**：Template syntax 旨在让模板与 JavaScript 紧密结合，语法直观且无需额外 DSL。合理分层、保持简洁可读，是编写高质量 Svelte 组件的关键。

### 3.13 Snippet 与 Render 块（{#snippet}/{@render}）
`snippet` 为模板带来 **函数式复用** 能力，可在组件内部声明可参数化的片段，并通过 `@render` 渲染 <mcreference link="https://svelte.dev/docs/svelte/snippet" index="0">0</mcreference>

#### 3.13.1 基础语法
```svelte
{#snippet card(title, content)}
  <article class="card">
    <h3>{title}</h3>
    <p>{content}</p>
  </article>
{/snippet}

{@render card('Hello', 'World')}
```
- 声明 `{#snippet name(params)}`，可接受任意数量参数（支持默认值与解构，**不支持 rest 参数**）。
- 通过 `{@render name(args)}` 渲染；等同于 JS 函数调用。

#### 3.13.2 作用域规则
- Snippet 可引用外层 `<script>` 变量、同级及父级块变量。
- 作用域 **与声明位置一致**，仅对同层及子层可见，避免命名冲突。

#### 3.13.3 互相引用与递归
Snippet 可 **递归调用** 或相互引用：
```svelte
{#snippet star()} ★ {/snippet}
{#snippet repeat(n)}
  {#if n > 0}
    {@render star()} {@render repeat(n - 1)}
  {/if}
{/snippet}

<p>{@render repeat(5)}</p>
```

#### 3.13.4 作为组件 Prop 传递
Snippet 在模板中是值，可显式或隐式作为 Prop 传递：
```svelte
<Table data={rows} {header} {row} />   <!-- 显式 -->

<Table data={rows}>                    <!-- 隐式 -->
  {#snippet header()} ... {/snippet}
  {#snippet row(r)} ... {/snippet}
</Table>
```
- 组件内部通过 `$props()` 获取，对应类型为 `Snippet`，可在 TS 中显式标注。

#### 3.13.5 children 隐式 Snippet
组件标签内除 snippet 声明外的内容自动成为 `children` Snippet：
```svelte
<Button>Click me</Button>
```
- 组件需在内部通过 `$props()` 解构 `children`，并以 `{@render children()}` 渲染。

#### 3.13.6 可选 Snippet 与 Fallback
- 使用可选链 `children?.()` 可安全忽略未传入的 snippet。
- 或配合 `if block` 渲染备用内容。

#### 3.13.7 TypeScript 类型
```svelte
<script lang="ts" generics="T">
  import type { Snippet } from 'svelte';
  let { data, row }: { data: T[]; row: Snippet<[T]> } = $props();
</script>
```
- `Snippet<[T, U]>` 以 **元组** 指定参数类型；编译器将检查调用处实参数量与类型。

#### 3.13.8 性能与最佳实践
1. 将 **重复模板提炼** 为 snippet 替代复制粘贴，保持 DRY。
2. snippet 无组件生命周期与开销，适合 **轻量复用**；若需状态或副作用，请使用组件。
3. 避免在 snippet 内部执行重型计算；复杂逻辑应移至 JS 函数或 `$derived`。
4. 命名遵循小写/驼峰，增强可读性，如 `row`, `itemCard`。

#### 3.13.9 @render 表达式与安全调用
`@render` 接收 **任意可求值表达式**，不仅限于标识符：
```svelte
{@render (cool ? coolSnippet : lameSnippet)()}
```
- 若表达式结果为 snippet，则调用并渲染其返回内容。
- 若结果为 `undefined` 或非 snippet，将抛出编译错误。

**可选 snippet** 可使用 `?.` 安全调用：
```svelte
{@render children?.()}
```
- 当 `children` 未定义时渲染为空，避免运行时异常。

亦可结合 `if block` 提供 **回退 UI**：
```svelte
{#if children}
  {@render children()}
{:else}
  <p>fallback content</p>
{/if}
```
- 在可选链不满足可读性或需复杂回退逻辑时更为合适。

> **小结**：Snippet 为模板提供函数抽象，搭配 `@render` 可实现高可读、低成本的复用，是大型组件库的重要利器。

### 3.14 原生 HTML 渲染（{@html}）
`@html` 指令可将 **未经 Svelte 编译** 的原始 HTML 字符串插入模板，常用于 CMS 内容或富文本渲染 <mcreference link="https://svelte.dev/docs/svelte/@html" index="0">0</mcreference>

#### 3.14.1 基础语法
```svelte
<article>
  {@html content}
</article>
```
- 表达式需返回 **合法 HTML 字符串**；Svelte 直接 `innerHTML` 注入，不会解析内部 Svelte 语法。

#### 3.14.2 输入安全（XSS）
- **必须保证字符串已转义或来自可信源**，防止脚本注入攻击。
- 建议后端或客户端使用 DOMPurify 等库清洗富文本。

#### 3.14.3 HTML 结构限制
- HTML 需 **独立闭合**；`{@html '<div>'}` 然后插入文本再 `{@html '</div>'}` 会导致解析错误。
- 不支持在注入段内继续使用 Svelte 指令或组件。

#### 3.14.4 样式作用域
- 注入内容对 Svelte 的 **scoped CSS 不可见**。
- 如需限制样式范围，可用 `:global`：
```svelte
<style>
article :global {
  a { color: var(--link-color); }
  img { max-width: 100%; }
}
</style>
```

#### 3.14.5 性能与最佳实践
1. 尽量 **惰性加载** 大片富文本，减少首屏 DOM 注入时间。
2. 对多处富文本可封装 `<SafeHtml content />` 组件内部统一清洗与渲染，避免重复逻辑。
3. 大量动态更新时考虑 Virtual DOM 库或分块渲染，降低重排开销。

> **小结**：`@html` 为与外部富文本系统集成提供捷径，但需严格把控输入安全、样式影响与性能，以免引入 XSS 与维护成本。

### 3.15 Attachment 附件（{@attach}）
`@attach` 为元素或组件 **挂载外部逻辑** 提供了更强大的选择，具备 **完全响应式**、**可清理** 等特性 <mcreference link="https://svelte.dev/docs/svelte/@attach" index="0">0</mcreference>

#### 3.15.1 基础语法
```svelte
<script>
  /** @type {import('svelte/attachments').Attachment} */
  function log(node) {
    console.log(node.dataset.id);
    return () => console.log('cleanup');
  }
</script>

<div data-id="foo" {@attach log}></div>
```
- 函数接收 **DOM 节点**，在节点插入时执行；返回可选清理函数，于节点移除或附件重运行前调用。
- 可在 `<script lang="ts">` 中显式使用 `Attachment` 类型。

#### 3.15.2 工厂模式与参数化
```svelte
<script>
  import tippy from 'tippy.js';
  function tooltip(content) {
    return (el) => {
      const tip = tippy(el, { content });
      return tip.destroy;
    };
  }
</script>

<button {@attach tooltip('Hello')}>Hover</button>
```
- **高阶函数** 返回 Attachment，实现参数化逻辑；当 `content` 变化时附件自动重建。

#### 3.15.3 Inline Attachment
```svelte
<canvas
  width={64}
  height={64}
  {@attach (c) => {
    const ctx = c.getContext('2d');
    $effect(() => ctx.fillRect(0,0,64,64));
  }}
></canvas>
```
- 直接在模板内书写 `(node) => { ... }`，更贴近使用场景。

#### 3.15.4 传递给组件
```svelte
<Button {@attach tooltip('Info')}>Info</Button>
```
- 对组件使用时，会生成 **Symbol key** 的 prop；若组件将 props 扩展到元素，附件将挂载到该元素。

#### 3.15.5 控制重新运行
- 附件 **完全响应式**，`{@attach foo(bar)}` 中 `foo` 或 `bar` 变化均触发 **销毁→重建**。
- 若初始化代价昂贵，可改为 `foo(() => bar)` 并在子 `$effect` 中读取，避免频繁重建。

#### 3.15.6 与 Action 的区别与转换
| 特性     | Action (`use:`)                                         | Attachment (`@attach`)    |
| -------- | ------------------------------------------------------- | ------------------------- |
| 响应式   | ❌（只在 props 变化时手动调用 update）                   | ✅（依赖变化自动销毁重建） |
| 清理时机 | 组件销毁                                                | 依赖变化或组件销毁        |
| 转换     | `import { fromAction }` 可将现有 action 转为 Attachment |

#### 3.15.7 TypeScript 类型
```ts
import type { Attachment } from 'svelte/attachments';
const focus: Attachment = (el) => { el.focus(); };
```
- 使用 `Attachment` 接口声明返回值类型，IDE 拥有准确提示。

#### 3.15.8 性能与最佳实践
1. 附件在 **依赖变化** 时会重建，避免在函数体读取频繁变化的大对象。
2. **总是返回清理函数**，否则内存与事件监听可能泄漏。
3. 对复用逻辑优先考虑 snippet/组件；仅当需直接操作 DOM 或第三方库时使用 `@attach`。
4. 结合 `createAttachmentKey` 在对象传播场景下动态组装附件，提升复用性。

> **小结**：`@attach` 集合了 Action 的简洁与完全响应式的便利，是直接操纵 DOM、整合第三方库时的首选工具，配合工厂模式与类型标注可实现高效、健壮的行为扩展。

### 3.16 常量块（{@const}）
`@const` 用于在模板块内部定义 **局部常量**，避免在脚本中声明临时变量，提升可读性 <mcreference link="https://svelte.dev/docs/svelte/@const" index="0">0</mcreference>

#### 3.16.1 基础语法
```svelte
{#each boxes as box}
  {@const area = box.width * box.height}
  {box.width}×{box.height} = {area}
{/each}
```
- 只能作为 **块级**（`{#if}`、`{#each}`、`{#snippet}` 等）**直接子元素**；不可在最外层或 HTML 标签内使用。
- 定义后可在 **同级及子层** 模板表达式中读取，生命周期随所在块。

#### 3.16.2 与 `$derived` 区别
| 场景         | `@const`                 | `$derived`                 |
| ------------ | ------------------------ | -------------------------- |
| 定义位置     | 模板块内部               | `<script>` 中              |
| 依赖响应式性 | ✅ 自动随依赖更新，无缓存 | ✅ 带缓存，依赖变更重新计算 |
| 适用粒度     | 仅当前块                 | 组件级，多处可复用         |
| 代码可读性   | 更贴合模板语境           | JS 逻辑集中于脚本          |

> **建议**：计算量大或被多处引用时优先 `$derived`；仅在模板内一次性使用可选 `@const`。

#### 3.16.3 结合条件与嵌套块
```svelte
{#if product}
  {@const discount = product.price * 0.9}
  <p>折后价：{discount}</p>
  {#snippet badge(txt)}<span class="badge">{txt}</span>{/snippet}
  {@render badge(discount < 100 ? 'SALE' : 'VIP')}
{/if}
```
- `@const` 可与 snippet 等其它块配合，形成简洁表达。

#### 3.16.4 TypeScript 类型
```svelte
{#each users as u}
  {@const full: string = `${u.first} ${u.last}`}
  <li>{full}</li>
{/each}
```
- 支持显式类型标注；编译器检查表达式类型是否匹配。

#### 3.16.5 性能与最佳实践
1. 避免在循环内用 `@const` 执行重型计算；可提取至 `$derived` 缓存。
2. 常量依赖大量响应式值时会频繁更新，留意渲染性能。
3. 保持命名简洁明确；与 JS 常量区分大小写风格（模板内可用小写驼峰）。

> **小结**：`@const` 让模板能就地声明只读值，与块作用域一致，避免切换至脚本区，配合 `$derived` 取长补短，可写出既直观又高性能的模板。

### 3.17 调试块（{@debug}）
`@debug` 提供了与 `console.log()` 类似但更 **细粒度、自动化** 的调试手段 <mcreference link="https://svelte.dev/docs/svelte/@debug" index="0">0</mcreference>

#### 3.17.1 基础语法
```svelte
<script>
  let user = { first: 'Ada', last: 'Lovelace' };
</script>

{@debug user}
<h1>Hello {user.first}!</h1>
```
- 写在模板任意位置，**编译时被移除**，仅在 dev 模式生效。
- 接收 **逗号分隔** 的变量标识符列表，当任一变量值变化时在控制台输出快照，并触发 **debugger 断点**（若 DevTools 开启）。

#### 3.17.2 语法限制
| 可用                                   | 不可用                                         |
| -------------------------------------- | ---------------------------------------------- |
| 变量标识符                             | 任意表达式（对象属性、数组下标、逻辑表达式等） |
| `{@debug}`（无参数，监听任何状态变化） |                                                |
- 传入表达式如 `user.first`、`items[0]` 会编译错误。

#### 3.17.3 作用域与生命周期
- 可访问当前脚本与模板块内可见变量，**不跨组件**。
- 在组件卸载或编译为生产模式时被清除，不影响性能与包体积。

#### 3.17.4 与 DevTools 配合
- Chrome/Edge DevTools 打开时，触发 `debugger` 语句自动暂停，便于逐步检查。
- 若仅需打印值无断点，可在 DevTools 关闭时查看控制台输出。

#### 3.17.5 TypeScript 类型
- `@debug` 纯模板指令，**无需** 特殊类型声明；IDE 会基于传入标识符推导类型，用于控制台格式化。

#### 3.17.6 性能与最佳实践
1. **仅在开发环境** 使用；生产环境编译器自动剔除。
2. 避免在热更新频繁变量上放置大量 `@debug`，以免刷屏；可改用条件调试或过滤。
3. 当需表达式级调试时，可先提取为临时变量，再传入 `@debug`：
```svelte
{@const first = user.first}
{@debug first}
4. 对复杂对象可结合 `structuredClone` 或深拷贝工具，在控制台获取快照避免后续变异影响。

> **小结**：`@debug` 作为开发专属工具，简化变量追踪，编译期自动移除无性能负担；与 `console.log` 互补使用，可构建更高效的调试流程。

### 3.18 Action 指令（use:）
`use:` 指令为元素挂载行为，实现 **DOM 操作** 和 **第三方库集成**，并可通过返回对象处理生命周期 <mcreference link="https://svelte.dev/docs/svelte/use" index="0">0</mcreference>

#### 3.18.1 基础语法
```svelte
<script>
  /** @type {import('svelte/action').Action} */
  function myaction(node) {
    // 节点已挂载到 DOM

    $effect(() => {
      // 初始化逻辑

      return () => {
        // 清理逻辑
      };
    });
  }
</script>

<div use:myaction>...</div>
```
- Action 函数接收 **DOM 节点**，仅在元素挂载时调用一次（SSR 不执行）。
- 内部应利用 `$effect` 实现响应式更新与自动清理。

#### 3.18.2 参数传递
```svelte
<script>
  /** @type {import('svelte/action').Action} */
  function tooltip(node, text) {
    // 使用 text 参数...
    $effect(() => {
      // 初始化逻辑
    });
  }
</script>

<button use:tooltip={msg}>提示</button>
```
- Action 可接收 **第二个参数**，但参数变化时不会自动重新调用 Action。
- 参数变化需在 `$effect` 内部通过闭包捕获并处理。

#### 3.18.3 Legacy 模式
Svelte 5 之前的 Action 返回对象可包含 `update` 和 `destroy` 方法：
```svelte
<script>
  function tooltip(node, text) {
    // 初始化逻辑

    return {
      update(newText) { /* 参数变化时调用 */ },
      destroy() { /* 节点卸载时调用 */ }
    };
  }
</script>
```
- 此模式仍可用，但推荐迁移至 `$effect` 模式，未来可能废弃。

#### 3.18.4 与 Attachment 对比
相比 `{@attach}`，Action 的特点：
- ✅ 简洁直观，历史悠久
- ✅ 参数变化时手动 `update` 可更精细控制
- ❌ 无自动响应式，参数变化需手动处理
- ❌ 清理仅在组件销毁时执行，不会随参数变化自动重置

#### 3.18.5 实用案例
```svelte
<script>
  import { portal } from './actions';

  /** @type {import('svelte/action').Action} */
  function clickOutside(node, callback) {
    function handleClick(event) {
      if (!node.contains(event.target)) {
        callback();
      }
    }

    $effect(() => {
      document.addEventListener('click', handleClick, true);

      return () => {
        document.removeEventListener('click', handleClick, true);
      };
    });
  }
</script>

<div use:clickOutside={() => showMenu = false}>菜单</div>
<div use:portal={'body'}>浮动内容</div>
```
- Action 最适合实现 **元素级交互行为**，如点击外部关闭、拖拽、无障碍增强等。

#### 3.18.6 自定义事件
```svelte
<script>
  /**
   * @type {import('svelte/action').Action<
   *   HTMLElement,
   *   undefined,
   *   { onswipe: (e: CustomEvent) => void }
   * >}
   */
  function swipe(node) {
    $effect(() => {
      // 触摸处理逻辑...
      function fireEvent() {
        node.dispatchEvent(new CustomEvent('swipe'));
      }
      // 绑定事件...
    });
  }
</script>

<div use:swipe onswipe={handleSwipe}>滑动区域</div>
```
- Action 可派发自定义事件，在类型定义中声明事件处理器使 IDE 正确提示。

#### 3.18.7 TypeScript 类型
```ts
import type { Action } from 'svelte/action';

// 类型参数：节点类型、参数类型、自定义事件处理器
const tooltip: Action<HTMLElement, string> = (node, text) => {
  $effect(() => {
    // 实现...
  });
};
```
- `Action` 接口支持三个泛型参数：节点类型、参数、事件处理器。

#### 3.18.8 性能与最佳实践
1. Action 应专注于 **DOM 操作** 与 **外部集成**；避免在其中放置过多业务逻辑。
2. 总是返回清理函数，确保事件监听器等资源得到释放。
3. 在参数需要频繁变化的场景，优先考虑 `{@attach}` 指令的自动响应式特性。
4. 复用性强的 Action 应提取为独立模块；单个组件内临时使用的可内联定义。
5. 基于官方建议，在 Svelte 5.29+ 中 **优先考虑** 使用 `{@attach}` 而非 `use:`，除非需要兼容旧版本。

> **小结**：Action 是 Svelte 最初的 DOM 增强机制，通过 `use:` 实现清晰简洁的元素行为扩展；在 5.29+ 版本中建议向 `{@attach}` 过渡，享受完全响应式优势。

### 3.19 过渡指令（transition:\* / in: / out:） <mcreference link="https://svelte.dev/docs/svelte/transition" index="0">0</mcreference>
`transition:` 系列指令为元素 **进入与离开** 提供动画效果，包括双向 `transition:` 与单向 `in:` / `out:`，支持内置与自定义过渡。

#### 3.19.1 基础语法
```svelte
<!-- 双向（创建→进入，销毁→离开） -->
<div transition:fade>...</div>

<!-- 仅进入动画 -->
<div in:fly={{ y: 20, duration: 300 }}>...</div>

<!-- 仅离开动画 -->
<div out:scale={{ duration: 150 }}>...</div>
```
- 当元素挂载 / 卸载于 DOM 时触发对应动画；条件渲染、`{#key}`、`await` 等销毁重建都会触发。

#### 3.19.2 内置过渡函数
| 名称        | 效果说明                        | 常用参数                            |
| ----------- | ------------------------------- | ----------------------------------- |
| `fade`      | 透明度渐变                      | `delay` `duration` `easing`         |
| `blur`      | 透明度 + 高斯模糊               | 额外 `amount`（像素）               |
| `fly`       | 位移 + 透明度                   | `x` `y` `delay` `duration` `easing` |
| `slide`     | 高度/宽度滑出                   | 同上                                |
| `scale`     | 缩放 + 透明度                   | `start` `opacity`                   |
| `draw`      | SVG path stroke-dashoffset 动画 | 无                                  |
| `crossfade` | 组件间共享过渡，需成对配置      | 见 3.19.6                           |

#### 3.19.3 参数详解
```svelte
<div transition:fly={{ x: 100, y: 0, delay: 100, duration: 400, easing: quintOut }} />
```
- `delay`：延时毫秒
- `duration`：动画时长
- `easing`：缓动函数，导入自 `svelte/easing`
- 其它参数由各过渡函数自行定义。

#### 3.19.4 作用域修饰符 `|local`
```svelte
<style>
  .box { transition: transform 0.3s; }
</style>
<div transition:scale|local>...</div>
```
- `|local` 限制 CSS 动画作用域至组件，防止样式冲突。

#### 3.19.5 自定义过渡函数
```svelte
<script>
  import { cubicOut } from 'svelte/easing';
  /** @type {import('svelte/transition').TransitionFn} */
  function rotate(node, { angle = 90, duration = 200 }) {
    return {
      duration,
      css: t => `transform: rotate(${t * angle}deg);`
    };
  }
</script>
<div transition:rotate={{ angle: 180 }} />
```
- 必须返回 `{ delay?, duration, easing?, css?, tick? }` 对象。
- 可选择提供 `css`（返回字符串）或 `tick`（每帧回调）实现动画。

#### 3.19.6 协调过渡：`crossfade` & group
```svelte
<script>
  import { quintOut } from 'svelte/easing';
  import { crossfade } from 'svelte/transition';

  const [send, receive] = crossfade({ duration: 300, easing: quintOut });
  let photos = $state([...]);
</script>
{#each photos as p (p.id)}
  <img src={p.url} in:receive out:send />
{/each}
```
- `crossfade` 返回一对函数，分别用于目标与源元素，实现 **平滑列表重排**。
- 使用 `transition:fade` 配合 `{@list | group}` 可构建 **级联过渡**（Svelte ≥5.4）。

#### 3.19.7 与其他模板块配合
- **Key block**：在 `{#key}` 内包装可令数值变化时动画重新播放。
- **条件渲染**：`{#if}`/`await`/`each` 控制元素进出场景。

#### 3.19.8 SSR 行为
- 服务器渲染 **不执行过渡**；仅在客户端挂载后生效。

#### 3.19.9 TypeScript 类型
```ts
import type { TransitionConfig, TransitionFn } from 'svelte/transition';
const rotate: TransitionFn = (node, opts): TransitionConfig => ({
  duration: 200,
  css: t => `transform: rotate(${t * 360}deg)`
});
```
- `TransitionFn` 泛型参数 `<Node = Element, Params = any>`（Svelte 5）。

#### 3.19.10 性能与最佳实践
1. 尽量使用 **CSS-only** 过渡（返回 `css` 字符串），避免每帧 JS 计算。
2. 避免在大型列表同时触发大量过渡；可使用 IntersectionObserver 或懒加载分批。
3. 利用 `delay` 与自定义 `easing` 构建 **错峰动画**，减少卡顿。
4. 复杂场景优先考虑 **FLIP** 技巧或 `crossfade`，以最小化布局抖动。
5. 高频率重排动画（如窗口拖拽）应使用 `will-change` / transform 3D 加速。

#### 3.19.11 `in:` / `out:` 单向过渡
- 与 `transition:` 不同，`in:` 和 `out:` **互不影响**，当元素在过渡进行中被销毁或重新挂载时，两个动画会 **并行运行**，而不是对同一动画进行反向播放 <mcreference link="https://svelte.dev/docs/svelte/in-and-out" index="0">0</mcreference>
- 若 `out:` 动画在进行中被中断（元素重新进入），对应 `in:` 过渡将 **从头开始**，确保动画连贯。
- 典型应用：不同的进入/离开效果（如飞入 + 淡出），或在离开过程中继续播放进入动画而不被抢占。

```svelte
<script>
  import { fade, fly } from 'svelte/transition';
  let visible = $state(false);
</script>
<label>
  <input type="checkbox" bind:checked={visible}>
  visible
</label>
{#if visible}
  <div in:fly={{ y: 200 }} out:fade>飞入淡出</div>
{/if}
```

> **小结**：`in:`/`out:` 让进入与离开动画完全解耦，可自由组合不同过渡并避免相互打断；在需要差异化或并行播放的场景优于 `transition:`。

> **小结**：`transition:` 系列让 Svelte 拥有声明式、可组合的动画能力，结合内置多样过渡与强大自定义接口，可在保证性能的同时实现高度复杂的交互动效。

### 3.20 动画指令（animate:*） <mcreference link="https://svelte.dev/docs/svelte/animate" index="0">0</mcreference>
`animate:` 指令基于 **FLIP** 技术，在元素 **位置/尺寸发生变化** 时自动生成过渡动画，常用于列表重新排序、布局调整等场景。

#### 3.20.1 基础语法
```svelte
<ul>
  {#each items as item (item.id)}
    <li animate:flip>{{item.text}}</li>
  {/each}
</ul>
```
- 只能作用于 **已 key 化** 的元素 (`{#each items as i (i.id)}`)，以便框架跟踪元素身份。
- 当元素的 **bounding rect** 变化时自动触发动画；元素显隐请使用 `transition:` / `in:` / `out:`。

#### 3.20.2 内置 `flip` 动画
- `flip` 通过计算元素 **初始与最终矩阵差值** 实现平滑移动、缩放与淡入淡出。
- 典型用法：拖放排序、动态网格布局、虚拟滚动补间位置。

#### 3.20.3 参数详解
```svelte
<div animate:flip={{ duration: 400, easing: quintOut, delay: 50 }} />
```
| 参数       | 说明                       | 默认     |
| ---------- | -------------------------- | -------- |
| `delay`    | 动画延时 (ms)              | 0        |
| `duration` | 动画时长 (ms)              | 300      |
| `easing`   | 缓动函数 (`svelte/easing`) | cubicOut |

#### 3.20.4 自定义动画函数
```svelte
<script>
  import { cubicInOut } from 'svelte/easing';
  /** @type {import('svelte/animate').AnimateFn} */
  function fadeMove(node, { y = 20, duration = 300 }) {
    const style = getComputedStyle(node);
    return {
      delay: 0,
      duration,
      easing: cubicInOut,
      css: t => `transform: translateY(${(1 - t) * y}px); opacity: ${t}; ${style.cssText}`
    };
  }
</script>
<div animate:fadeMove={{ y: 40 }}>自定义动画</div>
```
- 返回对象与 `transition:` 自定义函数几乎一致：`delay` `duration` `easing` `css` `tick`。
- 不应修改布局属性（如 `position`），避免与 FLIP 计算冲突。

#### 3.20.5 列表与 `{@list | group}`
- 在 `{#each}` 中结合 `{@list | group}` 可 **级联** 列表动画，与 `transition:` 层叠效果类似。
- 若同时需要元素显隐动画，可 **组合** `in:/out:` 与 `animate:` 指令：
  ```svelte
  <li in:fade out:fade animate:flip>...</li>
  ```

#### 3.20.6 SSR 行为
- 与 `transition:` 一样，服务器渲染 **不会执行动画**；仅在客户端挂载后运行。

#### 3.20.7 TypeScript 类型
```ts
import type { AnimateConfig, AnimateFn } from 'svelte/animate';
const flip: AnimateFn = (node, opts): AnimateConfig => ({
  duration: 300,
  css: t => `transform: scale(${t});`
});
```

#### 3.20.8 性能与最佳实践
1. 确保元素可通过 **transform/opacity** 动画，避免触发布局 thrash。
2. 对大型列表启用 **虚拟滚动** 或分批渲染，减少一次性计算量。
3. 当动画卡顿时，调低 `duration` 或使用 **`will-change: transform`** 进行 GPU 加速。
4. 如需复杂交互（拖拽+重排），可结合 `svelte-dnd-action` 等高阶库以复用手势与碰撞检测。

> **小结**：`animate:` 让位置变化动画零样板且高性能，结合 FLIP 原理与自定义接口，可轻松实现复杂排版重排动效。

### 3.21 Await 表达式（实验特性） <mcreference link="https://svelte.dev/docs/svelte/await-expressions" index="1">1</mcreference>
Svelte 5.36 引入 **Await 表达式**，允许在组件 **顶层 `<script>`、`$derived(...)` 以及模板标记** 中直接使用 `await`。当前处于 **实验阶段**，需显式开启编译选项。

#### 3.21.1 启用方式与 Boundary
```js:svelte.config.js
export default {
  compilerOptions: {
    experimental: { async: true }
  }
};
```
- 需放入 **带 *pending* 片段** 的 `<svelte:boundary>` 内：
  ```svelte
  <svelte:boundary>
    <App />

    {#snippet pending()}
      <Spinner />
    {/snippet}
  </svelte:boundary>
  ```
- 此限制将在 Svelte 支持 **异步 SSR** 后移除。

#### 3.21.2 三种可用位置示例
1. **脚本顶层**
   ```svelte
   <script>
     const data = await fetch('/api/posts').then(r => r.json());
   </script>
   ```
2. **派生值**
   ```svelte
   const summary = $derived(await getSummary(postId));
   ```
3. **模板表达式**
   ```svelte
   <p>{await priceOf(item)}</p>
   ```

#### 3.21.3 同步更新与并发
- 当 `await` 依赖的状态变更时，**UI 将等待异步结果** 再同步刷新，避免中间态不一致。
- 同级互不相关的多个 `await` **并行执行**；独立 `$derived` 亦可并行更新。

#### 3.21.4 加载指示与协调
```svelte
{#if $effect.pending()}
  <p>Loading…</p>
{/if}
```
- `settled()` 返回当前更新完成的 Promise，可用于连贯动画或状态切换。

#### 3.21.5 错误处理与 SSR
- 异常将冒泡至最近 **错误边界**。
- 目前 SSR **同步**，Boundary 仅渲染 *pending* 片段；后续将支持异步流式输出。

#### 3.21.6 性能与最佳实践
1. 将 **重复异步计算** 提取至 `$derived` 缓存。
2. 对长耗时操作提供清晰 **加载／错误 UI**。
3. 避免在 `$effect` 内更新会导致组件不存在的块；遵守 **纯函数原则**。
4. 大规模数据加载仍推荐 **外部数据层/Remote Functions** 统一管理，Await 适合 **局部互动** 与 **即时计算**。

> **小结**：Await 表达式让异步逻辑深入组件任意位置，写法与原生 JS 保持一致；配合 Boundary 与相关 API，可实现灵活且一致的加载体验，未来随异步 SSR 普及将成为主流姿势。

## 4 Styling

### 4.1 组件作用域样式（Scoped styles） <mcreference link="https://svelte.dev/docs/svelte/scoped-styles" index="0">0</mcreference>
Svelte 提供 **天生作用域 CSS**，在组件内编写的 `<style>` 默认只影响当前组件，避免全局样式冲突。

#### 4.1.1 基础概念
```svelte
<script>
  // 无需任何特殊写法，样式天然隔离
</script>
<style>
  p {
    color: burlywood;
  }
</style>
<p>仅在本组件呈现为 burlywood 颜色</p>
```
- 编译结果会为元素添加形如 `svelte-123xyz` 的 **哈希类名**，并在选择器中注入相同类以保证作用域。
- 哈希基于 **文件内容** 生成，组件修改后会重新计算。

#### 4.1.2 选择器特性与优先级
- 由于额外类名，选择器 **特异性提升 0-1-0**，使组件样式可覆盖同级全局样式。<mcreference link="https://svelte.dev/docs/svelte/scoped-styles" index="0">0</mcreference>
- 当同一选择器需多次注入哈希时，除第一次外使用 `:where(.svelte-xyz)`，避免进一步提升特异性。

#### 4.1.3 逃逸作用域：`:global()`
```css
/* 全局选择器写法 */
:global(body) {
  margin: 0;
}

/* 仅解包局部选择器 */
:global(.theme-dark) .container {
  background: #222;
}
```
- 亦可在 `<style global>` 中一次性关闭作用域，但 **谨慎使用** 避免污染。

#### 4.1.4 根选择器 `:root`
- `:root` 被视为全局选择器，不会注入哈希，可安全定义 **CSS 变量**：
  ```css
  :root {
    --brand-color: #ff3e00;
  }
  ```

#### 4.1.5 Scoped `@keyframes` 与动画
- 在组件内声明的 `@keyframes` 会同样加哈希前缀，避免命名冲突：
  ```css
  @keyframes bounce {
    0% { transform: scale(0.6); }
    60% { transform: scale(1.2); }
    100% { transform: scale(1); }
  }
  .bouncy {
    animation: bounce 600ms;
  }
  ```
- 编译后关键帧名将变为 `bounce-svelte-xyz`，模板内引用自动同步。

#### 4.1.6 与运行时样式 API 的配合
- **类名绑定** (`class={...}`) 与 **动态 style:** 指令可与 Scoped CSS 协同，无需额外处理。
- 对全局库样式（如 Tailwind）可通过 `:global()` 或容器类实现隔离。

#### 4.1.7 性能与最佳实践
1. 倾向使用组件 CSS 而非全局样式，降低依赖耦合。
2. 随着组件数量增多，推荐 **CSS 变量** + 设计系统统一主题。
3. 避免在深循环中生成大量唯一选择器，可提取为复用组件。
4. 对 **重用动画** 或 **重用变量**，可在顶层 `:global()` 定义，再在组件中消费。

> **小结**：Scoped styles 让组件样式天然隔离，无需命名规范即可避免冲突；配合 `:global()`、`:root` 与哈希关键帧，既保证封装性又保留全局自定义空间，是构建大型 Svelte 应用的基石。

### 4.2 全局样式（:global & `<style global>`） <mcreference link="https://svelte.dev/docs/svelte/global-styles" index="0">0</mcreference>
Svelte 通过 `:global()` 修饰符及 `<style global>` 标签支持 **精细或整体** 的全局样式声明。

#### 4.2.1 :global(...) 单选择器
```css
:global(body) {
  margin: 0;
}
/* 仅 body 被提升，全局生效 */
```
- 亦可嵌套写在局部选择器前：`.wrapper :global(h2)`。

#### 4.2.2 :global { ... } 区块
```css
:global {
  h1 { font-size: 2rem; }
  p  { line-height: 1.6; }
}
```
- 适合 **批量导入设计系统** 的基础排版规则。

#### 4.2.3 全局 @keyframes
- 关键帧需加 `-global-` 前缀，编译时自动去除：
  ```css
  @keyframes -global-fade {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  ```

#### 4.2.4 与第三方库协作
- 使用框架类（如 `class="prose"`）或 `:global()` 包裹可在组件中 **安全引入 Tailwind / Normalize** 等库。

#### 4.2.5 性能与最佳实践
1. 控制全局选择器范围，避免过度覆盖。
2. 将通用变量、排版规则集中至 **顶层样式表**，组件内仅覆写必要部分。

> **小结**：`:global()` 在保证封装的同时提供必要的全局后门，用于引入设计系统、重置样式或跨组件动画。

### 4.3 CSS 自定义属性（Custom properties） <mcreference link="https://svelte.dev/docs/svelte/custom-properties" index="1">1</mcreference>
自定义属性（CSS Variables）可在 **组件实例** 间传递主题色、尺寸等动态样式，兼顾 **运行时绑定** 与 **静态定义**。

#### 4.3.1 组件入参
```svelte
<Slider --track-color="#000" --thumb-color={`rgb(${r} ${g} ${b})`} />
```
- Svelte 在编译期 **包裹外层元素** 托管行内样式，SVG 则换用 `<g>` 标签。

#### 4.3.2 组件内部读取
```css
.track { background: var(--track-color, #aaa); }
.thumb  { background: var(--thumb-color, blue); }
```
- 提供 **后备值** 保证无参数时的可用样式。

#### 4.3.3 根级变量与主题切换
```css
:root {
  --brand: #ff3e00;
}
.dark-theme {
  --brand: #ff6600;
}
```
- 父元素切换类名即可 **级联更新** 子组件颜色，无需 JS 参与。

#### 4.3.4 性能与最佳实践
1. 按需传递，避免在深层次组件插入过多 style 属性。
2. 主题变量集中在 `:root` 或布局容器，组件只消费。

> **小结**：Custom properties 打通了 **设计系统 → 组件实例** 的样式通路，与响应式状态结合可实现亮暗主题、动态配色等高级场景。

### 4.4 嵌套 `<style>` 元素（Nested style elements） <mcreference link="https://svelte.dev/docs/svelte/nested-style-elements" index="2">2</mcreference>
组件允许在任何模板位置插入额外 `<style>`，**不再进行作用域处理**，原样注入 DOM。

#### 4.4.1 用例
```svelte
<div>
  <style>
    div { color: red; }
  </style>
</div>
```
- 常用于 **Markdown 解析**、**动态渲染** 时临时注入样式。

#### 4.4.2 注意事项
1. 无哈希隔离，可能污染全局，应限制选择器范围。
2. 不能超过 **一个顶层 `<style>`**，否则编译错误。

> **小结**：嵌套 `<style>` 适合少量、动态样式注入；大规模或全局样式仍应通过 `:global()` 或外部样式表管理。

## 5 Special elements
Svelte 在模板层面提供一组以 **`<svelte:*>`** 为前缀的特殊元素，用于访问宿主环境对象、配置组件编译选项或增强运行时行为。

### 5.1 `<svelte:boundary>` 边界 <mcreference link="https://svelte.dev/docs/svelte/svelte-boundary" index="0">0</mcreference>
- **功能**：封装一段 UI，统一处理 **Await 表达式** 初始加载、渲染期错误并提供复位能力。
- **核心属性/片段**：`pending` 片段、`failed(error, reset)` 片段、`onerror` 回调。
- **示例**：
  ```svelte
  <svelte:boundary>
    <p>{await fetchTitle()}</p>

    {#snippet pending()}
      <Spinner />
    {/snippet}

    {#snippet failed(err, reset)}
      <Error {err} on:retry={reset}/>
    {/snippet}
  </svelte:boundary>
  ```
- **最佳实践**：
  1. 将 **局部异步 UI** 包裹在边界，避免整页加载空白。
  2. 在 `onerror` 中上报监控，同时透传 `reset` 供用户重试。

### 5.2 `<svelte:window>` <mcreference link="https://svelte.dev/docs/svelte/svelte-window" index="1">1</mcreference>
- **功能**：无须手动清理即可监听 `window` 事件或绑定只读属性。
- **示例**：监听键盘：
  ```svelte
  <script>
    function onKey(e) { console.log(e.key); }
  </script>
  <svelte:window onkeydown={onKey}/>
  ```
- **常用绑定**：`innerWidth|innerHeight|scrollX|scrollY|online` 等。

### 5.3 `<svelte:document>` <mcreference link="https://svelte.dev/docs/svelte/svelte-document" index="2">2</mcreference>
- 允许在 `document` 级别监听 `visibilitychange`、使用 actions，语法与 `<svelte:window>` 类似。

### 5.4 `<svelte:body>` <mcreference link="https://svelte.dev/docs/svelte/svelte-body" index="3">3</mcreference>
- 专用于 `document.body` 事件（如 `mouseenter`），避免全局监听泄漏。

### 5.5 `<svelte:head>` <mcreference link="https://svelte.dev/docs/svelte/svelte-head" index="4">4</mcreference>
- 在组件中声明 `head` 元信息；SSR 时自动提取，CSR 时插入 DOM。
  ```svelte
  <svelte:head>
    <title>关于我们</title>
    <meta name="description" content="示例页面" />
  </svelte:head>
  ```

### 5.6 `<svelte:element>` <mcreference link="https://svelte.dev/docs/svelte/svelte-element" index="5">5</mcreference>
- **动态标签渲染**：`this` 接收字符串或变量；可结合 CMS 输出或自定义组件。
  ```svelte
  <script> let tag = $state('section'); </script>
  <svelte:element this={tag} class="box">动态容器</svelte:element>
  ```
- 若为 SVG，请显式加 `xmlns` 以确保命名空间正确。

### 5.7 `<svelte:options>` <mcreference link="https://svelte.dev/docs/svelte/svelte-options" index="6">6</mcreference>
- **每组件编译配置**：如 `runes`, `namespace`, `customElement`, `css` 等。
  ```svelte
  <svelte:options runes={true} customElement="my-button" />
  ```
- 在 Runes 模式项目中一般 **无需显式** 指定 `runes={true}`，仅在混用 Legacy 组件时强制切换。

> **全章小结**：Special elements 提供对宿主环境、编译器及错误边界的官方入口，使组件具备更强的 **运行时能力** 与 **元编程能力**。熟练掌握可大幅提高应用的健壮性与灵活度。

## 6 Runtime
Svelte 5 在运行时提供了一套精简而强大的 API，帮助开发者创建 **跨组件共享状态**、**解除层级耦合**、**编排副作用**，以及 **以命令式方式控制组件生命周期**。

### 6.1 Stores <mcreference link="https://svelte.dev/docs/svelte/stores" index="0">0</mcreference>
Stores 是符合 *store contract* 的对象，可通过 `$` 前缀在组件模板与脚本中获得 **自动订阅** 的值并保持响应式。

#### 6.1.1 核心类型
| 类型                            | 说明                                 |
| ------------------------------- | ------------------------------------ |
| `writable(initial, start?)`     | 可写 store，暴露 `set`/`update` 方法 |
| `readable(initial, start)`      | 只读 store，外部仅能读取             |
| `derived(stores, fn, initial?)` | 从一个或多个 store 派生的新 store    |

```svelte
<script>
  import { writable, derived } from 'svelte/store';

  const count = writable(0);
  const doubled = derived(count, (n) => n * 2);
</script>

<p>{$count} → {$doubled}</p>
<button on:click={() => count.update((n) => n + 1)}>+</button>
```

#### 6.1.2 与 Runes 的关系
- Runes 出现后，可用 `$state`/`$derived` 解决大多数共享场景；
- 当需要 **外部手动推送值**、**复杂异步流** 或 **RxJS 互操作** 时，Store 依然是首选。

#### 6.1.3 最佳实践
1. 保持 **单一职责**：每个 store 只管理一个领域模型；
2. 使用 `derived` 代替手动订阅组合，避免泄漏；
3. 在组件卸载时自动 `unsubscribe`，无需手动清理。

---

### 6.2 Context <mcreference link="https://svelte.dev/docs/svelte/context" index="1">1</mcreference>
Context 允许父组件向任意深度的后代共享数据，避免 „prop drilling”。

```svelte
<!-- Parent.svelte -->
<script>
  import { setContext } from 'svelte';
  setContext('theme', 'dark');
</script>

<Child />
```

```svelte
<!-- Child.svelte -->
<script>
  import { getContext } from 'svelte';
  const theme = getContext('theme');
</script>

<p class:dark={theme === 'dark'}>内容</p>
```

#### 6.2.1 进阶用法
- `hasContext` / `getAllContexts` 用于调试与封装。
- **类型安全**：封装 `setUserContext`/`getUserContext` 保留泛型信息。

#### 6.2.2 对比 Store
Context 绑定于 **组件实例树**，而 Store 可跨树共享；选择依据是数据与组件层级是否耦合。

---

### 6.3 Lifecycle hooks <mcreference link="https://svelte.dev/docs/svelte/lifecycle-hooks" index="2">2</mcreference>
Svelte 5 将生命周期简化为 **创建** 与 **销毁**，细粒度更新由 $effect 负责。

| Hook            | 触发时机              | 典型用途                  |
| --------------- | --------------------- | ------------------------- |
| `onMount(cb)`   | 客户端挂载后          | 订阅事件、请求数据        |
| `onDestroy(cb)` | 组件卸载前            | 清理定时器、解绑 listener |
| `tick()`        | await 下一轮 DOM 更新 | 滚动、测量 DOM            |

```svelte
<script>
  import { onMount, onDestroy, tick } from 'svelte';

  let timer;
  onMount(() => {
    timer = setInterval(() => console.log('ping'), 1000);
  });

  onDestroy(() => clearInterval(timer));

  async function scrollBottom() {
    await tick();
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }
</script>
```

> **Runes 替代**：使用 `$effect` / `$effect.pre` 可获得更细粒度且自动清理的副作用控制。

---

### 6.4 Imperative component API <mcreference link="https://svelte.dev/docs/svelte/imperative-component-api" index="3">3</mcreference>
当需要 **手动挂载** 或 **服务器端渲染** 时，可使用命令式 API 替代 `<App />` 声明式用法。

| 函数                                    | 场景                              |
| --------------------------------------- | --------------------------------- |
| `mount(Component, { target, props })`   | 客户端挂载根或动态组件            |
| `unmount(instance, { outro })`          | 卸载并可选播放 outro 过渡         |
| `hydrate(Component, { target, props })` | CSR 接管 SSR 标记                 |
| `render(Component, { props })`          | 仅限服务器，返回 `{ body, head }` |

```js
import { mount, unmount } from 'svelte';
import Tooltip from './Tooltip.svelte';

const tip = mount(Tooltip, {
  target: document.body,
  props: { text: 'Hello' }
});

// 关闭
unmount(tip, { outro: true });
```

#### 6.4.1 注意事项
1. `mount/hydrate` 不会自动运行 effect，可用 `flushSync()` 强制刷新；
2. 对多实例 Tooltip、Modal 等按需挂载可减轻初始负载；
3. 在 SSR 场景下，`render` 输出的 `head` 需拼接到模板 `<head>` 中。

> **小结**：Imperative API 让 Svelte 兼顾声明式与命令式两种范式，适配复杂集成与渐进迁移场景。

---

> **全章小结**：Runtime API 贯穿 **状态管理 → 跨层通信 → 生命周期 → 命令式实例化** 的完整链路，既延续了 Svelte 简洁直观的理念，又在 Runes 革命后提供向下兼容与高阶用例支撑，掌握这些接口可显著提升对框架底层机理的理解与应用广度。

## 7 Misc
Misc 章节收录了 **测试、TypeScript 支持、自定义元素编译** 与 **常见 FAQ** 等主题，它们跨越编译与运行时，帮助开发者提升 **生产力** 与 **使用体验**。

### 7.1 Testing <mcreference link="https://svelte.dev/docs/svelte/testing" index="0">0</mcreference>
- **Svelte 对测试框架零耦合**：可使用 Vitest、Jest、Playwright、Cypress 等。
- **Unit & Integration**：推荐 **Vitest + jsdom**，`flushSync()` 可同步执行 `$effect`。
- **Component Testing**：`@testing-library/svelte`/`playwright` 挂载真实组件，更贴近用户交互。
- **Runes in Tests**：只要文件后缀包含 `.svelte`，即可在测试脚本内使用 `$state` 等 Runes。
- **E2E**：使用 **Playwright** 或 **Cypress** 运行浏览器级场景，确保端到端流程。
- **最佳实践**：
  1. 拆分业务逻辑至纯函数，单元测试无需渲染组件。
  2. 使用 `// @vitest-environment jsdom` 控制局部 DOM 环境。
  3. 对副作用组件使用 **`$effect.root`** 包裹测试，确保清理。

### 7.2 TypeScript <mcreference link="https://svelte.dev/docs/svelte/typescript" index="1">1</mcreference>
- **启用方式**：`<script lang="ts">`；Svelte 编译器直接理解 **类型擦除** 特性。
- **受限语法**：`enum`、访问修饰符初始化、TC39 未达 stage-4 特性需预处理。
- **vitePreprocess**：在 `svelte.config.js` 添加 `vitePreprocess({ script: true })` 支持全 TS。
- **tsconfig 建议**：`target: "ES2015"`, `verbatimModuleSyntax: true`, `isolatedModules: true`。
- **泛型 & $props**：
  ```svelte
  <script lang="ts" generics="T">
    interface Props { items: T[]; }
    let { items }: Props = $props();
  </script>
  ```
- **最佳实践**：利用 IDE 插件和 `svelte-check` 持续静态检查。

### 7.3 Custom elements <mcreference link="https://svelte.dev/docs/svelte/custom-elements" index="2">2</mcreference>
- **编译为 Web Components**：`<svelte:options customElement="my-card" />`。
- **属性映射**：在 `props` 选项中配置 `reflect`, `type`, `attribute`。
- **Shadow DOM**：`shadow: "none"` 可关闭，适配全局样式或表单.
- **Lifecycle**：组件在 **connectedCallback 下一 tick** 创建；`extend()` 可自定义 class。
- **注册方式**：
  ```js
  import Card from './Card.svelte';
  customElements.define('my-card', Card.element);
  ```
- **最佳实践**：聚焦可复用 UI 组件，避免在应用级组件开启 `customElement`。

### 7.4 FAQ <mcreference link="https://svelte.dev/docs/svelte/faq" index="3">3</mcreference>
- **新手学习路径**：官方教程 → 交互式文档 → 社区资源 (Svelte Society)。
- **编辑器支持**：安装 *Svelte for VS Code* 扩展获取高亮与诊断。
- **自动格式化**：`prettier-plugin-svelte`，保持一致编码风格。
- **组件文档**：使用 `<!-- @component -->` JSDoc 风格注释，编辑器 Hover 可见。
- **规模化**：Svelte 编译产物是纯 JS；经验表明可支撑大型项目，关注 bundle 分割。
- **测试地图**：Unit → Component → E2E 分层，避免冗余。

> **全章小结**：Misc 汇总了与 Svelte **工程化** 与 **生态** 相关的高频主题，掌握测试、TypeScript、自定义元素与常见问题，可在实际项目中获得更高效的开发与运维体验。

## 8 Reference
Reference 章节集中汇总 Svelte 官方各模块 API，便于查阅与对照。本章仅做 **索引与速览**，详细参数与示例请参见对应文档。

### 8.1 Core runtime <mcreference link="https://svelte.dev/docs/svelte/svelte" index="0">0</mcreference>
- **组件基类**：`Component`（替代 Svelte 4 的 `SvelteComponent`）。
- **生命周期与副作用**：`onMount`、`onDestroy`、`tick`、`flushSync` 等。
- **Context**：`setContext` / `getContext` / `hasContext` / `getAllContexts`。
- **命令式 API**：`mount`、`hydrate`、`render`、`unmount`。
- **低阶工具**：`createEventDispatcher`、`createRawSnippet`、`untrack` 等。

### 8.2 Actions & Attachments
- **`svelte/action` 类型定义** <mcreference link="https://svelte.dev/docs/svelte/svelte-action" index="1">1</mcreference>：TS 泛型 `Action` / `ActionReturn`。
- **`svelte/attachments` 运行时** <mcreference link="https://svelte.dev/docs/svelte/svelte-attachments" index="9">9</mcreference>：全新 *attachment* 概念，取代 Svelte 4 action；支持 `update`/`destroy` 与额外属性声明。

### 8.3 Animation & Motion
| 模块                                                                                                                 | 说明                                        |
| -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `svelte/animate` <mcreference link="https://svelte.dev/docs/svelte/svelte-animate" index="2">2</mcreference>         | `flip()` 实现 First-Last-Invert-Play 动画   |
| `svelte/motion` <mcreference link="https://svelte.dev/docs/svelte/svelte-motion" index="7">7</mcreference>           | `Spring` / `Tween` / `prefersReducedMotion` |
| `svelte/transition` <mcreference link="https://svelte.dev/docs/svelte/svelte-transition" index="12">12</mcreference> | `fade`、`fly`、`slide` 等过渡指令           |
| `svelte/easing` <mcreference link="https://svelte.dev/docs/svelte/svelte-easing" index="4">4</mcreference>           | `cubicOut`、`backIn`、`elastic`… 预设曲线   |

### 8.4 Reactivity helpers
- **`svelte/reactivity`** <mcreference link="https://svelte.dev/docs/svelte/svelte-reactivity" index="10">10</mcreference>: `$state` / `$derived` / `$effect` 等核心 Runes。
- **`svelte/reactivity/window`** <mcreference link="https://svelte.dev/docs/svelte/svelte-reactivity-window" index="8">8</mcreference>: `innerWidth.current`、`online.current` 等窗口级响应值。

### 8.5 Store utilities <mcreference link="https://svelte.dev/docs/svelte/svelte-store" index="13">13</mcreference>
`writable` / `readable` / `derived` 与 `Spring`/`Tween` 互补；遵循 *store contract*。

### 8.6 Compiler API <mcreference link="https://svelte.dev/docs/svelte/svelte-compiler" index="3">3</mcreference>
- `compile` / `compileModule`：源码 → JS 模块。
- `parse`：AST 解析；`migrate`：自动迁移至 Runes。
- `preprocess`：自定义转换管线。

### 8.7 Server helpers <mcreference link="https://svelte.dev/docs/svelte/svelte-server" index="11">11</mcreference>
为 Edge / Functions 场景提供 `createHandler`、`stream` 等 SSR 工具。

### 8.8 Events utility <mcreference link="https://svelte.dev/docs/svelte/svelte-events" index="5">5</mcreference>
`on(target, type, handler)` 确保监听顺序正确；适配 `window`/`document`/DOM 节点。

### 8.9 Legacy helpers <mcreference link="https://svelte.dev/docs/svelte/svelte-legacy" index="6">6</mcreference>
迁移阶段临时 API：`asClassComponent`、`createBubbler`、`run`、事件修饰符替代函数等。

### 8.10 Diagnostics
| 分类       | 链接                                                                                             |
| ---------- | ------------------------------------------------------------------------------------------------ |
| 编译错误   | <mcreference link="https://svelte.dev/docs/svelte/compiler-errors" index="14">14</mcreference>   |
| 编译警告   | <mcreference link="https://svelte.dev/docs/svelte/compiler-warnings" index="15">15</mcreference> |
| 运行时错误 | <mcreference link="https://svelte.dev/docs/svelte/runtime-errors" index="17">17</mcreference>    |
| 运行时警告 | <mcreference link="https://svelte.dev/docs/svelte/runtime-warnings" index="18">18</mcreference>  |

> **全章小结**：Reference 提供对 Svelte **核心运行时、编译器、动画、响应式、诊断** 等模块的快捷索引，配合官方文档可快速定位 API 细节，提升开发检索效率。