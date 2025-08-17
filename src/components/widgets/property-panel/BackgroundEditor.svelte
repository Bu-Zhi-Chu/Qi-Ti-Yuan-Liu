<!--
  BackgroundEditor.svelte
  背景样式编辑器组件
  功能：
  - 图片上传并存储为data URL
  - 背景尺寸设置（横轴/纵轴，默认100%）
  - 背景位置设置（横轴/纵轴，默认50%）
  - 平铺方式选择（默认不重复）

  使用说明：
  - 支持拖拽上传图片
  - 图片以data URL形式存储在doms表的style字段中
  - 背景样式直接应用于DOM元素
-->
<script lang="ts">
    import { getNodeProps, updateNodeProps } from '../../../services/property-panel/property-panel.service'
    import { domTree } from '../../../services/repository/dom-tree.store.svelte'
    import { getScaleRatio } from '../../../services/utils/get-scale-ratio.util'
    import { ImageBlobService } from '../../../services/storage/image-blob.service'

    // 外部传入当前选中节点 id
    export let selectedId: string | null = null

    // 背景样式状态
    let backgroundImage: string = ''
    let backgroundSizeX: string = '100'
    let backgroundSizeY: string = '100'
    let backgroundPositionX: string = '50'
    let backgroundPositionY: string = '50'
    let backgroundRepeat: string = 'no-repeat'
    
    // Blob存储相关状态
    let backgroundImageBlobId: string = ''
    let backgroundImageFileName: string = ''
    let backgroundImageFileType: string = ''

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

    // 当选中节点变化时，同步背景样式
    $: if (selectedId) {
        const styleSnapshot = getNodeProps(selectedId)
        
        // 同步Blob引用信息
        const imageBlobs = styleSnapshot?.imageBlobs || {}
        const bgImageData = imageBlobs.backgroundImage || {}
        backgroundImageBlobId = bgImageData.blobId || ''
        backgroundImageFileName = bgImageData.fileName || ''
        backgroundImageFileType = bgImageData.fileType || ''
        
        // 使用Blob URL
        if (backgroundImageBlobId) {
            // 异步获取Blob URL
            ImageBlobService.getImageBlobUrl(backgroundImageBlobId).then(url => {
                if (url) {
                    backgroundImage = `url(${url})`
                } else {
                    backgroundImage = ''
                }
            })
        } else {
            backgroundImage = ''
        }

        // 解析背景尺寸
        const size = styleSnapshot?.styles?.backgroundSize || '100% 100%'
        if (size && size !== 'auto') {
            const [x, y] = size.split(' ')
            ;[backgroundSizeX, sizeUnitX] = parseSize(x || '100%')
            ;[backgroundSizeY, sizeUnitY] = parseSize(y || '100%')
        }

        // 解析背景位置
        const position = styleSnapshot?.styles?.backgroundPosition || '50% 50%'
        if (position) {
            const [x, y] = position.split(' ')
            ;[backgroundPositionX, positionUnitX] = parseSize(x || '50%')
            ;[backgroundPositionY, positionUnitY] = parseSize(y || '50%')
        }

        backgroundRepeat = styleSnapshot?.styles?.backgroundRepeat || 'no-repeat'
    } else {
        // 重置所有属性
        backgroundImage = ''
        backgroundImageBlobId = ''
        backgroundImageFileName = ''
        backgroundImageFileType = ''
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

    // 解析尺寸值和单位，支持calc表达式
    function parseSize(size: string): [string, 'px' | '%'] {
        if (!size) return ['100', '%']

        // 处理百分比 - 四舍五入保留1位小数
        if (size.trim().endsWith('%')) {
            const value = parseFloat(size.trim().replace('%', ''))
            return [value ? Math.round(value * 10) / 10 + '' : '100', '%']
        }

        // 处理像素
        if (size.trim().endsWith('px')) {
            return [size.trim().replace('px', ''), 'px']
        }

        // 支持解析 calc(...) 形式 - 提取数字值
        const calcMatch = size.match(/(\d+(?:\.\d+)?)\s*(px|%)/i)
        if (calcMatch) {
            const [, value, unit] = calcMatch
            return [value, unit === 'px' ? 'px' : '%']
        }

        // 默认使用百分比
        return [size.trim(), '%']
    }

    // 格式化尺寸，px单位使用calc结合--scale-ratio实现自适应
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
            // 保存为Blob对象
            const blobId = await ImageBlobService.storeImageBlob(file)
            const blobUrl = await ImageBlobService.getImageBlobUrl(blobId)
            
            if (blobUrl) {
                backgroundImage = `url(${blobUrl})`
                backgroundImageBlobId = blobId
                backgroundImageFileName = file.name
                backgroundImageFileType = file.type
                updateBackgroundStyles()
            }

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
    function updateBackgroundStyles() {
        if (!selectedId) return

        const styles: Record<string, string> = {}

        // 背景图片 - 始终设置，包括空值以移除背景
        styles.backgroundImage = backgroundImage || ''

        // 背景尺寸
        const sizeX = formatSize(backgroundSizeX, sizeUnitX)
        const sizeY = formatSize(backgroundSizeY, sizeUnitY)
        styles.backgroundSize = `${sizeX} ${sizeY}`

        // 背景位置
        const posX = formatSize(backgroundPositionX, positionUnitX)
        const posY = formatSize(backgroundPositionY, positionUnitY)
        styles.backgroundPosition = `${posX} ${posY}`

        // 背景重复
        styles.backgroundRepeat = backgroundRepeat

        // 构建imageBlobs数据
        const imageBlobs: Record<string, any> = {}
        if (backgroundImageBlobId) {
            imageBlobs.backgroundImage = {
                blobId: backgroundImageBlobId,
                blobUrl: backgroundImage.replace(/^url\((.*)\)$/, '$1').replace(/"/g, ''),
                fileName: backgroundImageFileName,
                fileType: backgroundImageFileType
            }
        }

        updateNodeProps(selectedId, { styles, imageBlobs })
    }

    // 清除背景图片
    async function clearBackgroundImage() {
        if (!selectedId) return

        // 清除Blob存储
        if (backgroundImageBlobId) {
            await ImageBlobService.removeImageBlob(backgroundImageBlobId)
        }

        // 清除本地状态
        backgroundImage = ''
        backgroundImageBlobId = ''
        backgroundImageFileName = ''
        backgroundImageFileType = ''
        updateBackgroundStyles()
    }

    // 单位切换函数
    function toggleSizeUnitX() {
        sizeUnitX = sizeUnitX === '%' ? 'px' : '%'
        updateBackgroundStyles()
    }

    function toggleSizeUnitY() {
        sizeUnitY = sizeUnitY === '%' ? 'px' : '%'
        updateBackgroundStyles()
    }

    function togglePositionUnitX() {
        positionUnitX = positionUnitX === '%' ? 'px' : '%'
        updateBackgroundStyles()
    }

    function togglePositionUnitY() {
        positionUnitY = positionUnitY === '%' ? 'px' : '%'
        updateBackgroundStyles()
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
                    <button id="background-image-input" class="unit-toggle" onclick={() => fileInput.click()} style="width: 100%; justify-content: center;">上传图片</button>
                {:else}
                    <div style="display: flex; align-items: center; gap: calc(8px * var(--scale-ratio, 1)); width: 100%;">
                        <img src={backgroundImage.replace(/^url\((.*)\)$/, '$1').replace(/"/g, '')} alt="背景预览" style="width: calc(40px * var(--scale-ratio, 1)); height: calc(40px * var(--scale-ratio, 1)); border-radius: calc(4px * var(--scale-ratio, 1)); object-fit: cover;" />
                        <button class="unit-toggle" onclick={clearBackgroundImage} title="移除图片" style="background: rgba(239, 68, 68, 0.2); color: #f87171; flex: 1;">移除</button>
                    </div>
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
</style>
