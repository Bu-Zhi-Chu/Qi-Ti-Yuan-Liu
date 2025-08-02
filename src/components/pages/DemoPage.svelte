<!--
 * 组件演示页面 - 重构版本
 *
 * 功能描述：
 * 顶部导航按钮组 + 左侧组件列表 + 右侧组件展示区域的三栏布局
 * 支持按类别筛选组件，点击列表项展示对应组件
 *
 * 使用示例：
 * 通过路由 /demo 访问此演示页面
 *
 * 架构：
 * 1. 顶部：导航按钮组（UI类别）
 * 2. 左侧：组件名称列表
 * 3. 右侧：选中组件的详细展示区域
-->

<script lang="ts">
    import ResponsiveBox from '../Core/ResponsiveBox.svelte'
    import SimpleBox from '../Core/SimpleBox.svelte'
    import RealTimeClock from '../widgets/RealTimeClock.svelte'
    import CustomTextInput from '../widgets/CustomTextInput.svelte'
    import ActionButton from '../widgets/ActionButton.svelte'
    import DynamicComponent from '../Core/DynamicComponent.svelte'
    import DragDropList from '../widgets/DragDropList.svelte'

    // 组件分类和列表定义
    interface ComponentItem {
        id: string
        name: string
        category: string
        component: any
        props?: Record<string, any>
        description: string
    }

    // UI类别下的所有组件
    const uiComponents: ComponentItem[] = [
        {
            id: 'realtime-clock',
            name: '实时时钟',
            category: 'UI',
            component: RealTimeClock,
            props: { format: 'datetime-weekday', displayMode: 'multi-line' },
            description: '显示实时时间的响应式时钟组件，支持多种显示格式'
        },
        {
            id: 'custom-text-input',
            name: '自定义文本输入',
            category: 'UI',
            component: CustomTextInput,
            props: { value: '演示输入框', placeholder: '请输入内容...' },
            description: '功能完整的文本输入组件，支持双向数据绑定'
        },
        {
            id: 'action-button',
            name: '动作按钮',
            category: 'UI',
            component: ActionButton,
            props: {
                buttons: [
                    { name: '主要操作', variant: 'primary', size: 'medium' },
                    { name: '次要操作', variant: 'secondary', size: 'medium' },
                    { name: '警告操作', variant: 'warning', size: 'medium' }
                ],
                direction: 'row'
            },
            description: '灵活的按钮组件，支持单个按钮和按钮组模式'
        },
        {
            id: 'responsive-box',
            name: '响应式容器',
            category: 'UI',
            component: ResponsiveBox,
            props: { 
                style: 'width: 200px; height: 100px; background: linear-gradient(45deg, #ff6b6b, #4ecdc4); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;',
                tag: 'div'
            },
            description: '自适应的响应式容器组件，所有自定义组件的基础'
        },
        {
            id: 'simple-box',
            name: '轻量级容器',
            category: 'UI',
            component: SimpleBox,
            props: { 
                style: 'width: 200px; height: 80px; background: #4ade80; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white;',
                tag: 'div'
            },
            description: '轻量级的简单容器组件，适合快速布局'
        },
        {
            id: 'drag-drop-list',
            name: '拖拽列表',
            category: 'UI',
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
            description: '支持拖拽排序的响应式列表组件'
        }
    ]

    // 当前选中的类别（目前只有UI）
    const categories = ['UI']
    let selectedCategory = $state('UI')
    let selectedComponent = $state<ComponentItem>(uiComponents[0])

    // 根据选中类别获取组件列表
    let componentList = $derived(
        selectedCategory === 'UI' ? uiComponents : []
    )

    // 处理类别切换
    function handleCategoryChange(category: string) {
        selectedCategory = category
        // 切换到新类别时，默认选中第一个组件
        selectedComponent = componentList[0]
    }

    // 处理组件选择
    function handleComponentSelect(component: ComponentItem) {
        selectedComponent = component
    }

    // 树形结构数据（用于拖拽列表组件演示）
    let treeItems = $state([
        {
            id: 1,
            text: '前端开发',
            type: '文件夹',
            children: [
                { id: 11, text: 'React组件', type: '文件', children: [] },
                { id: 12, text: 'Vue组件', type: '文件', children: [] },
                {
                    id: 13,
                    text: '样式文件',
                    type: '文件夹',
                    children: [
                        { id: 131, text: 'CSS样式', type: '文件', children: [] },
                        { id: 132, text: 'SCSS样式', type: '文件', children: [] }
                    ]
                }
            ]
        },
        {
            id: 2,
            text: '后端开发',
            type: '文件夹',
            children: [
                { id: 21, text: 'API接口', type: '文件', children: [] },
                { id: 22, text: '数据库模型', type: '文件', children: [] }
            ]
        },
        {
            id: 3,
            text: '文档',
            type: '文件夹',
            children: [
                { id: 31, text: '需求文档', type: '文件', children: [] },
                { id: 32, text: '技术文档', type: '文件', children: [] }
            ]
        }
    ])

    function handleTreeReorder(newItems: any[]) {
        console.log('树形结构重新排序:', newItems)
        treeItems = newItems
    }

    function handleNodeToggle(nodeId: number) {
        console.log('节点展开/折叠:', nodeId)
    }
