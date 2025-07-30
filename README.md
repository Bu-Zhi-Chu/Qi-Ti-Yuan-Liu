0. 目标是开发一个低代码拖拽式的前端快速开发工具 我希望是单页应用
1. 创建了vite项目 npm create vite@latest
2. 选择了svelte5 + TypeScript 项目模板
3. 优化了TypeScript和vite的配置文件
4. 删除了框架自带的示例 完成了项目的初始化
5. 制定了项目规则 .trae\rules\project_rules.md
6. 添加PWA开发依赖
   1. vite-plugin-pwa: ^0.19.0
   2. workbox-window: ^7.0.0
   3. 优化Service Worker配置