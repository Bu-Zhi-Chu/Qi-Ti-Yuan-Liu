# Dexie.js 全面学习指南

## 🎯 学习背景

基于最新版 Dexie.js 4.0.11（2025 年 1 月发布）的完整学习指南，专为低代码拖拽平台优化设计。相比原生 IndexedDB，Dexie.js 提供更简洁的 Promise-based API 和更强大的查询能力。

## 📦 安装与配置

### 1. 安装方式

```bash
# NPM安装（推荐）
npm install dexie

# 或CDN引入
<script src="https://unpkg.com/dexie@4.0.11/dist/dexie.min.js"></script>
```

### 2. 基础配置

```typescript
// src/db/dexie-setup.ts
import Dexie, { type EntityTable } from 'dexie'

// 定义数据类型接口
export interface DragComponent {
    id?: number
    type: string
    x: number
    y: number
    width: number
    height: number
    styles: Record<string, any>
    props: Record<string, any>
    events: Record<string, string>
    pageId: string
    parentId?: string
    zIndex: number
    createdAt: Date
    updatedAt: Date
}

export interface Project {
    id?: number
    name: string
    description: string
    thumbnail?: string
    pages: Page[]
    settings: Record<string, any>
    createdAt: Date
    updatedAt: Date
    version: string
}

export interface Page {
    id: string
    name: string
    width: number
    height: number
    background: string
    components: DragComponent[]
    meta: Record<string, any>
}

// 创建数据库实例
export class DragDropDatabase extends Dexie {
    projects!: EntityTable<Project, 'id'>
    components!: EntityTable<DragComponent, 'id'>
    pages!: EntityTable<Page, 'id'>

    constructor() {
        super('drag-drop-platform')

        this.version(1).stores({
            projects: '++id, name, createdAt, updatedAt',
            components: '++id, type, pageId, parentId, [x+y], zIndex, createdAt',
            pages: 'id, name'
        })

        // 版本升级示例
        this.version(2)
            .stores({
                projects: '++id, name, &name, createdAt, updatedAt, version',
                components: '++id, type, pageId, parentId, [x+y], [type+pageId], zIndex, createdAt, updatedAt',
                pages: 'id, name, [name+width]'
            })
            .upgrade((tx) => {
                // 数据迁移：为现有项目添加版本号
                return tx.projects.toCollection().modify((project) => {
                    project.version = '1.0.0'
                })
            })
    }
}

// 创建全局数据库实例
export const db = new DragDropDatabase()
```

## 🚀 核心操作详解

### 1. 项目操作（Project CRUD）

#### 创建项目

```typescript
// src/services/project-service.ts
import { db } from '../db/dexie-setup'

export class ProjectService {
    static async createProject(name: string, description: string): Promise<number> {
        const project = {
            name,
            description,
            pages: [
                {
                    id: 'page-1',
                    name: '首页',
                    width: 1920,
                    height: 1000,
                    background: '#ffffff',
                    components: [],
                    meta: { title: '首页', description: '' }
                }
            ],
            settings: {
                theme: 'light',
                responsive: true,
                breakpoints: [768, 1024, 1440]
            },
            createdAt: new Date(),
            updatedAt: new Date(),
            version: '1.0.0'
        }

        return await db.projects.add(project)
    }

    static async duplicateProject(projectId: number): Promise<number> {
        const original = await db.projects.get(projectId)
        if (!original) throw new Error('Project not found')

        const duplicated = {
            ...original,
            name: `${original.name} - 副本`,
            createdAt: new Date(),
            updatedAt: new Date(),
            id: undefined // 让数据库自动生成新ID
        }

        return await db.projects.add(duplicated)
    }
}
```

#### 高级查询

```typescript
// 分页查询项目
static async getProjectsPaginated(page: number = 1, limit: number = 10) {
  const offset = (page - 1) * limit;
  const projects = await db.projects
    .orderBy('updatedAt')
    .reverse()
    .offset(offset)
    .limit(limit)
    .toArray();

  const total = await db.projects.count();

  return {
    projects,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}

// 模糊搜索项目
static async searchProjects(query: string) {
  return await db.projects
    .where('name')
    .startsWithIgnoreCase(query)
    .or('description')
    .startsWithIgnoreCase(query)
    .toArray();
}
```

### 2. 组件操作（Component Operations）

#### 批量组件操作

