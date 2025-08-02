<!--
 * 卡片组件 - 用于展示项目/组件的卡片式布局
 * 功能：展示图片、标题、描述，支持点击交互和角标
 * 设计：现代卡片设计，悬停效果和动画
 * 使用：在画廊布局中展示组件或项目信息
-->

<script lang="ts">
    import ResponsiveBox from '../Core/ResponsiveBox.svelte'

    export interface CardProps {
        id: string
        title: string
        description?: string
        image?: string
        badge?: string
        onClick?: () => void
        style?: string
    }

    let { id, title, description = '', image, badge, onClick, style = '' }: CardProps = $props()
</script>

<ResponsiveBox
    style="background: rgba(30, 41, 59, 0.5); border-radius: 16px; padding: 20px; box-shadow: 0 8px 32px rgba(0,0,0,0.3); cursor: pointer; transition: all 0.3s ease; border: 1px solid rgba(99, 102, 241, 0.2); backdrop-filter: blur(10px); transform: translateY(0px); {style}"
    onclick={onClick}
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
    <!-- 角标 -->
    {#if badge}
        <ResponsiveBox style="position: absolute; top: 12px; right: 12px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; z-index: 1;">
            {badge}
        </ResponsiveBox>
    {/if}

    <!-- 图片区域 -->
    <ResponsiveBox style="width: 100%; height: 160px; background: rgba(15, 23, 42, 0.5); border-radius: 12px; margin-bottom: 16px; overflow: hidden; border: 1px solid rgba(99, 102, 241, 0.1); display: flex; align-items: center; justify-content: center;">
        {#if image}
            <img src={image} alt={title} style="width: 100%; height: 100%; object-fit: cover;" />
        {:else}
            <ResponsiveBox style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #64748b; font-size: 14px; background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);">预览图</ResponsiveBox>
        {/if}
    </ResponsiveBox>

    <!-- 标题 -->
    <ResponsiveBox style="font-size: 18px; font-weight: 600; color: #f8fafc; margin-bottom: 8px; line-height: 1.4;">
        {title}
    </ResponsiveBox>

    <!-- 描述 -->
    {#if description}
        <ResponsiveBox style="font-size: 14px; color: #94a3b8; font-weight: 400; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
            {description}
        </ResponsiveBox>
    {/if}
</ResponsiveBox>
