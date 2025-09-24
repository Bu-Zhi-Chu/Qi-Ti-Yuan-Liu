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

    interface Props {
        value?: Date
        disabled?: boolean
        min?: Date
        max?: Date
        id?: string
        style?: string
        onChange?: (date: Date) => void
        [key: string]: any
    }

    let { value = $bindable(new Date()), disabled = false, min, max, id, style = '', onChange, ...rest }: Props = $props()

    const dispatch = createEventDispatcher<{ change: Date }>()

    let isOpen = $state(false)
    let pickerRef = $state<HTMLDivElement>()
    let buttonRef = $state<HTMLButtonElement>()

    // 内部日期状态
    let internalDate = $state(new Date(value))

    // 同步外部 value 变化到内部
    $effect(() => {
        if (value && value.getTime() !== internalDate.getTime()) {
            internalDate = new Date(value)
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
            updateValue(date)
        }
    }

    // 验证日期是否有效
    function isValidDate(date: Date): boolean {
        return date instanceof Date && !isNaN(date.getTime())
    }

    // 同步内部日期变化到外部
    function updateValue(newDate: Date) {
        value = new Date(newDate) // 这会自动触发 bind:value 更新
        dispatch('change', new Date(newDate))
        if (onChange) {
            onChange(new Date(newDate))
        }
    }

    // 格式化显示文本（中文）
    let displayText = $derived(formatDateChinese(internalDate))

    // 生成年月数据
    let year = $derived(internalDate.getFullYear())
    let month = $derived(internalDate.getMonth())
    let date = $derived(internalDate.getDate())

    // 面板数据
    let daysInMonth = $derived(new Date(year, month + 1, 0).getDate())
    let firstDay = $derived(new Date(year, month, 1).getDay())
    let today = $derived(new Date())

    // 选择年/月模式
    let selectingYearMonth = $state(false)
    let yearListRef = $state<HTMLDivElement>()
     let monthListRef = $state<HTMLDivElement>()

    // 以当前年份为中心，上下各 10 年
    let yearsRange = $derived(Array.from({ length: 21 }, (_, i) => year - 10 + i))

    // 月份名称
    const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']

    // 星期名称
    const weekdayNames = ['日', '一', '二', '三', '四', '五', '六']

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
            // When opening, default to day view
            selectingYearMonth = false
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
                isOpen = false
                // Reset to day view so next open shows calendar
                selectingYearMonth = false
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    })
</script>

<ResponsiveBox {id} {style} class="date-picker" {...rest}>
    <button bind:this={buttonRef} class="date-picker-button" class:disabled onclick={togglePanel} type="button" style="width: 100%; height: 100%;">
        <span class="date-text">{displayText}</span>
        <span class="date-icon">📅</span>
    </button>

    {#if isOpen}
        <div class="date-picker-panel">
            <div class="panel-header">
                <button class="nav-button" onclick={prevYear} type="button">«</button>
                <button class="nav-button" onclick={prevMonth} type="button">‹</button>
                <span class="month-year" role="button" tabindex="0" onclick={openYearMonthSelect} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { openYearMonthSelect(); } }} style="cursor: pointer;">{year}年 {monthNames[month]}</span>
                <button class="nav-button" onclick={nextMonth} type="button">›</button>
                <button class="nav-button" onclick={nextYear} type="button">»</button>
            </div>

            {#if selectingYearMonth}
                <div class="year-month-select">
                    <div class="year-list" bind:this={yearListRef}>
                         {#each yearsRange as y}
                             <button class="year-item" class:selected={y === year} onclick={() => { internalDate = new Date(y, month, date); selectingYearMonth = false; updateValue(internalDate); }} type="button">{y}</button>
                         {/each}
                     </div>
                    <div class="month-list" bind:this={monthListRef}>
                         {#each monthNames as m, idx}
                             <button class="month-item" class:selected={idx === month} onclick={() => { internalDate = new Date(year, idx, date); selectingYearMonth = false; updateValue(internalDate); }} type="button">{m}</button>
                         {/each}
                     </div>
                </div>
            {:else}
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
        padding: calc(8px * var(--scale-ratio, 1)) calc(12px * var(--scale-ratio, 1));
        border: calc(1px * var(--scale-ratio, 1)) solid rgba(255, 255, 255, 0.2);
        border-radius: calc(6px * var(--scale-ratio, 1));
        background: rgba(45, 55, 72, 0.9);
        color: #e2e8f0;
        font-size: calc(11px * var(--scale-ratio, 1));
        cursor: pointer;
        transition: all 0.3s ease;
        gap: calc(8px * var(--scale-ratio, 1));
    }

    .date-picker-button:hover:not(.disabled) {
        background: rgba(45, 55, 72, 0.95);
        border-color: rgba(255, 255, 255, 0.3);
    }

    .date-picker-button.disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .date-text {
        flex: 1;
        text-align: left;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        min-width: 0;
    }

    .date-icon {
        flex-shrink: 0;
        font-size: calc(12px * var(--scale-ratio, 1));
        opacity: 0.7;
    }

    .date-picker-panel {
        position: absolute;
        top: 100%;
        left: 0;
        margin-top: calc(4px * var(--scale-ratio, 1));
        background: #0f172a;
        border: calc(1px * var(--scale-ratio, 1)) solid #334155;
        border-radius: calc(8px * var(--scale-ratio, 1));
        padding: calc(16px * var(--scale-ratio, 1));
        box-shadow: 0 calc(10px * var(--scale-ratio, 1)) calc(25px * var(--scale-ratio, 1)) rgba(0, 0, 0, 0.5);
        z-index: 1000;
        width: 100%;
        max-width: calc(280px * var(--scale-ratio, 1));
        min-width: calc(240px * var(--scale-ratio, 1));
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
        color: #94a3b8;
        cursor: pointer;
        padding: calc(4px * var(--scale-ratio, 1));
        border-radius: calc(4px * var(--scale-ratio, 1));
        font-size: calc(16px * var(--scale-ratio, 1));
        transition: color 0.2s ease;
    }

    .nav-button:hover {
        color: #e2e8f0;
        background-color: rgba(45, 55, 72, 0.9);
    }

    .month-year {
        font-size: calc(13px * var(--scale-ratio, 1));
        font-weight: 600;
        color: #e2e8f0;
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
        color: #94a3b8;
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
        color: #e2e8f0;
        font-size: calc(11px * var(--scale-ratio, 1));
        cursor: pointer;
        border-radius: calc(4px * var(--scale-ratio, 1));
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .day:hover:not(.disabled) {
        background: rgba(45, 55, 72, 0.9);
    }

    .day.today {
        color: #38bdf8;
        font-weight: 600;
    }

    .day.selected {
        background: #38bdf8;
        color: #0f172a;
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
    }

    .year-item,
    .month-item {
        padding: calc(6px * var(--scale-ratio, 1));
        border: none;
        border-radius: calc(4px * var(--scale-ratio, 1));
        background: transparent;
        color: #e2e8f0;
        font-size: calc(11px * var(--scale-ratio, 1));
        cursor: pointer;
        transition: background 0.2s ease;
    }

    .year-item:hover,
    .month-item:hover {
        background: rgba(45, 55, 72, 0.9);
    }

    .year-item.selected,
    .month-item.selected {
        background: #38bdf8;
        color: #0f172a;
        font-weight: 600;
    }
</style>
