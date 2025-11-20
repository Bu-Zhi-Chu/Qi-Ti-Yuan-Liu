<script lang="ts">
    import { RouterView } from '@dvcol/svelte-simple-router/components'
    import { routerOptions } from './router/routes'
    import { isLiteMode } from './services/env/environment.service'
    import RouterGuard from './components/core/RouterGuard.svelte'
    let EditorPageComp: any = $state(null)

    /**
     * 应用主组件
     *
     * 作为应用的入口点，负责初始化路由系统
     * 使用@dvcol/svelte-simple-router实现客户端路由
     *
     * 在生产精简模式下，直接加载编辑页面，跳过路由系统
     */

    $effect(() => {
        if (isLiteMode() && !EditorPageComp) {
            import('./components/pages/EditorPage.svelte').then((m) => {
                EditorPageComp = m.default
            })
        }
    })
</script>

<!--
  应用主界面

  在生产精简模式下：直接显示编辑页面，跳过路由系统
  在标准模式下：使用Router组件渲染当前路由对应的页面
  通过statuses配置处理404页面，避免通配符路由拦截所有路径
-->

{#if isLiteMode()}
    {#if EditorPageComp}
        <EditorPageComp />
    {/if}
{:else}
    <RouterView options={routerOptions}>
        <!-- 在RouterView内部使用路由守卫组件 -->
        <RouterGuard />
    </RouterView>
{/if}
