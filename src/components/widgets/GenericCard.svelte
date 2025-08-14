<!--
 * 通用卡片组件 - GenericCard
 * 功能：提供统一的卡片展示组件，使用通用属性名prop1-prop5
 * 设计：基于ResponsiveBox实现的响应式卡片，支持自定义内容展示
 * 属性：
 *   prop1: 主标识符（如ID）
 *   prop2: 主标题（如名称）
 *   prop3: 描述信息
 *   prop4: 图片URL
 *   prop5: 标签/徽章文本
 * 事件：
 *   onClick: 点击事件回调
 * 样式：现代化玻璃态设计，支持悬停效果
-->

<script lang="ts">
    import ResponsiveBox from '../core/ResponsiveBox.svelte'
    import { onDestroy } from 'svelte'

    interface Props {
        prop1?: string | number
        prop2?: string
        prop3?: string
        prop4?: string | Blob
        prop5?: string
        showDelete?: boolean
        onDelete?: (id?: string | number) => void | Promise<void>
        onClick?: () => void
    }

    let { prop1, prop2, prop3, prop4, prop5, onClick, showDelete = false, onDelete }: Props = $props()

    let imageSrc = $state<string | undefined>()
    let objectUrls = $state<string[]>([])
    let isHovered = $state(false)

    $effect(() => {
        if (prop4) {
            if (prop4 instanceof Blob) {
                const url = URL.createObjectURL(prop4)
                imageSrc = url
                objectUrls = [url]
            } else {
                imageSrc = prop4
                objectUrls = []
            }
        } else {
            imageSrc = undefined
            objectUrls = []
        }

        return () => {
            objectUrls.forEach((url) => URL.revokeObjectURL(url))
            objectUrls = []
        }
    })

    onDestroy(() => {
        objectUrls.forEach((url) => URL.revokeObjectURL(url))
    })

    function handleDelete() {
        onDelete?.(prop1)
    }
</script>

<ResponsiveBox
    style="position: relative; background: rgba(30, 41, 59, 0.5); border-radius: calc(16px * var(--scale-ratio, 1)); padding: calc(20px * var(--scale-ratio, 1)); box-shadow: 0 calc(8px * var(--scale-ratio, 1)) calc(32px * var(--scale-ratio, 1)) rgba(0,0,0,0.3); cursor: pointer; transition: all 0.3s ease; width: 100%; border: calc(1px * var(--scale-ratio, 1)) solid rgba(99, 102, 241, 0.2); backdrop-filter: blur(calc(10px * var(--scale-ratio, 1))); transform: translateY(0px);"
    onclick={onClick}
    onmouseenter={(e: MouseEvent) => {
        isHovered = true
        const target = e.currentTarget as HTMLElement
        target.style.transform = 'translateY(-8px) scale(1.02)'
        target.style.boxShadow = '0 20px 60px rgba(99, 102, 241, 0.4), 0 0 30px rgba(139, 92, 246, 0.3)'
        target.style.borderColor = 'rgba(99, 102, 241, 0.5)'
    }}
    onmouseleave={(e: MouseEvent) => {
        isHovered = false
        const target = e.currentTarget as HTMLElement
        target.style.transform = 'translateY(0px) scale(1)'
        target.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)'
        target.style.borderColor = 'rgba(99, 102, 241, 0.2)'
    }}
>
    <!-- 图片区域 -->
    <ResponsiveBox
        style="width: 100%; height: calc(160px * var(--scale-ratio, 1)); background: rgba(15, 23, 42, 0.5); border-radius: calc(12px * var(--scale-ratio, 1)); margin-bottom: calc(16px * var(--scale-ratio, 1)); overflow: hidden; border: calc(1px * var(--scale-ratio, 1)) solid rgba(99, 102, 241, 0.1);"
    >
        {#if imageSrc}
            <img src={imageSrc} alt={prop2 || '卡片图片'} style="width: 100%; height: 100%; object-fit: cover;" />
        {:else}
            <ResponsiveBox style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #64748b; font-size: 14px; background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);">预览图</ResponsiveBox>
        {/if}
    </ResponsiveBox>

    <!-- 删除按钮 -->
    {#if showDelete && isHovered}
        <ResponsiveBox
            style="position: absolute; top: calc(12px * var(--scale-ratio, 1)); left: calc(12px * var(--scale-ratio, 1)); background: rgba(220,38,38,0.8); color:#f8fafc; font-size: calc(12px * var(--scale-ratio, 1)); padding: calc(4px * var(--scale-ratio, 1)) calc(8px * var(--scale-ratio, 1)); border-radius: calc(4px * var(--scale-ratio, 1)); cursor:pointer; z-index:20;"
            onclick={handleDelete}
        >
            删除
        </ResponsiveBox>
    {/if}

    <!-- 右上角悬浮标签 -->
    {#if prop5}
        <ResponsiveBox
            style="position: absolute; top: calc(12px * var(--scale-ratio, 1)); right: calc(12px * var(--scale-ratio, 1)); background: rgba(15, 23, 42, 0.8); color: #c7d2fe; font-size: calc(11px * var(--scale-ratio, 1)); padding: calc(6px * var(--scale-ratio, 1)) calc(10px * var(--scale-ratio, 1)); border-radius: calc(20px * var(--scale-ratio, 1)); backdrop-filter: blur(calc(10px * var(--scale-ratio, 1))); border: calc(1px * var(--scale-ratio, 1)) solid rgba(99, 102, 241, 0.3); font-weight: 500; box-shadow: 0 calc(4px * var(--scale-ratio, 1)) calc(12px * var(--scale-ratio, 1)) rgba(0,0,0,0.3); z-index: 10;"
        >
            {prop5}
        </ResponsiveBox>
    {/if}

    <!-- 主标题 -->
    {#if prop2}
        <ResponsiveBox style="font-size: calc(16px * var(--scale-ratio, 1)); font-weight: 600; color: #f8fafc; margin-bottom: calc(8px * var(--scale-ratio, 1)); line-height: 1.4;">
            {prop2}
        </ResponsiveBox>
    {/if}

    <!-- 描述信息（单行省略） -->
    {#if prop3}
        <ResponsiveBox style="font-size: calc(13px * var(--scale-ratio, 1)); color: #94a3b8; font-weight: 400; line-height: 1.5; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; max-width: 100%;">
            {prop3}
        </ResponsiveBox>
    {/if}
</ResponsiveBox>
