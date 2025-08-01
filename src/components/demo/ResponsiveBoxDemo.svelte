<script lang="ts">
    import ResponsiveBox from '../foundation/ResponsiveBox.svelte'

    /**
     * ResponsiveBox功能展示组件
     *
     * 展示ResponsiveBox组件的核心功能，包括：
     * - 响应式容器尺寸调整
     * - 动态位置控制
     * - 实时样式更新
     * - 交互式控制面板
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

<!-- 主展示区域 -->
<!-- 可控制的ResponsiveBox -->
<ResponsiveBox {style}>动态容器</ResponsiveBox>
