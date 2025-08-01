<script lang="ts">
    import ResponsiveBox from '../Core/ResponsiveBox.svelte'
    import RealTimeClock from '../widgets/RealTimeClock.svelte'

    // 控制组件切换的状态
    let showRealTimeClock = $state(true)

    // 切换组件的函数
    function toggleComponent() {
        showRealTimeClock = !showRealTimeClock
    }
</script>

<!-- 主展示区域 -->
<!-- 可控制的ResponsiveBox -->
<ResponsiveBox style="width: 100px; height: 100px; top: 200px; left: 200px; position: absolute; background-color: blue;">动态容器</ResponsiveBox>

<RealTimeClock format="datetime" />
<RealTimeClock displayMode="multi-line" format="datetime" />

<RealTimeClock format="datetime-weekday" displayMode="single-line" />
<RealTimeClock format="datetime-weekday" displayMode="multi-line" />
