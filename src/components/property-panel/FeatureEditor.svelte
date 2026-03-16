<!-- FeatureEditor.svelte
     根据不同节点类型展示特性设置行
-->
<script lang="ts">
    import { getNodePropsStore, getNodeProps as _getNodeProps, getFullNode, updateNodeProps } from '../../services/parser/property-panel.service'
    import { addNodeToParent, removeNodeById, reorderChildren, updateNodeProperties } from '../../stores/dom-tree.store.svelte'
    import blocksConfig from '../blocks/blocks.config.json'
    import PropertyRow from './PropertyRow.svelte'
    import PropertySelect from './PropertySelect.svelte'
    import ToggleSwitch from '../widgets/ToggleSwitch.svelte'
    import SizeInput from './SizeInput.svelte'
    import { processImageUpload } from '../../services/image/upload-image.service'
    import { get } from 'svelte/store'
    import { hashBlob, canDecode, convertTo } from '../../services/image/image-utils'
    import { getImage, addOrIncrement, decrementOrDelete } from '../../services/database/image-store.service'
    import { getImageSize } from '../../services/image/upload-image.service'
    import { projectId } from '../../stores/dom-tree.store.svelte'
    import { domTree } from '../../stores/dom-tree.store.svelte'
    import { setCurrentPage } from '../../stores/dom-tree.store.svelte'
    import { findParentById } from '../../stores/dom-tree.store.svelte'
    import { getDesignSize } from '../../stores/dom-tree.store.svelte'
    import CodeEditor from '../widgets/CodeEditor.svelte'
    import ColorPicker from '../widgets/ColorPicker.svelte'
    import Icon from '../widgets/Icon.svelte'

    // 派生当前选中节点的 featureProps
    const featureProps = $derived(() => {
        if (!selectedId) return null
        const node = getFullNode(selectedId)
        if (!node) return null
        const type = (node.componentType || (node.attributes as any)?.type) as string | undefined
        if (!type) return null
        return (blocksConfig as any[]).find((c) => c.type === type)?.featureProps ?? null
    })

    const isCompanyToolbarButton: () => boolean = $derived(() => {
        if (!selectedId) return false
        const node = getFullNode(selectedId)
        if (!node || node.componentType !== 'Button') return false
        const parent = findParentById(domTree, selectedId)
        return parent?.componentType === 'CompanyTableToolbar'
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
    type PropEntry = {
        key: string
        label: string
        type: string
        editor?: string
        group?: boolean
        fields?: { key: string; label?: string; control?: string; min?: number; max?: number; step?: number }[]
        url?: string
        links?: { label: string; url: string }[]
        options?: any[]
        min?: number
        max?: number
        default?: any
        showIf?: { key: string; value: any }
        text?: string
    }

    // 动态表格列管理
    let columnLabels = $state<string[]>([])

    // 添加新列
    function addColumn() {
        const currentLabels = currentValues['columnLabels'] || []
        const newLabels = [
            ...currentLabels,
            {
                label: `列${currentLabels.length + 1}`,
                frozen: false,
                previewLength: 10,
                widthMode: 'balanced',
                widthValue: 0,
                widthUnit: 'px'
            }
        ]
        handleAttrChange('columnLabels', newLabels)
    }

    // 移除列
    function removeColumn(index: number) {
        const currentLabels = currentValues['columnLabels'] || []
        const newLabels = currentLabels.filter((_: any, i: number) => i !== index)
        handleAttrChange('columnLabels', newLabels)
    }

    function handlePropertyChange(event: CustomEvent) {
        const { key, value } = event.detail
        handleAttrChange(key, value)
    }

    function handlePropertyInput(event: CustomEvent) {
        const { key, value } = event.detail
        handleAttrChange(key, value)
    }

    // 工具函数：检查节点是否匹配 showIf 条件（复用现有的 showIf 逻辑）
    function matchesShowIf(node: any, showIfConfig: { key: string; value: any }): boolean {
        if (!showIfConfig || !node) return false
        const attr = node.attributes || {}
        const currentValue = attr[showIfConfig.key] || (node as any)[showIfConfig.key]
        const expected = showIfConfig.value
        return Array.isArray(expected) ? expected.includes(currentValue) : currentValue === expected
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
        const node = selectedId ? getFullNode(selectedId) : null
        const isButton = node?.componentType === 'Button' || (node?.attributes as any)?.type === 'Button'

        // 基础属性映射
        const base: PropEntry[] = Object.entries(fp)
            .map(([key, cfg]: [string, any]) => {
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

                if (isButton && key === 'businessStyle' && !isCompanyToolbarButton()) {
                    return null
                }

                if (isButton && key === 'buttonType' && Array.isArray(entry.options) && !isCompanyToolbarButton()) {
                    entry.options = entry.options.filter((opt: any) => opt?.value !== 'hongde')
                }

                return entry
            })
            .filter(Boolean) as any

        // 过滤基于 showIf
        const filtered = base.filter((e) => {
            if (!e.showIf) return true
            const { key: depKey, value: depVal } = e.showIf
            const v = currentValues[depKey]
            return Array.isArray(depVal) ? depVal.includes(v) : v === depVal
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
                    const storeDesignSize = getDesignSize()
                    if (key === 'designWidth') {
                        defaults[key] = storeDesignSize.width / 1000
                    } else if (key === 'designHeight') {
                        defaults[key] = storeDesignSize.height / 1000
                    }
                } else if (cfg.type === 'code') {
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

        // 同步columnLabels状态
        if (merged.columnLabels && Array.isArray(merged.columnLabels)) {
            columnLabels = merged.columnLabels
        }

        // 标记这是从DOM树同步的过程，避免清空seriesData
        syncingFromCodeEditor = true
        currentValues = merged

        // 如果当前节点是 CompanyTableToolbar，则根据当前查询条件数量同步子节点
        if (selectedId) {
            const node = getFullNode(selectedId)
            if (node && node.componentType === 'CompanyTableToolbar') {
                const conditions = merged['queryConditions']
                const desiredCount = Array.isArray(conditions) ? conditions.length : 0
                syncCompanyToolbarConditions(desiredCount)
            }
        }

        // 同步完成后重置标志
        queueMicrotask(() => {
            syncingFromCodeEditor = false
        })
    })
    let syncingFromDomTree = false
    let syncingFromCodeEditor = false // 标记正在由代码编辑器同步，避免清空seriesData
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
        const prevValue = currentValues[key]
        if (key === 'buttonType' && value === 'business') {
            value = 'hongde'
        }
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

            // 当 code 属性变化时，清空 seriesData 和相关数据配置，以便从新代码中重新解析
            // 但只有在用户手动修改（来自代码编辑器）时才清空，切换页签时不清空
            if (key === 'code' && !syncingFromCodeEditor) {
                attributesToUpdate.seriesData = undefined
                attributesToUpdate.mockPath = undefined
                attributesToUpdate.mockSeriesMapping = undefined
                attributesToUpdate.requestPath = undefined
                attributesToUpdate.requestSeriesMapping = undefined
            }

            updateNodeProps(selectedId, { attributes: attributesToUpdate })

            if (key === 'buttonType' || key === 'businessStyle') {
                const node = getFullNode(selectedId)
                if (node?.componentType === 'Button') {
                    const attrs = (node.attributes ?? {}) as any
                    if (attrs.buttonType === 'hongde' && isCompanyToolbarButton()) {
                        const styleKey = typeof attrs.businessStyle === 'string' && attrs.businessStyle ? attrs.businessStyle : 'search'
                        const labelText = styleKey === 'search' ? '查询' : styleKey === 'add' ? '新增' : styleKey === 'delete' ? '删除' : '输出excel'
                        const iconPath = styleKey === 'search' ? 'img/hold/search.png' : styleKey === 'add' ? 'img/hold/edit_add.png' : styleKey === 'delete' ? 'img/hold/edit_remove.png' : 'img/hold/excel.png'
                        const width = styleKey === 'excel' ? 'calc(125px * var(--scale-ratio, 1))' : 'calc(98px * var(--scale-ratio, 1))'

                        updateNodeProps(selectedId, { attributes: { 'data-name': labelText, textContent: labelText } })
                        updateNodeProperties(selectedId, { textContent: labelText })
                        const textOffsetLeft = styleKey === 'excel' ? '8px' : '-1px'
                        updateNodeProps(selectedId, {
                            styles: {
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                cursor: 'pointer',
                                width,
                                height: 'calc(30px * var(--scale-ratio, 1))',
                                backgroundColor: 'rgb(0, 128, 236)',
                                color: 'rgb(255, 255, 255)',
                                fontSize: 'calc(18px * var(--scale-ratio, 1))',
                                fontWeight: '400',
                                lineHeight: 'calc(18px * var(--scale-ratio, 1))',
                                textIndent: 'calc(19px * var(--scale-ratio, 1))',
                                borderWidth: 'calc(0px * var(--scale-ratio, 1))',
                                borderStyle: 'solid',
                                borderColor: 'rgb(0, 0, 0)',
                                borderRadius: 'calc(4px * var(--scale-ratio, 1))',
                                backgroundImage: iconPath,
                                backgroundSize: 'calc(24px * var(--scale-ratio, 1)) calc(18px * var(--scale-ratio, 1))',
                                backgroundSizeX: '24px',
                                backgroundSizeY: '18px',
                                backgroundPositionX: '13.9%',
                                backgroundPositionY: '50%',
                                backgroundPosition: '13.9% 50%',
                                backgroundRepeat: 'no-repeat',
                                backgroundOpacity: '1',
                                textOffsetLeft,
                                textOffsetTop: '-2px'
                            }
                        })
                    }
                }
            }

            if (key === 'queryConditions') {
                syncCompanyToolbarConditionNames(value)
            }

            if (key === 'actionButtons') {
                syncCompanyToolbarButtons(value)
            }

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

            if (key === 'alternateRow' && value === true && !prevValue) {
                const node = getFullNode(selectedId)
                if (node && node.componentType === 'FlexibleTable') {
                    const bodyNode = (node.children || []).find((c: any) => c.componentType === 'FlexibleTableBody')
                    if (bodyNode) {
                        const rowNodes = (bodyNode.children || []).filter((c: any) => c.componentType === 'FlexibleTableRow')
                        if (rowNodes.length < 2) {
                            const rowMeta = (blocksConfig as any[]).find((b) => b.type === 'FlexibleTableRow') as any
                            const baseStyles = rowMeta?.presetStyles ? { ...rowMeta.presetStyles } : {}
                            const newId = globalThis.crypto?.randomUUID?.() ?? `node-${Date.now()}-row-alt`
                            const name = rowNodes.length === 0 ? '表格表行 1' : '表格表行 2'
                            const tableMeta = (blocksConfig as any[]).find((b) => b.type === 'FlexibleTable') as any
                            const defaultLabels = tableMeta?.featureProps?.columnLabels?.default
                            const currentLabels = currentValues['columnLabels']
                            const count = Array.isArray(currentLabels) && currentLabels.length > 0 ? currentLabels.length : Array.isArray(defaultLabels) && defaultLabels.length > 0 ? defaultLabels.length : 3
                            const cellMeta = (blocksConfig as any[]).find((b) => b.type === 'FlexibleTableCell') as any
                            const cellStyles = cellMeta?.presetStyles ? { ...cellMeta.presetStyles } : {}
                            const rowIndex = rowNodes.length
                            const rowChildren = Array.from({ length: count }, (_, colIndex) => ({
                                id: globalThis.crypto?.randomUUID?.() ?? `node-${Date.now()}-cell-alt-${colIndex}`,
                                componentType: 'FlexibleTableCell',
                                styles: cellStyles,
                                attributes: { 'data-name': `单元格 ${colIndex + 1}`, rowIndex, colIndex },
                                children: []
                            }))
                            addNodeToParent(bodyNode.id, {
                                id: newId,
                                componentType: 'FlexibleTableRow',
                                styles: baseStyles,
                                attributes: { 'data-name': name, rowIndex },
                                children: rowChildren
                            } as any)
                        }
                    }
                } else if (node && node.componentType === 'DynamicTable') {
                    const bodyNode = (node.children || []).find((c: any) => c.componentType === 'DynamicTableBody')
                    if (bodyNode) {
                        const rowNodes = (bodyNode.children || []).filter((c: any) => c.componentType === 'DynamicTableRow')
                        if (rowNodes.length < 2) {
                            const rowMeta = (blocksConfig as any[]).find((b) => b.type === 'DynamicTableRow') as any
                            const baseStyles = rowMeta?.presetStyles ? { ...rowMeta.presetStyles } : {}
                            const newId = globalThis.crypto?.randomUUID?.() ?? `node-${Date.now()}-dynamic-row-alt`
                            const name = rowNodes.length === 0 ? '动态表行 1' : '动态表行 2'
                            const tableMeta = (blocksConfig as any[]).find((b) => b.type === 'DynamicTable') as any
                            const defaultLabels = tableMeta?.featureProps?.columnLabels?.default
                            const currentLabels = currentValues['columnLabels']
                            const count = Array.isArray(currentLabels) && currentLabels.length > 0 ? currentLabels.length : Array.isArray(defaultLabels) && defaultLabels.length > 0 ? defaultLabels.length : 3
                            const cellMeta = (blocksConfig as any[]).find((b) => b.type === 'DynamicTableCell') as any
                            const cellStyles = cellMeta?.presetStyles ? { ...cellMeta.presetStyles } : {}
                            const rowIndex = rowNodes.length
                            const showRowNumber = currentValues['showRowNumber'] ?? node.attributes?.showRowNumber ?? true
                            const showCheckbox = currentValues['showCheckbox'] ?? node.attributes?.showCheckbox ?? true
                            const systemCells: any[] = []
                            if (showRowNumber) systemCells.push({ type: 'index', name: '序号列' })
                            if (showCheckbox) systemCells.push({ type: 'selection', name: '勾选列' })

                            const systemChildren = systemCells.map((sys, i) => ({
                                id: globalThis.crypto?.randomUUID?.() ?? `node-${Date.now()}-sys-cell-${i}`,
                                componentType: 'DynamicTableCell',
                                styles: cellStyles,
                                attributes: { 'data-name': sys.name, rowIndex, systemType: sys.type, colIndex: i },
                                children: []
                            }))

                            const systemOffset = systemChildren.length
                            const dataChildren = Array.from({ length: count }, (_, i) => ({
                                id: globalThis.crypto?.randomUUID?.() ?? `node-${Date.now()}-dynamic-cell-alt-${i}`,
                                componentType: 'DynamicTableCell',
                                styles: cellStyles,
                                attributes: { 'data-name': `单元格 ${i + 1}`, rowIndex, colIndex: i + systemOffset },
                                children: []
                            }))

                            const rowChildren = [...systemChildren, ...dataChildren]
                            addNodeToParent(bodyNode.id, {
                                id: newId,
                                componentType: 'DynamicTableRow',
                                styles: baseStyles,
                                attributes: { 'data-name': name, rowIndex },
                                children: rowChildren
                            } as any)
                        }
                    }
                }
            }

            if (key === 'alternateRow' && value === false && prevValue) {
                const node = getFullNode(selectedId)
                if (node && node.componentType === 'FlexibleTable') {
                    const bodyNode = (node.children || []).find((c: any) => c.componentType === 'FlexibleTableBody')
                    if (bodyNode) {
                        const rowNodes = (bodyNode.children || []).filter((c: any) => c.componentType === 'FlexibleTableRow')
                        if (rowNodes.length > 1) {
                            for (let i = 1; i < rowNodes.length; i++) {
                                removeNodeById(rowNodes[i].id)
                            }
                        }
                    }
                } else if (node && node.componentType === 'DynamicTable') {
                    const bodyNode = (node.children || []).find((c: any) => c.componentType === 'DynamicTableBody')
                    if (bodyNode) {
                        const rowNodes = (bodyNode.children || []).filter((c: any) => c.componentType === 'DynamicTableRow')
                        if (rowNodes.length > 1) {
                            for (let i = 1; i < rowNodes.length; i++) {
                                removeNodeById(rowNodes[i].id)
                            }
                        }
                    }
                }
            }

            if (key === 'showRowNumber' || key === 'showCheckbox' || key === 'showOperation') {
                const node = getFullNode(selectedId)
                if (node && node.componentType === 'DynamicTable') {
                    const bodyNode = (node.children || []).find((c: any) => c.componentType === 'DynamicTableBody')
                    if (bodyNode) {
                        const rowNodes = (bodyNode.children || []).filter((c: any) => c.componentType === 'DynamicTableRow')
                        const showRowNumber = key === 'showRowNumber' ? value : (currentValues['showRowNumber'] ?? node.attributes?.showRowNumber ?? true)
                        const showCheckbox = key === 'showCheckbox' ? value : (currentValues['showCheckbox'] ?? node.attributes?.showCheckbox ?? true)
                        const showOperation = key === 'showOperation' ? value : (currentValues['showOperation'] ?? node.attributes?.showOperation ?? false)
                        const cellMeta = (blocksConfig as any[]).find((b) => b.type === 'DynamicTableCell') as any
                        const baseStyles = cellMeta?.presetStyles ? { ...cellMeta.presetStyles } : {}

                        rowNodes.forEach((rowNode: any) => {
                            const rowIndex = typeof rowNode.attributes?.rowIndex === 'number' ? rowNode.attributes.rowIndex : 0
                            const allCells = (rowNode.children || []).filter((c: any) => c.componentType === 'DynamicTableCell')
                            const systemCells = allCells.filter((c: any) => c.attributes?.systemType)
                            const dataCells = allCells.filter((c: any) => !c.attributes?.systemType)

                            const requiredSystemCells: { type: string; name: string }[] = []
                            if (showRowNumber) requiredSystemCells.push({ type: 'index', name: '序号列' })
                            if (showCheckbox) requiredSystemCells.push({ type: 'selection', name: '勾选列' })
                            if (showOperation) requiredSystemCells.push({ type: 'operation', name: '操作列' })

                            const finalSystemCells: any[] = []
                            requiredSystemCells.forEach((req) => {
                                const existing = systemCells.find((c: any) => c.attributes.systemType === req.type)
                                if (existing) {
                                    finalSystemCells.push(existing)
                                } else {
                                    const id = globalThis.crypto?.randomUUID?.() ?? `node-${Date.now()}-sys-cell-${req.type}`
                                    const newCell = {
                                        id,
                                        componentType: 'DynamicTableCell',
                                        styles: baseStyles,
                                        attributes: { 'data-name': req.name, rowIndex, systemType: req.type },
                                        children: []
                                    }
                                    finalSystemCells.push(newCell)
                                    addNodeToParent(rowNode.id, newCell as any)
                                }
                            })

                            systemCells.forEach((c: any) => {
                                if (!finalSystemCells.find((f) => f.id === c.id)) {
                                    removeNodeById(c.id)
                                }
                            })

                            // Reorder children to ensure system cells are first
                            reorderChildren(rowNode.id, [...finalSystemCells, ...dataCells])

                            finalSystemCells.forEach((c, i) => {
                                if (c.attributes.colIndex !== i) {
                                    updateNodeProps(c.id, { attributes: { colIndex: i } })
                                }
                            })

                            const systemOffset = finalSystemCells.length
                            dataCells.forEach((c: any, i: number) => {
                                const newColIndex = systemOffset + i
                                if (c.attributes.colIndex !== newColIndex) {
                                    updateNodeProps(c.id, { attributes: { colIndex: newColIndex } })
                                }
                            })
                        })
                    }
                }
            }

            if (key === 'columnLabels') {
                const node = getFullNode(selectedId)
                if (node && node.componentType === 'FlexibleTable') {
                    const bodyNode = (node.children || []).find((c: any) => c.componentType === 'FlexibleTableBody')
                    if (bodyNode) {
                        const desired = Array.isArray(value) ? value.length : 0
                        const rowNodes = (bodyNode.children || []).filter((c: any) => c.componentType === 'FlexibleTableRow')
                        const cellMeta = (blocksConfig as any[]).find((b) => b.type === 'FlexibleTableCell') as any
                        const baseStyles = cellMeta?.presetStyles ? { ...cellMeta.presetStyles } : {}
                        rowNodes.forEach((rowNode: any) => {
                            const rowIndex = typeof rowNode.attributes?.rowIndex === 'number' ? rowNode.attributes.rowIndex : 0
                            const cells = (rowNode.children || []).filter((c: any) => c.componentType === 'FlexibleTableCell')
                            const current = cells.length
                            if (desired > current) {
                                for (let i = current; i < desired; i++) {
                                    const id = globalThis.crypto?.randomUUID?.() ?? `node-${Date.now()}-cell-${i}`
                                    addNodeToParent(rowNode.id, {
                                        id,
                                        componentType: 'FlexibleTableCell',
                                        styles: baseStyles,
                                        attributes: { 'data-name': `单元格 ${i + 1}`, rowIndex, colIndex: i },
                                        children: []
                                    } as any)
                                }
                            } else if (desired < current && cells.length) {
                                const extras = cells.slice(desired)
                                for (const c of extras) {
                                    removeNodeById(c.id)
                                }
                            }
                        })
                    }
                } else if (node && node.componentType === 'DynamicTable') {
                    const bodyNode = (node.children || []).find((c: any) => c.componentType === 'DynamicTableBody')
                    if (bodyNode) {
                        const desired = Array.isArray(value) ? value.length : 0
                        const rowNodes = (bodyNode.children || []).filter((c: any) => c.componentType === 'DynamicTableRow')
                        const cellMeta = (blocksConfig as any[]).find((b) => b.type === 'DynamicTableCell') as any
                        const baseStyles = cellMeta?.presetStyles ? { ...cellMeta.presetStyles } : {}
                        rowNodes.forEach((rowNode: any) => {
                            const rowIndex = typeof rowNode.attributes?.rowIndex === 'number' ? rowNode.attributes.rowIndex : 0
                            const cells = (rowNode.children || []).filter((c: any) => c.componentType === 'DynamicTableCell' && !c.attributes?.systemType)
                            const current = cells.length
                            const showRowNumber = currentValues['showRowNumber'] ?? node.attributes?.showRowNumber ?? true
                            const showCheckbox = currentValues['showCheckbox'] ?? node.attributes?.showCheckbox ?? true
                            const showOperation = currentValues['showOperation'] ?? node.attributes?.showOperation ?? false
                            const systemOffset = (showRowNumber ? 1 : 0) + (showCheckbox ? 1 : 0) + (showOperation ? 1 : 0)

                            if (desired > current) {
                                for (let i = current; i < desired; i++) {
                                    const id = globalThis.crypto?.randomUUID?.() ?? `node-${Date.now()}-dynamic-cell-${i}`
                                    addNodeToParent(rowNode.id, {
                                        id,
                                        componentType: 'DynamicTableCell',
                                        styles: baseStyles,
                                        attributes: { 'data-name': `单元格 ${i + 1}`, rowIndex, colIndex: i + systemOffset },
                                        children: []
                                    } as any)
                                }
                            } else if (desired < current && cells.length) {
                                const extras = cells.slice(desired)
                                for (const c of extras) {
                                    removeNodeById(c.id)
                                }
                            }

                            // Re-fetch children to ensure we have the latest list (including newly added ones)
                            const currentChildren = rowNode.children || []
                            const finalSystemCells = currentChildren.filter((c: any) => c.componentType === 'DynamicTableCell' && c.attributes?.systemType)
                            const finalDataCells = currentChildren.filter((c: any) => c.componentType === 'DynamicTableCell' && !c.attributes?.systemType)

                            // Ensure correct order: System Cells -> Data Cells
                            reorderChildren(rowNode.id, [...finalSystemCells, ...finalDataCells])

                            finalDataCells.forEach((c: any, i: number) => {
                                const newColIndex = i + systemOffset
                                if (c.attributes.colIndex !== newColIndex) {
                                    updateNodeProps(c.id, { attributes: { colIndex: newColIndex } })
                                }
                            })
                        })
                    }
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

            // 6. 将哈希写入：
            //    - contentBackgroundImage 写入 attributes
            //    - 其他图片键写入 styles
            currentValues = { ...currentValues, [key]: hash }
            if (key === 'contentBackgroundImage') {
                updateNodeProps(selectedId, { attributes: { [key]: hash } })
            } else {
                updateNodeProps(selectedId, { styles: { [key]: hash } })
            }
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

    function addOverlay(key: string) {
        const list = Array.isArray(currentValues[key]) ? [...currentValues[key]] : []
        list.push({
            id: '',
            name: '',
            url: '',
            opacity: 1,
            zIndex: 0
        })
        handleAttrChange(key, list)
    }

    function removeOverlay(key: string, index: number) {
        const list = Array.isArray(currentValues[key]) ? [...currentValues[key]] : []
        if (index < 0 || index >= list.length) return
        list.splice(index, 1)
        handleAttrChange(key, list)
    }

    function addReplacementRule(key: string) {
        const list = Array.isArray(currentValues[key]) ? [...currentValues[key]] : []
        list.push({
            rule: '',
            image: ''
        })
        handleAttrChange(key, list)
    }

    function removeReplacementRule(key: string, index: number) {
        const list = Array.isArray(currentValues[key]) ? [...currentValues[key]] : []
        if (index < 0 || index >= list.length) return
        list.splice(index, 1)
        handleAttrChange(key, list)
    }

    function syncCompanyToolbarConditions(desiredCount: number) {
        if (!selectedId) return
        const node = getFullNode(selectedId)
        if (!node || node.componentType !== 'CompanyTableToolbar') return

        const children = node.children ?? []
        const conditionNodes = children.filter((c: any) => c.componentType === 'ConditionInput')
        const current = conditionNodes.length

        const conditionMeta = (blocksConfig as any[]).find((b) => b.type === 'ConditionInput') as any
        const baseStyles = conditionMeta?.presetStyles ? { ...conditionMeta.presetStyles } : {}

        if (current < desiredCount) {
            for (let i = current; i < desiredCount; i++) {
                const childId = globalThis.crypto?.randomUUID?.() ?? `node-${Date.now()}-${Math.random()}`
                addNodeToParent(selectedId, {
                    id: childId,
                    componentType: 'ConditionInput',
                    styles: baseStyles,
                    attributes: { 'data-name': `条件输入 ${i + 1}` },
                    children: []
                } as any)
            }
        } else if (current > desiredCount) {
            const extras = conditionNodes.slice(desiredCount)
            for (const c of extras) {
                removeNodeById(c.id)
            }
        }

        const latest = getFullNode(selectedId)
        if (!latest || latest.componentType !== 'CompanyTableToolbar') return
        const latestChildren = latest.children ?? []
        const conds = latestChildren.filter((c: any) => c.componentType === 'ConditionInput')
        const btns = latestChildren.filter((c: any) => c.componentType === 'Button')
        const rest = latestChildren.filter((c: any) => c.componentType !== 'ConditionInput' && c.componentType !== 'Button')
        reorderChildren(selectedId, [...conds, ...btns, ...rest] as any)
    }

    function syncCompanyToolbarConditionNames(conditions: any[]) {
        if (!selectedId) return
        const toolbar = getFullNode(selectedId)
        if (!toolbar || toolbar.componentType !== 'CompanyTableToolbar') return
        const conds = Array.isArray(conditions) ? conditions : []
        const children = toolbar.children ?? []
        const condNodes = children.filter((c: any) => c.componentType === 'ConditionInput')
        conds.forEach((cfg: any, index: number) => {
            const node = condNodes[index]
            if (!node) return
            const rawName = typeof cfg?.name === 'string' ? cfg.name.trim() : ''
            if (!rawName) return
            if (!node.attributes) node.attributes = {}
            node.attributes['data-name'] = rawName
            updateNodeProps(node.id, { attributes: { 'data-name': rawName } })
        })
    }

    function syncCompanyFormAreaWithColumns(columnLabels: any[]) {
        if (!selectedId) return
        const tableNode = getFullNode(selectedId)
        if (!tableNode || tableNode.componentType !== 'DynamicTable') return

        let parent = findParentById(domTree, tableNode.id)
        let companyTable: any = null
        while (parent) {
            if (parent.componentType === 'CompanyTable') {
                companyTable = parent
                break
            }
            parent = findParentById(domTree, parent.id)
        }
        if (!companyTable || !companyTable.children) return

        const formArea = companyTable.children.find((c: any) => c.componentType === 'CompanyTableFormArea')
        if (!formArea) return

        const labelsRaw = Array.isArray(columnLabels) ? columnLabels : []
        const desiredLabels = labelsRaw
            .map((col: any) => {
                if (typeof col === 'string') return col
                if (col && typeof col.label === 'string') return col.label
                return ''
            })
            .filter((name: string) => name && name.trim().length > 0)

        if (!formArea.children) formArea.children = []
        const conditionMeta = (blocksConfig as any[]).find((b) => b.type === 'ConditionInput') as any
        const baseStyles = conditionMeta?.presetStyles ? { ...conditionMeta.presetStyles } : {}

        const existingFields = formArea.children.filter((c: any) => c.componentType === 'ConditionInput')
        const otherChildren = formArea.children.filter((c: any) => c.componentType !== 'ConditionInput')

        const newFields: any[] = []

        for (let i = 0; i < desiredLabels.length; i++) {
            const label = desiredLabels[i]
            const existing = existingFields[i]
            if (existing) {
                if (!existing.attributes) existing.attributes = {}
                existing.attributes['data-name'] = label
                newFields.push(existing)
                updateNodeProps(existing.id, { attributes: { 'data-name': label } })
            } else {
                const childId = globalThis.crypto?.randomUUID?.() ?? `node-${Date.now()}-form-condition-${i}`
                const newNode: any = {
                    id: childId,
                    componentType: 'ConditionInput',
                    styles: baseStyles,
                    attributes: { 'data-name': label },
                    children: []
                }
                addNodeToParent(formArea.id, newNode)
                newFields.push(newNode)
            }
        }

        if (existingFields.length > desiredLabels.length) {
            const extras = existingFields.slice(desiredLabels.length)
            for (const c of extras) {
                removeNodeById(c.id)
            }
        }

        formArea.children = [...newFields, ...otherChildren]
    }

    function syncCompanyToolbarButtons(buttons: any[]) {
        if (!selectedId) return
        const toolbar = getFullNode(selectedId)
        if (!toolbar || toolbar.componentType !== 'CompanyTableToolbar') return

        const btnConfigs = Array.isArray(buttons) ? buttons : []
        if (!toolbar.children) toolbar.children = []
        const children = toolbar.children
        const buttonNodes = children.filter((c: any) => c.componentType === 'Button')
        const otherChildren = children.filter((c: any) => c.componentType !== 'Button')

        const buttonMeta = (blocksConfig as any[]).find((b) => b.type === 'Button') as any
        const baseStyles = buttonMeta?.presetStyles ? { ...buttonMeta.presetStyles } : {}

        const newButtonNodes: any[] = []

        btnConfigs.forEach((cfg: any, index: number) => {
            let node = buttonNodes[index]
            const name = typeof cfg?.name === 'string' && cfg.name.trim().length > 0 ? cfg.name.trim() : `按钮 ${index + 1}`
            const attrsUpdate: any = {
                'data-name': name,
                textContent: name,
                buttonType: (cfg?.buttonType === 'business' ? 'hongde' : cfg?.buttonType) ?? ((node?.attributes as any)?.buttonType === 'business' ? 'hongde' : (node?.attributes as any)?.buttonType) ?? '',
                businessStyle: cfg?.businessStyle ?? (node?.attributes as any)?.businessStyle ?? undefined,
                disabled: !!cfg?.disabled,
                navigationTarget: cfg?.navigationTarget ?? (node?.attributes as any)?.navigationTarget ?? '',
                jumpPath: cfg?.jumpPath ?? (node?.attributes as any)?.jumpPath ?? ''
            }

            if (node) {
                if (!node.attributes) node.attributes = {}
                node.attributes = { ...node.attributes, ...attrsUpdate }
                updateNodeProps(node.id, { attributes: attrsUpdate })
                if (cfg?.disabled) {
                    updateNodeProps(node.id, { styles: { display: 'none' } })
                } else if ((node.styles as any)?.display === 'none') {
                    updateNodeProps(node.id, { styles: { display: 'flex' } })
                }
                if ((node as any).textContent !== name) {
                    ;(node as any).textContent = name
                    updateNodeProperties(node.id, { textContent: name })
                }
            } else {
                const id = globalThis.crypto?.randomUUID?.() ?? `node-${Date.now()}-toolbar-btn-${index}-${Math.random()}`
                node = {
                    id,
                    componentType: 'Button',
                    styles: baseStyles,
                    textContent: name,
                    attributes: attrsUpdate,
                    children: []
                }
                addNodeToParent(toolbar.id, node)
            }

            newButtonNodes.push(node)
        })

        if (buttonNodes.length > btnConfigs.length) {
            const extras = buttonNodes.slice(btnConfigs.length)
            for (const b of extras) {
                removeNodeById(b.id)
            }
        }

        const conds = otherChildren.filter((c: any) => c.componentType === 'ConditionInput')
        const rest = otherChildren.filter((c: any) => c.componentType !== 'ConditionInput')
        const ordered = [...conds, ...newButtonNodes, ...rest]
        toolbar.children = ordered
        reorderChildren(toolbar.id, ordered as any)
    }

    function addQueryCondition(key: string) {
        const list = Array.isArray(currentValues[key]) ? [...currentValues[key]] : []
        const index = list.length
        list.push({
            name: `条件${index + 1}`,
            type: 'input',
            disabled: false
        })
        handleAttrChange(key, list)
        syncCompanyToolbarConditions(list.length)
    }

    function removeQueryCondition(key: string, index: number) {
        const list = Array.isArray(currentValues[key]) ? [...currentValues[key]] : []
        if (index < 0 || index >= list.length) return
        list.splice(index, 1)
        handleAttrChange(key, list)
        syncCompanyToolbarConditions(list.length)
    }

    function addToolbarButton(key: string) {
        const list = Array.isArray(currentValues[key]) ? [...currentValues[key]] : []
        const index = list.length
        list.push({
            name: `按钮${index + 1}`,
            buttonType: 'hongde',
            businessStyle: 'add',
            disabled: false
        })
        handleAttrChange(key, list)
        syncCompanyToolbarButtons(list)
    }

    function removeToolbarButton(key: string, index: number) {
        const list = Array.isArray(currentValues[key]) ? [...currentValues[key]] : []
        if (index < 4 || index >= list.length) return
        list.splice(index, 1)
        handleAttrChange(key, list)
        syncCompanyToolbarButtons(list)
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
            if (key === 'contentBackgroundImage') {
                updateNodeProps(selectedId, { attributes: { [key]: '' } })
            } else {
                updateNodeProps(selectedId, { styles: { [key]: '' } })
            }
        }
        const pid = get(projectId)
        if (pid && typeof oldHash === 'string' && /^[a-f0-9]{40,}$/.test(oldHash.trim())) {
            await decrementOrDelete(pid, oldHash.trim())
        }
    }

    async function handleReplacementImageFileChange(key: string, index: number, e: Event) {
        const file = (e.target as HTMLInputElement).files?.[0]
        const inputElement = e.target as HTMLInputElement

        if (!file || !selectedId) {
            inputElement.value = ''
            return
        }

        isUploading = true
        uploadProgress = 0

        try {
            const currentProjectId = get(projectId)
            if (!currentProjectId) throw new Error('无法获取项目ID')

            const hash = await hashBlob(file, currentProjectId)
            uploadProgress = 20

            const existing = await getImage(currentProjectId, hash)
            let finalBlob: Blob
            let width = 0
            let height = 0

            if (existing) {
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
            } else {
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

                try {
                    const size = await getImageSize(finalBlob)
                    width = size.width
                    height = size.height
                } catch {
                    width = 0
                    height = 0
                }
                uploadProgress = 50

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

            const list = Array.isArray(currentValues[key]) ? [...currentValues[key]] : []
            if (!list[index]) list[index] = {}
            list[index] = {
                ...list[index],
                image: hash
            }
            handleAttrChange(key, list)
            uploadProgress = 100
        } catch (err) {
            console.error('替换规则图片上传失败', err)
        } finally {
            isUploading = false
            uploadProgress = 0
            inputElement.value = ''
        }
    }

    async function handleRemoveReplacementImage(key: string, index: number) {
        const list = Array.isArray(currentValues[key]) ? [...currentValues[key]] : []
        if (!list[index]) return

        const oldHash = list[index].image
        list[index] = {
            ...list[index],
            image: ''
        }
        handleAttrChange(key, list)

        const pid = get(projectId)
        if (pid && typeof oldHash === 'string' && /^[a-f0-9]{40,}$/.test(oldHash.trim())) {
            await decrementOrDelete(pid, oldHash.trim())
        }
    }

    function triggerReplacementUpload(key: string, index: number) {
        fileInputs[`${key}-${index}`]?.click()
    }

    async function handleReplacementDrop(key: string, index: number, e: DragEvent) {
        e.preventDefault()
        const file = e.dataTransfer?.files?.[0]
        if (file) {
            const mockEvent = { target: { files: [file] } } as any
            await handleReplacementImageFileChange(key, index, mockEvent)
        }
    }

    async function applyReplacementImageDimensions(key: string, index: number) {
        const list = Array.isArray(currentValues[key]) ? [...currentValues[key]] : []
        const rule = list[index]
        if (!rule || !rule.image) return

        const pid = get(projectId)
        if (!pid) return

        try {
            const img = await getImage(pid, rule.image)
            if (img) {
                list[index] = {
                    ...rule,
                    width: `calc(${img.width}px * var(--scale-ratio, 1))`,
                    height: `calc(${img.height}px * var(--scale-ratio, 1))`
                }
                handleAttrChange(key, list)
            }
        } catch (err) {
            console.error('获取图片尺寸失败', err)
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
                } else if (p.type === 'color' && p.default !== undefined) {
                    val = p.default
                } else if ((p.type === 'text' || p.type === 'json' || p.type === 'overlayServices') && p.default !== undefined) {
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
            {#if !p.showIf || (Array.isArray(p.showIf.value) ? p.showIf.value.includes(currentValues[p.showIf.key]) : currentValues[p.showIf.key] === p.showIf.value)}
                {#if p.type === 'columnLabels'}
                    {#if p.group}
                        <PropertyRow label={`${p.label}`} alignTop={true}>
                            {@const globalWidthMode = currentValues['columnWidthMode'] ?? 'balanced'}
                            <div class="overlay-list">
                                {#if Array.isArray(currentValues[p.key]) && currentValues[p.key].length > 0}
                                    {#each currentValues[p.key] as col, index}
                                        {@const colObj =
                                            typeof col === 'string'
                                                ? {
                                                      id: '',
                                                      label: col,
                                                      frozen: false,
                                                      previewLength: 10,
                                                      widthValue: 0,
                                                      widthUnit: 'px'
                                                  }
                                                : {
                                                      id: col?.id ?? '',
                                                      frozen: false,
                                                      previewLength: col?.previewLength ?? 10,
                                                      widthValue: col?.widthValue ?? 0,
                                                      widthUnit: col?.widthUnit ?? 'px',
                                                      ...col
                                                  }}
                                        <div class="overlay-row">
                                            <div class="overlay-item">
                                                <div class="overlay-fields">
                                                    <div class="overlay-field-row">
                                                        <span class="overlay-field-label">标识</span>
                                                        <input
                                                            type="text"
                                                            class="overlay-input"
                                                            value={colObj.id}
                                                            oninput={(e) => {
                                                                const list = [...currentValues[p.key]]
                                                                const oldVal =
                                                                    typeof list[index] === 'string'
                                                                        ? {
                                                                              id: '',
                                                                              label: list[index],
                                                                              frozen: false,
                                                                              previewLength: 10,
                                                                              widthMode: 'balanced',
                                                                              widthValue: 0,
                                                                              widthUnit: 'px'
                                                                          }
                                                                        : {
                                                                              id: list[index]?.id ?? '',
                                                                              frozen: false,
                                                                              previewLength: list[index]?.previewLength ?? 10,
                                                                              widthMode: list[index]?.widthMode === 'chars' ? 'chars' : list[index]?.widthMode === 'value' ? 'value' : 'balanced',
                                                                              widthValue: list[index]?.widthValue ?? 0,
                                                                              widthUnit: list[index]?.widthUnit ?? 'px',
                                                                              ...(list[index] || {})
                                                                          }
                                                                list[index] = {
                                                                    ...oldVal,
                                                                    id: (e.currentTarget as HTMLInputElement).value
                                                                }
                                                                handleAttrChange(p.key, list)
                                                            }}
                                                            placeholder="列标识"
                                                        />
                                                    </div>
                                                    <div class="overlay-field-row">
                                                        <span class="overlay-field-label">列名</span>
                                                        <input
                                                            type="text"
                                                            class="overlay-input"
                                                            value={colObj.label}
                                                            oninput={(e) => {
                                                                const list = [...currentValues[p.key]]
                                                                const oldVal =
                                                                    typeof list[index] === 'string'
                                                                        ? {
                                                                              id: '',
                                                                              label: list[index],
                                                                              frozen: false,
                                                                              previewLength: 10,
                                                                              widthMode: 'balanced',
                                                                              widthValue: 0,
                                                                              widthUnit: 'px'
                                                                          }
                                                                        : {
                                                                              id: list[index]?.id ?? '',
                                                                              frozen: false,
                                                                              previewLength: list[index]?.previewLength ?? 10,
                                                                              widthMode: list[index]?.widthMode === 'chars' ? 'chars' : list[index]?.widthMode === 'value' ? 'value' : 'balanced',
                                                                              widthValue: list[index]?.widthValue ?? 0,
                                                                              widthUnit: list[index]?.widthUnit ?? 'px',
                                                                              ...(list[index] || {})
                                                                          }
                                                                list[index] = {
                                                                    ...oldVal,
                                                                    label: (e.currentTarget as HTMLInputElement).value
                                                                }
                                                                handleAttrChange(p.key, list)
                                                            }}
                                                            placeholder="列名"
                                                        />
                                                    </div>
                                                    <div class="overlay-field-row">
                                                        <span class="overlay-field-label">字数</span>
                                                        <input
                                                            type="number"
                                                            class="overlay-input"
                                                            value={colObj.previewLength ?? 10}
                                                            oninput={(e) => {
                                                                const list = [...currentValues[p.key]]
                                                                const oldVal =
                                                                    typeof list[index] === 'string'
                                                                        ? {
                                                                              label: list[index],
                                                                              frozen: false,
                                                                              previewLength: 10,
                                                                              widthMode: 'balanced',
                                                                              widthValue: 0,
                                                                              widthUnit: 'px'
                                                                          }
                                                                        : {
                                                                              frozen: false,
                                                                              previewLength: list[index]?.previewLength ?? 10,
                                                                              widthMode: list[index]?.widthMode === 'chars' ? 'chars' : list[index]?.widthMode === 'value' ? 'value' : 'balanced',
                                                                              widthValue: list[index]?.widthValue ?? 0,
                                                                              widthUnit: list[index]?.widthUnit ?? 'px',
                                                                              ...(list[index] || {})
                                                                          }
                                                                const len = parseInt((e.currentTarget as HTMLInputElement).value)
                                                                list[index] = { ...oldVal, previewLength: Number.isFinite(len) && len > 0 ? len : 10 }
                                                                handleAttrChange(p.key, list)
                                                            }}
                                                            placeholder="预览字数"
                                                            min="0"
                                                        />
                                                    </div>
                                                    {#if globalWidthMode === 'value'}
                                                        <div class="overlay-field-row">
                                                            <span class="overlay-field-label">数值</span>
                                                            <div class="overlay-field-inline">
                                                                <input
                                                                    type="number"
                                                                    class="overlay-input overlay-value-input"
                                                                    min="0"
                                                                    value={colObj.widthValue ?? 0}
                                                                    oninput={(e) => {
                                                                        const v = parseFloat((e.currentTarget as HTMLInputElement).value)
                                                                        const num = isNaN(v) || v < 0 ? 0 : v
                                                                        const list = [...currentValues[p.key]]
                                                                        const oldVal =
                                                                            typeof list[index] === 'string'
                                                                                ? {
                                                                                      label: list[index],
                                                                                      frozen: false,
                                                                                      previewLength: 10,
                                                                                      widthMode: 'value',
                                                                                      widthValue: 0,
                                                                                      widthUnit: 'px'
                                                                                  }
                                                                                : {
                                                                                      frozen: false,
                                                                                      previewLength: list[index]?.previewLength ?? 10,
                                                                                      widthMode: list[index]?.widthMode === 'chars' ? 'chars' : 'value',
                                                                                      widthValue: list[index]?.widthValue ?? 0,
                                                                                      widthUnit: list[index]?.widthUnit ?? 'px',
                                                                                      ...(list[index] || {})
                                                                                  }
                                                                        list[index] = { ...oldVal, widthValue: num }
                                                                        handleAttrChange(p.key, list)
                                                                    }}
                                                                    placeholder="宽度"
                                                                />
                                                                <button
                                                                    class="unit-toggle"
                                                                    onclick={() => {
                                                                        const nextUnit = colObj.widthUnit === 'px' ? '%' : 'px'
                                                                        const list = [...currentValues[p.key]]
                                                                        const oldVal =
                                                                            typeof list[index] === 'string'
                                                                                ? {
                                                                                      label: list[index],
                                                                                      frozen: false,
                                                                                      previewLength: 10,
                                                                                      widthMode: 'value',
                                                                                      widthValue: 0,
                                                                                      widthUnit: 'px'
                                                                                  }
                                                                                : {
                                                                                      frozen: false,
                                                                                      previewLength: list[index]?.previewLength ?? 10,
                                                                                      widthMode: list[index]?.widthMode === 'chars' ? 'chars' : 'value',
                                                                                      widthValue: list[index]?.widthValue ?? 0,
                                                                                      widthUnit: list[index]?.widthUnit ?? 'px',
                                                                                      ...(list[index] || {})
                                                                                  }
                                                                        list[index] = { ...oldVal, widthUnit: nextUnit }
                                                                        handleAttrChange(p.key, list)
                                                                    }}
                                                                >
                                                                    {colObj.widthUnit}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    {/if}
                                                    {#if globalWidthMode !== 'balanced'}
                                                        <div class="overlay-field-row">
                                                            <span class="overlay-field-label">冻结</span>
                                                            <div style="display: flex; align-items: center; justify-content: flex-start; flex: 1;">
                                                                <ToggleSwitch
                                                                    checked={colObj.frozen}
                                                                    on:change={(e) => {
                                                                        const list = [...currentValues[p.key]]
                                                                        const oldVal =
                                                                            typeof list[index] === 'string'
                                                                                ? {
                                                                                      label: list[index],
                                                                                      frozen: false,
                                                                                      previewLength: 10,
                                                                                      widthMode: 'balanced',
                                                                                      widthValue: 0,
                                                                                      widthUnit: 'px'
                                                                                  }
                                                                                : {
                                                                                      frozen: false,
                                                                                      previewLength: list[index]?.previewLength ?? 10,
                                                                                      widthMode: list[index]?.widthMode === 'chars' ? 'chars' : list[index]?.widthMode === 'value' ? 'value' : 'balanced',
                                                                                      widthValue: list[index]?.widthValue ?? 0,
                                                                                      widthUnit: list[index]?.widthUnit ?? 'px',
                                                                                      ...(list[index] || {})
                                                                                  }
                                                                        list[index] = { ...oldVal, frozen: e.detail }
                                                                        handleAttrChange(p.key, list)
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    {/if}
                                                    <div class="overlay-field-row">
                                                        <span class="overlay-field-label">编辑</span>
                                                        <div style="display: flex; align-items: center; justify-content: flex-start; flex: 1;">
                                                            <ToggleSwitch
                                                                checked={colObj.editable ?? false}
                                                                on:change={(e) => {
                                                                    const list = [...currentValues[p.key]]
                                                                    const oldVal =
                                                                        typeof list[index] === 'string'
                                                                            ? {
                                                                                  label: list[index],
                                                                                  frozen: false,
                                                                                  previewLength: 10,
                                                                                  widthMode: 'balanced',
                                                                                  widthValue: 0,
                                                                                  widthUnit: 'px',
                                                                                  editable: false
                                                                              }
                                                                            : {
                                                                                  frozen: false,
                                                                                  previewLength: list[index]?.previewLength ?? 10,
                                                                                  widthMode: list[index]?.widthMode === 'chars' ? 'chars' : list[index]?.widthMode === 'value' ? 'value' : 'balanced',
                                                                                  widthValue: list[index]?.widthValue ?? 0,
                                                                                  widthUnit: list[index]?.widthUnit ?? 'px',
                                                                                  editable: list[index]?.editable ?? false,
                                                                                  ...(list[index] || {})
                                                                              }
                                                                    list[index] = { ...oldVal, editable: e.detail }
                                                                    handleAttrChange(p.key, list)
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="overlay-row-actions">
                                                {#if index === 0}
                                                    <button class="unit-toggle add-btn" onclick={addColumn} title="添加新行" style="background: rgba(34, 197, 94, 0.2); color: #4ade80;">+</button>
                                                {:else}
                                                    <button class="unit-toggle remove-btn" onclick={() => removeColumn(index)} title="移除列" style="background: rgba(239, 68, 68, 0.2); color: #f87171;">−</button>
                                                {/if}
                                            </div>
                                        </div>
                                    {/each}
                                {:else}
                                    <div class="overlay-empty">暂无列定义</div>
                                    <div class="overlay-row-actions" style="justify-content: center; margin-top: 8px;">
                                        <button class="unit-toggle add-btn" onclick={addColumn} title="添加新行" style="background: rgba(34, 197, 94, 0.2); color: #4ade80;">+</button>
                                    </div>
                                {/if}
                            </div>
                        </PropertyRow>
                    {:else}
                        <div class="column-labels-editor">
                            {#if Array.isArray(currentValues[p.key]) && currentValues[p.key].length > 0}
                                {#each currentValues[p.key] as label, index}
                                    <PropertyRow label={`${p.label}`} labelVisible={index === 0}>
                                        <div class="column-label-item">
                                            <input
                                                type="text"
                                                class="overlay-input column-label-input"
                                                value={typeof label === 'string' ? label : (label?.label ?? '')}
                                                oninput={(e) => {
                                                    const newLabels = [...currentValues[p.key]]
                                                    newLabels[index] = (e.currentTarget as HTMLInputElement).value
                                                    handleAttrChange(p.key, newLabels)
                                                }}
                                                placeholder="列名"
                                            />
                                            {#if index === 0}
                                                <button class="unit-toggle add-btn" onclick={addColumn} title="添加新行" style="background: rgba(34, 197, 94, 0.2); color: #4ade80;">+</button>
                                            {:else}
                                                <button class="unit-toggle remove-btn" onclick={() => removeColumn(index)} title="移除列" style="background: rgba(239, 68, 68, 0.2); color: #f87171;">−</button>
                                            {/if}
                                        </div>
                                    </PropertyRow>
                                {/each}
                            {:else}
                                <PropertyRow label={`${p.label}`}>
                                    <div class="column-labels-header">
                                        <button class="unit-toggle add-btn" onclick={addColumn} title="添加新行" style="background: rgba(34, 197, 94, 0.2); color: #4ade80;">+</button>
                                    </div>
                                </PropertyRow>
                            {/if}
                        </div>
                    {/if}
                {:else if p.group && p.type === 'overlayServices'}
                    <PropertyRow label={`${p.label}`} alignTop={true}>
                        <div class="overlay-list">
                            {#if Array.isArray(currentValues[p.key]) && currentValues[p.key].length > 0}
                                {#each currentValues[p.key] as svc, index}
                                    <div class="overlay-row">
                                        <div class="overlay-item">
                                            <div class="overlay-fields">
                                                <div class="overlay-field-row">
                                                    <span class="overlay-field-label">标记</span>
                                                    <input
                                                        type="text"
                                                        class="overlay-input"
                                                        value={svc?.id ?? ''}
                                                        oninput={(e) => {
                                                            const list = Array.isArray(currentValues[p.key]) ? [...currentValues[p.key]] : []
                                                            if (!list[index]) list[index] = {}
                                                            list[index] = {
                                                                ...list[index],
                                                                id: (e.currentTarget as HTMLInputElement).value
                                                            }
                                                            handleAttrChange(p.key, list)
                                                        }}
                                                    />
                                                </div>
                                                <div class="overlay-field-row">
                                                    <span class="overlay-field-label">名称</span>
                                                    <input
                                                        type="text"
                                                        class="overlay-input"
                                                        value={svc?.name ?? ''}
                                                        oninput={(e) => {
                                                            const list = Array.isArray(currentValues[p.key]) ? [...currentValues[p.key]] : []
                                                            if (!list[index]) list[index] = {}
                                                            list[index] = {
                                                                ...list[index],
                                                                name: (e.currentTarget as HTMLInputElement).value
                                                            }
                                                            handleAttrChange(p.key, list)
                                                        }}
                                                    />
                                                </div>
                                                <div class="overlay-field-row">
                                                    <span class="overlay-field-label">路径</span>
                                                    <input
                                                        type="text"
                                                        class="overlay-input"
                                                        value={svc?.url ?? ''}
                                                        oninput={(e) => {
                                                            const list = Array.isArray(currentValues[p.key]) ? [...currentValues[p.key]] : []
                                                            if (!list[index]) list[index] = {}
                                                            list[index] = {
                                                                ...list[index],
                                                                url: (e.currentTarget as HTMLInputElement).value
                                                            }
                                                            handleAttrChange(p.key, list)
                                                        }}
                                                    />
                                                </div>
                                                <div class="overlay-field-row">
                                                    <span class="overlay-field-label">透明</span>
                                                    <input
                                                        type="number"
                                                        class="overlay-input overlay-opacity"
                                                        min="0"
                                                        max="1"
                                                        step="0.05"
                                                        value={svc?.opacity ?? 1}
                                                        oninput={(e) => {
                                                            const v = parseFloat((e.currentTarget as HTMLInputElement).value)
                                                            const num = isNaN(v) ? 1 : Math.max(0, Math.min(1, v))
                                                            const list = Array.isArray(currentValues[p.key]) ? [...currentValues[p.key]] : []
                                                            if (!list[index]) list[index] = {}
                                                            list[index] = {
                                                                ...list[index],
                                                                opacity: num
                                                            }
                                                            handleAttrChange(p.key, list)
                                                        }}
                                                    />
                                                </div>
                                                <div class="overlay-field-row">
                                                    <span class="overlay-field-label">层级</span>
                                                    <input
                                                        type="number"
                                                        class="overlay-input overlay-zindex"
                                                        value={svc?.zIndex ?? 0}
                                                        oninput={(e) => {
                                                            const v = parseInt((e.currentTarget as HTMLInputElement).value, 10)
                                                            const num = isNaN(v) ? 0 : v
                                                            const list = Array.isArray(currentValues[p.key]) ? [...currentValues[p.key]] : []
                                                            if (!list[index]) list[index] = {}
                                                            list[index] = {
                                                                ...list[index],
                                                                zIndex: num
                                                            }
                                                            handleAttrChange(p.key, list)
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div class="overlay-row-actions">
                                            {#if index === 0}
                                                <button class="unit-toggle add-btn" onclick={() => addOverlay(p.key)} title="添加叠加服务" style="background: rgba(34, 197, 94, 0.2); color: #4ade80;">+</button>
                                            {:else}
                                                <button class="unit-toggle remove-btn" onclick={() => removeOverlay(p.key, index)} title="移除叠加服务" style="background: rgba(239, 68, 68, 0.2); color: #f87171;">−</button>
                                            {/if}
                                        </div>
                                    </div>
                                {/each}
                            {:else}
                                <div class="overlay-empty">暂无叠加服务</div>
                            {/if}
                        </div>
                    </PropertyRow>
                {:else if p.group && p.type === 'replacementRules'}
                    <PropertyRow label={`${p.label}`} alignTop={true}>
                        <div class="overlay-list">
                            {#if Array.isArray(currentValues[p.key]) && currentValues[p.key].length > 0}
                                {#each currentValues[p.key] as rule, index}
                                    <div class="overlay-row">
                                        <div class="overlay-item">
                                            <div class="overlay-fields">
                                                <div class="overlay-field-row">
                                                    <span class="overlay-field-label">规则</span>
                                                    <input
                                                        type="text"
                                                        class="overlay-input"
                                                        value={rule?.rule ?? ''}
                                                        oninput={(e) => {
                                                            const list = Array.isArray(currentValues[p.key]) ? [...currentValues[p.key]] : []
                                                            if (!list[index]) list[index] = {}
                                                            list[index] = {
                                                                ...list[index],
                                                                rule: (e.currentTarget as HTMLInputElement).value
                                                            }
                                                            handleAttrChange(p.key, list)
                                                        }}
                                                        placeholder="匹配内容"
                                                    />
                                                </div>
                                                <div class="overlay-field-row">
                                                    <span class="overlay-field-label">图片</span>
                                                    <div class="image-uploader" style="width: 100%;">
                                                        {#if !rule?.image}
                                                            <button class="input-style" onclick={() => triggerReplacementUpload(p.key, index)} ondragover={handleDragOver} ondrop={(e) => handleReplacementDrop(p.key, index, e)} title="点击上传或拖拽图片到此处">上传图片</button>
                                                        {:else}
                                                            <div class="remove-image-wrapper">
                                                                <button class="input-style remove-button" onclick={() => handleRemoveReplacementImage(p.key, index)} title="移除图片" style="background: rgba(239, 68, 68, 0.2); color: #f87171;">移除</button>
                                                                <button class="unit-toggle ratio-overlay" onclick={() => applyReplacementImageDimensions(p.key, index)} title="一键匹配原尺寸">
                                                                    <Icon name="Ratio" size={16} />
                                                                </button>
                                                            </div>
                                                        {/if}
                                                        <input type="file" accept="image/*" style="display:none" use:bindFileInput={`${p.key}-${index}`} onchange={(e) => handleReplacementImageFileChange(p.key, index, e)} />
                                                        {#if isUploading}
                                                            <div class="upload-progress" style="margin-top: calc(8px * var(--scale-ratio, 1));">
                                                                <div style="flex: 1; position: relative; height: calc(4px * var(--scale-ratio, 1)); background: rgba(255, 255, 255, 0.1); border-radius: calc(2px * var(--scale-ratio, 1));">
                                                                    <div style="height: 100%; background: linear-gradient(90deg, #6366f1, #7c3aed); border-radius: calc(2px * var(--scale-ratio, 1)); transition: width 0.3s ease; width: {uploadProgress}%"></div>
                                                                </div>
                                                                <span style="font-size: calc(12px * var(--scale-ratio, 1)); color: rgba(255, 255, 255, 0.7); margin-left: calc(8px * var(--scale-ratio, 1));">{uploadProgress}%</span>
                                                            </div>
                                                        {/if}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="overlay-row-actions">
                                            {#if index === 0}
                                                <button class="unit-toggle add-btn" onclick={() => addReplacementRule(p.key)} title="添加规则" style="background: rgba(34, 197, 94, 0.2); color: #4ade80;">+</button>
                                            {:else}
                                                <button class="unit-toggle remove-btn" onclick={() => removeReplacementRule(p.key, index)} title="移除规则" style="background: rgba(239, 68, 68, 0.2); color: #f87171;">−</button>
                                            {/if}
                                        </div>
                                    </div>
                                {/each}
                            {:else}
                                <div class="overlay-empty">暂无替换规则</div>
                                <div class="overlay-row-actions" style="justify-content: center; margin-top: 8px;">
                                    <button class="unit-toggle add-btn" onclick={() => addReplacementRule(p.key)} title="添加规则" style="background: rgba(34, 197, 94, 0.2); color: #4ade80;">+</button>
                                </div>
                            {/if}
                        </div>
                    </PropertyRow>
                {:else if p.group && p.type === 'queryConditions'}
                    <PropertyRow label={`${p.label}`} alignTop={true}>
                        <div class="overlay-list">
                            {#if Array.isArray(currentValues[p.key]) && currentValues[p.key].length > 0}
                                {#each currentValues[p.key] as cond, index}
                                    <div class="overlay-row">
                                        <div class="overlay-item {cond?.disabled ? 'overlay-item-disabled' : ''}">
                                            <div class="overlay-fields">
                                                <div class="overlay-field-row">
                                                    <span class="overlay-field-label">标识</span>
                                                    <input
                                                        type="text"
                                                        class="overlay-input"
                                                        value={cond?.id ?? ''}
                                                        disabled={cond?.disabled === true}
                                                        oninput={(e) => {
                                                            const list = Array.isArray(currentValues[p.key]) ? [...currentValues[p.key]] : []
                                                            if (!list[index]) list[index] = {}
                                                            list[index] = {
                                                                ...list[index],
                                                                id: (e.currentTarget as HTMLInputElement).value
                                                            }
                                                            handleAttrChange(p.key, list)
                                                        }}
                                                        placeholder="查询条件标识"
                                                    />
                                                </div>
                                                <div class="overlay-field-row">
                                                    <span class="overlay-field-label">名称</span>
                                                    <input
                                                        type="text"
                                                        class="overlay-input"
                                                        value={cond?.name ?? ''}
                                                        disabled={cond?.disabled === true}
                                                        oninput={(e) => {
                                                            const list = Array.isArray(currentValues[p.key]) ? [...currentValues[p.key]] : []
                                                            if (!list[index]) list[index] = {}
                                                            list[index] = {
                                                                ...list[index],
                                                                name: (e.currentTarget as HTMLInputElement).value
                                                            }
                                                            handleAttrChange(p.key, list)
                                                        }}
                                                        placeholder="查询条件名称"
                                                    />
                                                </div>
                                                <div class="overlay-field-row">
                                                    <span class="overlay-field-label">禁用</span>
                                                    <div style="display: flex; align-items: center; justify-content: flex-start; flex: 1;">
                                                        <ToggleSwitch
                                                            checked={cond?.disabled ?? false}
                                                            on:change={(e) => {
                                                                const list = Array.isArray(currentValues[p.key]) ? [...currentValues[p.key]] : []
                                                                if (!list[index]) list[index] = {}
                                                                list[index] = {
                                                                    ...list[index],
                                                                    disabled: e.detail
                                                                }
                                                                handleAttrChange(p.key, list)
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="overlay-row-actions">
                                            {#if index === 0}
                                                <button class="unit-toggle add-btn" onclick={() => addQueryCondition(p.key)} title="添加查询条件" style="background: rgba(34, 197, 94, 0.2); color: #4ade80;">+</button>
                                            {:else}
                                                <button class="unit-toggle remove-btn" onclick={() => removeQueryCondition(p.key, index)} title="移除查询条件" style="background: rgba(239, 68, 68, 0.2); color: #f87171;">−</button>
                                            {/if}
                                        </div>
                                    </div>
                                {/each}
                            {:else}
                                <div class="overlay-empty">暂无查询条件</div>
                                <div class="overlay-row-actions" style="justify-content: center; margin-top: 8px;">
                                    <button class="unit-toggle add-btn" onclick={() => addQueryCondition(p.key)} title="添加查询条件" style="background: rgba(34, 197, 94, 0.2); color: #4ade80;">+</button>
                                </div>
                            {/if}
                        </div>
                    </PropertyRow>
                {:else if p.group && p.type === 'toolbarButtons'}
                    <PropertyRow label={`${p.label}`} alignTop={true}>
                        <div class="overlay-list">
                            {#if Array.isArray(currentValues[p.key]) && currentValues[p.key].length > 0}
                                {#each currentValues[p.key] as btn, index}
                                    <div class="overlay-row">
                                        <div class="overlay-item {btn?.disabled ? 'overlay-item-disabled' : ''}">
                                            <div class="overlay-fields">
                                                <div class="overlay-field-row">
                                                    <span class="overlay-field-label">名称</span>
                                                    <input
                                                        type="text"
                                                        class="overlay-input"
                                                        value={btn?.name ?? ''}
                                                        disabled={index < 4}
                                                        oninput={(e) => {
                                                            const list = Array.isArray(currentValues[p.key]) ? [...currentValues[p.key]] : []
                                                            if (!list[index]) list[index] = {}
                                                            list[index] = {
                                                                ...list[index],
                                                                name: (e.currentTarget as HTMLInputElement).value
                                                            }
                                                            handleAttrChange(p.key, list)
                                                        }}
                                                        placeholder="按钮名称"
                                                    />
                                                </div>
                                                <div class="overlay-field-row">
                                                    <span class="overlay-field-label">图标</span>
                                                    <select
                                                        class="overlay-input"
                                                        value={btn?.icon ?? 'search'}
                                                        disabled={index < 4}
                                                        onchange={(e) => {
                                                            const list = Array.isArray(currentValues[p.key]) ? [...currentValues[p.key]] : []
                                                            if (!list[index]) list[index] = {}
                                                            list[index] = {
                                                                ...list[index],
                                                                icon: (e.currentTarget as HTMLSelectElement).value || 'search'
                                                            }
                                                            handleAttrChange(p.key, list)
                                                        }}
                                                    >
                                                        <option value="search">查询</option>
                                                        <option value="add">新增</option>
                                                        <option value="delete">删除</option>
                                                        <option value="excel">输出excel</option>
                                                    </select>
                                                </div>
                                                <div class="overlay-field-row">
                                                    <span class="overlay-field-label">禁用</span>
                                                    <div style="display: flex; align-items: center; justify-content: flex-start; flex: 1;">
                                                        <ToggleSwitch
                                                            checked={btn?.disabled ?? false}
                                                            on:change={(e) => {
                                                                const list = Array.isArray(currentValues[p.key]) ? [...currentValues[p.key]] : []
                                                                if (!list[index]) list[index] = {}
                                                                list[index] = {
                                                                    ...list[index],
                                                                    disabled: e.detail
                                                                }
                                                                handleAttrChange(p.key, list)
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="overlay-row-actions">
                                            {#if index === 0}
                                                <button class="unit-toggle add-btn" onclick={() => addToolbarButton(p.key)} title="添加按钮" style="background: rgba(34, 197, 94, 0.2); color: #4ade80;">+</button>
                                            {:else if index >= 4}
                                                <button class="unit-toggle remove-btn" onclick={() => removeToolbarButton(p.key, index)} title="移除按钮" style="background: rgba(239, 68, 68, 0.2); color: #f87171;">−</button>
                                            {:else}
                                                <!-- 占位按钮，保持与查询条件组一致的右侧宽度 -->
                                                <button class="unit-toggle" style="visibility: hidden;">+</button>
                                            {/if}
                                        </div>
                                    </div>
                                {/each}
                            {:else}
                                <div class="overlay-empty">暂无功能按钮</div>
                                <div class="overlay-row-actions" style="justify-content: center; margin-top: 8px;">
                                    <button class="unit-toggle add-btn" onclick={() => addToolbarButton(p.key)} title="添加按钮" style="background: rgba(34, 197, 94, 0.2); color: #4ade80;">+</button>
                                </div>
                            {/if}
                        </div>
                    </PropertyRow>
                {:else}
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
                                        <button
                                            class="unit-toggle ratio-overlay"
                                            onclick={async () => {
                                                if (!selectedId || !currentValues[p.key]) return
                                                const pid = get(projectId)
                                                if (!pid) return
                                                try {
                                                    const img = await getImage(pid, currentValues[p.key])
                                                    if (img) {
                                                        if (p.key === 'contentBackgroundImage') {
                                                            updateNodeProps(selectedId, { attributes: { contentWidth: `${img.width}px`, contentHeight: `${img.height}px` } })
                                                        } else {
                                                            updateNodeProps(selectedId, { styles: { width: `${img.width}px`, height: `${img.height}px` } })
                                                        }
                                                    }
                                                } catch (err) {
                                                    console.error(err)
                                                }
                                            }}
                                            title="一键匹配原尺寸"
                                        >
                                            <Icon name="Ratio" size={16} />
                                        </button>
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
                            <ToggleSwitch checked={currentValues[p.key] ?? false} on:change={(e: CustomEvent<boolean>) => handleAttrChange(p.key, e.detail)} />
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
                        {:else if p.type === 'color'}
                            <ColorPicker value={currentValues[p.key] || p.default} projectId={$projectId} componentId={`${selectedId || 'default'}-${p.key}`} onchange={(color: string) => handleAttrChange(p.key, color)} />
                        {:else if p.type === 'button'}
                            <button class="input-style" onclick={() => handleAttrChange(p.key, !currentValues[p.key])}>{p.text ?? p.label}</button>
                        {/if}
                        <!-- 其他类型控件可在此扩展 -->
                    </PropertyRow>
                {/if}
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

    /* 确保ColorPicker组件宽度一致 */
    :global(.feature-editor .color-picker-container) {
        flex: 1;
        min-width: 0;
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
        flex: 1;
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
        display: flex;
        gap: calc(4px * var(--scale-ratio, 1));
        align-items: center;
    }
    .ratio-overlay {
        width: calc(24px * var(--scale-ratio, 1));
        height: calc(24px * var(--scale-ratio, 1));
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(15, 23, 42, 0.8);
        border: calc(1px * var(--scale-ratio, 1)) solid rgba(255, 255, 255, 0.2);
        border-radius: calc(4px * var(--scale-ratio, 1));
        color: #e2e8f0;
        cursor: pointer;
        z-index: 2;
        transition: all 0.2s;
    }
    .ratio-overlay:hover {
        background: #3b82f6;
        border-color: #60a5fa;
    }
    .ratio-overlay:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        background: rgba(15, 23, 42, 0.5);
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
        position: sticky;
        top: 0;
        z-index: 1;
        margin: 0 0 calc(16px * var(--scale-ratio, 1)) 0;
        padding: calc(8px * var(--scale-ratio, 1)) 0 calc(8px * var(--scale-ratio, 1)) 0;
        font-size: calc(16px * var(--scale-ratio, 1));
        font-weight: 600;
        color: #cbd5e1;
        background: radial-gradient(circle at top left, rgba(148, 163, 184, 0.12), transparent 55%), #0f172a;
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

    /* 动态表格列标签编辑器样式 */
    .overlay-list {
        display: flex;
        flex-direction: column;
        gap: calc(8px * var(--scale-ratio, 1));
        flex: 1 1 0;
        min-width: 0;
        width: 100%;
        box-sizing: border-box;
    }

    .overlay-row {
        display: flex;
        align-items: flex-start;
        gap: calc(8px * var(--scale-ratio, 1));
        width: 100%;
        box-sizing: border-box;
    }

    .overlay-item {
        display: flex;
        flex: 1 1 0;
        padding: calc(10px * var(--scale-ratio, 1));
        border-radius: calc(8px * var(--scale-ratio, 1));
        border: calc(1px * var(--scale-ratio, 1)) solid rgba(148, 163, 184, 0.45);
        background: rgba(15, 23, 42, 0.7);
    }

    .overlay-item-disabled {
        opacity: 0.6;
        background: rgba(15, 23, 42, 0.4);
    }

    .overlay-fields {
        display: flex;
        flex-direction: column;
        gap: calc(6px * var(--scale-ratio, 1));
        flex: 1 1 0;
    }

    .overlay-field-row {
        display: flex;
        align-items: center;
        width: 100%;
    }

    .overlay-field-inline {
        display: flex;
        align-items: center;
        gap: calc(6px * var(--scale-ratio, 1));
    }

    .overlay-field-label {
        width: calc(40px * var(--scale-ratio, 1));
        font-size: calc(12px * var(--scale-ratio, 1));
        color: #9ca3af;
        flex-shrink: 0;
    }

    .overlay-row-actions {
        display: flex;
        flex-direction: column;
        gap: calc(6px * var(--scale-ratio, 1));
        align-items: center;
        justify-content: flex-start;
    }

    .overlay-input {
        flex: 1 1 0;
        padding: calc(8px * var(--scale-ratio, 1)) calc(12px * var(--scale-ratio, 1));
        border: calc(1px * var(--scale-ratio, 1)) solid rgba(255, 255, 255, 0.2);
        border-radius: calc(6px * var(--scale-ratio, 1));
        font-size: calc(13px * var(--scale-ratio, 1));
        background: rgba(255, 255, 255, 0.1);
        color: #e2e8f0;
        transition: all 0.3s ease;
        min-width: 0;
    }

    select.overlay-input {
        background: rgba(30, 41, 59, 0.95);
    }

    select.overlay-input option {
        background: #1e293b;
        color: #e2e8f0;
        padding: calc(8px * var(--scale-ratio, 1)) calc(12px * var(--scale-ratio, 1));
    }

    select.overlay-input option:hover,
    select.overlay-input option:focus,
    select.overlay-input option:checked {
        color: #e2e8f0;
    }

    .overlay-value-input {
        flex: 0 0 auto;
        width: calc(140px * var(--scale-ratio, 1));
    }

    .overlay-input:focus {
        outline: none;
        border-color: #6366f1;
        background: rgba(255, 255, 255, 0.15);
        box-shadow: 0 0 0 calc(2px * var(--scale-ratio, 1)) rgba(99, 102, 241, 0.2);
    }

    .overlay-input::placeholder {
        color: #9ca3af;
    }

    .column-labels-editor {
        display: flex;
        flex-direction: column;
        gap: calc(4px * var(--scale-ratio, 1));
        width: 100%;
    }

    .column-label-item {
        display: flex;
        align-items: center;
        gap: calc(8px * var(--scale-ratio, 1));
        width: 100%;
    }

    .column-label-input {
        flex: 1;
        min-width: 0;
    }

    .column-labels-header {
        display: flex;
        justify-content: flex-start;
        width: 100%;
    }
</style>
