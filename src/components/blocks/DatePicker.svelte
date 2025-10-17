<!--
 * DatePicker.svelte
 * 日期选择器组件，完全自绘下拉面板，支持自适应缩放
 *
 * 功能特性：
 * - 原生 <input type="date"> 的替代，完全可控样式
 * - 响应式尺寸，所有 px 均使用 calc(px * var(--scale-ratio, 1))
 * - 支持 bind:value 双向绑定
 * - 中文显示（年月日）
 * - 提供 getValue()、setValue() 方法
 * - 支持年份和月份切换
 * - 支持 change 事件和 onChange 回调
 *
 * 使用方法：
 * <DatePicker
 *   bind:value={date}
 *   placeholder="请选择日期"
 *   onChange={(date) => console.log('日期改变:', date)}
 * />
 *
 * 属性说明：
 * - value: Date 类型，可绑定
 * - disabled: 是否禁用
 * - min: 最小日期 Date
 * - max: 最大日期 Date
 * - onChange: 日期改变回调函数
 *
 * 方法说明：
 * - getValue(): Date - 获取当前日期值
 * - setValue(date: Date | string): void - 设置日期值
 *
 * 事件说明：
 * - change: 日期改变时触发，参数为新的日期值
 */-->

<script lang="ts">
    import { onMount, createEventDispatcher, tick } from 'svelte'
    import ResponsiveBox from '../core/ResponsiveBox.svelte'
    import { updateNodeProps } from '../../services/parser/property-panel.service'

    interface Props {
        value?: Date | string
        disabled?: boolean
        min?: Date
        max?: Date
        id?: string
        style?: string
        dateRecording?: boolean
        recordedDate?: string | Date
        /** 是否显示按钮上的日历图标（默认显示） */
        showIcon?: boolean
        /**
         * 选择模式
         * - "date": 年月日（默认）
         * - "year": 仅选择年份
         * - "month": 仅选择年份+月份
         * - "datetime": 年月日时分秒
         */
        mode?: 'date' | 'year' | 'month' | 'datetime'
        onChange?: (date: Date) => void
        [key: string]: any
    }

    let {
        value = $bindable(new Date()),
        disabled = false,
        min,
        max,
        id,
        style = '',
        dateRecording = false,
        recordedDate,
        showIcon = true,
        mode = 'date',
        onChange,
        panelBgColor = '#1a202c',
        panelBorderColor = 'rgba(255, 255, 255, 0.1)',
        panelShadowColor = 'rgba(0, 0, 0, 0.5)',
        textColor = '#e2e8f0',
        controlColor = '#94a3b8',
        controlBgColor = 'rgba(45, 55, 72, 0.5)',
        controlHoverBgColor = 'rgba(255, 255, 255, 0.1)',
        accentColor = '#38bdf8',
        ...rest
    }: Props = $props()

    const dispatch = createEventDispatcher<{ change: Date }>()

    let isOpen = $state(false)
    let pickerRef = $state<HTMLDivElement>()
    let buttonRef = $state<HTMLButtonElement>()
    // 面板定位样式（挂载到 body 后使用 fixed 定位）
    let panelStyle = $state('')

    // 简易 portal action：将节点挂载到指定目标（此处为 document.body）
    function portal(node: HTMLElement, target: HTMLElement | null) {
        if (!target) return {}
        target.appendChild(node)
        let current = target
        return {
            update(newTarget: HTMLElement | null) {
                if (!newTarget || newTarget === current) return
                if (node.parentNode === current) current.removeChild(node)
                newTarget.appendChild(node)
                current = newTarget
            },
            destroy() {
                if (node.parentNode === current) current.removeChild(node)
            }
        }
    }

    // 内部日期状态
    function normalizeDate(v: Date | string): Date {
        return typeof v === 'string' ? new Date(v) : new Date(v)
    }

    const initialDate: Date = dateRecording && recordedDate ? normalizeDate(recordedDate) : normalizeDate(value)
    let internalDate = $state(initialDate)
    // 如果使用记录值，确保外部 value 同步
    if (dateRecording && recordedDate) {
        value = new Date(initialDate)
    }

    // 同步外部 value 变化到内部
    $effect(() => {
        const newVal = normalizeDate(value)
        if (newVal.getTime() !== internalDate.getTime()) {
            internalDate = new Date(newVal)
            // 如果是 datetime 模式，同步时分秒状态
            if (mode === 'datetime') {
                hours = internalDate.getHours()
                minutes = internalDate.getMinutes()
                seconds = internalDate.getSeconds()
            }
        }
    })

    // 获取当前日期值
    export function getValue(): Date {
        return new Date(internalDate)
    }

    // 设置日期值
    export function setValue(newDate: Date | string): void {
        const date = typeof newDate === 'string' ? new Date(newDate) : newDate
        if (isValidDate(date)) {
            internalDate = date
            // 如果是 datetime 模式，同步时分秒状态
            if (mode === 'datetime') {
                hours = internalDate.getHours()
                minutes = internalDate.getMinutes()
                seconds = internalDate.getSeconds()
            }
            updateValue(date)
        }
    }

    // 验证日期是否有效
    function isValidDate(date: Date): boolean {
        return date instanceof Date && !isNaN(date.getTime())
    }

    // 同步内部日期变化到外部
    function updateValue(newDate: Date) {
        // 如果是 datetime 模式，应用当前时分秒
        if (mode === 'datetime') {
            newDate.setHours(hours, minutes, seconds)
        }
        value = new Date(newDate) // 这会自动触发 bind:value 更新
        dispatch('change', new Date(newDate))
        if (onChange) {
            onChange(new Date(newDate))
        }
        // Persist to doms attr if dateRecording enabled
        if (dateRecording && id) {
            updateNodeProps(id, { attributes: { recordedDate: toInputValue(newDate) } })
        }
    }

    // 格式化显示文本
    let displayText = $derived(formatDisplay(internalDate))

    // 生成年月数据
    let year = $derived(internalDate.getFullYear())
    let month = $derived(internalDate.getMonth())
    let date = $derived(internalDate.getDate())

    // 面板数据
    let daysInMonth = $derived(new Date(year, month + 1, 0).getDate())
    let firstDay = $derived(new Date(year, month, 1).getDay())
    let today = $derived(new Date())

    // 选择年/月模式
    // 选择年/月模式：当 mode 为 year 或 month 时默认进入年/月选择界面
    let selectingYearMonth = $state(mode !== 'date')

    // 时分秒状态（仅 datetime 模式使用）
    let hours = $state(0)
    let minutes = $state(0)
    let seconds = $state(0)

    // 同步时间状态与 internalDate
    $effect(() => {
        if (mode === 'datetime') {
            hours = internalDate.getHours()
            minutes = internalDate.getMinutes()
            seconds = internalDate.getSeconds()
        }
    })
    let yearListRef = $state<HTMLDivElement>()
    let monthListRef = $state<HTMLDivElement>()

    // 以当前年份为中心，上下各 10 年
    let yearsRange = $derived(Array.from({ length: 21 }, (_, i) => year - 10 + i))

    // 月份名称
    const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']

    // 星期名称
    const weekdayNames = ['日', '一', '二', '三', '四', '五', '六']

    /**
     * 根据当前 mode 输出显示文本
     */
    function formatDisplay(date: Date): string {
        switch (mode) {
            case 'year':
                // 年模式不显示“年”字，仅显示数字年份
                return `${date.getFullYear()}`
            case 'month':
                // 月模式不显示“月”字，仅显示两位数字月份
                return `${String(date.getMonth() + 1).padStart(2, '0')}`
            case 'datetime':
                // 改为 ISO 风格日期 + 时间，例如 2025-01-09 12:34:56
                return `${toInputValue(date)} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`
            default:
                // 改为 yyyy-mm-dd（不再使用中文格式）
                return toInputValue(date)
        }
    }

    // 保留中文格式函数（仍用于面板头部显示），按钮显示已切换为 ISO 风格
    function formatDateChinese(date: Date): string {
        const y = date.getFullYear()
        const m = String(date.getMonth() + 1).padStart(2, '0')
        const d = String(date.getDate()).padStart(2, '0')
        return `${y}年${m}月${d}日`
    }

    function toInputValue(date: Date): string {
        const y = date.getFullYear()
        const m = String(date.getMonth() + 1).padStart(2, '0')
        const d = String(date.getDate()).padStart(2, '0')
        return `${y}-${m}-${d}`
    }

    function fromInputValue(str: string): Date | null {
        const [y, m, d] = str.split('-').map(Number)
        if (y && m && d) {
            return new Date(y, m - 1, d)
        }
        return null
    }

    function isSameDay(d1: Date, d2: Date): boolean {
        return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate()
    }

    function isToday(d: Date): boolean {
        return isSameDay(d, today)
    }

    function isSelected(d: Date): boolean {
        return isSameDay(d, internalDate)
    }

    function isDisabled(d: Date): boolean {
        if (min && d < min) return true
        if (max && d > max) return true
        return false
    }

    function selectDate(day: number) {
        const newDate = new Date(year, month, day)
        if (isDisabled(newDate)) return
        internalDate = newDate
        updateValue(newDate)
        isOpen = false
    }

    function prevMonth() {
        const newDate = new Date(year, month - 1, Math.min(date, new Date(year, month, 0).getDate()))
        internalDate = newDate
        updateValue(newDate)
    }

    function nextMonth() {
        const newDate = new Date(year, month + 1, Math.min(date, new Date(year, month + 2, 0).getDate()))
        internalDate = newDate
        updateValue(newDate)
    }

    function prevYear() {
        const newDate = new Date(year - 1, month, Math.min(date, new Date(year - 1, month + 1, 0).getDate()))
        internalDate = newDate
        updateValue(newDate)
    }

    function nextYear() {
        const newDate = new Date(year + 1, month, Math.min(date, new Date(year + 1, month + 1, 0).getDate()))
        internalDate = newDate
        updateValue(newDate)
    }

    function togglePanel() {
        if (disabled) return
        isOpen = !isOpen
        if (isOpen) {
            // 当模式为 date 或 datetime 时，始终默认显示日期选择界面
            // 当模式为 year 或 month 时，显示对应的年/月选择界面
            selectingYearMonth = mode === 'year' || mode === 'month'
            // 面板初始定位：挂载后再测量尺寸并计算位置
            tick().then(() => updatePanelPosition())
        }
    }

    async function openYearMonthSelect() {
        selectingYearMonth = true
        await tick()
        if (yearListRef) {
            yearListRef.querySelector('.year-item.selected')?.scrollIntoView({ block: 'center' })
        }
        if (monthListRef) {
            monthListRef.querySelector('.month-item.selected')?.scrollIntoView({ block: 'center' })
        }
    }

    // 点击外部关闭
    onMount(() => {
        function handleClickOutside(event: MouseEvent) {
            if (isOpen && pickerRef && !pickerRef.contains(event.target as Node) && !buttonRef?.contains(event.target as Node)) {
                // 应用当前选择的结果
                updateValue(internalDate)
                isOpen = false
                // Reset to day view so next open shows calendar
                selectingYearMonth = false
            }
        }
        document.addEventListener('mousedown', handleClickOutside)

        // 当窗口滚动或尺寸变化时，重新定位面板（仅打开时生效）
        const recalc = () => {
            if (isOpen) updatePanelPosition()
        }
        const options: AddEventListenerOptions = { passive: true, capture: true }
        window.addEventListener('scroll', recalc, options)
        window.addEventListener('resize', recalc)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            window.removeEventListener('scroll', recalc, options)
            window.removeEventListener('resize', recalc)
        }
    })

    // 当面板打开时，确保当前选中的年份/月份在可视区域内
    $effect(() => {
        if (isOpen) {
            // 等待 DOM 更新
            tick().then(() => {
                // 年份模式：滚动到当前年份
                if (mode === 'year' && yearListRef) {
                    yearListRef.querySelector('.year-item.selected')?.scrollIntoView({ block: 'center' })
                }
                // 月份模式：滚动到当前月份
                if (mode === 'month' && monthListRef) {
                    monthListRef.querySelector('.month-item.selected')?.scrollIntoView({ block: 'center' })
                }
                // 再次确保定位正确（面板内容可能改变尺寸）
                updatePanelPosition()
            })
        }
    })

    // 计算并设置面板的 fixed 定位样式，使其不受父级 overflow 限制
    function updatePanelPosition() {
        if (!buttonRef || !pickerRef) return
        const rect = buttonRef.getBoundingClientRect()
        // 先设置一个最小样式以获得面板实际尺寸
        panelStyle = 'position:fixed;left:-9999px;top:-9999px;z-index:10000'
        // 下一帧读取尺寸
        tick().then(() => {
            const panelEl = pickerRef
            if (!panelEl) return
            const pw = panelEl.offsetWidth
            const ph = panelEl.offsetHeight
            const margin = 8
            let left = rect.left
            let top = rect.bottom
            // 视口边界处理：水平
            if (left + pw + margin > window.innerWidth) {
                left = Math.max(margin, window.innerWidth - pw - margin)
            }
            if (left < margin) left = margin
            // 视口边界处理：垂直（下边缘放不下时，改为显示在按钮上方）
            if (top + ph + margin > window.innerHeight) {
                top = Math.max(margin, rect.top - ph)
            }
            if (top < margin) top = margin
            panelStyle = `position:fixed;left:${Math.round(left)}px;top:${Math.round(top)}px;z-index:10000`
        })
    }
