<!--
 * ActionButton 组件 - 通用动作按钮组件（完全替代原Button和ButtonGroup）
 *
 * 功能特性：
 * 1. 支持单个按钮和按钮组两种使用模式
 * 2. 基于ResponsiveBox的最外层容器，支持响应式缩放
 * 3. 内部使用SimpleBox作为按钮，轻量高效
 * 4. 支持横向(row)和竖向(column)两种布局模式（多按钮时）
 * 5. 通过JSON数组动态配置按钮：支持变体、尺寸、状态等完整特性
 * 6. 支持完整的样式系统：primary/secondary/ghost/danger四种变体
 * 7. 支持small/medium/large三种尺寸
 * 8. 支持加载状态、禁用状态、悬停动画
 * 9. 支持data-id属性传递，用于低代码平台定位
 *
 * 使用方法：
 * 单个按钮：
 * <ActionButton
 *   buttons={[{ name: '提交', variant: 'primary', size: 'large' }]}
 *   style="width: 120px; height: 40px;"
 *   data-id="submit-button"
 *   onbuttonClick={(event) => console.log('按钮被点击', event)}
 * />
 *
 * 按钮组：
 * <ActionButton
 *   style="width: 300px; height: 50px;"
 *   buttons={[
 *     { name: '确认', variant: 'primary', size: 'medium' },
 *     { name: '取消', variant: 'secondary', size: 'medium', disabled: true },
 *     { name: '删除', variant: 'danger', size: 'small' },
 *     { name: '加载中', variant: 'primary', loading: true }
 *   ]}
 *   direction="row"
 *   data-id="action-group-1"
 *   onbuttonClick={(event) => console.log('按钮组点击', event)}
 * />
 *
 * 按钮配置格式：
 * interface ButtonConfig {
 *   name: string      // 按钮显示文本
 *   style?: string    // 按钮自定义样式（优先级高于variant）
 *   disabled?: boolean // 是否禁用（默认false）
 *   variant?: 'primary' | 'secondary' | 'ghost' | 'danger' // 按钮变体（默认primary）
 *   size?: 'small' | 'medium' | 'large' // 按钮尺寸（默认medium）
 *   loading?: boolean // 是否加载中（默认false）
 * }
-->

<script lang="ts">
    import ResponsiveBox from '../Core/ResponsiveBox.svelte'
    import SimpleBox from '../Core/SimpleBox.svelte'

    interface ButtonConfig {
        name: string
        style?: string
        disabled?: boolean
        variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
        size?: 'small' | 'medium' | 'large'
        loading?: boolean
    }

    interface Props {
        style?: string
        buttons: ButtonConfig[]
        direction?: 'row' | 'column'
        dataId?: string
        onbuttonClick?: (event: { name: string; index: number; button: ButtonConfig }) => void
        [key: string]: any
    }

    let { style = '', buttons = [], direction = 'row', dataId = '', onbuttonClick, ...rest }: Props = $props()

    // 计算按钮容器的样式
    const containerStyle = $derived(direction === 'row' ? `display: flex; flex-direction: row; align-items: center; justify-content: center; gap: 8px; ${style}` : `display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; ${style}`)

    // 计算单个按钮的样式
    const getButtonStyle = (button: ButtonConfig, index: number) => {
        // 根据变体获取样式
        const getVariantStyles = () => {
            const styles = {
                primary: 'background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; border: none; box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);',
                secondary: 'background: rgba(255, 255, 255, 0.1); color: #ffffff; border: 1px solid rgba(255, 255, 255, 0.2); backdrop-filter: blur(10px);',
                ghost: 'background: transparent; color: #ffffff; border: 1px solid rgba(255, 255, 255, 0.3);',
                danger: 'background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: #ffffff; border: none; box-shadow: 0 4px 16px rgba(239, 68, 68, 0.3);'
            }
            return styles[button.variant || 'primary']
        }

        // 根据尺寸获取样式
        const getSizeStyles = () => {
            const styles = {
                small: 'padding: 8px 16px; font-size: 14px; border-radius: 6px;',
                medium: 'padding: 12px 24px; font-size: 16px; border-radius: 8px;',
                large: 'padding: 16px 32px; font-size: 18px; border-radius: 10px;'
            }
            return styles[button.size || 'medium']
        }

        // 方向相关的样式
        const directionStyle = direction === 'row' ? 'flex: 1; min-height: 32px;' : 'width: 100%; min-height: 36px;'

        const baseStyle = `${directionStyle} border: none; cursor: pointer; transition: all 0.3s ease; display: inline-flex; align-items: center; justify-content: center; text-align: center;`

        // 状态样式
        let stateStyle = ''
        if (button.disabled) {
            stateStyle = ' opacity: 0.5; cursor: not-allowed; transform: scale(1);'
        } else if (button.loading) {
            stateStyle = ' opacity: 0.7; cursor: wait;'
        } else {
            stateStyle = ' cursor: pointer; transform: translateY(0) scale(1);'
        }

        return `${baseStyle} ${getVariantStyles()} ${getSizeStyles()} ${button.style || ''} ${stateStyle}`
    }

    // 按钮点击处理
    function handleButtonClick(button: ButtonConfig, index: number) {
        if (button.disabled) return

        console.log(`Button clicked: ${button.name} (index: ${index})`)

        const eventData = { name: button.name, index, button }

        // 优先使用直接的事件回调
        if (onbuttonClick) {
            onbuttonClick(eventData)
        } else {
            // 回退到全局事件派发
            const event = new CustomEvent('buttonClick', {
                detail: eventData
            })
            document.dispatchEvent(event)
        }
    }
</script>

<ResponsiveBox style={containerStyle} data-id={dataId} {...rest}>
    {#each buttons as button, index}
        {@const isInteractive = !button.disabled && !button.loading}
        <ResponsiveBox
            class={isInteractive ? 'action-button-interactive' : ''}
            style={getButtonStyle(button, index)}
            data-id={dataId ? `${dataId}-button-${index}` : `button-${index}`}
            onclick={() => handleButtonClick(button, index)}
            tabindex={button.disabled ? -1 : 0}
            aria-disabled={button.disabled}
            aria-busy={button.loading}
        >
            {button.name}
            {#if button.loading}
                <span style="margin-left: 8px; display: inline-block; width: 12px; height: 12px; border: 2px solid rgba(255,255,255,0.3); border-top: 2px solid #fff; border-radius: 50%; animation: spin 1s linear infinite;"></span>
            {/if}
        </ResponsiveBox>
    {/each}
</ResponsiveBox>

<style>
    @keyframes spin {
        0% {
            transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
        }
    }

    :global(.action-button-interactive:hover) {
        transform: translateY(-2px) scale(1.05) !important;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2) !important;
    }
</style>
