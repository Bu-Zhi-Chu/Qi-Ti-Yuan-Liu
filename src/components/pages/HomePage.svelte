<script lang="ts">
    import { goto } from '@mateothegreat/svelte5-router'
</script>

/** * 首页组件 * * 功能描述： * 应用的主页面，展示欢迎信息和功能导航 * 提供快速访问各个功能模块的入口 * * 使用方法： * 1. 通过根路径'/'访问 * 2. 点击导航链接跳转到其他页面 * 3. 展示应用的主要功能和特色 */

<div class="home-container">
    <header class="hero-section">
        <h1>欢迎来到七巧板应用</h1>
        <p class="subtitle">探索创意与技术的完美结合</p>
    </header>

    <nav class="feature-grid">
        <button class="feature-card" onclick={() => goto('/about')} type="button">
            <div class="card-icon">ℹ️</div>
            <h3>关于我们</h3>
            <p>了解应用的背景和特色功能</p>
        </button>

        <button class="feature-card" onclick={() => goto('/settings')} type="button">
            <div class="card-icon">⚙️</div>
            <h3>系统设置</h3>
            <p>个性化配置您的应用体验</p>
        </button>

        <div class="feature-card">
            <div class="card-icon">🚀</div>
            <h3>快速开始</h3>
            <p>立即开始您的创作之旅</p>
        </div>

        <div class="feature-card">
            <div class="card-icon">📚</div>
            <h3>使用指南</h3>
            <p>详细的使用教程和技巧</p>
        </div>
    </nav>

    <footer class="home-footer">
        <p>© 2024 七巧板应用 - 让创意无限可能</p>
    </footer>
</div>

<style>
    .home-container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 2rem;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
    }

    .hero-section {
        text-align: center;
        margin-bottom: 3rem;
        padding: 3rem 0;
    }

    .hero-section h1 {
        font-size: 3rem;
        color: #2c3e50;
        margin-bottom: 1rem;
        font-weight: 700;
    }

    .subtitle {
        font-size: 1.2rem;
        color: #7f8c8d;
        margin-bottom: 2rem;
    }

    .feature-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 2rem;
        margin-bottom: 3rem;
    }

    .feature-card {
        background: white;
        border: none;
        border-radius: 12px;
        padding: 2rem;
        text-align: center;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        transition: all 0.3s ease;
        cursor: pointer;
        width: 100%;
        font-family: inherit;
        font-size: inherit;
    }

    .feature-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    }

    .card-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
    }

    .feature-card h3 {
        color: #2c3e50;
        margin-bottom: 0.5rem;
        font-size: 1.3rem;
    }

    .feature-card p {
        color: #7f8c8d;
        font-size: 0.9rem;
        line-height: 1.5;
    }

    .home-footer {
        text-align: center;
        margin-top: auto;
        padding-top: 2rem;
        color: #95a5a6;
    }

    @media (max-width: 768px) {
        .hero-section h1 {
            font-size: 2.5rem;
        }

        .feature-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
        }

        .home-container {
            padding: 1rem;
        }
    }
</style>
