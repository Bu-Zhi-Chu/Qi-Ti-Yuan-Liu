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
        selected?: boolean
        onDelete?: (id?: string | number) => void | Promise<void>
        onClick?: () => void
    }

    let { prop1, prop2, prop3, prop4, prop5, onClick, showDelete = false, selected = false, onDelete }: Props = $props()

    import { getImage } from '../../services/database/image-store.service'
    import { registerBlobUrl } from '../../services/utils/blob-url-manager'

    const hashRegex = /^[a-f0-9]{40,}$/

    let imageSrc = $state<string | undefined>()
    let objectUrls: string[] = []
    let isHovered = $state(false)

    /** 根据 prop4 更新 imageSrc，可解析 Blob、普通 URL、哈希 */
    async function updateImage() {
        // 先清理旧 URL
        objectUrls.forEach((u) => URL.revokeObjectURL(u))
        objectUrls = []
        imageSrc = undefined

        if (!prop4) return

        if (prop4 instanceof Blob) {
            const url = URL.createObjectURL(prop4)
            objectUrls = [url]
            imageSrc = url
            return
        }

        if (typeof prop4 === 'string') {
            const str = prop4.trim()
            // 哈希路径：从 imageStore 查询
            if (hashRegex.test(str)) {
                if (typeof prop1 === 'string') {
                    const record = await getImage(String(prop1), str)
                    if (record) {
                        const url = URL.createObjectURL(record.blob)
                        registerBlobUrl(url)
                        objectUrls = [url]
                        imageSrc = url
                        return
                    }
                }
            }
            // 其他直接作为 URL 使用
            imageSrc = str
        }
    }

    // 初始及 prop4/prop1 变化时更新图片
    $effect(() => {
        void prop4
        void prop1
        updateImage()
    })

    onDestroy(() => {
        objectUrls.forEach((url) => URL.revokeObjectURL(url))
    })

    function handleDelete() {
        onDelete?.(prop1)
    }
</script>

<ResponsiveBox
    style="position: relative; background: {selected ? 'rgba(30, 41, 59, 0.8)' : 'rgba(30, 41, 59, 0.5)'}; border-radius: 16px; padding: 20px; box-shadow: {selected
        ? '0 0 20px rgba(99, 102, 241, 0.6), 0 0 40px rgba(139, 92, 246, 0.4)'
        : '0 8px 32px rgba(0,0,0,0.3)'}; cursor: pointer; transition: all 0.3s ease; width: 100%; border: 1px solid {selected ? 'rgba(99, 102, 241, 1)' : 'rgba(99, 102, 241, 0.2)'}; backdrop-filter: blur(10px); transform: translateY(0px);"
    onclick={onClick}
    onmouseenter={(e: MouseEvent) => {
        isHovered = true
        const target = e.currentTarget as HTMLElement
        target.style.transform = 'translateY(calc(-8px * var(--scale-ratio, 1))) scale(1.02)'
        target.style.boxShadow = '0 calc(20px * var(--scale-ratio, 1)) calc(60px * var(--scale-ratio, 1)) rgba(99, 102, 241, 0.4), 0 0 calc(30px * var(--scale-ratio, 1)) rgba(139, 92, 246, 0.3)'
        target.style.borderColor = selected ? 'rgba(99, 102, 241, 0.8)' : 'rgba(99, 102, 241, 0.5)'
    }}
    onmouseleave={(e: MouseEvent) => {
        isHovered = false
        const target = e.currentTarget as HTMLElement
        target.style.transform = 'translateY(calc(0px * var(--scale-ratio, 1))) scale(1)'
        target.style.boxShadow = selected ? '0 0 calc(20px * var(--scale-ratio, 1)) rgba(99, 102, 241, 0.6), 0 0 calc(40px * var(--scale-ratio, 1)) rgba(139, 92, 246, 0.4)' : '0 calc(8px * var(--scale-ratio, 1)) calc(32px * var(--scale-ratio, 1)) rgba(0,0,0,0.3)'
        target.style.borderColor = selected ? 'rgba(99, 102, 241, 0.8)' : 'rgba(99, 102, 241, 0.2)'
    }}
>
    <!-- 图片区域 -->
    <ResponsiveBox style="width: 100%; height: 160px; background: rgba(15, 23, 42, 0.5); border-radius: 12px; margin-bottom: 16px; overflow: hidden; border: 1px solid rgba(99, 102, 241, 0.1);">
        {#if imageSrc}
            <img src={imageSrc} alt={prop2 || '卡片图片'} style="width: 100%; height: 100%; object-fit: cover;" />
        {:else}
            <ResponsiveBox style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #64748b; font-size: 14px; background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);">预览图</ResponsiveBox>
        {/if}
    </ResponsiveBox>

    <!-- 删除按钮 -->
    {#if showDelete && isHovered}
        <ResponsiveBox
            style="position: absolute; top: 12px; left: 12px; background: rgba(220,38,38,0.8); color:#f8fafc; font-size:12px; padding:4px 8px; border-radius:4px; cursor:pointer; z-index:20;"
            onclick={(e: MouseEvent) => {
                e.stopPropagation()
                handleDelete()
            }}
        >
            删除
        </ResponsiveBox>
    {/if}

    <!-- 右上角悬浮标签 -->
    {#if prop5}
        <ResponsiveBox
            style="position: absolute; top: 12px; right: 12px; background: rgba(15, 23, 42, 0.8); color: #c7d2fe; font-size: 11px; padding: 6px 10px; border-radius: 20px; backdrop-filter: blur(10px); border: 1px solid rgba(99, 102, 241, 0.3); font-weight: 500; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 10;"
        >
            {prop5}
        </ResponsiveBox>
    {/if}

    <!-- 主标题 -->
    {#if prop2}
        <ResponsiveBox style="font-size: 16px; font-weight: 600; color: #f8fafc; margin-bottom: 8px; line-height: 1.4;">
            {prop2}
        </ResponsiveBox>
    {/if}

    <!-- 描述信息（单行省略） -->
    {#if prop3}
        <ResponsiveBox style="font-size: 13px; color: #94a3b8; font-weight: 400; line-height: 1.5; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; max-width: 100%;">
            {prop3}
        </ResponsiveBox>
    {/if}
</ResponsiveBox>
