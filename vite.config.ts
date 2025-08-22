import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
    base: './', // 使用相对路径适配子目录部署
    plugins: [
        svelte(),
        VitePWA({
            registerType: 'autoUpdate',
            injectRegister: 'inline',
            strategies: 'generateSW',
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
                globIgnores: ['study/**/*'],
                navigateFallback: null // 禁用导航回退，避免子目录问题
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
            }
        },
        chunkSizeWarningLimit: 1000 // 将警告阈值提高到1MB
    },
    // 确保JSON导入的一致性
    resolve: {
        alias: {
            '@': '/src'
        }
    }
})
