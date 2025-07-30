<!--
设置页面组件

功能描述：
提供应用设置选项的配置页面，包括主题切换、通知设置等功能

使用方法：
1. 通过路由 /settings 访问
2. 点击导航栏的设置链接进入
3. 在此页面进行应用偏好设置
-->

<script lang="ts">
  import { goto } from '@mateothegreat/svelte5-router';

  // 设置状态管理
  let darkMode = $state(false);
  let notifications = $state(true);
  let autoSave = $state(true);

  // 返回首页
  function goHome() {
    goto('/');
  }

  // 保存设置
  function saveSettings() {
    // 这里可以添加保存逻辑
    console.log('设置已保存:', { darkMode, notifications, autoSave });
    alert('设置已保存！');
  }
</script>

<div class="settings-container">
  <header class="page-header">
    <h1>应用设置</h1>
    <button class="back-btn" onclick={goHome}>← 返回</button>
  </header>

  <div class="settings-form">
    <div class="setting-group">
      <h3>显示设置</h3>
      <label class="setting-item">
        <input type="checkbox" bind:checked={darkMode} />
        <span>深色模式</span>
      </label>
    </div>

    <div class="setting-group">
      <h3>通知设置</h3>
      <label class="setting-item">
        <input type="checkbox" bind:checked={notifications} />
        <span>启用通知</span>
      </label>
    </div>

    <div class="setting-group">
      <h3>编辑设置</h3>
      <label class="setting-item">
        <input type="checkbox" bind:checked={autoSave} />
        <span>自动保存</span>
      </label>
    </div>

    <button class="save-btn" onclick={saveSettings}>保存设置</button>
  </div>
</div>

<style>
  .settings-container {
    max-width: 600px;
    margin: 0 auto;
    padding: 2rem;
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

  .settings-form {
    background: white;
    border-radius: 8px;
    padding: 1.5rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .setting-group {
    margin-bottom: 1.5rem;
  }

  .setting-group h3 {
    margin-bottom: 0.5rem;
    color: #333;
  }

  .setting-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .save-btn {
    margin-top: 1rem;
    padding: 0.75rem 1.5rem;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
  }

  .save-btn:hover {
    background: #0056b3;
  }
</style>