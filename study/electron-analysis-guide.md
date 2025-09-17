# Electron 桌面应用打包方案分析

## 📋 项目概述

**七巧板项目**是一个基于 Svelte 5 + TypeScript + Vite 的低代码平台，具备以下特性：
- PWA 支持（已配置 Service Worker）
- 离线功能（IndexedDB 数据存储）
- 组件化架构
- 现代化 UI/UX
- 丰富的编辑器功能

## 🎯 Electron 方案分析

### ✅ **核心优势**

#### 1. **技术栈完美兼容**
```json
{
  "现有技术": ["Svelte 5", "TypeScript", "Vite", "PWA"],
  "Electron兼容性": "100%",
  "迁移成本": "极低"
}
```

#### 2. **快速集成能力**
- **零代码修改**：现有 Web 应用可直接运行
- **渐进式增强**：可逐步添加桌面特性
- **开发效率**：复用现有构建流程

#### 3. **丰富的桌面 API**
```javascript
// 文件系统访问
const { dialog, fs } = require('electron');

// 系统集成
const { shell, clipboard, nativeTheme } = require('electron');

// 窗口管理
const { BrowserWindow, Menu, Tray } = require('electron');
```

#### 4. **成熟的生态系统**
- **打包工具**：electron-builder, electron-forge
- **更新机制**：electron-updater
- **开发工具**：electron-devtools-installer
- **社区支持**：庞大的开发者社区

### 📊 **性能特征**

| 指标 | Electron | 说明 |
|------|----------|------|
| **包体积** | 120-200MB | 包含 Chromium 运行时 |
| **内存占用** | 80-150MB | 基础内存 + 应用内存 |
| **启动速度** | 2-4秒 | 取决于应用复杂度 |
| **运行性能** | 接近原生 | V8 引擎优化 |
| **跨平台** | ✅ 完美支持 | Windows/macOS/Linux |

### 🔧 **适用场景评估**

#### ✅ **非常适合七巧板项目的原因**

1. **现有投资保护**
   - 无需重写现有代码
   - 保持开发团队技能栈
   - 快速上线桌面版本

2. **功能需求匹配**
   - 文件系统访问（项目导入/导出）
   - 离线工作能力
   - 丰富的编辑器交互
   - 系统集成需求

3. **用户体验提升**
   - 独立应用图标
   - 系统通知
   - 快捷键支持
   - 拖拽文件支持

## 🚀 实施方案

### 第一阶段：基础集成

#### 1. **安装依赖**
```bash
# 开发依赖
npm install --save-dev electron electron-builder

# 可选：开发工具
npm install --save-dev electron-devtools-installer
```

#### 2. **创建主进程文件**
```javascript
// electron/main.js
const { app, BrowserWindow, Menu, dialog } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

class ElectronApp {
    constructor() {
        this.mainWindow = null;
        this.init();
    }

    init() {
        app.whenReady().then(() => {
            this.createWindow();
            this.setupMenu();
            this.setupAppEvents();
        });

        app.on('window-all-closed', () => {
            if (process.platform !== 'darwin') {
                app.quit();
            }
        });

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                this.createWindow();
            }
        });
    }

    createWindow() {
        this.mainWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            minWidth: 800,
            minHeight: 600,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                enableRemoteModule: false,
                preload: path.join(__dirname, 'preload.js')
            },
            icon: path.join(__dirname, '../public/icon-512.png'),
            titleBarStyle: 'default',
            show: false
        });

        // 加载应用
        const startUrl = isDev 
            ? 'http://localhost:5173' 
            : `file://${path.join(__dirname, '../dist/index.html')}`;
        
        this.mainWindow.loadURL(startUrl);

        // 窗口准备好后显示
        this.mainWindow.once('ready-to-show', () => {
            this.mainWindow.show();
            
            if (isDev) {
                this.mainWindow.webContents.openDevTools();
            }
        });
    }

    setupMenu() {
        const template = [
            {
                label: '文件',
                submenu: [
                    {
                        label: '新建项目',
                        accelerator: 'CmdOrCtrl+N',
                        click: () => this.handleNewProject()
                    },
                    {
                        label: '打开项目',
                        accelerator: 'CmdOrCtrl+O',
                        click: () => this.handleOpenProject()
                    },
                    {
                        label: '保存项目',
                        accelerator: 'CmdOrCtrl+S',
                        click: () => this.handleSaveProject()
                    },
                    { type: 'separator' },
                    {
                        label: '导出',
                        submenu: [
                            { label: '导出为 HTML', click: () => this.handleExport('html') },
                            { label: '导出为 JSON', click: () => this.handleExport('json') }
                        ]
                    }
                ]
            },
            {
                label: '编辑',
                submenu: [
                    { role: 'undo', label: '撤销' },
                    { role: 'redo', label: '重做' },
                    { type: 'separator' },
                    { role: 'cut', label: '剪切' },
                    { role: 'copy', label: '复制' },
                    { role: 'paste', label: '粘贴' }
                ]
            },
            {
                label: '视图',
                submenu: [
                    { role: 'reload', label: '重新加载' },
                    { role: 'forceReload', label: '强制重新加载' },
                    { role: 'toggleDevTools', label: '开发者工具' },
                    { type: 'separator' },
                    { role: 'resetZoom', label: '实际大小' },
                    { role: 'zoomIn', label: '放大' },
                    { role: 'zoomOut', label: '缩小' },
                    { type: 'separator' },
                    { role: 'togglefullscreen', label: '全屏' }
                ]
            }
        ];

        const menu = Menu.buildFromTemplate(template);
        Menu.setApplicationMenu(menu);
    }

    setupAppEvents() {
        // 处理文件拖拽
        this.mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
            const parsedUrl = new URL(navigationUrl);
            if (parsedUrl.origin !== 'http://localhost:5173' && !isDev) {
                event.preventDefault();
            }
        });
    }

    async handleNewProject() {
        this.mainWindow.webContents.send('menu-new-project');
    }

    async handleOpenProject() {
        const result = await dialog.showOpenDialog(this.mainWindow, {
            properties: ['openFile'],
            filters: [
                { name: '七巧板项目', extensions: ['qqb', 'json'] },
                { name: '所有文件', extensions: ['*'] }
            ]
        });

        if (!result.canceled) {
            this.mainWindow.webContents.send('menu-open-project', result.filePaths[0]);
        }
    }

    async handleSaveProject() {
        this.mainWindow.webContents.send('menu-save-project');
    }

    async handleExport(format) {
        this.mainWindow.webContents.send('menu-export', format);
    }
}

