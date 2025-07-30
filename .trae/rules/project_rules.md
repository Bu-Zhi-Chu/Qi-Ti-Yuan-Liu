0. 中文交流
1. 注意项目用到的技术,实现一些功能思考注意有没有更好的新特性实现
   1. vite
   2. typescript
   3. stvlte5
   4. vite-plugin-pwa + workbox-window
2. 注意项目的整体架构,创建文件要思考文件应该属于什么层级
   ```html
   ├── .trae/                                # Trae IDE配置目录
   ├── .vscode/                              # VS Code编辑器配置目录
   ├── dev-dist/                             # 开发构建输出目录（开发环境）
   ├── dist/                                 # 生产构建输出目录（构建后生成）
   ├── src/                                  # 源代码目录（核心）
   │   ├── assets/                           # 静态资源层
   │   │   └── img/                          # 图片资源目录
   │   ├── components/                       # 组件层（UI层）
   │   │   ├── common/                       # 通用组件
   │   │   ├── forms/                        # 表单组件
   │   │   ├── navigation/                   # 导航组件
   │   │   └── pages/                        # 页面级组件
   │   ├── services/                         # 服务层（业务逻辑层）
   │   │   ├── pwa/                          # PWA功能模块
   │   │   │   ├── pwa-detector.service.ts   # PWA环境检测与初始化服务
   │   │   │   └── pwa-status.model.ts       # PWA状态数据模型定义
   │   │   └── utils/                        # 工具服务
   │   ├── style/                            # 样式层
   │   │   └── app.css                       # 主样式文件
   │   ├── App.svelte                        # 根组件
   │   ├── main.ts                           # 应用主入口文件
   │   ├── sw.d.ts                           # Service Worker类型声明
   │   └── vite-env.d.ts                     # Vite环境变量声明
   ├── .gitignore                            # Git忽略文件配置
   ├── README.md                             # 项目文档
   ├── index.html                            # 应用入口HTML文件
   ├── manifest.json                         # PWA应用清单文件
   ├── package-lock.json                     # 依赖锁定文件
   ├── package.json                          # 项目依赖和脚本配置
   ├── svelte.config.js                      # Svelte框架配置
   ├── sw.d.ts                               # Service Worker类型声明
   ├── tsconfig.app.json                     # TypeScript应用配置
   ├── tsconfig.json                         # TypeScript主配置
   ├── tsconfig.node.json                    # TypeScript Node.js配置
   ├── vite-env.d.ts                         # Vite环境变量声明
   └── vite.config.ts                        # Vite构建工具配置
```