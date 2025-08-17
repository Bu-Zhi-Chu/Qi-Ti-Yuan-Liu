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
    import { domTree } from '../../../services/repository/dom-tree.store.svelte'
    import { getElementByNodeId } from '../../../services/utils/dom-geometry.util'
    import { getScaleRatio } from '../../../services/utils/get-scale-ratio.util'
    import { BlobStorageService } from '../../../services/storage/blob-storage.service'
    import { ProjectThumbnailService } from '../../../services/project/project-thumbnail.service'

    // 外部传入当前选中节点 id
    export let selectedId: string | null = null

    // 背景样式状态
    let backgroundImage: string = ''
    let backgroundSizeX: string = '100'
    let backgroundSizeY: string = '100'
    let backgroundPositionX: string = '50'
    let backgroundPositionY: string = '50'
    let backgroundRepeat: string = 'no-repeat'

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
        <h3>背景属性</h3>
        <div class="background-list">
            <!-- 背景图片上传 -->
            <div class="background-item">
                <label for="background-image-input">背景图片</label>
                {#if !backgroundImage}
                    <button id="background-image-input" class="input-style" onclick={() => fileInput.click()}>上传图片</button>
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
</style>
