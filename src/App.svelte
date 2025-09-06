<script lang="ts">
    import { RouterView } from '@dvcol/svelte-simple-router/components'
    import { routerOptions } from './router/routes'
    import { isLiteMode } from './services/env/environment.service'

    // 动态加载 EditorPage 组件
    let EditorPage: typeof import('./components/pages/EditorPage.svelte').default | null = null;
    if (isLiteMode()) {
        import('./components/pages/EditorPage.svelte').then(mod => {
            EditorPage = mod.default;
        });
    }

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

{#if isLiteMode()}
    <!-- 生产精简模式：动态显示编辑页面 -->
    {#if EditorPage}
        <svelte:component this={EditorPage} />
    {/if}
{:else}
    <!-- 标准模式：使用路由系统 -->
    <RouterView options={routerOptions} />
{/if}
