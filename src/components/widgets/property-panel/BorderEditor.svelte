<!--
  * BorderEditor.svelte
  * ---------------------------------------------------------------------
  * 边框样式编辑面板
  * 功能：
  *   1. 设置边框宽度、样式、颜色、圆角
  *   2. 支持四个边框的总控制（统一设置）
  *   3. 支持四个边框的分开控制（独立设置）
  *   4. 使用自适应px单位，不可切换
  * ---------------------------------------------------------------------
  * 使用示例：
  *   <BorderEditor selectedId={currentId} />
  * ---------------------------------------------------------------------
-->

<script lang="ts">
    import { getProjectStore } from '../../../services/project/project-store'
    import ColorPicker from '../ColorPicker.svelte'
    import ResponsiveSlider from '../ResponsiveSlider.svelte'

    // Runes props
    let { selectedId } = $props<{ selectedId: string | null }>()

    // 获取项目存储
    const projectStore = getProjectStore()

    // 边框样式选项
    const borderStyleOptions = [
        { value: 'none', label: '无' },
        { value: 'solid', label: '实线' },
        { value: 'dashed', label: '虚线' },
        { value: 'dotted', label: '点线' },
        { value: 'double', label: '双线' },
        { value: 'groove', label: '凹槽' },
        { value: 'ridge', label: '凸槽' },
        { value: 'inset', label: '内凹' },
        { value: 'outset', label: '外凸' }
    ]

    // 统一控制状态
    let unifiedBorderWidth = $state(1)
    let unifiedBorderStyle = $state('solid')
    let unifiedBorderColor = $state('#000000')
    let unifiedBorderOpacity = $state(1)
    let unifiedBorderRadius = $state(0)

    // 独立控制状态 - 四个边框
    let borderTopWidth = $state(1)
    let borderTopStyle = $state('solid')
    let borderTopColor = $state('#000000')
    let borderTopOpacity = $state(1)

    let borderRightWidth = $state(1)
    let borderRightStyle = $state('solid')
    let borderRightColor = $state('#000000')
    let borderRightOpacity = $state(1)

    let borderBottomWidth = $state(1)
    let borderBottomStyle = $state('solid')
    let borderBottomColor = $state('#000000')
    let borderBottomOpacity = $state(1)

    let borderLeftWidth = $state(1)
    let borderLeftStyle = $state('solid')
    let borderLeftColor = $state('#000000')
    let borderLeftOpacity = $state(1)

    // 圆角独立控制
    let borderTopLeftRadius = $state(0)
    let borderTopRightRadius = $state(0)
    let borderBottomRightRadius = $state(0)
    let borderBottomLeftRadius = $state(0)

    // 控制模式
    let isUnifiedMode = $state(true)

    // 辅助函数
    function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null
    }

    function rgbToHex(r: number, g: number, b: number): string {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).padStart(6, '0')
    }

    function hexToRgba(hex: string, alpha: number): string {
        const rgb = hexToRgb(hex)
        if (!rgb) return `rgba(0, 0, 0, ${alpha})`
        return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`
    }

    function parseRgba(rgba: string): { r: number; g: number; b: number; a: number } | null {
        const match = rgba.match(/rgba?\(([^)]+)\)/)
        if (!match) return null
        const parts = match[1].split(',').map(s => parseFloat(s.trim()))
        if (parts.length < 3) return null
        return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] ?? 1 }
    }

    // 获取项目ID
    function projectId(): string {
        return projectStore.currentProject?.id || 'default'
    }

    // 初始化边框属性
    function initBorderProps() {
        if (!selectedId) return

        const node = projectStore.getNode(selectedId)
        if (!node) return

        const style = node.style || {}

        // 初始化统一控制
        unifiedBorderWidth = parseInt(style.borderWidth || '1') || 1
        unifiedBorderStyle = style.borderStyle || 'solid'
        const borderColor = style.borderColor || '#000000'
        unifiedBorderColor = borderColor.startsWith('#') ? borderColor : '#000000'
        unifiedBorderOpacity = 1
        unifiedBorderRadius = parseInt(style.borderRadius || '0') || 0

        // 初始化独立控制
        borderTopWidth = parseInt(style.borderTopWidth || style.borderWidth || '1') || 1
        borderTopStyle = style.borderTopStyle || style.borderStyle || 'solid'
        borderTopColor = style.borderTopColor || style.borderColor || '#000000'
        borderTopOpacity = 1

        borderRightWidth = parseInt(style.borderRightWidth || style.borderWidth || '1') || 1
        borderRightStyle = style.borderRightStyle || style.borderStyle || 'solid'
        borderRightColor = style.borderRightColor || style.borderColor || '#000000'
        borderRightOpacity = 1

        borderBottomWidth = parseInt(style.borderBottomWidth || style.borderWidth || '1') || 1
        borderBottomStyle = style.borderBottomStyle || style.borderStyle || 'solid'
        borderBottomColor = style.borderBottomColor || style.borderColor || '#000000'
        borderBottomOpacity = 1

        borderLeftWidth = parseInt(style.borderLeftWidth || style.borderWidth || '1') || 1
        borderLeftStyle = style.borderLeftStyle || style.borderStyle || 'solid'
        borderLeftColor = style.borderLeftColor || style.borderColor || '#000000'
        borderLeftOpacity = 1

        // 初始化圆角
        borderTopLeftRadius = parseInt(style.borderTopLeftRadius || style.borderRadius || '0') || 0
        borderTopRightRadius = parseInt(style.borderTopRightRadius || style.borderRadius || '0') || 0
        borderBottomRightRadius = parseInt(style.borderBottomRightRadius || style.borderRadius || '0') || 0
        borderBottomLeftRadius = parseInt(style.borderBottomLeftRadius || style.borderRadius || '0') || 0

        updateBorderStyles()
    }

    // 更新边框样式
    function updateBorderStyles() {
        if (!selectedId) return

        const updates: Record<string, string> = {}

        if (isUnifiedMode) {
            // 统一模式
            updates.borderWidth = `${unifiedBorderWidth}px`
            updates.borderStyle = unifiedBorderStyle
            updates.borderColor = hexToRgba(unifiedBorderColor, unifiedBorderOpacity)
            updates.borderRadius = `${unifiedBorderRadius}px`

            // 清除独立边框样式
            updates.borderTopWidth = ''
            updates.borderRightWidth = ''
            updates.borderBottomWidth = ''
            updates.borderLeftWidth = ''
            updates.borderTopStyle = ''
            updates.borderRightStyle = ''
            updates.borderBottomStyle = ''
            updates.borderLeftStyle = ''
            updates.borderTopColor = ''
            updates.borderRightColor = ''
            updates.borderBottomColor = ''
            updates.borderLeftColor = ''
            updates.borderTopLeftRadius = ''
            updates.borderTopRightRadius = ''
            updates.borderBottomRightRadius = ''
            updates.borderBottomLeftRadius = ''
        } else {
            // 独立模式
            updates.borderTopWidth = `${borderTopWidth}px`
            updates.borderTopStyle = borderTopStyle
            updates.borderTopColor = hexToRgba(borderTopColor, borderTopOpacity)

            updates.borderRightWidth = `${borderRightWidth}px`
            updates.borderRightStyle = borderRightStyle
            updates.borderRightColor = hexToRgba(borderRightColor, borderRightOpacity)

            updates.borderBottomWidth = `${borderBottomWidth}px`
            updates.borderBottomStyle = borderBottomStyle
            updates.borderBottomColor = hexToRgba(borderBottomColor, borderBottomOpacity)

            updates.borderLeftWidth = `${borderLeftWidth}px`
            updates.borderLeftStyle = borderLeftStyle
            updates.borderLeftColor = hexToRgba(borderLeftColor, borderLeftOpacity)

            updates.borderTopLeftRadius = `${borderTopLeftRadius}px`
            updates.borderTopRightRadius = `${borderTopRightRadius}px`
            updates.borderBottomRightRadius = `${borderBottomRightRadius}px`
            updates.borderBottomLeftRadius = `${borderBottomLeftRadius}px`

            // 清除统一边框样式
            updates.borderWidth = ''
            updates.borderStyle = ''
            updates.borderColor = ''
            updates.borderRadius = ''
        }

        projectStore.updateNodeStyle(selectedId, updates)
    }

    // 重置所有边框属性
    function resetAllProps() {
        if (isUnifiedMode) {
            unifiedBorderWidth = 1
            unifiedBorderStyle = 'solid'
            unifiedBorderColor = '#000000'
            unifiedBorderOpacity = 1
            unifiedBorderRadius = 0
        } else {
            borderTopWidth = 1
            borderTopStyle = 'solid'
            borderTopColor = '#000000'
            borderTopOpacity = 1

            borderRightWidth = 1
            borderRightStyle = 'solid'
            borderRightColor = '#000000'
            borderRightOpacity = 1

            borderBottomWidth = 1
            borderBottomStyle = 'solid'
            borderBottomColor = '#000000'
            borderBottomOpacity = 1

            borderLeftWidth = 1
            borderLeftStyle = 'solid'
            borderLeftColor = '#000000'
            borderLeftOpacity = 1

            borderTopLeftRadius = 0
            borderTopRightRadius = 0
            borderBottomRightRadius = 0
            borderBottomLeftRadius = 0
        }

        updateBorderStyles()
    }

    // 监听selectedId变化
    $effect(() => {
        if (selectedId) {
            initBorderProps()
        }
    })

    // 监听状态变化
    $effect(() => {
        if (selectedId) {
            updateBorderStyles()
        }
    })
</script>

<div class="border-editor">
    {#if selectedId}
        <h3>边框样式</h3>
        
        <!-- 控制模式切换 -->
        <div class="control-mode">
            <label class="radio-label">
                <input type="radio" name="border-mode" bind:group={isUnifiedMode} value={true} />
                统一控制
            </label>
            <label class="radio-label">
                <input type="radio" name="border-mode" bind:group={isUnifiedMode} value={false} />
                独立控制
            </label>
        </div>

        {#if isUnifiedMode}
            <!-- 统一控制面板 -->
            <div class="border-list">
                <div class="border-item">
                    <label for="unified-border-width">边框宽度</label>
                    <ResponsiveSlider 
                        bind:value={unifiedBorderWidth} 
                        min={0} 
                        max={20} 
                        step={1} 
                        oninput={updateBorderStyles} 
                    />
                    <span class="unit-fixed">px</span>
                </div>

                <div class="border-item">
                    <label for="unified-border-style">边框样式</label>
                    <select id="unified-border-style" bind:value={unifiedBorderStyle} onchange={updateBorderStyles}>
                        {#each borderStyleOptions as option}
                            <option value={option.value}>{option.label}</option>
                        {/each}
                    </select>
                    <span class="unit-placeholder"></span>
                </div>

                <div class="border-item">
                    <label for="unified-border-color">边框颜色</label>
                    <ColorPicker
                        value={hexToRgba(unifiedBorderColor, unifiedBorderOpacity)}
                        projectId={projectId()}
                        componentId={selectedId}
                        onchange={(rgba: string) => {
                            const parsed = parseRgba(rgba)
                            if (parsed) {
                                unifiedBorderColor = rgbToHex(parsed.r, parsed.g, parsed.b)
                                unifiedBorderOpacity = parsed.a
                                updateBorderStyles()
                            }
                        }}
                    />
                    <span class="unit-placeholder"></span>
                </div>

                <div class="border-item">
                    <label for="unified-border-radius">圆角半径</label>
                    <ResponsiveSlider 
                        bind:value={unifiedBorderRadius} 
                        min={0} 
                        max={50} 
                        step={1} 
                        oninput={updateBorderStyles} 
                    />
                    <span class="unit-fixed">px</span>
                </div>
            </div>
        {:else}
            <!-- 独立控制面板 -->
            <div class="border-list">
                <!-- 上边框 -->
                <div class="border-section">
                    <h4>上边框</h4>
                    <div class="border-item">
                        <label for="border-top-width">宽度</label>
                        <ResponsiveSlider 
                            bind:value={borderTopWidth} 
                            min={0} 
                            max={20} 
                            step={1} 
                            oninput={updateBorderStyles} 
                        />
                        <span class="unit-fixed">px</span>
                    </div>
                    <div class="border-item">
                        <label for="border-top-style">样式</label>
                        <select id="border-top-style" bind:value={borderTopStyle} onchange={updateBorderStyles}>
                            {#each borderStyleOptions as option}
                                <option value={option.value}>{option.label}</option>
                            {/each}
                        </select>
                        <span class="unit-placeholder"></span>
                    </div>
                    <div class="border-item">
                        <label for="border-top-color">颜色</label>
                        <ColorPicker
                            value={hexToRgba(borderTopColor, borderTopOpacity)}
                            projectId={projectId()}
                            componentId={`${selectedId}-top`}
                            onchange={(rgba: string) => {
                                const parsed = parseRgba(rgba)
                                if (parsed) {
                                    borderTopColor = rgbToHex(parsed.r, parsed.g, parsed.b)
                                    borderTopOpacity = parsed.a
                                    updateBorderStyles()
                                }
                            }}
                        />
                        <span class="unit-placeholder"></span>
                    </div>
                </div>

                <!-- 右边框 -->
                <div class="border-section">
                    <h4>右边框</h4>
                    <div class="border-item">
                        <label for="border-right-width">宽度</label>
                        <ResponsiveSlider 
                            bind:value={borderRightWidth} 
                            min={0} 
                            max={20} 
                            step={1} 
                            oninput={updateBorderStyles} 
                        />
                        <span class="unit-fixed">px</span>
                    </div>
                    <div class="border-item">
                        <label for="border-right-style">样式</label>
                        <select id="border-right-style" bind:value={borderRightStyle} onchange={updateBorderStyles}>
                            {#each borderStyleOptions as option}
                                <option value={option.value}>{option.label}</option>
                            {/each}
                        </select>
                        <span class="unit-placeholder"></span>
                    </div>
                    <div class="border-item">
                        <label for="border-right-color">颜色</label>
                        <ColorPicker
                            value={hexToRgba(borderRightColor, borderRightOpacity)}
                            projectId={projectId()}
                            componentId={`${selectedId}-right`}
                            onchange={(rgba: string) => {
                                const parsed = parseRgba(rgba)
                                if (parsed) {
                                    borderRightColor = rgbToHex(parsed.r, parsed.g, parsed.b)
                                    borderRightOpacity = parsed.a
                                    updateBorderStyles()
                                }
                            }}
                        />
                        <span class="unit-placeholder"></span>
                    </div>
                </div>

                <!-- 下边框 -->
                <div class="border-section">
                    <h4>下边框</h4>
                    <div class="border-item">
                        <label for="border-bottom-width">宽度</label>
                        <ResponsiveSlider 
                            bind:value={borderBottomWidth} 
                            min={0} 
                            max={20} 
                            step={1} 
                            oninput={updateBorderStyles} 
                        />
                        <span class="unit-fixed">px</span>
                    </div>
                    <div class="border-item">
                        <label for="border-bottom-style">样式</label>
                        <select id="border-bottom-style" bind:value={borderBottomStyle} onchange={updateBorderStyles}>
                            {#each borderStyleOptions as option}
                                <option value={option.value}>{option.label}</option>
                            {/each}
                        </select>
                        <span class="unit-placeholder"></span>
                    </div>
                    <div class="border-item">
                        <label for="border-bottom-color">颜色</label>
                        <ColorPicker
                            value={hexToRgba(borderBottomColor, borderBottomOpacity)}
                            projectId={projectId()}
                            componentId={`${selectedId}-bottom`}
                            onchange={(rgba: string) => {
                                const parsed = parseRgba(rgba)
                                if (parsed) {
                                    borderBottomColor = rgbToHex(parsed.r, parsed.g, parsed.b)
                                    borderBottomOpacity = parsed.a
                                    updateBorderStyles()
                                }
                            }}
                        />
                        <span class="unit-placeholder"></span>
                    </div>
                </div>

                <!-- 左边框 -->
                <div class="border-section">
                    <h4>左边框</h4>
                    <div class="border-item">
                        <label for="border-left-width">宽度</label>
                        <ResponsiveSlider 
                            bind:value={borderLeftWidth} 
                            min={0} 
                            max={20} 
                            step={1} 
                            oninput={updateBorderStyles} 
                        />
                        <span class="unit-fixed">px</span>
                    </div>
                    <div class="border-item">
                        <label for="border-left-style">样式</label>
                        <select id="border-left-style" bind:value={borderLeftStyle} onchange={updateBorderStyles}>
                            {#each borderStyleOptions as option}
                                <option value={option.value}>{option.label}</option>
                            {/each}
                        </select>
                        <span class="unit-placeholder"></span>
                    </div>
                    <div class="border-item">
                        <label for="border-left-color">颜色</label>
                        <ColorPicker
                            value={hexToRgba(borderLeftColor, borderLeftOpacity)}
                            projectId={projectId()}
                            componentId={`${selectedId}-left`}
                            onchange={(rgba: string) => {
                                const parsed = parseRgba(rgba)
                                if (parsed) {
                                    borderLeftColor = rgbToHex(parsed.r, parsed.g, parsed.b)
                                    borderLeftOpacity = parsed.a
                                    updateBorderStyles()
                                }
                            }}
                        />
                        <span class="unit-placeholder"></span>
                    </div>
                </div>

                <!-- 圆角独立控制 -->
                <div class="border-section">
                    <h4>圆角控制</h4>
                    <div class="border-item">
                        <label for="border-top-left-radius">左上圆角</label>
                        <ResponsiveSlider 
                            bind:value={borderTopLeftRadius} 
                            min={0} 
                            max={50} 
                            step={1} 
                            oninput={updateBorderStyles} 
                        />
                        <span class="unit-fixed">px</span>
                    </div>
                    <div class="border-item">
                        <label for="border-top-right-radius">右上圆角</label>
                        <ResponsiveSlider 
                            bind:value={borderTopRightRadius} 
                            min={0} 
                            max={50} 
                            step={1} 
                            oninput={updateBorderStyles} 
                        />
                        <span class="unit-fixed">px</span>
                    </div>
                    <div class="border-item">
                        <label for="border-bottom-right-radius">右下圆角</label>
                        <ResponsiveSlider 
                            bind:value={borderBottomRightRadius} 
                            min={0} 
                            max={50} 
                            step={1} 
                            oninput={updateBorderStyles} 
                        />
                        <span class="unit-fixed">px</span>
                    </div>
                    <div class="border-item">
                        <label for="border-bottom-left-radius">左下圆角</label>
                        <ResponsiveSlider 
                            bind:value={borderBottomLeftRadius} 
                            min={0} 
                            max={50} 
                            step={1} 
                            oninput={updateBorderStyles} 
                        />
                        <span class="unit-fixed">px</span>
                    </div>
                </div>
            </div>
        {/if}

        <!-- 重置按钮 -->
        <div class="border-item" style="margin-top: calc(20px * var(--scale-ratio, 1))">
            <button class="reset-button" onclick={resetAllProps}>
                重置边框
            </button>
        </div>
    {:else}
        <p class="placeholder">请选择一个节点来编辑边框</p>
    {/if}
</div>

<style>
    .border-editor {
        padding: calc(20px * var(--scale-ratio, 1));
        color: #e2e8f0;
    }

    h3 {
        margin: 0 0 calc(16px * var(--scale-ratio, 1)) 0;
        font-size: calc(16px * var(--scale-ratio, 1));
        font-weight: 600;
        color: #cbd5e1;
    }

    .control-mode {
        display: flex;
        gap: calc(20px * var(--scale-ratio, 1));
        margin-bottom: calc(20px * var(--scale-ratio, 1));
        padding: calc(10px * var(--scale-ratio, 1));
        background: rgba(30, 41, 59, 0.5);
        border-radius: calc(8px * var(--scale-ratio, 1));
    }

    .radio-label {
        display: flex;
        align-items: center;
        gap: calc(8px * var(--scale-ratio, 1));
        cursor: pointer;
        font-size: calc(14px * var(--scale-ratio, 1));
        color: #cbd5e1;
    }

    .radio-label input[type="radio"] {
        margin: 0;
        cursor: pointer;
    }

    .border-list {
        display: flex;
        flex-direction: column;
        gap: calc(16px * var(--scale-ratio, 1));
    }

    .border-section {
        background: rgba(30, 41, 59, 0.3);
        padding: calc(12px * var(--scale-ratio, 1));
        border-radius: calc(8px * var(--scale-ratio, 1));
        border: 1px solid rgba(51, 65, 85, 0.5);
    }

    .border-section h4 {
        margin: 0 0 calc(12px * var(--scale-ratio, 1)) 0;
        font-size: calc(14px * var(--scale-ratio, 1));
        font-weight: 600;
        color: #94a3b8;
    }

    .border-item {
        display: flex;
        align-items: center;
        gap: calc(10px * var(--scale-ratio, 1));
        margin-bottom: calc(8px * var(--scale-ratio, 1));
    }

    .border-item:last-child {
        margin-bottom: 0;
    }

    label {
        min-width: calc(80px * var(--scale-ratio, 1));
        font-size: calc(14px * var(--scale-ratio, 1));
        color: #cbd5e1;
    }

    select {
        flex: 1;
        padding: calc(6px * var(--scale-ratio, 1));
        background: rgba(30, 41, 59, 0.8);
        border: 1px solid rgba(71, 85, 105, 0.5);
        border-radius: calc(4px * var(--scale-ratio, 1));
        color: #e2e8f0;
        font-size: calc(14px * var(--scale-ratio, 1));
    }

    select:focus {
        outline: none;
        border-color: #6366f1;
    }

    .unit-fixed {
        min-width: calc(30px * var(--scale-ratio, 1));
        text-align: center;
        font-size: calc(12px * var(--scale-ratio, 1));
        color: #94a3b8;
        background: rgba(30, 41, 59, 0.5);
        padding: calc(4px * var(--scale-ratio, 1));
        border-radius: calc(4px * var(--scale-ratio, 1));
        border: 1px solid rgba(51, 65, 85, 0.3);
    }

    .unit-placeholder {
        min-width: calc(30px * var(--scale-ratio, 1));
    }

    .reset-button {
        width: 100%;
        padding: calc(8px * var(--scale-ratio, 1));
        background: rgba(239, 68, 68, 0.2);
        color: #f87171;
        border: 1px solid rgba(239, 68, 68, 0.3);
        border-radius: calc(4px * var(--scale-ratio, 1));
        cursor: pointer;
        font-size: calc(14px * var(--scale-ratio, 1));
        transition: all 0.2s ease;
    }

    .reset-button:hover {
        background: rgba(239, 68, 68, 0.3);
        border-color: rgba(239, 68, 68, 0.5);
    }

    .placeholder {
        color: #64748b;
        font-style: italic;
        text-align: center;
        margin-top: calc(40px * var(--scale-ratio, 1));
        font-size: calc(14px * var(--scale-ratio, 1));
    }
</style>
