/**
 * 关于页面组件
 * 
 * 功能描述：
 * 展示应用的详细信息、技术栈和开发团队介绍
 * 提供项目背景和使用说明
 * 
 * 使用方法：
 * 1. 通过路由 /about 访问
 * 2. 了解应用的技术架构和特性
 * 3. 查看开发团队信息和贡献指南
 */

<script lang="ts">
  import { goto } from '@mateothegreat/svelte5-router';
</script>

<div class="about-container">
  <header class="page-header">
    <h1>关于七巧板应用</h1>
    <button class="back-btn" onclick={() => goto('/')}>← 返回首页</button>
  </header>

  <div class="about-content">
    <section class="about-section">
      <h2>🎯 项目介绍</h2>
      <p>
        七巧板应用是一个基于现代Web技术构建的创意工具，
        旨在为用户提供直观、高效的创作体验。
        我们融合了最新的前端技术栈，打造流畅的用户界面和强大的功能。
      </p>
    </section>

    <section class="about-section">
      <h2>🛠️ 技术栈</h2>
      <div class="tech-grid">
        <div class="tech-item">
          <h4>前端框架</h4>
          <p>Svelte 5 + TypeScript</p>
        </div>
        <div class="tech-item">
          <h4>构建工具</h4>
          <p>Vite + PWA</p>
        </div>
        <div class="tech-item">
          <h4>路由管理</h4>
          <p>@mateothegreat/svelte5-router</p>
        </div>
        <div class="tech-item">
          <h4>样式方案</h4>
          <p>CSS Grid + Flexbox</p>
        </div>
      </div>
    </section>

    <section class="about-section">
      <h2>✨ 核心特性</h2>
      <ul class="feature-list">
        <li>⚡ 极速响应的现代化界面</li>
        <li>📱 完整的PWA支持，支持离线使用</li>
        <li>🎨 优雅的动画和交互体验</li>
        <li>🔧 可扩展的组件化架构</li>
        <li>📊 响应式设计，适配所有设备</li>
      </ul>
    </section>

    <section class="about-section">
      <h2>👥 开发团队</h2>
      <p>
        本项目由热爱技术的开发者团队精心打造，
        我们致力于为用户提供最佳的数字创作体验。
      </p>
      <p>
        如果您有任何建议或问题，欢迎通过以下方式联系我们。
      </p>
    </section>
  </div>
</div>

<style>
  .about-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
    min-height: 100vh;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #e0e0e0;
  }

  .back-btn {
    padding: 0.5rem 1rem;
    background: #f0f0f0;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .back-btn:hover {
    background: #e0e0e0;
  }

  .about-content {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .about-section {
    background: white;
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .about-section h2 {
    color: #2c3e50;
    margin-bottom: 1rem;
    font-size: 1.5rem;
  }

  .about-section p {
    color: #555;
    line-height: 1.6;
    margin-bottom: 1rem;
  }

  .tech-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .tech-item {
    padding: 1rem;
    background: #f8f9fa;
    border-radius: 6px;
    text-align: center;
  }

  .tech-item h4 {
    color: #495057;
    margin-bottom: 0.5rem;
  }

  .tech-item p {
    color: #6c757d;
    font-size: 0.9rem;
    margin: 0;
  }

  .feature-list {
    list-style: none;
    padding: 0;
  }

  .feature-list li {
    padding: 0.5rem 0;
    color: #555;
    border-bottom: 1px solid #f0f0f0;
  }

  .feature-list li:last-child {
    border-bottom: none;
  }

  @media (max-width: 768px) {
    .about-container {
      padding: 1rem;
    }

    .page-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }

    .tech-grid {
      grid-template-columns: 1fr;
    }
  }
</style>