```typescript
// src/services/component-service.ts
import { db } from '../db/dexie-setup'

export class ComponentService {
    static async addComponents(components: DragComponent[]): Promise<number[]> {
        const componentsWithTimestamps = components.map((comp) => ({
            ...comp,
            createdAt: new Date(),
            updatedAt: new Date()
        }))

        return await db.components.bulkAdd(componentsWithTimestamps)
    }

    static async updateComponentPosition(componentId: number, x: number, y: number): Promise<number> {
        return await db.components.update(componentId, { x, y, updatedAt: new Date() })
    }

    static async getComponentsByPage(pageId: string): Promise<DragComponent[]> {
        return await db.components.where('pageId').equals(pageId).sortBy('zIndex')
    }

    static async getComponentsByType(type: string): Promise<DragComponent[]> {
        return await db.components.where('type').equals(type).toArray()
    }

    // 高级：获取重叠组件
    static async getOverlappingComponents(pageId: string, bounds: { x: number; y: number; width: number; height: number }): Promise<DragComponent[]> {
        const { x, y, width, height } = bounds

        return await db.components
            .where('pageId')
            .equals(pageId)
            .and((comp) => comp.x < x + width && comp.x + comp.width > x && comp.y < y + height && comp.y + comp.height > y)
            .toArray()
    }
}
```

### 3. 复杂查询与过滤

#### 复合索引查询

```typescript
// 使用复合索引查询特定类型的组件
static async getComponentsByTypeAndPage(type: string, pageId: string) {
  return await db.components
    .where('[type+pageId]')
    .equals([type, pageId])
    .toArray();
}

// 范围查询（获取特定区域内的组件）
static async getComponentsInArea(
  pageId: string,
  area: { x1: number; y1: number; x2: number; y2: number }
) {
  return await db.components
    .where('[x+y]')
    .between([area.x1, area.y1], [area.x2, area.y2])
    .and(comp => comp.pageId === pageId)
    .toArray();
}
```

### 4. 实时数据同步

#### Svelte5 响应式集成

```typescript
// src/stores/database-store.svelte.ts
import { liveQuery } from 'dexie'
import { db } from '../db/dexie-setup'

// 实时查询项目列表
export const projects = liveQuery(() => db.projects.orderBy('updatedAt').reverse().toArray())

// 实时获取特定页面的组件
export const getPageComponents = (pageId: string) => liveQuery(() => db.components.where('pageId').equals(pageId).sortBy('zIndex'))

// 实时搜索
export const searchComponents = (query: string) => liveQuery(() => (query ? db.components.where('type').startsWithIgnoreCase(query).or('props.text').startsWithIgnoreCase(query).toArray() : []))
```

## 🔧 高级功能

### 1. 事务管理

```typescript
// 复杂事务：创建项目同时添加默认组件
export async function createProjectWithDefaults(projectData: Omit<Project, 'id'>): Promise<number> {
    return await db.transaction('rw', [db.projects, db.components], async () => {
        const projectId = await db.projects.add({
            ...projectData,
            createdAt: new Date(),
            updatedAt: new Date()
        })

        // 添加默认标题组件
        await db.components.add({
            type: 'text',
            x: 100,
            y: 100,
            width: 200,
            height: 50,
            styles: { fontSize: 24, color: '#333' },
            props: { text: '欢迎使用拖拽平台' },
            pageId: projectData.pages[0].id,
            zIndex: 1,
            createdAt: new Date(),
            updatedAt: new Date()
        })

        return projectId
    })
}
```

### 2. 数据迁移

```typescript
// 版本升级时的数据迁移策略
class DatabaseMigration {
    static async migrateToV3() {
        await db
            .version(3)
            .stores({
                projects: '++id, name, &name, createdAt, updatedAt, version, isArchived',
                components: '++id, type, pageId, parentId, [type+pageId], [x+y], zIndex, isLocked, createdAt, updatedAt'
            })
            .upgrade(async (tx) => {
                // 为现有组件添加锁定状态
                await tx.components.toCollection().modify((comp) => {
                    comp.isLocked = false
                })

                // 为现有项目添加归档状态
                await tx.projects.toCollection().modify((project) => {
                    project.isArchived = false
                })
            })
    }
}
```

### 3. 性能优化

```typescript
// 批量操作优化
export class BatchOperations {
    static async bulkUpdateComponents(updates: Array<{ id: number; data: Partial<DragComponent> }>) {
        return await db.transaction('rw', db.components, async () => {
            const promises = updates.map(({ id, data }) => db.components.update(id, { ...data, updatedAt: new Date() }))
            return await Promise.all(promises)
        })
    }

    static async exportProject(projectId: number): Promise<string> {
        const project = await db.projects.get(projectId)
        if (!project) throw new Error('Project not found')

        const components = await db.components.toArray()
        const projectData = {
            project,
            components: components.filter((c) => project.pages.some((page) => page.id === c.pageId))
        }

        return JSON.stringify(projectData, null, 2)
    }

    static async importProject(jsonData: string): Promise<number> {
        const { project, components } = JSON.parse(jsonData)

        return await db.transaction('rw', [db.projects, db.components], async () => {
            const newProjectId = await db.projects.add({
                ...project,
                name: `${project.name} - 导入`,
                createdAt: new Date(),
                updatedAt: new Date(),
                id: undefined
            })

            await db.components.bulkAdd(
                components.map((comp: DragComponent) => ({
                    ...comp,
                    id: undefined,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }))
            )

            return newProjectId
        })
    }
}
```

