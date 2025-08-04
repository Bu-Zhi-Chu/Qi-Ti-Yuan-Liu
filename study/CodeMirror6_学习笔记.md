# CodeMirror 6 学习笔记

> 本笔记基于官方文档及实际集成经验整理，重点关注在 **Svelte5 + Vite** 项目中的最佳实践与踩坑点。

## 1. 核心概念

- **模块化架构**：CodeMirror 6 拆分为数十个独立子包，通过插件系统按需组合功能，提升性能与可维护性。
- **EditorState / EditorView**：前者是不可变编辑器状态，后者负责渲染并响应交互；配合 `Transaction` 驱动修改。
- **Extensions**：功能单元（插件），统一通过 `extensions` 数组传入，包括主题、语言、高亮、行为等。
- **decorations & ranges**：用于标记高亮、折叠、占位符等。

## 2. 安装与基本集成

```bash
pnpm add codemirror
# 常用扩展
pnpm add @codemirror/basic-setup @codemirror/lang-html @codemirror/theme-one-dark
# Svelte 封装组件（二选一）
pnpm add svelte-codemirror-editor # 零配置上手
# 或
pnpm add codemirror-svelte-modules  # 更贴近原生 API
```

### 组件示例（`svelte-codemirror-editor`）
```svelte
<script lang="ts">
  import SvelteCodeMirrorEditor from 'svelte-codemirror-editor';
  let code = `<h1>Hello CodeMirror 6!</h1>`;
</script>
<SvelteCodeMirrorEditor bind:code extensions={[basicSetup, html()]} />
```

## 3. 常用扩展

| 扩展包                         | 功能                              |
| ------------------------------ | --------------------------------- |
| `@codemirror/basic-setup`      | 光标、撤销/重做、括号补全等基础交互 |
| `@codemirror/lang-xxx`         | 各语言语法插件，如 `lang-javascript`|
| `@codemirror/theme-one-dark`   | 主题示例                           |
| `@codemirror/view`             | 编辑器视图及样式控制               |
| `@codemirror/commands`         | 命令集合（查找、格式化等）         |

> **性能提示**：对于大文件可启用 `@codemirror/language-data` 中的 `foldGutter`、`syntaxTree` 懒加载。

## 4. Svelte5 集成要点

1. **响应式绑定**：使用 `bind:docStore` 或 `on:change` 事件同步数据。
2. **动态扩展**：通过 `view.dispatch({ effects: StateEffect.appendConfig.of(ext) })` 按需注入插件。
3. **SSR 注意**：初始化必须在浏览器环境 (`onMount`) 中执行以避免 Hydration 报错。
4. **样式隔离**：CodeMirror 默认样式为全局，通过 `:global(.cm-editor)` 控制作用域。

## 5. 踩坑 & 注意事项

- **光标位置丢失**：更新 `doc` 时务必使用 `view.dispatch({ changes })`，直接重建实例会重置选区。
- **中文输入法兼容**：需保留 `@codemirror/basic-setup` 内的 `drawSelection` 与 `inputHandler`。
- **暗黑主题切换**：动态替换主题扩展而非修改 DOM 类名，避免状态不一致。
- **Vite HMR**：确保扩展引用版本一致；热更新时清理旧视图防止内存泄漏。

## 6. 参考链接

- 官方指南 <https://codemirror.net/6/docs>
- Svelte REPL 示例 <https://svelte.dev/repl/91649ba3e0ce4122b3b34f3a95a00104?version=3.50.0>
- svelte-codemirror-editor <https://www.npmjs.com/package/svelte-codemirror-editor>

## 7. 2025 更新速览
- 2025-07 `@codemirror/view` 6.38.1 修复 macOS Alt 组合键误触发及极窄编辑器布局错误 <mcreference link="https://codemirror.net/docs/changelog/" index="1">1</mcreference>
- 2025-06 `@codemirror/view` 6.38.0 新增 `after` 定位 `gutter`，左到右布局可将 gutter 放置内容右侧 <mcreference link="https://codemirror.net/docs/changelog/" index="1">1</mcreference>
- 2025-05 `showDialog` API 引入，快捷创建通知 / 提示面板 <mcreference link="https://codemirror.net/docs/changelog/" index="1">1</mcreference>

> **升级提示**：升级子包时保持版本一致；同时更新 `@codemirror/language`, `@codemirror/search` 等以避免 peer 依赖冲突。