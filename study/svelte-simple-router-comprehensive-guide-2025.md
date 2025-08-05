# Svelte Simple Router 综合指南（基于 v2.7.2 / 2025）

> 本文档聚焦 `@dvcol/svelte-simple-router` v2.7.2（兼容 Svelte 5），涵盖核心 API、最佳实践与常见场景示例，帮助快速上手并避免踩坑。

---

## 1. 库简介

`Svelte Simple Router` 是一款**原生 Svelte&nbsp;5** SPA 路由器，旨在提供简洁而强大的客户端导航能力。

- **依赖要求**：`svelte >= 5.0.0`
- **路由模式**：支持 History API 与 Hash 模式
- **特性概览**  <mcreference link="https://github.com/dvcol/svelte-simple-router" index="1">1</mcreference>
  - RouterView 渲染槽位、支持命名视图
  - 嵌套路由、动态路由、懒加载
  - 路由守卫、导航/加载监听器
  - 集成 Svelte Transition API 与 View Transitions API
  - Debug 组件（`RouterDebugger` / `RouteDebugger`）

## 2. 安装与版本校验

```bash
pnpm add @dvcol/svelte-simple-router@^2.7.2
```

确保 `package.json` 中依赖版本与上述一致，避免因 Svelte 版本不匹配导致运行时错误。

## 3. 最小可用示例

```svelte
<script lang="ts">
  import type { Route, RouterOptions } from '@dvcol/svelte-simple-router/models';
  import { RouterView } from '@dvcol/svelte-simple-router/components';

  import HomePage from '~/components/pages/HomePage.svelte';
  import AboutPage from '~/components/pages/AboutPage.svelte';

  const RouteName = { Home: 'home', About: 'about' } as const;
  type RouteNames = (typeof RouteName)[keyof typeof RouteName];

  const routes: Readonly<Route<RouteNames>[]> = [
    { name: RouteName.Home, path: '/', component: HomePage },
    { name: RouteName.About, path: `/${RouteName.About}`, component: AboutPage }
  ] as const;

  const options: RouterOptions<RouteNames> = { routes } as const;
</script>

<RouterView {options} />
```

- `RouterView` 负责根据当前路径渲染匹配组件
- `routes` 数组中每项包含 `name | path | component` 等字段

## 4. 路由对象字段

| 字段 | 描述 |
| ---- | ---- |
| `name` | 路由唯一名称（推荐常量枚举） |
| `path` | URL 路径；支持 `:param`、`*` 通配符 |
| `component` / `components` | 单视图或多命名视图组件 |
| `redirect` | 重定向配置 `{ name, params? }` |
| `children` | 嵌套路由数组 |
| `lazy` | 懒加载函数 `() => import('...')` |

## 5. 进阶用法

### 5.1 嵌套路由 & 命名视图

```svelte
<script lang="ts">
  import { RouterContext, RouterView } from '@dvcol/svelte-simple-router/components';
  import Parent from './Parent.svelte';
  import Child from './Child.svelte';
  const routes = [
    { name: 'parent', path: '/parent', component: Parent },
    { name: 'child',  path: '/parent/child', components: { default: Parent, nested: Child } }
  ] as const;
</script>

<RouterContext {routes}>
  <RouterView>
    <!-- default 视图在此渲染 -->
    <RouterView name="nested" />
  </RouterView>
</RouterContext>
```

### 5.2 路由守卫（导航监听）

```ts
import { onChange, onError, onLoaded } from '@dvcol/svelte-simple-router/router';

onChange((to, from) => {
  console.log('切换', from, '->', to);
});

onError((err) => console.error('路由错误', err));

onLoaded(() => console.log('首次加载完成'));
```

### 5.3 视图过渡（View Transitions API）

```ts
onChange(async () => {
  const { promise, resolve } = Promise.withResolvers<void>();
  document.startViewTransition(async () => {
    await promise; // 在新页面渲染后结束动画
  });
  return resolve; // 返回函数让路由完成后触发
});
```

### 5.4 Link/Links/Active Dom Action

```svelte
<a use:link href="/about">跳转 About</a>
```

- `link`：单个链接
- `links`：批量自动处理子元素 `<a>`
- `active`：根据当前路由自动添加 `active` class

### 5.5 程序化导航

```ts
import { navigate } from '@dvcol/svelte-simple-router/router';

navigate({ name: 'about', params: { q: 'test' } });
```

## 6. 调试工具

```svelte
<RouterView>
  <RouterDebugger />
  <RouteDebugger />
</RouterView>
```

实时显示当前路由与路由器状态，方便排查配置问题。

## 7. 性能与最佳实践

1. **懒加载**：使用 `lazy: () => import('...')` 或 Vite 动态 import 分包
2. **常量枚举**：集中维护路由名称，避免字符串硬编码
3. **细粒度组件更新**：Svelte&nbsp;5 Runes 可结合路由参数派生状态 `$derived`
4. **视图过渡**：优先使用原生 View Transitions API，性能更佳
5. **销毁监听**：在组件 `onDestroy` 或 `$effect` 清理 `onChange` 等订阅

## 8. 常见问题

| 问题 | 解决方案 |
| ---- | ---- |
| 页面白屏 / 无法渲染 | 确认 `RouterView` 是否正确包裹、`routes` 是否包含当前路径 |
| 动态路由参数无法解析 | `path` 使用 `/:id` 或 `*` 通配符；组件中通过 `$page.params` 获取 |
| 嵌套路由不渲染 | 检查命名视图是否匹配 `components` 对象中的键 |

## 9. 参考链接

- 官方仓库 & README <mcreference link="https://github.com/dvcol/svelte-simple-router" index="1">1</mcreference>

---

**最后更新：2025-08-XX**  如有遗漏或理解偏差，欢迎补充修正！