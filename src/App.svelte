<script>
    import ResponsiveBox from './components/common/ResponsiveBox.svelte'
</script>

<!--
  使用ResponsiveBox组件的示例
  在style属性中直接写CSS字符串，组件内部自动处理px值转换
-->

<!-- 新用法：在style属性中写CSS字符串 -->
<ResponsiveBox style="width: 100px; height: 100px; font-size: 32px; top: 200px; left: 200px; position: absolute; background-color: blue;">111111</ResponsiveBox>
