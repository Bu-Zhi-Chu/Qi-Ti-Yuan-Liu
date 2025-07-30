<!--
404错误页面组件

功能描述：
当用户访问不存在的路由时显示的友好错误页面
提供返回首页和上一页的导航选项

使用方法：
1. 当访问不存在的路由时自动显示
2. 提供返回首页或上一页的按钮
3. 显示友好的错误信息和指导
-->

<script lang="ts">
  import { goto } from '@mateothegreat/svelte5-router';

  // 返回首页
  function goHome() {
    goto('/');
  }

  // 返回上一页
  function goBack() {
    history.back();
  }
</script>

<div class="error-container">
  <div class="error-content">
    <div class="error-icon">🤔</div>
    <h1>页面未找到</h1>
    <p class="error-message">
      抱歉，您访问的页面不存在或已被移除。
    </p>
    <p class="error-details">
      请检查网址是否正确，或尝试以下操作：
    </p>
    
    <div class="action-buttons">
      <button class="btn primary" onclick={goHome}>
        🏠 返回首页
      </button>
      <button class="btn secondary" onclick={goBack}>
        ← 返回上一页
      </button>
    </div>
  </div>
</div>

<style>
  .error-container {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 2rem;
  }

  .error-content {
    text-align: center;
    background: white;
    padding: 3rem;
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    max-width: 500px;
    width: 100%;
  }

  .error-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
  }

  h1 {
    color: #333;
    margin-bottom: 1rem;
    font-size: 2rem;
  }

  .error-message {
    color: #666;
    font-size: 1.1rem;
    margin-bottom: 0.5rem;
    line-height: 1.5;
  }

  .error-details {
    color: #888;
    margin-bottom: 2rem;
    font-size: 0.95rem;
  }

  .action-buttons {
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
  }

  .btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s ease;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  .btn.primary {
    background: #007bff;
    color: white;
  }

  .btn.primary:hover {
    background: #0056b3;
    transform: translateY(-1px);
  }

  .btn.secondary {
    background: #6c757d;
    color: white;
  }

  .btn.secondary:hover {
    background: #545b62;
    transform: translateY(-1px);
  }

  @media (max-width: 480px) {
    .error-content {
      padding: 2rem;
      margin: 1rem;
    }

    .action-buttons {
      flex-direction: column;
    }

    .btn {
      width: 100%;
      justify-content: center;
    }
  }
</style>