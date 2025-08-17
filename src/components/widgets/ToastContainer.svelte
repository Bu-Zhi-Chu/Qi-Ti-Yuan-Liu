<!--
 * ToastContainer.svelte - Toast消息容器组件
 * 功能：管理并显示Toast消息队列
 * ---------------------------------------------------------------------
 * 内部组件，由Toast.svelte自动创建和管理
-->

<script lang="ts">
    import { onMount, onDestroy } from 'svelte'
    import ResponsiveBox from '../core/ResponsiveBox.svelte'
    import Icon from './Icon.svelte'

    type ToastType = 'success' | 'error' | 'warning' | 'info'

    interface ToastMessage {
        id: string
        message: string
        type: ToastType
        duration: number
    }

    let messages = $state<ToastMessage[]>([])

    function addToast(message: string, type: ToastType, duration: number) {
        const id = Date.now().toString() + Math.random().toString(36).substr(2, 9)
        messages = [...messages, { id, message, type, duration }]

        // 自动关闭
        if (duration > 0) {
            setTimeout(() => {
                removeToast(id)
            }, duration)
        }
    }

    function removeToast(id: string) {
        messages = messages.filter((msg) => msg.id !== id)
    }

    function handleToastShow(event: CustomEvent) {
        const { message, type = 'info', duration = 3000 } = event.detail
        addToast(message, type, duration)
    }

    onMount(() => {
        // 使用document作为事件监听器目标，确保事件始终能被捕获
        document.addEventListener('toast:show', handleToastShow as EventListener)
    })

    onDestroy(() => {
        document.removeEventListener('toast:show', handleToastShow as EventListener)
    })

    function getIconName(type: ToastType): 'Check' | 'X' | 'Alert' | 'Info' {
        switch (type) {
            case 'success':
                return 'Check'
            case 'error':
                return 'X'
            case 'warning':
                return 'Alert'
            case 'info':
                return 'Info'
            default:
                return 'Info'
        }
    }

    function getIconColor(type: ToastType): string {
        switch (type) {
            case 'success':
                return '#10b981'
            case 'error':
                return '#ef4444'
            case 'warning':
                return '#f59e0b'
            case 'info':
                return '#3b82f6'
            default:
                return '#6b7280'
        }
    }
</script>

<div style="display: flex; flex-direction: column; gap: 8px; align-items: center; transform-origin: center;">
    {#each messages as message (message.id)}
        <div
            class="toast-message"
            style="
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 12px 16px;
                background: rgba(15, 23, 42, 0.95);
                border: 1px solid rgba(148, 163, 184, 0.2);
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                color: #f1f5f9;
                font-size: 14px;
                min-width: 200px;
                max-width: 400px;
                pointer-events: auto;
                animation: slideIn 0.3s ease-out;
                transform-origin: center;
                transform: scale(var(--scale-ratio, 1));
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            "
        >
            <Icon name={getIconName(message.type)} size={16} color={getIconColor(message.type)} />
            <span style="flex: 1; overflow: hidden; text-overflow: ellipsis;">{message.message}</span>
            <button
                class="toast-close"
                onclick={() => removeToast(message.id)}
                title="关闭"
                style="
                    background: none;
                    border: none;
                    color: #94a3b8;
                    cursor: pointer;
                    font-size: 16px;
                    padding: 2px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                "
            >
                <Icon name="X" size={14} />
            </button>
        </div>
    {/each}
</div>

<style>
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: scale(var(--scale-ratio, 1)) translateX(100px);
        }
        to {
            opacity: 1;
            transform: scale(var(--scale-ratio, 1)) translateX(0);
        }
    }

    .toast-close:hover {
        color: #f1f5f9;
    }
</style>
