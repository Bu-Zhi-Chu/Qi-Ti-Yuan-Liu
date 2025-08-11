<!--
  TabbedCodeEditor.svelte
  -----------------------
  多页签代码编辑器包装组件（HTML / CSS / JS）。
  - 通过 bind:htmlCode / cssCode / jsCode 双向绑定三段代码。
  - 标签栏切换可视 CodeEditor 实例。
  - run/reset 回调透传给子编辑器。
  - 所有尺寸使用 calc(* var(--scale-ratio, 1)) 保持自适应。

  用法示例：
  <TabbedCodeEditor
      bind:htmlCode
      bind:cssCode
      bind:jsCode
      run={runCode}
      reset={resetCode}
      height="100%"
  />
-->
<script lang="ts">
    import CodeEditor from './CodeEditor.svelte'

    type TabbedEditorProps = {
        htmlCode: string
        cssCode: string
        jsCode: string
        height?: string
        run?: (code: string) => void
        reset?: () => void
    }

    let { htmlCode = $bindable<string>(''), cssCode = $bindable<string>(''), jsCode = $bindable<string>(''), height = '100%', run: onRun = undefined, reset: onReset = undefined } = $props()

    // 当前选中的标签索引：0=HTML 1=CSS 2=JS
    let currentTab = $state(0)
    function setTab(i: number) {
        currentTab = i
    }
</script>

<div class="tabbed-wrapper" style="height:{height};">
    <!-- 标签栏 -->
    <div class="tabs">
        <button class:selected={currentTab === 0} onclick={() => setTab(0)}>HTML</button>
        <button class:selected={currentTab === 1} onclick={() => setTab(1)}>CSS</button>
        <button class:selected={currentTab === 2} onclick={() => setTab(2)}>JS</button>
    </div>

    <!-- 编辑器面板 -->
    <div class="panels">
        <!-- HTML 面板 -->
        <div class="panel" style="display:{currentTab === 0 ? 'block' : 'none'};">
            <CodeEditor bind:code={htmlCode} language="html" run={(c: string) => onRun?.(c)} reset={onReset} height="100%" />
        </div>
        <!-- CSS 面板 -->
        <div class="panel" style="display:{currentTab === 1 ? 'block' : 'none'};">
            <CodeEditor bind:code={cssCode} language="css" run={(c: string) => onRun?.(c)} reset={onReset} height="100%" />
        </div>
        <!-- JS 面板 -->
        <div class="panel" style="display:{currentTab === 2 ? 'block' : 'none'};">
            <CodeEditor bind:code={jsCode} language="javascript" run={(c: string) => onRun?.(c)} reset={onReset} height="100%" />
        </div>
    </div>
</div>

<style>
    .tabbed-wrapper {
        display: flex;
        flex-direction: column;
        width: 100%;
    }

    /* 标签栏 */
    .tabs {
        display: flex;
        gap: calc(4px * var(--scale-ratio, 1));
        padding: calc(4px * var(--scale-ratio, 1));
        background: var(--toolbar-bg, #1e293b);
    }
    .tabs button {
        border: none;
        background: transparent;
        color: #fff;
        font-size: calc(14px * var(--scale-ratio, 1));
        padding: calc(6px * var(--scale-ratio, 1)) calc(12px * var(--scale-ratio, 1));
        cursor: pointer;
        border-bottom: calc(2px * var(--scale-ratio, 1)) solid transparent;
    }
    .tabs button.selected {
        border-color: #9333ea;
        color: #9333ea;
    }

    /* 面板容器 */
    .panels {
        flex: 1;
        width: 100%;
    }
    .panel {
        width: 100%;
        height: 100%;
    }
</style>
