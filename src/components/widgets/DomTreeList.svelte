<!--
 * DomTreeList.svelte
 * DOM 映射列表组件（工作区左侧树形结构）
 *
 * 功能特性：
 * 1. 递归渲染 domTree 树形结构，展示层级关系。
 * 2. 点击节点即可选中，高亮同步到画布 DomCanvas（通过绑定 selectedId）。
 * 3. 使用事件委托 (on:click) + data-id 属性，避免在大量节点上注册监听器。
 * 4. 采用 {@html} 渲染字符串模板，性能好且实现简单；字符串由 renderNode 递归生成。
 * 5. 预留后续与 svelte-dnd-action 集成接口，实现树形拖拽排序。
 *
 * 使用示例：
 * <DomTreeList {domTree} bind:selectedId />
 -->

<script module lang="ts">
    /**
     * 组件对外属性类型声明
     */
    export interface Props {
        domTree: any
        selectedId?: string | null
    }

    /** DOM 节点类型 */
    import type { DomNode } from '../../types/dom-node.types'
</script>

<script lang="ts">
    /* 组件属性 - 使用 Runes $props */
    let { domTree, selectedId = null } = $props<{ domTree: import('../../types/dom-node.types').DomNode; selectedId?: string | null }>()

    /** 点击节点，更新选中 ID（事件委托） */
    function handleClick(event: MouseEvent) {
        const target = event.target as HTMLElement | null
        if (!target) return
        const id = target.getAttribute('data-id')
        if (id) {
            selectedId = id
        }
    }

    // 递归生成 HTML 字符串
    function renderNode(node: DomNode, level = 0, currentSelectedId: string | null): string {
        const padding = level * 16
        const nodeKey = node.nodeId ?? node.id
        const isSelected = nodeKey === currentSelectedId
        const labelClass = isSelected ? 'node-label selected' : 'node-label'

        // 根节点显示“画布”，其余层显示 nodeId
        const displayName = level === 0 ? '画布' : nodeKey

        const childrenHtml = node.children && node.children.length ? node.children.map((child: DomNode) => renderNode(child, level + 1, currentSelectedId)).join('') : ''

        return /*html*/ `
          <div class="tree-node" style="padding-left: calc(${padding}px * var(--scale-ratio, 1));">
                <div class="${labelClass}" data-id="${nodeKey}">${displayName}</div>
                ${childrenHtml}
          </div>
        `
    }

    const htmlString = $derived(() => (domTree ? renderNode(domTree, 0, selectedId) : ''))
</script>

<!-- 容器使用事件委托监听 -->
<!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
<div class="tree-container" onclick={handleClick} role="tree" tabindex="0">
    {@html htmlString()}
</div>

<style>
    .tree-container {
        padding: calc(8px * var(--scale-ratio, 1)) calc(4px * var(--scale-ratio, 1));
        font-size: calc(12px * var(--scale-ratio, 1));
        color: #cbd5e1;
        overflow-y: auto;
        height: 100%;
    }

    /* svelte-ignore css_unused_selector */
    :global(.node-label) {
        padding: calc(4px * var(--scale-ratio, 1)) calc(6px * var(--scale-ratio, 1));
        cursor: pointer;
        border-radius: calc(4px * var(--scale-ratio, 1));
        transition: background 0.2s ease;
        display: inline-block;
    }

    /* svelte-ignore css_unused_selector */
    :global(.node-label:hover) {
        background: rgba(255, 255, 255, 0.08);
    }

    /* svelte-ignore css_unused_selector */
    :global(.node-label.selected) {
        background: rgba(99, 102, 241, 0.35);
        color: #e0e7ff;
    }

    /* svelte-ignore css_unused_selector */
    :global(.node-id) {
        opacity: 0.7;
    }
</style>