</script>

<ResponsiveBox
    {id}
    class="date-picker"
    style="{style}; --panel-bg: {panelBgColor}; --panel-border: {panelBorderColor}; --panel-shadow: {panelShadowColor}; --text-color: {textColor}; --control-color: {controlColor}; --control-bg: {controlBgColor}; --control-hover-bg: {controlHoverBgColor}; --accent-color: {accentColor};"
    {...rest}
>
    <button bind:this={buttonRef} class="date-picker-button" class:disabled onclick={togglePanel} type="button">
        <span class="date-text">{displayText}</span>
        {#if showIcon}
            <span class="date-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
            </span>
        {/if}
    </button>

    {#if isOpen}
        <div bind:this={pickerRef} use:portal={document.body} class="date-picker-panel portal" style={panelStyle}>
            {#if mode === 'year'}
                <div class="panel-header">
                    <span class="mode-title">选择年份</span>
                </div>
            {:else if mode === 'month'}
                <div class="panel-header">
                    <span class="mode-title">选择月份</span>
                </div>
            {:else}
                <div class="panel-header">
                    <button class="nav-button" onclick={prevYear} type="button">«</button>
                    <button class="nav-button" onclick={prevMonth} type="button">‹</button>
                    <span
                        class="month-year"
                        role="button"
                        tabindex="0"
                        onclick={openYearMonthSelect}
                        onkeydown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                openYearMonthSelect()
                            }
                        }}
                        style="cursor: pointer;"
                    >
                        {year}年 {String(month + 1).padStart(2, '0')}月
                    </span>
                    <button class="nav-button" onclick={nextMonth} type="button">›</button>
                    <button class="nav-button" onclick={nextYear} type="button">»</button>
                </div>
            {/if}

            {#if mode === 'year'}
                <!-- 年份选择模式 -->
                <div class="year-list" bind:this={yearListRef}>
                    {#each yearsRange as y}
                        <button
                            class="year-item"
                            class:selected={y === year}
                            onclick={() => {
                                internalDate = new Date(y, month, date)
                                isOpen = false
                                updateValue(internalDate)
                            }}
                            type="button"
                        >
                            {y}
                        </button>
                    {/each}
                </div>
            {:else if mode === 'month'}
                <!-- 月份选择模式 -->
                <div class="month-list" bind:this={monthListRef}>
                    {#each Array(12) as _, idx}
                        <button
                            class="month-item"
                            class:selected={idx === month}
                            onclick={() => {
                                // 只改变月份，不改变年份
                                internalDate = new Date(year, idx, Math.min(date, new Date(year, idx + 1, 0).getDate()))
                                isOpen = false
                                updateValue(internalDate)
                            }}
                            type="button"
                        >
                            {String(idx + 1).padStart(2, '0')}月
                        </button>
                    {/each}
                </div>
            {:else if selectingYearMonth}
                <!-- 年月选择模式（用于 date 和 datetime 模式） -->
                <div class="year-month-select">
                    <div class="year-list" bind:this={yearListRef}>
                        {#each yearsRange as y}
                            <button
                                class="year-item"
                                class:selected={y === year}
                                onclick={() => {
                                    internalDate = new Date(y, month, date)
                                    selectingYearMonth = false
                                    updateValue(internalDate)
                                }}
                                type="button"
                            >
                                {y}
                            </button>
                        {/each}
                    </div>
                    <div class="month-list" bind:this={monthListRef}>
                        {#each Array(12) as _, idx}
                            <button
                                class="month-item"
                                class:selected={idx === month}
                                onclick={() => {
                                    internalDate = new Date(year, idx, date)
                                    selectingYearMonth = false
                                    updateValue(internalDate)
                                }}
                                type="button"
                            >
                                {String(idx + 1).padStart(2, '0')}月
                            </button>
                        {/each}
                    </div>
                </div>
            {:else}
                <!-- 日期选择模式（用于 date 和 datetime 模式） -->
                <div class="weekdays">
                    {#each weekdayNames as day}
                        <div class="weekday">{day}</div>
                    {/each}
                </div>

                <div class="days">
                    {#each Array(firstDay) as _}
                        <div class="day-spacer"></div>
                    {/each}
                    {#each Array(daysInMonth) as _, i}
                        {@const day = i + 1}
                        {@const dayDate = new Date(year, month, day)}
                        <button class="day" class:today={isToday(dayDate)} class:selected={isSelected(dayDate)} class:disabled={isDisabled(dayDate)} onclick={() => selectDate(day)} type="button">
                            {day}
                        </button>
                    {/each}
                </div>
            {/if}

            <!-- 时分秒输入（仅 datetime 模式） -->
            {#if mode === 'datetime'}
                <div class="time-inputs">
                    <div class="time-group">
                        <label for="hours-{id}" class="time-label">时</label>
                        <input
                            id="hours-{id}"
                            type="number"
                            class="time-input"
                            min="0"
                            max="23"
                            bind:value={hours}
                            oninput={(e) => {
                                const target = e.target as HTMLInputElement
                                const val = parseInt(target.value)
                                if (!isNaN(val) && val >= 0 && val <= 23) {
                                    hours = val
                                    updateValue(internalDate)
                                }
                            }}
                        />
                    </div>
                    <div class="time-separator">:</div>
                    <div class="time-group">
                        <label for="minutes-{id}" class="time-label">分</label>
                        <input
                            id="minutes-{id}"
                            type="number"
                            class="time-input"
                            min="0"
                            max="59"
                            bind:value={minutes}
                            oninput={(e) => {
                                const target = e.target as HTMLInputElement
                                const val = parseInt(target.value)
                                if (!isNaN(val) && val >= 0 && val <= 59) {
                                    minutes = val
                                    updateValue(internalDate)
                                }
                            }}
                        />
                    </div>
                    <div class="time-separator">:</div>
                    <div class="time-group">
                        <label for="seconds-{id}" class="time-label">秒</label>
                        <input
                            id="seconds-{id}"
                            type="number"
                            class="time-input"
                            min="0"
                            max="59"
                            bind:value={seconds}
                            oninput={(e) => {
                                const target = e.target as HTMLInputElement
                                const val = parseInt(target.value)
                                if (!isNaN(val) && val >= 0 && val <= 59) {
                                    seconds = val
                                    updateValue(internalDate)
                                }
                            }}
                        />
                    </div>
                </div>
            {/if}
        </div>
    {/if}
</ResponsiveBox>

<style>
    .date-picker-button {
        display: flex;
        align-items: center;
        width: 100%;
        height: 100%;
        min-width: 0;
        padding: inherit;
        border: inherit;
        border-radius: inherit;
        background: inherit;
        color: inherit;
        font-size: inherit;
        font-family: inherit;
        font-weight: inherit;
        line-height: inherit;
        text-align: inherit;
        cursor: pointer;
        transition: all 0.3s ease;
        gap: calc(16px * var(--scale-ratio, 1));
        padding-left: calc(12px * var(--scale-ratio, 1));
        padding-right: calc(12px * var(--scale-ratio, 1));
    }

    .date-picker-button:hover:not(.disabled) {
        background: inherit;
        border-color: inherit;
    }

    .date-picker-button.disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .date-text {
        flex: 1;
        text-align: inherit;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        min-width: 0;
        color: inherit;
        font-size: inherit;
        font-family: inherit;
        font-weight: inherit;
        line-height: inherit;
    }

    .date-icon {
        flex-shrink: 0;
        width: calc(16px * var(--scale-ratio, 1));
        height: calc(16px * var(--scale-ratio, 1));
        opacity: 0.7;
        color: inherit;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .date-icon svg {
        width: 100%;
        height: 100%;
    }

    .date-picker-panel {
        position: absolute;
        top: 100%;
        left: 0;
        margin-top: calc(4px * var(--scale-ratio, 1));
        background: var(--panel-bg, #0f172a);
        border: calc(1px * var(--scale-ratio, 1)) solid var(--panel-border, #334155);
        border-radius: calc(8px * var(--scale-ratio, 1));
        padding: calc(16px * var(--scale-ratio, 1));
        box-shadow: 0 calc(10px * var(--scale-ratio, 1)) calc(25px * var(--scale-ratio, 1)) var(--panel-shadow, rgba(0, 0, 0, 0.5));
        z-index: 1000;
        width: 100%;
        max-width: calc(280px * var(--scale-ratio, 1));
        min-width: calc(240px * var(--scale-ratio, 1));
        color: var(--text-color, #e2e8f0);
    }

    /* 当以 portal 方式挂载到 body 时，使用 fixed 定位并按内容宽度显示 */
    .date-picker-panel.portal {
        position: fixed;
        width: auto;
        max-width: calc(320px * var(--scale-ratio, 1));
        min-width: calc(240px * var(--scale-ratio, 1));
        margin-top: 0;
    }

    .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: calc(12px * var(--scale-ratio, 1));
    }

    .nav-button {
        background: none;
        border: none;
        color: var(--control-color, #94a3b8);
        cursor: pointer;
        padding: calc(4px * var(--scale-ratio, 1));
        border-radius: calc(4px * var(--scale-ratio, 1));
        font-size: calc(16px * var(--scale-ratio, 1));
        transition: color 0.2s ease;
    }

    .nav-button:hover {
        color: var(--text-color, #e2e8f0);
        background-color: var(--control-hover-bg, rgba(45, 55, 72, 0.9));
    }

    .month-year {
        font-size: calc(13px * var(--scale-ratio, 1));
        font-weight: 600;
        color: var(--text-color, #e2e8f0);
    }

    .mode-title {
        font-size: calc(14px * var(--scale-ratio, 1));
        font-weight: 600;
        color: var(--text-color, #e2e8f0);
        text-align: center;
        flex: 1;
    }

    .weekdays {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: calc(2px * var(--scale-ratio, 1));
        margin-bottom: calc(8px * var(--scale-ratio, 1));
    }

    .weekday {
        text-align: center;
        font-size: calc(10px * var(--scale-ratio, 1));
        color: var(--control-color, #94a3b8);
        padding: calc(4px * var(--scale-ratio, 1));
    }

    .days {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: calc(2px * var(--scale-ratio, 1));
    }

    .day-spacer {
        width: 100%;
        aspect-ratio: 1;
    }

    .day {
        aspect-ratio: 1;
        border: none;
        background: transparent;
        color: var(--text-color, #e2e8f0);
        font-size: calc(11px * var(--scale-ratio, 1));
        cursor: pointer;
        border-radius: calc(4px * var(--scale-ratio, 1));
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .day:hover:not(.disabled) {
        background: var(--control-hover-bg, rgba(45, 55, 72, 0.9));
    }

    .day.today {
        color: var(--accent-color, #38bdf8);
        font-weight: 600;
    }

    .day.selected {
        background: var(--accent-color, #38bdf8);
        color: var(--panel-bg, #0f172a);
        font-weight: 600;
    }

    .day.disabled {
        opacity: 0.3;
        cursor: not-allowed;
    }

    /* 年/月选择面板 */
    .year-month-select {
        display: flex;
        gap: calc(8px * var(--scale-ratio, 1));
    }

    .year-list,
    .month-list {
        display: flex;
        flex-direction: column;
        gap: calc(4px * var(--scale-ratio, 1));
        flex: 1;
        max-height: calc(200px * var(--scale-ratio, 1));
        overflow-y: auto;
        padding: calc(4px * var(--scale-ratio, 1));
    }

    /* 单独的年份列表（年份模式） */
    .year-list:only-child {
        max-height: calc(250px * var(--scale-ratio, 1));
    }

    /* 单独的月份列表（月份模式） */
    .month-list:only-child {
        max-height: calc(220px * var(--scale-ratio, 1));
    }

    .year-item,
    .month-item {
        padding: calc(6px * var(--scale-ratio, 1));
        text-align: center;
        border: none;
        background: transparent;
        color: var(--text-color, #e2e8f0);
        cursor: pointer;
        border-radius: calc(4px * var(--scale-ratio, 1));
        transition: all 0.2s ease;
        font-size: calc(11px * var(--scale-ratio, 1));
    }

    .year-item:hover,
    .month-item:hover {
        background: var(--control-hover-bg, rgba(45, 55, 72, 0.9));
    }

    .year-item.selected,
    .month-item.selected {
        background: var(--accent-color, #38bdf8);
        color: var(--panel-bg, #0f172a);
        font-weight: 600;
    }

    /* （已移除年份显示相关样式，避免未使用选择器警告） */

    /* 时分秒输入 */
    .time-inputs {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: calc(8px * var(--scale-ratio, 1));
        margin-top: calc(16px * var(--scale-ratio, 1));
        padding-top: calc(16px * var(--scale-ratio, 1));
        border-top: calc(1px * var(--scale-ratio, 1)) solid var(--panel-border, #334155);
    }

    .time-group {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: calc(4px * var(--scale-ratio, 1));
    }

    .time-label {
        font-size: calc(10px * var(--scale-ratio, 1));
        color: var(--control-color, #94a3b8);
        margin: 0;
    }

    .time-input {
        width: calc(50px * var(--scale-ratio, 1));
        padding: calc(6px * var(--scale-ratio, 1));
        border: calc(1px * var(--scale-ratio, 1)) solid var(--panel-border, #334155);
        border-radius: calc(4px * var(--scale-ratio, 1));
        background: var(--control-bg, rgba(45, 55, 72, 0.9));
        color: var(--text-color, #e2e8f0);
        font-size: calc(12px * var(--scale-ratio, 1));
        text-align: center;
        outline: none;
        transition: border-color 0.2s ease;
    }

    .time-input:focus {
        border-color: var(--accent-color, #38bdf8);
    }

    .time-separator {
        font-size: calc(14px * var(--scale-ratio, 1));
        color: var(--control-color, #94a3b8);
        margin-top: calc(16px * var(--scale-ratio, 1));
    }
</style>
