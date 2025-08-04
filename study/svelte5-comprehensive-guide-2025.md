# Svelte 5 全面学习指南（2025年最新版）

## 📋 概述

Svelte 5 是Svelte框架的重大版本升级，于2024年底正式发布，带来了革命性的Runes系统、增强的TypeScript支持、性能优化和开发体验改进。本指南基于2025年最新文档和实践经验整理。

## 🎯 核心新特性

### 1. Runes系统 - 响应式编程革命

Runes是Svelte 5的核心创新，取代了传统的`$:`语法，提供了更明确、更强大的响应式编程模型。

#### 1.1 $state - 显式状态声明

$state是Svelte 5最核心的Runes之一，用于声明响应式状态。它有多种使用模式和子方法。

**基础用法：**
```typescript
// 基础状态
let count = $state(0);
let user = $state({ name: '张三', age: 25 });
let items = $state(['苹果', '香蕉', '橙子']);
```

**高级子方法：**

##### $state.raw - 原始状态
用于创建非响应式的原始对象，适用于大型数据集或不需要响应式的场景：
```typescript
let largeData = $state.raw({
  users: Array.from({ length: 10000 }, (_, i) => ({ id: i, name: `User ${i}` }))
});

// 注意：$state.raw的对象不能直接修改属性
// ❌ 错误：largeData.users.push(newUser) - 不会触发更新
// ✅ 正确：largeData = { ...largeData, users: [...largeData.users, newUser] };
```

##### $state.snapshot - 状态快照
获取当前响应式状态的静态快照：
```typescript
let form = $state({ name: '', email: '' });

function saveForm() {
  // 创建状态的不可变副本
  const snapshot = $state.snapshot(form);
  sendToServer(snapshot);
}
```

**对象和数组的响应式：**
```typescript
// 对象的响应式属性
let settings = $state({
  theme: 'dark',
  language: 'zh-CN',
  notifications: {
    email: true,
    push: false
  }
});

// 直接修改会触发更新
settings.theme = 'light';
settings.notifications.email = false;

// 数组的响应式方法
let todos = $state([
  { id: 1, text: '学习Svelte 5', done: false }
]);

todos.push({ id: 2, text: '掌握Runes', done: false });
todos[0].done = true;
```

**类中的响应式状态：**
```typescript
class User {
  name = $state('');
  age = $state(0);

  // 计算属性
  description = $derived(`${this.name} (${this.age}岁)`);

  constructor(name: string, age: number) {
    this.name = name;
    this.age = age;
  }

  // 方法
  birthday() {
    this.age++;
  }
}

let user = $state(new User('张三', 25));
```

**优势：**
- 明确状态边界，避免意外响应式
- 更好的TypeScript类型推断
- 支持跨文件共享响应式状态
- 细粒度响应式更新
- 内存使用优化

#### 1.2 $derived - 派生状态
```typescript
// Svelte 4 旧写法
let doubled = 0;
$: doubled = count * 2;

// Svelte 5 新写法
let doubled = $derived(count * 2);
```

**特性：**
- 自动缓存计算结果
- 避免不必要的重复计算
- 更好的调试体验

#### 1.3 $effect - 副作用处理

$effect用于处理副作用，如DOM操作、事件监听、异步请求等。它会在依赖变化时自动重新执行。

**基础用法：**
```typescript
let count = $state(0);

$effect(() => {
  console.log('count changed:', count);

  // 清理函数 - 在effect重新运行或组件销毁时调用
  return () => {
    console.log('cleanup');
  };
});
```

**高级子方法：**

##### $effect.root - 根作用域
创建独立的effect作用域，常用于库开发或复杂状态管理：
```typescript
import { $effect } from 'svelte';

function createTimer() {
  let time = $state(0);

  // 在根作用域中运行，不受组件生命周期影响
  $effect.root(() => {
    const interval = setInterval(() => {
      time++;
    }, 1000);

    return () => clearInterval(interval);
  });

  return {
    get time() { return time; },
    reset: () => { time = 0; }
  };
}
```

##### $effect.tracking - 依赖追踪检查
检查当前是否处于effect的依赖追踪上下文中：
```typescript
function maybeTrack(value) {
  if ($effect.tracking()) {
    // 在effect中，会自动追踪依赖
    return value;
  } else {
    // 不在effect中，直接返回值
    return value;
  }
}
```

##### $effect.active - 活动状态检查
检查当前是否有活动的effect正在运行：
```typescript
function logIfInEffect(message) {
  if ($effect.active()) {
    console.log('In effect:', message);
  } else {
    console.log('Not in effect:', message);
  }
}
```

**复杂副作用示例：**

##### 异步数据处理
```typescript
let userId = $state(1);
let user = $state(null);
let loading = $state(false);

$effect(() => {
  if (!userId) return;

  loading = true;
  let cancelled = false;

  fetchUser(userId).then(data => {
    if (!cancelled) {
      user = data;
      loading = false;
    }
  });

  return () => {
    cancelled = true;
  };
});
```

##### DOM事件监听
```typescript
let element = $state(null);
let position = $state({ x: 0, y: 0 });

$effect(() => {
  if (!element) return;

  const handleMouseMove = (e) => {
    position = { x: e.clientX, y: e.clientY };
  };

  element.addEventListener('mousemove', handleMouseMove);

  return () => {
    element.removeEventListener('mousemove', handleMouseMove);
  };
});
```

##### 多个依赖的处理
```typescript
let width = $state(100);
let height = $state(100);
let area = $derived(width * height);

$effect(() => {
  console.log('Dimensions changed:', { width, height, area });

  // 更新标题
  document.title = `Area: ${area}px²`;

  return () => {
    document.title = 'Svelte App';
  };
});
```

#### 1.4 $props - 统一的props声明
```typescript
// Svelte 4 旧写法
export let name: string;
export let age: number = 25;

// Svelte 5 新写法
let { name, age = 25 }: { name: string, age?: number } = $props();
```

**高级用法：**
```typescript
// 带默认值的props
let {
  title = 'Default Title',
  count = 0
}: { title?: string, count?: number } = $props();

// 事件props
let { onSave }: { onSave?: (data: any) => void } = $props();
```

