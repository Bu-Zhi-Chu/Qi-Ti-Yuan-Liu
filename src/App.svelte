<script lang="ts">
    import { RouterView } from '@dvcol/svelte-simple-router/components'
    import { routerOptions } from './router/routes'
    import { isLiteMode } from './services/env/environment.service'
    import RouterGuard from './components/core/RouterGuard.svelte'
    let EditorPageComp: any = $state(null)
    let hasModuleId = $state(false)
    let showMembership = $state(false)

    /**
     * 应用主组件
     *
     * 作为应用的入口点，负责初始化路由系统
     * 使用@dvcol/svelte-simple-router实现客户端路由
     *
     * 在生产精简模式下，直接加载编辑页面，跳过路由系统
     */

    $effect(() => {
        if (isLiteMode()) {
            if (typeof window !== 'undefined') {
                try {
                    const params = new URLSearchParams(window.location.search)
                    const id = params.get('moduleId')
                    hasModuleId = !!(id && id.trim() !== '')
                } catch {
                    hasModuleId = false
                }
            } else {
                hasModuleId = false
            }
        } else {
            hasModuleId = false
        }

        if (isLiteMode() && hasModuleId && !EditorPageComp) {
            import('./components/pages/EditorPage.svelte').then((m) => {
                EditorPageComp = m.default
            })
        }
    })
</script>

<!--
  应用主界面

  在生产精简模式下：直接显示编辑页面，跳过路由系统
  在标准模式下：使用Router组件渲染当前路由对应的页面
  通过statuses配置处理404页面，避免通配符路由拦截所有路径
-->

