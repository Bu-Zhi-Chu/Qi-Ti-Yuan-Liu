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
        mode?: 'input' | 'select' | 'tree' | 'year' | 'date' | 'datetime'
        options?: string[]
        onChange?: (date: Date) => void
        [key: string]: any
    }

    let { value = $bindable(new Date()), disabled = false, min, max, id, style = '', dateRecording = false, recordedDate, mode = 'input', options = [], onChange, ...rest }: Props = $props()

    const baseBoxStyle = 'height: calc(30px * var(--scale-ratio, 1)); background-color: #ffffff; color: #000000; border: calc(1px * var(--scale-ratio, 1)) solid rgb(26, 156, 254)'

    function getWidthValueByMode(m: 'input' | 'select' | 'tree' | 'year' | 'date' | 'datetime' | undefined): string {
        if (m === 'year') return 'calc(80px * var(--scale-ratio, 1))'
        if (m === 'date') return 'calc(150px * var(--scale-ratio, 1))'
        if (m === 'datetime') return 'calc(205px * var(--scale-ratio, 1))'
        if (m === 'select') return 'calc(150px * var(--scale-ratio, 1))'
        if (m === 'tree') return 'calc(205px * var(--scale-ratio, 1))'
        return 'calc(205px * var(--scale-ratio, 1))'
    }

    function getWidthStyleByMode(m: 'input' | 'select' | 'tree' | 'year' | 'date' | 'datetime' | undefined): string {
        return `width: ${getWidthValueByMode(m)}`
    }

    const widthStyle = $derived(getWidthStyleByMode(mode))
    const boxStyle = $derived(style && style.trim().length > 0 ? `${widthStyle}; ${baseBoxStyle}; ${style}` : `${widthStyle}; ${baseBoxStyle}`)

    $effect(() => {
        if (!id) return
        const expectedWidth = getWidthValueByMode(mode)
        const currentStyle = (style || '').replace(/\s+/g, ' ')
        const escaped = expectedWidth.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
        const pattern = new RegExp(`width\\s*:\\s*${escaped}`)
        if (pattern.test(currentStyle)) return
        updateNodeProps(id, { styles: { width: expectedWidth } })
    })

    const dispatch = createEventDispatcher<{ change: Date }>()

    let isOpen = $state(false)
    let pickerRef = $state<HTMLDivElement>()
    let buttonRef = $state<HTMLElement>()
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

    const initialDate: Date = mode === 'select' || mode === 'input' ? new Date() : dateRecording && recordedDate ? normalizeDate(recordedDate) : normalizeDate(value)
    let internalDate = $state(initialDate)
    // 如果使用记录值，确保外部 value 同步
    if (dateRecording && recordedDate) {
        value = new Date(initialDate)
    }

    $effect(() => {
        if (mode === 'select' || mode === 'input') return
        const newVal = normalizeDate(value)
        if (!isOpen && newVal.getTime() !== internalDate.getTime()) {
            internalDate = new Date(newVal)
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
        const committed = new Date(newDate)
        value = committed
        dispatch('change', new Date(committed))
        if (onChange) {
            onChange(new Date(committed))
        }
        // Persist to doms attr if dateRecording enabled
        if (dateRecording && id) {
            updateNodeProps(id, { attributes: { recordedDate: toInputValue(committed) } })
        }
    }

    let displayText = $derived(mode === 'year' || mode === 'date' || mode === 'datetime' ? formatDisplay(normalizeDate(value)) : '')
    let isEditingDisplay = $state(false)
    let displayInput = $state('')
    let displayInputRef = $state<HTMLInputElement>()

    $effect(() => {
        if (!isEditingDisplay) {
            displayInput = displayText
        }
    })

    let inputText = $state(typeof value === 'string' ? value : '')

    $effect(() => {
        if (mode !== 'input') return
        if (typeof value === 'string' && value !== inputText) {
            inputText = value
        }
    })

    let selectOptions = $derived((options && options.length > 0 ? options : ['选项一', '选项二', '选项三']).slice())
    let selectedIndex = $state<number | null>(null)

    $effect(() => {
        if (mode !== 'select') return
        if (typeof value === 'string') {
            const idx = selectOptions.indexOf(value)
            if (idx !== -1 && idx !== selectedIndex) {
                selectedIndex = idx
            }
        }
    })

    type TreeNode = {
        id: string | number
        label: string
        children?: TreeNode[]
        expanded?: boolean
    }

    const defaultTreeSelectData: TreeNode[] = [
        {
            id: 'root',
            label: '根节点',
            expanded: true,
            children: [
                { id: 'root-leaf-1', label: '根节点末端1' },
                { id: 'root-leaf-2', label: '根节点末端2' }
            ]
        },
        {
            id: 'level1',
            label: '一级节点',
            expanded: true,
            children: [
                { id: 'level1-leaf-1', label: '一级末端1' },
                { id: 'level1-leaf-2', label: '一级末端2' }
            ]
        },
        {
            id: 'level2',
            label: '二级节点',
            expanded: true,
            children: [
                { id: 'level2-leaf-1', label: '二级末端1' },
                { id: 'level2-leaf-2', label: '二级末端2' }
            ]
        }
    ]

    let treeSelectData = $state<TreeNode[]>(defaultTreeSelectData)
    let selectedTreeId = $state<string | number | null>(defaultTreeSelectData[0]?.id ?? null)

    function findTreeNodeById(nodes: TreeNode[], id: string | number): TreeNode | null {
        for (const node of nodes) {
            if (node.id === id) return node
            if (node.children && node.children.length > 0) {
                const found = findTreeNodeById(node.children, id)
                if (found) return found
            }
        }
        return null
    }

    function findTreeNodeByLabel(nodes: TreeNode[], label: string): TreeNode | null {
        for (const node of nodes) {
            if (node.label === label) return node
            if (node.children && node.children.length > 0) {
                const found = findTreeNodeByLabel(node.children, label)
                if (found) return found
            }
        }
        return null
    }

    function getTreeSelectedText(): string {
        if (selectedTreeId == null) return ''
        const node = findTreeNodeById(treeSelectData, selectedTreeId)
        return node?.label ?? ''
    }

    function toggleTreeExpand(node: TreeNode) {
        node.expanded = !(node.expanded ?? true)
        treeSelectData = treeSelectData.map((n) => ({ ...n }))
    }

    function selectTreeNode(node: TreeNode) {
        selectedTreeId = node.id
        isOpen = false
    }

    let year = $derived(internalDate.getFullYear())
    let month = $derived(internalDate.getMonth())
    let date = $derived(internalDate.getDate())
    let panelBaseDate = $state<Date | null>(null)

    // 面板数据
    let daysInMonth = $derived(new Date(year, month + 1, 0).getDate())
    let firstDay = $derived(new Date(year, month, 1).getDay())
    let today = $derived(new Date())

    type CalendarCell = {
        date: Date
        isCurrentMonth: boolean
    }

    function buildCalendarCells(year: number, month: number, daysInMonth: number, firstDay: number): CalendarCell[] {
        const cells: CalendarCell[] = []
        const total = 42
        const prevMonthLastDate = new Date(year, month, 0)
        const prevMonthDays = prevMonthLastDate.getDate()
        const offset = firstDay === 0 ? 7 : firstDay
        for (let i = 0; i < total; i++) {
            if (i < offset) {
                const day = prevMonthDays - offset + 1 + i
                cells.push({
                    date: new Date(year, month - 1, day),
                    isCurrentMonth: false
                })
            } else if (i < offset + daysInMonth) {
                const day = i - offset + 1
                cells.push({
                    date: new Date(year, month, day),
                    isCurrentMonth: true
                })
            } else {
                const day = i - offset - daysInMonth + 1
                cells.push({
                    date: new Date(year, month + 1, day),
                    isCurrentMonth: false
                })
            }
        }
        return cells
    }

    let calendarCells = $derived(buildCalendarCells(year, month, daysInMonth, firstDay))

    let selectingYearMonth = $state(false)

    let hours = $state(0)
    let minutes = $state(0)
    let seconds = $state(0)
    let timeInput = $state('')
    let isEditingTime = $state(false)

    type TimeSegment = 'hour' | 'minute' | 'second'
    let activeTimeSegment = $state<TimeSegment>('hour')
    let timeInputRef = $state<HTMLInputElement>()

    function parseDisplayInput(raw: string): Date | null {
        const text = raw.trim()
        if (!text) return null
        if (mode === 'date') {
            const d = new Date(text)
            return isValidDate(d) ? d : null
        }
        if (mode === 'datetime') {
            const parts = text.split(/\s+/)
            if (parts.length < 2) return null
            const d = new Date(`${parts[0]}T${parts[1]}`)
            return isValidDate(d) ? d : null
        }
        return null
    }

    function commitDisplayInput() {
        if (mode === 'year') return
        const parsed = parseDisplayInput(displayInput)
        if (!parsed) {
            displayInput = displayText
            return
        }
        const next = new Date(parsed)
        internalDate = next
        if (mode === 'datetime') {
            hours = next.getHours()
            minutes = next.getMinutes()
            seconds = next.getSeconds()
            timeInput = formatTimeString(hours, minutes, seconds)
            isEditingTime = false
        }
        updateValue(next)
    }

    function getSelectedText(): string {
        if (selectedIndex === null || selectedIndex < 0 || selectedIndex >= selectOptions.length) return ''
        return selectOptions[selectedIndex] ?? ''
    }

    function selectOption(index: number) {
        if (index < 0 || index >= selectOptions.length) return
        selectedIndex = index
        if (mode === 'select') {
            value = selectOptions[index] ?? ''
        }
        isOpen = false
    }

    function handleDisplayClick() {
        if (disabled || mode === 'year') return
        isEditingDisplay = true
        displayInput = displayText
        tick().then(() => {
            if (displayInputRef) {
                displayInputRef.focus()
                displayInputRef.select()
            }
        })
    }

    function handleDisplayBlur() {
        if (!isEditingDisplay) return
        isEditingDisplay = false
        commitDisplayInput()
    }

    function handleDisplayKeydown(e: KeyboardEvent) {
        if (e.key === 'Enter') {
            e.preventDefault()
            isEditingDisplay = false
            commitDisplayInput()
        } else if (e.key === 'Escape') {
            e.preventDefault()
            isEditingDisplay = false
            displayInput = displayText
        }
    }

    function selectTimeSegment(segment: TimeSegment) {
        activeTimeSegment = segment
        if (!timeInputRef) return
        let start = 0
        let end = 2
        if (segment === 'minute') {
            start = 3
            end = 5
        } else if (segment === 'second') {
            start = 6
            end = 8
        }
        timeInputRef.setSelectionRange(start, end)
    }

    async function adjustTimeBySegment(delta: number) {
        const parsed = parseTimeString(timeInput)
        if (parsed) {
            hours = parsed.h
            minutes = parsed.m
            seconds = parsed.s
        }
        if (activeTimeSegment === 'hour') {
            hours = (hours + delta + 24) % 24
        } else if (activeTimeSegment === 'minute') {
            minutes = (minutes + delta + 60) % 60
        } else {
            seconds = (seconds + delta + 60) % 60
        }
        const next = new Date(internalDate)
        next.setHours(hours, minutes, seconds)
        internalDate = next
        timeInput = formatTimeString(hours, minutes, seconds)
        isEditingTime = true
        await tick()
        if (timeInputRef) {
            timeInputRef.focus()
            selectTimeSegment(activeTimeSegment)
        }
    }

    let yearListRef = $state<HTMLDivElement>()

    $effect(() => {
        if (mode === 'datetime') {
            const h = internalDate.getHours()
            const m = internalDate.getMinutes()
            const s = internalDate.getSeconds()
            hours = h
            minutes = m
            seconds = s
            if (!isEditingTime) {
                timeInput = formatTimeString(h, m, s)
            }
        }
    })

    // 以当前年份为中心，上下各 10 年
    let yearsRange = $derived(Array.from({ length: 21 }, (_, i) => year - 10 + i))

    let yearInput = $state('')
    let yearError = $state(false)
    let yearErrorMessage = $state('')

    function isValidYearString(str: string): boolean {
        if (!/^\d{4}$/.test(str)) return false
        const num = parseInt(str, 10)
        return num >= 1900 && num <= 2050
    }

    $effect(() => {
        yearInput = String(internalDate.getFullYear())
        yearError = false
        yearErrorMessage = ''
    })

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

    function formatTimeComponent(v: number): string {
        return String(v).padStart(2, '0')
    }

    function formatTimeString(h: number, m: number, s: number): string {
        return `${formatTimeComponent(h)}:${formatTimeComponent(m)}:${formatTimeComponent(s)}`
    }

    function parseTimeString(str: string): { h: number; m: number; s: number } | null {
        const trimmed = str.trim()
        const match = /^(\d{1,2}):(\d{1,2}):(\d{1,2})$/.exec(trimmed)
        if (!match) return null
        const h = parseInt(match[1], 10)
        const m = parseInt(match[2], 10)
        const s = parseInt(match[3], 10)
        if (isNaN(h) || isNaN(m) || isNaN(s)) return null
        if (h < 0 || h > 23) return null
        if (m < 0 || m > 59) return null
        if (s < 0 || s > 59) return null
        return { h, m, s }
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

    function isWeekend(d: Date): boolean {
        const w = d.getDay()
        return w === 0 || w === 6
    }

    function isSelected(d: Date): boolean {
        return isSameDay(d, internalDate)
    }

    function isBaseSelected(d: Date): boolean {
        if (!panelBaseDate) return false
        if (isSameDay(d, internalDate)) return false
        return isSameDay(d, panelBaseDate)
    }

    function isDisabled(d: Date): boolean {
        if (min && d < min) return true
        if (max && d > max) return true
        return false
    }

    function selectDate(d: Date) {
        if (isDisabled(d)) return
        const next = new Date(d)
        if (mode === 'datetime') {
            next.setHours(hours, minutes, seconds)
        }
        internalDate = next
    }

    function setToday() {
        const now = new Date()
        const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const next = new Date(todayOnly)
        if (mode === 'datetime') {
            next.setHours(hours, minutes, seconds)
        }
        internalDate = next
        updateValue(next)
        isOpen = false
        selectingYearMonth = false
    }

    function confirmSelection() {
        updateValue(internalDate)
        isOpen = false
        selectingYearMonth = false
    }

    function closePanel() {
        isOpen = false
        selectingYearMonth = false
    }

    function prevMonth() {
        const base = new Date(year, month - 1, Math.min(date, new Date(year, month, 0).getDate()))
        if (mode === 'datetime') {
            base.setHours(hours, minutes, seconds)
        }
        internalDate = base
    }

    function nextMonth() {
        const base = new Date(year, month + 1, Math.min(date, new Date(year, month + 2, 0).getDate()))
        if (mode === 'datetime') {
            base.setHours(hours, minutes, seconds)
        }
        internalDate = base
    }

    function prevYear() {
        const base = new Date(year - 1, month, Math.min(date, new Date(year - 1, month + 1, 0).getDate()))
        if (mode === 'datetime') {
            base.setHours(hours, minutes, seconds)
        }
        internalDate = base
    }

    function nextYear() {
        const base = new Date(year + 1, month, Math.min(date, new Date(year + 1, month + 1, 0).getDate()))
        if (mode === 'datetime') {
            base.setHours(hours, minutes, seconds)
        }
        internalDate = base
    }

    function togglePanel() {
        if (disabled) return
        if (mode === 'year' || mode === 'input') return
        isOpen = !isOpen
        if (isOpen) {
            if (mode === 'date' || mode === 'datetime') {
                const committed = normalizeDate(value)
                internalDate = new Date(committed)
                panelBaseDate = new Date(committed)
                selectingYearMonth = false
            }
            tick().then(() => updatePanelPosition())
        }
    }

    async function openYearMonthSelect() {
        selectingYearMonth = true
        await tick()
        if (yearListRef) {
            yearListRef.querySelector('.year-item.selected')?.scrollIntoView({ block: 'center' })
        }
    }

    // 点击外部关闭
    onMount(() => {
        function handleClickOutside(event: MouseEvent) {
            if (isOpen && pickerRef && !pickerRef.contains(event.target as Node) && !buttonRef?.contains(event.target as Node)) {
                isOpen = false
                selectingYearMonth = false
                if (mode === 'date' || mode === 'datetime' || mode === 'year') {
                    const committed = normalizeDate(value)
                    internalDate = new Date(committed)
                    if (mode === 'datetime') {
                        hours = committed.getHours()
                        minutes = committed.getMinutes()
                        seconds = committed.getSeconds()
                        if (!isEditingTime) {
                            timeInput = formatTimeString(hours, minutes, seconds)
                        }
                    }
                }
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
                // 再次确保定位正确（面板内容可能改变尺寸）
                updatePanelPosition()
            })
        }
    })

    // 计算并设置面板的 fixed 定位样式，使其不受父级 overflow 限制
    function updatePanelPosition() {
        if (!buttonRef || !pickerRef) return
        const containerEl = buttonRef.parentElement as HTMLElement | null
        const isFullWidthMode = mode === 'select' || mode === 'tree'
        const baseRect = isFullWidthMode && containerEl ? containerEl.getBoundingClientRect() : buttonRef.getBoundingClientRect()
        panelStyle = 'position:fixed;left:-9999px;top:-9999px;z-index:10000'
        tick().then(() => {
            const panelEl = pickerRef
            if (!panelEl) return
            const rawWidth = panelEl.offsetWidth
            const rawHeight = panelEl.offsetHeight
            const margin = 8
            const targetEl = buttonRef as HTMLElement
            const computedStyle = window.getComputedStyle(targetEl)
            const ratioValue = parseFloat(computedStyle.getPropertyValue('--scale-ratio') || '1')
            const ratio = isNaN(ratioValue) || ratioValue <= 0 ? 1 : ratioValue
            const offset = isFullWidthMode ? 0 : 4 * ratio
            const panelWidth = isFullWidthMode ? baseRect.width : rawWidth
            const panelHeight = rawHeight
            let left = baseRect.left
            let top = baseRect.bottom + offset
            if (left + panelWidth + margin > window.innerWidth) {
                left = Math.max(margin, window.innerWidth - panelWidth - margin)
            }
            if (left < margin) left = margin
            if (top + panelHeight + margin > window.innerHeight) {
                top = Math.max(margin, baseRect.top - panelHeight - offset)
            }
            if (top < margin) top = margin
            panelStyle = `position:fixed;left:${Math.round(left)}px;top:${Math.round(top)}px;width:${Math.round(panelWidth)}px;z-index:10000`
        })
    }
</script>

<ResponsiveBox {id} class="date-picker" style={boxStyle} {...rest}>
    {#if mode === 'year'}
        <div class="date-picker-year-wrapper" class:invalid={yearError}>
            <input
                class="date-picker-year-input"
                type="text"
                bind:value={yearInput}
                {disabled}
                oninput={() => {
                    const digits = yearInput.replace(/[^\d]/g, '')
                    yearInput = digits.slice(0, 4)
                    if (yearInput.length === 0) {
                        yearError = false
                        yearErrorMessage = ''
                    } else if (!isValidYearString(yearInput)) {
                        yearError = true
                        yearErrorMessage = '该输入项需要在1900年至2050年范围内'
                    } else {
                        yearError = false
                        yearErrorMessage = ''
                    }
                }}
                onblur={() => {
                    const trimmed = yearInput.trim()
                    if (trimmed === '') {
                        yearInput = String(year)
                        yearError = false
                        yearErrorMessage = ''
                        return
                    }
                    if (!isValidYearString(trimmed)) {
                        yearError = true
                        yearErrorMessage = '该输入项需要在1900年至2050年范围内'
                        return
                    }
                    const val = parseInt(trimmed, 10)
                    if (!isNaN(val)) {
                        const newDate = new Date(val, month, date)
                        internalDate = newDate
                        updateValue(newDate)
                        yearInput = String(val)
                        yearError = false
                        yearErrorMessage = ''
                    }
                }}
                onkeydown={(e) => {
                    if (e.key === 'Enter') {
                        const trimmed = yearInput.trim()
                        if (trimmed === '') {
                            yearInput = String(year)
                            yearError = false
                            yearErrorMessage = ''
                            return
                        }
                        if (!isValidYearString(trimmed)) {
                            yearError = true
                            yearErrorMessage = '该输入项需要在1900年至2050年范围内'
                            return
                        }
                        const val = parseInt(trimmed, 10)
                        if (!isNaN(val)) {
                            const newDate = new Date(val, month, date)
                            internalDate = newDate
                            updateValue(newDate)
                            yearInput = String(val)
                            yearError = false
                            yearErrorMessage = ''
                        }
                    }
                }}
            />
            {#if yearError && yearErrorMessage}
                <div class="date-picker-year-error">
                    {yearErrorMessage}
                </div>
            {/if}
            <div class="date-picker-year-stepper">
                <button
                    type="button"
                    class="date-picker-year-btn"
                    {disabled}
                    onclick={() => {
                        let next = year + 1
                        if (max && next > max.getFullYear()) next = max.getFullYear()
                        const newDate = new Date(next, month, date)
                        internalDate = newDate
                        updateValue(newDate)
                    }}
                >
                    <span class="date-picker-year-symbol">∧</span>
                </button>
                <button
                    type="button"
                    class="date-picker-year-btn"
                    {disabled}
                    onclick={() => {
                        let next = year - 1
                        if (min && next < min.getFullYear()) next = min.getFullYear()
                        const newDate = new Date(next, month, date)
                        internalDate = newDate
                        updateValue(newDate)
                    }}
                >
                    <span class="date-picker-year-symbol">∨</span>
                </button>
            </div>
        </div>
    {:else if mode === 'input'}
        <input class="date-picker-display-input" type="text" bind:value={inputText} {disabled} />
    {:else if mode === 'select'}
        <div bind:this={buttonRef} class="date-picker-button select-button" class:disabled>
            <span class="date-text">
                {#if getSelectedText()}
                    {getSelectedText()}
                {:else}
                    请选择
                {/if}
            </span>
            <button type="button" class="date-icon select-icon" onclick={togglePanel} {disabled}>
                <img src={`${import.meta.env.BASE_URL}img/hold/combo_arrow.png`} alt="" class="date-icon-image" />
            </button>
        </div>

        {#if isOpen}
            <div bind:this={pickerRef} use:portal={document.body} class="date-picker-panel portal select-panel" style={panelStyle}>
                <div class="select-options">
                    {#each selectOptions as opt, i}
                        <button type="button" class="select-option" class:selected={selectedIndex === i} onclick={() => selectOption(i)}>
                            {opt}
                        </button>
                    {/each}
                </div>
            </div>
        {/if}
    {:else if mode === 'tree'}
        <div bind:this={buttonRef} class="date-picker-button select-button" class:disabled>
            <span class="date-text">
                {#if getTreeSelectedText()}
                    {getTreeSelectedText()}
                {:else}
                    请选择
                {/if}
            </span>
            <button type="button" class="date-icon select-icon" onclick={togglePanel} {disabled}>
                <img src={`${import.meta.env.BASE_URL}img/hold/combo_arrow.png`} alt="" class="date-icon-image" />
            </button>
        </div>

        {#if isOpen}
            <div bind:this={pickerRef} use:portal={document.body} class="date-picker-panel portal tree-panel" style={panelStyle}>
                <div class="tree-select-list">
                    <ul class="tree-level root">
                        {#each treeSelectData as node}
                            <li>
                                <div class="tree-node">
                                    {#if node.children && node.children.length > 0}
                                        <button
                                            type="button"
                                            class="tree-toggle"
                                            onclick={(e) => {
                                                e.stopPropagation()
                                                toggleTreeExpand(node)
                                            }}
                                            aria-label={(node.expanded ?? true) ? '收起' : '展开'}
                                        >
                                            {#if node.expanded ?? true}
                                                <svg viewBox="0 0 12 12" aria-hidden="true">
                                                    <polygon points="2,2 10,6 2,10" fill="#000000" />
                                                </svg>
                                            {:else}
                                                <svg viewBox="0 0 12 12" aria-hidden="true">
                                                    <polygon points="2,2 10,6 2,10" fill="#ffffff" stroke="#000000" stroke-width="1" />
                                                </svg>
                                            {/if}
                                        </button>
                                    {:else}
                                        <span class="tree-toggle-placeholder"></span>
                                    {/if}
                                    <div
                                        class="tree-node-inner"
                                        class:selected={node.id === selectedTreeId}
                                        role="button"
                                        tabindex="0"
                                        onclick={() => selectTreeNode(node)}
                                        onkeydown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') selectTreeNode(node)
                                        }}
                                    >
                                        {#if node.children && node.children.length > 0}
                                            <span class="tree-icon">
                                                {#if node.expanded ?? true}
                                                    <svg viewBox="0 0 18 14" aria-hidden="true">
                                                        <path d="M1 5h7l2 2h7v6H1z" fill="#ffd659" stroke="#c08a25" stroke-width="1" />
                                                        <path d="M1 3h7l2 2H1z" fill="#ffe892" stroke="#c08a25" stroke-width="1" />
                                                    </svg>
                                                {:else}
                                                    <svg viewBox="0 0 18 14" aria-hidden="true">
                                                        <path d="M1 5h16v8H1z" fill="#ffd659" stroke="#c08a25" stroke-width="1" />
                                                        <path d="M1 3h6l2 1h7v3H1z" fill="#ffe892" stroke="#c08a25" stroke-width="1" />
                                                    </svg>
                                                {/if}
                                            </span>
                                        {:else}
                                            <span class="tree-icon">
                                                <svg viewBox="0 0 14 16" aria-hidden="true">
                                                    <path d="M3 1h5l3 3v11H3z" fill="#fffef0" stroke="#c0a840" stroke-width="1" />
                                                    <path d="M8 1v3h3" fill="#fff9c2" />
                                                    <path d="M4 7h6" stroke="#c0a840" stroke-width="0.7" />
                                                    <path d="M4 9h6" stroke="#c0a840" stroke-width="0.7" />
                                                    <path d="M4 11h4" stroke="#c0a840" stroke-width="0.7" />
                                                </svg>
                                            </span>
                                        {/if}
                                        <span class="node-label">{node.label}</span>
                                    </div>
                                </div>
                                {#if node.children && node.children.length > 0 && (node.expanded ?? true)}
                                    <ul class="tree-level child">
                                        {#each node.children as child}
                                            <li>
                                                <div class="tree-node">
                                                    {#if child.children && child.children.length > 0}
                                                        <button
                                                            type="button"
                                                            class="tree-toggle"
                                                            onclick={(e) => {
                                                                e.stopPropagation()
                                                                toggleTreeExpand(child)
                                                            }}
                                                            aria-label={(child.expanded ?? true) ? '收起' : '展开'}
                                                        >
                                                            {#if child.expanded ?? true}
                                                                <svg viewBox="0 0 12 12" aria-hidden="true">
                                                                    <polygon points="2,2 10,6 2,10" fill="#000000" />
                                                                </svg>
                                                            {:else}
                                                                <svg viewBox="0 0 12 12" aria-hidden="true">
                                                                    <polygon points="2,2 10,6 2,10" fill="#ffffff" stroke="#000000" stroke-width="1" />
                                                                </svg>
                                                            {/if}
                                                        </button>
                                                    {:else}
                                                        <span class="tree-toggle-placeholder"></span>
                                                    {/if}
                                                    <div
                                                        class="tree-node-inner"
                                                        class:selected={child.id === selectedTreeId}
                                                        role="button"
                                                        tabindex="0"
                                                        onclick={() => selectTreeNode(child)}
                                                        onkeydown={(e) => {
                                                            if (e.key === 'Enter' || e.key === ' ') selectTreeNode(child)
                                                        }}
                                                    >
                                                        {#if child.children && child.children.length > 0}
                                                            <span class="tree-icon">
                                                                {#if child.expanded ?? true}
                                                                    <svg viewBox="0 0 18 14" aria-hidden="true">
                                                                        <path d="M1 5h7l2 2h7v6H1z" fill="#ffd659" stroke="#c08a25" stroke-width="1" />
                                                                        <path d="M1 3h7l2 2H1z" fill="#ffe892" stroke="#c08a25" stroke-width="1" />
                                                                    </svg>
                                                                {:else}
                                                                    <svg viewBox="0 0 18 14" aria-hidden="true">
                                                                        <path d="M1 5h16v8H1z" fill="#ffd659" stroke="#c08a25" stroke-width="1" />
                                                                        <path d="M1 3h6l2 1h7v3H1z" fill="#ffe892" stroke="#c08a25" stroke-width="1" />
                                                                    </svg>
                                                                {/if}
                                                            </span>
                                                        {:else}
                                                            <span class="tree-icon">
                                                                <svg viewBox="0 0 14 16" aria-hidden="true">
                                                                    <path d="M3 1h5l3 3v11H3z" fill="#fffef0" stroke="#c0a840" stroke-width="1" />
                                                                    <path d="M8 1v3h3" fill="#fff9c2" />
                                                                    <path d="M4 7h6" stroke="#c0a840" stroke-width="0.7" />
                                                                    <path d="M4 9h6" stroke="#c0a840" stroke-width="0.7" />
                                                                    <path d="M4 11h4" stroke="#c0a840" stroke-width="0.7" />
                                                                </svg>
                                                            </span>
                                                        {/if}
                                                        <span class="node-label">{child.label}</span>
                                                    </div>
                                                </div>
                                                {#if child.children && child.children.length > 0 && (child.expanded ?? true)}
                                                    <ul class="tree-level grand">
                                                        {#each child.children as grand}
                                                            <li>
                                                                <div class="tree-node">
                                                                    <span class="tree-toggle-placeholder"></span>
                                                                    <div
                                                                        class="tree-node-inner"
                                                                        class:selected={grand.id === selectedTreeId}
                                                                        role="button"
                                                                        tabindex="0"
                                                                        onclick={() => selectTreeNode(grand)}
                                                                        onkeydown={(e) => {
                                                                            if (e.key === 'Enter' || e.key === ' ') selectTreeNode(grand)
                                                                        }}
                                                                    >
                                                                        <span class="tree-icon">
                                                                            <svg viewBox="0 0 14 16" aria-hidden="true">
                                                                                <path d="M3 1h5l3 3v11H3z" fill="#fffef0" stroke="#c0a840" stroke-width="1" />
                                                                                <path d="M8 1v3h3" fill="#fff9c2" />
                                                                                <path d="M4 7h6" stroke="#c0a840" stroke-width="0.7" />
                                                                                <path d="M4 9h6" stroke="#c0a840" stroke-width="0.7" />
                                                                                <path d="M4 11h4" stroke="#c0a840" stroke-width="0.7" />
                                                                            </svg>
                                                                        </span>
                                                                        <span class="node-label">{grand.label}</span>
                                                                    </div>
                                                                </div>
                                                            </li>
                                                        {/each}
                                                    </ul>
                                                {/if}
                                            </li>
                                        {/each}
                                    </ul>
                                {/if}
                            </li>
                        {/each}
                    </ul>
                </div>
            </div>
        {/if}
    {:else}
        <div bind:this={buttonRef} class="date-picker-button" class:disabled>
            {#if isEditingDisplay}
                <input class="date-picker-display-input" bind:this={displayInputRef} bind:value={displayInput} {disabled} onblur={handleDisplayBlur} onkeydown={handleDisplayKeydown} />
            {:else}
                <span class="date-text" role="textbox" tabindex="0" onclick={handleDisplayClick} onkeydown={handleDisplayKeydown}>
                    {displayText}
                </span>
            {/if}
            <button type="button" class="date-icon" onclick={togglePanel} {disabled}>
                <img src={`${import.meta.env.BASE_URL}img/hold/datebox_arrow.png`} alt="" class="date-icon-image" />
            </button>
        </div>

        {#if isOpen}
            <div bind:this={pickerRef} use:portal={document.body} class="date-picker-panel portal" style={panelStyle}>
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
                        {['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'][month]}
                        {year}
                    </span>
                    <button class="nav-button" onclick={nextMonth} type="button">›</button>
                    <button class="nav-button" onclick={nextYear} type="button">»</button>
                </div>

                <div class="weekdays">
                    {#each weekdayNames as day, i}
                        <div class="weekday" class:sun={i === 0} class:sat={i === 6}>{day}</div>
                    {/each}
                </div>

                <div class="days">
                    {#each calendarCells as cell}
                        {@const w = cell.date.getDay()}
                        <button
                            class="day"
                            class:today={isToday(cell.date)}
                            class:selected={isSelected(cell.date)}
                            class:base-selected={isBaseSelected(cell.date)}
                            class:disabled={isDisabled(cell.date)}
                            class:weekend={w === 0 || w === 6}
                            class:sun={w === 0}
                            class:sat={w === 6}
                            class:outside={!cell.isCurrentMonth}
                            onclick={() => selectDate(cell.date)}
                            type="button"
                        >
                            {cell.date.getDate()}
                        </button>
                    {/each}
                </div>

                {#if mode === 'datetime'}
                    <div class="time-inputs">
                        <div class="time-field">
                            <input
                                id="time-{id}"
                                type="text"
                                class="time-input"
                                bind:this={timeInputRef}
                                bind:value={timeInput}
                                onfocus={() => {
                                    isEditingTime = true
                                }}
                                onclick={(e) => {
                                    const target = e.currentTarget as HTMLInputElement
                                    const pos = target.selectionStart ?? 0
                                    if (pos <= 2) {
                                        selectTimeSegment('hour')
                                    } else if (pos <= 5) {
                                        selectTimeSegment('minute')
                                    } else {
                                        selectTimeSegment('second')
                                    }
                                }}
                                onblur={() => {
                                    const parsed = parseTimeString(timeInput)
                                    if (!parsed) {
                                        timeInput = formatTimeString(hours, minutes, seconds)
                                        isEditingTime = false
                                        return
                                    }
                                    hours = parsed.h
                                    minutes = parsed.m
                                    seconds = parsed.s
                                    const next = new Date(internalDate)
                                    next.setHours(hours, minutes, seconds)
                                    internalDate = next
                                    isEditingTime = false
                                }}
                                onkeydown={(e) => {
                                    if (e.key === 'Enter') {
                                        const parsed = parseTimeString(timeInput)
                                        if (!parsed) {
                                            timeInput = formatTimeString(hours, minutes, seconds)
                                            isEditingTime = false
                                            return
                                        }
                                        hours = parsed.h
                                        minutes = parsed.m
                                        seconds = parsed.s
                                        const next = new Date(internalDate)
                                        next.setHours(hours, minutes, seconds)
                                        internalDate = next
                                        isEditingTime = false
                                    }
                                }}
                            />
                            <div class="time-stepper">
                                <button
                                    type="button"
                                    class="time-stepper-btn up"
                                    onmousedown={(event) => {
                                        event.preventDefault()
                                        adjustTimeBySegment(1)
                                    }}
                                >
                                    <span class="date-picker-year-symbol">∧</span>
                                </button>
                                <button
                                    type="button"
                                    class="time-stepper-btn down"
                                    onmousedown={(event) => {
                                        event.preventDefault()
                                        adjustTimeBySegment(-1)
                                    }}
                                >
                                    <span class="date-picker-year-symbol">∨</span>
                                </button>
                            </div>
                        </div>
                    </div>
                {/if}

                <div class="panel-footer" class:has-time={mode === 'datetime'}>
                    <div class="panel-actions">
                        <button type="button" class="panel-action-button" onclick={setToday}>今天</button>
                        <button type="button" class="panel-action-button primary" onclick={confirmSelection}>确定</button>
                        <button type="button" class="panel-action-button" onclick={closePanel}>关闭</button>
                    </div>
                </div>
            </div>
        {/if}
    {/if}
</ResponsiveBox>

<style>
    .date-picker-year-wrapper {
        position: relative;
        width: 100%;
        height: 100%;
    }

    .date-picker-year-wrapper.invalid .date-picker-year-input {
        outline: calc(1px * var(--scale-ratio, 1)) solid #ef4444;
    }

    .date-picker-year-input {
        width: 100%;
        height: 100%;
        border: none;
        background: transparent;
        padding: 0 calc(20px * var(--scale-ratio, 1)) 0 calc(8px * var(--scale-ratio, 1));
        appearance: textfield;
        -moz-appearance: textfield;
        color: inherit;
        font-size: inherit;
        font-family: inherit;
    }

    .date-picker-year-input::-webkit-outer-spin-button,
    .date-picker-year-input::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }

    .date-picker-year-stepper {
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        width: calc(20px * var(--scale-ratio, 1));
        display: flex;
        flex-direction: column;
    }

    .date-picker-year-error {
        position: absolute;
        top: 0;
        bottom: 0;
        left: 100%;
        transform: translate(calc(6px * var(--scale-ratio, 1)), 0);
        background: #ffffe1;
        color: #000000;
        padding: calc(2px * var(--scale-ratio, 1)) calc(8px * var(--scale-ratio, 1));
        border-radius: 0;
        border: calc(1px * var(--scale-ratio, 1)) solid #e5d48a;
        font-size: calc(12px * var(--scale-ratio, 1));
        white-space: nowrap;
        z-index: 10;
        display: flex;
        align-items: center;
    }

    .date-picker-year-error::before,
    .date-picker-year-error::after {
        content: '';
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        width: 0;
        height: 0;
        border-top: calc(6px * var(--scale-ratio, 1)) solid transparent;
        border-bottom: calc(6px * var(--scale-ratio, 1)) solid transparent;
    }

    .date-picker-year-error::before {
        right: 100%;
        border-right: calc(6px * var(--scale-ratio, 1)) solid #e5d48a;
    }

    .date-picker-year-error::after {
        right: calc(100% - 1px);
        border-right: calc(6px * var(--scale-ratio, 1)) solid #ffffe1;
    }

    .date-picker-year-btn {
        flex: 1;
        border: none;
        border-left: calc(1px * var(--scale-ratio, 1)) solid rgb(26, 156, 254);
        background: #daeef5;
        color: #333333;
        font-size: calc(10px * var(--scale-ratio, 1));
        line-height: 1;
        padding: 0;
        cursor: pointer;
        box-sizing: border-box;
    }

    .date-picker-year-btn:first-child {
        border-bottom: calc(1px * var(--scale-ratio, 1)) solid rgb(26, 156, 254);
    }

    .date-picker-year-btn:hover:not(:disabled) {
        background: #c0d8e8;
    }

    .date-picker-year-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .date-picker-year-symbol {
        display: inline-block;
        transform: scaleY(0.5);
        transform-origin: center;
        font-weight: bolder;
    }

    .date-picker-button {
        display: flex;
        align-items: center;
        width: 100%;
        height: 100%;
        min-width: 0;
        padding: inherit;
        border: none;
        border-radius: inherit;
        background: transparent;
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
        padding-right: calc(4px * var(--scale-ratio, 1));
    }

    .select-button {
        padding-right: 0;
    }

    .date-picker-button:hover:not(.disabled) {
        background: transparent;
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

    .date-picker-display-input {
        flex: 1;
        border: none;
        background: transparent;
        padding: 0;
        min-width: 0;
        color: inherit;
        font-size: inherit;
        font-family: inherit;
        font-weight: inherit;
        line-height: inherit;
        outline: none;
    }

    .date-icon {
        flex-shrink: 0;
        width: calc(22px * var(--scale-ratio, 1));
        height: calc(22px * var(--scale-ratio, 1));
        display: flex;
        align-items: center;
        justify-content: center;
        border: none;
        background: transparent;
        padding: 0;
        cursor: pointer;
    }

    .select-icon {
        background-color: #daeef5;
        width: calc(25px * var(--scale-ratio, 1));
        height: 100%;
        align-self: stretch;
        padding: 0;
    }

    .select-icon:hover {
        background-color: #6ba6f3;
    }

    .select-button .date-text {
        display: block;
        font-size: calc(16px * var(--scale-ratio, 1));
        line-height: calc(30px * var(--scale-ratio, 1));
    }

    .date-icon-image {
        width: calc(18px * var(--scale-ratio, 1));
        height: calc(24px * var(--scale-ratio, 1));
        display: block;
    }

    .select-panel {
        max-width: none;
        min-width: 0;
        padding: 0;
    }

    .select-options {
        display: flex;
        flex-direction: column;
    }

    .select-option {
        width: 100%;
        height: calc(28px * var(--scale-ratio, 1));
        border: none;
        background: #ffffff;
        text-align: left;
        padding: 0 calc(8px * var(--scale-ratio, 1));
        cursor: pointer;
        font-size: calc(14px * var(--scale-ratio, 1));
        color: #303133;
    }

    .select-option:hover {
        background: #f5f7fa;
    }

    .select-option.selected {
        background: #409eff;
        color: #ffffff;
    }

    .tree-select-list {
        max-height: calc(260px * var(--scale-ratio, 1));
        overflow: auto;
        padding: calc(4px * var(--scale-ratio, 1)) calc(4px * var(--scale-ratio, 1));
        box-sizing: border-box;
    }

    .tree-level {
        list-style: none;
        padding-left: 0;
        margin: 0;
    }

    .tree-level.root > li + li {
        margin-top: calc(2px * var(--scale-ratio, 1));
    }

    .tree-level.child {
        padding-left: calc(18px * var(--scale-ratio, 1));
        margin-top: calc(2px * var(--scale-ratio, 1));
    }

    .tree-level.grand {
        padding-left: calc(32px * var(--scale-ratio, 1));
        margin-top: calc(2px * var(--scale-ratio, 1));
    }

    .tree-node {
        display: flex;
        align-items: center;
        gap: calc(2px * var(--scale-ratio, 1));
    }

    .tree-node-inner {
        display: inline-flex;
        align-items: center;
        gap: calc(4px * var(--scale-ratio, 1));
        font-size: calc(14px * var(--scale-ratio, 1));
        color: #333333;
        padding: 0 calc(2px * var(--scale-ratio, 1));
        border-radius: calc(2px * var(--scale-ratio, 1));
        border: calc(1px * var(--scale-ratio, 1)) solid transparent;
        cursor: pointer;
    }

    .tree-node-inner.selected {
        background-color: rgb(201, 221, 245);
        border-color: rgb(201, 221, 245);
    }

    .tree-toggle {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: calc(16px * var(--scale-ratio, 1));
        height: calc(16px * var(--scale-ratio, 1));
        border: none;
        padding: 0;
        margin: 0;
        background: transparent;
        cursor: pointer;
    }

    .tree-toggle svg {
        width: 100%;
        height: 100%;
        display: block;
    }

    .tree-toggle-placeholder {
        display: inline-block;
        width: calc(16px * var(--scale-ratio, 1));
        height: calc(16px * var(--scale-ratio, 1));
    }

    .tree-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: calc(16px * var(--scale-ratio, 1));
        height: calc(16px * var(--scale-ratio, 1));
        flex-shrink: 0;
    }

    .tree-icon svg {
        width: 100%;
        height: 100%;
        display: block;
    }

    .node-label {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: calc(220px * var(--scale-ratio, 1));
    }

    .date-picker-panel {
        position: absolute;
        top: 100%;
        left: 0;
        margin-top: calc(4px * var(--scale-ratio, 1));
        background: #ffffff;
        border: calc(1px * var(--scale-ratio, 1)) solid #c0c4cc;
        border-radius: 0;
        padding: calc(1px * var(--scale-ratio, 1));
        z-index: 1000;
        width: 100%;
        max-width: calc(280px * var(--scale-ratio, 1));
        min-width: calc(240px * var(--scale-ratio, 1));
        color: #303133;
        box-shadow: 0 0 calc(4px * var(--scale-ratio, 1)) rgba(0, 0, 0, 0.15);
    }

    /* 当以 portal 方式挂载到 body 时，使用 fixed 定位并按内容宽度显示 */
    .date-picker-panel.portal {
        position: fixed;
        width: auto;
        max-width: calc(320px * var(--scale-ratio, 1));
        min-width: calc(240px * var(--scale-ratio, 1));
        margin-top: 0;
    }

    .date-picker-panel.portal.select-panel,
    .date-picker-panel.portal.tree-panel {
        min-width: 0;
        max-width: none;
    }

    .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0 calc(2px * var(--scale-ratio, 1)) calc(4px * var(--scale-ratio, 1));
        background-color: #daeef5;
        height: calc(30px * var(--scale-ratio, 1));
    }

    .nav-button {
        background: transparent;
        border: none;
        color: #606266;
        cursor: pointer;
        padding: 0 calc(4px * var(--scale-ratio, 1));
        border-radius: 0;
        font-size: calc(14px * var(--scale-ratio, 1));
        transition: all 0.2s ease;
    }

    .nav-button:hover {
        color: #409eff;
        background-color: #f2f6fc;
    }

    .month-year {
        font-size: calc(16px * var(--scale-ratio, 1));
    }

    .weekdays {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: calc(2px * var(--scale-ratio, 1));
        background-color: #f5f5f5;
        height: calc(25px * var(--scale-ratio, 1));
    }

    .weekday {
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: calc(15px * var(--scale-ratio, 1));
        color: #8d8d8d;
        font-weight: 600;
        padding: 0;
    }

    .days {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: calc(2px * var(--scale-ratio, 1));
        padding-top: calc(4px * var(--scale-ratio, 1));
    }

    .day {
        aspect-ratio: 1.1;
        border: none;
        background: transparent;
        color: #303133;
        font-size: calc(14px * var(--scale-ratio, 1));
        cursor: pointer;
        border-radius: 0;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .day:hover:not(.disabled):not(.selected) {
        background: #f2f6fc;
    }

    .day.base-selected:not(.selected) {
        color: #409eff;
        font-weight: 600;
    }

    .day.selected {
        background: #409eff;
        color: #ffffff;
        font-weight: 600;
    }

    .day.disabled {
        color: #c0c4cc;
        opacity: 1;
        cursor: not-allowed;
    }

    .day.sun:not(.selected):not(.disabled):not(.outside) {
        color: #cc2222;
    }

    .day.sat:not(.selected):not(.disabled):not(.outside) {
        color: #00ee00;
    }

    .day.outside.sun:not(.selected):not(.disabled) {
        color: #d3a3a6;
    }

    .day.outside.sat:not(.selected):not(.disabled) {
        color: #9fd7a4;
    }

    .day.outside:not(.selected):not(.disabled):not(.sun):not(.sat) {
        color: #c0c4cc;
    }

    .time-inputs {
        display: flex;
        align-items: center;
        justify-content: center;
        margin-top: 0;
        padding: 0 calc(4px * var(--scale-ratio, 1));
        border-top: none;
        box-sizing: border-box;
    }

    .time-field {
        position: relative;
        width: 100%;
        height: calc(30px * var(--scale-ratio, 1));
        border: calc(1px * var(--scale-ratio, 1)) solid rgb(26, 156, 254);
        background: #ffffff;
        box-sizing: border-box;
    }

    .time-input {
        width: 100%;
        height: 100%;
        border: none;
        background: transparent;
        padding: 0 calc(20px * var(--scale-ratio, 1)) 0 calc(8px * var(--scale-ratio, 1));
        color: #303133;
        font-size: calc(15px * var(--scale-ratio, 1));
        text-align: left;
        outline: none;
        box-sizing: border-box;
    }

    .time-stepper {
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        width: calc(20px * var(--scale-ratio, 1));
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
    }

    .time-stepper-btn {
        flex: 1;
        border: none;
        border-left: calc(1px * var(--scale-ratio, 1)) solid rgb(26, 156, 254);
        background: #daeef5;
        padding: 0;
        font-size: calc(10px * var(--scale-ratio, 1));
        line-height: 1;
        cursor: pointer;
    }

    .time-stepper-btn.up {
        border-bottom: calc(1px * var(--scale-ratio, 1)) solid rgb(26, 156, 254);
    }

    .time-stepper-btn:hover:not(:disabled) {
        background: #c0d8e8;
    }

    .panel-actions {
        display: flex;
        justify-content: center;
        gap: calc(47px * var(--scale-ratio, 1));
        height: calc(35px * var(--scale-ratio, 1));
        background-color: #f5f5f5;
    }

    .panel-action-button {
        min-width: auto;
        height: auto;
        padding: 0 calc(4px * var(--scale-ratio, 1));
        border-radius: 0;
        border: none;
        background: transparent;
        color: #8d8d8d;
        font-size: calc(15px * var(--scale-ratio, 1));
        font-weight: 600;
        cursor: pointer;
        box-sizing: border-box;
    }

    .panel-action-button:hover:not(:disabled) {
        background: transparent;
        border-color: transparent;
        text-decoration: underline;
    }

    .panel-action-button.primary:hover:not(:disabled) {
        background: transparent;
        border-color: transparent;
        text-decoration: underline;
    }
</style>