### 2. 原生TypeScript支持

Svelte 5内置了完整的TypeScript支持，无需额外配置。

#### 2.1 组件中的TypeScript
```typescript
<script lang="ts">
  interface User {
    id: number;
    name: string;
    email: string;
  }

  let user = $state<User | null>(null);
  let users = $state<User[]>([]);
</script>
```

#### 2.2 模板中的TypeScript表达式
```svelte
{#if user?.email}
  <p>Welcome, {user.name.toUpperCase()}</p>
{/if}
```

#### 2.3 事件处理类型安全
```typescript
function handleClick(event: MouseEvent) {
  console.log(event.target);
}

function handleInput(event: Event & { currentTarget: HTMLInputElement }) {
  const value = event.currentTarget.value;
}
```

### 3. 性能优化

#### 3.1 细粒度响应式
- 仅更新必要部分，避免大规模重渲染
- 列表渲染性能提升显著
- 内存使用优化

#### 3.2 包大小优化
- 编译时优化更激进
- 移除未使用的代码
- Tree-shaking增强

### 1.5 内置响应式类

Svelte 5提供了多个内置的响应式类，可以直接替代原生JavaScript对象，提供更好的响应式体验。

#### SvelteMap - 响应式Map
```typescript
import { SvelteMap } from 'svelte/reactivity';

let users = new SvelteMap<number, User>();

// 添加用户
users.set(1, { id: 1, name: '张三', age: 25 });
users.set(2, { id: 2, name: '李四', age: 30 });

// 在模板中使用
{#each Array.from(users.values()) as user}
  <div>{user.name} - {user.age}岁</div>
{/each}

// 响应式更新
function addUser(user: User) {
  users.set(user.id, user);
}
```

#### SvelteSet - 响应式Set
```typescript
import { SvelteSet } from 'svelte/reactivity';

let selectedTags = new SvelteSet<string>();

// 添加标签
selectedTags.add('JavaScript');
selectedTags.add('Svelte');

// 切换标签
function toggleTag(tag: string) {
  if (selectedTags.has(tag)) {
    selectedTags.delete(tag);
  } else {
    selectedTags.add(tag);
  }
}

// 模板中使用
{#each ['JavaScript', 'TypeScript', 'Svelte'] as tag}
  <button
    class:selected={selectedTags.has(tag)}
    onclick={() => toggleTag(tag)}
  >
    {tag}
  </button>
{/each}
```

#### SvelteDate - 响应式日期
```typescript
import { SvelteDate } from 'svelte/reactivity';

let currentTime = new SvelteDate();
let alarmTime = new SvelteDate(Date.now() + 3600000); // 1小时后

// 自动更新时间
$effect(() => {
  const interval = setInterval(() => {
    currentTime.setTime(Date.now());
  }, 1000);

  return () => clearInterval(interval);
});

// 格式化显示
const formatter = new Intl.DateTimeFormat('zh-CN', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
});
```

#### SvelteURL - 响应式URL
```typescript
import { SvelteURL } from 'svelte/reactivity';

let url = new SvelteURL('https://example.com/search?q=svelte');

// 响应式URL参数
let searchQuery = $derived(url.searchParams.get('q') || '');

function updateSearch(query: string) {
  url.searchParams.set('q', query);
  // URL会自动更新，浏览器地址栏也会相应变化
}
```

#### MediaQuery - 响应式媒体查询
```typescript
import { MediaQuery } from 'svelte/reactivity';

let isMobile = new MediaQuery('(max-width: 768px)');
let isDarkMode = new MediaQuery('(prefers-color-scheme: dark)');

// 响应式布局
$: layout = isMobile.current ? 'mobile' : 'desktop';
```

### 4. 跨文件响应式逻辑

#### 4.1 .svelte.js/.ts文件
```typescript
// stores/user.svelte.ts
import { browser } from '$app/environment';

export class UserStore {
  #user = $state<User | null>(null);

  get user() {
    return this.#user;
  }

  setUser(newUser: User) {
    this.#user = newUser;
    if (browser) {
      localStorage.setItem('user', JSON.stringify(newUser));
    }
  }

  logout() {
    this.#user = null;
    if (browser) {
      localStorage.removeItem('user');
    }
  }
}

export const userStore = new UserStore();
```

#### 4.2 使用示例
```typescript
// 在组件中使用
import { userStore } from '$stores/user.svelte';

let user = $derived(userStore.user);

function handleLogout() {
  userStore.logout();
}
```

## 🛠️ 迁移指南

### 从Svelte 4迁移到Svelte 5

#### 1. 使用迁移工具
```bash
npx svelte-migrate@latest svelte-5
```

#### 2. 手动迁移要点

| Svelte 4                  | Svelte 5                             |
| ------------------------- | ------------------------------------ |
| `let count = 0;`          | `let count = $state(0);`             |
| `$: doubled = count * 2;` | `let doubled = $derived(count * 2);` |
| `$: console.log(count);`  | `$effect(() => console.log(count));` |
| `export let name;`        | `let { name } = $props();`           |
| `createEventDispatcher`   | 使用回调函数props                    |

#### 3. 常见陷阱

**⚠️ 注意事项：**
- 避免在$derived中进行状态修改
- $effect中必须处理清理函数
- props默认不再支持双向绑定
- 事件处理需要显式传递

## 🎯 事件处理与组件通信

### 事件处理系统

#### 1. DOM 事件处理（Svelte 5 新语法）
在 Svelte 5 中，事件处理语法发生了重大变化：

```svelte
<!-- ❌ Svelte 4 旧语法 -->
<button on:click={handleClick}>点击</button>
<input on:input={handleInput} />

<!-- ✅ Svelte 5 新语法 -->
<button onclick={handleClick}>点击</button>
<input oninput={handleInput} />
```

#### 2. 事件修饰符
Svelte 5 中事件修饰符的使用方式：

