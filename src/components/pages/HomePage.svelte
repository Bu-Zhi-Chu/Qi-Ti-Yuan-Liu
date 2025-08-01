<!--
 * 首页组件 - 使用ResponsiveBox实现的响应式首页
 * 功能：展示项目名称、欢迎用户、创建新项目、查看历史项目
 * 设计：全程使用ResponsiveBox.svelte实现响应式布局，无原生HTML标签
 * 布局：垂直居中布局，包含头部、主体内容区和历史项目列表
-->

<script lang="ts">
    import ResponsiveBox from '../Core/ResponsiveBox.svelte'

    interface Project {
        id: string
        name: string
        createTime: string
        thumbnail?: string
    }

    // 模拟历史项目数据
    let projects: Project[] = $state([
        {
            id: '1',
            name: '我的第一个项目',
            createTime: '2025-07-01 14:30',
            thumbnail:
                'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7mnKzmn5A8L3RleHQ+Cjwvc3ZnPgo='
        },
        {
            id: '2',
            name: '响应式布局练习',
            createTime: '2025-07-02 09:15',
            thumbnail:
                'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7mnKzmn5A8L3RleHQ+Cjwvc3ZnPgo='
        },
        {
            id: '3',
            name: '动态组件测试',
            createTime: '2025-07-03 16:45',
            thumbnail:
                'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7mnKzmn5A8L3RleHQ+Cjwvc3ZnPgo='
        },
        {
            id: '4',
            name: '电商网站设计',
            createTime: '2025-07-04 09:20',
            thumbnail:
                'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7mnKzmn5A8L3RleHQ+Cjwvc3ZnPgo='
        },
        {
            id: '5',
            name: '企业官网重构',
            createTime: '2025-07-05 15:30',
            thumbnail:
                'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7mnKzmn5A8L3RleHQ+Cjwvc3ZnPgo='
        },
        {
            id: '6',
            name: '小程序界面',
            createTime: '2025-07-06 11:45',
            thumbnail:
                'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7mnKzmn5A8L3RleHQ+Cjwvc3ZnPgo='
        },
        {
            id: '7',
            name: '后台管理系统',
            createTime: '2025-07-07 14:00',
            thumbnail:
                'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7mnKzmn5A8L3RleHQ+Cjwvc3ZnPgo='
        },
        {
            id: '8',
            name: '品牌视觉设计',
            createTime: '2025-07-08 16:15',
            thumbnail:
                'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7mnKzmn5A8L3RleHQ+Cjwvc3ZnPgo='
        },
        {
            id: '9',
            name: '产品展示页面',
            createTime: '2025-07-09 13:30',
            thumbnail:
                'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7mnKzmn5A8L3RleHQ+Cjwvc3ZnPgo='
        },
        {
            id: '10',
            name: '活动专题页',
            createTime: '2025-07-10 10:45',
            thumbnail:
                'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7mnKzmn5A8L3RleHQ+Cjwvc3ZnPgo='
        },
        {
            id: '11',
            name: '博客主题设计',
            createTime: '2025-07-11 15:20',
            thumbnail:
                'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7mnKzmn5A8L3RleHQ+Cjwvc3ZnPgo='
        },
        {
            id: '12',
            name: '个人简历网站',
            createTime: '2025-07-12 11:00',
            thumbnail:
                'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7mnKzmn5A8L3RleHQ+Cjwvc3ZnPgo='
        }
    ])

    function createNewProject() {
        // 这里可以跳转到创建页面
        console.log('创建新项目')
    }

    function openProject(projectId: string) {
        // 这里可以跳转到编辑器页面
        console.log('打开项目:', projectId)
    }
</script>

<!-- 主容器 - 全屏响应式布局 -->
<ResponsiveBox style="width: 100vw; height: 100vh; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; box-sizing: border-box;">
    <!-- 头部区域 -->
    <ResponsiveBox style="margin-bottom: 60px; text-align: center;">
        <ResponsiveBox style="font-size: 48px; font-weight: 700; color: #1e293b; margin-bottom: 16px; letter-spacing: -0.02em;">七巧板</ResponsiveBox>
        <ResponsiveBox style="font-size: 20px; color: #475569; font-weight: 300; max-width: 600px; line-height: 1.6;">创建、设计、构建您的下一个精彩项目</ResponsiveBox>
    </ResponsiveBox>

    <!-- 操作按钮区域 -->
    <ResponsiveBox style="margin-bottom: 80px;">
        <ResponsiveBox style="background: #1e293b; border: 1px solid #334155; color: #f8fafc; padding: 20px 40px; border-radius: 12px; font-size: 18px; font-weight: 500; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 4px 14px 0 rgba(0,0,0,0.1);" onclick={createNewProject}>
            开始创建
        </ResponsiveBox>
    </ResponsiveBox>

    <!-- 历史项目区域 - 现代滚动布局 -->
    <ResponsiveBox style="width: 100%; max-width: 1200px; height: 60vh; display: flex; flex-direction: column;">
        <ResponsiveBox style="font-size: 24px; font-weight: 600; color: #1e293b; margin-bottom: 30px; text-align: center; flex-shrink: 0;">历史项目</ResponsiveBox>

        <!-- 现代滚动容器 -->
        <ResponsiveBox style="flex: 1; overflow-y: auto; padding-right: 10px; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.3) transparent;">
            <ResponsiveBox style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 30px; justify-items: center; padding-bottom: 20px;">
                {#each projects as project}
                    <ResponsiveBox style="background: #ffffff; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); cursor: pointer; transition: all 0.3s ease; width: 300px; border: 1px solid #e2e8f0;" onclick={() => openProject(project.id)}>
                        <!-- 项目缩略图 -->
                        <ResponsiveBox style="width: 100%; height: 160px; background: #f1f5f9; border-radius: 8px; margin-bottom: 16px; overflow: hidden;">
                            {#if project.thumbnail}
                                <img src={project.thumbnail} alt={project.name} style="width: 100%; height: 100%; object-fit: cover;" />
                            {:else}
                                <ResponsiveBox style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 14px;">预览图</ResponsiveBox>
                            {/if}
                        </ResponsiveBox>

                        <!-- 项目名称 -->
                        <ResponsiveBox style="font-size: 16px; font-weight: 600; color: #1e293b; margin-bottom: 8px; line-height: 1.4;">
                            {project.name}
                        </ResponsiveBox>

                        <!-- 创建时间 -->
                        <ResponsiveBox style="font-size: 13px; color: #64748b; font-weight: 400;">
                            {project.createTime}
                        </ResponsiveBox>
                    </ResponsiveBox>
                {/each}
            </ResponsiveBox>

            {#if projects.length === 0}
                <ResponsiveBox style="text-align: center; color: #64748b; font-size: 16px; padding: 40px;">暂无项目，点击上方按钮开始创建</ResponsiveBox>
            {/if}
        </ResponsiveBox>
    </ResponsiveBox>
</ResponsiveBox>
