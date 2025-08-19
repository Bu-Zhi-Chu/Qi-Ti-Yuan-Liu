<!--
  TextEditor.svelte
  文字样式编辑面板
  提供文字相关属性的可视化编辑界面

  文字样式属性说明：
  - 字体系列：font-family
  - 字体大小：font-size
  - 字体粗细：font-weight
  - 字体样式：font-style
  - 文字颜色：color
  - 行高：line-height
  - 文字对齐：text-align
  - 文字装饰：text-decoration
  - 字母间距：letter-spacing
  - 单词间距：word-spacing
-->
<script lang="ts">
    import { getNodeProps, updateNodeProps } from '../../../services/property-panel/property-panel.service'
    import Icon from '../Icon.svelte'

    // 外部传入当前选中节点 id
    export let selectedId: string | null = null

    // 当前节点属性快照
    let propsSnapshot: ReturnType<typeof getNodeProps> | null = null

    // 文字样式相关变量
    let currentFontFamily: string = ''
    let currentFontSize: string = ''
    let currentFontWeight: string = ''
    let currentFontStyle: string = ''
    let currentColor: string = ''
    let currentLineHeight: string = ''
    let currentTextAlign: string = ''
    let currentTextDecoration: string = ''
    let currentLetterSpacing: string = ''
    let currentWordSpacing: string = ''

    // 当选中节点变化时，同步样式
    $: if (selectedId) {
        propsSnapshot = getNodeProps(selectedId)
        if (propsSnapshot) {
            currentFontFamily = propsSnapshot.styles?.fontFamily || ''
            currentFontSize = propsSnapshot.styles?.fontSize || ''
            currentFontWeight = propsSnapshot.styles?.fontWeight || ''
            currentFontStyle = propsSnapshot.styles?.fontStyle || ''
            currentColor = propsSnapshot.styles?.color || ''
            currentLineHeight = propsSnapshot.styles?.lineHeight || ''
            currentTextAlign = propsSnapshot.styles?.textAlign || ''
            currentTextDecoration = propsSnapshot.styles?.textDecoration || ''
            currentLetterSpacing = propsSnapshot.styles?.letterSpacing || ''
            currentWordSpacing = propsSnapshot.styles?.wordSpacing || ''
        }
    } else {
        // 重置所有属性
        currentFontFamily = ''
        currentFontSize = ''
        currentFontWeight = ''
        currentFontStyle = ''
        currentColor = ''
        currentLineHeight = ''
        currentTextAlign = ''
        currentTextDecoration = ''
        currentLetterSpacing = ''
        currentWordSpacing = ''
    }

    // 更新样式
    function updateStyle(property: string, value: string) {
        if (selectedId && value !== undefined) {
            updateNodeProps(selectedId, { styles: { [property]: value } })
        }
    }
</script>

<div class="text-editor">
    <h3 class="editor-title">文字样式</h3>
    <div class="editor-content">
        <div class="placeholder-message">
            <Icon name="Type" size={48} />
            <p>文字样式编辑功能</p>
            <p>待实现</p>
        </div>
    </div>
</div>

<style>
    .text-editor {
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