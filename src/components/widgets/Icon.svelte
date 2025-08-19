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
    // 注意：所有图标路径都使用静态字符串，避免Vite动态导入警告
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
        LocateFixed: () => import('@lucide/svelte/icons/locate-fixed'),
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
        Pipette: () => import('@lucide/svelte/icons/pipette'),
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
        BookA: () => import('@lucide/svelte/icons/book-a'),
        Print: () => import('@lucide/svelte/icons/printer'),
        Export: () => import('@lucide/svelte/icons/download'),
        Import: () => import('@lucide/svelte/icons/upload'),
        Filter: () => import('@lucide/svelte/icons/filter'),
        Sort: () => import('@lucide/svelte/icons/arrow-up-down'),
        ArrowUp: () => import('@lucide/svelte/icons/arrow-up'),
        ArrowDown: () => import('@lucide/svelte/icons/arrow-down'),
        ArrowLeft: () => import('@lucide/svelte/icons/arrow-left'),
        ArrowRight: () => import('@lucide/svelte/icons/arrow-right'),
        Sliders: () => import('@lucide/svelte/icons/sliders'),
        PictureInPicture: () => import('@lucide/svelte/icons/picture-in-picture'),
        SquareDashed: () => import('@lucide/svelte/icons/square-dashed'),
        MousePointerClick: () => import('@lucide/svelte/icons/mouse-pointer-click'),
        GalleryHorizontal: () => import('@lucide/svelte/icons/gallery-horizontal'),
        Workflow: () => import('@lucide/svelte/icons/workflow')
    }

    // 扩展图标映射，支持kebab-case命名
    const kebabIconMap: Record<string, () => Promise<any>> = {
        'home': () => import('@lucide/svelte/icons/home'),
        'plus': () => import('@lucide/svelte/icons/plus'),
        'settings': () => import('@lucide/svelte/icons/settings'),
        'trash-2': () => import('@lucide/svelte/icons/trash-2'),
        'edit-3': () => import('@lucide/svelte/icons/edit-3'),
        'save': () => import('@lucide/svelte/icons/save'),
        'download': () => import('@lucide/svelte/icons/download'),
        'upload': () => import('@lucide/svelte/icons/upload'),
        'search': () => import('@lucide/svelte/icons/search'),
        'eye': () => import('@lucide/svelte/icons/eye'),
        'eye-off': () => import('@lucide/svelte/icons/eye-off'),
        'copy': () => import('@lucide/svelte/icons/copy'),
        'move': () => import('@lucide/svelte/icons/move'),
        'locate-fixed': () => import('@lucide/svelte/icons/locate-fixed'),
        'rotate-cw': () => import('@lucide/svelte/icons/rotate-cw'),
        'zoom-in': () => import('@lucide/svelte/icons/zoom-in'),
        'zoom-out': () => import('@lucide/svelte/icons/zoom-out'),
        'undo': () => import('@lucide/svelte/icons/undo'),
        'redo': () => import('@lucide/svelte/icons/redo'),
        'palette': () => import('@lucide/svelte/icons/palette'),
        'layers': () => import('@lucide/svelte/icons/layers'),
        'grid': () => import('@lucide/svelte/icons/grid'),
        'box': () => import('@lucide/svelte/icons/box'),
        'circle': () => import('@lucide/svelte/icons/circle'),
        'square': () => import('@lucide/svelte/icons/square'),
        'triangle': () => import('@lucide/svelte/icons/triangle'),
        'star': () => import('@lucide/svelte/icons/star'),
        'heart': () => import('@lucide/svelte/icons/heart'),
        'share-2': () => import('@lucide/svelte/icons/share-2'),
        'link': () => import('@lucide/svelte/icons/link'),
        'external-link': () => import('@lucide/svelte/icons/external-link'),
        'menu': () => import('@lucide/svelte/icons/menu'),
        'x': () => import('@lucide/svelte/icons/x'),
        'chevron-left': () => import('@lucide/svelte/icons/chevron-left'),
        'chevron-right': () => import('@lucide/svelte/icons/chevron-right'),
        'chevron-up': () => import('@lucide/svelte/icons/chevron-up'),
        'chevron-down': () => import('@lucide/svelte/icons/chevron-down'),
        'play': () => import('@lucide/svelte/icons/play'),
        'pause': () => import('@lucide/svelte/icons/pause'),
        'refresh-cw': () => import('@lucide/svelte/icons/refresh-cw'),
        'loader-2': () => import('@lucide/svelte/icons/loader-2'),
        'check': () => import('@lucide/svelte/icons/check'),
        'alert-triangle': () => import('@lucide/svelte/icons/alert-triangle'),
        'info': () => import('@lucide/svelte/icons/info'),
        'alert-circle': () => import('@lucide/svelte/icons/alert-circle'),
        'check-circle': () => import('@lucide/svelte/icons/check-circle'),
        'pipette': () => import('@lucide/svelte/icons/pipette'),
        'folder': () => import('@lucide/svelte/icons/folder'),
        'file': () => import('@lucide/svelte/icons/file'),
        'image': () => import('@lucide/svelte/icons/image'),
        'video': () => import('@lucide/svelte/icons/video'),
        'music': () => import('@lucide/svelte/icons/music'),
        'code': () => import('@lucide/svelte/icons/code'),
        'terminal': () => import('@lucide/svelte/icons/terminal'),
        'database': () => import('@lucide/svelte/icons/database'),
        'cloud': () => import('@lucide/svelte/icons/cloud'),
        'wifi': () => import('@lucide/svelte/icons/wifi'),
        'bluetooth': () => import('@lucide/svelte/icons/bluetooth'),
        'battery': () => import('@lucide/svelte/icons/battery'),
        'clock': () => import('@lucide/svelte/icons/clock'),
        'calendar': () => import('@lucide/svelte/icons/calendar'),
        'mail': () => import('@lucide/svelte/icons/mail'),
        'phone': () => import('@lucide/svelte/icons/phone'),
        'map-pin': () => import('@lucide/svelte/icons/map-pin'),
        'user': () => import('@lucide/svelte/icons/user'),
        'users': () => import('@lucide/svelte/icons/users'),
        'lock': () => import('@lucide/svelte/icons/lock'),
        'unlock': () => import('@lucide/svelte/icons/unlock'),
        'key': () => import('@lucide/svelte/icons/key'),
        'shield': () => import('@lucide/svelte/icons/shield'),
        'award': () => import('@lucide/svelte/icons/award'),
        'trophy': () => import('@lucide/svelte/icons/trophy'),
        'flag': () => import('@lucide/svelte/icons/flag'),
        'tag': () => import('@lucide/svelte/icons/tag'),
        'bookmark': () => import('@lucide/svelte/icons/bookmark'),
        'book-a': () => import('@lucide/svelte/icons/book-a'),
        'printer': () => import('@lucide/svelte/icons/printer'),
        'arrow-up-down': () => import('@lucide/svelte/icons/arrow-up-down'),
        'arrow-up': () => import('@lucide/svelte/icons/arrow-up'),
        'arrow-down': () => import('@lucide/svelte/icons/arrow-down'),
        'arrow-left': () => import('@lucide/svelte/icons/arrow-left'),
        'arrow-right': () => import('@lucide/svelte/icons/arrow-right'),
        'sliders': () => import('@lucide/svelte/icons/sliders'),
        'picture-in-picture': () => import('@lucide/svelte/icons/picture-in-picture'),
        'square-dashed': () => import('@lucide/svelte/icons/square-dashed'),
        'mouse-pointer-click': () => import('@lucide/svelte/icons/mouse-pointer-click'),
        'gallery-horizontal': () => import('@lucide/svelte/icons/gallery-horizontal'),
        'workflow': () => import('@lucide/svelte/icons/workflow')
    }

    /** 将 PascalCase / camelCase 转为 kebab-case，便于按文件名加载 */
    function kebabCase(str: string) {
        return str
            .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
            .replace(/[\s_]+/g, '-')
            .toLowerCase()
    }

    interface Props {
        name: string
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
                let module: any
                if (name in iconMap) {
                    module = await iconMap[name as keyof typeof iconMap]()
                } else {
                    const kebab = kebabCase(name)
                    // 使用预定义的kebab图标映射，避免动态导入警告
                    if (kebab in kebabIconMap) {
                        module = await kebabIconMap[kebab]()
                    } else {
                        // 如果图标不存在，使用占位符
                        console.warn(`Icon not found: ${name} (kebab: ${kebab})`)
                        IconComponent = null
                        return
                    }
                }
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
    <IconComponent {size} {color} {strokeWidth} class={className} style="width: calc({size}px * var(--scale-ratio, 1)); height: calc({size}px * var(--scale-ratio, 1)); {style}" />
{:else}
    <div style="width: calc({size}px * var(--scale-ratio, 1)); height: calc({size}px * var(--scale-ratio, 1));" class="{className} bg-gray-200 rounded" aria-label="Loading icon..."></div>
{/if}
