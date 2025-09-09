<!-- AttrEditor.svelte
     节点属性编辑器
     提供节点属性的可视化编辑界面
-->
<script lang="ts">
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    import { getNodePropsStore, getNodeProps as _getNodeProps, updateNodeProps, getFullNode } from '../../../services/property-panel/property-panel.service'
    import { onMount } from 'svelte'
    import { getElementByNodeId } from '../../../services/utils/dom-geometry.util'
    import { getScaleRatio } from '../../../services/utils/get-scale-ratio.util'
    import PropertyRow from './PropertyRow.svelte'
    import PropertySelect from './PropertySelect.svelte'
    import SizeInput from './SizeInput.svelte'
    import { updateNodeProperties } from '../../../services/repository/dom-tree.store.svelte'
    import blocksConfig from '../../blocks/blocks.config.json'
    interface BlockItem {
        type: string
        nameZh: string
        path: string
    }
    let componentOptions = $state<BlockItem[]>([])
    let typeOptions = $state<{ value: string; label: string }[]>([])

    $effect(() => {
        typeOptions = componentOptions.map((item) => ({ value: item.type, label: `${item.nameZh} (${item.type})` }))
        // 如果当前未选中类型且已获取到组件列表，默认选中第一个组件类型，便于回显
        if (!currentType && componentOptions.length > 0 && !isRoot) {
            currentType = componentOptions[0].type
        }
    })

    // 盒子类型、溢出处理、鼠标穿透下拉框选项
    const boxSizingOptions = [
        { value: 'border-box', label: '边框盒 (border-box)' },
        { value: 'content-box', label: '内容盒 (content-box)' }
    ]
    const overflowOptions = [
        { value: 'hidden', label: '隐藏 (hidden)' },
        { value: 'auto', label: '自动 (auto)' },
        { value: 'scroll', label: '滚动 (scroll)' },
        { value: 'visible', label: '可见 (visible)' }
    ]
    const pointerEventsOptions = [
        { value: 'auto', label: '自动 (auto)' },
        { value: 'none', label: '禁止 (none)' }
    ]

    onMount(() => {
        componentOptions = blocksConfig as BlockItem[]
    })

    // 当前选中节点 id（来自外部）
    let { selectedId = null } = $props<{ selectedId?: string | null }>()

    // 当前节点属性快照 & id 值
    let propsSnapshot: ReturnType<typeof _getNodeProps> | null = null
    let currentId: string = ''
    let currentName = $state<string>('')
    let currentType = $state<string>('')
    let currentRemark = $state<string>('')
    // 新增根节点判断
    let isRoot = $state(false)
    // 根节点判定
    $effect(() => {
        isRoot = selectedId === 'root'
    })

    // 宽度和高度相关变量
    let currentWidthValue = $state<string>('')
    let currentWidthUnit = $state<'%' | 'px'>('%')
    let currentHeightValue = $state<string>('')
    let currentHeightUnit = $state<'%' | 'px'>('%')

    // 鼠标穿透相关变量
    let currentPointerEvents = $state<'auto' | 'none'>('auto')

    // box-sizing 相关变量
    let currentBoxSizing = $state<'content-box' | 'border-box'>('border-box')

    // overflow 相关变量
    let currentOverflow = $state<'hidden' | 'auto' | 'scroll' | 'visible'>('hidden')

    // 当选中节点或 domTreeVersion 变化时，同步所有属性
    let unsubscribeProps: () => void = () => {}
    // 新增：记录上一次同步的关键值，避免重复写入触发循环
    let lastSynced = {
        name: '',
        type: '',
        remark: '',
        width: '',
        height: '',
        pointerEvents: 'auto',
        overflow: 'hidden',
        boxSizing: 'border-box'
    }
    $effect(() => {
        // 清理上一次订阅
        unsubscribeProps()
        if (selectedId) {
            const store = getNodePropsStore(selectedId)
            unsubscribeProps = store.subscribe((snapshot) => {
                propsSnapshot = snapshot
                const node = getFullNode(selectedId)

                // 需要对比的新值
                const nextName = node?.attributes?.['data-name'] ?? ''
                const nextType = node?.componentType || (node?.attributes as any)?.type || componentOptions[0]?.type || ''
                const nextRemark = snapshot?.attributes?.['data-remark'] ?? ''
                const [nextWidthValue, nextWidthUnit] = parseSize(snapshot?.styles?.width)
                const [nextHeightValue, nextHeightUnit] = parseSize(snapshot?.styles?.height)
                const nextPointerEvents = (snapshot?.styles?.pointerEvents as 'auto' | 'none') || 'auto'
                const nextOverflow = (snapshot?.styles?.overflow as 'hidden' | 'auto' | 'scroll' | 'visible') || 'hidden'
                const nextBoxSizing = (snapshot?.styles?.boxSizing as 'content-box' | 'border-box') || 'border-box'

                // 若为根节点，固定名称为"画布"
                const finalName = isRoot ? '画布' : nextName

                // 仅当值发生变化时才写入，避免重复触发
                if (
                    lastSynced.name === finalName &&
                    lastSynced.type === nextType &&
                    lastSynced.remark === nextRemark &&
                    lastSynced.width === `${nextWidthValue}${nextWidthUnit}` &&
                    lastSynced.height === `${nextHeightValue}${nextHeightUnit}` &&
                    lastSynced.pointerEvents === nextPointerEvents &&
                    lastSynced.overflow === nextOverflow &&
                    lastSynced.boxSizing === nextBoxSizing
                ) {
                    return
                }

                // 更新 lastSynced 记录
                lastSynced = {
                    name: finalName,
                    type: nextType,
                    remark: nextRemark,
                    width: `${nextWidthValue}${nextWidthUnit}`,
                    height: `${nextHeightValue}${nextHeightUnit}`,
                    pointerEvents: nextPointerEvents,
                    overflow: nextOverflow,
                    boxSizing: nextBoxSizing
                }

                // 同步基本属性
                currentId = selectedId
                currentName = finalName
                currentType = nextType
                currentRemark = nextRemark

                // 同步宽高
                currentWidthValue = nextWidthValue
                currentWidthUnit = nextWidthUnit
                currentHeightValue = nextHeightValue
                currentHeightUnit = nextHeightUnit

                // 格式化百分比值，保留一位小数
                if (currentWidthUnit === '%') {
                    const num = parseFloat(currentWidthValue)
                    if (!isNaN(num)) currentWidthValue = String(Math.round(num * 10) / 10)
                }
                if (currentHeightUnit === '%') {
                    const numH = parseFloat(currentHeightValue)
                    if (!isNaN(numH)) currentHeightValue = String(Math.round(numH * 10) / 10)
                }

                // 同步其他样式
                currentPointerEvents = nextPointerEvents
                currentOverflow = nextOverflow
                currentBoxSizing = nextBoxSizing
            })
        } else {
            // 清空所有属性
            propsSnapshot = null
            currentId = ''
            currentName = ''
            currentType = ''
            currentRemark = ''
            currentWidthValue = ''
            currentWidthUnit = '%'
            currentHeightValue = ''
            currentHeightUnit = '%'
            currentPointerEvents = 'auto'
        }

        return () => {
            unsubscribeProps()
            unsubscribeProps = () => {}
        }
    })

    // 可用的组件类型列表
    // 删除原先硬编码
    // const componentTypes = ['SimpleBox', 'ResponsiveBox', 'RealTimeClock']

    function handleNameChange(newName: string) {
        if (!selectedId) return
        currentName = newName
        updateNodeProps(selectedId, {
            attributes: { 'data-name': newName }
        })
    }

    // 修改组件类型
    function handleTypeChange(newType: string) {
        if (!selectedId) return
        // 如果为空，使用第一个组件类型作为默认值
        const finalType = newType || componentOptions[0]?.type || ''
        currentType = finalType

        // 直接更新节点的 componentType 字段，确保回显与渲染一致
        updateNodeProperties(selectedId, { componentType: finalType })

        // 若 blocks.config.json 中为该类型配置了 presetStyles，则批量写入节点样式
        const blockMeta = (blocksConfig as any[]).find((b) => b.type === finalType)
        if (blockMeta && blockMeta.presetStyles) {
            updateNodeProps(selectedId, { styles: { ...blockMeta.presetStyles } })
        }
    }

    // 新增：修改备注
    function handleRemarkChange(newRemark: string) {
        if (!selectedId) return
        currentRemark = newRemark
        updateNodeProps(selectedId, {
            attributes: { 'data-remark': newRemark }
        })
    }

    // 工具函数：解析如 "100px"、"50%" 等字符串，拆分为数值与单位
    function parseSize(size: string | Blob | undefined): [string, '%' | 'px'] {
        if (!size) return ['', '%']
        const sizeStr = typeof size === 'string' ? size : ''
        // 支持解析 calc(100px * var(--scale-ratio, 1)) 形式
        const calcMatch = sizeStr.match(/^calc\(\s*(\d+(?:\.\d+)?)\s*px\b.*\)$/i)
        if (calcMatch) {
            return [calcMatch[1], 'px']
        }
        const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(px|%)?$/i)
        return match ? [match[1], (match[2] as any) || '%'] : [sizeStr, '%']
    }

    // 统一格式化尺寸，px 单位使用 calc 结合 --scale-ratio 实现自适应
    function formatSize(val: string, unit: '%' | 'px'): string {
        if (val === '' || isNaN(parseFloat(val))) return ''
        return unit === 'px' ? `calc(${val}px * var(--scale-ratio, 1))` : `${val}%`
    }

    // 将宽度从一个单位转换到另一个单位
    function convertWidth(val: number, from: '%' | 'px', to: '%' | 'px'): number {
        if (from === to) return val
        const el = getElementByNodeId(selectedId!)
        const parent = el?.parentElement as HTMLElement | null
        if (!el || !parent) return val
        const parentWidth = parent.offsetWidth
        if (parentWidth === 0) return val
        const sr = getScaleRatio()
        if (from === 'px') {
            // 设计px → % (需乘全局缩放比)
            return ((val * sr) / parentWidth) * 100
        } else {
            // % → 设计px (需除全局缩放比)
            return ((val / 100) * parentWidth) / sr
        }
    }

    // 将高度从一个单位转换到另一个单位
    function convertHeight(val: number, from: '%' | 'px', to: '%' | 'px'): number {
        if (from === to) return val
        const el = getElementByNodeId(selectedId!)
        const parent = el?.parentElement as HTMLElement | null
        if (!el || !parent) return val
        const parentHeight = parent.offsetHeight
        if (parentHeight === 0) return val
        const sr = getScaleRatio()
        if (from === 'px') {
            return ((val * sr) / parentHeight) * 100
        } else {
            return ((val / 100) * parentHeight) / sr
        }
    }

    // 处理鼠标穿透属性变更
    function handlePointerEventsChange(value: string) {
        if (!selectedId) return
        currentPointerEvents = value as 'auto' | 'none'
        updateNodeProps(selectedId, { styles: { pointerEvents: value } })
    }

    // 处理 overflow 属性变更
    function handleOverflowChange(value: string) {
        if (!selectedId) return
        currentOverflow = value as 'hidden' | 'auto' | 'scroll' | 'visible'
        updateNodeProps(selectedId, { styles: { overflow: value } })
    }

    // 处理 box-sizing 属性变更
    function handleBoxSizingChange(value: string) {
        if (!selectedId) return
        currentBoxSizing = value as 'content-box' | 'border-box'
        updateNodeProps(selectedId, { styles: { boxSizing: value } })
    }
