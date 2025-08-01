<script lang="ts">
    import { Router } from '@mateothegreat/svelte5-router'
    import { routes, globalHooks } from './router/routes'

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
-->

<Router {routes} hooks={globalHooks} />
