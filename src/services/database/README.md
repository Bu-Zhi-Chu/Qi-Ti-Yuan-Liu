# 数据库服务文档

## 概述

`dexie-service.ts` 是基于 Dexie.js 的 IndexedDB 封装服务，炁体源流项目提供完整的数据持久化解决方案。支持项目、组件、历史记录等核心数据的增删改查操作。

## 技术栈

-   **Dexie.js**: IndexedDB 的 Promise-based 封装库
-   **TypeScript**: 提供完整的类型支持
-   **Svelte 5**: 响应式状态管理
-   **ES2022+**: 现代 JavaScript 特性

## 数据模型

### Project 项目模型

```typescript
interface Project {
    id: number
    name: string
    description: string
    pages: Array<{
        id: string
        name: string
        width: number
        height: number
    }>
    settings: Record<string, any>
    createdAt: Date
    updatedAt: Date
    version: string
    isArchived: boolean
    mode: 'edit' | 'normal' // 项目模式：编辑模式或正常模式
}
```

### DragComponent 组件模型

```typescript
interface DragComponent {
    id: number
    pageId: string
    type: string
    x: number
    y: number
    width: number
    height: number
    zIndex: number
    properties: Record<string, any>
    createdAt: Date
    updatedAt: Date
    isLocked: boolean
}
```

### HistoryRecord 历史记录模型

```typescript
interface HistoryRecord {
    id: number
    projectId: number
    action: string
    data: any
    timestamp: Date
    userId?: string
}
```

## API 接口文档

### 项目管理

#### createProject

创建新项目

```typescript
static async createProject(projectData: Omit<Project, 'id'>): Promise<number>
```

**参数：**

-   `projectData`: 项目数据（不含 ID）

**返回值：**

-   新创建的项目 ID

**示例：**

```typescript
const projectId = await DexieService.createProject({
    name: '我的设计',
    description: '这是一个测试项目',
    pages: [{ id: 'page-1', name: '首页', width: 1920, height: 1000 }],
    settings: { theme: 'light' }
})
```

#### getProjects

获取所有项目

```typescript
static async getProjects(): Promise<Project[]>
```

**返回值：**

-   按更新时间倒序排列的项目列表

#### getProject

根据 ID 获取项目

```typescript
static async getProject(id: number): Promise<Project | undefined>
```

**参数：**

-   `id`: 项目 ID

#### updateProject

更新项目信息

```typescript
static async updateProject(
  id: number,
  updates: Partial<Omit<Project, 'id'>>
): Promise<boolean>
```

**参数：**

-   `id`: 项目 ID
-   `updates`: 要更新的字段

**返回值：**

-   更新是否成功

#### deleteProject

删除项目（级联删除相关数据）

```typescript
static async deleteProject(id: number): Promise<boolean>
```

**说明：**

-   删除项目时会自动删除相关的组件和历史记录

#### getProjectsPaginated

分页查询项目

```typescript
static async getProjectsPaginated(
  page: number = 1,
  limit: number = 10
): Promise<{
  projects: Project[]
  total: number
  totalPages: number
}>
```

### 组件管理

#### createComponent

创建新组件

```typescript
static async createComponent(
  componentData: Omit<DragComponent, 'id'>
): Promise<number>
```

#### createComponents

批量创建组件

```typescript
static async createComponents(
  components: Omit<DragComponent, 'id'>[]
): Promise<number[]>
```

#### getComponentsByPage

获取指定页面的所有组件

```typescript
static async getComponentsByPage(pageId: string): Promise<DragComponent[]>
```

#### getComponentsByType

获取指定类型的组件

```typescript
static async getComponentsByType(type: string): Promise<DragComponent[]>
```

#### updateComponent

更新组件信息

```typescript
static async updateComponent(
  id: number,
  updates: Partial<Omit<DragComponent, 'id'>>
): Promise<boolean>
```

#### updateComponents

批量更新组件

```typescript
static async updateComponents(
  updates: Array<{
    id: number
    data: Partial<Omit<DragComponent, 'id'>>
  }>
): Promise<number[]>
```

#### deleteComponent

删除单个组件

```typescript
static async deleteComponent(id: number): Promise<boolean>
```

#### deleteComponents

批量删除组件

```typescript
static async deleteComponents(ids: number[]): Promise<number>
```

#### getComponentsInArea

获取指定区域内的组件

```typescript
static async getComponentsInArea(
  pageId: string,
  bounds: { x: number; y: number; width: number; height: number }
): Promise<DragComponent[]>
```

### 历史记录管理

#### addHistory

添加历史记录

```typescript
static async addHistory(record: Omit<HistoryRecord, 'id'>): Promise<number>
```

#### getHistory

获取项目历史记录

```typescript
static async getHistory(
  projectId: number,
  limit: number = 50
): Promise<HistoryRecord[]>
```

