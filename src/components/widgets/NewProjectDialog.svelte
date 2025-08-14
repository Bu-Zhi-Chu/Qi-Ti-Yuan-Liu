<!--
 * 新建项目对话框 - NewProjectDialog
 * 功能：输入项目名称 + 选择模板 + 确定/取消
 * 依赖：ResponsiveBox、GenericCard
 * 事件：
 *   onConfirm(name: string)  确认并返回项目名称
 *   onCancel                取消并关闭窗口
-->

<script lang="ts">
    import { onMount, onDestroy } from 'svelte'
    import ResponsiveBox from '../core/ResponsiveBox.svelte'
    import GenericCard from './GenericCard.svelte'
    import DexieService from '../../services/database/dexie-service'
    import Dexie from 'dexie'

    // Props定义
    interface Props {
        onConfirm?: (name: string) => void
        onCancel?: () => void
    }
    let { onConfirm, onCancel }: Props = $props()

    // 类型定义
    interface TemplateInfo {
        id: string
        name: string
        desc: string
        cover?: string | Blob
        tag: string
        thumbnailUrl?: string | Blob
    }

    // 状态管理
    let templates = $state<TemplateInfo[]>([])
    let selected = $state('blank')
    let projectName = $state('')
    let isLoading = $state(true)
    const inputId: string = 'project-name-' + Math.random().toString(36).slice(2)

    onMount(async () => {
        try {
            const data = await DexieService.queryRecords<TemplateInfo>('qi-qiao-ban', 'templates')
            templates = data
        } finally {
            isLoading = false
        }
    })

    onDestroy(() => {
        templates.forEach(tpl => {
            if (typeof tpl.cover === 'string' && tpl.cover.startsWith('blob:')) {
                URL.revokeObjectURL(tpl.cover)
            }
            if (typeof tpl.thumbnailUrl === 'string' && tpl.thumbnailUrl.startsWith('blob:')) {
                URL.revokeObjectURL(tpl.thumbnailUrl)
            }
        })
    })

    const confirm = async () => {
        const name = projectName.trim()
        if (!name) {
            alert('请输入项目名称')
            return
        }
        const tpl = templates.find((t) => t.id === selected)
        const db = new Dexie('qi-qiao-ban')
        await db.open()
        await db.table('projects').add({
            name,
            createdAt: Date.now(),
            templateId: selected,
            thumbnailUrl: tpl?.thumbnailUrl ?? tpl?.cover ?? ''
        })
        onConfirm?.(name)
    }

    const cancel = () => onCancel?.()
</script>

<ResponsiveBox style="display:flex; flex-direction:column; height:100%; width:100%; padding:16px; box-sizing:border-box;">
    <!-- 项目名称输入 -->
    <label for={inputId} style="font-size:calc(14px*var(--scale-ratio,1)); color:#cbd5e1; margin-bottom:calc(8px*var(--scale-ratio,1));">项目名称</label>
    <input
        id={inputId}
        bind:value={projectName}
        placeholder="请输入项目名称"
        style="height:calc(36px*var(--scale-ratio,1)); font-size:calc(14px*var(--scale-ratio,1)); padding:0 calc(12px*var(--scale-ratio,1)); border-radius:calc(8px*var(--scale-ratio,1)); border:calc(1px*var(--scale-ratio,1)) solid rgba(148,163,184,0.3); background:rgba(15,23,42,0.4); color:#f1f5f9; outline:none;"
    />

    <!-- 模板选择 -->
    <span style="font-size:calc(14px*var(--scale-ratio,1)); color:#cbd5e1; margin:calc(16px*var(--scale-ratio,1)) 0 calc(8px*var(--scale-ratio,1));">选择模板</span>
    <div class="grid">
        {#each templates as tpl}
            <button type="button" class="tpl-btn" style="border:calc(2px*var(--scale-ratio,1)) solid {selected === tpl.id ? 'rgba(99,102,241,0.8)' : 'rgba(99,102,241,0.2)'}; border-radius:calc(8px*var(--scale-ratio,1));" onclick={() => (selected = tpl.id)}>
                <GenericCard prop1={tpl.id} prop2={tpl.name} prop3={tpl.desc} prop4={tpl.thumbnailUrl} prop5={tpl.tag} />
            </button>
        {/each}
    </div>

    <!-- 操作按钮 -->
    <div class="btn-group" style="margin-top:auto;">
        <button onclick={cancel}>取消</button>
        <button onclick={confirm}>确定</button>
    </div>
</ResponsiveBox>

<style>
    .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(calc(180px * var(--scale-ratio, 1)), 1fr));
        gap: calc(16px * var(--scale-ratio, 1));
        padding: calc(8px * var(--scale-ratio, 1)) 0;
        overflow-y: auto;
        max-height: 60%;
    }
    .btn-group {
        display: flex;
        justify-content: flex-end;
        gap: calc(16px * var(--scale-ratio, 1));
        margin-top: calc(24px * var(--scale-ratio, 1));
    }
    /* 主按钮样式 */
    button {
        padding: calc(8px * var(--scale-ratio, 1)) calc(24px * var(--scale-ratio, 1));
        font-size: calc(14px * var(--scale-ratio, 1));
        border-radius: calc(8px * var(--scale-ratio, 1));
        border: none;
        background: linear-gradient(135deg, #6366f1 0%, #7c3aed 100%);
        color: #f8fafc;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        transition:
            transform 0.15s ease,
            box-shadow 0.15s ease;
    }
    button:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.25);
    }

    /* 模板卡片按钮，重置默认按钮样式 */
    .tpl-btn {
        display: block;
        padding: 0;
        background: transparent;
        cursor: pointer;
        transition: border-color 0.2s;
    }
    .tpl-btn:focus-visible {
        outline: calc(2px * var(--scale-ratio, 1)) solid rgba(99, 102, 241, 0.8);
        outline-offset: calc(2px * var(--scale-ratio, 1));
    }
</style>
