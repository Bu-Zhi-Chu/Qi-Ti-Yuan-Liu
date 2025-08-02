<!--
 * ResponsiveBox演示组件
 *
 * 功能描述：
 * 展示ResponsiveBox核心组件的各种使用方式和特性
 *
 * 使用示例：
 * 通过路由 /demo 访问此演示页面
 *
 * 演示内容：
 * 1. 基础ResponsiveBox容器演示
 * 2. RealTimeClock组件的不同显示模式
 * 3. CustomTextInput组件演示
 * 4. 动态组件切换功能
 * 5. 完全使用项目组件构建，无原生HTML元素
-->

<script lang="ts">
    import ResponsiveBox from '../Core/ResponsiveBox.svelte'
    import RealTimeClock from '../widgets/RealTimeClock.svelte'
    import CustomTextInput from '../widgets/CustomTextInput.svelte'
    import Button from '../widgets/Button.svelte'

    // 控制组件切换的状态
    let showRealTimeClock = $state(true)
    let inputValue = $state('演示输入框')

    // 切换组件的函数
    function toggleComponent() {
        showRealTimeClock = !showRealTimeClock
    }

    // 处理输入框变化
    function handleInputChange(event: CustomEvent<string>) {
        inputValue = event.detail
    }
</script>

<!-- 页面主容器 -->
<ResponsiveBox style="padding: 20px; min-height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
    <!-- 演示区域 -->
    <ResponsiveBox style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; max-width: 1200px; margin: 0 auto;">
        <!-- 左侧：基础ResponsiveBox演示 -->
        <ResponsiveBox style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px;">
            <ResponsiveBox tag="h2" style="color: white; margin-top: 0; font-size: 24px; font-weight: bold; margin-bottom: 15px;">基础容器</ResponsiveBox>
            <ResponsiveBox style="width: 100px; height: 100px; background: #ff6b6b; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">基础</ResponsiveBox>
        </ResponsiveBox>

        <!-- 右侧：动态组件演示 -->
        <ResponsiveBox style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px;">
            <ResponsiveBox tag="h2" style="color: white; margin-top: 0; font-size: 24px; font-weight: bold; margin-bottom: 15px;">动态组件</ResponsiveBox>

            <!-- 切换按钮 - 与动态组件在同一容器内 -->
            <ResponsiveBox style="text-align: center; margin-bottom: 20px;">
                <Button onclick={toggleComponent} variant="primary" size="medium">切换组件显示</Button>
            </ResponsiveBox>

            {#if showRealTimeClock}
                <RealTimeClock format="datetime" />
            {:else}
                <CustomTextInput value={inputValue} oninput={handleInputChange} placeholder="请输入内容..." style="width: 200px;" />
            {/if}
        </ResponsiveBox>
    </ResponsiveBox>

    <!-- 文本框独立展示区域 -->
    <ResponsiveBox style="margin-top: 30px; max-width: 1200px; margin: 30px auto;">
        <ResponsiveBox style="background: rgba(255,255,255,0.1); padding: 30px; border-radius: 15px; text-align: center;">
            <ResponsiveBox tag="h2" style="color: white; margin-top: 0; margin-bottom: 20px; font-size: 28px; font-weight: bold;">📝 文本框</ResponsiveBox>
            <ResponsiveBox tag="p" style="color: rgba(255,255,255,0.8); margin-bottom: 25px; font-size: 16px; line-height: 1.5;">体验 CustomTextInput 组件的完整功能</ResponsiveBox>

            <ResponsiveBox style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; align-items: start;">
                <!-- 左侧：输入体验区 -->
                <ResponsiveBox style="text-align: left;">
                    <ResponsiveBox tag="h3" style="color: white; margin-bottom: 15px; font-size: 20px; font-weight: bold;">输入体验</ResponsiveBox>
                    <CustomTextInput value={inputValue} oninput={handleInputChange} placeholder="在这里输入文字..." style="width: 100%; max-width: 300px; margin-bottom: 15px;" />
                    <ResponsiveBox style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 8px;">
                        <ResponsiveBox tag="p" style="color: rgba(255,255,255,0.9); margin: 0; font-size: 14px; line-height: 1.4;">
                            <ResponsiveBox tag="strong" style="font-weight: bold;">当前值：</ResponsiveBox>
                            <ResponsiveBox tag="br" />
                            <ResponsiveBox tag="span" style="color: #4ade80; font-family: monospace; font-size: 13px;">{inputValue || '(空)'}</ResponsiveBox>
                        </ResponsiveBox>
                    </ResponsiveBox>
                </ResponsiveBox>

                <!-- 右侧：功能说明 -->
                <ResponsiveBox style="text-align: left;">
                    <ResponsiveBox tag="h3" style="color: white; margin-bottom: 15px; font-size: 20px; font-weight: bold;">功能特性</ResponsiveBox>
                    <ResponsiveBox tag="ul" style="color: rgba(255,255,255,0.8); margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.6;">
                        <ResponsiveBox tag="li" style="margin-bottom: 5px;">双向数据绑定</ResponsiveBox>
                        <ResponsiveBox tag="li" style="margin-bottom: 5px;">自定义占位符文本</ResponsiveBox>
                        <ResponsiveBox tag="li" style="margin-bottom: 5px;">实时输入事件监听</ResponsiveBox>
                        <ResponsiveBox tag="li" style="margin-bottom: 5px;">响应式宽度适配</ResponsiveBox>
                        <ResponsiveBox tag="li">优雅的空值处理</ResponsiveBox>
                    </ResponsiveBox>
                </ResponsiveBox>
            </ResponsiveBox>
        </ResponsiveBox>
    </ResponsiveBox>

    <!-- 时钟展示区域 -->
    <ResponsiveBox style="margin-top: 30px; display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; max-width: 1200px; margin: 30px auto;">
        <ResponsiveBox style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px; text-align: center;">
            <ResponsiveBox tag="h3" style="color: white; margin-top: 0; font-size: 18px; font-weight: bold; margin-bottom: 15px;">单行模式</ResponsiveBox>
            <RealTimeClock format="datetime" displayMode="single-line" />
        </ResponsiveBox>

        <ResponsiveBox style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px; text-align: center;">
            <ResponsiveBox tag="h3" style="color: white; margin-top: 0; font-size: 18px; font-weight: bold; margin-bottom: 15px;">多行模式</ResponsiveBox>
            <RealTimeClock format="datetime" displayMode="multi-line" />
        </ResponsiveBox>

        <ResponsiveBox style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px; text-align: center;">
            <ResponsiveBox tag="h3" style="color: white; margin-top: 0; font-size: 18px; font-weight: bold; margin-bottom: 15px;">完整日期</ResponsiveBox>
            <RealTimeClock format="datetime-weekday" displayMode="multi-line" />
        </ResponsiveBox>
    </ResponsiveBox>
</ResponsiveBox>
