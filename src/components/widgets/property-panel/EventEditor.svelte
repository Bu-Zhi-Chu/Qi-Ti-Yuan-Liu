<!-- EventEditor.svelte
     节点事件编辑器
     提供节点事件的可视化编辑界面
-->
<script lang="ts">
    import { EVENT_WHITELIST } from '../../../services/property-panel/constants'
    import { getNodeProps, updateNodeProps } from '../../../services/property-panel/property-panel.service'

    export let selectedId: string | null = null
    let eventSnapshot: ReturnType<typeof getNodeProps> | null = null
    let currentEvents: Record<string, string> = {}

    $: if (selectedId) {
        eventSnapshot = getNodeProps(selectedId)
        // 将函数转换为字符串表示
        currentEvents = {}
        if (eventSnapshot?.events) {
            Object.entries(eventSnapshot.events).forEach(([key, fn]) => {
                if (typeof fn === 'function') {
                    currentEvents[key] = fn.toString()
                }
            })
        }
    }

    function handleEventChange(key: string, value: string) {
        if (!selectedId) return

        currentEvents[key] = value
        try {
            // 创建新的函数对象
            const fn = new Function('event', value)
            updateNodeProps(selectedId, {
                events: { [key]: fn }
            })
        } catch (error) {
            console.warn('无效的JavaScript代码:', error)
            // 如果代码无效，不更新事件
            updateNodeProps(selectedId, {
                events: { [key]: undefined }
            })
        }
    }

    function handleEventRemove(key: string) {
        if (!selectedId) return

        delete currentEvents[key]
        updateNodeProps(selectedId, {
            events: { [key]: undefined }
        })
    }
</script>

<div class="event-editor">
    {#if selectedId && eventSnapshot}
        <h3>节点事件</h3>
        <div class="event-list">
            {#each EVENT_WHITELIST as eventKey}
                <div class="event-item">
                    <label for="event-{eventKey}">on{eventKey}:</label>
                    <textarea id="event-{eventKey}" value={currentEvents[eventKey] || ''} oninput={(e) => handleEventChange(eventKey, e.currentTarget.value)} placeholder={`输入${eventKey}事件处理函数...\n例如:\nconsole.log('Clicked!');\nreturn false;`} rows="3"></textarea>
                    {#if currentEvents[eventKey]}
                        <button class="remove-btn" onclick={() => handleEventRemove(eventKey)} title="移除事件">×</button>
                    {/if}
                </div>
            {/each}
        </div>
    {:else}
        <p class="placeholder">请选择一个节点来编辑事件</p>
    {/if}
</div>

<style>
    .event-editor {
        padding: calc(20px * var(--scale-ratio, 1));
        background: #0f172a;
        color: #e2e8f0;
    }

    h3 {
        margin: 0 0 calc(16px * var(--scale-ratio, 1)) 0;
        font-size: calc(16px * var(--scale-ratio, 1));
        font-weight: 600;
        color: #cbd5e1;
    }

    .event-list {
        display: flex;
        flex-direction: column;
        gap: calc(12px * var(--scale-ratio, 1));
    }

    .event-item {
        display: flex;
        flex-direction: column;
        gap: calc(8px * var(--scale-ratio, 1));
        padding: calc(12px * var(--scale-ratio, 1));
        background: rgba(255, 255, 255, 0.05);
        border-radius: calc(8px * var(--scale-ratio, 1));
        transition: all 0.3s ease;
    }

    .event-item:hover {
        background: rgba(255, 255, 255, 0.08);
        transform: translateY(-1px);
    }

    label {
        font-size: calc(13px * var(--scale-ratio, 1));
        font-weight: 500;
        color: #94a3b8;
    }

    textarea {
        padding: calc(8px * var(--scale-ratio, 1)) calc(12px * var(--scale-ratio, 1));
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: calc(6px * var(--scale-ratio, 1));
        font-size: calc(13px * var(--scale-ratio, 1));
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        resize: vertical;
        min-height: calc(80px * var(--scale-ratio, 1));
        background: rgba(255, 255, 255, 0.1);
        color: #e2e8f0;
        transition: all 0.3s ease;
        line-height: 1.4;
    }

    textarea:focus {
        outline: none;
        border-color: #cbd5e1;
        background: rgba(255, 255, 255, 0.15);
        box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.1);
    }

    textarea::placeholder {
        color: #9ca3af;
        font-style: italic;
    }

    .remove-btn {
        width: calc(24px * var(--scale-ratio, 1));
        height: calc(24px * var(--scale-ratio, 1));
        padding: 0;
        border: none;
        background: rgba(239, 68, 68, 0.2);
        color: #f87171;
        border-radius: 50%;
        cursor: pointer;
        font-size: calc(14px * var(--scale-ratio, 1));
        line-height: 1;
        align-self: flex-end;
        transition: all 0.3s ease;
    }

    .remove-btn:hover {
        background: rgba(239, 68, 68, 0.3);
        transform: scale(1.1);
    }

    .remove-btn:active {
        transform: scale(0.95);
    }

    .placeholder {
        color: #64748b;
        font-style: italic;
        text-align: center;
        margin-top: calc(40px * var(--scale-ratio, 1));
        font-size: calc(14px * var(--scale-ratio, 1));
    }
</style>
