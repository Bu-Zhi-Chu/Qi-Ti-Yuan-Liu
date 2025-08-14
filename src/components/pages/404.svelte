<!--
 * 404错误页面 - 使用ResponsiveBox实现的响应式错误页面
 * 功能：展示404错误信息和返回首页的导航
-->

<script lang="ts">
    import ResponsiveBox from '../core/ResponsiveBox.svelte'
</script>

<ResponsiveBox style="width: 100vw; height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 40px; box-sizing: border-box;">
    <ResponsiveBox style="font-size: 120px; font-weight: bold; color: white; margin-bottom: 20px;">404</ResponsiveBox>
    <ResponsiveBox style="font-size: 24px; color: rgba(255,255,255,0.9); margin-bottom: 40px;">页面未找到</ResponsiveBox>
    <ResponsiveBox style="padding: 15px 40px; background: white; border-radius: 30px; font-size: 16px; font-weight: bold; color: #667eea; cursor: pointer; text-decoration: none;" onclick={() => (window.location.href = '/')}>返回首页</ResponsiveBox>
</ResponsiveBox>