{#if isLiteMode()}
    {#if hasModuleId}
        {#if EditorPageComp}
            <EditorPageComp />
        {/if}
    {:else}
        <div class="lite-landing">
            <div class="lite-landing-overlay"></div>
            <div class="lite-landing-content">
                <button type="button" class="lite-logo-mark" onclick={() => (showMembership = true)}>炁</button>
                <div class="lite-title">炁体源流</div>
                <div class="lite-subtitle">术之尽头</div>
            </div>
            {#if showMembership}
                <div
                    class="membership-overlay"
                    role="button"
                    tabindex="0"
                    aria-label="关闭会员订阅"
                    onclick={(event) => {
                        if (event.currentTarget === event.target) {
                            showMembership = false
                        }
                    }}
                    onkeydown={(event) => {
                        if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
                            if (event.currentTarget === event.target) {
                                event.preventDefault()
                                showMembership = false
                            }
                        }
                    }}
                >
                    <div class="membership-dialog">
                        <div class="membership-header">
                            <div class="membership-title">会员订阅</div>
                            <button class="membership-close" type="button" onclick={() => (showMembership = false)}>×</button>
                        </div>
                        <div class="membership-subtitle-text">炁体源流可视化编辑框架 · 会员功能预告</div>
                        <div class="membership-table">
                            <div class="membership-row membership-row-head">
                                <div class="membership-cell membership-cell-feature"></div>
                                <div class="membership-cell membership-cell-tier">
                                    <div class="tier-name">普通会员</div>
                                    <div class="tier-tag tier-tag-basic">入门体验</div>
                                </div>
                                <div class="membership-cell membership-cell-tier">
                                    <div class="tier-name">白金会员</div>
                                    <div class="tier-tag tier-tag-platinum">专业创作</div>
                                </div>
                                <div class="membership-cell membership-cell-tier">
                                    <div class="tier-name">钻石会员</div>
                                    <div class="tier-tag tier-tag-diamond">旗舰版</div>
                                </div>
                            </div>
                            <div class="membership-row">
                                <div class="membership-cell membership-cell-feature">低代码可视化编辑</div>
                                <div class="membership-cell"><span class="check check-basic">✓</span></div>
                                <div class="membership-cell"><span class="check check-platinum">✓</span></div>
                                <div class="membership-cell"><span class="check check-diamond">✓</span></div>
                            </div>
                            <div class="membership-row">
                                <div class="membership-cell membership-cell-feature">模块化页面与多场景管理</div>
                                <div class="membership-cell"><span class="check check-basic">✓</span></div>
                                <div class="membership-cell"><span class="check check-platinum">✓</span></div>
                                <div class="membership-cell"><span class="check check-diamond">✓</span></div>
                            </div>
                            <div class="membership-row">
                                <div class="membership-cell membership-cell-feature">精简构建与一键发布</div>
                                <div class="membership-cell"><span class="check check-basic">✓</span></div>
                                <div class="membership-cell"><span class="check check-platinum">✓</span></div>
                                <div class="membership-cell"><span class="check check-diamond">✓</span></div>
                            </div>
                            <div class="membership-row">
                                <div class="membership-cell membership-cell-feature">图片哈希去重与资源池</div>
                                <div class="membership-cell"></div>
                                <div class="membership-cell"><span class="check check-platinum">✓</span></div>
                                <div class="membership-cell"><span class="check check-diamond">✓</span></div>
                            </div>
                            <div class="membership-row">
                                <div class="membership-cell membership-cell-feature">项目协作与多终端授权</div>
                                <div class="membership-cell"></div>
                                <div class="membership-cell"><span class="check check-platinum">✓</span></div>
                                <div class="membership-cell"><span class="check check-diamond">✓</span></div>
                            </div>
                            <div class="membership-row">
                                <div class="membership-cell membership-cell-feature">高级性能监控与追踪</div>
                                <div class="membership-cell"></div>
                                <div class="membership-cell"></div>
                                <div class="membership-cell"><span class="check check-diamond">✓</span></div>
                            </div>
                            <div class="membership-row">
                                <div class="membership-cell membership-cell-feature">企业级私有化部署支持</div>
                                <div class="membership-cell"></div>
                                <div class="membership-cell"></div>
                                <div class="membership-cell"><span class="check check-diamond">✓</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            {/if}
        </div>
    {/if}
{:else}
    <RouterView options={routerOptions}>
        <RouterGuard />
    </RouterView>
{/if}

<style>
    .lite-landing {
        position: fixed;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: radial-gradient(circle at top, #1e293b 0, #020617 45%, #000 100%);
        color: #e5e7eb;
        overflow: hidden;
    }

    .lite-landing-overlay {
        position: absolute;
        inset: -20%;
        background-image: radial-gradient(circle at 10% 20%, rgba(56, 189, 248, 0.14) 0, transparent 45%), radial-gradient(circle at 80% 0, rgba(129, 140, 248, 0.16) 0, transparent 40%), radial-gradient(circle at 0 100%, rgba(248, 113, 113, 0.1) 0, transparent 45%);
        opacity: 0.95;
        pointer-events: none;
    }

    .lite-landing-content {
        position: relative;
        text-align: center;
        z-index: 1;
        padding: 3rem 2rem;
    }

    .lite-logo-mark {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 80px;
        height: 80px;
        border-radius: 999px;
        border: 1px solid rgba(148, 163, 184, 0.5);
        background: radial-gradient(circle at 30% 0, rgba(248, 250, 252, 0.18), transparent 55%);
        box-shadow:
            0 0 40px rgba(56, 189, 248, 0.5),
            0 0 80px rgba(129, 140, 248, 0.45);
        font-size: 46px;
        font-weight: 600;
        letter-spacing: 0.1em;
        color: #f9fafb;
        margin: 0 auto 2rem;
        cursor: pointer;
        background-clip: padding-box;
        outline: none;
        padding: 0;
    }

    .lite-logo-mark:hover,
    .lite-logo-mark:focus-visible {
        box-shadow:
            0 0 50px rgba(56, 189, 248, 0.75),
            0 0 110px rgba(129, 140, 248, 0.7);
        transform: translateY(-1px);
    }

    .lite-title {
        font-size: clamp(40px, 4vw, 56px);
        letter-spacing: 0.32em;
        text-indent: 0.32em;
        font-weight: 500;
        color: #e5e7eb;
        text-shadow:
            0 0 18px rgba(15, 23, 42, 0.85),
            0 0 40px rgba(15, 23, 42, 0.85);
        margin-bottom: 0.75rem;
    }

    .lite-subtitle {
        font-size: 16px;
        letter-spacing: 0.35em;
        text-indent: 0.35em;
        text-transform: uppercase;
        color: #9ca3af;
    }

    .membership-overlay {
        position: fixed;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: radial-gradient(circle at center, rgba(15, 23, 42, 0.95), rgba(15, 23, 42, 0.98));
        backdrop-filter: blur(18px);
        z-index: 10;
        cursor: pointer;
    }

    .membership-dialog {
        width: min(840px, 100% - 40px);
        border-radius: 20px;
        border: 1px solid rgba(148, 163, 184, 0.45);
        background: radial-gradient(circle at top left, rgba(56, 189, 248, 0.14), transparent 55%), radial-gradient(circle at bottom right, rgba(129, 140, 248, 0.22), transparent 60%), rgba(15, 23, 42, 0.96);
        box-shadow:
            0 24px 80px rgba(15, 23, 42, 0.9),
            0 0 0 1px rgba(15, 23, 42, 0.6);
        padding: 24px 24px 28px;
        color: #e5e7eb;
        cursor: default;
    }

    .membership-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 4px;
    }

    .membership-title {
        font-size: 20px;
        font-weight: 600;
        letter-spacing: 0.18em;
        text-indent: 0.18em;
    }

    .membership-close {
        width: 32px;
        height: 32px;
        border-radius: 999px;
        border: 1px solid rgba(148, 163, 184, 0.5);
        background: radial-gradient(circle at 30% 0, rgba(248, 250, 252, 0.12), transparent 60%);
        color: #e5e7eb;
        font-size: 18px;
        line-height: 1;
        cursor: pointer;
    }

    .membership-subtitle-text {
        font-size: 13px;
        color: #9ca3af;
        margin-bottom: 18px;
        letter-spacing: 0.12em;
        text-indent: 0.12em;
    }

    .membership-table {
        display: flex;
        flex-direction: column;
        gap: 8px;
        font-size: 13px;
    }

    .membership-row {
        display: grid;
        grid-template-columns: minmax(0, 2fr) repeat(3, minmax(0, 1fr));
        align-items: stretch;
    }

    .membership-row-head {
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        text-indent: 0.12em;
        color: #9ca3af;
    }

    .membership-cell {
        padding: 8px 10px;
        border-radius: 8px;
        border: 1px solid rgba(30, 64, 175, 0.35);
        background: radial-gradient(circle at top, rgba(30, 64, 175, 0.22), rgba(15, 23, 42, 0.9));
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .membership-cell-feature {
        justify-content: flex-start;
        border-color: rgba(148, 163, 184, 0.4);
        background: radial-gradient(circle at left, rgba(148, 163, 184, 0.28), rgba(15, 23, 42, 0.96));
    }

    .membership-row-head .membership-cell {
        border-color: rgba(51, 65, 85, 0.9);
        background: rgba(15, 23, 42, 0.95);
    }

    .membership-cell-tier {
        flex-direction: column;
        gap: 4px;
    }

    .tier-name {
        font-size: 13px;
        font-weight: 500;
        color: #e5e7eb;
    }

    .tier-tag {
        font-size: 11px;
        padding: 2px 8px;
        border-radius: 999px;
        border: 1px solid transparent;
    }

    .tier-tag-basic {
        border-color: rgba(148, 163, 184, 0.7);
        color: #e5e7eb;
        background: linear-gradient(135deg, rgba(148, 163, 184, 0.35), rgba(30, 64, 175, 0.18));
    }

    .tier-tag-platinum {
        border-color: rgba(59, 130, 246, 0.9);
        color: #dbeafe;
        background: linear-gradient(135deg, rgba(59, 130, 246, 0.5), rgba(8, 47, 73, 0.9));
    }

    .tier-tag-diamond {
        border-color: rgba(248, 250, 252, 0.9);
        color: #fefce8;
        background: linear-gradient(135deg, rgba(250, 250, 249, 0.9), rgba(180, 83, 9, 0.8));
    }

    .check {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        border-radius: 999px;
        font-size: 13px;
        font-weight: 600;
        box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.8);
    }

    .check-basic {
        background: radial-gradient(circle at 30% 0, rgba(148, 163, 184, 0.95), rgba(51, 65, 85, 0.9));
        color: #020617;
    }

    .check-platinum {
        background: radial-gradient(circle at 30% 0, rgba(59, 130, 246, 0.9), rgba(15, 23, 42, 0.95));
        color: #eff6ff;
    }

    .check-diamond {
        background: radial-gradient(circle at 30% 0, rgba(250, 250, 249, 0.98), rgba(202, 138, 4, 0.9));
        color: #1f2933;
    }

    @media (max-width: 640px) {
        .lite-logo-mark {
            width: 64px;
            height: 64px;
            font-size: 34px;
            margin-bottom: 1.5rem;
        }

        .lite-landing-content {
            padding-inline: 1.5rem;
        }

        .membership-dialog {
            padding-inline: 18px;
        }

        .membership-cell {
            padding-inline: 8px;
        }

        .membership-row {
            grid-template-columns: minmax(0, 2.3fr) repeat(3, minmax(0, 1fr));
        }
    }
</style>
