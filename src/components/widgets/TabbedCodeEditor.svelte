<script lang="ts">
    import CodeEditor from './CodeEditor.svelte'

    type TabbedEditorProps = {
        htmlCode: string
        cssCode: string
        jsCode: string
        height?: string
        run?: (code: string) => void
        reset?: () => void
        mode?: 'svelte' | 'default'
    }

    let { htmlCode = $bindable<string>(''), cssCode = $bindable<string>(''), jsCode = $bindable<string>(''), height = '100%', run: onRun = undefined, reset: onReset = undefined, mode = 'default' } = $props()

    // 根据模式计算标签顺序
    let tabs = $derived(
        mode === 'svelte'
            ? [
                  { label: 'JS', code: jsCode, language: 'javascript', bind: 'jsCode' },
                  { label: 'CSS', code: cssCode, language: 'css', bind: 'cssCode' },
                  { label: 'HTML', code: htmlCode, language: 'html', bind: 'htmlCode' }
              ]
            : [
                  { label: 'HTML', code: htmlCode, language: 'html', bind: 'htmlCode' },
                  { label: 'JS', code: jsCode, language: 'javascript', bind: 'jsCode' },
                  { label: 'CSS', code: cssCode, language: 'css', bind: 'cssCode' }
              ]
    )

    // 当前选中的标签索引
    let currentTab = $state(0)
    function setTab(i: number) {
        currentTab = i
    }

    // 当模式变化时重置标签页
    $effect(() => {
        currentTab = 0
    })
</script>

<div class="tabbed-wrapper" style="height:{height};">
    <!-- 标签栏 -->
    <div class="tabs">
        {#each tabs as tab, i}
            <button class:selected={currentTab === i} onclick={() => setTab(i)}>{tab.label}</button>
        {/each}
    </div>

    <!-- 编辑器面板 -->
    <div class="panels">
        {#each tabs as tab, i}
            <div class="panel" style="display:{currentTab === i ? 'block' : 'none'};">
                {#if tab.bind === 'jsCode'}
                    <CodeEditor bind:code={jsCode} language={tab.language} height="100%" run={(c: string) => onRun?.(c)} toolbar={false} autoRun={true} />
                {:else if tab.bind === 'cssCode'}
                    <CodeEditor bind:code={cssCode} language={tab.language} height="100%" run={(c: string) => onRun?.(c)} toolbar={false} autoRun={true} />
                {:else}
                    <CodeEditor bind:code={htmlCode} language={tab.language} height="100%" run={(c: string) => onRun?.(c)} toolbar={false} autoRun={true} />
                {/if}
            </div>
        {/each}
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
