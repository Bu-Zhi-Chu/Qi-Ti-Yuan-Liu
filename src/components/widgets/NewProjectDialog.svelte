<!--
 * 新建项目对话框 - NewProjectDialog
 * 功能：输入项目名称 + 选择模板 + 确定/取消
 * 依赖：ResponsiveBox、GenericCard
 * 事件：
 *   confirm(detail: string)  确认并返回项目名称
 *   cancel                  取消并关闭窗口
-->

<script lang="ts">
    import { createEventDispatcher } from 'svelte'
    import ResponsiveBox from '../Core/ResponsiveBox.svelte'
    import GenericCard from './GenericCard.svelte'

    interface TemplateInfo {
        id: string
        name: string
        desc: string
        cover?: string
        tag?: string
    }

    // 模板示例数据，后续可从远端或配置读取
    const templates: TemplateInfo[] = [
        { id: 'blank', name: '空白项目', desc: '从零开始创建', cover: '/assets/img/blank.png', tag: '默认' },
        { id: 'blog', name: '博客模板', desc: '快速搭建个人博客', cover: '/assets/img/blog.png', tag: '常用' },
        { id: 'gallery', name: '画廊模板', desc: '图片展示与分享', cover: '/assets/img/gallery.png' }
    ]

    let projectName = ''
    let selected = 'blank'
    const inputId: string = 'project-name-' + Math.random().toString(36).slice(2)

    const dispatch = createEventDispatcher()

    const confirm = () => {
        const name = projectName.trim()
        if (!name) {
            alert('请输入项目名称')
            return
        }
        dispatch('confirm', name)
    }
    const cancel = () => dispatch('cancel')
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
                <GenericCard prop1={tpl.id} prop2={tpl.name} prop3={tpl.desc} prop4={tpl.cover} prop5={tpl.tag} />
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
        border: calc(1px * var(--scale-ratio, 1)) solid rgba(99, 102, 241, 0.4);
        background: rgba(99, 102, 241, 0.15);
        color: #e0e7ff;
        transition: 0.2s;
    }
    button:hover {
        background: rgba(99, 102, 241, 0.25);
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