</script>

<div class="attr-editor">
    {#if selectedId}
        <h3>主要属性</h3>
        <div class="attr-list">
            <PropertyRow label="节点编号">
                <input type="text" value={selectedId} readonly class="disabled-input" title="系统内部ID，不可编辑" />
            </PropertyRow>
            <PropertyRow label="节点名称">
                <input type="text" bind:value={currentName} oninput={(e) => handleNameChange(e.currentTarget.value)} placeholder="输入节点名称..." disabled={isRoot} class:disabled-input={isRoot} autocomplete="off" />
            </PropertyRow>
            <PropertyRow label="节点类型">
                {#if isRoot}
                    <input id="node-type-text-2" type="text" value="画布" disabled class="disabled-input" />
                {:else}
                    <PropertySelect bind:value={currentType} options={typeOptions} disabled={isRoot} change={handleTypeChange} />
                {/if}
            </PropertyRow>

            <PropertyRow label="节点宽度">
                <SizeInput
                    bind:value={currentWidthValue}
                    bind:unit={currentWidthUnit}
                    disabled={isRoot}
                    convert={convertWidth}
                    on:change={({ detail: { value, unit } }) => {
                        if (!selectedId || isRoot) return
                        updateNodeProps(selectedId, { styles: { width: formatSize(value, unit) } })
                    }}
                />
            </PropertyRow>
            <PropertyRow label="节点高度">
                <SizeInput
                    bind:value={currentHeightValue}
                    bind:unit={currentHeightUnit}
                    disabled={isRoot}
                    convert={convertHeight}
                    on:change={({ detail: { value, unit } }) => {
                        if (!selectedId || isRoot) return
                        updateNodeProps(selectedId, { styles: { height: formatSize(value, unit) } })
                    }}
                />
            </PropertyRow>

            <!-- 盒子类型（box-sizing） -->
            <PropertyRow label="盒子类型">
                <PropertySelect bind:value={currentBoxSizing} options={boxSizingOptions} change={handleBoxSizingChange} />
            </PropertyRow>

            <!-- 溢出处理（overflow） -->
            <PropertyRow label="溢出处理">
                <PropertySelect bind:value={currentOverflow} options={overflowOptions} change={handleOverflowChange} />
            </PropertyRow>

            <!-- 鼠标穿透（pointer-events） -->
            <PropertyRow label="鼠标穿透">
                <PropertySelect bind:value={currentPointerEvents} options={pointerEventsOptions} change={handlePointerEventsChange} />
            </PropertyRow>

            <!-- 节点备注 -->
            <PropertyRow label="节点备注">
                <textarea rows="3" bind:value={currentRemark} oninput={(e) => handleRemarkChange(e.currentTarget.value)} placeholder="输入备注..." style="resize: vertical;"></textarea>
            </PropertyRow>
        </div>
    {:else}
        <p class="placeholder">请选择一个节点来编辑属性</p>
    {/if}
</div>

<style>
    .attr-editor {
        padding: calc(20px * var(--scale-ratio, 1));
        color: #e2e8f0;
    }
    h3 {
        margin: 0 0 calc(16px * var(--scale-ratio, 1)) 0;
        font-size: calc(16px * var(--scale-ratio, 1));
        font-weight: 600;
        color: #cbd5e1;
    }
    .attr-list {
        display: flex;
        flex-direction: column;
        gap: calc(12px * var(--scale-ratio, 1));
    }

    input,
    textarea {
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
    input:disabled,
    textarea:disabled {
        color: #64748b;
    }

    input:disabled {
        cursor: not-allowed;
        opacity: 0.5;
        color: #64748b;
    }

    /* 禁用状态统一使用 #64748b 颜色 */
    .disabled-input {
        color: #64748b !important; /* 统一禁用状态文本颜色 */
    }

    /* select option 样式块已移除 */

    input::placeholder,
    textarea::placeholder {
        color: #9ca3af;
    }
    .placeholder {
        color: #64748b;
        font-style: italic;
        text-align: center;
        margin-top: calc(40px * var(--scale-ratio, 1));
        font-size: calc(14px * var(--scale-ratio, 1));
    }
    textarea {
        min-height: calc(80px * var(--scale-ratio, 1));
    }
</style>
