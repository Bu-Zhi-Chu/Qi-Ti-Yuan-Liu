<!--
 * 自定义文本框组件 - 完全自定义实现，不使用原生input
 * 基于ResponsiveBox实现自适应布局，支持文本输入、占位符、验证等功能
 *
 * 使用示例：
 * <CustomTextInput
 *   placeholder="请输入用户名"
 *   value={username}
 *   oninput={(e) => username = e.detail}
 *   style="width: 200px; border: 1px solid #ddd;"
 * />
 *
 * 特性：
 * 1. 完全自定义渲染，不使用原生input
 * 2. 支持placeholder占位符
 * 3. 支持键盘输入、粘贴、删除
 * 4. 支持焦点状态和边框高亮
 * 5. 支持最大长度限制
 * 6. 支持自定义验证规则
 * 7. 自适应缩放，支持响应式布局
-->

<script lang="ts">
    import ResponsiveBox from '../Core/ResponsiveBox.svelte'

    interface Props {
        style?: string
        value?: string
        placeholder?: string
        maxlength?: number
        disabled?: boolean
        readonly?: boolean
        type?: 'text' | 'password' | 'email' | 'number'
        pattern?: string
        required?: boolean
        oninput?: (event: CustomEvent<string>) => void
        onfocus?: (event: CustomEvent<void>) => void
        onblur?: (event: CustomEvent<void>) => void
        onkeydown?: (event: CustomEvent<KeyboardEvent>) => void
    }

    let { style = '', value = '', placeholder = '', maxlength, disabled = false, readonly = false, type = 'text', pattern, required = false, oninput, onfocus, onblur, onkeydown }: Props = $props()

    // 状态管理
    let isFocused = $state(false)
    let isHovered = $state(false)
    let inputRef: any = $state()
    let selectionStart = $state(0)
    let selectionEnd = $state(0)

    // 验证状态
    let isValid = $state(true)
    let errorMessage = $state('')

    // 处理输入事件
    function handleInput(event: Event) {
        if (disabled || readonly) return

        const target = event.target as HTMLElement
        const newValue = target.textContent || ''

        // 最大长度检查
        if (maxlength && newValue.length > maxlength) {
            value = newValue.slice(0, maxlength)
            updateInputValue(value)
            return
        }

        // 模式验证
        if (pattern && newValue) {
            const regex = new RegExp(pattern)
            isValid = regex.test(newValue)
            errorMessage = isValid ? '' : '格式不正确'
        } else {
            isValid = true
            errorMessage = ''
        }

        value = newValue
        oninput?.(new CustomEvent('input', { detail: value }))
    }

    // 处理键盘事件
    function handleKeyDown(event: KeyboardEvent) {
        if (disabled || readonly) return

        onkeydown?.(new CustomEvent('keydown', { detail: event }))

        // 处理特殊按键
        switch (event.key) {
            case 'Enter':
                event.preventDefault()
                inputRef.blur()
                break
            case 'Escape':
                event.preventDefault()
                inputRef.blur()
                break
            case 'Tab':
                // 让浏览器处理Tab键
                break
        }
    }

    // 处理粘贴事件
    function handlePaste(event: ClipboardEvent) {
        if (disabled || readonly) return

        event.preventDefault()
        const pastedText = event.clipboardData?.getData('text') || ''

        // 清理粘贴内容
        const cleanText = pastedText.replace(/\r\n|\r|\n/g, '')

        // 最大长度检查
        const newValue = value.slice(0, selectionStart) + cleanText + value.slice(selectionEnd)
        if (maxlength && newValue.length > maxlength) {
            value = newValue.slice(0, maxlength)
        } else {
            value = newValue
        }

        updateInputValue(value)
        oninput?.(new CustomEvent('input', { detail: value }))
    }

    // 更新输入框值
    function updateInputValue(newValue: string) {
        if (inputRef) {
            const element = inputRef as HTMLElement
            element.textContent = newValue
            // 设置光标位置到末尾
            const range = document.createRange()
            const selection = window.getSelection()
            range.selectNodeContents(element)
            range.collapse(false)
            selection?.removeAllRanges()
            selection?.addRange(range)
        }
    }

    // 处理焦点事件
    function handleFocus() {
        if (disabled) return
        isFocused = true
        onfocus?.(new CustomEvent('focus'))
    }

    function handleBlur() {
        isFocused = false
        onblur?.(new CustomEvent('blur'))
    }

    // 获取边框样式
    function getBorderStyle() {
        if (disabled) return '1px solid #e0e0e0'
        if (!isValid) return '1px solid #ff4444'
        if (isFocused) return '1px solid #007bff'
        if (isHovered) return '1px solid #999'
        return '1px solid #ddd'
    }

    // 获取背景色
    function getBackgroundColor() {
        if (disabled) return '#f5f5f5'
        return '#ffffff'
    }

    // 获取文字颜色
    function getTextColor() {
        if (disabled) return '#999'
        return '#333'
    }

    // 监听value变化，同步到输入框
    $effect(() => {
        if (inputRef && inputRef.textContent !== value) {
            updateInputValue(value)
        }
    })

    // 密码类型处理
    function getDisplayText(): string {
        if (type === 'password') {
            return '•'.repeat(value.length)
        }
        return value
    }

    // 计算动态样式
    const computedStyle = $derived.by(() => {
        const baseStyle = `
            border: ${getBorderStyle()};
            background-color: ${getBackgroundColor()};
            color: ${getTextColor()};
            padding: 8px 12px;
            font-size: 14px;
            line-height: 1.4;
            outline: none;
            min-height: 20px;
            transition: all 0.2s ease;
            white-space: pre-wrap;
            word-break: break-word;
            user-select: text;
            -webkit-user-select: text;
            -moz-user-select: text;
            -ms-user-select: text;
            cursor: ${disabled ? 'not-allowed' : 'text'};
        `

        return `${baseStyle} ${style}`
    })

    // 占位符样式
    const placeholderStyle = `
        color: #999;
        position: absolute;
        top: 8px;
        left: 12px;
        pointer-events: none;
        font-size: 14px;
        line-height: 1.4;
        transition: opacity 0.2s ease;
    `
