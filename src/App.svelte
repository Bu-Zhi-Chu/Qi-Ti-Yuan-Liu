<!--
应用根组件

功能描述：
应用的主入口组件，负责路由系统的初始化和页面渲染

使用方法：
1. 该组件由main.ts挂载到DOM
2. 包含全局样式和路由配置
3. 所有页面路由在此组件内渲染
-->

<script lang="ts">
  import { Router, StatusCode } from '@mateothegreat/svelte5-router';
  import { routes, globalHooks } from './router/routes.js';
  import NotFoundPage from './components/pages/NotFoundPage.svelte';
  import './style/app.css';
</script>

<main class="app-container">
  <Router
    {routes}
    hooks={globalHooks}
    statuses={{
      [StatusCode.NotFound]: () => ({
        component: NotFoundPage,
        props: {
          message: '页面未找到'
        }
      })
    }}
  />
</main>

<style>
  .app-container {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
</style>
