<!-- FeatureEditor.svelte
     根据不同节点类型展示特性设置行
-->
<script lang="ts">
    import { getNodePropsStore, getNodeProps as _getNodeProps, getFullNode, updateNodeProps } from '../../../services/property-panel/property-panel.service'
    import blocksConfig from '../../blocks/blocks.config.json'
    import PropertyRow from './PropertyRow.svelte'
    import PropertySelect from './PropertySelect.svelte'
    import ToggleSwitch from '../ToggleSwitch.svelte'
    import SizeInput from './SizeInput.svelte'
    import { processImageUpload } from '../../../services/image/upload-image.service'
    import { get } from 'svelte/store'
    import { hashBlob, canDecode, convertTo } from '../../../services/image/image-utils'
    import { getImage, addOrIncrement } from '../../../services/database/image-store.service'
    import { getImageSize } from '../../../services/image/upload-image.service'
    import { projectId } from '../../../services/repository/dom-tree.store.svelte'

    // 派生当前选中节点的 featureProps
    const featureProps = $derived(() => {
        if (!selectedId) return null
        const node = getFullNode(selectedId)
        if (!node) return null
        const type = (node.componentType || (node.attributes as any)?.type) as string | undefined
        if (!type) return null
        return (blocksConfig as any[]).find((c) => c.type === type)?.featureProps ?? null
    })

    let { selectedId = null } = $props<{ selectedId?: string | null }>()

    // 当前节点 props 快照
    let propsSnapshot = $state<ReturnType<typeof _getNodeProps> | null>(null)
    // 订阅节点属性变化
    let unsubscribe = () => {}
    $effect(() => {
        unsubscribe()
        if (selectedId) {
            const store = getNodePropsStore(selectedId)
            propsSnapshot = _getNodeProps(selectedId)
            unsubscribe = store.subscribe(() => {
                propsSnapshot = _getNodeProps(selectedId)
            })
        } else {
            propsSnapshot = null
        }
        return () => {
            unsubscribe()
            unsubscribe = () => {}
        }
    })

    // 派生下拉 options

    // 派生属性描述数组
    type PropEntry = { key: string; label: string; type: string; options?: any[]; min?: number; max?: number; default?: any }
    const propEntries: () => PropEntry[] = $derived(() => {
        const fp = featureProps()
        if (!fp) return []
        return Object.entries(fp).map(([key, cfg]: [string, any]) => ({ key, ...cfg }))
    })

    // 当前各属性绑定值
    let currentValues = $state<Record<string, any>>({})
    $effect(() => {
        const attrs = propsSnapshot?.attributes || {}
        const styles = propsSnapshot?.styles || {}
        // 属性与样式合并，样式优先（避免同名冲突）
        currentValues = { ...attrs, ...styles }
    })
    function handleAttrChange(key: string, value: any) {
        currentValues[key] = value
        if (!selectedId) return
        // size 类型写入 styles，其余写入 attributes
        const entry = propEntries().find((p) => p.key === key)
        if (entry?.type === 'size') {
            updateNodeProps(selectedId, { styles: { [key]: value } })
        } else {
            updateNodeProps(selectedId, { attributes: { [key]: value } })
        }
    }

    // 工具函数：解析尺寸字符串，拆分为数值与单位
    async function handleImageFileChange(key: string, e: Event) {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (!file || !selectedId) return

        try {
            const currentProjectId = get(projectId)
            if (!currentProjectId) throw new Error('无法获取项目ID')

            // 1. 计算哈希（加入项目ID 以区分跨项目同图）
            const hash = await hashBlob(file, currentProjectId)

            // 2. 查库是否已存在
            const existing = await getImage(currentProjectId, hash)
            let finalBlob: Blob
            let width = 0
            let height = 0

            if (existing) {
                // 已存在则 refCount +1
                await addOrIncrement(
                    {
                        projectId: currentProjectId,
                        hash,
                        blob: existing.blob,
                        name: existing.name,
                        width: existing.width,
                        height: existing.height
                    },
                    1
                )
                finalBlob = existing.blob
                width = existing.width
                height = existing.height
            } else {
                // 3. 压缩 / 转换
                const supportAvif = await canDecode('image/avif')
                const supportWebp = await canDecode('image/webp')
                let candidate: Blob = file

                if (supportAvif) {
                    const avifBlob = await convertTo(file, 'avif', 0.85)
                    if (avifBlob && avifBlob.size < candidate.size) candidate = avifBlob
                } else if (supportWebp) {
                    const webpBlob = await convertTo(file, 'webp', 0.85)
                    if (webpBlob && webpBlob.size < candidate.size) candidate = webpBlob
                }

                finalBlob = candidate

                // 4. 读取尺寸
                try {
                    const size = await getImageSize(finalBlob)
                    width = size.width
                    height = size.height
                } catch {
                    width = 0
                    height = 0
                }

                // 5. 入库并设置 refCount = 1
                await addOrIncrement(
                    {
                        projectId: currentProjectId,
                        hash,
                        blob: finalBlob,
                        name: file.name,
                        width,
                        height
                    },
                    1
                )
            }

            // 6. 将哈希写入样式
            currentValues[key] = hash
            updateNodeProps(selectedId, { styles: { [key]: hash } })
        } catch (err) {
            console.error('图片上传失败', err)
        }
    }

    // 记录各属性对应的隐藏文件输入
    const fileInputs: Record<string, HTMLInputElement> = {}

    // 自定义 action，用于将动态 key 的 input 元素保存到 fileInputs
    function bindFileInput(node: HTMLInputElement, key: string) {
        fileInputs[key] = node
        return {
            destroy() {
                delete fileInputs[key]
            }
        }
    }
    function handleDragOver(e: DragEvent) {
        e.preventDefault()
        e.dataTransfer!.dropEffect = 'copy'
    }
    async function handleDrop(key: string, e: DragEvent) {
        e.preventDefault()
        const file = e.dataTransfer?.files?.[0]
        if (file) {
            // 直接构造模拟事件调用上传逻辑，避免浏览器安全限制无法赋值 input.files
            const mockEvent = { target: { files: [file] } } as any
            await handleImageFileChange(key, mockEvent)
        }
    }

    function triggerUpload(key: string) {
        fileInputs[key]?.click()
    }
    function handleRemoveImage(key: string) {
        currentValues[key] = ''
        if (selectedId) {
            updateNodeProps(selectedId, { styles: { [key]: '' } })
        }
    }

    function parseSize(size: any): [string, 'px' | '%'] {
        if (size == null) return ['', 'px']
        const str = String(size)
        if (str.endsWith('%')) return [str.replace('%', ''), '%']
        if (str.endsWith('px')) return [str.replace('px', ''), 'px']
        return [str, 'px']
    }

    // 当选中节点切换或 propEntries 更新时，若某些特性属性未设置，则赋默认值（取 options 第一个值）
    $effect(() => {
        if (!selectedId) return
        const entries = propEntries()
        if (!entries.length) return
        const updatesAttr: Record<string, any> = {}
        const updatesStyle: Record<string, any> = {}
        for (const p of entries) {
            if ((currentValues as any)[p.key] === undefined) {
                let val: any = undefined
                if (p.type === 'select' && p.options?.length) {
                    val = p.options[0].value
                } else if (p.type === 'number' && p.default !== undefined) {
                    val = p.default
                } else if (p.type === 'size' && p.default !== undefined) {
                    val = `${p.default}px`
                } else if (p.type === 'switch') {
                    val = p.default !== undefined ? p.default : false
                }
                if (val !== undefined) {
                    if (p.type === 'size') {
                        updatesStyle[p.key] = val
                    } else {
                        updatesAttr[p.key] = val
                    }
                }
            }
        }
        if (Object.keys(updatesAttr).length || Object.keys(updatesStyle).length) {
            currentValues = { ...currentValues, ...updatesAttr, ...updatesStyle }
            updateNodeProps(selectedId, { attributes: updatesAttr, styles: updatesStyle })
        }
    })
