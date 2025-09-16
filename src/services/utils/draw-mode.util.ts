/**
 * draw-mode.util.ts
 * 绘画模式相关纯函数工具。
 */

import type { DomNode } from '../../types/dom-node.types'
import blocksConfig from '../../components/blocks/blocks.config.json'
import { domTree } from '../../stores/dom-tree.store.svelte'

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
export interface CreateDrawNodeOptions {
    componentType?: string;
    presetStyles?: Record<string, any>;
}

export function createDrawNode(rect: RelativeRect, options: CreateDrawNodeOptions = {}): DomNode {
    const { componentType = 'SimpleBox', presetStyles = {} } = options;
    const id = (globalThis.crypto?.randomUUID?.() ?? `node-${Date.now()}`);
    // 根据 blocks.config.json 获取中文名称
    const matched = (blocksConfig as any[]).find(b => b.type === componentType)
    const baseName = matched?.nameZh ?? componentType
    // 生成唯一名称，若已存在则追加计数
    const names = new Set<string>()
    function collect(node: any) {
        const attrName = node.attributes?.['data-name'] as string | undefined
        if (attrName) names.add(attrName)
        node.children?.forEach(collect)
    }
    collect(domTree)
    let displayName = baseName
    if (names.has(displayName)) {
        let index = 1
        while (names.has(`${baseName} ${index}`)) {
            index++
        }
        displayName = `${baseName} ${index}`
    }
    return {
        id,
        componentType,
        styles: {
            position: 'absolute',
            left: `${rect.left}%`,
            top: `${rect.top}%`,
            width: `${rect.width}%`,
            height: `${rect.height}%`,
            backgroundColor: 'rgba(30, 41, 59, 0.15)',
            boxSizing: 'border-box',
            overflow: 'hidden',
            pointerEvents: 'auto',
            ...presetStyles
        },
        attributes: {
            'data-name': displayName
        },
        children: []
    };
}

/**
 * 深度优先查找 node。
 */
export function findNodeById(root: DomNode, targetId: string): DomNode | null {
    if (root.id === targetId) return root
    for (const child of root.children ?? []) {
        const found = findNodeById(child, targetId)
        if (found) return found
    }
    return null
}