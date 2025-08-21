import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
    base: '/', // 使用绝对路径避免路径重复问题
    plugins: [
        svelte(),
        VitePWA({
            registerType: 'autoUpdate',
            injectRegister: 'auto',
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
                globIgnores: ['study/**/*']
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
                        src: '/icon-192.png',
                        sizes: '192x192',
                        type: 'image/png',
                        purpose: 'any maskable'
                    },
                    {
                        src: '/icon-512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any maskable'
                    }
                ]
            },
            devOptions: {
                // 开发模式下启用完整的PWA功能，包括Service Worker注册
                enabled: true,
                type: 'classic'
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
