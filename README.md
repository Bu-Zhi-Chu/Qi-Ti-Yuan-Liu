# 🎨 Qi-Qiao-Ban

<div align="center">

[![Vite](https://img.shields.io/badge/Vite-5.x-646CFF.svg?style=flat&logo=vite)](https://vitejs.dev)
[![Svelte](https://img.shields.io/badge/Svelte-5.x-FF3E00.svg?style=flat&logo=svelte)](https://svelte.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6.svg?style=flat&logo=typescript)](https://www.typescriptlang.org)
[![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8.svg?style=flat&logo=pwa)](https://web.dev/progressive-web-apps)

**🚀 低代码拖拽式前端快速开发工具**

> 基于 Svelte5 的现代化单页应用，提供可视化拖拽构建体验

[📖 文档](#-快速开始) • [🎯 特性](#-特性) • [🛠️ 技术栈](#-技术栈) • [🚀 部署](#-部署)

</div>

## ✨ 特性

<div align="center">
<table>
<tr>
<td>

### 🎯 核心功能
- **可视化拖拽** - 所见即所得的界面构建
- **组件丰富** - 内置常用业务组件库
- **实时预览** - 即时查看构建效果
- **代码生成** - 自动生成可维护的代码

</td>
<td>

### ⚡ 技术特性
- **极速开发** - 基于 Vite 的闪电般开发体验
- **类型安全** - 完整的 TypeScript 支持
- **PWA 支持** - 离线使用和原生应用体验
- **响应式设计** - 完美适配多端设备

</td>
</tr>
<tr>
<td>

### 🎨 设计系统
- **主题定制** - 灵活的主题配置系统
- **组件规范** - 统一的设计规范
- **图标库** - 丰富的图标资源
- **动画效果** - 流畅的交互动画

</td>
<td>

### 🔧 开发体验
- **热更新** - 秒级热模块替换
- **调试友好** - 完善的开发工具链
- **测试覆盖** - 单元测试和E2E测试
- **文档完善** - 详细的开发文档

</td>
</tr>
</table>
</div>

## 🛠️ 技术栈

<div align="center">

| 类别         | 技术                                                              | 版本   | 用途             |
| ------------ | ----------------------------------------------------------------- | ------ | ---------------- |
| **构建工具** | ![Vite](https://img.shields.io/badge/Vite-5.x-646CFF)             | 5.x    | 构建和开发服务器 |
| **框架**     | ![Svelte](https://img.shields.io/badge/Svelte-5.x-FF3E00)         | 5.x    | 响应式UI框架     |
| **语言**     | ![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6) | 5.x    | 类型安全         |
| **路由**     | @mateothegreat/svelte5-router                                     | 2.16.8 | 单页应用路由     |
| **PWA**      | vite-plugin-pwa                                                   | 0.19.x | PWA支持          |
| **样式**     | CSS + PostCSS                                                     | -      | 样式处理         |
| **图标**     | Heroicons                                                         | 2.x    | 图标库           |

</div>

## 📁 项目结构

```
qi-qiao-ban/
├── 📁 src/                          # 源代码目录
│   ├── 📁 components/              # 组件层
│   │   ├── 📁 common/              # 通用组件
│   │   ├── 📁 forms/               # 表单组件
│   │   ├── 📁 navigation/        # 导航组件
│   │   └── 📁 pages/               # 页面组件
│   ├── 📁 router/                  # 路由配置
│   ├── 📁 services/                # 业务逻辑
│   │   ├── 📁 pwa/                 # PWA功能
│   │   └── 📁 utils/               # 工具函数
│   ├── 📁 style/                   # 样式文件
│   └── 📁 assets/                  # 静态资源
├── 📁 study/                       # 学习文档和源码
├── 📁 dev-dist/                    # 开发构建输出
└── 📁 dist/                        # 生产构建输出
```

## 🚀 快速开始

### 📋 环境要求

- **Node.js**: 18.x 或更高版本
- **npm**: 9.x 或更高版本
- **Git**: 2.x 或更高版本

### ⚙️ 安装依赖

```bash
# 克隆项目
git clone <repository-url>
cd qi-qiao-ban

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 🎯 开发命令

```bash
# 开发模式
npm run dev

# 构建生产版本
npm run build

# 预览构建结果
npm run preview

# 运行测试
npm run test

# 类型检查
npm run check
```

### 🌐 访问应用

开发服务器启动后，访问 [http://localhost:5173](http://localhost:5173) 查看应用。

## 🎨 设计系统

### 颜色方案

<div align="center">
<table>
<tr>
<td align="center">

**主色调**
- 🔵 主色: `#3B82F6`
- 🟢 成功: `#10B981`
- 🟡 警告: `#F59E0B`
- 🔴 错误: `#EF4444`

</td>
<td align="center">

**中性色**
- ⚫ 文字: `#111827`
- ⚪ 背景: `#FFFFFF`
- 🌫️ 边框: `#E5E7EB`
- 🌫️ 禁用: `#9CA3AF`

</td>
</tr>
</table>
</div>

### 字体规范

- **标题**: Inter, 系统字体栈
- **正文**: Inter, 系统字体栈
- **代码**: JetBrains Mono, 等宽字体栈

### 间距规范

- **基础单位**: 4px
- **组件间距**: 8px, 16px, 24px, 32px
- **页面间距**: 24px, 48px, 64px

## 📝 贡献指南

### 🤝 如何贡献

1. **Fork 项目**
2. **创建功能分支** (`git checkout -b feature/AmazingFeature`)
3. **提交更改** (`git commit -m 'Add some AmazingFeature'`)
4. **推送到分支** (`git push origin feature/AmazingFeature`)
5. **开启 Pull Request**

### 🧪 开发规范

- 遵循项目规则文件 `.trae/rules/project_rules.md`
- 使用 TypeScript 进行类型安全开发
- 编写单元测试和集成测试
- 保持代码风格一致
- 及时更新文档

## 📞 支持与联系

<div align="center">

### 💬 社区支持
- 📧 **Issues**: [GitHub Issues](https://github.com/username/qi-qiao-ban/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/username/qi-qiao-ban/discussions)

### 📱 联系方式
- 👨‍💻 **开发者**: [Your Name](https://github.com/username)
- 📧 **邮箱**: your.email@example.com

</div>

## 📄 许可证

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

本项目采用 [MIT 许可证](LICENSE) 开源协议。

---

<div align="center">

**⭐ 如果这个项目对你有帮助，请给它一个星标！**

</div>