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

let listenerAttached = false

function attachListener() {
    if (listenerAttached) return
    listenerAttached = true
    document.addEventListener('keydown', (e) => {
        for (const sc of shortcuts) {
            const isMatch = (sc as any).match(e)
            if (isMatch) {
                sc.handler(e)
                e.preventDefault()
                break
            }
        }
    })
}

/**
 * 注册快捷键
 * @param combo 组合键描述，如 "Ctrl+E"
 * @param handler 触发时回调
 * @returns 取消函数
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
