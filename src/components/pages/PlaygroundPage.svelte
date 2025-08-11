<!--
  PlaygroundPage.svelte
  ---------------------
  Demo 代码运行与预览页面。
  左侧：CodeMirror 6 代码编辑器
  右侧：iframe 沙箱实时预览
  中间：svelte-splitpanes 拖拽分隔条，可记忆比例
-->
<script lang="ts">
    import { onMount, onDestroy } from 'svelte'
    import { Splitpanes, Pane } from 'svelte-splitpanes'
    import TabbedCodeEditor from '../widgets/TabbedCodeEditor.svelte'
    import { useNavigate } from '@dvcol/svelte-simple-router/router'

    // --------------------------- 状态 ---------------------------
    // HTML / CSS / JS 代码内容
    let htmlCode: string = '<h1 style="text-align:center;">Hello, Qi Qiao Ban!</h1>'
    let cssCode: string = 'body { font-family: sans-serif; }'
    let jsCode: string = "console.log('Hello, Qi Qiao Ban!')"
    // 控制台日志
    let logs: string[] = []
    // iframe 预览 URL（Blob）
    let htmlUrl: string = ''
    // 侧栏比例 (0~1)
    let ratio: number = 0.4

    // 运行代码 -> 生成 Blob URL（支持 Svelte5 单文件组件）
    async function runCode() {
        // 释放旧 URL
        if (htmlUrl) URL.revokeObjectURL(htmlUrl)

        // 清空日志
        logs = []

        // 注入 console hook
        const consoleHook = `(() => {const levels = ['log','info','warn','error'];levels.forEach(level => {const orig = console[level];console[level] = (...args) => {window.parent.postMessage({ type: 'console', level, msg: args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ') }, '*');orig.apply(console, args);};});})();`

        // ---------------- Svelte5 编译支持 ----------------
        let finalJsCode: string = jsCode
        try {
            // 简单启发式：如果 js 区域以 "<" 开头，视为 Svelte 单文件组件源码
            if (jsCode.trim().startsWith('<')) {
                const { compile } = await import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/svelte@next/src/compiler/index.js')
                const { js } = compile(jsCode, {
                    generate: 'dom',
                    format: 'esm',
                    dev: true // 保留调试信息
                })
                finalJsCode = js.code
            }
        } catch (err) {
            logs = [...logs, `[error] Svelte compile error: ${err instanceof Error ? err.message : String(err)}`]
        }
        // ---------------------------------------------------

        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${cssCode}</style></head><body>${htmlCode}<script type="module">${consoleHook + finalJsCode}<\/script></body></html>`
        htmlUrl = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
    }

    // 重置代码到默认模板
    function resetCode() {
        htmlCode = '<h1 style="text-align:center;">Hello, Qi Qiao Ban!</h1>'
        cssCode = 'body { font-family: sans-serif; }'
        jsCode = "console.log('Hello, Qi Qiao Ban!')"
        runCode()
    }

    // 首次自动运行
    runCode()

    // 组件卸载时释放 Blob URL
    onDestroy(() => {
        if (htmlUrl) URL.revokeObjectURL(htmlUrl)
        window.removeEventListener('message', handleConsoleMessage)
    })

    // 拖拽结束保存比例
    function handleResizeEnd(e: CustomEvent<any>) {
        const sizes = Array.isArray(e.detail) ? e.detail.map((d: any) => d.size) : e.detail.sizes
        ratio = sizes[0] / (sizes[0] + sizes[1])
    }
    const { push } = useNavigate()

    // 监听 iframe console 消息
    function handleConsoleMessage(e: MessageEvent<any>) {
        if (e.data?.type === 'console') {
            logs = [...logs, `[${e.data.level}] ${e.data.msg}`]
        }
    }

    onMount(() => {
        window.addEventListener('message', handleConsoleMessage)
    })
</script>

<div style="width: 100vw; height: 100vh;">
    <Splitpanes on:resized={handleResizeEnd}>
        <!-- 左侧代码编辑区 -->
        <Pane size={ratio * 100}>
            <Splitpanes horizontal>
                <Pane size={85}>
                    <TabbedCodeEditor bind:htmlCode bind:cssCode bind:jsCode run={runCode} reset={resetCode} />
                </Pane>
                <Pane>
                    <pre class="console-output">{logs.join('\n')}</pre>
                </Pane>
            </Splitpanes>
        </Pane>

        <!-- 右侧预览区 -->
        <Pane>
            <iframe src={htmlUrl} title="preview" sandbox="allow-scripts allow-same-origin" style="font-size: calc(14px * var(--scale-ratio, 1));width: 100%; height: 100%; border: none; background: #fff;"></iframe>
        </Pane>
    </Splitpanes>
</div>

<!-- 返回 Demo 按钮 -->
<a
    href="/demo"
    onclick={(e) => {
        e.preventDefault()
        push({ path: '/demo' })
    }}
    class="back-to-demo"
>
    ← 返回
</a>

<style>
    /* 返回 Demo 按钮样式 */
    .back-to-demo {
        position: fixed;
        bottom: calc(20px * var(--scale-ratio, 1));
        right: calc(20px * var(--scale-ratio, 1));
        color: rgba(0, 0, 0, 0.7);
        text-decoration: none;
        font-size: calc(14px * var(--scale-ratio, 1));
        transition: color 0.2s ease;
        z-index: 10;
    }

    :global(.splitpanes.default-theme .splitpanes__splitter) {
        background: #d6c0f3 !important; /* 灰色 */
        width: calc(6px * var(--scale-ratio, 1)) !important;
        cursor: col-resize;
    }

    :global(.splitpanes.default-theme.splitpanes--horizontal .splitpanes__splitter) {
        background: #d6c0f3 !important; /* 同色系 */
        height: calc(6px * var(--scale-ratio, 1)) !important;
        width: 100% !important;
        cursor: row-resize;
    }
    :global(
            .default-theme.splitpanes--vertical > .splitpanes__splitter:before,
            .default-theme.splitpanes--vertical > .splitpanes__splitter:after,
            .default-theme .splitpanes--vertical > .splitpanes__splitter:before,
            .default-theme .splitpanes--vertical > .splitpanes__splitter:after,
            .default-theme.splitpanes--horizontal > .splitpanes__splitter:before,
            .default-theme.splitpanes--horizontal > .splitpanes__splitter:after,
            .default-theme .splitpanes--horizontal > .splitpanes__splitter:before,
            .default-theme .splitpanes--horizontal > .splitpanes__splitter:after
        ) {
        display: none !important;
    }

    /* 控制台样式 */

    .console-output {
        margin: 0;
        padding: calc(8px * var(--scale-ratio, 1));
        font-size: calc(13px * var(--scale-ratio, 1));
        line-height: 1.4;
        color: #16a34a;
        background: #1e1e1e;
        overflow-y: auto;
        height: 100%;
        box-sizing: border-box;
    }
</style>
