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
    import { DEFAULT_DB_NAME } from '../../config/config'
    import { Toast } from './Toast.svelte'

    interface Props {
        onConfirm?: (name: string, templateId: string, width: number, height: number, thumbnail?: Blob) => void
        onCancel?: () => void
        showTemplateAndSize?: boolean
        nameLabel?: string
        namePlaceholder?: string
    }
    let { onConfirm, onCancel, showTemplateAndSize = true, nameLabel = '项目名称', namePlaceholder = '请输入项目名称' }: Props = $props()

    // 类型定义
    interface TemplateInfo {
        id: string
        name: string
        desc: string
        cover?: string | Blob
        tag: string
        thumbnailUrl?: string | Blob
    }

    let templates = $state<TemplateInfo[]>([])
    let selected = $state('')
    let projectName = $state('')
    let projectImage: Blob | null = null
    let projectImageName = $state('')
    let designWidth = $state('1920')
    let designHeight = $state('1000')
    let isLoading = $state(true)
    let projectImageInput: HTMLInputElement | null = null
    const inputId: string = 'project-name-' + Math.random().toString(36).slice(2)

    onMount(async () => {
        try {
            console.log('📥【数据交互】加载模板列表')
            const data = await DexieService.queryRecords<TemplateInfo>(DEFAULT_DB_NAME, 'templates')
            templates = data
            if (data.length > 0) {
                selected = data[0].id
            }
        } finally {
            isLoading = false
        }
    })

    onDestroy(() => {
        templates.forEach((tpl) => {
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
            Toast.warning('请输入项目名称')
            return
        }
        const w = Number(designWidth)
        const h = Number(designHeight)
        if (!w || !h) {
            Toast.warning('请输入有效的设计宽高')
            return
        }

        try {
            await onConfirm?.(name, selected, w, h, projectImage || undefined)
        } finally {
            projectName = ''
            projectImage = null
            projectImageName = ''
            if (projectImageInput) {
                projectImageInput.value = ''
            }
        }
    }

    const cancel = () => onCancel?.()
</script>

<ResponsiveBox style="display:flex; flex-direction:column; height:100%; width:100%; padding:12px; box-sizing:border-box;">
    <!-- 项目名称输入 -->

    <span style="font-size:calc(14px*var(--scale-ratio,1)); color:#cbd5e1; margin:calc(8px*var(--scale-ratio,1)) 0 calc(4px*var(--scale-ratio,1));">
        {nameLabel}
    </span>
    <div style="display:flex; gap:calc(12px*var(--scale-ratio,1));">
        <input
            id={inputId}
            bind:value={projectName}
            placeholder={namePlaceholder}
            style="flex:1; height:calc(36px*var(--scale-ratio,1)); font-size:calc(14px*var(--scale-ratio,1)); padding:0 calc(12px*var(--scale-ratio,1)); border-radius:calc(8px*var(--scale-ratio,1)); border:calc(1px*var(--scale-ratio,1)) solid rgba(148,163,184,0.3); background:rgba(15,23,42,0.4); color:#f1f5f9; outline:none;"
            autocomplete="off"
        />
    </div>

    <span style="font-size:calc(14px*var(--scale-ratio,1)); color:#cbd5e1; margin:calc(8px*var(--scale-ratio,1)) 0 calc(4px*var(--scale-ratio,1));">项目图片（可选）</span>
    <div style="display:flex; gap:calc(12px*var(--scale-ratio,1)); align-items:center;">
        <input
            type="file"
            accept="image/*"
            bind:this={projectImageInput}
            onchange={(event) => {
                const input = event.target as HTMLInputElement
                const file = input.files && input.files[0] ? input.files[0] : null
                projectImage = file
                projectImageName = file ? file.name : ''
            }}
            style="display:none;"
        />
        <button
            type="button"
            style="flex:1; height:calc(36px*var(--scale-ratio,1)); font-size:calc(14px*var(--scale-ratio,1)); padding:0 calc(12px*var(--scale-ratio,1)); border-radius:calc(8px*var(--scale-ratio,1)); border:calc(1px*var(--scale-ratio,1)) solid rgba(148,163,184,0.3); background:rgba(15,23,42,0.15); color:#f1f5f9; outline:none; cursor:pointer; text-align:left;"
            onclick={() => projectImageInput && projectImageInput.click()}
        >
            {projectImageName || '上传图片'}
        </button>
    </div>

    <!-- 设计尺寸输入 -->
    {#if showTemplateAndSize}
        <span style="font-size:calc(14px*var(--scale-ratio,1)); color:#cbd5e1; margin:calc(8px*var(--scale-ratio,1)) 0 calc(4px*var(--scale-ratio,1));">设计尺寸</span>
        <div style="display:flex; gap:calc(12px*var(--scale-ratio,1));">
            <input
                type="number"
                bind:value={designWidth}
                min="1"
                placeholder="宽度(px)"
                style="flex:1; height:calc(36px*var(--scale-ratio,1)); font-size:calc(14px*var(--scale-ratio,1)); padding:0 calc(12px*var(--scale-ratio,1)); border-radius:calc(8px*var(--scale-ratio,1)); border:calc(1px*var(--scale-ratio,1)) solid rgba(148,163,184,0.3); background:rgba(15,23,42,0.4); color:#f1f5f9; outline:none;"
            />
            <input
                type="number"
                bind:value={designHeight}
                min="1"
                placeholder="高度(px)"
                style="flex:1; height:calc(36px*var(--scale-ratio,1)); font-size:calc(14px*var(--scale-ratio,1)); padding:0 calc(12px*var(--scale-ratio,1)); border-radius:calc(8px*var(--scale-ratio,1)); border:calc(1px*var(--scale-ratio,1)) solid rgba(148,163,184,0.3); background:rgba(15,23,42,0.4); color:#f1f5f9; outline:none;"
            />
        </div>

        <span style="font-size:calc(14px*var(--scale-ratio,1)); color:#cbd5e1; margin:calc(10px*var(--scale-ratio,1)) 0 calc(6px*var(--scale-ratio,1));">选择模板</span>
        <div class="grid">
            {#each templates as tpl}
                <button type="button" class="tpl-btn" onclick={() => (selected = tpl.id)}>
                    <GenericCard prop1={tpl.id} prop2={tpl.name} prop3={tpl.desc} prop4={tpl.thumbnailUrl} prop5={tpl.tag} selected={selected === tpl.id} compact={true} />
                </button>
            {/each}
        </div>
    {/if}

    <!-- 操作按钮 -->
    <div class="btn-group" style="margin-top:auto;">
        <button onclick={cancel}>取消</button>
        <button onclick={confirm}>确定</button>
    </div>
</ResponsiveBox>

<style>
    .grid {
        display: grid;
        flex: 1;
        grid-template-columns: repeat(auto-fill, minmax(calc(180px * var(--scale-ratio, 1)), 1fr));
        gap: calc(16px * var(--scale-ratio, 1));
        padding: calc(8px * var(--scale-ratio, 1)) calc(8px * var(--scale-ratio, 1));
        overflow-y: auto;
    }
    .btn-group {
        display: flex;
        justify-content: flex-end;
        gap: calc(16px * var(--scale-ratio, 1));
    }
    .btn-group > button {
        padding: calc(8px * var(--scale-ratio, 1)) calc(24px * var(--scale-ratio, 1));
        font-size: calc(14px * var(--scale-ratio, 1));
        border-radius: calc(8px * var(--scale-ratio, 1));
        border: none;
        background: linear-gradient(135deg, #6366f1 0%, #7c3aed 100%);
        color: #f8fafc;
        cursor: pointer;
        transition: transform 0.15s ease;
    }
    .btn-group > button:hover {
        transform: scale(1.03);
    }

    /* 模板卡片按钮，重置默认按钮样式 */
    .tpl-btn {
        display: block;
        padding: 0;
        background: transparent;
        cursor: pointer;
        border: none;
        outline: none;
        transition: none;
        border-radius: calc(16px * var(--scale-ratio, 1));
    }
    .tpl-btn:focus-visible {
        outline: calc(2px * var(--scale-ratio, 1)) solid rgba(99, 102, 241, 0.8);
        outline-offset: calc(2px * var(--scale-ratio, 1));
    }
</style>