```svelte
<script>
  function handleClick(event) {
    event.preventDefault();
    console.log('点击了！');
  }

  function handleKeydown(event) {
    if (event.key === 'Enter') {
      console.log('按下了回车键');
    }
  }
</script>

<!-- 阻止默认行为 -->
<form onsubmit={handleSubmit}>...</form>

<!-- 事件传参 -->
<button onclick={() => handleClick(id)}>删除</button>

<!-- 键盘事件 -->
<input onkeydown={handleKeydown} placeholder="按回车键" />
```

#### 3. 事件委托与传播
```svelte
<script>
  function handleParentClick() {
    console.log('父元素点击');
  }

  function handleChildClick(event) {
    event.stopPropagation(); // 阻止事件冒泡
    console.log('子元素点击');
  }
</script>

<div onclick={handleParentClick}>
  <button onclick={handleChildClick}>子按钮</button>
</div>
```

### 组件通信模式

#### 1. 父传子：Props
```typescript
// Child.svelte
interface ChildProps {
  name: string;
  age?: number;
  onUpdate?: (data: any) => void;
}

let { name, age = 18, onUpdate }: ChildProps = $props();

function handleClick() {
  onUpdate?.({ name, age });
}
```

```svelte
<!-- Parent.svelte -->
<Child
  name="张三"
  age={25}
  onupdate={(data) => console.log('收到更新:', data)}
/>
```

#### 2. 子传父：回调函数
```typescript
// Button.svelte
interface ButtonProps {
  variant?: 'primary' | 'secondary';
  onclick?: (event: MouseEvent) => void;
  children: Snippet;
}

let { variant = 'primary', onclick, children }: ButtonProps = $props();
```

#### 3. 双向绑定：$bindable
```typescript
// Input.svelte
interface InputProps {
  value: string;
  placeholder?: string;
}

let { value = $bindable(), placeholder = '' }: InputProps = $props();
```

```svelte
<!-- Parent.svelte -->
<script>
  let text = $state('');
</script>

<Input bind:value={text} placeholder="请输入内容" />
<p>输入内容: {text}</p>
```

### 数据绑定详解

#### 1. 双向数据绑定
```svelte
<script>
  let text = $state('');
  let checked = $state(false);
  let selected = $state('');
  let numbers = $state([1, 2, 3]);
</script>

<!-- 文本输入 -->
<input bind:value={text} placeholder="文本输入" />

<!-- 复选框 -->
<input type="checkbox" bind:checked={checked} />

<!-- 单选框组 -->
<input type="radio" bind:group={selected} value="option1" /> 选项1
<input type="radio" bind:group={selected} value="option2" /> 选项2

<!-- 下拉选择 -->
<select bind:value={selected}>
  <option value="">请选择</option>
  {#each numbers as num}
    <option value={num}>{num}</option>
  {/each}
</select>

<!-- 多选下拉 -->
<select multiple bind:value={selectedValues}>
  {#each options as option}
    <option value={option}>{option}</option>
  {/each}
</select>
```

#### 2. 高级绑定模式
```svelte
<script>
  let files: FileList;
  let dimensions = $state({ width: 0, height: 0 });
  let videoRef: HTMLVideoElement;
</script>

<!-- 文件上传 -->
<input type="file" bind:files multiple accept="image/*" />

<!-- 尺寸绑定 -->
<div bind:clientWidth={dimensions.width} bind:clientHeight={dimensions.height}>
  宽度: {dimensions.width}, 高度: {dimensions.height}
</div>

<!-- 媒体元素 -->
<video
  bind:this={videoRef}
  bind:duration
  bind:currentTime
  bind:paused
  src="video.mp4"
></video>
```

## 🎨 动画与过渡系统

### 基础过渡效果

#### 1. 内置过渡函数
```svelte
<script>
  import { fade, fly, slide, scale, blur } from 'svelte/transition';

  let visible = $state(true);
  let items = $state(['item1', 'item2', 'item3']);
</script>

<!-- 淡入淡出 -->
{#if visible}
  <div transition:fade={{ duration: 300 }}>
    淡入淡出内容
  </div>
{/if}

<!-- 飞入效果 -->
<div transition:fly={{ y: 200, duration: 1000 }}>
  从下方飞入
</div>

<!-- 滑动效果 -->
<div transition:slide={{ duration: 500 }}>
  滑动效果
</div>
```

#### 2. 列表动画
```svelte
<script>
  import { flip } from 'svelte/animate';

  let todos = $state([
    { id: 1, text: '学习 Svelte 5' },
    { id: 2, text: '构建项目' }
  ]);

  function addTodo() {
    todos.push({ id: Date.now(), text: '新任务' });
    todos = todos;
  }

  function removeTodo(id) {
    todos = todos.filter(todo => todo.id !== id);
  }
</script>

{#each todos as todo (todo.id)}
  <li animate:flip={{ duration: 300 }}>
    {todo.text}
    <button onclick={() => removeTodo(todo.id)}>删除</button>
  </li>
{/each}
```

### 自定义过渡

#### 1. 自定义过渡函数
```typescript
// custom-transitions.ts
import type { TransitionConfig } from 'svelte/transition';

export function typewriter(
  node: HTMLElement,
  { speed = 50 }: { speed?: number } = {}
): TransitionConfig {
  const text = node.textContent || '';
  const duration = text.length * speed;

  return {
    duration,
    tick: (t) => {
      const i = Math.trunc(text.length * t);
      node.textContent = text.slice(0, i);
    }
  };
}

export function bounce(
  node: HTMLElement,
  { delay = 0, duration = 400, easing = cubicOut }:
  { delay?: number; duration?: number; easing?: (t: number) => number } = {}
): TransitionConfig {
  return {
    delay,
    duration,
    easing,
    css: (t) => {
      const eased = elasticOut(t);
      return `
        transform: scale(${eased});
        opacity: ${t};
      `;
    }
  };
}
```

#### 2. 使用自定义过渡
```svelte
<script>
  import { typewriter, bounce } from './custom-transitions';

  let showText = $state(false);
</script>

{#if showText}
  <p transition:typewriter={{ speed: 100 }}>
    打字机效果文本
  </p>
{/if}

<div transition:bounce={{ duration: 800 }}>
  弹性动画效果
</div>
```

### 动画性能优化

