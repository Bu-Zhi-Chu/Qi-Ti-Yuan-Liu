<!--
 * 根组件 App.svelte
 * 
 * 功能描述：
 * 应用的主入口组件，负责路由管理和全局布局
 * 
 * 使用方法：
 * 1. 在main.ts中作为根组件挂载
 * 2. 配置全局路由和导航
 * 3. 处理全局状态管理
-->

<script lang="ts">
    import { Router } from '@mateothegreat/svelte5-router'
    import { routes, globalHooks } from './router/routes'
</script>

<main>
    <!-- 路由组件 -->
    <Router 
        {routes}
        {globalHooks}
    />
</main>

<style>
    :global(body) {
        margin: 0;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
            'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
            sans-serif;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        background-color: #f5f5f5;
    }

    :global(*, *::before, *::after) {
        box-sizing: border-box;
    }

    main {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
    }
</style>

