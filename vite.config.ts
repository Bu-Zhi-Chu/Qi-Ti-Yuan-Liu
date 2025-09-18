import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { VitePWA } from 'vite-plugin-pwa'
import { viteBuildPlugin } from './vite-build-plugin'
import path from 'path'
// import { visualizer } from 'rollup-plugin-visualizer'



export default defineConfig({
    base: './', // 使用相对路径适配子目录部署
    plugins: [
        svelte(),
        viteBuildPlugin(),
        {
            name: 'ignore-avif-mt',
            resolveId(source) {
                if (source.endsWith('avif_enc_mt.js')) return source;
            },
            load(id) {
                if (id.endsWith('avif_enc_mt.js')) {
                    return 'export default {}';
                }
            }
        },
        VitePWA({

            registerType: 'autoUpdate',
            injectRegister: 'inline',
            strategies: 'generateSW',
            workbox: {

                globPatterns: ['**/*.{js,css,html,ico,png,svg,avif,webp}'],
                globIgnores: ['study/**/*', '**/node_modules/@jsquash/**'],
                maximumFileSizeToCacheInBytes: 6000000, // allow assets up to ~6 MB for precache
                importScripts: ['no-wb-logs.js'],
                navigateFallback: null, // 禁用导航回退，避免子目录问题
                skipWaiting: true,
                clientsClaim: true,
                runtimeCaching: [
                    {
                        urlPattern: /\/data\/project-data\.json$/,
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'project-data',
                            networkTimeoutSeconds: 10,
                            expiration: { maxEntries: 1, maxAgeSeconds: 24 * 60 * 60 }
                        }
                    },
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
            allow: ['src', 'public', 'index.html', 'manifest.json', 'dev-dist', path.resolve(__dirname, 'node_modules/@jsquash')],
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
                if (id === '@jsquash/avif/codec/enc/avif_enc_mt.js') return true;
                if (['vite', 'module', 'fsevents'].includes(id)) return true;
                if (id.startsWith('node:')) return true; // 排除所有 node: 前缀的核心模块
                return false;
            },
            output: {
                manualChunks(id) {
                    if (id.includes('node_modules')) {
                        if (/prosemirror/.test(id)) return 'vendor-prosemirror';
                        if (/codemirror/.test(id)) return 'vendor-codemirror';
                        if (/highlight\.js|prismjs/.test(id)) return 'vendor-highlight';
                        if (/zrender/.test(id)) return 'vendor-zrender';
                        if (/d3-/.test(id)) return 'vendor-d3';
                        if (/dayjs/.test(id)) return 'vendor-dayjs';
                        if (/echarts/.test(id)) return 'vendor-echarts';
                        if (/@jsquash|image[-_]?decoder|image[-_]?easm/.test(id)) return 'vendor-imagedecoder';
                        if (/lucide/.test(id)) return 'vendor-lucide';
                        if (/svelte/.test(id)) return 'vendor-svelte';
                        return 'vendor';
                    }
                },
                // manualChunks 已暂时禁用以排查 "Cannot access 'STATE_SYMBOL' before initialization" 运行时错误。
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
            },
            // plugins: [visualizer({ filename: 'bundle-stats.html', open: true })]
        },
        chunkSizeWarningLimit: 1000, // 将警告阈值提高到1MB
        sourcemap: false,
        minify: 'terser',
        terserOptions: {
            keep_fnames: true,
        }


    },
    logLevel: 'info', // 显示基本构建信息，但过滤特定警告
    // 确保JSON导入的一致性
    resolve: {
        alias: {
            '@': '/src',
            // Alias Node.js 'os' module to browser shim to satisfy libsquoosh in client runtime
            os: path.resolve(__dirname, 'src/shims/os-shim.ts'),
            '@jsquash/avif/codec/enc/avif_enc_mt.js': '@jsquash/avif/codec/enc/avif_enc.js',

        }
    },
    define: {
        'import.meta.env.LITE': JSON.stringify(process.env.LITE === 'true' ? 'true' : 'false')
    }
})

// 删除文件末尾误插入的可视化插件声明
