<script lang="ts">
    import ResponsiveBox from './components/foundation/ResponsiveBox.svelte'
    
    // 使用Svelte 5的Runes管理状态 - 使用单个style字符串
    let style = $state("width: 100px; height: 100px; top: 200px; left: 200px; position: absolute; background-color: blue;")
    
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

<!--
  使用ResponsiveBox组件的示例
  在style属性中直接写CSS字符串，组件内部自动处理px值转换
-->

<!-- 新用法：使用单个style字符串 -->
<ResponsiveBox style={style}>111111</ResponsiveBox>
<ResponsiveBox style="width: 100px; height: 100px;  margin-top: 100px;  margin-left: 100px; background-color: blue;">111111</ResponsiveBox>

<!-- 添加一几个拖动条 能控制第一个ResponsiveBox的尺寸和位置 -->

<!-- 控制面板 -->
<div style="position: fixed; top: 10px; right: 10px; background: rgba(255,255,255,0.9); padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); z-index: 1000;">
    <h4 style="margin: 0 0 15px 0; font-size: 16px; color: #333;">控制面板</h4>
    
    <div style="margin-bottom: 10px;">
        <label style="display: block; margin-bottom: 5px; font-size: 12px; color: #666;">
            宽度: <span id="width-value">100</span>px
        </label>
        <input type="range" min="50" max="300" value="100" 
               on:input={(e) => handleInput(e, 'width')} style="width: 200px;" />
    </div>
    
    <div style="margin-bottom: 10px;">
        <label style="display: block; margin-bottom: 5px; font-size: 12px; color: #666;">
            高度: <span id="height-value">100</span>px
        </label>
        <input type="range" min="50" max="300" value="100" 
               on:input={(e) => handleInput(e, 'height')} style="width: 200px;" />
    </div>
    
    <div style="margin-bottom: 10px;">
        <label style="display: block; margin-bottom: 5px; font-size: 12px; color: #666;">
            顶部距离: <span id="top-value">200</span>px
        </label>
        <input type="range" min="0" max="500" value="200" 
               on:input={(e) => handleInput(e, 'top')} style="width: 200px;" />
    </div>
    
    <div style="margin-bottom: 0;">
        <label style="display: block; margin-bottom: 5px; font-size: 12px; color: #666;">
            左侧距离: <span id="left-value">200</span>px
        </label>
        <input type="range" min="0" max="800" value="200" 
               on:input={(e) => handleInput(e, 'left')} style="width: 200px;" />
    </div>
</div>
