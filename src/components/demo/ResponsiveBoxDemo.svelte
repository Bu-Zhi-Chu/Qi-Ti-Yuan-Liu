<script lang="ts">
    import ResponsiveBox from '../foundation/ResponsiveBox.svelte'
    import RealTimeClock from '../widgets/RealTimeClock.svelte'

    /**
     * ResponsiveBox功能展示组件
     *
     * 展示ResponsiveBox组件的核心功能，包括：
     * - 响应式容器尺寸调整
     * - 动态位置控制
     * - 实时样式更新
     * - 交互式控制面板
     * - 实时时钟组件展示
     */

    // 使用Svelte 5的Runes管理状态 - 使用单个style字符串
    let style = $state('width: 100px; height: 100px; top: 200px; left: 200px; position: absolute; background-color: blue;')

    // 当前属性值缓存
    let currentValues = {
        width: 100,
        height: 100,
        top: 200,
        left: 200
    }

    // 更新style字符串的函数
    function updateStyle(property: keyof typeof currentValues, value: string) {
        const numValue = parseInt(value)
        currentValues[property] = numValue

        // 更新显示的值
        const valueElement = document.getElementById(`${property}-value`)
        if (valueElement) {
            valueElement.textContent = numValue.toString()
        }

        // 重新构建style字符串
        style = `width: ${currentValues.width}px; height: ${currentValues.height}px; top: ${currentValues.top}px; left: ${currentValues.left}px; position: absolute; background-color: blue;`
    }

    // 处理输入事件的函数
    function handleInput(e: Event, property: keyof typeof currentValues) {
        const target = e.target as HTMLInputElement
        if (target) {
            updateStyle(property, target.value)
        }
    }
</script>

<style>
    .control-panel {
        position: absolute;
        top: 20px;
        right: 20px;
        background: #f5f5f5;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }

    .control-group {
        margin-bottom: 15px;
    }

    .control-group label {
        display: block;
        font-weight: bold;
        margin-bottom: 5px;
    }

    .control-group input[type="range"] {
        width: 100%;
    }

    h3 {
        margin-top: 0;
        margin-bottom: 15px;
    }

    .clock-demo {
        margin-top: 40px;
        padding: 20px;
        background: #fafafa;
        border-radius: 12px;
        border: 1px solid #e0e0e0;
    }

    .clock-demo h3 {
        color: #333;
        margin-bottom: 20px;
        text-align: center;
    }

    .clock-showcase {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        max-width: 800px;
        margin: 0 auto;
    }

    .clock-item {
        text-align: center;
    }

    .clock-item h4 {
        margin-bottom: 10px;
        color: #666;
        font-size: 1.1em;
    }

    @media (max-width: 768px) {
        .clock-showcase {
            grid-template-columns: 1fr;
        }
    }
</style>

<!-- 主展示区域 -->
<!-- 可控制的ResponsiveBox -->
<ResponsiveBox {style}>动态容器</ResponsiveBox>

<!-- 控制面板 -->
<div class="control-panel">
    <h3>控制面板</h3>
    <div class="control-group">
        <label>
            宽度: <span id="width-value">{currentValues.width}</span>px
            <input type="range" min="50" max="300" value={currentValues.width} 
                   on:input={(e) => handleInput(e, 'width')} />
        </label>
    </div>
    <div class="control-group">
        <label>
            高度: <span id="height-value">{currentValues.height}</span>px
            <input type="range" min="50" max="300" value={currentValues.height} 
                   on:input={(e) => handleInput(e, 'height')} />
        </label>
    </div>
    <div class="control-group">
        <label>
            顶部位置: <span id="top-value">{currentValues.top}</span>px
            <input type="range" min="0" max="500" value={currentValues.top} 
                   on:input={(e) => handleInput(e, 'top')} />
        </label>
    </div>
    <div class="control-group">
        <label>
            左侧位置: <span id="left-value">{currentValues.left}</span>px
            <input type="range" min="0" max="500" value={currentValues.left} 
                   on:input={(e) => handleInput(e, 'left')} />
        </label>
    </div>
</div>

<!-- 实时时钟组件展示 -->
<div class="clock-demo">
    <h3>实时时钟组件展示</h3>
    <div class="clock-showcase">
        <div class="clock-item">
            <h4>格式1: 年月日时分秒</h4>
            <RealTimeClock format="datetime" />
        </div>
        <div class="clock-item">
            <h4>格式2: 年月日星期时分秒</h4>
            <RealTimeClock format="datetime-weekday" />
        </div>
    </div>
</div>
