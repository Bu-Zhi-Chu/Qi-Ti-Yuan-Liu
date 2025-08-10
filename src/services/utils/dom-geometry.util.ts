/**
 * DOM Geometry Utility
 * -------------------------------------------------------------
 * 提供基于 nodeId（组件统一分配到 DOM 元素的 data-node-id 属性）
 * 的常用几何计算函数，便于各业务（如快捷键服务、拖拽、命令面板等）
 * 判断鼠标是否在指定元素内部并获取相对坐标。
 *
 * 使用约定：
 * 1. 所有需要被识别的 DOM 元素均 **必须** 带有 `data-node-id="<nodeId>"` 属性。
 * 2. nodeId 应保持全局唯一。
 * 3. 本工具纯函数实现，不持有任何状态，可放心复用。
 * -------------------------------------------------------------
 */

export interface Position {
    /** 距离元素左边的像素 */
    x: number
    /** 距离元素上边的像素 */
    y: number
}

/**
 * 根据 nodeId 获取对应元素；不存在时返回 null。
 */
export function getElementByNodeId(nodeId: string): HTMLElement | null {
    return document.querySelector<HTMLElement>(`[data-node-id="${nodeId}"]`)
}

/**
 * 判断鼠标是否位于指定 nodeId 对应的元素内部。
 *
 * @param nodeId 元素唯一标识（绑定在 data-node-id）
 * @param evt     鼠标事件对象
 * @returns       位于内部返回 true，否则 false
 */
export function isMouseInsideNode(nodeId: string, evt: MouseEvent): boolean {
    const el = getElementByNodeId(nodeId)
    if (!el) return false
    const rect = el.getBoundingClientRect()
    const { clientX, clientY } = evt
    return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom
}

/**
 * 计算鼠标在元素内部的相对坐标（左上角为原点）。
 * 超出范围或元素不存在时返回 null。
 *
 * @param nodeId 元素唯一标识
 * @param evt     鼠标事件
 * @returns       相对坐标对象或 null
 */
export function getMousePositionInNode(nodeId: string, evt: MouseEvent): Position | null {
    const el = getElementByNodeId(nodeId)
    if (!el) return null
    const rect = el.getBoundingClientRect()
    const { clientX, clientY } = evt
    if (!isMouseInsideNode(nodeId, evt)) return null
    return {
        x: clientX - rect.left,
        y: clientY - rect.top
    }
}

/**
 * 获取指定 nodeId 元素的 DOMRect；若元素不存在返回 null。
 */
export function getNodeRect(nodeId: string): DOMRect | null {
    const el = getElementByNodeId(nodeId)
    return el ? el.getBoundingClientRect() : null
}