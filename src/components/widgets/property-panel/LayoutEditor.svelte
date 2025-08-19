<!--
  LayoutEditor.svelte
  布局样式编辑面板
  提供布局相关属性的可视化编辑界面

  布局样式属性说明：
  - 显示方式：display
  - 弹性布局方向：flex-direction
  - 弹性布局换行：flex-wrap
  - 主轴对齐方式：justify-content
  - 交叉轴对齐方式：align-items
  - 交叉轴多行对齐：align-content
  - 网格列数：grid-template-columns
  - 网格行数：grid-template-rows
  - 间隙：gap
  - 列间隙：column-gap
  - 行间隙：row-gap
-->
<script lang="ts">
    import { getNodeProps, updateNodeProps } from '../../../services/property-panel/property-panel.service'
    import Icon from '../Icon.svelte'

    // 外部传入当前选中节点 id
    export let selectedId: string | null = null

    // 当前节点属性快照
    let propsSnapshot: ReturnType<typeof getNodeProps> | null = null

    // 布局样式相关变量
    let currentDisplay: string = ''
    let currentFlexDirection: string = ''
    let currentFlexWrap: string = ''
    let currentJustifyContent: string = ''
    let currentAlignItems: string = ''
    let currentAlignContent: string = ''
    let currentGridTemplateColumns: string = ''
    let currentGridTemplateRows: string = ''
    let currentGap: string = ''
    let currentColumnGap: string = ''
    let currentRowGap: string = ''

    // 当选中节点变化时，同步样式
    $: if (selectedId) {
        propsSnapshot = getNodeProps(selectedId)
        if (propsSnapshot) {
            currentDisplay = propsSnapshot.styles?.display || ''
            currentFlexDirection = propsSnapshot.styles?.flexDirection || ''
            currentFlexWrap = propsSnapshot.styles?.flexWrap || ''
            currentJustifyContent = propsSnapshot.styles?.justifyContent || ''
            currentAlignItems = propsSnapshot.styles?.alignItems || ''
            currentAlignContent = propsSnapshot.styles?.alignContent || ''
            currentGridTemplateColumns = propsSnapshot.styles?.gridTemplateColumns || ''
            currentGridTemplateRows = propsSnapshot.styles?.gridTemplateRows || ''
            currentGap = propsSnapshot.styles?.gap || ''
            currentColumnGap = propsSnapshot.styles?.columnGap || ''
            currentRowGap = propsSnapshot.styles?.rowGap || ''
        }
    } else {
        // 重置所有属性
        currentDisplay = ''
        currentFlexDirection = ''
        currentFlexWrap = ''
        currentJustifyContent = ''
        currentAlignItems = ''
        currentAlignContent = ''
        currentGridTemplateColumns = ''
        currentGridTemplateRows = ''
        currentGap = ''
        currentColumnGap = ''
        currentRowGap = ''
    }

    // 更新样式
    function updateStyle(property: string, value: string) {
        if (selectedId && value !== undefined) {
            updateNodeProps(selectedId, { styles: { [property]: value } })
        }
    }
</script>

<div class="layout-editor">
    <h3 class="editor-title">布局样式</h3>
    <div class="editor-content">
        <div class="placeholder-message">
            <Icon name="Layout" size={48} />
            <p>布局样式编辑功能</p>
            <p>待实现</p>
        </div>
    </div>
</div>

<style>
    .layout-editor {
        padding: calc(16px * var(--scale-ratio, 1));
        height: 100%;
        overflow: auto;
    }

    .editor-title {
        margin: 0 0 calc(16px * var(--scale-ratio, 1)) 0;
        font-size: calc(16px * var(--scale-ratio, 1));
        font-weight: 600;
        color: #f8fafc;
    }

    .editor-content {
        display: flex;
        flex-direction: column;
        gap: calc(12px * var(--scale-ratio, 1));
    }

    .placeholder-message {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: calc(40px * var(--scale-ratio, 1));
        color: #64748b;
        text-align: center;
    }

    .placeholder-message p {
        margin: calc(8px * var(--scale-ratio, 1)) 0 0 0;
        font-size: calc(14px * var(--scale-ratio, 1));
    }
</style>