new ElectronApp();
```

#### 3. **创建预加载脚本**
```javascript
// electron/preload.js
const { contextBridge, ipcRenderer } = require('electron');

// 安全地暴露 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
    // 菜单事件监听
    onMenuAction: (callback) => {
        ipcRenderer.on('menu-new-project', callback);
        ipcRenderer.on('menu-open-project', callback);
        ipcRenderer.on('menu-save-project', callback);
        ipcRenderer.on('menu-export', callback);
    },

    // 文件操作
    showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
    showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
    writeFile: (filePath, data) => ipcRenderer.invoke('write-file', filePath, data),
    readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),

    // 系统集成
    showNotification: (title, body) => ipcRenderer.invoke('show-notification', title, body),
    openExternal: (url) => ipcRenderer.invoke('open-external', url),

    // 应用信息
    getVersion: () => ipcRenderer.invoke('get-version'),
    getPlatform: () => process.platform
});
```

#### 4. **更新 package.json**
```json
{
  "main": "electron/main.js",
  "homepage": "./",
  "scripts": {
    "electron": "electron .",
    "electron:dev": "concurrently \"npm run dev\" \"wait-on http://localhost:5173 && electron .\"",
    "electron:pack": "npm run build && electron-builder",
    "electron:dist": "npm run build && electron-builder --publish=never"
  },
  "build": {
    "appId": "com.qiqiaoban.app",
    "productName": "七巧板",
    "directories": {
      "output": "dist-electron"
    },
    "files": [
      "dist/**/*",
      "electron/**/*",
      "node_modules/**/*"
    ],
    "mac": {
      "category": "public.app-category.productivity",
      "icon": "public/icon-512.png"
    },
    "win": {
      "target": "nsis",
      "icon": "public/icon-512.png"
    },
    "linux": {
      "target": "AppImage",
      "icon": "public/icon-512.png"
    }
  }
}
```

### 第二阶段：功能增强

#### 1. **集成现有服务**
```typescript
// src/services/electron/electron.service.ts
export class ElectronService {
    private isElectron: boolean;

    constructor() {
        this.isElectron = !!(window && window.electronAPI);
    }

    async saveProject(projectData: any): Promise<void> {
        if (!this.isElectron) {
            // 回退到 Web 版本的保存逻辑
            this.saveToIndexedDB(projectData);
            return;
        }

        try {
            const result = await window.electronAPI.showSaveDialog({
                filters: [
                    { name: '七巧板项目', extensions: ['qqb'] },
                    { name: 'JSON 文件', extensions: ['json'] }
                ]
            });

            if (!result.canceled) {
                await window.electronAPI.writeFile(
                    result.filePath, 
                    JSON.stringify(projectData, null, 2)
                );
                
                this.showNotification('保存成功', '项目已保存到本地文件');
            }
        } catch (error) {
            console.error('保存项目失败:', error);
            // 回退到 IndexedDB
            this.saveToIndexedDB(projectData);
        }
    }

