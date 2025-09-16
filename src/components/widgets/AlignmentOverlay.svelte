<!--
  AlignmentOverlay.svelte
  --------------------------------------------------------------
  绘制模式对齐辅助线可视化组件

  作用：在绘制矩形过程中，当指针靠近选中节点的直接子元素边缘时，
        根据 draw-align.store.svelte.ts 中的 guidelinesState 渲染水平 / 垂直辅助线。

  使用方式：<AlignmentOverlay editing={true}/>
    - editing: 控制是否当前处于编辑模式（同 DrawModeOverlay 统一接口）

  Note: 本组件仅负责渲染，具体检测逻辑由 draw-mode.action.ts 内完成，
        借助 setGuidelines(lines) 更新 store。
-->

<script lang="ts">
    import { guidelines, isAlignOpen } from '../../stores/draw-align.store.svelte'
import { selectedId } from '../../stores/dom-tree.store.svelte'

    // 是否处于编辑模式，默认为 false（与 DrawModeOverlay 统一 prop）
    const { editing = false } = $props<{ editing?: boolean }>()

    // Runes 读取状态
    const alignOpen = $derived.by(() => isAlignOpen())
    const lines = $derived.by(() => guidelines())

    /**
     * 根据当前 selectedId 查询对应的真实 DOM 元素
     * 当选中节点发生变化时，自动更新 targetEl
     */
    const targetEl = $derived.by(() => {
        const id = selectedId()
        if (!id) return null
        return document.querySelector(`[id="${id}"]`) as HTMLElement | null
    })

    /** portal action：将节点挂载到指定目标元素内部 */
    function portal(node: HTMLElement, target: HTMLElement | null) {
        if (!target) return {}
        target.appendChild(node)
        let current: HTMLElement | null = target
        return {
            update(newTarget: HTMLElement | null) {
                if (newTarget !== current) {
                    if (current && node.parentNode === current) {
                        current.removeChild(node)
                    }
                    newTarget?.appendChild(node)
                    current = newTarget
                }
            },
            destroy() {
                if (current && node.parentNode === current) {
                    current.removeChild(node)
                }
            }
        }
    }
</script>

<!-- 渲染辅助线 -->
{#if editing && alignOpen && targetEl && lines.length > 0}
    <div data-align-ignore use:portal={targetEl} class="guidelines-layer">
        {#each lines as line (line)}
            {#if line.type === 'vertical'}
                <div class="guideline vertical" style="left: {line.position}px;"></div>
            {:else if line.type === 'horizontal'}
                <div class="guideline horizontal" style="top: {line.position}px;"></div>
            {/if}
        {/each}
    </div>
{/if}

<style>
    .guidelines-layer {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
    }
    .guideline {
        position: absolute;
        background: rgba(99, 102, 241, 0.9); /* indigo-500 */
        box-shadow: 0 0 0 calc(1px * var(--scale-ratio, 1)) rgba(99, 102, 241, 0.4); /* 自适应粗细 */
    }
    .guideline.vertical {
        width: calc(1px * var(--scale-ratio, 1)); /* 自适应缩放 */
        height: 100%;
    }
    .guideline.horizontal {
        height: calc(1px * var(--scale-ratio, 1)); /* 自适应缩放 */
        width: 100%;
    }
</style>
