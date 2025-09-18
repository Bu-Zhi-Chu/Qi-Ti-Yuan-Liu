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
    import logoImage from '/icon-192.png'
    import WindowBox from '../widgets/WindowBox.svelte'
    import NewProjectDialog from '../widgets/NewProjectDialog.svelte'
    import { onMount, onDestroy } from 'svelte'
    import DexieService from '../../services/database/dexie-service'
    import { clearMemoryState } from '../../stores/dom-tree.store.svelte'
    import { importInto } from 'dexie-export-import'

    interface Project {
        id: string
        name: string
        createTime: string
        thumbnail?: string | Blob
    }

    // 历史项目数据，由 IndexedDB 实时加载
    let projects: Project[] = $state([])

    // 数据库初始化函数
    async function initializeDatabase() {
        const dbName = 'qi-qiao-ban'
        // 确保数据库存在
        if (!(await DexieService.databaseExists(dbName))) {
            console.log('🏗️【数据交互】数据库不存在，开始创建数据库')
            await DexieService.createDatabase(dbName)
        } else {
            console.log('✅【数据验证】验证通过')
        }
        const rows = await DexieService.queryRecords<any>(dbName, 'projects')
        projects = rows.map((r: any) => ({
            id: String(r.id),
            name: r.name,
            createTime: new Date(r.createdAt).toLocaleString(),
            thumbnail: r.thumbnail
        }))
    }

    onMount(async () => {
        // 直接初始化数据库，不再依赖授权状态
        await initializeDatabase()
    })

    onDestroy(() => {
        // 清理资源
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

    // 打开项目文件
    function openProjectFile() {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.json'
        input.onchange = async (event) => {
            const file = (event.target as HTMLInputElement).files?.[0]
            if (file) {
                try {
                    await importProjectFromFile(file)
                } catch (error) {
                    console.error('导入项目失败:', error)
                    alert('导入项目失败，请检查文件格式')
                }
            }
        }
        input.click()
    }

    // 从文件导入项目
    async function importProjectFromFile(file: File) {
        try {
            console.log('开始导入项目文件:', file.name)

            // 读取文件内容
            const text = await file.text()
            const data = JSON.parse(text)

            // 生成新的项目ID
            const newProjectId = crypto.randomUUID()

            // 导入项目数据并替换ID
            await importProjectData(data, newProjectId)

            // 刷新项目列表
            await initializeDatabase()

            // 跳转到新导入的项目
            window.location.hash = `#/editor/${newProjectId}`

            console.log('项目导入成功，新项目ID:', newProjectId)
        } catch (error) {
            console.error('导入项目失败:', error)
            throw error
        }
    }

    // 导入项目数据并替换所有项目ID
    async function importProjectData(data: any, newProjectId: string) {
        const dbName = 'qi-qiao-ban'
        const db = await DexieService.getDatabase(dbName)
        if (!db) throw new Error('无法获取数据库实例')

        // 先获取导入前的项目数量，用于确定新导入的项目
        const beforeImportCount = await db.table('projects').count()

        console.log('📦【数据交互】使用dexie-export-import导入数据')

        // 将JSON数据转换为Blob，然后使用importInto导入
        const jsonString = JSON.stringify(data)
        const blob = new Blob([jsonString], { type: 'application/json' })
        await importInto(db, blob, { overwriteValues: true })

        console.log('【数据交互】dexie-export-import导入完成')

        // 获取导入后的所有项目，找到新导入的项目
        const allProjects = await db.table('projects').toArray()
        const afterImportCount = allProjects.length

        if (afterImportCount > beforeImportCount) {
            // 找到新导入的项目（通常是最后一个，或者通过其他方式识别）
            // 由于dexie-export-import可能按照原始顺序导入，我们需要找到原始项目ID

            // 从导出数据中获取原始项目ID
            let originalProjectId: string | null = null

            // 解析导出数据结构获取原始项目ID
            if (data.data && data.data.data) {
                const projectsTable = data.data.data.find((table: any) => table.tableName === 'projects')
                if (projectsTable && projectsTable.rows && projectsTable.rows.length > 0) {
                    originalProjectId = projectsTable.rows[0].id
                }
            }

            if (originalProjectId) {
                console.log('原项目ID:', originalProjectId, '新项目ID:', newProjectId)

                // 更新项目记录
                await db.table('projects').where('id').equals(originalProjectId).modify({
                    id: newProjectId,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                })

                // 更新DOM记录的projectId
                await db.table('doms').where('projectId').equals(originalProjectId).modify({
                    projectId: newProjectId,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                })

                // 更新图片记录的projectId
                await db.table('imageStore').where('projectId').equals(originalProjectId).modify({
                    projectId: newProjectId
                })

                console.log('项目ID更新完成')
            } else {
                throw new Error('无法从导出数据中找到原始项目ID')
            }
        } else {
            throw new Error('导入失败：项目数量没有增加')
        }

        console.log('项目数据导入完成')
    }

    async function deleteProject(projectId?: string | number) {
        if (projectId == null) return

        // 先删除doms表中对应项目ID的所有记录
        const dbName = 'qi-qiao-ban'
        console.log(`🗑️【数据交互】删除项目: 项目ID=${projectId}`)
        try {
            const db = await DexieService.getDatabase(dbName)
            if (db) {
                console.log(`🗑️【数据交互】删除项目相关DOM节点: 项目ID=${projectId}`)
                await db.table('doms').where('projectId').equals(String(projectId)).delete()
            }
        } catch (error) {
            console.error('删除项目DOM数据失败:', error)
        }

        // 删除imageStore表中对应项目ID的所有图片记录
        try {
            const db = await DexieService.getDatabase(dbName)
            if (db) {
                console.log(`🗑️【数据交互】删除项目图片记录: 项目ID=${projectId}`)
                await db.table('imageStore').where('projectId').equals(String(projectId)).delete()
            }
        } catch (error) {
            console.error('删除项目图片数据失败:', error)
        }

        // 删除projects表中的项目记录
        try {
            console.log(`🗑️【数据交互】删除项目记录: 项目ID=${projectId}`)
            await DexieService.deleteRecord(dbName, 'projects', projectId)
            projects = projects.filter((p) => p.id !== String(projectId))
        } catch (error) {
            console.error('删除项目记录失败:', error)
            alert('删除失败，请重试')
        }
    }

    async function confirmNewProject(name: string, templateId: string = 'blank', width: number = 1920, height: number = 1080) {
        // 清理内存中的旧项目数据
        clearMemoryState()

        const id = crypto.randomUUID()
        const now = Date.now()

        // 创建项目记录
        await DexieService.addRecord('qi-qiao-ban', 'projects', {
            id,
            name,
            templateId,
            data: {},
            designWidth: width,
            designHeight: height,
            createdAt: now,
            updatedAt: now,
            canvasState: { x: 0, y: 0, scale: 0.5 },
            mode: 'normal' // 默认模式为正常模式，用户进入编辑器时隐藏工作区
        })
        // 根据模板加载DOM结构
        try {
            const db = await DexieService.getDatabase('qi-qiao-ban')
            if (db) {
                const template = await db.table('templates').get(templateId)
                if (template && template.domStructure && template.domStructure.length > 0) {
                    // 使用模板的DOM结构
                    const domNodes = template.domStructure.map((node: any) => ({
                        ...node,
                        projectId: id,
                        id: node.id || crypto.randomUUID()
                    }))

                    await db.table('doms').bulkAdd(domNodes)
                    console.log(`【模板加载】使用模板 ${template.name} 的DOM结构，共 ${domNodes.length} 个节点`)
                }
            }
        } catch (error) {
            console.error('加载模板DOM结构失败:', error)
            // 回退到最简默认根节点，不设置任何样式
            const rootNode = {
                id: 'root',
                projectId: id,
                componentType: 'SimpleBox',
                attributes: { type: 'SimpleBox' },
                props: {},
                style: {
                    width: '100%',
                    height: '100%',
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    pointerEvents: 'auto'
                },
                children: [],
                position: { x: 0, y: 0 },
                size: { width: 100, height: 100 },
                expanded: true,
                createdAt: now,
                updatedAt: now
            }
            const db = await DexieService.getDatabase('qi-qiao-ban')
            if (db) await db.table('doms').add(rootNode)
        }

        // 生成默认项目缩略图
        try {
            const { ProjectThumbnailService } = await import('../../services/project/project-thumbnail.service')
            await ProjectThumbnailService.createDefaultThumbnail(id)
        } catch (error) {
            console.error('创建项目缩略图失败:', error)
        }

        // 更新项目列表
        projects = [
            ...projects,
            {
                id,
                name,
                createTime: new Date(now).toLocaleString()
            }
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
            onButtonClick={createNewProject}
        />
        <ActionButton
            buttons={[
                {
                    name: '打开项目',
                    variant: 'secondary',
                    size: 'large'
                }
            ]}
            style="width: 160px; height: 56px;"
            onButtonClick={openProjectFile}
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
            onButtonClick={() => (window.location.hash = '#/demo')}
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
    <WindowBox title="新建项目" width={800} height={700} onClose={() => (showWindow = false)} showMaximize={false}>
        <NewProjectDialog onConfirm={(name, templateId, width, height) => confirmNewProject(name, templateId, width, height)} onCancel={() => (showWindow = false)} />
    </WindowBox>
{/if}

<style>
    @keyframes spin {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }
</style>
