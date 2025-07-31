<script>
    import ResponsiveBox from './components/common/ResponsiveBox.svelte'
</script>

<!--
  使用ResponsiveBox组件的示例
  用户只需要提供原始尺寸值，组件内部自动处理缩放计算
-->

<!-- 基础用法：直接提供数值 -->
<ResponsiveBox width={100} height={100} fontSize={16} top={100} left={100} position="absolute" backgroundColor="blue">111111</ResponsiveBox>

<ResponsiveBox width={200} height={200} fontSize={32} marginLeft={200} marginTop={200} backgroundColor="red">22222</ResponsiveBox>
