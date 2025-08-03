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
    import { onMount } from 'svelte'

    /* --------------------------- Props (Runes) --------------------------- */
    interface Props {
        title?: string
        width?: number // 初始宽度，px
        height?: number // 初始高度，px
        closeOnOverlay?: boolean
        onClose?: () => void
        overlayColor?: string // 遮罩颜色
        children?: import('svelte').Snippet
    }

    let { title = '窗口', width = 600, height = 400, closeOnOverlay = false, overlayColor = 'rgba(15,23,42,0.8)', onClose, children }: Props = $props()

    /* ----------------------------- State ----------------------------- */
    // 最大化状态
    let isMaximized = $state(false)

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

    /* ----------------------------- Styles ---------------------------- */
    const overlayStyle = $derived(`position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:${overlayColor};z-index:1000`)

    const baseWindowStyle = $derived(() => {
        if (isMaximized) {
            return 'position:fixed;inset:0;margin:0;'
        }
        return `position:absolute;width:calc(${restoreRect.width}px * var(--scale-ratio, 1));height:calc(${restoreRect.height}px * var(--scale-ratio, 1));left:50%;top:50%;transform:translate(-50%,-50%);`
    })

    // 标题栏动态样式（根据拖拽/最大化状态切换 cursor）
    const titleBarStyle = $derived(() => 'height:calc(32px * var(--scale-ratio, 1));background:#0f172a;color:#f8fafc;display:flex;align-items:center;justify-content:space-between;user-select:none;cursor:default')

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
</script>

<!-- 遮罩层 -->
<!-- svelte-ignore a11y_click_events_have_key_events,a11y_no_static_element_interactions -->
<div style={overlayStyle} onclick={handleOverlayClick}>
    <!-- 窗口主体 -->
    <div bind:this={windowRef} style={baseWindowStyle()}>
        <ResponsiveBox style="width:100%;height:100%;background:linear-gradient(135deg, #1e293b 0%, #334155 100%);color:#f8fafc;border-radius:calc(6px * var(--scale-ratio, 1));box-shadow:0 2px 8px rgba(0,0,0,0.3);overflow:hidden;display:flex;flex-direction:column;">
            <!-- 标题栏 -->
            <!-- 标题栏 -->
            <SimpleBox style={titleBarStyle()}>
                <!-- 左侧标题 -->
                <span style="padding-left:calc(12px * var(--scale-ratio, 1));font-size:calc(14px * var(--scale-ratio, 1));">{title}</span>
                <!-- 右侧按钮 -->
                <span style="display:flex;height:100%">
                    <button onclick={toggleMaximize} style="all:unset;width:calc(32px * var(--scale-ratio, 1));height:100%;display:flex;align-items:center;justify-content:center;cursor:pointer;">
                        {#if isMaximized}
                            🗗
                        {:else}
                            🗖
                        {/if}
                    </button>
                    <button onclick={close} style="all:unset;width:calc(32px * var(--scale-ratio, 1));height:100%;display:flex;align-items:center;justify-content:center;cursor:pointer;">✕</button>
                </span>
            </SimpleBox>

            <!-- 内容区域 -->
            <SimpleBox style="flex:1;overflow:auto;padding:calc(16px * var(--scale-ratio, 1));">
                {@render children?.()}
            </SimpleBox>
        </ResponsiveBox>
    </div>
</div>