## 🚨 错误处理与调试

### 1. 错误处理策略

```typescript
export class DatabaseErrorHandler {
    static async safeOperation<T>(operation: () => Promise<T>, fallback?: T): Promise<T> {
        try {
            return await operation()
        } catch (error) {
            console.error('Database operation failed:', error)

            // 根据错误类型提供降级方案
            if (error.name === 'QuotaExceededError') {
                // 存储空间不足
                await this.cleanupOldData()
            } else if (error.name === 'VersionError') {
                // 版本错误，尝试重新初始化
                await this.reinitializeDatabase()
            }

            return fallback
        }
    }

    private static async cleanupOldData() {
        // 清理策略：删除旧项目
        const oldProjects = await db.projects.orderBy('updatedAt').limit(5).toArray()

        for (const project of oldProjects) {
            if (project.id) {
                await db.projects.delete(project.id)
            }
        }
    }

    private static async reinitializeDatabase() {
        await db.delete()
        location.reload()
    }
}
```

## 🧪 测试与验证

### 1. 单元测试示例

```typescript
// tests/database.test.ts
import { db } from '../src/db/dexie-setup'

describe('Database Operations', () => {
    beforeEach(async () => {
        await db.delete()
        await db.open()
    })

    afterAll(async () => {
        await db.delete()
    })

    test('should create project with components', async () => {
        const projectId = await db.projects.add({
            name: '测试项目',
            description: '测试描述',
            pages: [{ id: 'page-1', name: '首页', components: [] }],
            settings: {},
            createdAt: new Date(),
            updatedAt: new Date(),
            version: '1.0.0'
        })

        const componentId = await db.components.add({
            type: 'button',
            x: 100,
            y: 200,
            width: 120,
            height: 40,
            styles: {},
            props: { text: '点击我' },
            pageId: 'page-1',
            zIndex: 1,
            createdAt: new Date(),
            updatedAt: new Date()
        })

        const project = await db.projects.get(projectId)
        const component = await db.components.get(componentId)

        expect(project?.name).toBe('测试项目')
        expect(component?.type).toBe('button')
    })
})
```

## 📊 性能监控

### 1. 性能指标收集

```typescript
export class DatabaseMetrics {
    private static metrics = {
        queryTime: [],
        writeTime: [],
        transactionCount: 0,
        errorCount: 0
    }

    static async measureQuery<T>(operation: () => Promise<T>, label: string): Promise<T> {
        const start = performance.now()
        try {
            const result = await operation()
            const duration = performance.now() - start

            this.metrics.queryTime.push({ label, duration })
            console.log(`${label}: ${duration}ms`)

            return result
        } catch (error) {
            this.metrics.errorCount++
            throw error
        }
    }

    static getMetrics() {
        return { ...this.metrics }
    }
}
```

## 🔮 未来展望

### 1. 与云端同步

```typescript
// 未来的云端同步策略
export class CloudSync {
    static async syncWithServer(projectId: number) {
        const project = await db.projects.get(projectId)
        const components = await db.components
            .where('pageId')
            .anyOf(project?.pages.map((p) => p.id) || [])
            .toArray()

        // 发送到服务器
        await fetch('/api/sync', {
            method: 'POST',
            body: JSON.stringify({ project, components })
        })
    }
}
```

## 📚 总结与最佳实践

### 核心优势

1. **简洁 API**：相比原生 IndexedDB 减少 70%代码量
2. **Promise 支持**：完美适配 async/await 语法
3. **类型安全**：完整 TypeScript 支持
4. **实时响应**：与 Svelte5 响应式系统无缝集成
5. **事务管理**：自动处理复杂事务逻辑

### 最佳实践清单

-   [x] 使用复合索引优化查询性能
-   [x] 批量操作减少事务开销
-   [x] 实时数据同步提升用户体验
-   [x] 完善的错误处理和降级策略
-   [x] 版本升级时的数据迁移方案
-   [x] 性能监控和优化

### 学习路径

1. 掌握基础 CRUD 操作
2. 学习复合索引和高级查询
3. 实现实时响应式数据流
4. 掌握事务和批量操作
5. 构建完整的数据持久化方案

---

_学习指南基于 Dexie.js 4.0.11 版本，2025 年 7 月更新_
_专为低代码拖拽平台设计优化_