#### 1. 使用 CSS 动画
```svelte
<style>
  .fade-in {
    animation: fadeIn 0.3s ease-in-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .slide-in {
    animation: slideIn 0.5s ease-out;
  }

  @keyframes slideIn {
    from { transform: translateX(-100%); }
    to { transform: translateX(0); }
  }
</style>

<div class="fade-in">CSS 动画效果</div>
```

#### 2. 动画状态管理
```typescript
// animation-store.ts
class AnimationStore {
  #animations = $state(new Map());

  start(key: string, duration: number) {
    this.#animations.set(key, {
      start: Date.now(),
      duration,
      progress: 0
    });
  }

  stop(key: string) {
    this.#animations.delete(key);
  }

  get progress() {
    const now = Date.now();
    return Array.from(this.#animations.entries()).map(([key, anim]) => {
      const elapsed = now - anim.start;
      const progress = Math.min(elapsed / anim.duration, 1);
      return { key, progress };
    });
  }
}

export const animationStore = new AnimationStore();
```

## 🔄 跨组件状态共享

### 上下文系统

#### 1. 使用 Context API
```typescript
// theme-context.ts
import { getContext, setContext } from 'svelte';

interface ThemeContext {
  current: string;
  toggle: () => void;
}

const THEME_KEY = Symbol('theme');

export function setThemeContext(initial: string) {
  const current = $state(initial);

  function toggle() {
    current = current === 'light' ? 'dark' : 'light';
  }

  setContext<ThemeContext>(THEME_KEY, {
    get current() { return current; },
    toggle
  });

  return { current, toggle };
}

export function getThemeContext() {
  return getContext<ThemeContext>(THEME_KEY);
}
```

#### 2. 在组件中使用
```svelte
<!-- App.svelte -->
<script>
  import { setThemeContext } from './theme-context';

  setThemeContext('light');
</script>

<slot />

<!-- Component.svelte -->
<script>
  import { getThemeContext } from './theme-context';

  const theme = getThemeContext();
</script>

<button onclick={theme.toggle}>
  当前主题: {theme.current}
</button>
```

## 🔧 高级技巧与模式

### 响应式模式最佳实践

#### 1. 状态管理模式
```typescript
// 使用类管理复杂状态
class TodoStore {
  #todos = $state<Todo[]>([]);
  #filter = $state<'all' | 'active' | 'completed'>('all');

  // 派生状态
  filteredTodos = $derived(
    this.#filter === 'all' ? this.#todos :
    this.#filter === 'active' ? this.#todos.filter(t => !t.completed) :
    this.#todos.filter(t => t.completed)
  );

  // 计算属性
  stats = $derived({
    total: this.#todos.length,
    completed: this.#todos.filter(t => t.completed).length,
    active: this.#todos.filter(t => !t.completed).length
  });

  // 方法
  addTodo(text: string) {
    this.#todos.push({ id: Date.now(), text, completed: false });
  }

  toggleTodo(id: number) {
    const todo = this.#todos.find(t => t.id === id);
    if (todo) todo.completed = !todo.completed;
  }

  setFilter(filter: 'all' | 'active' | 'completed') {
    this.#filter = filter;
  }
}

export const todoStore = new TodoStore();
```

#### 2. 组合式逻辑复用
```typescript
// 创建可复用的响应式逻辑
function createCounter(initial = 0) {
  let count = $state(initial);
  let history = $state<number[]>([]);

  const increment = () => {
    history.push(count);
    count++;
  };

  const decrement = () => {
    history.push(count);
    count--;
  };

  const reset = () => {
    history.push(count);
    count = initial;
  };

  const undo = () => {
    if (history.length > 0) {
      count = history.pop()!;
    }
  };

  return {
    get count() { return count; },
    get history() { return history; },
    increment,
    decrement,
    reset,
    undo
  };
}

// 在组件中使用
let counter1 = createCounter(0);
let counter2 = createCounter(100);
```

#### 3. 异步状态管理
```typescript
// 异步数据获取状态机
class AsyncState<T> {
  #data = $state<T | null>(null);
  #error = $state<Error | null>(null);
  #loading = $state(false);

  get data() { return this.#data; }
  get error() { return this.#error; }
  get loading() { return this.#loading; }

  get hasData() { return this.#data !== null; }
  get hasError() { return this.#error !== null; }

  async execute(asyncFn: () => Promise<T>) {
    this.#loading = true;
    this.#error = null;

    try {
      this.#data = await asyncFn();
    } catch (error) {
      this.#error = error as Error;
    } finally {
      this.#loading = false;
    }
  }

  reset() {
    this.#data = null;
    this.#error = null;
    this.#loading = false;
  }
}

// 使用示例
let userState = new AsyncState<User>();

$effect(() => {
  userState.execute(() => fetchUser(userId));
});
```

### 性能优化技巧

#### 1. 避免不必要的重新计算
```typescript
// ❌ 低效：每次渲染都会重新计算
let expensiveValue = $derived(
  veryExpensiveComputation(largeArray)
);

// ✅ 高效：使用$derived.by进行条件计算
let expensiveValue = $derived.by(() => {
  if (!shouldCalculate) return null;
  return veryExpensiveComputation(largeArray);
});

// ✅ 使用记忆化
let memoizedValue = $derived.by(() => {
  const key = `${param1}-${param2}`;
  return memoize(key, () => expensiveOperation(param1, param2));
});
```

#### 2. 批量状态更新
```typescript
// ❌ 触发多次更新
items.push(newItem1);
items.push(newItem2);
items.push(newItem3);

// ✅ 单次更新
items = [...items, newItem1, newItem2, newItem3];

// ✅ 使用临时变量
const newItems = [...items];
newItems.push(newItem1, newItem2, newItem3);
items = newItems;
```

#### 3. 使用$state.raw优化性能
```typescript
// 对于大型静态数据使用$state.raw
let staticData = $state.raw(largeStaticDataset);

// 对于需要频繁更新的部分使用$state
let dynamicData = $state({ filter: '', sort: 'name' });
```

