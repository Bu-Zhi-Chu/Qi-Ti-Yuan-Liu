import type { Component } from 'svelte'

/**
 * 基于 Vite 的 `import.meta.glob` 实现通用组件加载器。
 * 运行时接收诸如 "../core/SimpleBox.svelte" 的相对路径，
 * 自动匹配对应的异步 chunk 并返回组件模块。
 */

// 收集所有组件（Svelte/TS/JS），懒加载（非 eager）
// 这里使用绝对相对路径：以当前文件为基准，上上级到 src，再到 components
const modules = import.meta.glob('../../components/blocks/**/*.{svelte,ts,js}') as Record<string, () => Promise<{ default: Component }>>

/**
 * 根据 blocks.config.json 中的 `item.path`（如 "../core/SimpleBox.svelte"）加载组件。
 * @param relativePath 与 blocks.config.json 中保持一致的组件路径
 */
export async function loadComponent(relativePath: string): Promise<{ default: Component }> {
    // 统一大小写并去除开头的 ./ 或 ../
    const normalized = relativePath.replace(/^([./]+)/, '').toLowerCase()

    // 在模块表里查找以该路径结尾的 key
    const matchKey = Object.keys(modules).find((k) => k.toLowerCase().endsWith(normalized))

    if (!matchKey) {
        throw new Error(`无法找到组件: ${relativePath}`)
    }

    return modules[matchKey]()
}