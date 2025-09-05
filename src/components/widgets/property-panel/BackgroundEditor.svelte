<!--
  BackgroundEditor.svelte
  背景样式编辑器组件
  功能：
  - 图片上传并存储为Blob URL（避免使用base64）
  - 背景尺寸设置（横轴/纵轴，默认100%）
  - 背景位置设置（横轴/纵轴，默认50%）
  - 平铺方式选择（默认不重复）

  使用说明：
  - 支持拖拽上传图片
  - 图片以Blob URL形式存储在doms表的style字段中
  - 背景样式直接应用于DOM元素
  - 组件卸载时自动清理Blob URL避免内存泄漏
-->
<script lang="ts">
    import { onDestroy } from 'svelte'
    import { get } from 'svelte/store'

    import { getNodePropsStore, getNodeProps as _getNodeProps, updateNodeProps, getFullNode } from '../../../services/property-panel/property-panel.service'
    import { getElementByNodeId } from '../../../services/utils/dom-geometry.util'
    import { getScaleRatio } from '../../../services/utils/get-scale-ratio.util'
    import { projectId } from '../../../services/repository/dom-tree.store.svelte'
    import { ProjectThumbnailService } from '../../../services/project/project-thumbnail.service'
    import ColorPaletteService from '../../../services/project/color-palette.service'
    import ColorPicker from '../ColorPicker.svelte'
    import ResponsiveSlider from '../ResponsiveSlider.svelte'
    import ToggleSwitch from '../ToggleSwitch.svelte'
    import PropertyRow from './PropertyRow.svelte'
    import PropertySelect from './PropertySelect.svelte'
    import SizeInput from './SizeInput.svelte'
    import Icon from '../Icon.svelte'
    import { hashBlob, convertTo, canDecode } from '../../../services/image/image-utils'
    import { getImage, addOrIncrement } from '../../../services/database/image-store.service'
    import { processImageUpload } from '../../../services/image/upload-image.service'
    import { useLQIP } from '../../../services/utils/use-lqip'

    // 工具函数：安全获取字符串值
    function getStringValue(value: string | Blob | undefined): string {
        return typeof value === 'string' ? value : ''
    }

    // 外部传入当前选中节点 id
    let { selectedId = null } = $props<{ selectedId?: string | null }>()

    // 通过 getNodePropsStore 订阅节点样式变化
    let unsubscribe = () => {}
    $effect(() => {
        unsubscribe()
        if (selectedId) {
            const store = getNodePropsStore(selectedId)
            unsubscribe = store.subscribe(() => {
                initBackgroundProps()
            })
        }
        return () => {
            unsubscribe()
            unsubscribe = () => {}
        }
    })

    // 背景样式状态
    let backgroundImage = $state<string | Blob>('')
    let backgroundColor = $state<string>('')
    let backgroundOpacity = $state<number>(1)
    let backgroundSizeX = $state<string>('100')
    let backgroundSizeY = $state<string>('100')
    let backgroundPositionX = $state<string>('50')
    let backgroundPositionY = $state<string>('50')
    let backgroundRepeat = $state<string>('no-repeat')
    let lastBackgroundImage = $state<string>('')
    let gradientColors = $state<Array<{ color: string; opacity: number }>>([])
    let gradientDirection = $state<string>('to right')
    let gradientRatio = $state<number>(50) // 渐变比例，0-100，控制两个颜色的占比
    let backgroundClipToText = $state<boolean>(false) // 控制背景裁剪为文字形状的开关

    // 单位设置 - 支持px和%切换
    let sizeUnitX = $state<'px' | '%'>('%')
    let sizeUnitY = $state<'px' | '%'>('%')
    let positionUnitX = $state<'px' | '%'>('%')
    let positionUnitY = $state<'px' | '%'>('%')

    // 平铺选项
    const repeatOptions = [
        { value: 'no-repeat', label: '不重复' },
        { value: 'repeat', label: '平铺' },
        { value: 'repeat-x', label: '水平平铺' },
        { value: 'repeat-y', label: '垂直平铺' },
        { value: 'round', label: '铺满' },
        { value: 'space', label: '等间距' }
    ]

    // 渐变方向选项 - 支持线性和径向渐变
    const gradientDirectionOptions = [
        { value: 'to right', label: '横向' },
        { value: 'to left', label: '横向反向' },
        { value: 'to bottom', label: '竖向' },
        { value: 'to top', label: '竖向反向' },
        { value: 'circle', label: '扩散' },
        { value: 'circle farthest-corner', label: '扩散反向' }
    ]

    // 图片文件引用
    let fileInput: HTMLInputElement
    let isUploading = $state(false)
    let uploadProgress = $state(0)
    // LQIP 订阅释放函数占位，避免未定义错误
    let unsubscribeLqip: () => void = () => {}

    // 从样式对象初始化背景属性
    async function initBackgroundProps() {
        if (!selectedId) return

        const nodeProps = _getNodeProps(selectedId)
        const styles = nodeProps?.styles || {}
        // 读取节点 attributes 中缓存的图片原始尺寸，刷新后恢复 imageSize
        const attrs = (nodeProps?.attributes || {}) as Record<string, string>
        const attrWidth = parseInt(attrs['data-img-width'] || '')
        const attrHeight = parseInt(attrs['data-img-height'] || '')

        if (!isNaN(attrWidth) && !isNaN(attrHeight) && attrWidth > 0 && attrHeight > 0) {
            if (!imageSize || imageSize.width !== attrWidth || imageSize.height !== attrHeight) {
                imageSize = { width: attrWidth, height: attrHeight }
            }
        } else if (imageSize) {
            imageSize = null
        }
        // 根据恢复的尺寸立即更新按钮禁用状态
        updateDimensionMatch()

        // 先从 styles.backgroundColor 读取背景颜色（与其他属性一致）
        const bgColorStyle = getStringValue(styles.backgroundColor)
        if (bgColorStyle) {
            const match = bgColorStyle.match(/rgba?\(([^)]+)\)/)
            if (match) {
                const parts = match[1].split(',').map((s: string) => s.trim())
                if (parts.length >= 3) {
                    const r = parseInt(parts[0])
                    const g = parseInt(parts[1])
                    const b = parseInt(parts[2])
                    const a = parts.length > 3 ? parseFloat(parts[3]) : 1
                    backgroundColor = rgbToHex(r, g, b)
                    backgroundOpacity = a
                }
            } else if (/^#([0-9A-Fa-f]{6})$/.test(bgColorStyle)) {
                backgroundColor = bgColorStyle
                backgroundOpacity = 1
            }
        }

        // 背景图片 - 直接使用 backgroundImage 字段
        backgroundImage = styles.backgroundImage || ''

        // 从CSS backgroundImage解析渐变（不存储gradientColors到数据库）
        const bgImageStr = typeof styles.backgroundImage === 'string' ? styles.backgroundImage : ''
        if (bgImageStr && (bgImageStr.startsWith('linear-gradient') || bgImageStr.startsWith('radial-gradient'))) {
            const gradientMatch = bgImageStr.match(/(linear|radial)-gradient\(([^,]+),(.+)\)/)
            if (gradientMatch) {
                gradientDirection = gradientMatch[2].trim()
                const colorStopsText = gradientMatch[3]

                // 使用更精确的正则表达式匹配颜色停止点
                const colorStopRegex = /(rgba?\([^)]+\)|#[0-9a-fA-F]{3,8}|\w+)\s*(\d*%)?/g
                const matches = Array.from(colorStopsText.matchAll(colorStopRegex))

                // 重新组织颜色停止点，找出0%和100%位置的颜色
                const colorStops = matches.map((match: RegExpMatchArray) => {
                    const fullMatch = match[0]
                    const colorPart = fullMatch.trim()

                    // 分离颜色和位置
                    const colorPositionMatch = colorPart.match(/^(.+?)\s*(\d+%)?$/)
                    if (!colorPositionMatch) return { color: '#ffffff', opacity: 1, position: -1 }

                    const colorStr = colorPositionMatch[1].trim()
                    const position = colorPositionMatch[2] || ''

                    // 解析颜色值
                    let color = colorStr
                    let opacity = 1

                    if (colorStr.startsWith('rgb')) {
                        const rgbaMatch = colorStr.match(/rgba?\(([^)]+)\)/)
                        if (rgbaMatch) {
                            const parts = rgbaMatch[1].split(',').map((s: string) => s.trim())
                            const r = parseInt(parts[0])
                            const g = parseInt(parts[1])
                            const b = parseInt(parts[2])
                            opacity = parts.length > 3 ? parseFloat(parts[3]) : 1
                            color = rgbToHex(r, g, b)
                        }
                    } else if (colorStr.startsWith('#')) {
                        color = colorStr
                        opacity = 1
                    } else {
                        // 处理颜色名称
                        color = colorStr
                        opacity = 1
                    }

                    // 解析位置百分比
                    let positionPercent = -1
                    if (position) {
                        if (position.includes('%')) {
                            positionPercent = parseFloat(position.replace('%', ''))
                        } else {
                            positionPercent = parseFloat(position)
                        }
                    }

                    return { color, opacity, position: positionPercent }
                })

                // 找出0%和100%位置的颜色
                const color0 = colorStops.find((stop) => stop.position === 0) || colorStops[0]
                const color100 = colorStops.find((stop) => stop.position === 100) || colorStops[colorStops.length - 1]

                gradientColors = [color0, color100].filter(Boolean).slice(0, 2)

                // 直接使用数据库保存的渐变比例
                gradientRatio = parseInt(getStringValue(styles.gradientRatio) || '50')
            } else {
                gradientColors = []
            }
        } else {
            gradientColors = []
            // 如果doms表中没有颜色，再从styles.backgroundColor读取，但不设置默认值
            if (!backgroundColor) {
                const bgColor = getStringValue(styles.backgroundColor)
                if (bgColor) {
                    // 解析颜色和透明度
                    const match = bgColor.match(/rgba?\(([^)]+)\)/)
                    if (match) {
                        const parts = match[1].split(',').map((s: string) => s.trim())
                        if (parts.length >= 3) {
                            const r = parseInt(parts[0])
                            const g = parseInt(parts[1])
                            const b = parseInt(parts[2])
                            const a = parts.length > 3 ? parseFloat(parts[3]) : 1
                            backgroundColor = rgbToHex(r, g, b)
                            backgroundOpacity = a
                        }
                    } else {
                        backgroundColor = bgColor
                        backgroundOpacity = 1
                    }
                }
                // 不设置默认值，让ColorPicker从doms表加载颜色
            }
        }

        // 背景尺寸 - 使用结构化存储格式
        backgroundSizeX = getStringValue(styles.backgroundSizeX) || '100'
        backgroundSizeY = getStringValue(styles.backgroundSizeY) || '100'
        sizeUnitX = (getStringValue(styles.backgroundSizeUnitX) || '%') as 'px' | '%'
        sizeUnitY = (getStringValue(styles.backgroundSizeUnitY) || '%') as 'px' | '%'

        // 背景位置 - 使用结构化存储格式
        backgroundPositionX = getStringValue(styles.backgroundPositionX) || '50'
        backgroundPositionY = getStringValue(styles.backgroundPositionY) || '50'
        positionUnitX = (getStringValue(styles.backgroundPositionUnitX) || '%') as 'px' | '%'
        positionUnitY = (getStringValue(styles.backgroundPositionUnitY) || '%') as 'px' | '%'

        // 背景重复
        backgroundRepeat = getStringValue(styles.backgroundRepeat) || 'no-repeat'

        // 背景裁剪为文字形状
        backgroundClipToText = getStringValue(styles.backgroundClip) === 'text' || getStringValue(styles.webkitBackgroundClip) === 'text'

        // 渐变比例已经在前面处理过了
    }

    // RGB转十六进制
    function rgbToHex(r: number, g: number, b: number): string {
        return (
            '#' +
            [r, g, b]
                .map((x) => {
                    const hex = Math.round(x).toString(16)
                    return hex.length === 1 ? '0' + hex : hex
                })
                .join('')
        )
    }

    // 格式化尺寸，px单位使用calc结合--scale-ratio实现自适应缩放
    function formatSize(value: string, unit: 'px' | '%'): string {
        if (!value) return '0'
        return unit === 'px' ? `calc(${value}px * var(--scale-ratio, 1))` : `${value}%`
    }

    // 添加渐变颜色
    function addGradientColor() {
        // 清空背景图片
        if (backgroundImage) {
            cleanupBlobUrls()
            backgroundImage = ''
        }

        // 保留背景颜色，不清空
        const tempColor = backgroundColor || '#ffffff'
        const tempOpacity = backgroundOpacity

        if (gradientColors.length === 0) {
            // 使用当前背景色作为第一个渐变颜色，白色作为第二个
            gradientColors = [
                { color: tempColor || '#ffffff', opacity: tempOpacity },
                { color: '#ffffff', opacity: 1 }
            ]
            updateBackgroundStyles()
        }
    }

    // 移除渐变颜色
    function removeGradientColor() {
        // 在移除渐变前，保存渐变中的第一个颜色作为新的背景颜色
        if (gradientColors.length > 0) {
            const firstGradientColor = gradientColors[0]
            backgroundColor = firstGradientColor.color
            backgroundOpacity = firstGradientColor.opacity
        }

        // 清空渐变颜色和背景图片
        gradientColors = []

        // 退出渐变模式时同步关闭背景裁剪开关
        backgroundClipToText = false

        if (backgroundImage) {
            cleanupBlobUrls()
            backgroundImage = ''
        }
        updateBackgroundStyles()
    }

    // 更新渐变颜色
    function updateGradientColor(index: number, color: string, opacity: number) {
        gradientColors = gradientColors.map((item, i) => (i === index ? { color, opacity } : item))
        updateBackgroundStyles()
    }

    // 生成渐变CSS
    function generateGradientCSS(): string {
        if (gradientColors.length < 2) {
            const colorStops = gradientColors.map((item) => hexToRgba(item.color, item.opacity)).join(', ')
            // 判断是径向渐变还是线性渐变
            if (gradientDirection.includes('circle')) {
                return `radial-gradient(${gradientDirection}, ${colorStops})`
            } else {
                return `linear-gradient(${gradientDirection}, ${colorStops})`
            }
        }

        // 使用比例控制两个颜色的位置，创建平滑过渡
        const ratio = Math.max(0, Math.min(100, gradientRatio)) // 确保比例在0-100之间
        const color1 = hexToRgba(gradientColors[0].color, gradientColors[0].opacity)
        const color2 = hexToRgba(gradientColors[1].color, gradientColors[1].opacity)

        // 判断是径向渐变还是线性渐变
        const isRadialGradient = gradientDirection.includes('circle')

        if (isRadialGradient) {
            // 径向渐变：根据方向决定渐变起点
            const isReverse = gradientDirection.includes('farthest-corner') || gradientDirection.includes('closest-corner')
            if (isReverse) {
                // 反向：从边缘向中心扩散
                return `radial-gradient(${gradientDirection}, ${color2} 0%, ${color1} ${ratio}%)`
            } else {
                // 正向：从中心向外扩散
                return `radial-gradient(${gradientDirection}, ${color1} 0%, ${color2} ${ratio}%)`
            }
        } else {
            // 线性渐变：方向控制
            // 创建平滑过渡：第一个颜色从0%开始，第二个颜色从ratio%开始，中间有10%的模糊过渡
            const smoothTransition = Math.max(5, Math.min(20, 100 - ratio)) // 确保过渡区域合理
            const end1 = Math.max(0, ratio - smoothTransition / 2)
            const start2 = Math.min(100, ratio + smoothTransition / 2)

            return `linear-gradient(${gradientDirection}, ${color1} 0%, ${color1} ${end1}%, ${color2} ${start2}%, ${color2} 100%)`
        }
    }

    // 处理图片上传
    async function handleImageUpload(event: Event) {
        // 如果已存在渐变颜色，上传图片前应先移除渐变
        if (gradientColors.length > 0) {
            gradientColors = []
        }
        const target = event.target as HTMLInputElement
        const file = target.files?.[0]

        if (!file || !selectedId) return

        // 0. 生成 LQIP 占位，优先渲染提升体验
        const lqipStore = useLQIP(file)
        unsubscribeLqip = lqipStore.subscribe((url) => {
            if (url) {
                backgroundImage = url
                updateBackgroundStyles()
            }
        })

        // 验证文件类型
        if (!file.type.startsWith('image/')) {
            alert('请选择图片文件')
            unsubscribeLqip()
            return
        }

        // 验证文件大小（限制10MB）
        if (file.size > 10 * 1024 * 1024) {
            alert('图片文件不能超过10MB')
            unsubscribeLqip()
            return
        }

        isUploading = true
        uploadProgress = 0

        try {
            const currentProjectId = get(projectId)
            if (!currentProjectId) throw new Error('无法获取项目ID')
            // 1. 计算哈希（加入项目ID区分跨项目同图）
            const hash = await hashBlob(file, currentProjectId)
            uploadProgress = 20

            // 2. 查库是否已存在
            const existing = await getImage(currentProjectId, hash)
            let finalBlob: Blob
            let width = 0
            let height = 0

            if (existing) {
                // 已存在，直接引用计数 +1
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

                // 4. 读取尺寸
                const size = await new Promise<{ width: number; height: number }>((resolve) => {
                    const img = new Image()
                    const objUrl = URL.createObjectURL(finalBlob)
                    img.onload = () => {
                        URL.revokeObjectURL(objUrl)
                        resolve({ width: img.naturalWidth, height: img.naturalHeight })
                    }
                    img.onerror = () => {
                        URL.revokeObjectURL(objUrl)
                        resolve({ width: 0, height: 0 })
                    }
                    img.src = objUrl
                })
                width = size.width
                height = size.height

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

            // 6. 写入样式：先用 LQIP 占位，随后替换为哈希
            imageSize = width && height ? { width, height } : null
            unsubscribeLqip()
            backgroundImage = hash

            await updateBackgroundStyles()
            isUploading = false
            uploadProgress = 100
            if (fileInput) fileInput.value = ''
        } catch (error) {
            console.error('图片上传失败:', error)
            alert('图片上传失败，请重试')
            isUploading = false
            uploadProgress = 0
            unsubscribeLqip()
            if (fileInput) {
                fileInput.value = ''
            }
        }
    }

    // 处理背景样式更新
    async function updateBackgroundStyles() {
        if (!selectedId) return

        const styles: Record<string, any> = {}

        // 背景尺寸 - 直接存储数值和单位
        styles.backgroundSize = `${formatSize(backgroundSizeX, sizeUnitX)} ${formatSize(backgroundSizeY, sizeUnitY)}`

        // 存储背景尺寸的原始数值和单位，便于编辑
        styles.backgroundSizeX = backgroundSizeX
        styles.backgroundSizeY = backgroundSizeY
        styles.backgroundSizeUnitX = sizeUnitX
        styles.backgroundSizeUnitY = sizeUnitY

        // 背景位置 - 直接存储数值和单位
        styles.backgroundPosition = `${formatSize(backgroundPositionX, positionUnitX)} ${formatSize(backgroundPositionY, positionUnitY)}`

        // 存储背景位置的原始数值和单位
        styles.backgroundPositionX = backgroundPositionX
        styles.backgroundPositionY = backgroundPositionY
        styles.backgroundPositionUnitX = positionUnitX
        styles.backgroundPositionUnitY = positionUnitY

        // 背景颜色 - 使用background-color属性
        // 背景颜色和背景图片/渐变可以同时存在，不互相冲突
        if (backgroundColor) {
            const r = parseInt(backgroundColor.slice(1, 3), 16)
            const g = parseInt(backgroundColor.slice(3, 5), 16)
            const b = parseInt(backgroundColor.slice(5, 7), 16)
            styles.backgroundColor = `rgba(${r}, ${g}, ${b}, ${backgroundOpacity})`
        } else {
            // 只有当用户明确清空背景颜色时才清空
            styles.backgroundColor = ''
        }

        // 背景图片或渐变背景 - 使用background-image属性
        if (gradientColors.length > 0) {
            styles.backgroundImage = generateGradientCSS()
            // 保存计算出的渐变比例
            styles.gradientRatio = gradientRatio.toString()
        } else if (backgroundImage) {
            // 直接将 Blob 或字符串存储到 backgroundImage 字段
            styles.backgroundImage = backgroundImage
            styles.gradientRatio = '' // 清除渐变比例
        } else {
            styles.backgroundImage = '' // 清除背景图片
            styles.gradientRatio = '' // 清除渐变比例
        }

        // 背景重复
        styles.backgroundRepeat = backgroundRepeat

        // 背景裁剪为文字形状
        if (backgroundClipToText) {
            styles.backgroundClip = 'text'
            styles.webkitBackgroundClip = 'text'
            styles.color = 'transparent'
        } else {
            styles.backgroundClip = ''
            styles.webkitBackgroundClip = ''
            styles.color = ''
        }

        // 新增：将图片原始尺寸存入 attributes
        const attributes: Record<string, any> = {}
        if (imageSize) {
            attributes['data-img-width'] = imageSize.width.toString()
            attributes['data-img-height'] = imageSize.height.toString()
        } else {
            // 清除已有尺寸
            attributes['data-img-width'] = undefined
            attributes['data-img-height'] = undefined
        }

        updateNodeProps(selectedId, { styles, attributes })

        // 如果是根节点，仅当背景图片状态发生变化时才处理缩略图
        if (selectedId === 'root') {
            const isRealImage = (image: any): boolean => {
                if (!image) return false
                if (typeof image === 'string') {
                    const str = image.trim()
                    if (str.startsWith('url(')) return true
                    // 40位及以上十六进制字符串视为哈希引用图片
                    return /^[a-f0-9]{40,}$/.test(str)
                }
                return image instanceof Blob
            }

            const prevIsRealImage = isRealImage(lastBackgroundImage)
            const currIsRealImage = isRealImage(backgroundImage)

            if (currIsRealImage && !prevIsRealImage) {
                // 新上传了图片，生成缩略图
                await syncBackgroundToThumbnail()
            } else if (!currIsRealImage && prevIsRealImage) {
                // 图片被清空，恢复默认缩略图
                const currentProjectId = get(projectId)
                if (currentProjectId) {
                    await ProjectThumbnailService.createDefaultThumbnail(currentProjectId)
                }
            }
        }

        // 更新上一次背景图片记录
        lastBackgroundImage = typeof backgroundImage === 'string' ? backgroundImage : ''
    }

    // 同步背景图片到项目缩略图
    async function syncBackgroundToThumbnail() {
        try {
            // 获取当前项目ID
            const currentProjectId = get(projectId)
            if (!currentProjectId) {
                console.warn('无法获取项目ID，无法同步缩略图')
                return
            }

            // 同步背景图片到项目缩略图
            if (backgroundImage) {
                await ProjectThumbnailService.syncBackgroundToThumbnail(currentProjectId, backgroundImage)
            } else {
                // 没有背景图片时重置为默认缩略图
                await ProjectThumbnailService.createDefaultThumbnail(currentProjectId)
            }
        } catch (error) {
            console.error('同步项目缩略图失败:', error)
        }
    }

    // 清除背景图片
    async function clearBackgroundImage() {
        if (!selectedId) return

        // 清除本地状态
        backgroundImage = ''
        await updateBackgroundStyles()

        // 若当前节点为根节点，重置项目缩略图为默认占位图
        if (selectedId === 'root') {
            const currentProjectId = get(projectId)
            if (currentProjectId) {
                await ProjectThumbnailService.createDefaultThumbnail(currentProjectId)
            }
        }
    }

    // 组件卸载时清理Blob URL
    onDestroy(() => {
        cleanupBlobUrls()
    })

    // 十六进制转RGB
    function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
        return result
            ? {
                  r: parseInt(result[1], 16),
                  g: parseInt(result[2], 16),
                  b: parseInt(result[3], 16)
              }
            : null
    }

    // 解析RGBA格式
    function parseRgba(rgba: string): { r: number; g: number; b: number; a: number } | null {
        const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/i)
        if (match) {
            return {
                r: parseInt(match[1]),
                g: parseInt(match[2]),
                b: parseInt(match[3]),
                a: match[4] ? parseFloat(match[4]) : 1
            }
        }
        return null
    }

    // 十六进制转RGBA格式
    function hexToRgba(hex: string, opacity: number): string {
        const rgb = hexToRgb(hex)
        if (rgb) {
            return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`
        }
        return `rgba(0, 0, 0, ${opacity})`
    }

    // 处理背景颜色变化
    function handleBackgroundColorChange(color: string, opacity: number) {
        backgroundColor = color
        backgroundOpacity = opacity

        // 如果渐变已启用，同步更新渐变中的第一个颜色
        if (gradientColors.length > 0) {
            gradientColors = gradientColors.map((item, index) => (index === 0 ? { color, opacity } : item))
        }

        updateBackgroundStyles()
    }

    // 获取背景图片的实际尺寸
    async function getBackgroundImageSize(): Promise<{ width: number; height: number }> {
        if (!backgroundImage || typeof backgroundImage !== 'string' || !backgroundImage.startsWith('url(')) {
            return { width: 0, height: 0 }
        }

        const urlMatch = backgroundImage.match(/url\(['"]?([^'"]+)['"]?\)/)
        if (!urlMatch) return { width: 0, height: 0 }

        const imageUrl = urlMatch[1] || ''

        return new Promise((resolve) => {
            const img = new Image()
            img.onload = () => {
                resolve({ width: img.naturalWidth, height: img.naturalHeight })
            }
            img.onerror = () => {
                resolve({ width: 0, height: 0 })
            }
            img.src = imageUrl
        })
    }

    // 获取背景图片的显示尺寸（考虑background-size）
    async function getBackgroundDisplaySize(): Promise<{ width: number; height: number }> {
        const imageSize = await getBackgroundImageSize()
        if (imageSize.width === 0) return imageSize

        if (!selectedId) return imageSize
        const el = getElementByNodeId(selectedId)
        if (!el) return imageSize

        // 解析background-size值
        const sizeX = parseFloat(backgroundSizeX) || 0
        const sizeY = parseFloat(backgroundSizeY) || 0

        let displayWidth = imageSize.width
        let displayHeight = imageSize.height

        // 根据background-size计算显示尺寸
        if (sizeUnitX === '%') {
            displayWidth = (sizeX / 100) * el.offsetWidth
        } else if (sizeUnitX === 'px') {
            displayWidth = sizeX
        }

        if (sizeUnitY === '%') {
            displayHeight = (sizeY / 100) * el.offsetHeight
        } else if (sizeUnitY === 'px') {
            displayHeight = sizeY
        }

        return { width: displayWidth, height: displayHeight }
    }

    // 单位换算函数 - 背景尺寸
    function convertBackgroundSize(val: number, from: 'px' | '%', to: 'px' | '%', axis: 'x' | 'y'): number {
        if (from === to) return val
        if (!selectedId) return val

        const el = getElementByNodeId(selectedId)
        if (!el) return val

        const elementSize = axis === 'x' ? el.offsetWidth : el.offsetHeight
        if (elementSize === 0) return val

        const sr = getScaleRatio()
        if (from === 'px') {
            // 设计px → % (需乘全局缩放比)
            return ((val * sr) / elementSize) * 100
        } else {
            // % → 设计px (需除全局缩放比)
            return ((val / 100) * elementSize) / sr
        }
    }

    // 同步版本 - 背景位置单位换算（供 SizeInput 使用）
    // 通过预先缓存的 displaySizeCache 达到与异步版本相同的精度
    function convertBackgroundPositionSync(val: number, from: 'px' | '%', to: 'px' | '%', axis: 'x' | 'y'): number {
        if (from === to) return val
        if (!selectedId) return val
        const el = getElementByNodeId(selectedId)
        if (!el) return val
        const elementSize = axis === 'x' ? el.offsetWidth : el.offsetHeight
        if (elementSize === 0) return val

        let imageSize = axis === 'x' ? displaySizeCache.width : displaySizeCache.height
        // 当异步缓存尚未就绪时，根据当前 background-size 估算图片显示尺寸，保证换算准确
        if (imageSize === 0) {
            const sizeVal = parseFloat(axis === 'x' ? backgroundSizeX : backgroundSizeY) || 0
            const unit = axis === 'x' ? sizeUnitX : sizeUnitY
            if (unit === '%') {
                imageSize = (sizeVal / 100) * elementSize
            } else if (unit === 'px') {
                // 设计 px 乘全局缩放比得到真实像素尺寸
                imageSize = sizeVal * getScaleRatio()
            }
        }
        const sr = getScaleRatio()
        if (from === 'px') {
            // 设计 px → % (需乘全局缩放比)
            if (imageSize === 0) {
                return ((val * sr) / elementSize) * 100
            }
            return ((val * sr) / (elementSize - imageSize)) * 100
        } else {
            // % → 设计 px (需除全局缩放比)
            if (imageSize === 0) {
                return ((val / 100) * elementSize) / sr
            }
            return ((val / 100) * (elementSize - imageSize)) / sr
        }
    }

    // 当前实现不再生成 blob: URL，占位空函数
    function cleanupBlobUrls() {}

    // 当有背景图片时（包括Blob对象和URL字符串）
    let hasBackgroundImage = $state(false)
    // 缓存背景图片在元素中的显示尺寸，供同步换算使用
    let displaySizeCache = $state<{ width: number; height: number }>({ width: 0, height: 0 })
    // 新增：记录原始图片自然尺寸，用于快速设置节点尺寸
    let imageSize = $state<{ width: number; height: number } | null>(null)

    // 根据当前图片自然尺寸设置节点宽高
    function applyImageDimensions() {
        if (!selectedId || !imageSize) return
        const { width, height } = imageSize
        // 计算设计尺寸对应的自适应 CSS 值
        const widthStr = `calc(${width}px * var(--scale-ratio, 1))`
        const heightStr = `calc(${height}px * var(--scale-ratio, 1))`
        updateNodeProps(selectedId, {
            styles: {
                width: widthStr,
                height: heightStr
            }
        })
    }
    $effect(() => {
        ;(async () => {
            const size = await getBackgroundDisplaySize()
            displaySizeCache = size
        })()
    })

    // 拖拽上传处理
    function handleDragOver(event: DragEvent) {
        event.preventDefault()
        event.dataTransfer!.dropEffect = 'copy'
    }

    function handleDrop(event: DragEvent) {
        event.preventDefault()

        const files = event.dataTransfer?.files
        if (files && files.length > 0) {
            const file = files[0]
            if (file.type.startsWith('image/')) {
                const mockEvent = { target: { files: [file] } } as any
                handleImageUpload(mockEvent)
            }
        }
    }

    // 新增：图片与节点尺寸一致性标记
    let isDimensionMatched = $state(true)

    function updateDimensionMatch() {
        if (!selectedId || !imageSize) {
            isDimensionMatched = true
            return
        }
        const el = getElementByNodeId(selectedId)
        if (!el) {
            isDimensionMatched = true
            return
        }
        const sr = getScaleRatio()
        const widthDesign = el.offsetWidth / sr
        const heightDesign = el.offsetHeight / sr
        isDimensionMatched = Math.abs(widthDesign - imageSize.width) < 0.5 && Math.abs(heightDesign - imageSize.height) < 0.5
    }

    let resizeObserver: ResizeObserver | null = null
    $effect(() => {
        if (!selectedId) return
        const el = getElementByNodeId(selectedId)
        if (!el) return
        if (resizeObserver) resizeObserver.disconnect()
        resizeObserver = new ResizeObserver(() => updateDimensionMatch())
        resizeObserver.observe(el)
        updateDimensionMatch()
        return () => {
            if (resizeObserver) resizeObserver.disconnect()
        }
    })
    // 当 imageSize 或节点变化时，主动更新匹配状态，避免初始化循环
    $effect(() => {
        updateDimensionMatch()
    })
    $effect(() => {
        hasBackgroundImage = !!(backgroundImage && (backgroundImage instanceof Blob || (typeof backgroundImage === 'string' && backgroundImage.trim() && !backgroundImage.includes('gradient'))))
    })
</script>

<div class="background-editor">
    <input type="file" bind:this={fileInput} accept="image/*" onchange={handleImageUpload} style="display: none" />

    {#if selectedId}
        <h3>背景样式</h3>
        <div class="background-list">
            <!-- 背景图片上传 -->
            <PropertyRow label="背景图片">
                {#if !hasBackgroundImage}
                    <button id="background-image-input" class="input-style" onclick={() => fileInput.click()} ondragover={handleDragOver} ondrop={handleDrop} title="点击上传或拖拽图片到此处">上传图片</button>
                {:else}
                    <div style="display: flex; gap: calc(4px * var(--scale-ratio, 1)); flex: 1;">
                        <button class="input-style" onclick={clearBackgroundImage} title="移除图片" style="background: rgba(239, 68, 68, 0.2); color: #f87171;">移除</button>
                        <button class="unit-toggle" onclick={applyImageDimensions} title="一键匹配原尺寸" disabled={!imageSize || selectedId === 'root' || isDimensionMatched}>
                            <Icon name="Ratio" size={16} />
                        </button>
                    </div>
                {/if}
            </PropertyRow>

            {#if isUploading}
                <PropertyRow label="上传进度">
                    <div id="upload-progress" style="flex: 1; position: relative; height: calc(4px * var(--scale-ratio, 1)); background: rgba(255, 255, 255, 0.1); border-radius: calc(2px * var(--scale-ratio, 1));">
                        <div style="height: 100%; background: linear-gradient(90deg, #6366f1, #7c3aed); border-radius: calc(2px * var(--scale-ratio, 1)); transition: width 0.3s ease; width: {uploadProgress}%"></div>
                    </div>
                    <span style="font-size: calc(12px * var(--scale-ratio, 1)); color: rgba(255, 255, 255, 0.7);">{uploadProgress}%</span>
                </PropertyRow>
            {/if}

            <!-- 背景尺寸 -->
            <PropertyRow label="背景宽度">
                <SizeInput
                    bind:value={backgroundSizeX}
                    bind:unit={sizeUnitX}
                    convert={(val, from, to) => convertBackgroundSize(val, from, to, 'x')}
                    on:change={(e: CustomEvent<{ value: string; unit: 'px' | '%' }>) => {
                        const { value, unit } = e.detail
                        backgroundSizeX = value
                        sizeUnitX = unit
                        updateBackgroundStyles()
                    }}
                />
            </PropertyRow>

            <PropertyRow label="背景高度">
                <SizeInput
                    bind:value={backgroundSizeY}
                    bind:unit={sizeUnitY}
                    convert={(val, from, to) => convertBackgroundSize(val, from, to, 'y')}
                    on:change={(e: CustomEvent<{ value: string; unit: 'px' | '%' }>) => {
                        const { value, unit } = e.detail
                        backgroundSizeY = value
                        sizeUnitY = unit
                        updateBackgroundStyles()
                    }}
                />
            </PropertyRow>

            <!-- 背景位置 -->
            <PropertyRow label="水平位置">
                <SizeInput
                    bind:value={backgroundPositionX}
                    bind:unit={positionUnitX}
                    convert={(val, from, to) => convertBackgroundPositionSync(val, from, to, 'x')}
                    on:change={(e: CustomEvent<{ value: string; unit: 'px' | '%' }>) => {
                        const { value, unit } = e.detail
                        backgroundPositionX = value
                        positionUnitX = unit
                        updateBackgroundStyles()
                    }}
                />
            </PropertyRow>

            <PropertyRow label="垂直位置">
                <SizeInput
                    bind:value={backgroundPositionY}
                    bind:unit={positionUnitY}
                    convert={(val, from, to) => convertBackgroundPositionSync(val, from, to, 'y')}
                    on:change={(e: CustomEvent<{ value: string; unit: 'px' | '%' }>) => {
                        const { value, unit } = e.detail
                        backgroundPositionY = value
                        positionUnitY = unit
                        updateBackgroundStyles()
                    }}
                />
            </PropertyRow>

            <!-- 平铺方式 -->
            <PropertyRow label="平铺方式">
                <PropertySelect
                    bind:value={backgroundRepeat}
                    options={repeatOptions}
                    change={(v) => {
                        backgroundRepeat = v
                        updateBackgroundStyles()
                    }}
                />
            </PropertyRow>

            <!-- 背景颜色 -->
            <PropertyRow label="背景颜色">
                <ColorPicker
                    value={hexToRgba(backgroundColor, backgroundOpacity)}
                    projectId={$projectId}
                    componentId={selectedId || 'default'}
                    onchange={(rgba: string) => {
                        const parsed = parseRgba(rgba)
                        if (parsed) {
                            handleBackgroundColorChange(rgbToHex(parsed.r, parsed.g, parsed.b), parsed.a)
                        }
                    }}
                />
                <button class="unit-toggle" onclick={addGradientColor} title="添加渐变颜色" style="background: rgba(34, 197, 94, 0.2); color: #4ade80;" disabled={gradientColors.length >= 2}>+</button>
            </PropertyRow>

            <!-- 渐变颜色选择器 -->
            {#if gradientColors.length > 0}
                <!-- 背景裁剪为文字形状开关 -->
                <PropertyRow label="背景裁剪">
                    <ToggleSwitch id="background-clip-toggle" bind:checked={backgroundClipToText} on:change={updateBackgroundStyles} />
                </PropertyRow>
                <!-- 渐变方向 -->
                <PropertyRow label="渐变方向">
                    <PropertySelect
                        id="gradient-direction"
                        bind:value={gradientDirection}
                        options={gradientDirectionOptions}
                        change={(v) => {
                            gradientDirection = v
                            updateBackgroundStyles()
                        }}
                    />
                </PropertyRow>

                <!-- 渐变颜色 -->
                {#if gradientColors.length > 0}
                    <PropertyRow label="渐变颜色">
                        <ColorPicker
                            value={hexToRgba(gradientColors[1]?.color || '#ffffff', gradientColors[1]?.opacity || 1)}
                            projectId={$projectId}
                            componentId={`${selectedId || 'default'}-gradient-1`}
                            onchange={(rgba: string) => {
                                const parsed = parseRgba(rgba)
                                if (parsed) {
                                    updateGradientColor(1, rgbToHex(parsed.r, parsed.g, parsed.b), parsed.a)
                                }
                            }}
                        />
                        <button class="unit-toggle" onclick={removeGradientColor} title="移除渐变" style="background: rgba(239, 68, 68, 0.2); color: #f87171;">−</button>
                    </PropertyRow>
                {/if}

                <!-- 渐变比例 -->
                {#if gradientColors.length >= 2}
                    <PropertyRow label="渐变比例">
                        <ResponsiveSlider bind:value={gradientRatio} min={0} max={100} step={1} oninput={updateBackgroundStyles} />
                        <span style="min-width: calc(40px * var(--scale-ratio, 1)); text-align: center; font-size: calc(12px * var(--scale-ratio, 1)); color: #94a3b8;">
                            {gradientRatio}%
                        </span>
                    </PropertyRow>
                {/if}
            {/if}
        </div>
    {:else}
        <p class="placeholder">请选择一个节点来编辑背景</p>
    {/if}
</div>

<style>
    .background-editor {
        padding: calc(20px * var(--scale-ratio, 1));
        color: #e2e8f0;
    }
    h3 {
        margin: 0 0 calc(16px * var(--scale-ratio, 1)) 0;
        font-size: calc(16px * var(--scale-ratio, 1));
        font-weight: 600;
        color: #cbd5e1;
    }
    .background-list {
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

    /* 背景编辑器行样式沿用 PropertyRow 默认样式，移除 background-item */
    .background-list :global(.color-picker-container) {
        flex: 1;
    }

    /* 移除 unit-placeholder 选择器 */
    .background-list :global(.color-picker-container) {
        flex: 1;
    }

    .unit-toggle {
        width: calc(40px * var(--scale-ratio, 1));
        padding: calc(8px * var(--scale-ratio, 1)) calc(12px * var(--scale-ratio, 1));
        border: calc(1px * var(--scale-ratio, 1)) solid rgba(255, 255, 255, 0.2);
        border-radius: calc(6px * var(--scale-ratio, 1));
        font-size: calc(13px * var(--scale-ratio, 1));
        background: rgba(255, 255, 255, 0.1);
        color: #e2e8f0;
        text-align: center;
        cursor: pointer;
        transition: all 0.3s ease;
    }
    .unit-toggle:disabled {
        background: rgba(255, 255, 255, 0.05);
        color: #64748b;
        cursor: not-allowed;
        opacity: 0.5;
    }
    .unit-toggle:hover {
        background: rgba(255, 255, 255, 0.15);
    }

    input:focus {
        outline: none;
        border-color: #cbd5e1;
        background: rgba(255, 255, 255, 0.15);
        box-shadow: 0 0 0 calc(3px * var(--scale-ratio, 1)) rgba(255, 255, 255, 0.1);
    }

    input::placeholder {
        color: #9ca3af;
    }
    .placeholder {
        color: #64748b;
        font-style: italic;
        text-align: center;
        margin-top: calc(40px * var(--scale-ratio, 1));
        font-size: calc(14px * var(--scale-ratio, 1));
    }

    /* 按钮样式 - 与输入框保持一致 */
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

    /* 拖拽上传视觉反馈 */
    .input-style:hover {
        border-color: rgba(99, 102, 241, 0.5);
    }
    .input-style:active,
    .input-style:focus {
        border-color: #6366f1;
        box-shadow: 0 0 0 calc(3px * var(--scale-ratio, 1)) rgba(99, 102, 241, 0.2);
    }
</style>
