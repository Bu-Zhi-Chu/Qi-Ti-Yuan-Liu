<!--
  BackgroundEditor.svelte
  背景样式编辑器组件
  功能：
  - 图片上传并存储为Blob URL
  - 背景尺寸设置（横轴/纵轴，默认100%）
  - 背景位置设置（横轴/纵轴，默认50%）
  - 平铺方式选择（默认不重复）

  使用说明：
  - 支持拖拽上传图片
  - 图片以Blob URL形式存储在doms表的style字段中
  - 背景样式直接应用于DOM元素
-->
<script lang="ts">
    import { onDestroy } from 'svelte'
    import { getNodeProps, updateNodeProps } from '../../../services/property-panel/property-panel.service'
    import { domTree, projectId } from '../../../services/repository/dom-tree.store.svelte'
    import { getElementByNodeId } from '../../../services/utils/dom-geometry.util'
    import { getScaleRatio } from '../../../services/utils/get-scale-ratio.util'
    import { BlobStorageService } from '../../../services/storage/blob-storage.service'
    import { ProjectThumbnailService } from '../../../services/project/project-thumbnail.service'
    import ColorPicker from '../ColorPicker.svelte'
    import ResponsiveSlider from '../ResponsiveSlider.svelte'

    // 外部传入当前选中节点 id
    export let selectedId: string | null = null

    // 背景样式状态
    let backgroundImage: string = ''
    let backgroundColor: string = ''
    let backgroundOpacity: number = 1
    let backgroundSizeX: string = '100'
    let backgroundSizeY: string = '100'
    let backgroundPositionX: string = '50'
    let backgroundPositionY: string = '50'
    let backgroundRepeat: string = 'no-repeat'

    // 渐变背景相关状态
    let gradientColors: Array<{ color: string; opacity: number }> = []
    let gradientDirection: string = 'to right'
    let gradientRatio: number = 50 // 渐变比例，0-100，控制两个颜色的占比

    // 单位设置 - 支持px和%切换
    let sizeUnitX: 'px' | '%' = '%'
    let sizeUnitY: 'px' | '%' = '%'
    let positionUnitX: 'px' | '%' = '%'
    let positionUnitY: 'px' | '%' = '%'

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
    let isUploading = false
    let uploadProgress = 0

    // 从样式对象初始化背景属性
    function initBackgroundProps() {
        if (!selectedId) return

        const nodeProps = getNodeProps(selectedId)
        const styles = nodeProps?.styles || {}

        // 背景图片
        backgroundImage = styles.backgroundImage || ''

        // 优先从存储的渐变配置中恢复
        if (styles.gradientColors) {
            try {
                const storedColors = JSON.parse(styles.gradientColors)
                if (Array.isArray(storedColors) && storedColors.length > 0) {
                    gradientColors = storedColors
                    gradientDirection = styles.gradientDirection || 'to right'
                } else {
                    gradientColors = []
                }
            } catch (e) {
                console.warn('解析存储的渐变颜色失败:', e)
                gradientColors = []
            }
        } else {
            // 兼容旧格式：从CSS backgroundImage解析渐变
            const bgImage = styles.backgroundImage || ''
            if (bgImage && bgImage.startsWith('linear-gradient')) {
                const gradientMatch = bgImage.match(/linear-gradient\(([^,]+),(.+)\)/)
                if (gradientMatch) {
                    gradientDirection = gradientMatch[1].trim()
                    const colors = gradientMatch[2].split(',').map((c) => c.trim())
                    gradientColors = colors.map((colorStr) => {
                        const rgbaMatch = colorStr.match(/rgba?\(([^)]+)\)/)
                        if (rgbaMatch) {
                            const parts = rgbaMatch[1].split(',').map((s) => s.trim())
                            const r = parseInt(parts[0])
                            const g = parseInt(parts[1])
                            const b = parseInt(parts[2])
                            const a = parts.length > 3 ? parseFloat(parts[3]) : 1
                            return { color: rgbToHex(r, g, b), opacity: a }
                        } else {
                            return { color: colorStr, opacity: 1 }
                        }
                    })
                } else {
                    gradientColors = []
                }
            } else {
                gradientColors = []
                // 背景颜色 - 从background-color解析颜色和透明度
                const bgColor = styles.backgroundColor || ''
                if (bgColor) {
                    // 解析颜色和透明度
                    const match = bgColor.match(/rgba?\(([^)]+)\)/)
                    if (match) {
                        const parts = match[1].split(',').map((s) => s.trim())
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
                } else {
                    // 默认使用白色，避免空字符串导致的问题
                    backgroundColor = '#ffffff'
                    backgroundOpacity = 1
                }
            }
        }

        // 背景尺寸 - 优先使用新的存储格式，兼容旧格式
        if (styles.backgroundSizeX !== undefined) {
            backgroundSizeX = styles.backgroundSizeX || '100'
            backgroundSizeY = styles.backgroundSizeY || '100'
            sizeUnitX = (styles.backgroundSizeUnitX || '%') as 'px' | '%'
            sizeUnitY = (styles.backgroundSizeUnitY || '%') as 'px' | '%'
        } else {
            // 兼容旧格式：从CSS表达式解析
            const backgroundSize = styles.backgroundSize || '100% 100%'
            const [sizeX, sizeY] = backgroundSize.split(' ')
            const [parsedSizeX, parsedUnitX] = parseSize(sizeX || '100%')
            const [parsedSizeY, parsedUnitY] = parseSize(sizeY || '100%')
            backgroundSizeX = parsedSizeX
            backgroundSizeY = parsedSizeY
            sizeUnitX = parsedUnitX
            sizeUnitY = parsedUnitY
        }

        // 背景位置 - 优先使用新的存储格式，兼容旧格式
        if (styles.backgroundPositionX !== undefined) {
            backgroundPositionX = styles.backgroundPositionX || '50'
            backgroundPositionY = styles.backgroundPositionY || '50'
            positionUnitX = (styles.backgroundPositionUnitX || '%') as 'px' | '%'
            positionUnitY = (styles.backgroundPositionUnitY || '%') as 'px' | '%'
        } else {
            // 兼容旧格式：从CSS表达式解析
            const backgroundPosition = styles.backgroundPosition || '50% 50%'
            const [posX, posY] = backgroundPosition.split(' ')
            const [parsedPosX, parsedUnitX] = parseSize(posX || '50%')
            const [parsedPosY, parsedUnitY] = parseSize(posY || '50%')
            backgroundPositionX = parsedPosX
            backgroundPositionY = parsedPosY
            positionUnitX = parsedUnitX
            positionUnitY = parsedUnitY
        }

        // 背景重复
        backgroundRepeat = styles.backgroundRepeat || 'no-repeat'

        // 渐变比例
        gradientRatio = parseInt(styles.gradientRatio || '50')
    }

    // 监听 selectedId 变化，自动调用初始化函数
    $: if (selectedId) {
        initBackgroundProps()
    } else {
        // 重置所有属性
        backgroundImage = ''
        backgroundSizeX = '100'
        backgroundSizeY = '100'
        backgroundPositionX = '50'
        backgroundPositionY = '50'
        backgroundRepeat = 'no-repeat'
        sizeUnitX = '%'
        sizeUnitY = '%'
        positionUnitX = '%'
        positionUnitY = '%'
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

    // 解析尺寸值和单位
    function parseSize(size: string): [string, 'px' | '%'] {
        if (!size) return ['100', '%']

        // 处理百分比
        if (size.trim().endsWith('%')) {
            const value = parseFloat(size.trim().replace('%', ''))
            return [value ? Math.round(value * 10) / 10 + '' : '100', '%']
        }

        // 处理像素
        if (size.trim().endsWith('px')) {
            return [size.trim().replace('px', ''), 'px']
        }

        // 默认使用百分比
        return [size.trim(), '%']
    }

    // 格式化尺寸，px单位使用calc结合--scale-ratio实现自适应缩放
    function formatSize(value: string, unit: 'px' | '%'): string {
        if (!value) return '0'
        return unit === 'px' ? `calc(${value}px * var(--scale-ratio, 1))` : `${value}%`
    }

    // 添加渐变颜色
    function addGradientColor() {
        if (gradientColors.length === 0) {
            // 获取当前有效的背景颜色，如果为空则从DOM获取
            let currentColor = backgroundColor;
            if (!currentColor || currentColor === '') {
                if (selectedId) {
                    const el = getElementByNodeId(selectedId);
                    if (el) {
                        const computedStyle = window.getComputedStyle(el);
                        const bgColor = computedStyle.backgroundColor;
                        if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
                            // 解析RGB/RGBA格式
                            const rgbaMatch = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/i);
                            if (rgbaMatch) {
                                const r = parseInt(rgbaMatch[1]);
                                const g = parseInt(rgbaMatch[2]);
                                const b = parseInt(rgbaMatch[3]);
                                currentColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
                            }
                        }
                    }
                }
            }
            
            // 如果还是无法获取有效颜色，使用默认白色
            if (!currentColor || currentColor === '') {
                currentColor = '#ffffff';
            }
            
            // 添加两个渐变颜色，第一个使用当前背景色，第二个为白色
            gradientColors = [
                { color: currentColor, opacity: backgroundOpacity },
                { color: '#ffffff', opacity: 1 }
            ]
            updateBackgroundStyles()
        }
    }

    // 移除渐变颜色
    function removeGradientColor() {
        gradientColors = []

        // 当移除渐变后，保持当前的backgroundColor和backgroundOpacity不变
        // 这些值已经在用户设置渐变时被保存为纯色背景的值
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
        const target = event.target as HTMLInputElement
        const file = target.files?.[0]

        if (!file || !selectedId) return

        // 验证文件类型
        if (!file.type.startsWith('image/')) {
            alert('请选择图片文件')
            return
        }

        // 验证文件大小（限制10MB）
        if (file.size > 10 * 1024 * 1024) {
            alert('图片文件不能超过10MB')
            return
        }

        isUploading = true
        uploadProgress = 0

        try {
            // 使用base64持久化存储图片
            const base64Data = await BlobStorageService.fileToBase64(file)
            backgroundImage = `url(${base64Data})`
            updateBackgroundStyles()
            isUploading = false
            uploadProgress = 100
        } catch (error) {
            console.error('图片上传失败:', error)
            alert('图片上传失败，请重试')
            isUploading = false
            uploadProgress = 0
        }
    }

    // 处理背景样式更新
    async function updateBackgroundStyles() {
        if (!selectedId) return

        const styles: Record<string, string> = {}

        // 背景图片 - 始终设置，包括空值以移除背景
        styles.backgroundImage = backgroundImage || ''

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
        if (backgroundColor && gradientColors.length === 0) {
            const r = parseInt(backgroundColor.slice(1, 3), 16)
            const g = parseInt(backgroundColor.slice(3, 5), 16)
            const b = parseInt(backgroundColor.slice(5, 7), 16)
            styles.backgroundColor = `rgba(${r}, ${g}, ${b}, ${backgroundOpacity})`
        } else {
            // 当有渐变时，不设置纯色背景，但保持backgroundColor变量不变
            styles.backgroundColor = ''
        }

        // 背景图片或渐变背景 - 使用background-image属性
        if (gradientColors.length > 0) {
            styles.backgroundImage = generateGradientCSS()
        } else if (backgroundImage) {
            styles.backgroundImage = backgroundImage
        } else {
            styles.backgroundImage = '' // 清除背景图片
        }

        // 存储渐变相关配置
        styles.gradientDirection = gradientDirection
        styles.gradientColors = JSON.stringify(gradientColors)
        styles.gradientRatio = String(gradientRatio)

        // 背景重复
        styles.backgroundRepeat = backgroundRepeat

        updateNodeProps(selectedId, { styles })

        // 如果是根节点，同步背景图片到项目缩略图
        if (selectedId === 'root') {
            if (backgroundImage) {
                // 有背景图片时同步到缩略图
                await syncBackgroundToThumbnail()
            } else {
                // 没有背景图片时重置为默认缩略图
                const projectId = getRouteProjectId()
                if (projectId) {
                    await ProjectThumbnailService.createDefaultThumbnail(projectId)
                }
            }
        }
    }

    // 同步背景图片到项目缩略图
    async function syncBackgroundToThumbnail() {
        try {
            // 获取当前项目ID
            const projectId = getRouteProjectId()
            if (!projectId) {
                console.warn('无法获取项目ID，无法同步缩略图')
                return
            }

            // 同步背景图片到项目缩略图
            if (backgroundImage) {
                await ProjectThumbnailService.syncBackgroundToThumbnail(projectId, backgroundImage)
            } else {
                // 没有背景图片时重置为默认缩略图
                await ProjectThumbnailService.createDefaultThumbnail(projectId)
            }
        } catch (error) {
            console.error('同步项目缩略图失败:', error)
        }
    }

    // 从路由获取项目ID
    function getRouteProjectId(): string | null {
        let match = window.location.hash.match(/\/editor\/([^\/]+)/)
        if (!match) {
            match = window.location.pathname.match(/\/editor\/([^\/]+)/)
        }
        if (!match) {
            match = window.location.pathname.match(/\/search\/editor\/([^\/]+)/)
        }
        return match ? match[1] : null
    }

    // 清除背景图片
    async function clearBackgroundImage() {
        if (!selectedId) return

        // 释放Blob URL内存
        const match = backgroundImage.match(/url\(([^)]+)\)/)
        if (match && match[1] && match[1].startsWith('blob:')) {
            URL.revokeObjectURL(match[1])
        }

        // 清除本地状态
        backgroundImage = ''
        await updateBackgroundStyles()
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

    // 从DOM元素获取当前背景颜色值
    function getCurrentBackgroundColor(): string {
        if (!selectedId) {
            return hexToRgba(backgroundColor, backgroundOpacity)
        }

        const el = getElementByNodeId(selectedId)
        if (!el) {
            return hexToRgba(backgroundColor, backgroundOpacity)
        }

        // 获取DOM元素的当前backgroundColor样式
        const computedStyle = window.getComputedStyle(el)
        const bgColor = computedStyle.backgroundColor

        if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
            // 解析RGB/RGBA格式
            const rgbaMatch = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/i)
            if (rgbaMatch) {
                const r = parseInt(rgbaMatch[1])
                const g = parseInt(rgbaMatch[2])
                const b = parseInt(rgbaMatch[3])
                const a = rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1
                return `rgba(${r}, ${g}, ${b}, ${a})`
            }
        }

        // 如果没有有效的DOM颜色，使用状态变量
        return hexToRgba(backgroundColor, backgroundOpacity)
    }

    // 处理背景颜色变化
    function handleBackgroundColorChange(color: string, opacity: number) {
        backgroundColor = color
        backgroundOpacity = opacity
        
        // 如果渐变已启用，同步更新渐变中的第一个颜色
        if (gradientColors.length > 0) {
            gradientColors = gradientColors.map((item, index) => 
                index === 0 ? { color, opacity } : item
            )
        }
        
        updateBackgroundStyles()
    }

    // 获取背景图片的实际尺寸
    async function getBackgroundImageSize(): Promise<{ width: number; height: number }> {
        if (!backgroundImage || !backgroundImage.startsWith('url(')) {
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

    // 单位换算函数 - 背景位置
    async function convertBackgroundPosition(val: number, from: 'px' | '%', to: 'px' | '%', axis: 'x' | 'y'): Promise<number> {
        if (from === to) return val
        if (!selectedId) return val

        const el = getElementByNodeId(selectedId)
        if (!el) return val

        const elementSize = axis === 'x' ? el.offsetWidth : el.offsetHeight
        if (elementSize === 0) return val

        const displaySize = await getBackgroundDisplaySize()
        const imageSize = axis === 'x' ? displaySize.width : displaySize.height

        const sr = getScaleRatio()

        if (from === 'px') {
            // 设计px → % (需乘全局缩放比)
            if (imageSize === 0) {
                return ((val * sr) / elementSize) * 100
            }
            return ((val * sr) / (elementSize - imageSize)) * 100
        } else {
            // % → 设计px (需除全局缩放比)
            if (imageSize === 0) {
                return ((val / 100) * elementSize) / sr
            }
            return ((val / 100) * (elementSize - imageSize)) / sr
        }
    }

    // 单位切换函数 - 带数值换算
    function toggleSizeUnitX() {
        if (!selectedId) return
        const numericVal = parseFloat(backgroundSizeX) || 0
        const nextUnit: 'px' | '%' = sizeUnitX === '%' ? 'px' : '%'
        const converted = convertBackgroundSize(numericVal, sizeUnitX, nextUnit, 'x')
        backgroundSizeX = String(nextUnit === '%' ? Math.round(converted * 10) / 10 : Math.round(converted * 100) / 100)
        sizeUnitX = nextUnit
        updateBackgroundStyles()
    }

    function toggleSizeUnitY() {
        if (!selectedId) return
        const numericVal = parseFloat(backgroundSizeY) || 0
        const nextUnit: 'px' | '%' = sizeUnitY === '%' ? 'px' : '%'
        const converted = convertBackgroundSize(numericVal, sizeUnitY, nextUnit, 'y')
        backgroundSizeY = String(nextUnit === '%' ? Math.round(converted * 10) / 10 : Math.round(converted * 100) / 100)
        sizeUnitY = nextUnit
        updateBackgroundStyles()
    }

    async function togglePositionUnitX() {
        if (!selectedId) return
        const numericVal = parseFloat(backgroundPositionX) || 0
        const nextUnit: 'px' | '%' = positionUnitX === '%' ? 'px' : '%'
        const converted = await convertBackgroundPosition(numericVal, positionUnitX, nextUnit, 'x')
        backgroundPositionX = String(nextUnit === '%' ? Math.round(converted * 10) / 10 : Math.round(converted * 100) / 100)
        positionUnitX = nextUnit
        updateBackgroundStyles()
    }

    async function togglePositionUnitY() {
        if (!selectedId) return
        const numericVal = parseFloat(backgroundPositionY) || 0
        const nextUnit: 'px' | '%' = positionUnitY === '%' ? 'px' : '%'
        const converted = await convertBackgroundPosition(numericVal, positionUnitY, nextUnit, 'y')
        backgroundPositionY = String(nextUnit === '%' ? Math.round(converted * 10) / 10 : Math.round(converted * 100) / 100)
        positionUnitY = nextUnit
        updateBackgroundStyles()
    }

    // 清理Blob URL
    function cleanupBlobUrls() {
        if (!backgroundImage) return
        const match = backgroundImage.match(/url\(([^)]+)\)/)
        if (match && match[1] && match[1].startsWith('blob:')) {
            URL.revokeObjectURL(match[1])
        }
    }

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
</script>

<div class="background-editor">
    <input type="file" bind:this={fileInput} accept="image/*" onchange={handleImageUpload} style="display: none" />

    {#if selectedId}
        <h3>背景样式</h3>
        <div class="background-list">
            <!-- 背景图片上传 -->
            <div class="background-item">
                <label for="background-image-input">背景图片</label>
                {#if !backgroundImage}
                    <button id="background-image-input" class="input-style" onclick={() => fileInput.click()} ondragover={handleDragOver} ondrop={handleDrop} title="点击上传或拖拽图片到此处">上传图片</button>
                {:else}
                    <button class="input-style" onclick={clearBackgroundImage} title="移除图片" style="background: rgba(239, 68, 68, 0.2); color: #f87171;">移除</button>
                {/if}
                <span class="unit-placeholder"></span>
            </div>

            {#if isUploading}
                <div class="background-item">
                    <label for="upload-progress">上传进度</label>
                    <div id="upload-progress" style="flex: 1; position: relative; height: calc(4px * var(--scale-ratio, 1)); background: rgba(255, 255, 255, 0.1); border-radius: calc(2px * var(--scale-ratio, 1));">
                        <div style="height: 100%; background: linear-gradient(90deg, #6366f1, #7c3aed); border-radius: calc(2px * var(--scale-ratio, 1)); transition: width 0.3s ease; width: {uploadProgress}%"></div>
                    </div>
                    <span style="font-size: calc(12px * var(--scale-ratio, 1)); color: rgba(255, 255, 255, 0.7);">{uploadProgress}%</span>
                </div>
            {/if}

            <!-- 背景尺寸 -->
            <div class="background-item">
                <label for="background-size-x">背景宽度</label>
                <input id="background-size-x" type="number" step={sizeUnitX === '%' ? 0.1 : 1} min="0" max="9999" bind:value={backgroundSizeX} oninput={updateBackgroundStyles} placeholder="宽度值..." />
                <button class="unit-toggle" onclick={toggleSizeUnitX}>
                    {sizeUnitX}
                </button>
            </div>

            <div class="background-item">
                <label for="background-size-y">背景高度</label>
                <input id="background-size-y" type="number" step={sizeUnitY === '%' ? 0.1 : 1} min="0" max="9999" bind:value={backgroundSizeY} oninput={updateBackgroundStyles} placeholder="高度值..." />
                <button class="unit-toggle" onclick={toggleSizeUnitY}>
                    {sizeUnitY}
                </button>
            </div>

            <!-- 背景位置 -->
            <div class="background-item">
                <label for="background-position-x">水平位置</label>
                <input id="background-position-x" type="number" step={positionUnitX === '%' ? 0.1 : 1} min="-9999" max="9999" bind:value={backgroundPositionX} oninput={updateBackgroundStyles} placeholder="水平位置..." />
                <button class="unit-toggle" onclick={togglePositionUnitX}>
                    {positionUnitX}
                </button>
            </div>

            <div class="background-item">
                <label for="background-position-y">垂直位置</label>
                <input id="background-position-y" type="number" step={positionUnitY === '%' ? 0.1 : 1} min="-9999" max="9999" bind:value={backgroundPositionY} oninput={updateBackgroundStyles} placeholder="垂直位置..." />
                <button class="unit-toggle" onclick={togglePositionUnitY}>
                    {positionUnitY}
                </button>
            </div>

            <!-- 平铺方式 -->
            <div class="background-item">
                <label for="background-repeat">平铺方式</label>
                <select id="background-repeat" bind:value={backgroundRepeat} onchange={updateBackgroundStyles}>
                    {#each repeatOptions as option}
                        <option value={option.value}>{option.label}</option>
                    {/each}
                </select>
                <span class="unit-placeholder"></span>
            </div>

            <!-- 背景颜色 -->
            <div class="background-item">
                <label for="color-picker-background">背景颜色</label>
                <ColorPicker
                    value={hexToRgba(backgroundColor, backgroundOpacity)}
                    projectId={projectId()}
                    componentId={selectedId || 'default'}
                    onchange={(rgba: string) => {
                        const parsed = parseRgba(rgba)
                        if (parsed) {
                            handleBackgroundColorChange(rgbToHex(parsed.r, parsed.g, parsed.b), parsed.a)
                        }
                    }}
                />
                <button class="unit-toggle" onclick={addGradientColor} title="添加渐变颜色" style="background: rgba(34, 197, 94, 0.2); color: #4ade80;" disabled={gradientColors.length >= 2}>+</button>
            </div>

            <!-- 渐变颜色选择器 -->
            {#if gradientColors.length > 0}
                <!-- 渐变方向 -->
                <div class="background-item">
                    <label for="gradient-direction">渐变方向</label>
                    <select id="gradient-direction" bind:value={gradientDirection} onchange={updateBackgroundStyles}>
                        {#each gradientDirectionOptions as option}
                            <option value={option.value}>{option.label}</option>
                        {/each}
                    </select>
                    <span class="unit-placeholder"></span>
                </div>

                <!-- 渐变颜色 -->
                {#if gradientColors.length > 0}
                    <div class="background-item">
                        <label for="{selectedId || 'default'}-gradient-1">渐变颜色</label>
                        <ColorPicker
                            value={hexToRgba(gradientColors[1]?.color || '#ffffff', gradientColors[1]?.opacity || 1)}
                            projectId={projectId()}
                            componentId={`${selectedId || 'default'}-gradient-1`}
                            onchange={(rgba: string) => {
                                const parsed = parseRgba(rgba)
                                if (parsed) {
                                    updateGradientColor(1, rgbToHex(parsed.r, parsed.g, parsed.b), parsed.a)
                                }
                            }}
                        />
                        <button class="unit-toggle" onclick={removeGradientColor} title="移除渐变" style="background: rgba(239, 68, 68, 0.2); color: #f87171;">−</button>
                    </div>
                {/if}

                <!-- 渐变比例 -->
                {#if gradientColors.length >= 2}
                    <div class="background-item">
                        <label for="gradient-ratio">渐变比例</label>
                        <ResponsiveSlider bind:value={gradientRatio} min={0} max={100} step={1} oninput={updateBackgroundStyles} />
                        <span style="min-width: calc(40px * var(--scale-ratio, 1)); text-align: center; font-size: calc(12px * var(--scale-ratio, 1)); color: #94a3b8;">
                            {gradientRatio}%
                        </span>
                    </div>
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
    .background-item {
        display: flex;
        align-items: center;
        gap: calc(10px * var(--scale-ratio, 1));
    }
    label {
        min-width: calc(70px * var(--scale-ratio, 1));
        font-size: calc(13px * var(--scale-ratio, 1));
        font-weight: 500;
        color: #94a3b8;
    }
    input,
    select {
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

    :global(.background-item .color-picker-container) {
        flex: 1;
    }

    .unit-placeholder {
        width: calc(40px * var(--scale-ratio, 1));
    }

    /* 单位切换按钮样式 - 与AttrEditor和PositionEditor保持一致 */
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
    .unit-toggle:hover {
        background: rgba(255, 255, 255, 0.15);
    }

    select:focus,
    input:focus {
        outline: none;
        border-color: #cbd5e1;
        background: rgba(255, 255, 255, 0.15);
        box-shadow: 0 0 0 calc(3px * var(--scale-ratio, 1)) rgba(255, 255, 255, 0.1);
    }
    select option {
        background: #1e293b;
        color: #e2e8f0;
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

    /* 隐藏原生 number 输入框的上下箭头 */
    input[type='number']::-webkit-inner-spin-button,
    input[type='number']::-webkit-outer-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }
    input[type='number'] {
        -moz-appearance: textfield;
        appearance: textfield;
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
