00. 目标是开发一个低代码拖拽式的前端快速开发工具 我希望是单页应用
01. 创建了vite项目 npm create vite@latest
02. 选择了svelte5 + TypeScript 项目模板
03. 优化了TypeScript和vite的配置文件
04. 删除了框架自带的示例 完成了项目的初始化
05. 制定了项目规则 .trae\rules\project_rules.md
06. 添加PWA开发依赖
   1. vite-plugin-pwa: ^0.19.0
   2. 优化Service Worker配置
07. 设计项目整体架构
```html
    ├── .gitignore                                 # Git忽略文件配置
    ├── .trae/                                     # Trae IDE配置目录
    │   └── rules/                                 # 项目规则定义
    │       └── project_rules.md                   # 详细的项目开发规范
    ├── .vscode/                                   # VS Code编辑器配置目录
    │   └── extensions.json                        # 推荐扩展列表
    ├── dev-dist/                                  # 开发构建输出目录（开发环境）
    ├── dist/                                      # 生产构建输出目录（构建后生成）
    ├── src/                                       # 源代码目录（核心）
    │   ├── App.svelte                             # 根组件
    │   ├── assets/                                # 静态资源层
    │   │   └── img/                               # 图片资源目录
    │   │       ├── favicon.ico                    # 网站图标
    │   │       ├── icon-192.png                   # PWA图标192x192
    │   │       └── icon-512.png                   # PWA图标512x512
    │   ├── components/                            # 组件层（UI层）
    │   │   ├── Core/                              # 核心机制组件
    │   │   │   └── DynamicComponent.svelte        # 能切换组件类型的通用容器
    │   │   │   └── ResponsiveBox.svelte           # 自适应的基础容器 所有自定义组件的原型
    │   │   ├── modules/                           # 模块组件
    │   │   ├── pages/                             # 页面级组件
    │   │   │   ├── 404.svelte                     # 404错误页面
    │   │   │   ├── 500.svelte                     # 500错误页面
    │   │   │   ├── AboutPage.svelte               # 关于
    │   │   │   ├── DemoPage.svelte                # 演示
    │   │   │   ├── EditorPage.svelte              # 编辑器页面
    │   │   │   ├── HomePage.svelte                # 首页
    │   │   │   └── SettingsPage.svelte            # 设置
    │   │   └── widgets/                           # 可复用业务组件
    │   ├── main.ts                                # 应用主入口文件
    │   ├── router/                                # 路由层
    │   │   └── routes.ts                          # 路由配置
    │   ├── services/                              # 服务层（业务逻辑层）
    │   │   ├── pwa/                               # PWA功能模块
    │   │   │   ├── README.md                      # PWA模块说明文档
    │   │   │   ├── pwa-detector.service.ts        # PWA环境检测与初始化服务
    │   │   │   └── pwa-status.model.ts            # PWA状态数据模型定义
    │   │   └── screen/                            # 屏幕适配服务
    │   │       ├── README.md                      # 屏幕适配模块说明文档
    │   │       ├── screen-detector.service.ts     # 屏幕检测与响应式服务
    │   │       └── screen.types.ts                # 屏幕相关类型定义
    │   ├── style/                                 # 样式层
    │   │   └── app.css                            # 主样式文件
    │   ├── sw.d.ts                                # Service Worker类型声明
    │   └── vite-env.d.ts                          # Vite环境变量声明
    ├── study/                                     # 学习目录 项目集成组件的源码
    ├── index.html                                 # 应用入口HTML文件
    ├── manifest.json                              # PWA应用清单文件
    ├── package-lock.json                          # 依赖锁定文件
    ├── package.json                               # 项目依赖和脚本配置
    ├── svelte.config.js                           # Svelte框架配置
    ├── sw.d.ts                                    # Service Worker类型声明
    ├── tsconfig.app.json                          # TypeScript应用配置
    ├── tsconfig.json                              # TypeScript主配置
    ├── tsconfig.node.json                         # TypeScript Node.js配置
    ├── vite-env.d.ts                              # Vite环境变量声明
    └── vite.config.ts                             # Vite构建工具配置
```
08. 制定了项目规则
09. 集成了npm install @mateothegreat/svelte5-router 路由组件 并完成了对源码的初步学习
10. 首页搭建的时候发现我们其实先应该解决网页自适应屏幕的问题
11. 我们解决的自适应的问题,开发完成了项目最核心的组件ResponsiveBox
12. 我们开会决定用dexie来做数据持久化,先写了一个基础的工具类
13. 我们基于ResponsiveBox开发了RealTimeClock,并且制定了组件封装的规范
