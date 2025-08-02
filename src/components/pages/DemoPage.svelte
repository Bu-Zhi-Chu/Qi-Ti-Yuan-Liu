<!--
 * 组件演示页面 - 画廊式设计
 *
 * 功能描述：
 * 顶部导航栏 + 左侧边栏 + 卡片网格布局
 * 展示所有可用组件的卡片式画廊，点击卡片查看详情
 *
 * 使用示例：
 * 通过路由 /demo 访问此演示页面
 *
 * 架构：
 * 1. 顶部：TopNavBar 导航栏
 * 2. 左侧：SideBar 侧边栏菜单
 * 3. 主内容：卡片网格展示所有组件
-->

<script lang="ts">
    import ResponsiveBox from '../Core/ResponsiveBox.svelte'
    import SimpleBox from '../Core/SimpleBox.svelte'
    import RealTimeClock from '../widgets/RealTimeClock.svelte'
    import CustomTextInput from '../widgets/CustomTextInput.svelte'
    import ActionButton from '../widgets/ActionButton.svelte'
    import DynamicComponent from '../Core/DynamicComponent.svelte'
    import DragDropList from '../widgets/DragDropList.svelte'

    import Card from '../widgets/Card.svelte'
    import logoImage from '../../assets/img/icon-192.png'

    // 组件分类和列表定义
    interface ComponentItem {
        id: string
        name: string
        category: string
        component: any
        props?: Record<string, any>
        description: string
        image?: string
        badge?: string
    }

    // 所有可用组件
    const allComponents: ComponentItem[] = [
        {
            id: 'realtime-clock',
            name: '实时时钟',
            category: '官方示例',
            component: RealTimeClock,
            props: { format: 'datetime-weekday', displayMode: 'multi-line' },
            description: '显示实时时间的响应式时钟组件，支持多种显示格式',
            image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDIwMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTIwIiBmaWxsPSIjMWUyOTNiIi8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjYwIiByPSI0MCIgc3Ryb2tlPSIjNjM2NmYxIiBzdHJva2Utd2lkdGg9IjIiIGZpbGw9Im5vbmUiLz4KPGxpbmUgeDE9IjEwMCIgeTE9IjYwIiB4Mj0iMTAwIiB5Mj0iNDAiIHN0cm9rZT0iIzYzNjZmMSIgc3Ryb2tlLXdpZHRoPSIyIi8+CjxsaW5lIHgxPSIxMDAiIHkxPSI2MCIgeDI9IjEyMCIgeTI9IjYwIiBzdHJva2U9IiM2MzY2ZjEiIHN0cm9rZS13aWR0aD0iMiIvPgo8L3N2Zz4K',
            badge: '组合'
        },
        {
            id: 'custom-text-input',
            name: '自定义文本输入',
            category: '基础示例',
            component: CustomTextInput,
            props: { value: '演示输入框', placeholder: '请输入内容...' },
            description: '功能完整的文本输入组件，支持双向数据绑定',
            image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDIwMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTIwIiBmaWxsPSIjMWUyOTNiIi8+CjxyZWN0IHg9IjIwIiB5PSI0MCIgd2lkdGg9IjE2MCIgaGVpZ2h0PSI0MCIgcng9IjgiIGZpbGw9IiMzMDQxNTUiIHN0cm9rZT0iIzYzNjZmMSIgc3Ryb2tlLXdpZHRoPSIxIi8+Cjx0ZXh0IHg9IjEwMCIgeT0iNjUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk0YTNiOCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+5a2X5qGIIOS9nOWRmDwvdGV4dD4KPC9zdmc+Cg=='
        },
        {
            id: 'action-button',
            name: '动作按钮',
            category: '基础示例',
            component: ActionButton,
            props: {
                buttons: [
                    { name: '主要操作', variant: 'primary', size: 'medium' },
                    { name: '次要操作', variant: 'secondary', size: 'medium' },
                    { name: '警告操作', variant: 'warning', size: 'medium' }
                ],
                direction: 'row'
            },
            description: '灵活的按钮组件，支持单个按钮和按钮组模式',
            image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDIwMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTIwIiBmaWxsPSIjMWUyOTNiIi8+CjxyZWN0IHg9IjIwIiB5PSI0NSIgd2lkdGg9IjUwIiBoZWlnaHQ9IjMwIiByeD0iNiIgZmlsbD0iIzYzNjZmMSIvPgo8cmVjdCB4PSI3NSIgeT0iNDUiIHdpZHRoPSI1MCIgaGVpZ2h0PSIzMCIgcng9IjYiIGZpbGw9IiM0YjU1NjMiLz4KPHJlY3QgeD0iMTMwIiB5PSI0NSIgd2lkdGg9IjUwIiBoZWlnaHQ9IjMwIiByeD0iNiIgZmlsbD0iI2Y1OTUwMCIvPgo8L3N2Zz4K'
        },
        {
            id: 'responsive-box',
            name: '响应式容器',
            category: '官方示例',
            component: ResponsiveBox,
            props: {
                style: 'width: 200px; height: 100px; background: linear-gradient(45deg, #ff6b6b, #4ecdc4); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;',
                tag: 'div'
            },
            description: '自适应的响应式容器组件，所有自定义组件的基础',
            image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDIwMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTIwIiBmaWxsPSIjMWUyOTNiIi8+CjxyZWN0IHg9IjUwIiB5PSIzNSIgd2lkdGg9IjEwMCIgaGVpZ2h0PSI1MCIgcng9IjgiIGZpbGw9ImxpbmVhci1ncmFkaWVudCg0NWRlZywgI2ZmNmI2YiwgIzRlY2RjNCkiLz4KPC9zdmc+Cg==',
            badge: '核心'
        },
        {
            id: 'simple-box',
            name: '轻量级容器',
            category: '基础示例',
            component: SimpleBox,
            props: {
                style: 'width: 200px; height: 80px; background: #4ade80; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white;',
                tag: 'div'
            },
            description: '轻量级的简单容器组件，适合快速布局',
            image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDIwMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTIwIiBmaWxsPSIjMWUyOTNiIi8+CjxyZWN0IHg9IjUwIiB5PSI0MCIgd2lkdGg9IjEwMCIgaGVpZ2h0PSI0MCIgcng9IjgiIGZpbGw9IiM0YWRlODAiLz4KPC9zdmc+Cg=='
        },
        {
            id: 'drag-drop-list',
            name: '拖拽列表',
            category: '官方示例',
            component: DragDropList,
            props: {
                items: [
                    { id: 1, text: '拖拽项目 1', priority: '高' },
                    { id: 2, text: '拖拽项目 2', priority: '中' },
                    { id: 3, text: '拖拽项目 3', priority: '低' }
                ],
                enableDrag: true,
                direction: 'vertical'
            },
            description: '支持拖拽排序的响应式列表组件',
            image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDIwMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTIwIiBmaWxsPSIjMWUyOTNiIi8+CjxyZWN0IHg9IjIwIiB5PSIyNSIgd2lkdGg9IjE2MCIgaGVpZ2h0PSIyMCIgcng9IjQiIGZpbGw9IiMzMDQxNTUiLz4KPHJlY3QgeD0iMjAiIHk9IjUwIiB3aWR0aD0iMTYwIiBoZWlnaHQ9IjIwIiByeD0iNCIgZmlsbD0iIzMwNDE1NSIvPgo8cmVjdCB4PSIyMCIgeT0iNzUiIHdpZHRoPSIxNjAiIGhlaWdodD0iMjAiIHJ4PSI0IiBmaWxsPSIjMzA0MTU1Ii8+Cjwvc3Zn+Cg==',
            badge: '交互'
        }
    ]

    // 导航菜单
    const menuItems = [
        { id: 'overview', name: '应用总览', icon: '📊' },
        { id: 'components', name: '组件库', icon: '🔧' },
        { id: 'templates', name: '模板中心', icon: '📋' },
        { id: 'settings', name: '设置', icon: '⚙️' }
    ]

    // 状态管理
    let selectedComponent = $state<ComponentItem | null>(null)
    let searchQuery = $state('')

    // 过滤后的组件列表
    let filteredComponents = $derived(allComponents.filter((comp) => comp.name.toLowerCase().includes(searchQuery.toLowerCase()) || comp.description.toLowerCase().includes(searchQuery.toLowerCase())))

    // 按类别分组的组件
    let groupedComponents = $derived(
        filteredComponents.reduce(
            (acc, comp) => {
                if (!acc[comp.category]) {
                    acc[comp.category] = []
                }
                acc[comp.category].push(comp)
                return acc
            },
            {} as Record<string, ComponentItem[]>
        )
    )

    // 处理菜单点击
    function handleMenuClick(itemId: string) {
        console.log('菜单点击:', itemId)
    }

    // 处理搜索
    function handleSearch(query: string) {
        searchQuery = query
    }

    // 处理卡片点击
    function handleCardClick(component: ComponentItem) {
        selectedComponent = component
    }

    // 处理返回
    function handleBack() {
        selectedComponent = null
    }
