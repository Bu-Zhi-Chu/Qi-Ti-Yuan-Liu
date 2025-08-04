# Svelte5 Router 路由系统学习总结

## 概述

`svelte5-router` 是一个为 Svelte 5 设计的高性能路由库，支持嵌套路由、动态路由、路由守卫等现代路由特性。本总结基于实际项目经验整理，包含最佳实践和常见问题的解决方案。

## 核心概念

### 1. 路由配置 (RouteConfig)

路由配置使用 `RouteConfig` 类型定义，支持以下模式：

#### 静态路由
```typescript
// routes.ts
import type { RouteConfig } from '@mateothegreat/svelte5-router';

export const routes: RouteConfig[] = [
  {
    path: '/',
    component: () => import('../pages/Home.svelte')
  },
  {
    path: '/about',
    component: () => import('../pages/About.svelte')
  }
];
```

#### 动态路由 (带参数)
```typescript
{
  path: '/user/:id',
  component: () => import('../pages/UserProfile.svelte')
}

// 访问方式: /user/123
// 在组件中获取参数: $params.id
```

#### 通配符路由
```typescript
{
  path: '/docs/*',
  component: () => import('../pages/Docs.svelte')
}
// 匹配 /docs、/docs/getting-started、/docs/api/reference 等
```

### 2. 路由参数获取

在组件中使用 `$params` 存储获取路由参数：

```svelte
<!-- UserProfile.svelte -->
<script lang="ts">
  import { params } from '@mateothegreat/svelte5-router';

  // $params 包含所有路由参数
  $: userId = $params.id;
</script>

<h1>用户ID: {userId}</h1>
```

### 3. 404 页面处理

`svelte5-router` 提供两种处理未匹配路由的方式：

#### 方式一：使用 statuses 配置 (推荐 ✅)
在 `App.svelte` 中配置 Router 的 statuses 属性，这是官方推荐的方式：

```svelte
<!-- App.svelte -->
<script lang="ts">
  import { Router, StatusCode } from '@mateothegreat/svelte5-router';
  import { routes } from './router/routes';
  import Page404 from './components/pages/404.svelte';
</script>

<Router
  {routes}
  statuses={{
    [StatusCode.NotFound]: () => ({
      component: Page404
    })
  }}
/>
```

**优点：**
- 不会干扰已定义的路由
- 自动处理所有未匹配的路由
- 无需维护复杂的正则表达式
- 符合官方最佳实践

#### 方式二：在路由数组末尾添加通配符 (不推荐 ❌)
```typescript
// 不推荐：会导致路由冲突，需要手动维护排除列表
{
  path: '*',  // 会拦截所有路由
  component: () => import('./pages/NotFound.svelte')
}

// 或者使用复杂的正则表达式
{
  path: /^\/(?!(home|about|settings|demo)?$).*$/,
  component: () => import('./pages/NotFound.svelte')
}
```

**缺点：**
- 通配符 `*` 会匹配所有路径，导致正常路由无法访问
- 正则表达式复杂且难以维护
- 新增路由时需要同步更新排除列表
- 容易出现路由冲突问题
```

### 4. 嵌套路由

支持多级嵌套路由配置：

```typescript
// routes.ts
export const routes: RouteConfig[] = [
  {
    path: '/admin',
    component: () => import('../pages/admin/Layout.svelte'),
    children: [
      {
        path: '', // 匹配 /admin
        component: () => import('../pages/admin/Dashboard.svelte')
      },
      {
        path: 'users', // 匹配 /admin/users
        component: () => import('../pages/admin/Users.svelte')
      },
      {
        path: 'users/:id', // 匹配 /admin/users/123
        component: () => import('../pages/admin/UserDetail.svelte')
      }
    ]
  }
];
```

### 5. 路由守卫

使用 `beforeEach` 和 `afterEach` 钩子实现路由守卫：

```typescript
// router/guards.ts
import { beforeEach, afterEach } from '@mateothegreat/svelte5-router';

beforeEach((to, from) => {
  // 身份验证检查
  if (to.path.startsWith('/admin') && !isAuthenticated()) {
    return '/login';
  }

  // 允许继续导航
  return true;
});

afterEach((to, from) => {
  // 页面访问统计
  console.log(`从 ${from.path} 导航到 ${to.path}`);
});
```

### 6. 程序化导航

使用 `push`、`replace` 和 `go` 方法：

```typescript
// 在组件或服务中使用
import { push, replace, go } from '@mateothegreat/svelte5-router';

// 导航到新页面
push('/user/123');

// 替换当前页面（不保留历史记录）
replace('/login');

// 浏览器前进/后退
go(-1); // 后退一页
go(1);  // 前进一页
```

## 最佳实践

### 1. 路由懒加载
使用动态导入实现代码分割：

```typescript
const routes: RouteConfig[] = [
  {
    path: '/dashboard',
    component: () => import('../pages/Dashboard.svelte')
  },
  {
    path: '/settings',
    component: () => import('../pages/Settings.svelte'),
    preload: true // 预加载该路由
  }
];
```

### 2. 路由元信息
为路由添加自定义元数据：

```typescript
{
  path: '/admin',
  component: () => import('../pages/admin/Layout.svelte'),
  meta: {
    requiresAuth: true,
    title: '管理后台',
    roles: ['admin', 'moderator']
  }
}

