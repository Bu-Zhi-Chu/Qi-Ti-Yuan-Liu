<!-- FeatureEditor.svelte
     根据不同节点类型展示特性设置行
-->
<script lang="ts">
    import { getNodePropsStore, getNodeProps as _getNodeProps, getFullNode, updateNodeProps } from '../../../services/property-panel/property-panel.service'
    import { addNodeToParent, removeNodeById } from '../../../stores/dom-tree.store.svelte'
    import blocksConfig from '../../blocks/blocks.config.json'
    import PropertyRow from './PropertyRow.svelte'
    import PropertySelect from './PropertySelect.svelte'
    import ToggleSwitch from '../ToggleSwitch.svelte'
    import SizeInput from './SizeInput.svelte'
    import { processImageUpload } from '../../../services/image/upload-image.service'
    import { get } from 'svelte/store'
    import { hashBlob, canDecode, convertTo } from '../../../services/image/image-utils'
    import { getImage, addOrIncrement, decrementOrDelete } from '../../../services/database/image-store.service'
    import { getImageSize } from '../../../services/image/upload-image.service'
    import { projectId } from '../../../stores/dom-tree.store.svelte'
    import { domTree } from '../../../stores/dom-tree.store.svelte'
    import { setCurrentPage } from '../../../stores/dom-tree.store.svelte'
    import { findParentById } from '../../../stores/dom-tree.store.svelte'
    import { getDesignSize } from '../../../stores/dom-tree.store.svelte'
    import CodeEditor from '../CodeEditor.svelte'

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

    // 派生属性描述数组
    type PropEntry = { key: string; label: string; type: string; url?: string; links?: { label: string; url: string }[]; options?: any[]; min?: number; max?: number; default?: any; showIf?: { key: string; value: any } }

    // 工具函数：检查节点是否匹配 showIf 条件（复用现有的 showIf 逻辑）
    function matchesShowIf(node: any, showIfConfig: { key: string; value: any }): boolean {
        if (!showIfConfig || !node) return false
        const attr = node.attributes || {}
        const currentValue = attr[showIfConfig.key] || (node as any)[showIfConfig.key]
        return currentValue === showIfConfig.value
    }

    // 工具函数：获取组件类型的 showIf 配置
    function getComponentShowIfConfig(componentType: string, propKey: string): { key: string; value: any } | null {
        const componentConfig = (blocksConfig as any[]).find((b) => b.type === componentType)
        const featureProps = componentConfig?.featureProps
        const propConfig = featureProps?.[propKey]
        return propConfig?.showIf || null
    }
    // 属性描述数组
    const propEntries: () => PropEntry[] = $derived(() => {
        const fp = featureProps()
        if (!fp) return []

        // 基础属性映射
        const base: PropEntry[] = Object.entries(fp).map(([key, cfg]: [string, any]) => {
            const entry: any = { key, ...cfg }

            // 处理动态选项
            if (cfg.dynamicOptions === 'screens') {
                // 收集 DOM 树中的 Screen 组件
                const screens: { id: string; label: string }[] = []
                function visit(node: any) {
                    if (!node) return
                    if (node.componentType === 'Screen' || (node.attributes as any)?.type === 'Screen') {
                        const label = (node.attributes as any)?.['data-name'] || node.id
                        screens.push({ id: node.id, label })
                    }
                    if (node.children) node.children.forEach(visit)
                }
                visit(domTree)

                entry.options = screens.map((s) => ({ value: s.id, label: s.label }))
            }

            return entry
        })

        // 过滤基于 showIf
        const filtered = base.filter((e) => {
            if (!e.showIf) return true
            const { key: depKey, value: depVal } = e.showIf
            return currentValues[depKey] === depVal
        })

        return filtered
    })

    // 当前各属性绑定值
    let currentValues = $state<Record<string, any>>({})
    $effect(() => {
        const attrs = propsSnapshot?.attributes || {}
        const styles = propsSnapshot?.styles || {}

        // 获取featureProps的默认值
        const defaults: Record<string, any> = {}
        const fp = featureProps()
        if (fp) {
            Object.entries(fp).forEach(([key, cfg]: [string, any]) => {
                if (cfg.default !== undefined && cfg.default !== null) {
                    defaults[key] = cfg.default
                } else if (cfg.default === null && (key === 'designWidth' || key === 'designHeight')) {
                    // 对于designWidth/designHeight，当配置默认值为null时，使用store中的动态值
                    const storeDesignSize = getDesignSize()
                    if (key === 'designWidth') {
                        defaults[key] = storeDesignSize.width
                    } else if (key === 'designHeight') {
                        defaults[key] = storeDesignSize.height
                    }
                } else if (cfg.type === 'code') {
                    // 为code类型属性提供空字符串默认值，避免绑定undefined
                    defaults[key] = ''
                }
            })
        }

        // 合并顺序：默认值 -> 属性值 -> 样式值（后者优先）
        // 确保code类型属性不为undefined
        const merged = { ...defaults, ...attrs, ...styles }

        // 如果存在 seriesData，则用它来合成最新的 code 以在编辑器中显示
        const seriesData = merged.seriesData as string[] | undefined
        let code = merged.code as string | undefined

        if (seriesData && Array.isArray(seriesData) && seriesData.length > 0 && typeof code === 'string') {
            // 匹配 data: [] 数组，但排除 legend.data 等配置数据
            const allMatches = [...code.matchAll(/data\s*:\s*(\[[^\]]*\])/g)]
            const codeMatches = allMatches.filter((match) => {
                const matchStart = match.index!
                const beforeMatch = code.substring(Math.max(0, matchStart - 20), matchStart)
                return !beforeMatch.includes('legend') && !beforeMatch.includes('tooltip')
            })

            if (codeMatches.length > 0 && codeMatches.length === seriesData.length) {
                let tempCode = code
                let offset = 0
                for (let i = 0; i < codeMatches.length; i++) {
                    const match = codeMatches[i]
                    const originalDataStr = match[1]
                    const newDataStr = seriesData[i]
                    const startIndex = match.index! + match[0].indexOf(originalDataStr) + offset

                    tempCode = tempCode.substring(0, startIndex) + newDataStr + tempCode.substring(startIndex + originalDataStr.length)
                    offset += newDataStr.length - originalDataStr.length
                }
                merged.code = tempCode // 更新 merged 对象中的 code
            }
        }

        if (fp) {
            Object.entries(fp).forEach(([key, cfg]: [string, any]) => {
                if (cfg.type === 'code' && merged[key] === undefined) {
                    merged[key] = ''
                }
            })
        }
        currentValues = merged
    })
    let syncingFromDomTree = false
    let editingButtonCount = false // 标记正在由输入框主动修改中
    // 新增：哈希校验正则
    const hashRegex = /^[a-f0-9]{40,}$/

    // 新增：上传进度条状态
    let isUploading = $state(false)
    let uploadProgress = $state(0)

    // 新增：递归收集节点及子节点中的背景 / 高亮图片哈希
    function collectImageHashes(node: any, hashes: string[]) {
        const styles: any = node.styles || {}
        const candidates = [styles.backgroundImage, styles.highlightImage]
        for (const v of candidates) {
            if (typeof v === 'string' && hashRegex.test(v.trim())) {
                hashes.push(v.trim())
            }
        }
        if (node.children && node.children.length) {
            node.children.forEach((c: any) => collectImageHashes(c, hashes))
        }
    }
    async function handleAttrChange(key: string, value: any) {
        // 如果是 DOM 树同步过来的 buttonCount 变更，则仅更新 view，不再触发增删按钮
        if (key === 'buttonCount' && syncingFromDomTree) {
            syncingFromDomTree = false
            currentValues = { ...currentValues, [key]: value }
            if (selectedId) {
                updateNodeProps(selectedId, { attributes: { [key]: value } })
            }
            return
        }
        currentValues = { ...currentValues, [key]: value }
        if (!selectedId) return
        // size 类型写入 styles，其余写入 attributes
        const entry = propEntries().find((p) => p.key === key)
        if (entry?.type === 'size') {
            updateNodeProps(selectedId, { styles: { [key]: value } })
        } else {
            const attributesToUpdate: { [k: string]: any } = { [key]: value }

            // 当 code 属性变化时，解析出 seriesData 并一同更新
            if (key === 'code' && typeof value === 'string') {
                const code = value
                // 匹配 data: [] 数组，但排除 legend.data 等配置数据
                const allMatches = [...code.matchAll(/data\s*:\s*(\[[^\]]*\])/g)]

                const codeMatches = allMatches.filter((match) => {
                    const matchStart = match.index!
                    const beforeMatch = code.substring(Math.max(0, matchStart - 20), matchStart)
                    // 检查是否是 legend.data 或其他非系列配置
                    return !beforeMatch.includes('legend') && !beforeMatch.includes('tooltip')
                })

                const parsedData = codeMatches.map((m) => m[1])

                // 如果解析出了数据，则存入 seriesData，否则存 undefined
                attributesToUpdate.seriesData = parsedData.length > 0 ? parsedData : undefined
            }

            updateNodeProps(selectedId, { attributes: attributesToUpdate })

            // 额外逻辑：同级导航按钮唯一默认首页
            if (key === 'defaultHome' && value === true) {
                const parent = findParentById(domTree, selectedId)
                if (parent?.children) {
                    parent.children.forEach((child: any) => {
                        if (child.id !== selectedId && child.componentType === 'Button') {
                            const attr = child.attributes || {}
                            // 使用 showIf 配置来判断是否为导航按钮，而不是硬编码
                            const defaultHomeShowIf = getComponentShowIfConfig('Button', 'defaultHome')
                            if (defaultHomeShowIf) {
                                // 如果当前按钮满足 defaultHome 的 showIf 条件（即 buttonType === 'navigation'）
                                const isNavButton = matchesShowIf(child, defaultHomeShowIf)
                                if (isNavButton && attr.defaultHome) {
                                    updateNodeProps(child.id, { attributes: { defaultHome: false } })
                                }
                            }
                        }
                    })
                }
            }

            // 额外逻辑：ButtonGroup 按钮数量同步
            if (key === 'buttonCount') {
                editingButtonCount = true
                const node = getFullNode(selectedId)
                if (node && (node.componentType === 'ButtonGroup' || (node.attributes as any)?.type === 'ButtonGroup')) {
                    const desired = Math.max(0, Math.min(10, Number(value))) // 允许用户将数量设为0
                    if (desired === 0) {
                        // 若用户主动设为0，则移除整个按钮组组件
                        removeNodeById(selectedId)
                        return
                    }
                    const current = node.children?.length ?? 0
                    // 已移除原简单复制逻辑，改用下方复制首按钮完整 DOM 的实现
                    for (let i = 0; i < desired - current; i++) {
                        const childId = globalThis.crypto?.randomUUID?.() ?? `node-${Date.now()}-${Math.random()}`
                        // 复制第一个按钮完整 DOM（样式、特性等），实现批量同步
                        let baseStyles: Record<string, any> = {}
                        let baseAttrs: Record<string, any> = {}
                        let baseChildren: any[] = []
                        if (node.children && node.children.length) {
                            baseStyles = { ...(node.children[0].styles || {}) }
                            baseAttrs = { ...(node.children[0].attributes || {}) }
                            baseChildren = JSON.parse(JSON.stringify(node.children[0].children || []))
                        } else {
                            const buttonMeta = (blocksConfig as any[]).find((b) => b.type === 'Button') as any
                            baseStyles = buttonMeta?.presetStyles ? { ...buttonMeta.presetStyles } : {}
                        }

                        const newButtonNode: any = {
                            id: childId,
                            componentType: 'Button',
                            styles: baseStyles,
                            attributes: { ...baseAttrs, 'data-name': `按钮 ${current + i + 1}` },
                            children: baseChildren
                        }

                        // 收集并维护图片引用计数
                        const hashes: string[] = []
                        collectImageHashes(newButtonNode, hashes)

                        addNodeToParent(selectedId, newButtonNode)

                        if (hashes.length) {
                            const pid = get(projectId)
                            if (pid) {
                                for (const h of hashes) {
                                    getImage(pid, h).then((img) => {
                                        if (img) addOrIncrement(img, 1)
                                    })
                                }
                            }
                        }
                    }

                    // 删除多余的按钮（从末尾开始）
                    if (current > desired && node.children) {
                        const extras = node.children.slice(desired)
                        for (const c of extras) {
                            removeNodeById(c.id)
                        }
                    }
                    // 等待一轮 microtask 后再清除标记，确保 DOM 树已经同步完成
                    queueMicrotask(() => {
                        editingButtonCount = false
                    })
                }
            }
        }
    }

    // 工具函数：解析尺寸字符串，拆分为数值与单位
    async function handleImageFileChange(key: string, e: Event) {
        const file = (e.target as HTMLInputElement).files?.[0]
        const inputElement = e.target as HTMLInputElement

        if (!file || !selectedId) {
            // 清理文件输入框
            inputElement.value = ''
            return
        }

        // 初始化上传状态
        isUploading = true
        uploadProgress = 0

        try {
            const currentProjectId = get(projectId)
            if (!currentProjectId) throw new Error('无法获取项目ID')

            // 1. 计算哈希（加入项目ID 以区分跨项目同图）
            const hash = await hashBlob(file, currentProjectId)
            uploadProgress = 20

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
                uploadProgress = 60
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
                uploadProgress = 40

                // 4. 读取尺寸
                try {
                    const size = await getImageSize(finalBlob)
                    width = size.width
                    height = size.height
                } catch {
                    width = 0
                    height = 0
                }
                uploadProgress = 50

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
                uploadProgress = 80
            }

            // 6. 将哈希写入样式
            currentValues = { ...currentValues, [key]: hash }
            updateNodeProps(selectedId, { styles: { [key]: hash } })
            uploadProgress = 100
        } catch (err) {
            console.error('图片上传失败', err)
        } finally {
            // 重置上传状态
            isUploading = false
            uploadProgress = 0
            // 无论成功还是失败，都清理文件输入框，确保可以重复上传相同文件
            inputElement.value = ''
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
    async function handleRemoveImage(key: string) {
        const oldHash = currentValues[key]
        currentValues = { ...currentValues, [key]: '' }
        if (selectedId) {
            updateNodeProps(selectedId, { styles: { [key]: '' } })
        }
        const pid = get(projectId)
        if (pid && typeof oldHash === 'string' && /^[a-f0-9]{40,}$/.test(oldHash.trim())) {
            await decrementOrDelete(pid, oldHash.trim())
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
                if (p.type === 'select') {
                    if (p.default !== undefined) {
                        val = p.default
                    } else if (p.options?.length) {
                        val = p.options[0].value
                    }
                } else if (p.type === 'number' && p.default !== undefined) {
                    val = p.default
                } else if (p.type === 'size' && p.default !== undefined) {
                    val = `${p.default}px`
                } else if (p.type === 'switch') {
                    val = p.default !== undefined ? p.default : false
                } // add
                else if ((p.type === 'text' || p.type === 'json') && p.default !== undefined) {
                    val = p.default
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
            // 如果默认添加了 ButtonGroup 的 buttonCount，则同步子按钮
            if ('buttonCount' in updatesAttr && selectedId) {
                const node = getFullNode(selectedId)
                if (node && (node.componentType === 'ButtonGroup' || (node.attributes as any)?.type === 'ButtonGroup')) {
                    const desired = Math.max(1, Math.min(10, Number(updatesAttr['buttonCount']))) || 1
                    const current = node.children?.length ?? 0

                    // 添加不足的按钮
                    for (let i = 0; i < desired - current; i++) {
                        const childId = globalThis.crypto?.randomUUID?.() ?? `node-${Date.now()}-${Math.random()}`
                        const buttonMeta = (blocksConfig as any[]).find((b) => b.type === 'Button') as any
                        const baseStyles = buttonMeta?.presetStyles ? { ...buttonMeta.presetStyles } : {}
                        addNodeToParent(selectedId, {
                            id: childId,
                            componentType: 'Button',
                            styles: baseStyles,
                            attributes: { 'data-name': `按钮 ${current + i + 1}` },
                            children: []
                        } as any)
                    }

                    // 删除多余的按钮
                    if (current > desired && node.children) {
                        const extras = node.children.slice(desired)
                        for (const c of extras) removeNodeById(c.id)
                    }
                }
            }
        }
    })
    // 新增：当 ButtonGroup 的子节点数量与 buttonCount 不一致时，只同步数字框，不触发增删按钮
    $effect(() => {
        if (!selectedId) return
        const node = getFullNode(selectedId)
        if (!node || node.componentType !== 'ButtonGroup') return
        const realCount = node.children?.length ?? 0
        const shownCount = Number(currentValues['buttonCount'] ?? node.attributes?.buttonCount ?? realCount)

        // 若已无子按钮，则移除整个按钮组
        if (realCount === 0) {
            removeNodeById(selectedId)
            return
        }

        if (!editingButtonCount && realCount !== shownCount) {
            syncingFromDomTree = true
            currentValues = { ...currentValues, buttonCount: realCount }
            // 仅写入 attributes，保持状态一致，不触发增删
            updateNodeProps(selectedId, { attributes: { buttonCount: String(realCount) } })
        }
    })
</script>

{#if propEntries().length}
    <div class="feature-editor">
        <h3>特性设置</h3>
        {#each propEntries() as p (p.key)}
            {#if !p.showIf || currentValues[p.showIf.key] === p.showIf.value}
                <PropertyRow label={`${p.label}`}>
                    {#if p.type === 'select'}
                        <PropertySelect value={currentValues[p.key]} options={p.options} change={(v) => handleAttrChange(p.key, v)} />
                    {:else if p.type === 'number'}
                        <input type="number" min={p.min} max={p.max} value={currentValues[p.key] ?? ''} oninput={(e) => handleAttrChange(p.key, +(e.currentTarget as HTMLInputElement).value)} class="number-input" />
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
                            {#if isUploading && p.key === 'highlightImage'}
                                <div class="upload-progress" style="margin-top: calc(8px * var(--scale-ratio, 1));">
                                    <div style="flex: 1; position: relative; height: calc(4px * var(--scale-ratio, 1)); background: rgba(255, 255, 255, 0.1); border-radius: calc(2px * var(--scale-ratio, 1));">
                                        <div style="height: 100%; background: linear-gradient(90deg, #6366f1, #7c3aed); border-radius: calc(2px * var(--scale-ratio, 1)); transition: width 0.3s ease; width: {uploadProgress}%"></div>
                                    </div>
                                    <span style="font-size: calc(12px * var(--scale-ratio, 1)); color: rgba(255, 255, 255, 0.7); margin-left: calc(8px * var(--scale-ratio, 1));">{uploadProgress}%</span>
                                </div>
                            {/if}
                        </div>
                    {:else if p.type === 'switch'}
                        <ToggleSwitch checked={currentValues[p.key] ?? false} on:change={(e) => handleAttrChange(p.key, e.detail)} />
                    {:else if p.type === 'link'}
                        <a class="input-style" href={p.url} target="_blank" rel="noopener noreferrer">{p.label ?? '打开'}</a>
                    {:else if p.type === 'linkGroup'}
                        <div class="link-group" style="display:flex; gap: calc(8px * var(--scale-ratio, 1)); flex:1 1 0; width:0;">
                            {#each p.links || [] as l}
                                <a class="input-style link-btn" href={l.url} target="_blank" rel="noopener noreferrer" style="flex:1;">{l.label}</a>
                            {/each}
                        </div>
                    {:else if p.type === 'text'}
                        <input type="text" class="text-input" value={currentValues[p.key] ?? ''} oninput={(e) => handleAttrChange(p.key, (e.currentTarget as HTMLInputElement).value)} />
                    {:else if p.type === 'json' || p.type === 'object'}
                        <textarea
                            rows="6"
                            class="json-input"
                            oninput={(e) => {
                                const str = (e.currentTarget as HTMLTextAreaElement).value
                                try {
                                    handleAttrChange(p.key, JSON.parse(str))
                                } catch (err) {
                                    /* ignore parse error */
                                }
                            }}
                        >
                            {JSON.stringify(currentValues[p.key] ?? p.default ?? {}, null, 2)}
                        </textarea>
                    {:else if p.type === 'code'}
                        <CodeEditor
                            bind:code={currentValues[p.key]}
                            language="javascript"
                            theme="one-dark"
                            height="calc(200px * var(--scale-ratio, 1))"
                            run={(code: string) => handleAttrChange(p.key, code)}
                            toolbar={false}
                            autoRun={true}
                            wrap={true}
                            showLineNumbers={false}
                            style="flex:1; width:0;"
                        />
                    {/if}
                    <!-- 其他类型控件可在此扩展 -->
                </PropertyRow>
            {/if}
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
    .upload-progress {
        display: flex;
        align-items: center;
        gap: calc(8px * var(--scale-ratio, 1));
    }
    .link-btn {
        padding: calc(6px * var(--scale-ratio, 1)) calc(10px * var(--scale-ratio, 1));
        font-size: calc(12px * var(--scale-ratio, 1));
    }

    h3 {
        margin: 0 0 calc(16px * var(--scale-ratio, 1)) 0;
        font-size: calc(16px * var(--scale-ratio, 1));
        font-weight: 600;
        color: #cbd5e1;
    }

    /* 统一输入控件样式（与 AttrEditor 保持一致） */
    .text-input,
    .number-input,
    .json-input,
    input[type='number'] {
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

    .text-input::placeholder,
    .number-input::placeholder,
    .json-input::placeholder {
        color: #9ca3af;
        white-space: pre-wrap;
    }
</style>