</script>

<!-- 页面主容器 -->
<ResponsiveBox style="padding: 20px; min-height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; flex-direction: column;">
    
    <!-- 顶部导航按钮组 -->
    <ResponsiveBox style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 15px; margin-bottom: 20px; text-align: center;">
        <ResponsiveBox tag="h1" style="color: white; margin: 0 0 15px 0; font-size: 32px; font-weight: bold;">🔧 组件演示中心</ResponsiveBox>
        <ActionButton 
            buttons={categories.map(cat => ({ 
                name: cat, 
                variant: selectedCategory === cat ? 'primary' : 'secondary',
                size: 'large'
            }))}
            direction="row"
            style="justify-content: center; gap: 10px;"
            onbuttonClick={(event) => handleCategoryChange(event.name)}
        />
    </ResponsiveBox>

    <!-- 主内容区域 - 三栏布局 -->
    <ResponsiveBox style="display: grid; grid-template-columns: 250px 1fr; gap: 20px; flex: 1; max-width: 1400px; width: 100%; margin: 0 auto;">
        
        <!-- 左侧：组件列表 -->
        <ResponsiveBox style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 15px; height: fit-content;">
            <ResponsiveBox tag="h3" style="color: white; margin: 0 0 15px 0; font-size: 20px; font-weight: bold;">{selectedCategory} 组件</ResponsiveBox>
            
            <ResponsiveBox style="display: flex; flex-direction: column; gap: 8px;">
                {#each componentList as component}
                    <ActionButton
                        buttons={[{ 
                            name: component.name, 
                            variant: selectedComponent.id === component.id ? 'primary' : 'ghost',
                            size: 'medium'
                        }]}
                        direction="column"
                        style="width: 100%;"
                        onbuttonClick={() => handleComponentSelect(component)}
                    />
                {/each}
            </ResponsiveBox>
        </ResponsiveBox>

        <!-- 右侧：组件展示区域 -->
        <ResponsiveBox style="background: rgba(255,255,255,0.1); padding: 30px; border-radius: 15px;">
            <ResponsiveBox tag="h2" style="color: white; margin: 0 0 20px 0; font-size: 28px; font-weight: bold;">
                {selectedComponent.name}
            </ResponsiveBox>
            
            <ResponsiveBox tag="p" style="color: rgba(255,255,255,0.8); margin: 0 0 30px 0; font-size: 16px; line-height: 1.5;">
                {selectedComponent.description}
            </ResponsiveBox>

            <!-- 组件展示区域 -->
            <ResponsiveBox style="background: rgba(255,255,255,0.05); padding: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; min-height: 300px;">
                <DynamicComponent
                    type={selectedComponent.component}
                    data-id={`demo-${selectedComponent.id}`}
                    props={selectedComponent.props}
                />
            </ResponsiveBox>
        </ResponsiveBox>
    </ResponsiveBox>


</ResponsiveBox>