#### 4. 编译时优化策略
```typescript
// ✅ 利用Svelte 5的编译时优化
// 静态内容编译为纯HTML字符串
let staticContent = `<div>静态内容</div>`;

// 条件渲染优化
let showComponent = $derived.by(() => {
  // 复杂的条件逻辑在编译时优化
  return shouldShow && hasPermission && !isLoading;
});

// 使用内联计算减少运行时开销
let processedData = $derived(
  data.map(item => ({
    ...item,
    computed: item.value * 2 // 编译为内联操作
  }))
);
```

#### 5. 细粒度更新优化
```typescript
// ✅ 精准依赖追踪
class OptimizedList {
  #items = $state<Item[]>([]);
  #filter = $state('');

  // 仅依赖实际使用的属性
  visibleItems = $derived(
    this.#filter
      ? this.#items.filter(item => item.name.includes(this.#filter))
      : this.#items
  );

  // 使用索引优化更新
  updateItem(id: number, updates: Partial<Item>) {
    const index = this.#items.findIndex(item => item.id === id);
    if (index !== -1) {
      // 只更新特定索引的项目，避免整个数组重新渲染
      this.#items[index] = { ...this.#items[index], ...updates };
      this.#items = [...this.#items]; // 触发更新
    }
  }
}
```

#### 6. 内存优化技巧
```typescript
// ✅ 及时清理大型对象
let largeData = $state(new Array(10000));

$effect(() => {
  return () => {
    // 组件卸载时清理内存
    largeData = [];
  };
});

// ✅ 使用WeakMap避免内存泄漏
const cache = new WeakMap();
let processedData = $derived.by(() => {
  if (cache.has(originalData)) {
    return cache.get(originalData);
  }
  const result = expensiveProcess(originalData);
  cache.set(originalData, result);
  return result;
});
```

### 调试技巧

#### 1. 开发工具调试
```typescript
// 添加调试信息
$effect(() => {
  console.group('State Debug');
  console.log('count:', count);
  console.log('doubled:', doubled);
  console.log('users:', users);
  console.groupEnd();
});
```

#### 2. 性能监控
```typescript
// 监控effect执行时间
$effect(() => {
  const start = performance.now();

  // 你的effect逻辑
  console.log('Effect executed in:', performance.now() - start, 'ms');
});
```

#### 3. 内存泄漏检测
```typescript
// 检查未清理的effect
let cleanup: (() => void) | undefined;

$effect(() => {
  // 清理旧的effect
  cleanup?.();

  // 新的effect逻辑
  const controller = new AbortController();

  cleanup = () => {
    controller.abort();
  };
});
```

## ⚠️ 常见陷阱与解决方案

### 陷阱1: 解构丢失响应性
```typescript
// ❌ 错误：解构后失去响应性
let { name, age } = user;

// ✅ 正确：保持响应性
let name = $derived(user.name);
let age = $derived(user.age);

// ✅ 或在模板中直接使用
{user.name} {user.age}
```

### 陷阱2: 循环依赖
```typescript
// ❌ 错误：循环依赖
let a = $derived(b + 1);
let b = $derived(a + 1);

// ✅ 正确：明确依赖关系
let base = $state(0);
let a = $derived(base + 1);
let b = $derived(base + 2);
```

### 陷阱3: 异步更新时机
```typescript
// ❌ 错误：在$derived中进行异步操作
let data = $derived(async fetchData()); // 不支持

// ✅ 正确：使用$effect处理异步
let data = $state(null);
$effect(async () => {
  data = await fetchData();
});
```

### 陷阱4: 事件监听器未清理
```typescript
// ❌ 错误：未清理事件监听器
$effect(() => {
  window.addEventListener('resize', handleResize);
});

// ✅ 正确：添加清理函数
$effect(() => {
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
});
```

## 📊 最佳实践总结

### 1. 状态设计原则
- **单一数据源**：每个状态只在一个地方定义
- **最小状态**：只存储必要的状态，其余用$derived计算
- **不可变性**：优先使用不可变更新模式

### 2. 组件设计原则
- **props优先**：通过props传递数据，避免全局状态
- **组合优于继承**：使用组合式函数复用逻辑
- **明确边界**：清晰区分本地状态和全局状态

### 3. 性能优化原则
- **懒计算**：使用$derived.by延迟计算
- **批量更新**：合并多次状态更新
- **精确订阅**：只订阅需要的状态部分

### 1. 状态管理
```typescript
// 推荐：使用类封装状态
class CounterStore {
  count = $state(0);

  increment() {
    this.count++;
  }

  reset() {
    this.count = 0;
  }
}

// 避免：全局状态污染
let globalCount = $state(0); // ❌ 不推荐
```

### 2. 组件设计
```typescript
// 推荐：清晰的props接口
interface ButtonProps {
  variant?: 'primary' | 'secondary';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  onClick?: () => void;
  children: Snippet;
}

let { variant = 'primary', size = 'medium', disabled = false, onClick, children }: ButtonProps = $props();
```

### 3. 性能优化
```typescript
// 使用$derived缓存计算结果
let expensiveValue = $derived(
  heavyComputation(props.data)
);

// 避免在模板中直接计算
<!-- ❌ 不推荐 -->
<p>{heavyComputation(data)}</p>

<!-- ✅ 推荐 -->
<p>{expensiveValue}</p>
```

## 🔧 开发工具配置

### 1. VS Code设置
```json
{
  "extensions": [
    "svelte.svelte-vscode",
    "bradlc.vscode-tailwindcss"
  ],
  "settings": {
    "svelte.enable-ts-plugin": true,
    "svelte.plugin.typescript.diagnostics.enable": true
  }
}
```

### 2. 项目配置
```json
// package.json
{
  "scripts": {
    "check": "svelte-check --tsconfig ./tsconfig.json",
    "check:watch": "svelte-check --tsconfig ./tsconfig.json --watch"
  }
}
```

## 🎯 实际应用示例

