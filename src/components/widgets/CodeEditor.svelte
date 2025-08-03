<!--
  CodeEditor.svelte
  ------------------
  代码编辑器组件（基于 CodeMirror 6）

  功能：
  1. 在 Svelte5 中提供可双向绑定的代码编辑器。
  2. 暴露 run/reset 按钮点击事件（由父组件决定是否传递）。
  3. 提供主题、语言、只读等常用配置。

  使用示例：
  ```svelte
  <CodeEditor bind:code language="javascript" on:run={runCode} on:reset={resetCode} />
  ```
  注意：必须显式声明父组件中的 `code` 变量，以便实现双向绑定。
-->
<script lang="ts">
    import { onMount, onDestroy, createEventDispatcher } from 'svelte'
    import { EditorState, type Extension } from '@codemirror/state'
    import { EditorView, keymap, lineNumbers } from '@codemirror/view'
    import { defaultKeymap, history } from '@codemirror/commands'
    import { javascript } from '@codemirror/lang-javascript'
    import { lintGutter, linter } from '@codemirror/lint'
    import { oneDark } from '@codemirror/theme-one-dark'

    // --------------------------- Props ---------------------------
    /** 编辑器当前代码内容 (双向绑定) */
    export let code: string = ''
    /** 语言类型 (目前仅支持 javascript，可扩展) */
    export let language: 'javascript' | string = 'javascript'
    /** 是否只读 */
    export let readonly: boolean = false
    /** 主题 (仅提供 oneDark，可扩展) */
    export let theme: 'one-dark' | 'default' = 'one-dark'
    /** 编辑器高度 */
    export let height = '100%'

    const dispatch = createEventDispatcher()
    let editorContainer: HTMLDivElement | null = null
    let view: EditorView | null = null

    // --------------------------- Helpers ---------------------------
    function buildExtensions(): Extension[] {
        const exts: Extension[] = [
            keymap.of(defaultKeymap),
            history(),
            lineNumbers(),
            EditorView.updateListener.of((v) => {
                if (v.docChanged) {
                    // 细粒度同步外部 code
                    code = v.state.doc.toString()
                    dispatch('update', { code })
                }
            })
        ]

        if (theme === 'one-dark') exts.push(oneDark)
        if (language === 'javascript') exts.push(javascript())

        // 简单 Lint 示例 (可替换为 eslint-wasm)
        exts.push(lintGutter())
        exts.push(
            linter((view) => {
                // 占位，返回空数组表示无错误
                return []
            })
        )

        if (readonly) exts.push(EditorView.editable.of(false))
        return exts
    }

    onMount(() => {
        if (!editorContainer) return

        view = new EditorView({
            state: EditorState.create({
                doc: code,
                extensions: buildExtensions()
            }),
            parent: editorContainer
        })
    })

    onDestroy(() => {
        view?.destroy()
        view = null
    })

    // --------------------------- Actions ---------------------------
    function handleRun() {
        dispatch('run', { code })
    }

    function handleReset() {
        dispatch('reset')
    }
</script>

<!--
  UI：顶部工具栏 + 编辑器实例容器
-->
<div class="editor-wrapper" style="width: 100%; height: {height};">
    <!-- 工具栏 -->
    <div class="toolbar">
        <button on:click={handleRun} class="btn-run">运行</button>
        <button on:click={handleReset} class="btn-reset">重置</button>
    </div>
    <!-- 编辑器 -->
    <div bind:this={editorContainer} class="editor-container"></div>
</div>

<style>
    /* 编辑器整体容器 */
    .editor-wrapper {
        position: relative;
        display: flex;
        flex-direction: column;
    }

    /* 顶部右侧工具栏 */
    .toolbar {
        display: flex;
        justify-content: flex-end;
        gap: calc(8px * var(--scale-ratio, 1));
        padding: calc(4px * var(--scale-ratio, 1)) calc(8px * var(--scale-ratio, 1));
        background: var(--toolbar-bg, #1e293b);
    }

    .btn-run {
        padding: calc(4px * var(--scale-ratio, 1)) calc(12px * var(--scale-ratio, 1));
        border-radius: calc(4px * var(--scale-ratio, 1));
        background: #16a34a;
        color: #fff;
        border: none;
        font-size: calc(14px * var(--scale-ratio, 1));
    }
    .btn-reset {
        border: none;
        padding: calc(4px * var(--scale-ratio, 1)) calc(12px * var(--scale-ratio, 1));
        border-radius: calc(4px * var(--scale-ratio, 1));
        background: #0f172a;
        color: #fff;
        font-size: calc(14px * var(--scale-ratio, 1));
    }

    /* 编辑器容器，强制占满空间 */
    .editor-container {
        flex: 1;
        width: 100%;
        overflow: hidden;
    }

    /* CodeMirror 高度占满 */
    :global(.cm-editor),
    :global(.cm-scroller) {
        height: 100% !important;
    }

    /* 简单滚动条美化 */
    div::-webkit-scrollbar {
        width: calc(8px * var(--scale-ratio, 1));
        height: calc(8px * var(--scale-ratio, 1));
    }
    div::-webkit-scrollbar-thumb {
        background-color: #475569;
        border-radius: 4px;
    }

    :global(.ͼ1 .cm-lineNumbers .cm-gutterElement) {
        height: calc(11px * var(--scale-ratio, 1));
        padding: calc(4px * var(--scale-ratio, 1)) 0;
        min-width: 0px !important;
        width: calc(20px * var(--scale-ratio, 1)) !important;
    }
    :global(.ͼ1 .cm-gutter-lint) {
        width: calc(11px * var(--scale-ratio, 1));
    }

    :global(.ͼ1 .cm-content) {
        padding: calc(4px * var(--scale-ratio, 1)) 0;
    }
    :global(.ͼ1 .cm-line) {
        padding: 0 calc(4px * var(--scale-ratio, 1));
    }
</style>
