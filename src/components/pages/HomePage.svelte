<!--
 * 首页组件 - 使用ResponsiveBox实现的响应式首页
 * 功能：展示项目名称、欢迎用户、创建新项目、查看历史项目
 * 设计：全程使用ResponsiveBox.svelte实现响应式布局，无原生HTML标签
 * 布局：垂直居中布局，包含头部、主体内容区和历史项目列表
-->

<script lang="ts">
    import ResponsiveBox from '../Core/ResponsiveBox.svelte'
    import logoImage from '../../assets/img/icon-192.png'

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
<!-- 七巧板背景动画层 -->
<ResponsiveBox style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;overflow: hidden;">
    <ResponsiveBox class="tangram-shape tangram-triangle-1" style="left: 10%; top: -60px;"></ResponsiveBox>
    <ResponsiveBox class="tangram-shape tangram-triangle-2" style="left: 25%; top: -50px;"></ResponsiveBox>
    <ResponsiveBox class="tangram-shape tangram-triangle-3" style="left: 40%; top: -40px;"></ResponsiveBox>
    <ResponsiveBox class="tangram-shape tangram-square" style="left: 55%; top: -40px;"></ResponsiveBox>
    <ResponsiveBox class="tangram-shape tangram-parallelogram" style="left: 70%; top: -30px;"></ResponsiveBox>
    <ResponsiveBox class="tangram-shape tangram-medium-triangle" style="left: 85%; top: -35px;"></ResponsiveBox>
    <ResponsiveBox class="tangram-shape tangram-small-triangle" style="left: 15%; top: -25px;"></ResponsiveBox>

    <ResponsiveBox class="tangram-shape tangram-triangle-1" style="left: 80%; top: -100px; animation-delay: -10s;"></ResponsiveBox>
    <ResponsiveBox class="tangram-shape tangram-triangle-2" style="left: 5%; top: -80px; animation-delay: -13s;"></ResponsiveBox>
    <ResponsiveBox class="tangram-shape tangram-square" style="left: 35%; top: -90px; animation-delay: -18s;"></ResponsiveBox>
    <ResponsiveBox class="tangram-shape tangram-parallelogram" style="left: 60%; top: -70px; animation-delay: -20s;"></ResponsiveBox>
    <ResponsiveBox class="tangram-shape tangram-medium-triangle" style="left: 20%; top: -85px; animation-delay: -16s;"></ResponsiveBox>
    <ResponsiveBox class="tangram-shape tangram-small-triangle" style="left: 75%; top: -75px; animation-delay: -22s;"></ResponsiveBox>

    <ResponsiveBox class="tangram-shape tangram-triangle-3" style="left: 50%; top: -120px; animation-delay: -25s;"></ResponsiveBox>
    <ResponsiveBox class="tangram-shape tangram-square" style="left: 12%; top: -110px; animation-delay: -28s;"></ResponsiveBox>
    <ResponsiveBox class="tangram-shape tangram-parallelogram" style="left: 88%; top: -95px; animation-delay: -30s;"></ResponsiveBox>