### 1. 表单组件
```typescript
<!-- Form.svelte -->
<script lang="ts">
  interface FormData {
    name: string;
    email: string;
  }

  let form = $state<FormData>({ name: '', email: '' });
  let errors = $state<Partial<FormData>>({});
  let isSubmitting = $state(false);

  let isValid = $derived(
    form.name.length > 0 &&
    form.email.includes('@') &&
    Object.keys(errors).length === 0
  );

  async function handleSubmit() {
    isSubmitting = true;
    try {
      await api.submit(form);
    } finally {
      isSubmitting = false;
    }
  }
</script>

<form onsubmit={handleSubmit}>
  <input bind:value={form.name} placeholder="Name" />
  <input bind:value={form.email} type="email" placeholder="Email" />
  <button disabled={!isValid || isSubmitting}>
    {isSubmitting ? 'Submitting...' : 'Submit'}
  </button>
</form>
```

### 2. 数据获取组件
```typescript
<!-- DataFetcher.svelte -->
<script lang="ts">
  interface FetchState<T> {
    data: T | null;
    loading: boolean;
    error: string | null;
  }

  let { url }: { url: string } = $props();

  let state = $state<FetchState<any>>({
    data: null,
    loading: false,
    error: null
  });

  $effect(() => {
    let cancelled = false;

    state.loading = true;
    state.error = null;

    fetch(url)
      .then(r => r.json())
      .then(data => {
        if (!cancelled) {
          state.data = data;
          state.loading = false;
        }
      })
      .catch(error => {
        if (!cancelled) {
          state.error = error.message;
          state.loading = false;
        }
      });

    return () => {
      cancelled = true;
    };
  });
</script>
```

## 📚 学习资源

