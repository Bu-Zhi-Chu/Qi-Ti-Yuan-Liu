/**
 * Shortcut Manager Service
 * 统一注册/注销键盘快捷键，支持组合键（如 Ctrl+E）。
 * 未来可扩展到区分区域、鼠标状态等复杂交互。
 */

export type ShortcutHandler = (event: KeyboardEvent) => void

interface Shortcut {
    combo: string
    handler: ShortcutHandler
}

const shortcuts: Shortcut[] = []

/** 空格按压处理集合 */
interface SpaceHandlers {
    hold: ShortcutHandler
    release: ShortcutHandler
}
const spaceHandlers: SpaceHandlers[] = []
let spacePressed = false

// Alt 按压处理集合
interface AltHandlers {
    hold: ShortcutHandler
    release: ShortcutHandler
}
const altHandlers: AltHandlers[] = []
let altPressed = false

// 鼠标滚轮处理集合
interface WheelHandlers {
    up: (event: WheelEvent) => void
    down: (event: WheelEvent) => void
    modifier: 'none' | 'alt' | 'shift' | 'ctrl' | 'meta'
}
const wheelHandlers: WheelHandlers[] = []

/** 解析组合键字符串，返回布尔值判断函数 */
function matchFactory(combo: string) {
    const parts = combo
        .toLowerCase()
        .split('+')
        .map((p) => p.trim())
    return (event: KeyboardEvent) => {
        // 主键（最后一个）
        const key = parts[parts.length - 1]
        if (event.key.toLowerCase() !== key) return false

        // 修饰键
        const needCtrl = parts.includes('ctrl') || parts.includes('control')
        const needShift = parts.includes('shift')
        const needAlt = parts.includes('alt')
        const needMeta = parts.includes('meta')

        return event.ctrlKey === needCtrl && event.shiftKey === needShift && event.altKey === needAlt && event.metaKey === needMeta
    }
}

/**
 * 注册空格长按/松开事件
 * @param holdHandler 长按触发（keydown 首次识别）
 * @param releaseHandler 松开触发（keyup）
 * @returns 取消函数
 */
export function registerSpacePressRelease(holdHandler: ShortcutHandler, releaseHandler: ShortcutHandler): () => void {
    const pair: SpaceHandlers = { hold: holdHandler, release: releaseHandler }
    spaceHandlers.push(pair)
    attachListener()

    return () => {
        const idx = spaceHandlers.indexOf(pair)
        if (idx !== -1) spaceHandlers.splice(idx, 1)
    }
}

// Alt 长按/松开注册
export function registerAltPressRelease(holdHandler: ShortcutHandler, releaseHandler: ShortcutHandler): () => void {
    const pair: AltHandlers = { hold: holdHandler, release: releaseHandler }
    altHandlers.push(pair)
    attachListener()
    return () => {
        const idx = altHandlers.indexOf(pair)
        if (idx !== -1) altHandlers.splice(idx, 1)
    }
}

// 鼠标滚轮注册
export function registerMouseWheel(
    upHandler: (event: WheelEvent) => void,
    downHandler: (event: WheelEvent) => void,
    options: { modifier?: 'none' | 'alt' | 'shift' | 'ctrl' | 'meta' } = {}
): () => void {
    const { modifier = 'none' } = options
    const pair: WheelHandlers = { up: upHandler, down: downHandler, modifier }
    wheelHandlers.push(pair)
    attachListener()
    return () => {
        const idx = wheelHandlers.indexOf(pair)
        if (idx !== -1) wheelHandlers.splice(idx, 1)
    }
}

let listenerAttached = false

function attachListener() {
    if (listenerAttached) return
    listenerAttached = true
    document.addEventListener('keydown', (e) => {
        // 空格按下处理（只触发一次，避免重复触发）
        if ((e.code === 'Space' || e.key === ' ') && !spacePressed) {
            spacePressed = true
            spaceHandlers.forEach((h) => h.hold(e))
        }
        // Alt 按下处理（只触发一次，避免重复触发）
        if ((e.key === 'Alt' || e.code === 'AltLeft' || e.code === 'AltRight') && !altPressed) {
            altPressed = true
            altHandlers.forEach((h) => h.hold(e))
        }
        for (const sc of shortcuts) {
            const isMatch = (sc as any).match(e)
            if (isMatch) {
                sc.handler(e)
                e.preventDefault()
                break
            }
        }
    })

    // 监听鼠标滚轮
    document.addEventListener('wheel', (e) => {
        wheelHandlers.forEach((h) => {
            const isAllowed =
                h.modifier === 'none' ||
                (h.modifier === 'alt' && e.altKey) ||
                (h.modifier === 'shift' && e.shiftKey) ||
                (h.modifier === 'ctrl' && e.ctrlKey) ||
                (h.modifier === 'meta' && e.metaKey)
            if (!isAllowed) return
            if (e.deltaY < 0) h.up(e)
            else if (e.deltaY > 0) h.down(e)
        })
    })

    // 监听空格/Alt 松开
    document.addEventListener('keyup', (e) => {
        if ((e.code === 'Space' || e.key === ' ') && spacePressed) {
            spacePressed = false
            spaceHandlers.forEach((h) => h.release(e))
        }
        if ((e.key === 'Alt' || e.code === 'AltLeft' || e.code === 'AltRight') && altPressed) {
            altPressed = false
            altHandlers.forEach((h) => h.release(e))
        }
    })
}

/**
 * 注册快捷键
 * @param combo 组合键描述，如 "Ctrl+E"
 * @param handler 触发时回调
 * @returns 取消函数
 */
/**
 * 注册普通组合键快捷键（keydown）
 */
export function registerShortcut(combo: string, handler: ShortcutHandler): () => void {
    const sc: Shortcut & { match: (e: KeyboardEvent) => boolean } = {
        combo,
        handler,
        match: matchFactory(combo)
    } as any
    shortcuts.push(sc)
    attachListener()

    // 返回注销函数
    return () => {
        const idx = shortcuts.indexOf(sc)
        if (idx !== -1) shortcuts.splice(idx, 1)
    }
}

// 鼠标移动处理集合
type MouseMoveHandler = (event: MouseEvent) => void
const moveHandlers: MouseMoveHandler[] = []
export function registerMouseMove(handler: MouseMoveHandler): () => void {
    moveHandlers.push(handler)
    return () => {
        const idx = moveHandlers.indexOf(handler)
        if (idx !== -1) moveHandlers.splice(idx, 1)
    }
}

// 鼠标左键按压/松开处理集合
interface MouseLeftHandlers { hold: (e: MouseEvent) => void; release: (e: MouseEvent) => void }
const leftHandlers: MouseLeftHandlers[] = []
export function registerMouseLeftPressRelease(hold: MouseMoveHandler, release: MouseMoveHandler): () => void {
    const pair: MouseLeftHandlers = { hold, release }
    leftHandlers.push(pair)
    attachListener()
    return () => {
        const idx = leftHandlers.indexOf(pair)
        if (idx !== -1) leftHandlers.splice(idx, 1)
    }
}

// 监听鼠标移动
document.addEventListener('mousemove', (e) => {
    moveHandlers.forEach((h) => h(e))
})

// 监听鼠标左键按压/松开
document.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
        leftHandlers.forEach((h) => h.hold(e))
    }
})
document.addEventListener('mouseup', (e) => {
    if (e.button === 0) {
        leftHandlers.forEach((h) => h.release(e))
    }
})
