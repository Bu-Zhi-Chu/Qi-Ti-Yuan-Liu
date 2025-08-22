<script lang="ts">
    import { RouterView } from '@dvcol/svelte-simple-router/components'
    import { routerOptions } from './router/routes'
    import { isProdLiteMode } from './services/env/environment.service'
    import EditorPage from './components/pages/EditorPage.svelte'

    /**
     * 应用主组件
     *
     * 作为应用的入口点，负责初始化路由系统
     * 使用@mateothegreat/svelte5-router实现客户端路由
     *
     * 在生产精简模式下，直接加载编辑页面，跳过路由系统
     */

    // 路由配置已导入，Router组件会自动处理路由匹配
</script>

<!--
  应用主界面

  在生产精简模式下：直接显示编辑页面，跳过路由系统
  在标准模式下：使用Router组件渲染当前路由对应的页面
  通过statuses配置处理404页面，避免通配符路由拦截所有路径
-->

{#if isProdLiteMode()}
    <!-- 生产精简模式：直接显示编辑页面 -->
    <EditorPage />
{:else}
    <!-- 标准模式：使用路由系统 -->
    <RouterView options={routerOptions} />
{/if}
