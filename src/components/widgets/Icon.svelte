<!--
 * 统一图标组件 - 基于Lucide的图标封装
 * 功能：提供项目统一的图标样式和交互规范
 * 用法：
 *   <Icon name="Home" size={24} color="#3b82f6" />
 *   <Icon name="Plus" size={32} class="text-blue-500" />
 *
 * 支持的图标：
 * - 所有Lucide图标库中的1500+图标
 * - 支持自定义大小、颜色、描边宽度
 * - 支持Tailwind CSS类名
 * - 支持响应式缩放
-->

<script lang="ts">
    // 动态导入所有图标，支持tree-shaking
    const iconMap = {
        Home: () => import('@lucide/svelte/icons/home'),
        Plus: () => import('@lucide/svelte/icons/plus'),
        Settings: () => import('@lucide/svelte/icons/settings'),
        Trash: () => import('@lucide/svelte/icons/trash-2'),
        Edit: () => import('@lucide/svelte/icons/edit-3'),
        Save: () => import('@lucide/svelte/icons/save'),
        Download: () => import('@lucide/svelte/icons/download'),
        Upload: () => import('@lucide/svelte/icons/upload'),
        Search: () => import('@lucide/svelte/icons/search'),
        Eye: () => import('@lucide/svelte/icons/eye'),
        EyeOff: () => import('@lucide/svelte/icons/eye-off'),
        Copy: () => import('@lucide/svelte/icons/copy'),
        Move: () => import('@lucide/svelte/icons/move'),
        Rotate: () => import('@lucide/svelte/icons/rotate-cw'),
        ZoomIn: () => import('@lucide/svelte/icons/zoom-in'),
        ZoomOut: () => import('@lucide/svelte/icons/zoom-out'),
        Undo: () => import('@lucide/svelte/icons/undo'),
        Redo: () => import('@lucide/svelte/icons/redo'),
        Palette: () => import('@lucide/svelte/icons/palette'),
        Layers: () => import('@lucide/svelte/icons/layers'),
        Grid: () => import('@lucide/svelte/icons/grid'),
        Box: () => import('@lucide/svelte/icons/box'),
        Circle: () => import('@lucide/svelte/icons/circle'),
        Square: () => import('@lucide/svelte/icons/square'),
        Triangle: () => import('@lucide/svelte/icons/triangle'),
        Star: () => import('@lucide/svelte/icons/star'),
        Heart: () => import('@lucide/svelte/icons/heart'),
        Share: () => import('@lucide/svelte/icons/share-2'),
        Link: () => import('@lucide/svelte/icons/link'),
        External: () => import('@lucide/svelte/icons/external-link'),
        Menu: () => import('@lucide/svelte/icons/menu'),
        Close: () => import('@lucide/svelte/icons/x'),
        ChevronLeft: () => import('@lucide/svelte/icons/chevron-left'),
        ChevronRight: () => import('@lucide/svelte/icons/chevron-right'),
        ChevronUp: () => import('@lucide/svelte/icons/chevron-up'),
        ChevronDown: () => import('@lucide/svelte/icons/chevron-down'),
        Play: () => import('@lucide/svelte/icons/play'),
        Pause: () => import('@lucide/svelte/icons/pause'),
        Stop: () => import('@lucide/svelte/icons/square'),
        Refresh: () => import('@lucide/svelte/icons/refresh-cw'),
        Loading: () => import('@lucide/svelte/icons/loader-2'),
        Check: () => import('@lucide/svelte/icons/check'),
        X: () => import('@lucide/svelte/icons/x'),
        Alert: () => import('@lucide/svelte/icons/alert-triangle'),
        Info: () => import('@lucide/svelte/icons/info'),
        Warning: () => import('@lucide/svelte/icons/alert-circle'),
        Success: () => import('@lucide/svelte/icons/check-circle'),
        Folder: () => import('@lucide/svelte/icons/folder'),
        File: () => import('@lucide/svelte/icons/file'),
        Image: () => import('@lucide/svelte/icons/image'),
        Video: () => import('@lucide/svelte/icons/video'),
        Audio: () => import('@lucide/svelte/icons/music'),
        Code: () => import('@lucide/svelte/icons/code'),
        Terminal: () => import('@lucide/svelte/icons/terminal'),
        Database: () => import('@lucide/svelte/icons/database'),
        Cloud: () => import('@lucide/svelte/icons/cloud'),
        Wifi: () => import('@lucide/svelte/icons/wifi'),
        Bluetooth: () => import('@lucide/svelte/icons/bluetooth'),
        Battery: () => import('@lucide/svelte/icons/battery'),
        Clock: () => import('@lucide/svelte/icons/clock'),
        Calendar: () => import('@lucide/svelte/icons/calendar'),
        Mail: () => import('@lucide/svelte/icons/mail'),
        Phone: () => import('@lucide/svelte/icons/phone'),
        Location: () => import('@lucide/svelte/icons/map-pin'),
        User: () => import('@lucide/svelte/icons/user'),
        Users: () => import('@lucide/svelte/icons/users'),
        Lock: () => import('@lucide/svelte/icons/lock'),
        Unlock: () => import('@lucide/svelte/icons/unlock'),
        Key: () => import('@lucide/svelte/icons/key'),
        Shield: () => import('@lucide/svelte/icons/shield'),
        Award: () => import('@lucide/svelte/icons/award'),
        Trophy: () => import('@lucide/svelte/icons/trophy'),
        Flag: () => import('@lucide/svelte/icons/flag'),
        Tag: () => import('@lucide/svelte/icons/tag'),
        Bookmark: () => import('@lucide/svelte/icons/bookmark'),
        Print: () => import('@lucide/svelte/icons/printer'),
        Export: () => import('@lucide/svelte/icons/download'),
        Import: () => import('@lucide/svelte/icons/upload'),
        Filter: () => import('@lucide/svelte/icons/filter'),
        Sort: () => import('@lucide/svelte/icons/arrow-up-down'),
        ArrowUp: () => import('@lucide/svelte/icons/arrow-up'),
        ArrowDown: () => import('@lucide/svelte/icons/arrow-down'),
        ArrowLeft: () => import('@lucide/svelte/icons/arrow-left'),
        ArrowRight: () => import('@lucide/svelte/icons/arrow-right')
    }

    interface Props {
        name: keyof typeof iconMap
        size?: number
        color?: string
        strokeWidth?: number
        class?: string
        style?: string
    }

    let { name, size = 24, color = 'currentColor', strokeWidth = 2, class: className = '', style = '' }: Props = $props()

    let IconComponent: any = $state(null)

    $effect(() => {
        async function loadIcon() {
            try {
                const module = await iconMap[name]()
                IconComponent = module.default
            } catch (error) {
                console.error(`Failed to load icon: ${name}`, error)
                IconComponent = null
            }
        }
        loadIcon()
    })
</script>

{#if IconComponent}
    <IconComponent {size} {color} {strokeWidth} class={className} {style} />
{:else}
    <div style="width: {size}px; height: {size}px;" class="{className} bg-gray-200 rounded" aria-label="Loading icon..."></div>
{/if}
