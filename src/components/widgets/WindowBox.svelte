<!--
  * WindowBox 窗口组件（含遮罩、标题栏、可选拖拽、最大化/还原、关闭）
  * ---------------------------------------------------------------------
  * 外层使用 ResponsiveBox 提供缩放自适应，内部使用 SimpleBox 承载内容。
  * 组件特性：
  * 1. 背景遮罩：默认 rgba(0,0,0,0.5)，可点击遮罩关闭（可配置）。
  * 2. 标题栏：左侧标题文本，右侧最大化/还原 和 关闭 按钮。
  * 3. 可配置拖拽 draggable (默认 true)。
  * 4. 最大化/还原：最大化填满可视区域；还原恢复初始尺寸 + 拖拽位置。
  * 5. 关闭：点击关闭按钮或遮罩后自动卸载（由父级控制 if 块），并回调 onClose。
  * 6. 默认居中显示。
  * ---------------------------------------------------------------------
  * 使用示例：
  * {#if show}
  *   <WindowBox
  *     title="示例窗口"
  *     width={600}
  *     height={400}
  *     onClose={() => (show = false)}
  *     draggable
  *   >
  *       <p slot="default">窗口内容</p>
  *   </WindowBox>
  * {/if}
  * ---------------------------------------------------------------------
-->

<script lang="ts">
    import ResponsiveBox from '../Core/ResponsiveBox.svelte'
    import SimpleBox from '../Core/SimpleBox.svelte'
    import { onMount, onDestroy } from 'svelte'

    /* --------------------------- Props (Runes) --------------------------- */
    interface Props {
        title?: string
        width?: number // 初始宽度，px
        height?: number // 初始高度，px
        draggable?: boolean
        closeOnOverlay?: boolean
        onClose?: () => void
        overlayColor?: string // 遮罩颜色
        children?: import('svelte').Snippet
    }

    let { title = '窗口', width = 600, height = 400, draggable = true, closeOnOverlay = false, overlayColor = 'rgba(0,0,0,0.5)', onClose, children }: Props = $props()

    /* ----------------------------- State ----------------------------- */
    // 最大化状态
    let isMaximized = $state(false)
    // 拖拽相关
    let offsetX = 0,
        offsetY = 0
    let startX = 0,
        startY = 0
    let isDragging = false
    // 是否已移动，用于区分初始居中与拖拽后定位
    let hasMoved = $state(false)

    // 记录还原时尺寸 & 位置（相对于视口）
    let restoreRect = {
        width,
        height,
        left: 0,
        top: 0
    }

    let windowRef: HTMLDivElement = $state() as HTMLDivElement

    /* ------------------------ Event Handlers ------------------------- */
    function handleOverlayClick(e: MouseEvent) {
        if (e.target === e.currentTarget && closeOnOverlay) {
            close()
        }
    }

    function close() {
        onClose?.()
    }

    function toggleMaximize() {
        if (!windowRef) return
        if (!isMaximized) {
            // 进入最大化：记录还原信息
            const rect = windowRef.getBoundingClientRect()
            restoreRect = {
                width: rect.width,
                height: rect.height,
                left: rect.left,
                top: rect.top
            }
            isMaximized = true
        } else {
            // 还原
            isMaximized = false
        }
    }

    function pointerDown(e: PointerEvent) {
        if (!draggable || isMaximized) return
        isDragging = true
        startX = e.clientX
        startY = e.clientY
        const rect = windowRef.getBoundingClientRect()
        offsetX = rect.left
        offsetY = rect.top
        window.addEventListener('pointermove', pointerMove)
        window.addEventListener('pointerup', pointerUp)
    }

    function pointerMove(e: PointerEvent) {
        if (!isDragging || isMaximized) return
        const dx = e.clientX - startX
        const dy = e.clientY - startY
        hasMoved = true
        // 重新赋值对象以触发响应式更新
        restoreRect = {
            ...restoreRect,
            left: offsetX + dx,
            top: offsetY + dy
        }
    }

    function pointerUp() {
        isDragging = false
        window.removeEventListener('pointermove', pointerMove)
        window.removeEventListener('pointerup', pointerUp)
    }

    /* ----------------------------- Styles ---------------------------- */
    const overlayStyle = $derived(`position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:${overlayColor};z-index:1000`)

    const baseWindowStyle = $derived(() => {
        if (isMaximized) {
            return 'position:fixed;inset:0;margin:0;'
        }
        if (!hasMoved) {
            return `position:absolute;width:${restoreRect.width}px;height:${restoreRect.height}px;left:50%;top:50%;transform:translate(-50%,-50%);`
        }
        return `position:absolute;width:${restoreRect.width}px;height:${restoreRect.height}px;left:${restoreRect.left}px;top:${restoreRect.top}px;`
    })

    // 标题栏动态样式（根据拖拽/最大化状态切换 cursor）
    const titleBarStyle = $derived(() => `height:32px;background:#333;color:#fff;display:flex;align-items:center;justify-content:space-between;user-select:none;cursor:${draggable && !isMaximized ? 'move' : 'default'}`)

    /* ----------------------------- Mount ----------------------------- */
    onMount(() => {
        // 初始居中位置
        if (windowRef && !isMaximized) {
            const { innerWidth, innerHeight } = window
            restoreRect = {
                ...restoreRect,
                left: (innerWidth - width) / 2,
                top: (innerHeight - height) / 2
            }
        }
    })

    onDestroy(() => {
        // 清理拖拽监听 (保险)
        pointerUp()
    })
</script>

<!-- 遮罩层 -->
<!-- svelte-ignore a11y_click_events_have_key_events,a11y_no_static_element_interactions -->
<div style={overlayStyle} onclick={handleOverlayClick}>
    <!-- 窗口主体 -->
    <div bind:this={windowRef} style={baseWindowStyle()}>
        <ResponsiveBox style="width:100%;height:100%;background:#fff;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,0.3);overflow:hidden;display:flex;flex-direction:column;">
            <!-- 标题栏 -->
            <!-- 标题栏 -->
            <SimpleBox style={titleBarStyle()} onpointerdown={pointerDown}>
                <!-- 左侧标题 -->
                <span style="padding-left:12px;font-size:14px;">{title}</span>
                <!-- 右侧按钮 -->
                <span style="display:flex;height:100%">
                    <button onclick={toggleMaximize} style="all:unset;width:32px;height:100%;display:flex;align-items:center;justify-content:center;cursor:pointer;">
                        {#if isMaximized}
                            🗗
                        {:else}
                            🗖
                        {/if}
                    </button>
                    <button onclick={close} style="all:unset;width:32px;height:100%;display:flex;align-items:center;justify-content:center;cursor:pointer;">✕</button>
                </span>
            </SimpleBox>

            <!-- 内容区域 -->
            <SimpleBox style="flex:1;overflow:auto;padding:16px;">
                {@render children?.()}
            </SimpleBox>
        </ResponsiveBox>
    </div>
</div>
