<script lang="ts">
    import { Router, StatusCode } from '@mateothegreat/svelte5-router'
    import { routes, globalHooks } from './router/routes'
    import Page404 from './components/pages/404.svelte'

    /**
     * 应用主组件
     *
     * 作为应用的入口点，负责初始化路由系统
     * 使用@mateothegreat/svelte5-router实现客户端路由
     */

    // 路由配置已导入，Router组件会自动处理路由匹配
</script>

<!--
  应用主界面
  使用Router组件渲染当前路由对应的页面
  通过statuses配置处理404页面，避免通配符路由拦截所有路径
-->

<Router
    {routes}
    hooks={globalHooks}
    statuses={{
        [StatusCode.NotFound]: () => ({
            component: Page404
        })
    }}
/>
