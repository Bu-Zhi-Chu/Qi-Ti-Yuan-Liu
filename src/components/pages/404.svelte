<!--
 * 404 错误页面
 * 
 * 功能描述：
 * 当访问不存在的路由时显示的错误页面
 * 
 * 使用方法：
 * 由Router组件自动在404状态码时加载
-->

<script lang="ts">
    import { goto } from '@mateothegreat/svelte5-router'
</script>

<div class="error-container">
    <div class="error-content">
        <h1>404</h1>
        <h2>页面未找到</h2>
        <p>抱歉，您访问的页面不存在</p>
        <button onclick={() => goto('/')}>
            返回首页
        </button>
    </div>
</div>

<style>
    .error-container {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        text-align: center;
    }

    .error-content {
        max-width: 400px;
        padding: 2rem;
    }

    h1 {
        font-size: 6rem;
        font-weight: 300;
        margin: 0 0 1rem 0;
        opacity: 0.8;
    }

    h2 {
        font-size: 1.5rem;
        font-weight: 400;
        margin: 0 0 1rem 0;
    }

    p {
        font-size: 1rem;
        margin: 0 0 2rem 0;
        opacity: 0.8;
    }

    button {
        padding: 0.75rem 2rem;
        font-size: 1rem;
        background: rgba(255, 255, 255, 0.2);
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 25px;
        cursor: pointer;
        transition: all 0.3s ease;
    }

    button:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: translateY(-2px);
    }
</style>