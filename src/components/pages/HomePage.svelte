<!--
 * 首页组件 - 使用ResponsiveBox实现的响应式首页
 * 功能：展示项目名称、欢迎用户、创建新项目、查看历史项目
 * 设计：全程使用ResponsiveBox.svelte实现响应式布局，无原生HTML标签
 * 布局：垂直居中布局，包含头部、主体内容区和历史项目列表
-->

<script lang="ts">
    import ResponsiveBox from '../core/ResponsiveBox.svelte'
    import TangramBackground from '../widgets/TangramBackground.svelte'
    import ActionButton from '../widgets/ActionButton.svelte'
    import GenericCard from '../widgets/GenericCard.svelte'
    import logoImage from '../../assets/img/icon-192.png'
    import WindowBox from '../widgets/WindowBox.svelte'
    import NewProjectDialog from '../widgets/NewProjectDialog.svelte'
    import { onMount } from 'svelte'
    import DexieService from '../../services/database/dexie-service'

    interface Project {
        id: string
        name: string
        createTime: string
        thumbnail?: string
    }

    // 历史项目数据，由 IndexedDB 实时加载
    let projects: Project[] = $state([])

    onMount(async () => {
        const dbName = 'qi-qiao-ban'
        if (!(await DexieService.databaseExists(dbName))) {
            await DexieService.createDatabase(dbName)
        }
        const rows = await DexieService.queryRecords<any>(dbName, 'projects')
        projects = rows.map((r: any) => ({
            id: String(r.id),
            name: r.name,
            createTime: new Date(r.createdAt).toLocaleString(),
            thumbnail: r.thumbnailUrl
        }))
    })

    let showWindow = $state(false)

    function createNewProject() {
        // 打开新建项目窗口
        showWindow = true
    }

    function openProject(projectId: string) {
        // 跳转到编辑器并携带项目ID
        window.location.hash = `#/editor/${projectId}`
    }

    async function deleteProject(projectId?: string | number) {
        if (projectId == null) return
        const ok = await DexieService.deleteRecord('qi-qiao-ban', 'projects', projectId)
        if (ok) {
            projects = projects.filter((p) => p.id !== String(projectId))
        } else {
            alert('删除失败，请重试')
        }
    }

    async function confirmNewProject(name: string) {
        const id = crypto.randomUUID()
        const now = Date.now()
        await DexieService.addRecord('qi-qiao-ban', 'projects', {
            id,
            name,
            templateId: 'blank',
            data: {},
            createdAt: now,
            updatedAt: now
        })
        projects = [
            ...projects,
            { id, name, createTime: new Date(now).toLocaleString(), thumbnail: undefined }
        ]
        window.location.hash = `#/editor/${id}`
        showWindow = false
    }
</script>

<!-- 七巧板背景动画层 -->
<TangramBackground />

<ResponsiveBox style="width: 100vw; height: 100vh; background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; box-sizing: border-box;">
    <!-- 头部区域 -->
    <ResponsiveBox style="margin-bottom: 60px; text-align: center;">
        <ResponsiveBox style="display: flex; align-items: center; justify-content: center; gap: 16px; margin-bottom: 16px;">
            <img src={logoImage} alt="七巧板" style="display: inline;width: calc(48px * var(--scale-ratio, 1)); height: calc(48px * var(--scale-ratio, 1)); border-radius: 12px; box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);" />
            <ResponsiveBox
                style="font-size: 48px; font-weight: 700; color: #f8fafc; letter-spacing: -0.02em; text-shadow: 0 0 20px rgba(99, 102, 241, 0.5), 0 0 40px rgba(139, 92, 246, 0.3); background: linear-gradient(135deg, #f8fafc 0%, #94a3b8 50%, #f8fafc 100%); background-size: 200% 200%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; animation: gradient-shift 3s ease-in-out infinite, pulse-glow 2s ease-in-out infinite;"
            >
                七巧板
            </ResponsiveBox>
        </ResponsiveBox>
        <ResponsiveBox
            style="font-size: 20px; color: #94a3b8; font-weight: 300; max-width: 600px; line-height: 1.6; background: linear-gradient(90deg, #94a3b8, #e2e8f0, #94a3b8); background-size: 200% 200%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; animation: text-shimmer 2s ease-in-out infinite;"
        >
            创建、设计、构建您的下一个精彩项目
        </ResponsiveBox>
    </ResponsiveBox>

    <!-- 操作按钮区域 -->
    <ResponsiveBox style="margin-bottom: 80px; display: flex; gap: 20px; align-items: center; justify-content: center; flex-wrap: wrap;">
        <ActionButton
            buttons={[
                {
                    name: '开始创建',
                    variant: 'primary',
                    size: 'large'
                }
            ]}
            style="width: 160px; height: 56px;"
            onbuttonClick={createNewProject}
        />
        <ActionButton
            buttons={[
                {
                    name: '查看演示',
                    variant: 'secondary',
                    size: 'large'
                }
            ]}
            style="width: 160px; height: 56px;"
            onbuttonClick={() => (window.location.hash = '#/demo')}
        />
    </ResponsiveBox>

    <!-- 历史项目区域 - 现代滚动布局 -->
    <ResponsiveBox style="width: 100%; max-width: 1200px; height: 60vh; display: flex; flex-direction: column;">
        <ResponsiveBox style="font-size: 24px; font-weight: 600; color: #f8fafc; margin-bottom:5px; text-align: center; flex-shrink: 0;">历史项目</ResponsiveBox>

        <!-- 现代滚动容器 -->
        <ResponsiveBox style="flex: 1; overflow-y: auto; padding: 20px 10px 0 0; ">
            <ResponsiveBox style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 30px; justify-items: center; padding: 10px;">
                {#each projects as project}
                    <GenericCard prop1={project.id} prop2={project.name} prop3={project.createTime} prop4={project.thumbnail} showDelete={true} onDelete={deleteProject} onClick={() => openProject(project.id)} />
                {/each}
            </ResponsiveBox>

            {#if projects.length === 0}
                <ResponsiveBox style="text-align: center; color: #94a3b8; font-size: 16px; padding: 40px;">暂无项目，点击上方按钮开始创建</ResponsiveBox>
            {/if}
        </ResponsiveBox>
    </ResponsiveBox>
</ResponsiveBox>
{#if showWindow}
    <WindowBox title="新建项目" width={800} height={600} onClose={() => (showWindow = false)}>
        <NewProjectDialog onConfirm={confirmNewProject} onCancel={() => (showWindow = false)} />
    </WindowBox>
{/if}
