<!--
  PlaygroundPage.svelte
  ---------------------
  Demo 代码运行与预览页面。
  左侧：CodeMirror 6 代码编辑器
  右侧：iframe 沙箱实时预览
  中间：svelte-splitpanes 拖拽分隔条，可记忆比例
-->
<script lang="ts">
    import { onDestroy } from 'svelte'
    import { Splitpanes, Pane } from 'svelte-splitpanes'
    import CodeEditor from '../widgets/CodeEditor.svelte'
    import { useNavigate } from '@dvcol/svelte-simple-router/router'

    // --------------------------- 状态 ---------------------------
    // 编辑器代码内容
    let code: string = `// 欢迎使用 Playground\nconsole.log('Hello, Qi Qiao Ban!')\ndocument.body.innerHTML = '<h1 style=\"text-align:center;\">Hello, Qi Qiao Ban!</h1>'`
    // iframe 预览 URL（Blob）
    let htmlUrl: string = ''
    // 侧栏比例 (0~1)
    let ratio: number = 0.4

    // 运行代码 -> 生成 Blob URL
    function runCode() {
        // 释放旧 URL
        if (htmlUrl) URL.revokeObjectURL(htmlUrl)

        const html = `<!DOCTYPE html><html><head><meta charset=\"utf-8\"></head><body><script type=\"module\">${code}<\/script></body></html>`
        htmlUrl = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
    }

    // 重置代码到默认模板
    function resetCode() {
        code = `// 欢迎使用 Playground\nconsole.log('Hello, Qi Qiao Ban!')\ndocument.body.innerHTML = '<h1 style=\"text-align:center;\">Hello, Qi Qiao Ban!</h1>'`
        runCode()
    }

    // 首次自动运行
    runCode()

    // 组件卸载时释放 Blob URL
    onDestroy(() => {
        if (htmlUrl) URL.revokeObjectURL(htmlUrl)
    })

    // 拖拽结束保存比例
    function handleResizeEnd(e: CustomEvent<any>) {
        const sizes = Array.isArray(e.detail) ? e.detail.map((d: any) => d.size) : e.detail.sizes
        ratio = sizes[0] / (sizes[0] + sizes[1])
    }
    const { push } = useNavigate()
</script>

<div style="width: 100vw; height: 100vh;">
    <Splitpanes on:resized={handleResizeEnd}>
        <!-- 左侧代码编辑区 -->
        <Pane size={ratio * 100}>
            <CodeEditor bind:code run={runCode} reset={resetCode} />
        </Pane>

        <!-- 右侧预览区 -->
        <Pane>
            <iframe src={htmlUrl} title="preview" sandbox="allow-scripts allow-same-origin" style="width: 100%; height: 100%; border: none; background: #fff;"></iframe>
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
>← 返回</a>

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
    :global(.default-theme.splitpanes--vertical > .splitpanes__splitter:before, .default-theme.splitpanes--vertical > .splitpanes__splitter:after, .default-theme .splitpanes--vertical > .splitpanes__splitter:before, .default-theme .splitpanes--vertical > .splitpanes__splitter:after) {
        display: none !important;
    }
</style>
