<!--
 * 顶部导航栏组件 - 应用顶部导航
 * 功能：包含Logo、应用标题、搜索框、外部导航链接
 * 设计：现代顶部导航栏，支持响应式布局
 * 使用：应用级导航或页面头部
-->

<script lang="ts">
    import ResponsiveBox from '../Core/ResponsiveBox.svelte'
    import ActionButton from './ActionButton.svelte'
    import logoImage from '../../assets/img/icon-192.png'

    export interface NavLink {
        name: string
        url: string
        icon?: string
    }

    interface TopNavBarProps {
        logo?: string
        title: string
        searchPlaceholder?: string
        navLinks?: NavLink[]
        onSearch?: (query: string) => void
    }

    let { logo = logoImage, title, searchPlaceholder = '搜索...', navLinks = [], onSearch }: TopNavBarProps = $props()
    let searchQuery = $state('')

    // 处理搜索
    function handleSearch() {
        if (onSearch) {
            onSearch(searchQuery)
        }
    }

    // 处理回车搜索
    function handleKeyPress(event: KeyboardEvent) {
        if (event.key === 'Enter') {
            handleSearch()
        }
    }
</script>

<ResponsiveBox style="height: 64px; background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(10px); border-bottom: 1px solid rgba(99, 102, 241, 0.2); display: flex; align-items: center; padding: 0 24px; gap: 24px; position: sticky; top: 0; z-index: 100;">
    <!-- Logo区域 -->
    <ResponsiveBox style="display: flex; align-items: center; gap: 12px;">
        <img src={logo} alt="Logo" style="width: 32px; height: 32px; border-radius: 8px;" />
        <ResponsiveBox style="font-size: 20px; font-weight: 700; color: #f8fafc; background: linear-gradient(135deg, #f8fafc, #94a3b8); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
            {title}
        </ResponsiveBox>
    </ResponsiveBox>

    <!-- 搜索框 -->
    <ResponsiveBox style="flex: 1; max-width: 400px; position: relative;">
        <input
            type="text"
            bind:value={searchQuery}
            placeholder={searchPlaceholder}
            style="width: 100%; padding: 10px 40px 10px 16px; background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 8px; color: #f8fafc; font-size: 14px; transition: all 0.3s ease;"
            onkeypress={handleKeyPress}
            onfocus={(e) => {
                const target = e.target as HTMLInputElement
                target.style.borderColor = 'rgba(99, 102, 241, 0.5)'
                target.style.boxShadow = '0 0 0 2px rgba(99, 102, 241, 0.1)'
            }}
            onblur={(e) => {
                const target = e.target as HTMLInputElement
                target.style.borderColor = 'rgba(99, 102, 241, 0.2)'
                target.style.boxShadow = 'none'
            }}
        />
        <ResponsiveBox style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 16px;">🔍</ResponsiveBox>
    </ResponsiveBox>

    <!-- 导航链接 -->
    <ResponsiveBox style="display: flex; align-items: center; gap: 8px;">
        {#each navLinks as link}
            <ActionButton
                buttons={[
                    {
                        name: link.name,
                        variant: 'ghost',
                        size: 'medium'
                    }
                ]}
                direction="row"
                style="border-radius: 8px;"
                onbuttonClick={() => {
                    if (link.url.startsWith('http')) {
                        window.open(link.url, '_blank')
                    } else {
                        window.location.href = link.url
                    }
                }}
            />
        {/each}
    </ResponsiveBox>
</ResponsiveBox>