    async loadProject(): Promise<any> {
        if (!this.isElectron) {
            return this.loadFromIndexedDB();
        }

        try {
            const result = await window.electronAPI.showOpenDialog({
                properties: ['openFile'],
                filters: [
                    { name: '七巧板项目', extensions: ['qqb', 'json'] },
                    { name: '所有文件', extensions: ['*'] }
                ]
            });

            if (!result.canceled && result.filePaths.length > 0) {
                const fileContent = await window.electronAPI.readFile(result.filePaths[0]);
                return JSON.parse(fileContent);
            }
        } catch (error) {
            console.error('加载项目失败:', error);
        }

        return null;
    }

    private async saveToIndexedDB(projectData: any): Promise<void> {
        // 使用现有的 Dexie 数据库服务
        const { DatabaseService } = await import('../database/database.service');
        await DatabaseService.saveProject(projectData);
    }

    private async loadFromIndexedDB(): Promise<any> {
        const { DatabaseService } = await import('../database/database.service');
        return await DatabaseService.loadProject();
    }

    private showNotification(title: string, body: string): void {
        if (this.isElectron) {
            window.electronAPI.showNotification(title, body);
        } else {
            // Web 通知
            if ('Notification' in window) {
                new Notification(title, { body });
            }
        }
    }
}

export const electronService = new ElectronService();
```

#### 2. **增强组件集成**
```svelte
<!-- src/components/core/ProjectManager.svelte -->
<script lang="ts">
    import { onMount } from 'svelte';
    import { electronService } from '../../services/electron/electron.service';
    
    let isElectron = false;
    
    onMount(() => {
        isElectron = !!(window && window.electronAPI);
        
        if (isElectron) {
            // 监听菜单事件
            window.electronAPI.onMenuAction((event, data) => {
                switch (event) {
                    case 'menu-new-project':
                        handleNewProject();
                        break;
                    case 'menu-open-project':
                        handleOpenProject(data);
                        break;
                    case 'menu-save-project':
                        handleSaveProject();
                        break;
                    case 'menu-export':
                        handleExport(data);
                        break;
                }
            });
        }
    });
    
    async function handleSaveProject() {
        const projectData = getCurrentProjectData();
        await electronService.saveProject(projectData);
    }
    
    async function handleOpenProject(filePath?: string) {
        const projectData = await electronService.loadProject();
        if (projectData) {
            loadProjectData(projectData);
        }
    }
    
    function getCurrentProjectData() {
        // 获取当前项目数据的逻辑
        return {};
    }
    
    function loadProjectData(data: any) {
        // 加载项目数据的逻辑
    }
</script>

<div class="project-manager">
    {#if isElectron}
        <div class="electron-features">
            <button on:click={handleSaveProject}>
                💾 保存到文件
            </button>
            <button on:click={() => handleOpenProject()}>
                📁 从文件打开
            </button>
        </div>
    {/if}
    
    <!-- 现有的项目管理 UI -->
</div>
```

### 第三阶段：优化与发布

#### 1. **性能优化**
```javascript
// electron/main.js 优化配置
const windowConfig = {
    webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, 'preload.js'),
        // 性能优化
        webSecurity: true,
        allowRunningInsecureContent: false,
        experimentalFeatures: false
    },
    // 窗口优化
    show: false, // 防止白屏闪烁
    backgroundColor: '#ffffff',
    titleBarStyle: 'default'
};
```

#### 2. **自动更新配置**
```json
{
  "build": {
    "publish": [
      {
        "provider": "github",
        "owner": "your-username",
        "repo": "qi-qiao-ban"
      }
    ]
  }
}
```

## 📈 **迁移时间线**

| 阶段 | 时间 | 任务 | 产出 |
|------|------|------|------|
| **第1周** | 基础集成 | Electron 环境搭建 | 可运行的桌面应用 |
| **第2周** | 功能增强 | 文件操作、菜单集成 | 完整桌面体验 |
| **第3周** | 优化测试 | 性能优化、跨平台测试 | 发布候选版本 |
| **第4周** | 发布部署 | 打包、分发、文档 | 正式发布版本 |

## 🎯 **总结建议**

### ✅ **推荐 Electron 的理由**

1. **技术匹配度**: 100% 兼容现有技术栈
2. **开发效率**: 最快的桌面化路径
3. **功能完整性**: 满足所有桌面应用需求
4. **生态成熟度**: 丰富的工具和社区支持
5. **维护成本**: 与 Web 版本共享代码库

### 🚀 **立即开始**

建议从基础集成开始，逐步增强功能。这样可以：
- 快速验证可行性
- 降低技术风险
- 保持开发节奏
- 及时获得用户反馈

**下一步**: 是否需要我帮你创建 Electron 的基础配置文件？