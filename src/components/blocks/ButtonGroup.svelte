<script lang="ts">
    /**
     * 占位按钮组组件
     * TODO: 后续补充实际功能与样式
     */
    import ResponsiveBox from '../core/ResponsiveBox.svelte'
    import { domTree, addNodeToParent, removeNodeById, findNodeById } from '../../services/repository/dom-tree.store.svelte'
    interface Props {
        buttonCount?: number
        style?: string
        id?: string
        [key: string]: any
    }

    let { buttonCount = 3, style = '', id = '', ...restProps }: Props = $props()

    const buttons = $derived(() => Array.from({ length: buttonCount }, (_, i) => ({ label: `按钮${i + 1}` })))

    // 同步 dom-tree 子节点数量，与 buttonCount 保持一致
    function syncChildButtons() {
        if (!id) return
        const node = findNodeById(domTree, id)
        if (!node) return
        const currentChildren = node.children || []
        const diff = buttonCount - currentChildren.length
        if (diff > 0) {
            for (let i = 0; i < diff; i++) {
                const newId = crypto.randomUUID()
                addNodeToParent(id, {
                    id: newId,
                    componentType: 'SimpleBox',
                    attributes: { textContent: `按钮${currentChildren.length + i + 1}`, type: 'Button' },
                    styles: { width: 'auto', height: 'auto' },
                    expanded: true,
                    children: []
                } as any)
            }
        } else if (diff < 0) {
            const excess = currentChildren.slice(diff)
            for (const child of excess) {
                removeNodeById(child.id)
            }
        }
    }

    $effect(() => syncChildButtons())
</script>

<ResponsiveBox {style} {id} {...restProps}>
    <div class="button-group">
        {#each buttons() as btn}
            <button class="btn">{btn.label}</button>
        {/each}
    </div>
</ResponsiveBox>

<style>
    .button-group {
        display: flex;
        gap: 8px;
    }

    .btn {
        padding: 6px 12px;
        border: 1px solid #e5e7eb;
        background: #f3f4f6;
        border-radius: 4px;
        cursor: pointer;
    }
</style>