</script>

{#if propEntries().length}
    <div class="feature-editor">
        <h3>特性设置</h3>
        {#each propEntries() as p (p.key)}
            <PropertyRow label={`${p.label}`}>
                {#if p.type === 'select'}
                    <PropertySelect bind:value={currentValues[p.key]} options={p.options} change={(v) => handleAttrChange(p.key, v)} />
                {:else if p.type === 'number'}
                    <input type="number" min={p.min} max={p.max} bind:value={currentValues[p.key]} oninput={(e) => handleAttrChange(p.key, +(e.currentTarget as HTMLInputElement).value)} class="number-input" />
                {:else if p.type === 'size'}
                    <SizeInput value={parseSize(currentValues[p.key])[0]} unit="px" unitOptions={['px']} convert={(v) => v} on:change={({ detail: { value, unit } }) => handleAttrChange(p.key, value ? `${value}${unit}` : '')} />
                {:else if p.type === 'image'}
                    <div class="image-uploader">
                        {#if !currentValues[p.key]}
                            <button class="input-style" onclick={() => triggerUpload(p.key)} ondragover={handleDragOver} ondrop={(e) => handleDrop(p.key, e)} title="点击上传或拖拽图片到此处">上传图片</button>
                        {:else}
                            <div class="remove-image-wrapper">
                                <button class="input-style remove-button" onclick={() => handleRemoveImage(p.key)} title="移除图片" style="background: rgba(239, 68, 68, 0.2); color: #f87171;">移除</button>
                            </div>
                        {/if}
                        <input type="file" accept="image/*" style="display:none" use:bindFileInput={p.key} onchange={(e) => handleImageFileChange(p.key, e)} />
                    </div>
                {:else if p.type === 'switch'}
                    <ToggleSwitch checked={currentValues[p.key] ?? false} on:change={(e) => handleAttrChange(p.key, e.detail)} />
                {/if}
                <!-- 其他类型控件可在此扩展 -->
            </PropertyRow>
        {/each}
    </div>
{/if}

<style>
    .feature-editor {
        padding: calc(20px * var(--scale-ratio, 1));
        color: #e2e8f0;
    }
    /* 行间距：仅作用于本页签，其他面板已自带 */
    :global(.feature-editor .property-row:not(:last-child)) {
        margin-bottom: calc(12px * var(--scale-ratio, 1));
    }
    .image-uploader {
        display: flex;
        flex-direction: column;
        gap: calc(4px * var(--scale-ratio, 1));
        flex: 1;
    }
    :global(.image-uploader .preview) {
        max-width: 100%;
        max-height: calc(120px * var(--scale-ratio, 1));
        object-fit: contain;
        border: 1px solid #334155;
        border-radius: 4px;
    }
    /* 使上传/移除按钮撑满整行，与 BackgroundEditor 一致 */
    .image-uploader .input-style {
        width: 100%;
    }
    .remove-button {
        width: 82%;
    }

    /* 按钮样式 - 与BackgroundEditor保持一致 */
    .input-style {
        flex: 1;
        padding: calc(8px * var(--scale-ratio, 1)) calc(12px * var(--scale-ratio, 1));
        border: calc(1px * var(--scale-ratio, 1)) solid rgba(255, 255, 255, 0.2);
        border-radius: calc(6px * var(--scale-ratio, 1));
        font-size: calc(13px * var(--scale-ratio, 1));
        background: rgba(255, 255, 255, 0.1);
        color: #e2e8f0;
        transition: all 0.3s ease;
        cursor: pointer;
        text-align: center;
    }
    .input-style:hover {
        background: rgba(255, 255, 255, 0.15);
    }
    .input-style:focus {
        outline: none;
        border-color: #cbd5e1;
        background: rgba(255, 255, 255, 0.15);
        box-shadow: 0 0 0 calc(3px * var(--scale-ratio, 1)) rgba(255, 255, 255, 0.1);
    }
    .input-style:hover {
        border-color: rgba(99, 102, 241, 0.5);
    }
    .input-style:active,
    .input-style:focus {
        border-color: #6366f1;
        box-shadow: 0 0 0 calc(3px * var(--scale-ratio, 1)) rgba(99, 102, 241, 0.2);
    }
    .remove-image-wrapper {
        position: relative;
        flex: 1;
    }

    h3 {
        margin: 0 0 calc(16px * var(--scale-ratio, 1)) 0;
        font-size: calc(16px * var(--scale-ratio, 1));
        font-weight: 600;
        color: #cbd5e1;
    }
</style>
