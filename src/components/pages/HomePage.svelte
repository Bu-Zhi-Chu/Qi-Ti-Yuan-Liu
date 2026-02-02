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
    import { DEFAULT_DB_NAME } from '../../config/config'
    import { clearMemoryState } from '../../stores/dom-tree.store.svelte'
    import { importInto } from 'dexie-export-import'
    import { getImage } from '../../services/database/image-store.service'
    import { registerBlobUrl } from '../../services/utils/blob-url-manager'
    import { Toast } from '../widgets/Toast.svelte'

    interface Project {
        id: string
        name: string
        createTime: string
        thumbnail?: string | Blob
    }

    // 历史项目数据，由 IndexedDB 实时加载
    let projects: Project[] = $state([])

    // 加载项目列表函数
    async function loadProjects() {
        try {
            const dbName = DEFAULT_DB_NAME
            const rows = await DexieService.queryRecords<any>(dbName, 'projects')
            const sorted = rows.sort((a: any, b: any) => {
                const at = typeof a.updatedAt === 'number' ? a.updatedAt : (a.createdAt ?? 0)
                const bt = typeof b.updatedAt === 'number' ? b.updatedAt : (b.createdAt ?? 0)
                return bt - at
            })
            projects = sorted.map((r: any) => ({
                id: String(r.id),
                name: r.name,
                createTime: (() => {
                    const ts = typeof r.updatedAt === 'number' ? r.updatedAt : r.createdAt
                    return ts ? new Date(ts).toLocaleString() : ''
                })(),
                thumbnail: r.thumbnail
            }))
            console.log(`✅【项目加载】成功加载 ${projects.length} 个项目`)
        } catch (error) {
            console.error('❌【项目加载】加载项目列表失败:', error)
            projects = []
            // 可以在这里添加用户友好的错误提示
            if (error instanceof Error && error.message.includes('授权')) {
                console.warn('⚠️【项目加载】可能是授权验证问题，请检查授权状态')
            }
        }
    }

    onMount(async () => {
        await loadProjects()
    })

    onDestroy(() => {
        moduleObjectUrls.forEach((url) => URL.revokeObjectURL(url))
        moduleObjectUrls = []
    })

    let showWindow = $state(false)
    let showModuleSelector = $state(false)
    let moduleProjectId = $state<string | null>(null)
    let moduleProjectName = $state('')
    let availableModules = $state<
        {
            id: string
            name: string
            updatedAt?: number
            thumbnail?: string | Blob
        }[]
    >([])
    let moduleImageMap = $state<Record<string, string>>({})
    let moduleObjectUrls: string[] = []
    const hashRegex = /^[a-f0-9]{40,}$/

    function createNewProject() {
        showWindow = true
    }

    async function buildModuleImageMap(projectId: string, modules: { id: string; thumbnail?: string | Blob }[]): Promise<void> {
        moduleObjectUrls.forEach((url) => URL.revokeObjectURL(url))
        moduleObjectUrls = []
        const map: Record<string, string> = {}
        for (const m of modules) {
            const thumb = m.thumbnail
            if (!thumb) continue
            if (thumb instanceof Blob) {
                const url = URL.createObjectURL(thumb)
                moduleObjectUrls.push(url)
                map[m.id] = url
            } else {
                const str = thumb.trim()
                if (hashRegex.test(str)) {
                    const record = await getImage(projectId, str)
                    if (record) {
                        const url = URL.createObjectURL(record.blob)
                        registerBlobUrl(url)
                        moduleObjectUrls.push(url)
                        map[m.id] = url
                        continue
                    }
                }
                map[m.id] = str
            }
        }
        moduleImageMap = map
    }

    async function openProject(projectId: string) {
        try {
            const db = await DexieService.getDatabase(DEFAULT_DB_NAME)
            const moduleRows = await db.table('modules').where('projectId').equals(String(projectId)).toArray()
            const modules =
                moduleRows.length > 0
                    ? moduleRows.map((m: any) => ({
                          id: m.id ?? m.moduleId,
                          name: m.name ?? m.moduleId ?? '',
                          thumbnail: m.thumbnail,
                          updatedAt: m.updatedAt
                      }))
                    : (await db.table('doms').where('projectId').equals(String(projectId)).toArray()).reduce((acc: any[], row: any) => {
                          if (row.moduleId && !acc.find((m) => m.id === row.moduleId)) {
                              acc.push({
                                  id: row.moduleId,
                                  name: row.moduleId,
                                  updatedAt: row.updatedAt || Date.now()
                              })
                          }
                          return acc
                      }, [])

            modules.sort((a: any, b: any) => {
                const at = typeof a.updatedAt === 'number' ? a.updatedAt : 0
                const bt = typeof b.updatedAt === 'number' ? b.updatedAt : 0
                return bt - at
            })

            await buildModuleImageMap(String(projectId), modules as { id: string; thumbnail?: string | Blob }[])

            const project = projects.find((p) => p.id === String(projectId))
            moduleProjectId = String(projectId)
            moduleProjectName = project?.name ?? ''
            availableModules = modules
            showModuleSelector = true
        } catch (error) {
            console.error('加载项目模块列表失败，直接进入编辑器:', error)
            window.location.hash = `#/editor/${projectId}`
        }
    }

    function openModule(moduleId: string) {
        if (!moduleProjectId) return
        try {
            sessionStorage.setItem('currentModuleId', moduleId)
        } catch {}
        window.location.hash = `#/editor/${moduleProjectId}`
        showModuleSelector = false
    }

    // 打开项目文件
    function openProjectFile() {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.qtyl'
        input.onchange = async (event) => {
            const file = (event.target as HTMLInputElement).files?.[0]
            if (file) {
                try {
                    await importProjectFromFile(file)
                } catch (error) {
                    console.error('导入项目失败:', error)
                    Toast.error('导入项目失败，请检查文件格式')
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
            let text = await file.text()
            const magic = 'QQB1'
            const shift = 0x40
            if (text.startsWith(magic)) {
                const shifted = text.slice(magic.length)
                const base64 = Array.from(shifted)
                    .map((c) => String.fromCharCode((c.charCodeAt(0) - shift + 256) & 0xff))
                    .join('')
                text = decodeURIComponent(escape(atob(base64)))
            }
            const data = JSON.parse(text)

            const db = await DexieService.getDatabase(DEFAULT_DB_NAME)
            const projectsTable = data?.data?.data?.find((t: any) => t.tableName === 'projects')
            if (projectsTable?.rows?.length && db) {
                const importedName = String(projectsTable.rows[0].name ?? '').trim()
                if (importedName) {
                    const existed = await db.table('projects').where('name').equals(importedName).first()
                    if (existed) {
                        Toast.warning('已存在同名项目，请修改项目名称后重新导入')
                        return
                    }
                }
            }

            // 生成新的项目ID
            const newProjectId = crypto.randomUUID()

            // 导入项目数据并替换ID
            await importProjectData(data, newProjectId)

            // 刷新项目列表
            await loadProjects()

            // 跳转到新导入的项目
            window.location.hash = `#/editor/${newProjectId}`

            console.log('项目导入成功，新项目ID:', newProjectId)
        } catch (error) {
            console.error('导入项目失败:', error)
            throw error
        }
    }

    // 导入项目数据并替换所有项目ID
    async function importProjectData(data: any, newProjectId: string): Promise<void> {
        // 1. 深拷贝导出的 JSON，避免直接改动原对象
        const cloned: any = JSON.parse(JSON.stringify(data))

        // 2. 找到原始项目 ID（projects 表第一条记录的 id 即可）
        let originalProjectId: string | null = null
        const projectsTable = cloned?.data?.data?.find((t: any) => t.tableName === 'projects')
        if (projectsTable?.rows?.length) {
            originalProjectId = projectsTable.rows[0].id
        }
        if (!originalProjectId) throw new Error('无法解析导出数据中的项目 ID')

        // 3. 遍历所有表，替换 id / projectId，并适配新的模块表结构
        for (const table of cloned.data.data) {
            const { tableName, rows } = table
            if (!Array.isArray(rows)) continue

            switch (tableName) {
                case 'projects':
                    // 一个导出包通常只有一条项目记录，但以防万一遍历所有
                    for (const row of rows) {
                        if (row.id === originalProjectId) {
                            row.id = newProjectId
                            // 刷新时间戳，表示这个项目是在本地新建
                            const now = Date.now()
                            row.createdAt = now
                            row.updatedAt = now
                        }
                    }
                    break
                case 'modules':
                    // 模块表按 projectId 迁移到新项目ID
                    for (const row of rows) {
                        if (row.projectId === originalProjectId) {
                            row.projectId = newProjectId
                        }
                    }
                    break
                case 'doms':
                case 'imageStore':
                    for (const row of rows) {
                        if (row.projectId === originalProjectId) row.projectId = newProjectId
                    }
                    break
                default:
                    // 其他表无需处理
                    break
            }
        }

        console.log('📦【数据交互】导入前 ID 替换完成:', originalProjectId, '=>', newProjectId)

        // 4. 调用 importInto 导入，关闭 overwrite，确保不会覆盖同名主键
        const db = await DexieService.getDatabase(DEFAULT_DB_NAME)
        if (!db) throw new Error('无法获取数据库实例')

        await importInto(db, new Blob([JSON.stringify(cloned)], { type: 'application/json' }), {
            overwriteValues: false
        })

        console.log('✅【数据交互】项目导入完成(已作为新副本保存)')
    }

    async function deleteProject(projectId?: string | number) {
        if (projectId == null) return

        const dbName = DEFAULT_DB_NAME
        console.log(`🗑️【数据交互】删除项目: 项目ID=${projectId}`)
        try {
            const db = await DexieService.getDatabase(dbName)
            if (db) {
                console.log(`🗑️【数据交互】删除项目相关DOM节点: 项目ID=${projectId}`)
                await db.table('doms').where('projectId').equals(String(projectId)).delete()
                console.log(`🗑️【数据交互】删除项目相关模块记录: 项目ID=${projectId}`)
                await db.table('modules').where('projectId').equals(String(projectId)).delete()
            }
        } catch (error) {
            console.error('删除项目关联DOM或模块数据失败:', error)
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
            Toast.error('删除失败，请重试')
        }
    }

    /** 重命名项目 */
    async function renameProject(projectId: string | number, newName: string) {
        const trimmed = newName.trim()
        if (!projectId || !trimmed) return

        const dbName = DEFAULT_DB_NAME
        console.log(`✏️【数据交互】重命名项目: 项目ID=${projectId}, 新名称=${trimmed}`)

        try {
            const db = await DexieService.getDatabase(dbName)
            const existed = await db.table('projects').where('name').equals(trimmed).first()

            if (existed && String(existed.id) !== String(projectId)) {
                Toast.warning('已存在同名项目，请修改项目名称')
                return
            }

            await DexieService.updateRecord(dbName, 'projects', projectId, {
                name: trimmed,
                updatedAt: Date.now()
            })

            projects = projects.map((p) => (p.id === String(projectId) ? { ...p, name: trimmed } : p))

            console.log(`✅【数据交互】项目重命名成功: 项目ID=${projectId}`)
        } catch (error) {
            console.error('重命名项目失败:', error)
            Toast.error('重命名失败，请重试')
        }
    }

    async function deleteModule(moduleKey?: string | number) {
        if (moduleKey == null || !moduleProjectId) return

        const dbName = DEFAULT_DB_NAME
        const key = String(moduleKey)
        const projectIdForUpdate = moduleProjectId

        try {
            const db = await DexieService.getDatabase(dbName)
            const moduleRow: any = await db.table('modules').get(key)
            const moduleIdForDoms = moduleRow?.id ?? moduleRow?.moduleId ?? moduleRow?.name ?? key

            try {
                await db
                    .table('doms')
                    .where('projectId')
                    .equals(String(moduleProjectId))
                    .and((row: any) => row.moduleId === moduleIdForDoms)
                    .delete()
            } catch (error) {
                console.error('删除模块DOM数据失败:', error)
            }

            if (moduleRow) {
                try {
                    await DexieService.deleteRecord(dbName, 'modules', key)
                } catch (error) {
                    console.error('删除模块记录失败:', error)
                }
            }

            availableModules = availableModules.filter((m) => m.id !== key)
            const { [key]: _, ...rest } = moduleImageMap
            moduleImageMap = rest

            if (projectIdForUpdate) {
                try {
                    await DexieService.updateRecord(dbName, 'projects', projectIdForUpdate, {
                        updatedAt: Date.now()
                    })
                } catch (error) {
                    console.error('更新项目操作时间失败:', error)
                }
            }
        } catch (error) {
            console.error('删除模块失败:', error)
        }
    }

    async function renameModule(moduleKey: string | number, newName: string) {
        const trimmed = newName.trim()
        if (!moduleKey || !trimmed) return

        const dbName = DEFAULT_DB_NAME
        const key = String(moduleKey)

        try {
            const db = await DexieService.getDatabase(dbName)
            const moduleRow: any = await db.table('modules').get(key)
            if (!moduleRow) return

            const projectId = moduleRow.projectId ?? moduleProjectId
            if (projectId) {
                const existed = await db
                    .table('modules')
                    .where('projectId')
                    .equals(String(projectId))
                    .and((row: any) => (row.name ?? row.moduleId ?? '').trim() === trimmed && String(row.id) !== key)
                    .first()

                if (existed) {
                    Toast.warning('已存在同名模块，请修改模块名称')
                    return
                }
            }

            const now = Date.now()
            await DexieService.updateRecord(dbName, 'modules', key, {
                name: trimmed,
                updatedAt: now
            })

            availableModules = availableModules.map((m) => (m.id === key ? { ...m, name: trimmed, updatedAt: now } : m))

            const projectIdForUpdate = moduleRow.projectId ?? moduleProjectId
            if (projectIdForUpdate) {
                try {
                    await DexieService.updateRecord(dbName, 'projects', String(projectIdForUpdate), {
                        updatedAt: now
                    })
                } catch (error) {
                    console.error('更新项目操作时间失败:', error)
                }
            }
        } catch (error) {
            console.error('重命名模块失败:', error)
        }
    }

    async function confirmNewProject(name: string, templateId: string = 'blank', width: number = 1920, height: number = 1000, thumbnail?: Blob) {
        clearMemoryState()

        const trimmed = name.trim()
        if (!trimmed) return

        const now = Date.now()

        try {
            const db = await DexieService.getDatabase(DEFAULT_DB_NAME)
            const existed = await db.table('projects').where('name').equals(trimmed).first()

            if (existed) {
                Toast.warning('已存在同名项目，请修改项目名称')
                return
            }

            const id = crypto.randomUUID()
            await DexieService.addRecord(DEFAULT_DB_NAME, 'projects', {
                id,
                name: trimmed,
                templateId,
                data: {},
                createdAt: now,
                updatedAt: now,
                canvasState: { x: 0, y: 0, scale: 0.5 },
                mode: 'normal',
                ...(thumbnail ? { thumbnail } : {})
            })
        } catch (error) {
            console.error('创建项目失败:', error)
            return
        }

        await loadProjects()

        showWindow = false
    }

    async function confirmNewModule(name: string, templateId: string = 'blank', width: number = 1920, height: number = 1000, thumbnail?: Blob) {
        if (!moduleProjectId) return

        const now = Date.now()
        const moduleName = name.trim()
        if (!moduleName) return

        const projectId = moduleProjectId

        try {
            const db = await DexieService.getDatabase(DEFAULT_DB_NAME)

            const existed = await db
                .table('modules')
                .where('projectId')
                .equals(String(projectId))
                .and((row: any) => (row.name ?? row.moduleId ?? '').trim() === moduleName)
                .first()

            if (existed) {
                Toast.warning('已存在同名模块，请修改模块名称')
                return
            }

            const moduleRecord: any = {
                id: crypto.randomUUID(),
                projectId,
                name: moduleName,
                templateId,
                designWidth: width,
                designHeight: height,
                createdAt: now,
                updatedAt: now
            }
            if (thumbnail) {
                moduleRecord.thumbnail = thumbnail
            }

            await db.table('modules').add(moduleRecord)

            try {
                await DexieService.updateRecord(DEFAULT_DB_NAME, 'projects', projectId, {
                    updatedAt: now
                })
            } catch (error) {
                console.error('更新项目操作时间失败:', error)
            }

            const moduleIdForDom = moduleRecord.id
            const domIdPrefix = moduleName

            const template = await db.table('templates').get(templateId)
            if (template && template.domStructure && template.domStructure.length > 0) {
                const domNodes = template.domStructure.map((node: any) => {
                    const originalId = node.id ?? crypto.randomUUID()
                    const newId = `${domIdPrefix}::${originalId}`
                    const originalParentId = node.parentId
                    const newParentId = originalParentId ? `${domIdPrefix}::${originalParentId}` : originalParentId

                    return {
                        ...node,
                        projectId,
                        moduleId: moduleIdForDom,
                        id: newId,
                        parentId: newParentId
                    }
                })

                await db.table('doms').bulkAdd(domNodes)
                console.log(`【模块创建】使用模板 ${template.name} 的DOM结构，共 ${domNodes.length} 个节点`)
            } else {
                const rootNode = {
                    id: `${domIdPrefix}::root`,
                    projectId,
                    moduleId: moduleIdForDom,
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
                await db.table('doms').add(rootNode)
            }

            await openProject(projectId)
        } catch (error) {
            console.error('创建模块失败:', error)
        }
    }
</script>

<!-- 背景动画层 -->
<TangramBackground />

<ResponsiveBox style="width: 100vw; height: 100vh; background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; box-sizing: border-box;">
    <!-- 头部区域 -->
    <ResponsiveBox style="margin-bottom: 60px; text-align: center;">
        <ResponsiveBox style="display: flex; align-items: center; justify-content: center; gap: 16px; margin-bottom: 16px;">
            <img src={logoImage} alt="炁体源流" style="display: inline;width: calc(48px * var(--scale-ratio, 1)); height: calc(48px * var(--scale-ratio, 1)); border-radius: 12px; box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);" />
            <ResponsiveBox
                style="font-size: 48px; font-weight: 700; color: #f8fafc; letter-spacing: -0.02em; text-shadow: 0 0 20px rgba(99, 102, 241, 0.5), 0 0 40px rgba(139, 92, 246, 0.3); background: linear-gradient(135deg, #f8fafc 0%, #94a3b8 50%, #f8fafc 100%); background-size: 200% 200%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; animation: gradient-shift 3s ease-in-out infinite, pulse-glow 2s ease-in-out infinite;"
            >
                炁体源流
            </ResponsiveBox>
        </ResponsiveBox>
        <ResponsiveBox
            style="font-size: 20px; color: #94a3b8; font-weight: 300; max-width: 600px; line-height: 1.6; background: linear-gradient(90deg, #94a3b8, #e2e8f0, #94a3b8); background-size: 200% 200%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; animation: text-shimmer 2s ease-in-out infinite;"
        >
            术之尽头 炁体源流
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
                    <GenericCard prop1={project.id} prop2={project.name} prop3={project.createTime} prop4={project.thumbnail} showDelete={true} onDelete={deleteProject} onClick={() => openProject(project.id)} onRename={renameProject} />
                {/each}
            </ResponsiveBox>

            {#if projects.length === 0}
                <ResponsiveBox style="text-align: center; color: #94a3b8; font-size: 16px; padding: 40px;">暂无项目，点击上方按钮开始创建</ResponsiveBox>
            {/if}
        </ResponsiveBox>
    </ResponsiveBox>
</ResponsiveBox>

{#if showWindow}
    <WindowBox title="新建项目" width={800} height={350} onClose={() => (showWindow = false)} showMaximize={false}>
        <NewProjectDialog showTemplateAndSize={false} onConfirm={(name, templateId, width, height, thumbnail) => confirmNewProject(name, templateId, width, height, thumbnail)} onCancel={() => (showWindow = false)} />
    </WindowBox>
{/if}

{#if showModuleSelector}
    <WindowBox title="新建模块" width={1000} height={650} onClose={() => (showModuleSelector = false)} showMaximize={false}>
        <ResponsiveBox style="height:100%; display:flex; padding:8px 24px; box-sizing:border-box; gap:24px;">
            <ResponsiveBox style="flex:1; display:flex; flex-direction:column; gap:8px;">
                <ResponsiveBox style="font-size:16px; font-weight:600; color:#e5e7eb;">模块列表</ResponsiveBox>
                {#if availableModules.length === 0}
                    <ResponsiveBox style="color:#cbd5e1; text-align:center; flex:1; display:flex; align-items:center; justify-content:center;">当前项目暂无模块</ResponsiveBox>
                {:else}
                    <ResponsiveBox style={`flex:1; padding-bottom:8px; overflow-x:hidden; overflow-y:${availableModules.length > 2 ? 'auto' : 'hidden'};`}>
                        <ResponsiveBox style="display:grid; grid-template-columns:1fr; gap:8px;">
                            {#each availableModules as module}
                                <GenericCard
                                    prop1={module.id}
                                    prop2={module.name}
                                    prop3={module.updatedAt ? new Date(module.updatedAt).toLocaleString() : '未知'}
                                    prop4={moduleImageMap[module.id]}
                                    showDelete={true}
                                    onDelete={deleteModule}
                                    onClick={() => openModule(module.id)}
                                    onRename={renameModule}
                                />
                            {/each}
                        </ResponsiveBox>
                    </ResponsiveBox>
                {/if}
            </ResponsiveBox>
            <ResponsiveBox style="flex:1; display:flex; flex-direction:column; border-left:1px solid rgba(148,163,184,0.3); padding-left:24px; box-sizing:border-box;">
                <NewProjectDialog nameLabel="模块名称" namePlaceholder="请输入模块名称" onConfirm={(name, templateId, width, height, thumbnail) => confirmNewModule(name, templateId, width, height, thumbnail)} onCancel={() => (showModuleSelector = false)} />
            </ResponsiveBox>
        </ResponsiveBox>
    </WindowBox>
{/if}