</ResponsiveBox>
<ResponsiveBox style="width: 100vw; height: 100vh; background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; box-sizing: border-box;">
    <!-- 头部区域 -->
    <ResponsiveBox style="margin-bottom: 60px; text-align: center;">
        <ResponsiveBox style="display: flex; align-items: center; justify-content: center; gap: 16px; margin-bottom: 16px;">
            <img src={logoImage} alt="七巧板" style="width: 48px; height: 48px; border-radius: 12px; box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);" />
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
        <ResponsiveBox
            style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border: none; color: #f8fafc; padding: 20px 40px; border-radius: 16px; font-size: 18px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 8px 32px rgba(99, 102, 241, 0.3); backdrop-filter: blur(10px); transform: translateY(0px);"
            onclick={createNewProject}
            onmouseenter={(e: MouseEvent) => {
                const target = e.currentTarget as HTMLElement
                target.style.transform = 'translateY(-4px) scale(1.05)'
                target.style.boxShadow = '0 20px 60px rgba(99, 102, 241, 0.5), 0 0 40px rgba(139, 92, 246, 0.4)'
            }}
            onmouseleave={(e: MouseEvent) => {
                const target = e.currentTarget as HTMLElement
                target.style.transform = 'translateY(0px) scale(1)'
                target.style.boxShadow = '0 8px 32px rgba(99, 102, 241, 0.3)'
            }}
        >
            开始创建
        </ResponsiveBox>
        <ResponsiveBox
            style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border: none; color: #f8fafc; padding: 20px 40px; border-radius: 16px; font-size: 18px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 8px 32px rgba(16, 185, 129, 0.3); backdrop-filter: blur(10px); transform: translateY(0px);"
            onclick={() => (window.location.hash = '#/demo')}
            onmouseenter={(e: MouseEvent) => {
                const target = e.currentTarget as HTMLElement
                target.style.transform = 'translateY(-4px) scale(1.05)'
                target.style.boxShadow = '0 20px 60px rgba(16, 185, 129, 0.5), 0 0 40px rgba(5, 150, 105, 0.4)'
            }}
            onmouseleave={(e: MouseEvent) => {
                const target = e.currentTarget as HTMLElement
                target.style.transform = 'translateY(0px) scale(1)'
                target.style.boxShadow = '0 8px 32px rgba(16, 185, 129, 0.3)'
            }}
        >
            查看演示
        </ResponsiveBox>
    </ResponsiveBox>

    <!-- 历史项目区域 - 现代滚动布局 -->
    <ResponsiveBox style="width: 100%; max-width: 1200px; height: 60vh; display: flex; flex-direction: column;">
        <ResponsiveBox style="font-size: 24px; font-weight: 600; color: #f8fafc; margin-bottom: 30px; text-align: center; flex-shrink: 0;">历史项目</ResponsiveBox>

        <!-- 现代滚动容器 -->
        <ResponsiveBox style="flex: 1; overflow-y: auto; padding: 20px 10px 0 0; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.3) transparent;">
            <ResponsiveBox style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 30px; justify-items: center; padding-bottom: 20px;">
                {#each projects as project}
                    <ResponsiveBox
                        style="background: rgba(30, 41, 59, 0.5); border-radius: 16px; padding: 20px; box-shadow: 0 8px 32px rgba(0,0,0,0.3); cursor: pointer; transition: all 0.3s ease; width: 300px; border: 1px solid rgba(99, 102, 241, 0.2); backdrop-filter: blur(10px); transform: translateY(0px);"
                        onclick={() => openProject(project.id)}
                        onmouseenter={(e: MouseEvent) => {
                            const target = e.currentTarget as HTMLElement
                            target.style.transform = 'translateY(-8px) scale(1.02)'
                            target.style.boxShadow = '0 20px 60px rgba(99, 102, 241, 0.4), 0 0 30px rgba(139, 92, 246, 0.3)'
                            target.style.borderColor = 'rgba(99, 102, 241, 0.5)'
                        }}
                        onmouseleave={(e: MouseEvent) => {
                            const target = e.currentTarget as HTMLElement
                            target.style.transform = 'translateY(0px) scale(1)'
                            target.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)'
                            target.style.borderColor = 'rgba(99, 102, 241, 0.2)'
                        }}
                    >
                        <!-- 项目缩略图 -->
                        <ResponsiveBox style="width: 100%; height: 160px; background: rgba(15, 23, 42, 0.5); border-radius: 12px; margin-bottom: 16px; overflow: hidden; border: 1px solid rgba(99, 102, 241, 0.1);">
                            {#if project.thumbnail}
                                <img src={project.thumbnail} alt={project.name} style="width: 100%; height: 100%; object-fit: cover;" />
                            {:else}
                                <ResponsiveBox style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #64748b; font-size: 14px; background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);">预览图</ResponsiveBox>
                            {/if}
                        </ResponsiveBox>

                        <!-- 项目名称 -->
                        <ResponsiveBox style="font-size: 16px; font-weight: 600; color: #f8fafc; margin-bottom: 8px; line-height: 1.4;">
                            {project.name}
                        </ResponsiveBox>

                        <!-- 创建时间 -->
                        <ResponsiveBox style="font-size: 13px; color: #94a3b8; font-weight: 400;">
                            {project.createTime}
                        </ResponsiveBox>
                    </ResponsiveBox>
                {/each}
            </ResponsiveBox>

            {#if projects.length === 0}
                <ResponsiveBox style="text-align: center; color: #94a3b8; font-size: 16px; padding: 40px;">暂无项目，点击上方按钮开始创建</ResponsiveBox>
            {/if}
        </ResponsiveBox>
    </ResponsiveBox>
</ResponsiveBox>