</script>

<!-- 页面主容器 -->
<ResponsiveBox style="display: flex; flex-direction: column; height: 100vh; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);">
    <!-- 顶部导航栏 - 100%宽度 -->
    <ResponsiveBox style="height: 64px; background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(10px); border-bottom: 1px solid rgba(99, 102, 241, 0.2); display: flex; align-items: center; padding: 0 24px; gap: 16px;">
        <img src={logoImage} alt="七巧板" style="width: 32px; height: 32px; border-radius: 8px;" />
        <ResponsiveBox tag="h1" style="color: #f8fafc; margin: 0; font-size: 20px; font-weight: 600;">七巧板</ResponsiveBox>
        <ResponsiveBox style="flex: 1; max-width: 400px; margin-left: auto;">
            <input
                type="search"
                placeholder="搜索组件..."
                value={searchQuery}
                oninput={(e) => handleSearch((e.target as HTMLInputElement).value)}
                style="width: 100%; padding: 8px 16px; background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 8px; color: #e2e8f0; font-size: 14px; outline: none; transition: border-color 0.2s ease;"
                onfocus={(e) => ((e.target as HTMLInputElement).style.borderColor = '#6366f1')}
                onblur={(e) => ((e.target as HTMLInputElement).style.borderColor = 'rgba(99, 102, 241, 0.2)')}
            />
        </ResponsiveBox>
    </ResponsiveBox>

    <!-- 主内容区域 - 侧边栏和内容并排 -->
    <ResponsiveBox style="flex: 1; display: flex; overflow: hidden;">
        <!-- 左侧边栏 - 使用DragDropList列表组件 -->
        <ResponsiveBox style="width: 250px; min-width: 200px; max-width: 300px; background: rgba(30, 41, 59, 0.8); border-right: 1px solid rgba(99, 102, 241, 0.2); padding: 16px;">
            <DragDropList items={menuItems} enableDrag={false} direction="vertical" renderAsMenu={true} onMenuClick={handleMenuClick} style="background: none; padding: 0;color: #fff;" />
        </ResponsiveBox>

        <!-- 内容区域 -->
        <ResponsiveBox style="flex: 1; overflow-y: auto; padding: 24px;">
            {#if selectedComponent}
                <!-- 组件详情视图 -->
                <ResponsiveBox style="max-width: 1200px; margin: 0 auto;">
                    <ActionButton
                        buttons={[
                            {
                                name: '← 返回列表',
                                variant: 'ghost',
                                size: 'medium'
                            }
                        ]}
                        direction="row"
                        style="margin-bottom: 24px;"
                        onbuttonClick={handleBack}
                    />

                    <ResponsiveBox style="background: rgba(30, 41, 59, 0.5); border-radius: 16px; padding: 40px; backdrop-filter: blur(10px); border: 1px solid rgba(99, 102, 241, 0.2);">
                        <ResponsiveBox tag="h1" style="color: #f8fafc; margin: 0 0 16px 0; font-size: 32px; font-weight: bold;">
                            {selectedComponent.name}
                        </ResponsiveBox>

                        <ResponsiveBox tag="p" style="color: #94a3b8; margin: 0 0 32px 0; font-size: 16px; line-height: 1.6;">
                            {selectedComponent.description}
                        </ResponsiveBox>

                        <ResponsiveBox style="background: rgba(15, 23, 42, 0.5); padding: 60px; border-radius: 12px; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(99, 102, 241, 0.1);">
                            <DynamicComponent type={selectedComponent.component} data-id={`demo-${selectedComponent.id}`} props={selectedComponent.props} />
                        </ResponsiveBox>
                    </ResponsiveBox>
                </ResponsiveBox>
            {:else}
                <!-- 组件画廊视图 -->
                <ResponsiveBox style="max-width: 1200px; margin: 0 auto;">
                    <!-- 搜索结果提示 -->
                    {#if searchQuery}
                        <ResponsiveBox style="margin-bottom: 24px; color: #94a3b8; font-size: 16px;">
                            搜索 "{searchQuery}" 的结果 ({filteredComponents.length} 个组件)
                        </ResponsiveBox>
                    {/if}

                    <!-- 按类别展示组件 -->
                    {#each Object.entries(groupedComponents) as [category, components]}
                        <ResponsiveBox style="margin-bottom: 48px;">
                            <ResponsiveBox tag="h2" style="color: #f8fafc; margin: 0 0 24px 0; font-size: 24px; font-weight: 600;">
                                {category}
                            </ResponsiveBox>

                            <ResponsiveBox style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px;">
                                {#each components as component}
                                    <Card id={component.id} title={component.name} description={component.description} image={component.image} badge={component.badge} onClick={() => handleCardClick(component)} />
                                {/each}
                            </ResponsiveBox>
                        </ResponsiveBox>
                    {/each}

                    {#if filteredComponents.length === 0}
                        <ResponsiveBox style="text-align: center; color: #94a3b8; font-size: 18px; padding: 60px;">未找到匹配的组件</ResponsiveBox>
                    {/if}
                </ResponsiveBox>
            {/if}
        </ResponsiveBox>
    </ResponsiveBox>
</ResponsiveBox>
