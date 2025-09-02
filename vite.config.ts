import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { VitePWA } from 'vite-plugin-pwa'
import { viteBuildPlugin } from './vite-build-plugin'



export default defineConfig({
    base: './', // 使用相对路径适配子目录部署
    plugins: [
        svelte(),
        viteBuildPlugin(),
        VitePWA({
            registerType: 'autoUpdate',
            injectRegister: 'inline',
            strategies: 'generateSW',
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
                globIgnores: ['study/**/*'],
                navigateFallback: null, // 禁用导航回退，避免子目录问题
                // 新增：将动态生成的 JSON 与 Worker 产物显式加入缓存
                additionalManifestEntries: [{ url: './data/project-data.json', revision: null }],
                runtimeCaching: [
                    {
                        urlPattern: ({ url }: { url: URL }) => url.pathname.endsWith('.js') && url.pathname.includes('assets'),
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'worker-js',
                            expiration: {
                                maxEntries: 20,
                                maxAgeSeconds: 60 * 60 * 24 * 30
                            }
                        }
                    }
                ]
            },
            manifest: {
                name: '七巧板 - Qi Qiao Ban',
                short_name: '七巧板',
                description: '一个基于Svelte的七巧板益智游戏应用',
                theme_color: '#ff6b6b',
                background_color: '#ffffff',
                display: 'standalone',
                orientation: 'portrait',
                start_url: './',
                lang: 'zh-CN',
                scope: './',
                icons: [
                    {
                        src: './icon-192.png',
                        sizes: '192x192',
                        type: 'image/png',
                        purpose: 'any maskable'
                    },
                    {
                        src: './icon-512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any maskable'
                    }
                ]
            },

            devOptions: {
                // 开发模式下禁用PWA功能，避免子目录部署问题
                enabled: false
            }
        })
    ],
    server: {
        fs: {
            allow: ['src', 'public', 'index.html', 'manifest.json', 'dev-dist'],
            deny: ['study'] // 明确禁止访问study目录
        },
        watch: {
            ignored: ['**/study/**'] // 忽略study目录变化
        }
    },
    optimizeDeps: {
        exclude: ['study'] // 排除study目录依赖预构建
    },
    build: {
        outDir: process.env.LITE ? 'dist-lite' : 'dist',
        rollupOptions: {
            external: (id) => {
                if (['vite', 'module', 'fsevents'].includes(id)) return true;
                if (id.startsWith('node:')) return true; // 排除所有 node: 前缀的核心模块
                return false;
            },
            output: {
                manualChunks: (id) => {
                    if (id.includes('node_modules')) {
                        if (id.includes('svelte')) return 'vendor-svelte';
                        if (id.includes('lucide')) return 'vendor-lucide';
                        return 'vendor';
                    }
                    if (id.includes('src/services/')) {
                        if (id.includes('dom-tree') || id.includes('property-panel') || id.includes('project-thumbnail')) {
                            return 'core-services';
                        }
                    }
                }
            },
            onwarn(warning, warn) {
                // 过滤掉Node.js模块被外部化的警告
                if (warning.code === 'MISSING_NODE_BUILTINS' ||
                    warning.message.includes('Module "fs" has been externalized') ||
                    warning.message.includes('Module "path" has been externalized') ||
                    warning.message.includes('Module "child_process" has been externalized') ||
                    warning.message.includes('Module "http" has been externalized')) {
                    return; // 忽略这些警告
                }
                warn(warning);
            }
        },
        chunkSizeWarningLimit: 1000, // 将警告阈值提高到1MB
        minify: 'terser', // 使用terser压缩，减少控制台输出
        terserOptions: {
            compress: {
                drop_console: false, // 保留console.log，只影响构建输出
                drop_debugger: true
            }
        }
    },
    logLevel: 'info', // 显示基本构建信息，但过滤特定警告
    // 确保JSON导入的一致性
    resolve: {
        alias: {
            '@': '/src'
        }
    },
    define: {
        'import.meta.env.LITE': JSON.stringify(process.env.LITE === 'true' ? 'true' : 'false')
    }
})
