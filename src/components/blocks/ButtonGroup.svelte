<!--
  * ButtonGroup 组件
  * 特性：可通过属性面板设置按钮数量（min 1, max 10，默认 1）
  * 渲染逻辑：监听 children 数量变化，若不足则自动补 Button 节点；若过多则裁剪。
  * 注意：Button 作为子组件由 domTree 中的子节点决定，此文件本身只负责布局和占位展示。
-->
<script lang="ts">
    import type { Snippet } from 'svelte'
    import ResponsiveBox from '../core/ResponsiveBox.svelte'

    // 定义属性类型直接内联，避免某些工具链对接口泛型处理的兼容性问题
    let {
        id,
        style = '',
        children,
        ...rest
    } = $props<{
        id?: string
        style?: string
        children?: Snippet
        [key: string]: any
    }>()
</script>

<!-- 使用 ResponsiveBox 包裹，内部水平排列子节点 -->
<ResponsiveBox {id} style={style} {...rest}>
    {#if children}
        {@render children()}
    {:else}
        <!-- 无子节点时占位提示 -->
        <div style="padding: 4px 8px; background: rgba(99, 102, 241, 0.1); border: 1px dashed rgba(99, 102, 241, 0.4); color: #94a3b8; font-size: 12px;">ButtonGroup</div>
    {/if}
</ResponsiveBox>
