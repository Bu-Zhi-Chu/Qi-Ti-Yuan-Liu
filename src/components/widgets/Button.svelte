<!--
 * 通用按钮组件
 *
 * 功能描述：
 * 提供统一风格的按钮组件，支持多种变体和交互状态
 *
 * 特性：
 * - 支持 primary、secondary、ghost 等多种变体
 * - 响应式设计，适配不同屏幕尺寸
 * - 支持加载状态、禁用状态
 * - 支持点击波纹效果
 * - 完全使用 ResponsiveBox 构建，无原生 HTML 元素
 *
 * 使用示例：
 * <Button onclick={handleClick} variant="primary" size="medium">点击我</Button>
-->

<script lang="ts">
    import ResponsiveBox from '../Core/ResponsiveBox.svelte'

    interface Props {
        children?: any
        onclick?: (event: MouseEvent) => void
        variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
        size?: 'small' | 'medium' | 'large'
        disabled?: boolean
        loading?: boolean
        style?: string
        class?: string
        type?: 'button' | 'submit' | 'reset'
    }

    let { children, onclick, variant = 'primary', size = 'medium', disabled = false, loading = false, style = '', class: className = '', type = 'button' }: Props = $props()

    // 根据变体获取样式
    function getVariantStyles() {
        const styles = {
            primary: 'background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; border: none; box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);',
            secondary: 'background: rgba(255, 255, 255, 0.1); color: #ffffff; border: 1px solid rgba(255, 255, 255, 0.2); backdrop-filter: blur(10px);',
            ghost: 'background: transparent; color: #ffffff; border: 1px solid rgba(255, 255, 255, 0.3);',
            danger: 'background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: #ffffff; border: none; box-shadow: 0 4px 16px rgba(239, 68, 68, 0.3);'
        }
        return styles[variant]
    }

    // 根据尺寸获取样式
    function getSizeStyles() {
        const styles = {
            small: 'padding: 8px 16px; font-size: 14px; border-radius: 6px; min-width: 80px; height: 32px;',
            medium: 'padding: 12px 24px; font-size: 16px; border-radius: 8px; min-width: 100px; height: 40px;',
            large: 'padding: 16px 32px; font-size: 18px; border-radius: 10px; min-width: 120px; height: 48px;'
        }
        return styles[size]
    }

    // 处理点击事件
    function handleClick(event: MouseEvent) {
        if (!disabled && !loading && onclick) {
            onclick(event)
        }
    }

    // 鼠标悬停效果
    let isHovered = $state(false)

    function handleMouseEnter() {
        if (!disabled && !loading) {
            isHovered = true
        }
    }

    function handleMouseLeave() {
        isHovered = false
    }

    // 计算最终样式
    let finalStyle = $derived.by(() => {
        let baseStyle = `display: inline-block; ${getVariantStyles()} ${getSizeStyles()} ${style}`

        if (disabled) {
            baseStyle += ' opacity: 0.5; cursor: not-allowed; transform: scale(1);'
        } else if (loading) {
            baseStyle += ' opacity: 0.7; cursor: wait;'
        } else if (isHovered) {
            baseStyle += ' transform: translateY(-2px) scale(1.05); box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);'
        } else {
            baseStyle += ' transform: translateY(0) scale(1); transition: all 0.3s ease;'
        }

        return baseStyle
    })
</script>

<ResponsiveBox tag="button" {type} style={finalStyle} class={className} onclick={handleClick} onmouseenter={handleMouseEnter} onmouseleave={handleMouseLeave} disabled={disabled || loading}>
    {@render children?.()}
</ResponsiveBox>