// 在守卫中访问
beforeEach((to, from) => {
  if (to.meta?.requiresAuth && !isAuthenticated()) {
    return '/login';
  }
});
```

### 3. 响应式路由状态

```typescript
// 获取当前路由信息
import { route, location } from '@mateothegreat/svelte5-router';

// $route 包含当前路由的完整信息
$: console.log('当前路由:', $route);

// $location 包含 URL 信息
$: console.log('当前路径:', $location.pathname);
```

### 4. TypeScript 类型支持

完整的路由配置类型定义：

```typescript
// types/router.d.ts
import type { RouteConfig } from '@mateothegreat/svelte5-router';

interface AppRouteMeta {
  requiresAuth?: boolean;
  title?: string;
  roles?: string[];
}

interface AppRouteConfig extends RouteConfig {
  meta?: AppRouteMeta;
}

// 使用类型安全的配置
export const routes: AppRouteConfig[] = [
  {
    path: '/',
    component: () => import('../pages/Home.svelte'),
    meta: {
      title: '首页'
    }
  }
];
```

## 常见问题解决

### 1. 404 路由配置问题

**问题**：手动配置 404 路由需要维护排除列表
**解决方案**：使用 `statuses` 配置自动处理

```typescript
// 错误做法：需要手动更新排除列表
{
  path: /^\/(?!(home|about|settings)?$).*$/,
  component: NotFound
}

// 正确做法：使用 statuses 配置
<Router {routes} statuses={{
  [StatusCode.NotFound]: () => ({ component: NotFound })
}} />
```

### 2. 路由参数更新

**问题**：路由参数变化时组件不重新渲染
**解决方案**：使用 `$effect` 监听参数变化：

```svelte
<script lang="ts">
  import { params } from '@mateothegreat/svelte5-router';

  let userData = $state(null);

  $effect(() => {
    // 参数变化时重新获取数据
    const userId = $params.id;
    if (userId) {
      loadUserData(userId);
    }
  });

  async function loadUserData(id: string) {
    userData = await fetchUser(id);
  }
</script>
```

### 3. 路由过渡动画

使用 Svelte 的过渡系统实现路由切换动画：

```svelte
<!-- App.svelte -->
<script lang="ts">
  import { Router } from '@mateothegreat/svelte5-router';
  import { fade } from 'svelte/transition';
  import { routes } from './router/routes';
</script>

<Router {routes} let:Component>
  <div in:fade={{ duration: 200 }} out:fade={{ duration: 200 }}>
    <Component />
  </div>
</Router>
```

## 完整示例

### 项目结构
```
src/
├── router/
│   ├── routes.ts
│   └── guards.ts
├── pages/
│   ├── Home.svelte
│   ├── About.svelte
│   ├── UserProfile.svelte
│   └── NotFound.svelte
├── App.svelte
└── main.ts
```

### 完整路由配置
```typescript
// src/router/routes.ts
import type { RouteConfig } from '@mateothegreat/svelte5-router';

export const routes: RouteConfig[] = [
  {
    path: '/',
    component: () => import('../pages/Home.svelte'),
    meta: { title: '首页' }
  },
  {
    path: '/about',
    component: () => import('../pages/About.svelte'),
    meta: { title: '关于我们' }
  },
  {
    path: '/user/:id',
    component: () => import('../pages/UserProfile.svelte'),
    meta: { title: '用户资料' }
  },
  {
    path: '/admin',
    component: () => import('../pages/admin/Layout.svelte'),
    meta: { requiresAuth: true, title: '管理后台' },
    children: [
      {
        path: '',
        component: () => import('../pages/admin/Dashboard.svelte')
      },
      {
        path: 'users',
        component: () => import('../pages/admin/Users.svelte')
      }
    ]
  }
];
```

### 主应用配置
```svelte
<!-- src/App.svelte -->
<script lang="ts">
  import { Router } from '@mateothegreat/svelte5-router';
  import { routes } from './router/routes';
  import './router/guards';
</script>

<Router
  {routes}
  statuses={{
    404: () => ({ component: () => import('./pages/NotFound.svelte') })
  }}
/>
```

## 总结

`svelte5-router` 提供了强大而灵活的路由系统，通过合理使用动态导入、路由守卫、嵌套路由等特性，可以构建出高性能、可维护的单页应用。关键要点：

1. **使用 statuses 配置处理 404** - 避免手动维护排除列表
2. **充分利用 TypeScript 类型系统** - 提升开发体验和代码质量
3. **实现路由懒加载** - 优化应用加载性能
4. **合理使用路由守卫** - 实现权限控制和业务逻辑
5. **善用响应式特性** - 与 Svelte 5 的响应式系统完美结合

通过以上实践，可以构建出既符合现代 Web 开发标准又具有良好用户体验的 Svelte 5 应用。