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


    // 获取路由参数（兼容 hash 模式）
    const params = $derived((() => {
        const hash = window.location.hash.slice(1) // 去掉 #
        const parts = hash.split('/')
        return { id: parts.pop() || 'hello-world' }
    })())

    // 从JSON导入导航配置
    import demoNavigation from '../../examples/demo-navigation.json'

    // 解析完整代码为 HTML/CSS/JS 部分
    // 对于 Svelte 组件，将整个组件代码放在 JS 区域，HTML 和 CSS 区域留空
    function parseCode(fullCode: string): { html: string; css: string; js: string } {
        // 检查是否为 Svelte 单文件组件（包含 <script> 或 <style> 标签）
        const isSvelteComponent = /<script[^>]*>[\s\S]*?<\/script>/i.test(fullCode) || /<style[^>]*>[\s\S]*?<\/style>/i.test(fullCode) || (fullCode.includes('{') && fullCode.includes('}') && fullCode.includes('<'))

        if (isSvelteComponent) {
            // Svelte 单文件组件：整个代码放在 JS 区域
            return {
                html: '', // HTML 区域留空
                css: '', // CSS 区域留空
                js: fullCode.trim() || '// 空 Svelte 组件'
            }
        } else {
            // 传统 HTML/CSS/JS 分离模式
            const htmlParts: string[] = []
            const cssParts: string[] = []
            const jsParts: string[] = []

            // 简单的正则表达式来提取各个部分
            const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi
            const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi

            let htmlContent = fullCode

            // 提取JS部分
            let match
            while ((match = scriptRegex.exec(fullCode)) !== null) {
                jsParts.push(match[1].trim())
                htmlContent = htmlContent.replace(match[0], '')
            }

            // 提取CSS部分
            while ((match = styleRegex.exec(fullCode)) !== null) {
                cssParts.push(match[1].trim())
                htmlContent = htmlContent.replace(match[0], '')
            }

            // 剩余的为HTML部分
            htmlContent = htmlContent.trim()

            return {
                html: htmlContent || '<div>Hello World</div>',
                css: cssParts.join('\n') || 'body { font-family: sans-serif; }',
                js: jsParts.join('\n') || ''
            }
        }
    }

    // 动态加载组件代码的函数
    async function loadComponentCode(componentId: string): Promise<string> {
        try {
            // 在demo-navigation.json中查找组件
            let componentConfig = null
            for (const module of demoNavigation.modules) {
                for (const category of module.categories) {
                    const found = category.components.find((comp) => comp.id === componentId)
                    if (found && found.codeFile) {
                        componentConfig = found
                        break
                    }
                }
                if (componentConfig) break
            }

            if (!componentConfig || !componentConfig.codeFile) {
                // 默认回退到svelte默认组件
                const svelteComponents = await import('../../examples/svelte/default-svelte-components.json')
                return (svelteComponents as any)[componentId]?.code || (svelteComponents as any).default?.code
            }

            // 动态加载对应的代码文件
            const codeFilePath = `../../examples/${componentConfig.codeFile}`
            const codeModule = await import(/* @vite-ignore */ codeFilePath)

            // 获取组件代码
            const componentCode = codeModule.default?.[componentId]?.code || codeModule.default?.default?.code
            return componentCode || `// 未找到组件代码\nconsole.error('未找到组件 ${componentId} 的代码')`
        } catch (error) {
            console.error('加载组件代码失败:', error)
            return `// 加载组件代码失败\nconsole.error('加载组件代码失败: ${error}')`
        }
    }

    // --------------------------- 状态 ---------------------------
    // HTML / CSS / JS 代码内容
    let htmlCode: string = $state('')
    let cssCode: string = $state('body { font-family: sans-serif; }')
    let jsCode: string = $state('')

    // 控制台日志
    let logs: string[] = $state([])
    // iframe 预览 URL（Blob）
    let htmlUrl: string = $state('')
    // 侧栏比例 (0~1)
    let ratio: number = $state(0.4)

    // 运行代码 -> 生成 Blob URL（支持 Svelte5 单文件组件）
    async function runCode() {
        // 释放旧 URL
        if (htmlUrl) URL.revokeObjectURL(htmlUrl)

        // 清空日志
        logs = []

        // 注入 console hook：将 iframe 内部的 console 消息转发到父页面
        const consoleHook = `(() => {const levels = ['log','info','warn','error'];levels.forEach(level => {const orig = console[level];console[level] = (...args) => {window.parent.postMessage({ type: 'console', level, msg: args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ') }, '*');orig.apply(console, args);};});})();`

        // ---------------- Svelte5 编译支持 ----------------
        // 将裸模块导入替换为 esm.sh CDN，解决 Svelte 在线编译无法解析裸包名的问题
        // 特别注意：对于 'svelte' 及其子路径的模块，不添加 '?bundle'，
        // 因为 Svelte 内部模块对打包方式可能很敏感。
        const transformBareImports = (code: string) => {
            // import ... from 'package'
            code = code.replace(/from\s+['"]([^'"./][^'" ]*)['"]/g, (_m, p1) => {
                // 如果是 Svelte 相关的包，不添加 ?bundle
                if (p1.startsWith('svelte')) {
                    return `from 'https://esm.sh/${p1}'`
                }
                // 否则，添加 ?bundle
                return `from 'https://esm.sh/${p1}?bundle'`
            })
            // import 'package' (例如用于 side effects imports)
            code = code.replace(/import\s+['"]([^'"./][^'" ]*)['"]/g, (_m, p1) => {
                if (p1.startsWith('svelte')) {
                    return `import 'https://esm.sh/${p1}'`
                }
                return `import 'https://esm.sh/${p1}?bundle'`
            })
            return code
        }

        const escapeScriptEnd = (code: string) => {
            return code.replace(/<\/script>/gi, '<\\/script>')
        }

        // 移除用户代码中的 <script> 标签包裹
        const stripScriptWrapper = (code: string) => code.replace(/<script[^>]*>/g, '').replace(/<\/script>/g, '')

        let finalJsCode: string = transformBareImports(stripScriptWrapper(jsCode)) // 默认情况下，如果不是 Svelte 组件源码，直接处理裸模块导入

        try {
            // 简单启发式：如果 js 区域以 "<" 开头，视为 Svelte 单文件组件源码
            if (jsCode.trim().startsWith('<')) {
                // 动态导入 Svelte 5 编译器
                // 使用正确的 svelte/compiler 包名
                // @ts-ignore
                const { compile } = await import('https://esm.sh/svelte@5/compiler')

                // 对 Svelte 源代码进行裸模块导入转换
                const transformedSource = transformBareImports(jsCode)

                // 编译 Svelte 组件
                const { js } = compile(transformedSource, {
                    generate: 'dom', // 生成 DOM 模式代码
                    dev: true, // 保留调试信息
                    runes: true // 启用 Svelte 5 Runes 模式
                    // format 选项已在 Svelte 4+ 中移除，无需设置
                })

                // 将 ESM 默认导出转换为组件变量，便于在单 <script type="module"> 中实例化
                // Svelte 5 使用 mount 函数而不是 new Component()
                let compiledCode = js.code.replace(/export\s+default/g, 'const Component =')
                // 确保 _unknown_ 变量被正确定义为源映射对象
                if (compiledCode.includes('_unknown_')) {
                    compiledCode = 'const _unknown_ = {"(unknown)": "(unknown)"};\n' + compiledCode
                }

                // 最终的 JavaScript 代码：编译后的组件代码 + 实例化代码
                // 确保对编译后的代码再次进行裸模块导入转换，以防编译器自身产生新的裸模块导入（尽管不太常见）
                finalJsCode = 'import { mount } from "https://esm.sh/svelte";\n' + transformBareImports(compiledCode) + '\nmount(Component, { target: document.body });'
            }
        } catch (err) {
            logs = [...logs, `[error] Svelte compile error: ${err instanceof Error ? err.message : String(err)}`]
        }

        const safeJsCode = escapeScriptEnd(finalJsCode)

        // 拼接完整的 HTML 文档
        // consoleHook 放在 safeJsCode 的前面，确保 console 重定向逻辑在用户代码执行前生效
        const html = ['<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>', cssCode, '</style></head><body>', htmlCode, '<script type="module">', consoleHook, '\n', safeJsCode, '</scr' + 'ipt></body></html>'].join('')

        // 创建 Blob URL 并更新 iframe 源
        htmlUrl = URL.createObjectURL(new Blob([html], { type: 'text/html' }))

        // 调试辅助：打印生成的 URL 和 HTML 内容
        console.log('Generated Blob URL:', htmlUrl)
        console.log('Generated HTML for iframe:\n', html)
    }

    // 重置代码到当前组件的默认模板
    async function resetCode() {
        const componentId = String(params.id || 'hello-world')
        const newCode = await loadComponentCode(componentId)
        const componentData = parseCode(newCode)
        htmlCode = componentData.html
        cssCode = componentData.css
        jsCode = componentData.js
        runCode()
    }

    // 组件挂载后首次自动运行代码
    // 使用 onMount 确保 DOM 已准备好
    onMount(async () => {
        console.log('PlaygroundPage mounted, attempting runCode()~~~~~~~~~~~~~~~~~~~~~~~~~~~~~')

        // 根据路由参数加载组件代码
        const componentId = String(params.id || 'hello-world') // 默认组件
        const newCode = await loadComponentCode(componentId)
        const componentData = parseCode(newCode)
        htmlCode = componentData.html
        cssCode = componentData.css
        jsCode = componentData.js

        runCode()
        // 监听 iframe 发送的 console 消息
        window.addEventListener('message', handleConsoleMessage)
    })

    // 监听路由参数变化，当用户切换组件时重新加载代码
    $effect(() => {
        const componentId = String(params.id || 'hello-world')
        if (componentId) {
            loadComponentCode(componentId).then((newCode) => {
                const componentData = parseCode(newCode)
                htmlCode = componentData.html
                cssCode = componentData.css
                jsCode = componentData.js
                runCode()
            })
        }
    })

    // 组件卸载时释放 Blob URL 和移除事件监听器
    onDestroy(() => {
        if (htmlUrl) URL.revokeObjectURL(htmlUrl)
        window.removeEventListener('message', handleConsoleMessage)
    })

    // 拖拽结束时保存侧栏比例
    function handleResizeEnd(e: CustomEvent<any>) {
        const sizes = Array.isArray(e.detail) ? e.detail.map((d: any) => d.size) : e.detail.sizes
        ratio = sizes[0] / (sizes[0] + sizes[1])
    }
    // 返回 Demo 页面
    function goBackToDemo() {
        window.location.hash = '/demo'
    }

    // 监听 iframe console 消息的处理函数
    function handleConsoleMessage(e: MessageEvent<any>) {
        if (e.data?.type === 'console') {
            logs = [...logs, `[${e.data.level}] ${e.data.msg}`]
        }
    }
