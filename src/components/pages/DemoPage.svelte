<!--
 * ResponsiveBox演示组件 + DynamicComponent演示 + ButtonGroup演示
 *
 * 功能描述：
 * 展示ResponsiveBox、SimpleBox核心组件、DynamicComponent动态组件容器以及ActionButton动作按钮组件的使用
 *
 * 使用示例：
 * 通过路由 /demo 访问此演示页面
 *
 * 演示内容：
 * 1. 基础ResponsiveBox容器演示
 * 2. RealTimeClock组件的不同显示模式
 * 3. CustomTextInput组件演示
 * 4. DynamicComponent动态组件切换功能（使用key属性保持实例）
 * 5. SimpleBox轻量级容器演示
 * 6. ActionButton动作按钮组件（支持单个按钮和按钮组模式）
 * 7. 完全使用项目组件构建，无原生HTML元素
-->

<script lang="ts">
    import ResponsiveBox from '../Core/ResponsiveBox.svelte'
    import SimpleBox from '../Core/SimpleBox.svelte'
    import RealTimeClock from '../widgets/RealTimeClock.svelte'
    import CustomTextInput from '../widgets/CustomTextInput.svelte'
    import ActionButton from '../widgets/ActionButton.svelte'
    import DynamicComponent from '../Core/DynamicComponent.svelte'

    // 控制组件切换的状态 - 使用字符串类型来切换DynamicComponent
    let currentComponentType = $state<'RealTimeClock' | 'CustomTextInput'>('RealTimeClock')
    let inputValue = $state('演示输入框')

    // 切换组件的函数
    function toggleComponent() {
        currentComponentType = currentComponentType === 'RealTimeClock' ? 'CustomTextInput' : 'RealTimeClock'
    }

    // 处理输入框变化
    function handleInputChange(event: CustomEvent<string>) {
        inputValue = event.detail
    }

    // 为DynamicComponent准备的稳定ID（模拟从数据库获取）
    const stableComponentId = 'demo-dynamic-comp-001'

    // ButtonGroup演示用的按钮配置
    const demoButtons = [
        { name: '主要操作', style: 'width: 30%;height: 10%;background: #1890ff; color: white;', message: '这是主要操作按钮，点击执行核心功能' },
        { name: '次要操作', style: 'width: 30%;height: 10%;background: #52c41a; color: white;', message: '这是次要操作按钮，点击执行辅助功能' },
        { name: '警告操作', style: 'width: 30%;height: 10%;background: #faad14; color: white;', message: '这是警告操作按钮，点击前请确认操作' },
        { name: '危险操作', style: 'width: 30%;height: 10%;background: #f5222d; color: white;', disabled: true, message: '这是危险操作按钮，当前已禁用' }
    ]

    // 处理按钮组点击事件
    function handleButtonGroupClick(event: { name: string; index: number; button: any }) {
        const button = demoButtons[event.index]
        const message = button?.message || `按钮 ${event.name} 被点击`
        console.log(`[按钮点击事件] 名称: ${event.name} | 索引: ${event.index} | 信息: ${message}`)
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
            <ResponsiveBox data-id="demo-toggle-btn" style="text-align: center; margin-bottom: 20px;">
                <ActionButton buttons={[{ name: `切换组件显示 (当前: ${currentComponentType})`, variant: 'primary', size: 'medium' }]} direction="row" onbuttonClick={toggleComponent} />
            </ResponsiveBox>

            <!--
              使用DynamicComponent演示稳定data-id的用法
              - type: 切换组件类型
              - data-id: 提供稳定的组件标识符（从数据库获取）
              - 使用stableComponentId确保组件标识符不变
              - props: 传递给目标组件的属性
            -->
            <DynamicComponent
                type={currentComponentType}
                data-id={stableComponentId}
                props={currentComponentType === 'RealTimeClock'
                    ? { format: 'datetime' }
                    : {
                          value: inputValue,
                          oninput: handleInputChange,
                          placeholder: '请输入内容...',
                          style: 'width: 200px;'
                      }}
            />
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

    <!-- SimpleBox演示区域 -->
    <ResponsiveBox style="margin-top: 30px; max-width: 1200px; margin: 30px auto;">
        <ResponsiveBox style="background: rgba(255,255,255,0.1); padding: 30px; border-radius: 15px; text-align: center;">
            <ResponsiveBox tag="h2" style="color: white; margin-top: 0; margin-bottom: 20px; font-size: 28px; font-weight: bold;">📦 SimpleBox</ResponsiveBox>
            <ResponsiveBox tag="p" style="color: rgba(255,255,255,0.8); margin-bottom: 25px; font-size: 16px; line-height: 1.5;">体验轻量级容器组件的简洁与高效</ResponsiveBox>

            <ResponsiveBox style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; align-items: start;">
                <!-- 左侧：基础用法 -->
                <ResponsiveBox style="text-align: left;">
                    <ResponsiveBox tag="h3" style="color: white; margin-bottom: 15px; font-size: 20px; font-weight: bold;">基础用法</ResponsiveBox>
                    <SimpleBox style="background: linear-gradient(45deg, #ff6b6b, #4ecdc4); padding: 15px; border-radius: 8px; color: white; margin-bottom: 15px;">默认宽高100%的行内容器</SimpleBox>
                    <SimpleBox style="background: #4ade80; padding: 10px; border-radius: 5px; color: white;">轻量级，无复杂逻辑</SimpleBox>
                </ResponsiveBox>

                <!-- 右侧：对比展示 -->
                <ResponsiveBox style="text-align: left;">
                    <ResponsiveBox tag="h3" style="color: white; margin-bottom: 15px; font-size: 20px; font-weight: bold;">嵌套对比</ResponsiveBox>

                    <ResponsiveBox tag="p" style="color: rgba(255,255,255,0.7); margin-bottom: 10px; font-size: 14px;">ResponsiveBox嵌套：</ResponsiveBox>
                    <ResponsiveBox style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 5px; margin-bottom: 15px;">
                        <ResponsiveBox style="background: rgba(255,255,255,0.2); padding: 8px; border-radius: 3px; margin: 5px;">多层容器</ResponsiveBox>
                    </ResponsiveBox>

                    <ResponsiveBox tag="p" style="color: rgba(255,255,255,0.7); margin-bottom: 10px; font-size: 14px;">SimpleBox嵌套：</ResponsiveBox>
                    <SimpleBox style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 5px;">
                        <SimpleBox style="background: rgba(255,255,255,0.2); padding: 8px; border-radius: 3px; margin: 5px;">更轻量的嵌套</SimpleBox>
                    </SimpleBox>
                </ResponsiveBox>
            </ResponsiveBox>

            <ResponsiveBox style="margin-top: 20px; display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
                <SimpleBox style="background: #f59e0b; color: white; padding: 8px 16px; border-radius: 20px; font-size: 14px;">默认宽高100%</SimpleBox>
                <SimpleBox style="background: #8b5cf6; color: white; padding: 8px 16px; border-radius: 20px; font-size: 14px;">行内显示</SimpleBox>
                <SimpleBox style="background: #06b6d4; color: white; padding: 8px 16px; border-radius: 20px; font-size: 14px;">轻量级容器</SimpleBox>
            </ResponsiveBox>
        </ResponsiveBox>
    </ResponsiveBox>

    <!-- ButtonGroup演示区域 -->
    <ResponsiveBox style="margin-top: 30px; max-width: 1200px; margin: 30px auto;">
        <ResponsiveBox style="background: rgba(255,255,255,0.1); padding: 30px; border-radius: 15px; text-align: center;">
            <ResponsiveBox tag="h2" style="color: white; margin-top: 0; margin-bottom: 20px; font-size: 28px; font-weight: bold;">🔘 按钮组</ResponsiveBox>
            <ResponsiveBox tag="p" style="color: rgba(255,255,255,0.8); margin-bottom: 25px; font-size: 16px; line-height: 1.5;">体验响应式按钮组的灵活布局</ResponsiveBox>

            <ResponsiveBox style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; align-items: start;">
                <!-- 左侧：横向布局 -->
                <ResponsiveBox style="text-align: left;">
                    <ResponsiveBox tag="h3" style="color: white; margin-bottom: 15px; font-size: 20px; font-weight: bold;">横向布局</ResponsiveBox>
                    <ActionButton style="width: 100%; max-width: 400px; margin-bottom: 20px;" buttons={demoButtons} direction="row" data-id="demo-button-group-row" onbuttonClick={handleButtonGroupClick} />
                    <ResponsiveBox style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 8px;">
                        <ResponsiveBox tag="p" style="color: rgba(255,255,255,0.9); margin: 0; font-size: 14px; line-height: 1.4;">
                            <ResponsiveBox tag="strong" style="font-weight: bold;">布局特点：</ResponsiveBox>
                            <ResponsiveBox tag="br" />
                            <ResponsiveBox tag="span" style="color: #4ade80;">• 水平排列，自动填充宽度</ResponsiveBox>
                            <ResponsiveBox tag="br" />
                            <ResponsiveBox tag="span" style="color: #4ade80;">• 按钮间保持等间距</ResponsiveBox>
                        </ResponsiveBox>
                    </ResponsiveBox>
                </ResponsiveBox>

                <!-- 右侧：竖向布局 -->
                <ResponsiveBox style="text-align: left;">
                    <ResponsiveBox tag="h3" style="color: white; margin-bottom: 15px; font-size: 20px; font-weight: bold;">竖向布局</ResponsiveBox>
                    <ActionButton style="background: rgba(10,0,0,1); width: 100%; max-width: 200px; margin-bottom: 20px;" buttons={demoButtons} direction="column" data-id="demo-button-group-column" onbuttonClick={handleButtonGroupClick} />
                    <ResponsiveBox style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 8px;">
                        <ResponsiveBox tag="p" style="color: rgba(255,255,255,0.9); margin: 0; font-size: 14px; line-height: 1.4;">
                            <ResponsiveBox tag="strong" style="font-weight: bold;">布局特点：</ResponsiveBox>
                            <ResponsiveBox tag="br" />
                            <ResponsiveBox tag="span" style="color: #4ade80;">• 垂直堆叠，占满容器宽度</ResponsiveBox>
                            <ResponsiveBox tag="br" />
                            <ResponsiveBox tag="span" style="color: #4ade80;">• 适合移动端和窄屏场景</ResponsiveBox>
                        </ResponsiveBox>
                    </ResponsiveBox>
                </ResponsiveBox>
            </ResponsiveBox>

            <ResponsiveBox style="margin-top: 30px; display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
                <ResponsiveBox style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 10px; text-align: left;">
                    <ResponsiveBox tag="h4" style="color: white; margin-top: 0; margin-bottom: 10px; font-size: 16px;">组件特性</ResponsiveBox>
                    <ResponsiveBox tag="ul" style="color: rgba(255,255,255,0.8); margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.6;">
                        <ResponsiveBox tag="li" style="margin-bottom: 5px;">基于ResponsiveBox的最外层容器</ResponsiveBox>
                        <ResponsiveBox tag="li" style="margin-bottom: 5px;">内部使用SimpleBox轻量按钮</ResponsiveBox>
                        <ResponsiveBox tag="li" style="margin-bottom: 5px;">支持横向(row)和竖向(column)布局</ResponsiveBox>
                        <ResponsiveBox tag="li" style="margin-bottom: 5px;">通过JSON数组动态配置按钮</ResponsiveBox>
                        <ResponsiveBox tag="li">支持data-id属性用于低代码平台定位</ResponsiveBox>
                    </ResponsiveBox>
                </ResponsiveBox>
            </ResponsiveBox>
        </ResponsiveBox>
    </ResponsiveBox>
</ResponsiveBox>
