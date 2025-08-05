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

    import RealTimeClock from '../widgets/RealTimeClock.svelte'

    import ActionButton from '../widgets/ActionButton.svelte'
    import DragDropList from '../widgets/DragDropList.svelte'

    import GenericCard from '../widgets/GenericCard.svelte'
    import logoImage from '../../assets/img/icon-192.png'
    import { useNavigate } from '@dvcol/svelte-simple-router/router'

    const { push } = useNavigate()

    interface ComponentItem {
        id: string
        name: string
        category: string
        component: any
        props: any
        description: string
        image?: string
        badge?: string
    }

    // 状态管理
    let selectedComponent = $state<ComponentItem | null>(null)
    let searchQuery = $state('')
    let selectedListItem = $state<string | null>('1')

    // 所有可用组件
    let allComponents = $derived([
        {
            id: 'realtime-clock',
            name: '实时时钟',
            category: '官方示例',
            component: RealTimeClock,
            props: { format: 'datetime-weekday', displayMode: 'multi-line' },
            description: '显示实时时间的响应式时钟组件，支持多种显示格式',
            image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDIwMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTIwIiBmaWxsPSIjMWUyOTNiIi8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjYwIiByPSI0MCIgc3Ryb2tlPSIjNjM2NmYxIiBzdHJva2Utd2lkdGg9IjIiIGZpbGw9Im5vbmUiLz4KPGxpbmUgeDE9IjEwMCIgeTE9IjYwIiB4Mj0iMTAwIiB5Mj0iNDAiIHN0cm9rZT0iIzYzNjZmMSIgc3Ryb2tlLXdpZHRoPSIyIi8+CjxsaW5lIHgxPSIxMDAiIHkxPSI2MCIgeDI9IjEyMCIgeTI9IjYwIiBzdHJva2U9IiM2MzY2ZjEiIHN0cm9rZS13aWR0aD0iMiIvPgo8L3N2Zz4K',
            badge: '组合'
        }
    ])

    /**
     * 模块层级数据定义
     * 第 1 层：模块按钮（可直接用于顶部 <ActionButton>）
     * 第 2 层：模块内左侧列表（分类）
     * 第 3 层：分类下组件条目（右侧画廊）
     */
    interface CategoryItem {
        id: string
        name: string
        children: ComponentItem[]
    }

    interface ModuleItem {
        id: string
        name: string
        children: CategoryItem[]
    }

    // 统一后的三层数据（根据 allComponents 派生）
    let modulesData = $derived((): ModuleItem[] => [
        {
            id: 'ui',
            name: 'UI组件',
            children: [
                { id: '官方示例', name: '官方示例', children: allComponents.filter((c) => c.category === '官方示例') },
                { id: '基础示例', name: '基础示例', children: allComponents.filter((c) => c.category === '基础示例') },
                { id: '交互', name: '交互', children: allComponents.filter((c) => c.category === '交互') }
            ]
        },
        { id: 'map', name: '电子地图', children: [] },
        { id: 'engine', name: '三维引擎', children: [] }
    ])

    // 当前选中的顶部按钮组
    let selectedModule = $state('UI组件')

    // 顶部按钮组数据（第 1 层）
    let moduleButtons = $derived(() =>
        modulesData().map((m) => ({
            name: m.name,
            variant: (selectedModule === m.name ? 'primary' : 'ghost') as 'primary' | 'ghost',
            size: 'medium' as 'medium',
            style: 'width: 120px;height: 30px;'
        }))
    )

    // 左侧列表数据（第 2 层）
    let menuItems = $derived(() =>
        (modulesData().find((m) => m.name === selectedModule)?.children || []).map((cat) => ({
            id: cat.id,
            name: cat.name,
            icon: '📂'
        }))
    )

    // 当前选中的菜单项
    let selectedMenuItem = $state('官方示例')

    // 过滤后的组件列表（第 3 层）
    let filteredComponents = $derived(() =>
        (
            modulesData()
                .find((m) => m.name === selectedModule)
                ?.children.find((c) => c.id === selectedMenuItem)?.children || []
        ).filter((comp) => comp.name.toLowerCase().includes(searchQuery.toLowerCase()) || comp.description.toLowerCase().includes(searchQuery.toLowerCase()))
    )

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
        <img src={logoImage} alt="七巧板" style="width:calc(32px * var(--scale-ratio, 1)); height: calc(32px * var(--scale-ratio, 1)); border-radius: 8px;" />
        <ResponsiveBox tag="h1" style="color: #f8fafc; margin: 0; font-size: 20px; font-weight: 600;">七巧板</ResponsiveBox>

        <!-- 居中的按钮组 -->
        <ResponsiveBox style="flex: 1; display: flex; justify-content: center;">
            <ActionButton
                buttons={moduleButtons()}
                direction="row"
                style="gap: 23px;"
                onbuttonClick={(event: { name: string; index: number; button: any }) => {
                    selectedModule = event.name
                    // 当模块变更时同步选中其首分类为左侧激活项
                    const firstCat = modulesData().find((m) => m.name === event.name)?.children[0]
                    if (firstCat) selectedMenuItem = firstCat.id
                }}
            />
        </ResponsiveBox>

        <ResponsiveBox style="max-width: 300px;">
            <input
                type="search"
                placeholder="搜索组件..."
                value={searchQuery}
                oninput={(e) => handleSearch((e.target as HTMLInputElement).value)}
                style="width: 100%; padding:calc(8px * var(--scale-ratio, 1)) calc(16px * var(--scale-ratio, 1)); background: rgba(30, 41, 59, 0.5); border: calc(1px * var(--scale-ratio, 1)) solid rgba(99, 102, 241, 0.2); border-radius: calc(8px * var(--scale-ratio, 1)); color: #e2e8f0; font-size: calc(14px * var(--scale-ratio, 1)); outline: none; transition: border-color 0.2s ease;"
                onfocus={(e) => ((e.target as HTMLInputElement).style.borderColor = '#6366f1')}
                onblur={(e) => ((e.target as HTMLInputElement).style.borderColor = 'rgba(99, 102, 241, 0.2)')}
            />
        </ResponsiveBox>
    </ResponsiveBox>

    <!-- 主内容区域 - 侧边栏和内容并排 -->
    <ResponsiveBox style="flex: 1; display: flex; overflow: hidden;">
        <!-- 左侧边栏 - 使用DragDropList列表组件 -->
        <ResponsiveBox style="width: 250px; min-width: 200px; max-width: 300px; background: rgba(30, 41, 59, 0.8); border-right: 1px solid rgba(99, 102, 241, 0.2); padding: 16px;">
            <DragDropList items={menuItems()} enableDrag={false} direction="vertical" selectedId={selectedMenuItem} onSelect={(id: string) => (selectedMenuItem = String(id))} style="background: none; padding: 0;color: #fff;" />
        </ResponsiveBox>

        <!-- 内容区域 -->
        <ResponsiveBox style="flex: 1; overflow-y: auto; padding: 24px;">
            <!-- 组件画廊视图 -->
            <ResponsiveBox style=" margin: 0 auto;">
                <!-- 搜索结果提示 -->
                {#if searchQuery}
                    <ResponsiveBox style="margin-bottom: 24px; color: #94a3b8; font-size: 16px;">
                        搜索 "{searchQuery}" 的结果 ({filteredComponents().length} 个组件)
                    </ResponsiveBox>
                {/if}

                <!-- 当前分类组件列表 -->
                <ResponsiveBox style="margin-bottom: 12px;">
                    <ResponsiveBox style="color: #f8fafc; margin: 0 0 6px 0; font-size:26px; font-weight: 600;">
                        {selectedMenuItem}
                    </ResponsiveBox>

                    <ResponsiveBox style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px;">
                        {#each filteredComponents() as component}
                            <a
                                href={`/playground/${component.id}`}
                                onclick={(e) => {
                                    e.preventDefault()
                                    push({ path: `/playground/${component.id}` })
                                }}
                                style="text-decoration:none;display:block;"
                            >
                                <GenericCard prop1={component.id} prop2={component.name} prop3={component.description} prop4={component.image} prop5={component.badge} />
                            </a>
                        {/each}
                    </ResponsiveBox>
                </ResponsiveBox>

                {#if filteredComponents().length === 0}
                    <ResponsiveBox style="text-align: center; color: #94a3b8; font-size: 18px; padding: 60px;">未找到匹配的组件</ResponsiveBox>
                {/if}
            </ResponsiveBox>
        </ResponsiveBox>
    </ResponsiveBox>

    <!-- 返回首页链接 -->
    <a href="/" class="back-to-home">← 返回</a>
</ResponsiveBox>

<style>
    .back-to-home {
        position: fixed;
        bottom: 20px;
        right: 20px;
        color: rgba(255, 255, 255, 0.7);
        text-decoration: none;
        font-size: 14px;
        transition: color 0.2s ease;
        z-index: 10;
    }
    .back-to-home:hover {
        color: rgba(255, 255, 255, 1);
    }
</style>
