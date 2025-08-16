/**
 * draw-mode.util.ts
 * 绘画模式相关纯函数工具。
 */

import type { DomNode } from '../../types/dom-node.types'

export interface RelativeRect {
    left: number
    top: number
    width: number
    height: number
}

/**
 * 根据起止点与父元素 DOMRect 计算相对矩形。
 */
export function calculateRelativeRect(
    start: { x: number; y: number },
    end: { x: number; y: number },
    parentRect: DOMRect,
    scaleFactor = 1
): RelativeRect {
    // 先计算去除缩放后的相对像素值
    const x1Px = (start.x - parentRect.left) / scaleFactor
    const y1Px = (start.y - parentRect.top) / scaleFactor
    const x2Px = (end.x - parentRect.left) / scaleFactor
    const y2Px = (end.y - parentRect.top) / scaleFactor

    // 使用未缩放尺寸计算百分比。getBoundingClientRect 返回的 width/height 已包含 scale，需除以 scaleFactor
    const effectiveWidth = parentRect.width / scaleFactor
    const effectiveHeight = parentRect.height / scaleFactor

    const leftPercent = (Math.min(x1Px, x2Px) / effectiveWidth) * 100
    const topPercent = (Math.min(y1Px, y2Px) / effectiveHeight) * 100
    const widthPercent = (Math.abs(x2Px - x1Px) / effectiveWidth) * 100
    const heightPercent = (Math.abs(y2Px - y1Px) / effectiveHeight) * 100

    return {
        left: leftPercent,
        top: topPercent,
        width: widthPercent,
        height: heightPercent
    }
}

/**
 * 将给定屏幕坐标限制在目标 DOMRect 内部。
 */
export function clampPointToRect(point: { x: number; y: number }, rect: DOMRect): { x: number; y: number } {
    return {
        x: Math.min(Math.max(point.x, rect.left), rect.right),
        y: Math.min(Math.max(point.y, rect.top), rect.bottom)
    }
}

/**
 * 生成绘制完成后的新 DomNode。
 */
export function createDrawNode(rect: RelativeRect): DomNode {
    const id = (globalThis.crypto?.randomUUID?.() ?? `node-${Date.now()}`)
    return {
        id,
        dataId: id,
        componentType: 'SimpleBox',
        styles: {
            position: 'absolute',
            left: `${rect.left}%`,
            top: `${rect.top}%`,
            width: `${rect.width}%`,
            height: `${rect.height}%`,
            background: '#ffffff',
            border: 'calc(1px * var(--scale-ratio, 1)) solid #94a3b8',
            overflow: 'hidden',
            pointerEvents: 'auto'
        },
        children: []
    }
}

/**
 * 深度优先查找 node。
 */
export function findNodeById(root: DomNode, targetId: string): DomNode | null {
    if ((root.dataId ?? root.id) === targetId) return root
    for (const child of root.children ?? []) {
        const found = findNodeById(child, targetId)
        if (found) return found
    }
    return null
}