#### clearHistory

清理项目历史记录

```typescript
static async clearHistory(projectId: number): Promise<number>
```

## 工具方法

### getStats

获取数据库统计信息

```typescript
static async getStats(): Promise<{
  projects: number      // 项目数量
  components: number    // 组件数量
  history: number       // 历史记录数量
  totalSize: number     // 估算总大小（字节）
}>
```

### exportProject

导出项目数据

```typescript
static async exportProject(projectId: number): Promise<string>
```

**返回值：**

-   JSON 格式的项目数据字符串

### importProject

导入项目数据

```typescript
static async importProject(jsonData: string): Promise<number>
```

**参数：**

-   `jsonData`: JSON 格式的项目数据

**返回值：**

-   新创建的项目 ID

### backup

备份整个数据库

```typescript
static async backup(): Promise<{
  projects: Project[]
  components: DragComponent[]
  history: HistoryRecord[]
  timestamp: string
}>
```

### restore

从备份恢复数据库

```typescript
static async restore(backupData: any): Promise<boolean>
```

## 使用示例

### 基础使用

```typescript
import DexieService from './services/database/dexie-service'

// 初始化数据库（自动完成）
await DexieService.init()

// 创建项目
const projectId = await DexieService.createProject({
    name: '响应式网站',
    description: '企业官网设计',
    pages: [
        { id: 'home', name: '首页', width: 1920, height: 1000 },
        { id: 'about', name: '关于我们', width: 1920, height: 1000 }
    ],
    settings: {
        theme: 'modern',
        primaryColor: '#007bff'
    }
})

// 添加组件
const componentId = await DexieService.createComponent({
    pageId: 'home',
    type: 'text',
    x: 100,
    y: 200,
    width: 300,
    height: 100,
    zIndex: 1,
    properties: {
        text: '欢迎来到我们的网站',
        fontSize: 24,
        color: '#333'
    }
})

// 保存历史记录
await DexieService.addHistory({
    projectId,
    action: 'component_created',
    data: { componentId, type: 'text' }
})
```

### 批量操作

```typescript
// 批量创建组件
const components = [
    {
        pageId: 'home',
        type: 'button',
        x: 150,
        y: 350,
        width: 120,
        height: 40,
        zIndex: 2,
        properties: { text: '立即开始', variant: 'primary' }
    },
    {
        pageId: 'home',
        type: 'image',
        x: 500,
        y: 200,
        width: 400,
        height: 300,
        zIndex: 1,
        properties: { src: '/assets/hero.jpg', alt: 'Hero Image' }
    }
]

const componentIds = await DexieService.createComponents(components)

// 批量更新组件位置
await DexieService.updateComponents([
    { id: componentIds[0], data: { x: 200, y: 400 } },
    { id: componentIds[1], data: { x: 550, y: 250 } }
])
```

### 数据导出导入

```typescript
// 导出项目
const projectData = await DexieService.exportProject(projectId)
const blob = new Blob([projectData], { type: 'application/json' })
const url = URL.createObjectURL(blob)

// 创建下载链接
const a = document.createElement('a')
a.href = url
a.download = `project-${projectId}.json`
a.click()

// 导入项目
const importedProjectId = await DexieService.importProject(projectData)
```

### 分页查询

```typescript
// 获取第2页，每页10个项目
const { projects, total, totalPages } = await DexieService.getProjectsPaginated(2, 10)

console.log(`总项目数: ${total}`)
console.log(`总页数: ${totalPages}`)
console.log(`当前页项目:`, projects)
```

## 错误处理

所有方法都包含错误处理机制，如果操作失败会抛出相应的错误：

```typescript
try {
    const project = await DexieService.getProject(999)
    if (!project) {
        console.log('项目不存在')
    }
} catch (error) {
    console.error('获取项目失败:', error)
}
```

## 性能优化

-   **索引优化**: 基于 pageId、type 等字段建立索引
-   **批量操作**: 使用 bulkAdd、bulkDelete 等批量 API
-   **事务支持**: 复杂操作使用事务保证数据一致性
-   **懒加载**: 分页查询避免一次性加载大量数据

## 浏览器兼容性

-   Chrome 49+
-   Firefox 45+
-   Safari 10+
-   Edge 12+

## 注意事项

1. **初始化**: 首次使用时会自动初始化数据库，无需手动调用
2. **版本升级**: 数据库结构变更时会自动迁移数据
3. **存储限制**: IndexedDB 存储空间取决于浏览器和磁盘空间
4. **数据安全**: 敏感数据建议加密后存储
5. **备份策略**: 定期使用 backup()方法创建数据备份

## 更新日志

### v1.0.0

-   初始版本发布
-   支持项目、组件、历史记录的完整 CRUD 操作
-   添加数据导出导入功能
-   支持批量操作和分页查询
