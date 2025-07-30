<!--
首页组件

功能描述：
简约设计的主页面，提供清晰的导航入口

使用方法：
1. 通过根路径'/'访问
2. 点击导航链接跳转到其他页面
-->

<script lang="ts">
    import { goto } from '@mateothegreat/svelte5-router';
</script>

<main class="container">
    <section class="intro">
        <h1>七巧板</h1>
        <p class="tagline">简约 · 高效 · 优雅</p>
    </section>

    <nav class="nav-list">
        <a href="/about" onclick={() => goto('/about')} class="nav-item">
            <span class="nav-label">关于</span>
            <span class="nav-arrow">→</span>
        </a>
        <a href="/settings" onclick={() => goto('/settings')} class="nav-item">
            <span class="nav-label">设置</span>
            <span class="nav-arrow">→</span>
        </a>
    </nav>

    <footer class="footer">
        <p>2024</p>
    </footer>
</main>

<style>
    .container {
        max-width: 480px;
        margin: 0 auto;
        padding: 4rem 2rem;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        justify-content: center;
    }

    .intro {
        text-align: center;
        margin-bottom: 3rem;
    }

    h1 {
        font-size: 2.5rem;
        font-weight: 300;
        color: #111;
        margin: 0 0 0.5rem 0;
        letter-spacing: -0.02em;
    }

    .tagline {
        font-size: 1rem;
        color: #666;
        margin: 0;
        font-weight: 300;
    }

    .nav-list {
        display: flex;
        flex-direction: column;
        gap: 1px;
        margin-bottom: 3rem;
    }

    .nav-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 0;
        text-decoration: none;
        color: #111;
        border-bottom: 1px solid #eee;
        transition: all 0.2s ease;
    }

    .nav-item:hover {
        color: #0066cc;
        padding-left: 0.5rem;
    }

    .nav-label {
        font-size: 1.1rem;
        font-weight: 400;
    }

    .nav-arrow {
        color: #999;
        transition: transform 0.2s ease;
    }

    .nav-item:hover .nav-arrow {
        transform: translateX(4px);
        color: #0066cc;
    }

    .footer {
        text-align: center;
        margin-top: auto;
        padding-top: 2rem;
    }

    .footer p {
        font-size: 0.875rem;
        color: #999;
        margin: 0;
    }

    @media (max-width: 480px) {
        .container {
            padding: 2rem 1.5rem;
        }

        h1 {
            font-size: 2rem;
        }
    }
</style>