</script>

<div style="width: 100vw; height: 100vh;">
    <Splitpanes on:resized={handleResizeEnd}>
        <!-- 左侧代码编辑区 -->
        <Pane size={ratio * 100}>
            <Splitpanes horizontal>
                <Pane size={85}>
                    <!-- bind:htmlCode, bind:cssCode, bind:jsCode 实现了双向绑定 -->
                    <TabbedCodeEditor bind:htmlCode bind:cssCode bind:jsCode run={runCode} reset={resetCode} mode={jsCode.trim().startsWith('<') ? 'svelte' : 'default'} />
                </Pane>
                <Pane>
                    <!-- 控制台输出区域 -->
                    <pre class="console-output">{logs.join('\n')}</pre>
                </Pane>
            </Splitpanes>
        </Pane>

        <!-- 右侧预览区 -->
        <Pane>
            <!-- iframe 用于沙箱隔离和实时预览 -->
            <iframe src={htmlUrl} title="preview" sandbox="allow-scripts" style="font-size: calc(14px * var(--scale-ratio, 1));width: 100%; height: 100%; border: none; background: #fff;"></iframe>
        </Pane>
    </Splitpanes>
</div>

<!-- 返回 Demo 按钮 (UI 元素，与核心功能无关) -->
<a
    href="/demo"
    onclick={(e) => {
        e.preventDefault()
        goBackToDemo()
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

    /* Splitpanes 分隔条样式 */
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
            .default-theme.splitpanes--horizontal > .splitpanes__splitter:after
        ) {
        display: none !important;
    }

    /* 控制台样式 */
    .console-output {
        margin: 0;
        padding: calc(8px * var(--scale-ratio, 1));
        font-size: calc(13px * var(--scale-ratio, 1));
        line-height: 1.4;
        color: #16a34a; /* 绿色文本 */
        background: #1e1e1e; /* 深色背景 */
        overflow-y: auto;
        height: 100%;
        box-sizing: border-box;
    }
</style>
