0. 中文交流

1. 联网搜索信息要考虑时效性,要搜索日期较新的信息

1. 注意项目用到的技术,实现一些功能思考注意有没有更好的新特性实现
   1. vite
   2. svelte5
   3. typescript
   4. vite-plugin-pwa + workbox-window
   5. @mateothegreat/svelte5-router


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

3. ES6+特性使用规范
   - 优先使用const/let替代var - 避免变量提升，提升代码可预测性
   - 使用箭头函数简化回调 - 注意this绑定规则，避免在需要动态this的场景使用
   - 使用模板字符串处理字符串拼接 - 注意反引号使用，避免XSS注入风险
   - 使用解构赋值简化变量声明 - 注意默认值设置，避免undefined错误
   - 使用展开运算符...处理数组和对象 - 注意浅拷贝特性，深层嵌套需手动处理
   - 使用async/await处理异步操作 - 始终配合try-catch处理错误，避免未捕获异常
   - 使用模块化import/export管理依赖 - 注意循环依赖问题，合理拆分模块
   - 使用可选链?.和空值合并??运算符 - 注意与||的区别，0和''会被??视为有效值
   - 使用class语法定义类 - 注意constructor中必须调用super()继承父类
   - 使用Map/Set/WeakMap/WeakSet等现代数据结构 - 注意WeakMap/WeakSet的弱引用特性，避免内存泄漏
   - 使用Symbol创建唯一标识符 - 注意Symbol.for()和Symbol()的区别，全局注册需谨慎
   - 使用Proxy/Reflect进行元编程 - 注意性能开销，避免过度使用代理嵌套
   - 使用迭代器协议和生成器函数* - 注意生成器函数的惰性求值特性，及时清理资源
   - 使用Promise和Promise静态方法 - 注意Promise.all的"快速失败"特性，考虑Promise.allSettled
   - 使用Array新方法(map/filter/reduce/find等) - 注意这些方法返回新数组，避免直接修改原数组
   - ......

4. svelte5 - 包含革命性Runes系统
   - $state: 显式声明响应式状态，替代隐式let - 明确状态边界，避免意外响应式
   - $derived: 创建派生值，替代$:语法 - 自动缓存计算结果，避免重复计算
   - $effect: 处理副作用，替代$:副作用 - 注意清理函数返回，避免内存泄漏
   - $props: 统一props声明，替代export let - 支持运行时类型检查，提升组件健壮性
   - .svelte.js/.ts: 跨文件共享响应式逻辑 - 注意文件命名规范，避免与组件混淆
   - 细粒度响应式：仅更新必要部分 - 性能大幅提升，但注意过度细分可能影响可读性
   - 原生TypeScript支持：更快构建，直接类型注解 - 充分利用类型推断，减少any使用
   - ......

5. 注意生命周期和内存泄漏
   - 使用 $state 管理状态，避免全局变量导致的内存泄漏
   - 及时清理定时器、事件监听器等资源
   - 避免循环引用导致的内存泄漏
   - 注意使用弱引用数据结构（如WeakMap/WeakSet）
   - 及时销毁组件实例，避免内存泄漏
   - 注意组件的onDestroy生命周期，及时清理资源
   - 使用 $effect 返回清理函数，自动处理副作用清理
   - 避免在 $effect 中创建不必要的闭包引用
   - 谨慎使用第三方库的订阅，确保正确取消订阅
   - 注意 DOM 事件监听器的添加和移除时机
   - 避免在全局对象上挂载大量数据
   - 使用 Chrome DevTools Memory 面板定期检测内存泄漏
   - 合理使用懒加载和代码分割减少初始内存占用
   - 注意 WebSocket、HTTP 请求等长连接的关闭时机
   - 避免在组件卸载后仍然更新状态（检查组件挂载状态）
   - 使用 IntersectionObserver 时注意断开观察
   - 合理使用缓存策略，避免缓存过多无用数据
   - 注意递归组件的渲染深度，避免栈溢出
   - 使用 requestAnimationFrame 时注意取消动画帧
   - 避免在模板中创建复杂的计算表达式
   - 定期review代码，识别潜在的内存泄漏风险点
   - ......

6. 代码顶部要有详细的注释说明
   - 组件的功能描述
   - 组件的使用方法