### 官方资源
- [Svelte 5 官方文档](https://svelte.dev/docs/svelte/introduction)
- [Runes 指南](https://svelte.dev/docs/svelte/$state)
- [迁移指南](https://svelte.dev/docs/svelte/v5-migration-guide)

### 社区资源
- [Svelte Discord](https://discord.gg/svelte) - #svelte-5-runes频道
- [Svelte 中文社区](https://svelte-china.com)
- [GitHub 示例项目](https://github.com/sveltejs/examples)

### 工具推荐
- [Svelte 5 Playground](https://svelte-5-preview.vercel.app)
- [SvelteKit 模板](https://github.com/sveltejs/kit)
- [VS Code 扩展](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode)

## 🚀 下一步学习路径

1. **基础掌握**：熟悉Runes系统基本用法
2. **项目实践**：将现有组件迁移到Svelte 5
3. **架构设计**：学习状态管理和组件设计最佳实践
4. **性能优化**：掌握细粒度响应式和优化技巧
5. **生态集成**：了解SvelteKit和其他工具集成

---

## 🚀 2025年高级技巧与前沿技术

### 微前端架构集成

#### 1. Module Federation集成
```typescript
// vite.config.ts - 微前端配置
import { defineConfig } from 'vite';
import { federation } from '@module-federation/vite';

export default defineConfig({
  plugins: [
    federation({
      name: 'svelte-mfe-app',
      filename: 'remoteEntry.js',
      exposes: {
        './Header': './src/components/Header.svelte',
        './Sidebar': './src/components/Sidebar.svelte',
      },
      shared: {
        svelte: { singleton: true },
        '@sveltejs/kit': { singleton: true }
      }
    })
  ]
});

// 在宿主应用中加载远程组件
import { loadRemote } from '@module-federation/runtime';

async function loadRemoteComponent() {
  const RemoteHeader = await loadRemote('mfe1/Header');
  return RemoteHeader;
}
```

#### 2. 动态组件加载
```typescript
// 微前端动态加载管理器
class MicroFrontendManager {
  #registry = new Map<string, any>();

  async loadComponent(name: string, url: string) {
    if (this.#registry.has(name)) {
      return this.#registry.get(name);
    }

    const module = await import(/* @vite-ignore */ url);
    this.#registry.set(name, module.default);
    return module.default;
  }

  preloadComponents(components: Array<{name: string, url: string}>) {
    return Promise.all(
      components.map(({name, url}) => this.loadComponent(name, url))
    );
  }
}

// 使用示例
const mfeManager = new MicroFrontendManager();

let RemoteWidget = $state(null);

$effect(async () => {
  if (shouldShowWidget) {
    RemoteWidget = await mfeManager.loadComponent(
      'analytics-widget',
      'https://cdn.example.com/widgets/analytics.js'
    );
  }
});
```

### WebAssembly集成优化

#### 1. WASM模块管理
```typescript
// WASM模块加载器
class WASMManager {
  #modules = new Map<string, WebAssembly.Module>();

  async loadWASM(url: string, imports: any = {}) {
    if (this.#modules.has(url)) {
      return this.#modules.get(url);
    }

    const response = await fetch(url);
    const bytes = await response.arrayBuffer();
    const module = await WebAssembly.instantiate(bytes, imports);

    this.#modules.set(url, module.instance);
    return module.instance;
  }

  async loadRustModule() {
    return this.loadWASM('/wasm/calculator.wasm', {
      env: {
        memory: new WebAssembly.Memory({ initial: 256 })
      }
    });
  }
}

// 高性能计算集成
let wasmCalculator = $state(null);
let calculationResult = $state(0);

$effect(async () => {
  const wasm = await new WASMManager().loadRustModule();
  wasmCalculator = wasm.exports;
});

$effect(() => {
  if (wasmCalculator && inputData) {
    // 使用WASM进行高性能计算
    calculationResult = wasmCalculator.calculate(inputData);
  }
});
```

#### 2. WASM与响应式集成
```typescript
// WASM响应式包装器
function createWASMState<T>(wasmModule: any, getter: string, setter?: string) {
  let value = $state<T>(wasmModule[getter]());

  $effect(() => {
    const interval = setInterval(() => {
      const newValue = wasmModule[getter]();
      if (newValue !== value) {
        value = newValue;
      }
    }, 16); // 60fps

    return () => clearInterval(interval);
  });

  return {
    get value() { return value; },
    setValue: setter ? (newValue: T) => {
      wasmModule[setter](newValue);
      value = newValue;
    } : undefined
  };
}

// 使用示例
let wasmCounter = createWASMState<number>(wasmModule, 'getCounter', 'setCounter');
```

### 实时数据流优化

#### 1. WebSocket高级集成
```typescript
// 响应式WebSocket管理器
class ReactiveWebSocket {
  #socket: WebSocket | null = null;
  #messages = $state<any[]>([]);
  #connected = $state(false);
  #reconnectAttempts = 0;

  constructor(private url: string) {
    this.connect();
  }

  connect() {
    this.#socket = new WebSocket(this.url);

    this.#socket.onopen = () => {
      this.#connected = true;
      this.#reconnectAttempts = 0;
    };

    this.#socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.#messages = [...this.#messages, data];
    };

    this.#socket.onclose = () => {
      this.#connected = false;
      this.scheduleReconnect();
    };
  }

  scheduleReconnect() {
    if (this.#reconnectAttempts < 5) {
      setTimeout(() => {
        this.#reconnectAttempts++;
        this.connect();
      }, Math.min(1000 * Math.pow(2, this.#reconnectAttempts), 30000));
    }
  }

  send(message: any) {
    if (this.#connected && this.#socket) {
      this.#socket.send(JSON.stringify(message));
    }
  }

  get messages() { return this.#messages; }
  get connected() { return this.#connected; }
  get latestMessage() { return this.#messages[this.#messages.length - 1]; }
}

// 使用示例
let socket = $state(new ReactiveWebSocket('wss://api.example.com/stream'));
let filteredMessages = $derived(
  socket.messages.filter(msg => msg.type === 'price')
);
```

#### 2. 实时数据优化
```typescript
// 高频数据流优化
class RealtimeDataProcessor {
  #buffer = $state<any[]>([]);
  #processed = $state<any[]>([]);
  #batchSize = 100;
  #flushInterval = 16; // 60fps

  constructor() {
    $effect(() => {
      const interval = setInterval(() => this.flush(), this.#flushInterval);
      return () => clearInterval(interval);
    });
  }

  add(data: any) {
    this.#buffer.push(data);
    if (this.#buffer.length >= this.#batchSize) {
      this.flush();
    }
  }

  private flush() {
    if (this.#buffer.length > 0) {
      const batch = this.#buffer.splice(0);
      this.#processed = [...this.#processed, ...this.processBatch(batch)];
    }
  }

  private processBatch(batch: any[]) {
    // 批量处理优化
    return batch.map(item => ({
      ...item,
      timestamp: Date.now(),
      processed: true
    }));
  }

  get processed() { return this.#processed; }
  get bufferSize() { return this.#buffer.length; }
}
```

### SSR与服务端优化

#### 1. 流式渲染优化
```typescript
// +page.server.ts - 服务端流式数据
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // 流式发送数据
      const sendData = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // 模拟实时数据
      let count = 0;
      const interval = setInterval(() => {
        sendData({ count: count++, timestamp: Date.now() });
        if (count > 100) {
          clearInterval(interval);
          controller.close();
        }
      }, 100);
    }
  });

  return {
    stream: stream.pipeThrough(new TextEncoderStream())
  };
};
```

#### 2. 边缘计算集成
```typescript
// 边缘缓存策略
class EdgeCache {
  #cache = new Map<string, { data: any; score: number; timestamp: number }>();
  #predictions = new Map<string, number>();

  async get<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const cached = this.#cache.get(key);
    const prediction = this.#predictions.get(key) || 1;

    if (cached && this.shouldUseCache(cached, prediction)) {
      return cached.data;
    }

    const data = await fetcher();
    this.updatePrediction(key, data);
    this.#cache.set(key, { data, score: prediction, timestamp: Date.now() });

    return data;
  }

  private shouldUseCache(cached: any, prediction: number): boolean {
    const age = Date.now() - cached.timestamp;
    return age < (prediction * 1000 * 60); // 基于预测的TTL
  }

  private updatePrediction(key: string, data: any) {
    // 基于使用模式更新预测
    const current = this.#predictions.get(key) || 1;
    this.#predictions.set(key, Math.max(0.1, current * 0.9));
  }
}

// 使用示例
let cache = new EdgeCache();
let apiData = $state(null);

$effect(async () => {
  apiData = await cache.get(`api-${endpoint}`, () =>
    fetch(`/api/${endpoint}`).then(r => r.json())
  );
});
```

### Web Components深度集成

#### 1. 自定义元素包装
```typescript
// Svelte组件转Web Component
import MySvelteComponent from './MyComponent.svelte';

class SvelteElement extends HTMLElement {
  #component: any;

  connectedCallback() {
    this.#component = new MySvelteComponent({
      target: this,
      props: this.getProps()
    });
  }

  disconnectedCallback() {
    this.#component?.$destroy();
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (this.#component) {
      this.#component.$set({ [name]: newValue });
    }
  }

  static get observedAttributes() {
    return ['title', 'count'];
  }

  private getProps() {
    return {
      title: this.getAttribute('title') || '',
      count: parseInt(this.getAttribute('count') || '0')
    };
  }
}

customElements.define('my-svelte-element', SvelteElement);
```

#### 2. 跨框架状态共享
```typescript
// 全局状态管理器
class CrossFrameworkState {
  #state = new Map<string, any>();
  #subscribers = new Map<string, Set<(value: any) => void>>();

  set<T>(key: string, value: T) {
    this.#state.set(key, value);
    this.notify(key, value);
  }

  get<T>(key: string): T | undefined {
    return this.#state.get(key);
  }

  subscribe(key: string, callback: (value: any) => void) {
    if (!this.#subscribers.has(key)) {
      this.#subscribers.set(key, new Set());
    }
    this.#subscribers.get(key)!.add(callback);

    return () => {
      this.#subscribers.get(key)?.delete(callback);
    };
  }

  private notify(key: string, value: any) {
    this.#subscribers.get(key)?.forEach(callback => callback(value));
  }
}

// 创建全局状态实例
export const globalState = new CrossFrameworkState();

// 在Svelte中使用
let sharedCount = $state(globalState.get('count') || 0);

$effect(() => {
  globalState.subscribe('count', (newCount) => {
    sharedCount = newCount;
  });
});
```

### AI集成与智能优化

#### 1. 智能缓存策略
```typescript
// AI驱动的缓存预测
class SmartCache {
  #cache = new Map<string, { data: any; score: number; timestamp: number }>();
  #predictions = new Map<string, number>();

  async get<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const cached = this.#cache.get(key);
    const prediction = this.#predictions.get(key) || 1;

    if (cached && this.shouldUseCache(cached, prediction)) {
      return cached.data;
    }

    const data = await fetcher();
    this.updatePrediction(key, data);
    this.#cache.set(key, { data, score: prediction, timestamp: Date.now() });

    return data;
  }

  private shouldUseCache(cached: any, prediction: number): boolean {
    const age = Date.now() - cached.timestamp;
    return age < (prediction * 1000 * 60); // 基于预测的TTL
  }

  private updatePrediction(key: string, data: any) {
    // 基于使用模式更新预测
    const current = this.#predictions.get(key) || 1;
    this.#predictions.set(key, Math.max(0.1, current * 0.9));
  }
}
```

#### 2. 预测性加载
```typescript
// 基于用户行为的预测性数据加载
class PredictiveLoader {
  #history = new Map<string, number>();
  #loading = new Set<string>();

  predictNextRoutes(currentPath: string): string[] {
    // 基于历史数据预测下一步可能访问的路由
    const patterns = this.analyzePatterns();
    return patterns[currentPath] || [];
  }

  async preloadRoutes(routes: string[]) {
    const promises = routes.map(route =>
      this.preloadRoute(route)
    );

    await Promise.allSettled(promises);
  }

  private async preloadRoute(route: string) {
    if (this.#loading.has(route)) return;

    this.#loading.add(route);
    try {
      // 预加载路由数据
      await fetch(`/api/route-data?path=${route}`);
    } finally {
      this.#loading.delete(route);
    }
  }

  private analyzePatterns(): Record<string, string[]> {
    // 分析用户行为模式
    return {
      '/dashboard': ['/analytics', '/settings'],
      '/products': ['/product-detail', '/cart']
    };
  }
}

### 高级TypeScript技巧

#### 1. 类型安全的响应式状态
```typescript
// 类型安全的响应式状态工厂
function createTypedState<T>() {
  return {
    create: (initial: T) => $state(initial),
    derived: <U>(state: T, fn: (state: T) => U) => $derived(fn(state))
  };
}

// 使用示例
interface User {
  id: number;
  name: string;
  email: string;
}

const userState = createTypedState<User>();
let user = userState.create({ id: 1, name: '', email: '' });
let displayName = userState.derived(user, u => u.name || 'Anonymous');
```

#### 2. 泛型组件模式
```typescript
// 泛型组件支持
interface DataTableProps<T> {
  data: T[];
  columns: Array<{
    key: keyof T;
    title: string;
    render?: (value: T[keyof T], item: T) => any;
  }>;
  onRowClick?: (item: T) => void;
}

let { data, columns, onRowClick } = $props<DataTableProps<any>>();
```

## 🎯 2025年实战项目模板

### 1. 高性能实时仪表板
```typescript
// 完整的实时仪表板架构
class DashboardManager {
  #widgets = $state<Map<string, any>>(new Map());
  #layout = $state({ cols: 12, rows: 8 });

  addWidget(id: string, widget: any) {
    this.#widgets.set(id, widget);
  }

  removeWidget(id: string) {
    this.#widgets.delete(id);
  }

  get widgets() { return Array.from(this.#widgets.values()); }
}

// 微前端集成示例
export const dashboard = new DashboardManager();
```

### 2. AI驱动的内容推荐系统
```typescript
// 智能推荐引擎
class RecommendationEngine {
  #userProfile = $state({ preferences: [], history: [] });
  #recommendations = $state<any[]>([]);

  async generateRecommendations() {
    // 使用AI模型生成推荐
    const recommendations = await this.callAIModel(this.#userProfile);
    this.#recommendations = recommendations;
  }

  trackInteraction(item: any, action: string) {
    this.#userProfile.history.push({ item, action, timestamp: Date.now() });
    this.generateRecommendations();
  }
}
```

## 📚 学习资源与工具链

### 2025年必备工具
- **Svelte Inspector**: 实时组件检查
- **Svelte DevTools Plus**: 增强版调试工具
- **Svelte Performance**: 性能分析专用工具
- **Svelte AI**: AI辅助开发插件

### 性能监控工具
```typescript
// 生产环境性能监控
class ProductionMonitor {
  static init() {
    if (typeof window !== 'undefined') {
      // 监控核心指标
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 100) {
            console.warn('Slow effect detected:', entry);
          }
        }
      }).observe({ entryTypes: ['measure'] });
    }
  }
}
```

## 🔮 2026年展望

### 即将推出的特性
- **原生WASM支持**: 直接集成WebAssembly模块
- **边缘AI推理**: 在边缘运行AI模型
- **量子计算集成**: 实验性量子计算API
- **增强现实支持**: AR/VR原生集成

### 生态系统趋势
- **零配置部署**: 一键部署到任何平台
- **智能优化**: AI驱动的自动性能优化
- **跨平台统一**: 一套代码多端运行

---

## 🎉 总结

这份2025年Svelte 5全面指南涵盖了从基础到高级的所有核心概念：

- ✅ **Runes系统**: $state, $derived, $effect的完整用法
- ✅ **响应式模式**: 状态管理最佳实践
- ✅ **性能优化**: 编译时优化和运行时调优
- ✅ **高级架构**: 微前端、WebAssembly、实时数据流
- ✅ **前沿技术**: AI集成、边缘计算、Web Components
- ✅ **实战案例**: 完整的项目模板和架构模式

Svelte 5代表了前端开发的未来方向：编译时优化、零运行时开销、极致的开发体验。掌握这些高级技巧，你将能够构建出性能卓越、架构优雅的现代Web应用。

**下一步学习建议**：
1. 动手实践每个代码示例
2. 构建一个完整的微前端应用
3. 集成WebAssembly提升计算性能
4. 实现AI驱动的智能功能
5. 部署到边缘计算平台

保持学习，拥抱变化，2025年的前端世界充满无限可能！

---

*最后更新：2025年7月*
*基于Svelte 5.0.x 最新版本整理*