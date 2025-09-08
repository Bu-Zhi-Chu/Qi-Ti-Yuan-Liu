<!--
  LayoutEditor.svelte
  布局样式编辑面板
  提供布局相关属性的可视化编辑界面
-->
<script lang="ts">
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    import { getNodePropsStore, getNodeProps as _getNodeProps, updateNodeProps } from '../../../services/property-panel/property-panel.service'
    import { onMount } from 'svelte'
    import PropertyRow from './PropertyRow.svelte'
    import PropertySelect from './PropertySelect.svelte'
    import SizeInput from './SizeInput.svelte'
    import { addNodeToParent, removeNodeById } from '../../../services/repository/dom-tree.store.svelte'
    import { getFullNode } from '../../../services/property-panel/property-panel.service'

    interface Props {
        selectedId: string | null
    }

    let { selectedId }: Props = $props()

    // 当前节点 props 快照类型
    let propsSnapshot: ReturnType<typeof _getNodeProps> | null = null
    // 订阅函数
    let unsubscribe = () => {}

    // display属性状态
    let currentDisplay = $state('block')

    // flex属性状态
    let currentFlexDirection = $state('row')
    let currentJustifyContent = $state('flex-start')
    let currentAlignItems = $state('stretch')
    let currentAlignContent = $state('stretch')
    let currentFlexWrap = $state('nowrap')
    let currentGap = $state('')
    let currentRowGap = $state('')
    let currentColumnGap = $state('')

    // grid属性状态
    let currentGridTemplateColumns = $state('')
    let currentGridTemplateRows = $state('')
    let currentGridGap = $state('')
    let currentGridColumnGap = $state('')
    let currentGridRowGap = $state('')

    // 网格行列数字（方便直观编辑）
    let gridColsCount = $state<number>(1)
    let gridRowsCount = $state<number>(1)

    // 可用的display值
    const displayOptions = [
        { value: 'block', label: '块级 (block)' },
        { value: 'inline', label: '行内 (inline)' },
        { value: 'inline-block', label: '行块 (inline-block)' },
        { value: 'flex', label: '弹性 (flex)' },
        { value: 'grid', label: '网格 (grid)' }
    ]

    // 初始化display值
    // 安全获取字符串值的工具函数
    const getStringValue = (value: string | Blob | undefined): string => {
        return typeof value === 'string' ? value : ''
    }
    // 新增：解析像素值（支持calc表达式）
    const parsePixelValue = (val: string): string => {
        if (!val) return ''
        const calcMatch = val.match(/calc\(\s*(\d+(?:\.\d+)?)\s*px/i)
        if (calcMatch) return calcMatch[1]
        const pxMatch = val.match(/^(\d+(?:\.\d+)?)\s*px$/i)
        if (pxMatch) return pxMatch[1]
        return val
    }

    // 新版：通过 getNodePropsStore 订阅实时变化
    $effect(() => {
        // 清理旧订阅
        unsubscribe()
        if (selectedId) {
            const store = getNodePropsStore(selectedId)
            unsubscribe = store.subscribe((props) => {
                propsSnapshot = props
                if (!props) return
                currentDisplay = typeof props.styles?.display === 'string' ? props.styles.display : 'block'

                // 初始化flex属性
                currentFlexDirection = getStringValue(props.styles?.flexDirection) || 'row'
                currentJustifyContent = getStringValue(props.styles?.justifyContent) || 'flex-start'
                currentAlignItems = getStringValue(props.styles?.alignItems) || 'stretch'
                currentFlexWrap = getStringValue(props.styles?.flexWrap) || 'nowrap'

                // 新增 flex 行/列间距初始化
                currentRowGap = parsePixelValue(getStringValue(props.styles?.rowGap))
                currentColumnGap = parsePixelValue(getStringValue(props.styles?.columnGap))

                // 初始化grid属性
                currentGridTemplateColumns = getStringValue(props.styles?.gridTemplateColumns)
                currentGridTemplateRows = getStringValue(props.styles?.gridTemplateRows)
                currentGridGap = parsePixelValue(getStringValue(props.styles?.gap || props.styles?.gridGap))
                currentGridColumnGap = parsePixelValue(getStringValue(props.styles?.columnGap || props.styles?.gridColumnGap))
                currentGridRowGap = parsePixelValue(getStringValue(props.styles?.rowGap || props.styles?.gridRowGap))
            })
        }
        return () => {
            unsubscribe()
            unsubscribe = () => {}
        }
    })

    // 处理display属性变更
    function handleDisplayChange(newValue: string) {
        if (!selectedId) return

        updateNodeProps(selectedId, {
            styles: {
                display: newValue
            }
        })

        // 如果切换为 flex 布局，自动将所有绝对定位的子节点改为静态定位，确保参与 flex 布局
        if (newValue === 'flex') {
            const node = getFullNode(selectedId)
            if (node?.children?.length) {
                node.children.forEach((child) => {
                    const pos = (child.styles?.position as string) || ''
                    if (pos === 'absolute') {
                        updateNodeProps(child.id, { styles: { position: 'static' } })
                    }
                })
            }
        } else if (newValue === 'grid') {
            const node = getFullNode(selectedId)
            if (node) {
                const count = node.children?.length ?? 0
                if (count > 0) {
                    const rows = Math.ceil(Math.sqrt(count))
                    const cols = Math.ceil(count / rows)
                    gridRowsCount = rows
                    gridColsCount = cols
                    updateNodeProps(selectedId, {
                        styles: {
                            gridTemplateRows: `repeat(${rows}, 1fr)`,
                            gridTemplateColumns: `repeat(${cols}, 1fr)`
                        }
                    })
                    // 清理子节点宽高并将定位重置为 static，保证参与网格布局
                    node.children?.forEach((child) => {
                        updateNodeProps(child.id, { styles: { width: '', height: '', position: 'static' } })
                    })
                }
            }
        }
    }

    // 处理flex属性变更
    function handleFlexPropChange(prop: string, value: string) {
        if (!selectedId) return

        updateNodeProps(selectedId, {
            styles: {
                [prop]: value
            }
        })
    }

    // 处理grid属性变更
    function handleGridColsChange(n: number) {
        if (!selectedId) return
        if (n < 1) n = 1
        gridColsCount = n
        updateNodeProps(selectedId, { styles: { gridTemplateColumns: `repeat(${n}, 1fr)` } })
        syncGridChildren(gridRowsCount, gridColsCount)
    }
    function handleGridRowsChange(n: number) {
        if (!selectedId) return
        if (n < 1) n = 1
        gridRowsCount = n
        updateNodeProps(selectedId, { styles: { gridTemplateRows: `repeat(${n}, 1fr)` } })
        syncGridChildren(gridRowsCount, gridColsCount)
    }

    // 同步子节点数量与网格单元一致
    async function syncGridChildren(rows: number, cols: number) {
        if (!selectedId) return
        const desired = rows * cols
        const node = getFullNode(selectedId)
        if (!node) return
        const current = node.children?.length ?? 0
        // 添加不足部分
        for (let i = 0; i < desired - current; i++) {
            const childId = globalThis.crypto?.randomUUID?.() ?? `node-${Date.now()}-${Math.random()}`
            addNodeToParent(selectedId, {
                id: childId,
                componentType: 'SimpleBox',
                styles: { backgroundColor: 'rgba(255,255,255,0.05)' },
                attributes: { 'data-name': `单元格 ${current + i + 1}` },
                children: []
            } as any)
        }
        // 删除多余部分
        if (current > desired && node.children) {
            const extras = node.children.slice(desired)
            for (const c of extras) {
                await removeNodeById(c.id)
            }
        }
    }
    function handleGridPropChange(prop: string, value: string) {
        if (!selectedId) return

        updateNodeProps(selectedId, {
            styles: {
                [prop]: value
            }
        })
    }
</script>

<div class="layout-editor">
    {#if selectedId}
        <h3>布局样式</h3>
        <div class="layout-list">
            <!-- display属性 -->
            <PropertyRow label="显示类型">
                <PropertySelect bind:value={currentDisplay} options={displayOptions} change={handleDisplayChange} />
            </PropertyRow>

            <!-- Flex属性 -->
            {#if currentDisplay === 'flex'}
                <PropertyRow label="排列方向">
                    <PropertySelect
                        id="node-flex-direction"
                        bind:value={currentFlexDirection}
                        options={[
                            { value: 'row', label: '水平 (row)' },
                            { value: 'column', label: '垂直 (column)' },
                            { value: 'row-reverse', label: '水平反向 (row-reverse)' },
                            { value: 'column-reverse', label: '垂直反向 (column-reverse)' }
                        ]}
                        change={(v) => handleFlexPropChange('flexDirection', v)}
                    />
                </PropertyRow>
                <PropertyRow label="主轴对齐">
                    <PropertySelect
                        id="node-justify-content"
                        bind:value={currentJustifyContent}
                        options={[
                            { value: 'flex-start', label: '起始对齐' },
                            { value: 'flex-end', label: '末尾对齐' },
                            { value: 'center', label: '居中对齐' },
                            { value: 'space-between', label: '两端对齐' },
                            { value: 'space-around', label: '环绕对齐' },
                            { value: 'space-evenly', label: '均匀对齐' }
                        ]}
                        change={(v) => handleFlexPropChange('justifyContent', v)}
                    />
                </PropertyRow>

                <PropertyRow label="副轴对齐">
                    <PropertySelect
                        id="node-align-items"
                        bind:value={currentAlignItems}
                        options={[
                            { value: 'stretch', label: '拉伸对齐' },
                            { value: 'flex-start', label: '起始对齐' },
                            { value: 'flex-end', label: '末尾对齐' },
                            { value: 'center', label: '居中对齐' },
                            { value: 'baseline', label: '基线对齐' }
                        ]}
                        change={(v) => handleFlexPropChange('alignItems', v)}
                    />
                </PropertyRow>

                <PropertyRow label="换行设置">
                    <PropertySelect
                        id="node-flex-wrap"
                        bind:value={currentFlexWrap}
                        options={[
                            { value: 'nowrap', label: '不换行' },
                            { value: 'wrap', label: '换行' },
                            { value: 'wrap-reverse', label: '反向换行' }
                        ]}
                        change={(v) => handleFlexPropChange('flexWrap', v)}
                    />
                </PropertyRow>

                <PropertyRow label="多轴对齐">
                    <PropertySelect
                        id="node-align-content"
                        bind:value={currentAlignContent}
                        options={[
                            { value: 'stretch', label: '拉伸对齐' },
                            { value: 'flex-start', label: '起始对齐' },
                            { value: 'flex-end', label: '末尾对齐' },
                            { value: 'center', label: '居中对齐' },
                            { value: 'space-between', label: '两端对齐' },
                            { value: 'space-around', label: '环绕对齐' },
                            { value: 'space-evenly', label: '均匀对齐' }
                        ]}
                        change={(v) => handleFlexPropChange('alignContent', v)}
                    />
                </PropertyRow>


                <PropertyRow label="行间距值">
                    <SizeInput bind:value={currentRowGap} unitOptions={['px']} step={1} on:change={({ detail: { value } }) => handleFlexPropChange('rowGap', `calc(${value}px * var(--scale-ratio, 1))`)} />
                </PropertyRow>

                <PropertyRow label="列间距值">
                    <SizeInput bind:value={currentColumnGap} unitOptions={['px']} step={1} on:change={({ detail: { value } }) => handleFlexPropChange('columnGap', `calc(${value}px * var(--scale-ratio, 1))`)} />
                </PropertyRow>
            {/if}

            <!-- Grid属性 -->
            {#if currentDisplay === 'grid'}
                <PropertyRow label="网格列数">
                    <input type="number" min="1" bind:value={gridColsCount} onchange={(e) => handleGridColsChange(parseInt(e.currentTarget.value))} />
                </PropertyRow>

                <PropertyRow label="网格行数">
                    <input type="number" min="1" bind:value={gridRowsCount} onchange={(e) => handleGridRowsChange(parseInt(e.currentTarget.value))} />
                </PropertyRow>

                <PropertyRow label="间距设置">
                    <SizeInput bind:value={currentGridGap} unitOptions={['px']} step={1} on:change={({ detail: { value } }) => handleGridPropChange('gap', `calc(${value}px * var(--scale-ratio, 1))`)} />
                </PropertyRow>

                <PropertyRow label="列间距值">
                    <SizeInput bind:value={currentGridColumnGap} unitOptions={['px']} step={1} on:change={({ detail: { value } }) => handleGridPropChange('columnGap', `calc(${value}px * var(--scale-ratio, 1))`)} />
                </PropertyRow>

                <PropertyRow label="行间距值">
                    <SizeInput bind:value={currentGridRowGap} unitOptions={['px']} step={1} on:change={({ detail: { value } }) => handleGridPropChange('rowGap', `calc(${value}px * var(--scale-ratio, 1))`)} />
                </PropertyRow>
            {/if}
        </div>
    {:else}
        <p class="placeholder">请选择一个节点来编辑样式</p>
    {/if}
</div>

<style>
    .layout-editor {
        padding: calc(20px * var(--scale-ratio, 1));
        color: #e2e8f0;
    }
    h3 {
        margin: 0 0 calc(16px * var(--scale-ratio, 1)) 0;
        font-size: calc(16px * var(--scale-ratio, 1));
        font-weight: 600;
        color: #cbd5e1;
    }
    .layout-list {
        display: flex;
        flex-direction: column;
        gap: calc(12px * var(--scale-ratio, 1));
    }

    input {
        flex: 1;
        padding: calc(8px * var(--scale-ratio, 1)) calc(12px * var(--scale-ratio, 1));
        border: calc(1px * var(--scale-ratio, 1)) solid rgba(255, 255, 255, 0.2);
        border-radius: calc(6px * var(--scale-ratio, 1));
        font-size: calc(13px * var(--scale-ratio, 1));
        background: rgba(255, 255, 255, 0.1);
        color: #e2e8f0;
        transition: all 0.3s ease;
        appearance: none;
    }

    input:focus {
        outline: none;
        border-color: #cbd5e1;
        background: rgba(255, 255, 255, 0.15);
        box-shadow: 0 0 0 calc(3px * var(--scale-ratio, 1)) rgba(255, 255, 255, 0.1);
    }

    .placeholder {
        color: #64748b;
        font-size: calc(14px * var(--scale-ratio, 1));
        text-align: center;
        padding: calc(20px * var(--scale-ratio, 1));
    }
</style>
