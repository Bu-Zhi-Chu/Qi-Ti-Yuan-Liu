<!--
 * Toast.svelte - 轻量级消息提示组件
 * 功能：提供类似系统alert的轻量级消息提示，支持自适应px缩放
 * 特性：
 *   1. 支持4种消息类型：success、error、warning、info
 *   2. 支持自动关闭和手动关闭
 *   3. 支持自适应px缩放，基于--scale-ratio变量
 *   4. 支持多个消息队列
 *   5. 支持自定义持续时间
 * ---------------------------------------------------------------------
 * 使用示例：
 * import Toast from './Toast.svelte'
 *
 * // 显示成功消息
 * Toast.success('操作成功')
 *
 * // 显示错误消息
 * Toast.error('操作失败')
 *
 * // 显示警告消息，自定义持续时间
 * Toast.warning('请注意', 5000)
 *
 * // 显示信息消息
 * Toast.info('提示信息')
-->

<script module lang="ts">
    import { mount, unmount } from 'svelte'
    import ToastContainer from './ToastContainer.svelte'

    type ToastType = 'success' | 'error' | 'warning' | 'info'

    interface ToastOptions {
        duration?: number
        type?: ToastType
    }

    let container: HTMLElement | null = null

    function ensureContainer() {
        if (!container) {
            container = document.createElement('div')
            container.id = 'toast-container'
            container.style.position = 'fixed'
            container.style.top = 'calc(20px * var(--scale-ratio, 1))'
            container.style.left = '50%'
            container.style.transform = 'translateX(-50%)'
            container.style.zIndex = '9999'
            container.style.pointerEvents = 'none'
            document.body.appendChild(container)

            // 确保DOM准备好后再mount组件
            requestAnimationFrame(() => {
                if (container) {
                    mount(ToastContainer, {
                        target: container
                    })
                }
            })
        }
    }

    export const Toast = {
        show(message: string, options: ToastOptions = {}) {
            ensureContainer()
            const event = new CustomEvent('toast:show', {
                detail: { message, ...options }
            })

            // 延迟分发事件，确保组件已挂载
            setTimeout(() => {
                document.dispatchEvent(event)
            }, 50)
        },

        success(message: string, duration = 3000) {
            this.show(message, { type: 'success', duration })
        },

        error(message: string, duration = 3000) {
            this.show(message, { type: 'error', duration })
        },

        warning(message: string, duration = 3000) {
            this.show(message, { type: 'warning', duration })
        },

        info(message: string, duration = 3000) {
            this.show(message, { type: 'info', duration })
        }
    }
</script>

<!-- 这是一个空文件，实际功能在模块脚本中实现 -->