</script>

<ResponsiveBox style="position: relative; {style}">
    <ResponsiveBox
        bind:this={inputRef}
        contenteditable={!disabled && !readonly}
        style={computedStyle}
        role="textbox"
        aria-multiline="false"
        aria-disabled={disabled}
        aria-readonly={readonly}
        aria-required={required}
        aria-invalid={!isValid}
        aria-placeholder={placeholder}
        oninput={handleInput}
        onkeydown={handleKeyDown}
        onpaste={handlePaste}
        onfocus={handleFocus}
        onblur={handleBlur}
        onmouseenter={() => !disabled && (isHovered = true)}
        onmouseleave={() => (isHovered = false)}
    >
        {getDisplayText()}
    </ResponsiveBox>

    {#if placeholder && !value}
        <div style={placeholderStyle}>
            {placeholder}
        </div>
    {/if}

    {#if errorMessage}
        <div style="color: #ff4444; font-size: 12px; margin-top: 4px;">
            {errorMessage}
        </div>
    {/if}
</ResponsiveBox>

<style>
    /* 隐藏原生编辑器的样式 */
    :global([contenteditable]) {
        -webkit-appearance: none;
        -moz-appearance: none;
        appearance: none;
    }

    /* 占位符动画 */
    :global([style*='position: absolute']) {
        opacity: 1;
    }

    :global([contenteditable]:not(:empty) + [style*='position: absolute']) {
        opacity: 0;
    }

    /* 选择样式 */
    :global([contenteditable]::selection) {
        background-color: #007bff;
        color: white;
    }

    :global([contenteditable]::-moz-selection) {
        background-color: #007bff;
        color: white;
    }
</style>
