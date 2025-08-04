# IndexedDB 前端本地数据库学习笔记

## 📋 学习背景
基于掘金文章 [前端本地存储数据库IndexedDB完整教程](https://juejin.cn/post/7026900352968425486) 整理的学习笔记，为低代码拖拽平台提供客户端数据持久化解决方案。

## 🎯 核心概念

### 1. IndexedDB 简介
**IndexedDB** 是浏览器提供的底层API，用于客户端存储大量结构化数据。相比localStorage的5MB限制，IndexedDB可存储数百MB数据。

**核心特点：**
- 非关系型数据库（NoSQL），键值对存储
- 支持事务（ACID特性）
- 异步操作，不阻塞主线程
- 同源策略限制
- 支持索引和游标查询
- 持久化存储，清除缓存不会丢失

### 2. 重要概念解析

#### 2.1 数据库（Database）
```javascript
// 创建/连接数据库
const request = indexedDB.open('drag-drop-db', 1);

request.onerror = (event) => {
  console.error('数据库打开失败:', event.target.error);
};

request.onsuccess = (event) => {
  const db = event.target.result;
  console.log('数据库连接成功');
};

request.onupgradeneeded = (event) => {
  const db = event.target.result;
  // 创建对象存储空间（类似表）
  if (!db.objectStoreNames.contains('components')) {
    const store = db.createObjectStore('components', { keyPath: 'id', autoIncrement: true });
    // 创建索引
    store.createIndex('type', 'type', { unique: false });
    store.createIndex('pageId', 'pageId', { unique: false });
  }
};
```

#### 2.2 对象存储空间（Object Store）
类似关系型数据库的表，但结构更灵活：

```javascript
// 创建对象存储空间的配置选项
const objectStore = db.createObjectStore('projects', {
  keyPath: 'id',        // 主键
  autoIncrement: true   // 自增ID
});

// 创建索引
objectStore.createIndex('name', 'name', { unique: false });
objectStore.createIndex('createdAt', 'createdAt', { unique: false });
```

#### 2.3 事务（Transaction）
所有操作都必须在事务中进行：

```javascript
// 创建事务
const transaction = db.transaction(['components'], 'readwrite');
const store = transaction.objectStore('components');

// 添加数据
const addRequest = store.add({
  type: 'button',
  x: 100,
  y: 200,
  width: 120,
  height: 40,
  pageId: 'page-001',
  createdAt: new Date()
});

addRequest.onsuccess = () => {
  console.log('数据添加成功，ID:', addRequest.result);
};

transaction.oncomplete = () => {
  console.log('事务完成');
};

transaction.onerror = (event) => {
  console.error('事务错误:', event.target.error);
};
```

#### 2.4 索引（Index）
提高查询效率的关键：

```javascript
// 创建复合索引
store.createIndex('position', ['x', 'y'], { unique: false });

// 使用索引查询
const index = store.index('type');
const request = index.getAll('button');
```

#### 2.5 游标（Cursor）
遍历数据的指针：

```javascript
// 使用游标遍历
const transaction = db.transaction(['components']);
const store = transaction.objectStore('components');

const cursor = store.openCursor();

cursor.onsuccess = (event) => {
  const cursor = event.target.result;
  if (cursor) {
    console.log('组件:', cursor.value);
    cursor.continue();
  } else {
    console.log('遍历完成');
  }
};

// 使用键范围
const range = IDBKeyRange.bound(1, 100);
const cursor = store.openCursor(range);
```

## 💻 实际应用示例

### 1. 拖拽项目数据模型设计

```javascript
// 项目数据结构
interface Project {
  id?: number;
  name: string;
  description: string;
  pages: Page[];
  createdAt: Date;
  updatedAt: Date;
}

interface Page {
  id: string;
  name: string;
  components: Component[];
  styles: Record<string, any>;
}

interface Component {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  styles: Record<string, any>;
  props: Record<string, any>;
  events: Record<string, string>;
}
```

### 2. 封装IndexedDB工具类

```javascript
// db/IndexedDBManager.ts
class IndexedDBManager {
  private dbName: string;
  private version: number;
  private db: IDBDatabase | null = null;

  constructor(dbName: string, version: number) {
    this.dbName = dbName;
    this.version = version;
  }

  async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // 项目表
        if (!db.objectStoreNames.contains('projects')) {
          const projectStore = db.createObjectStore('projects', { keyPath: 'id', autoIncrement: true });
          projectStore.createIndex('name', 'name', { unique: true });
          projectStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // 页面表
        if (!db.objectStoreNames.contains('pages')) {
          const pageStore = db.createObjectStore('pages', { keyPath: 'id' });
          pageStore.createIndex('projectId', 'projectId', { unique: false });
          pageStore.createIndex('name', 'name', { unique: false });
        }

        // 组件表
        if (!db.objectStoreNames.contains('components')) {
          const componentStore = db.createObjectStore('components', { keyPath: 'id' });
          componentStore.createIndex('pageId', 'pageId', { unique: false });
          componentStore.createIndex('type', 'type', { unique: false });
          componentStore.createIndex('position', ['x', 'y'], { unique: false });
        }
      };
    });
  }

  async saveProject(project: Project): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['projects'], 'readwrite');
      const store = transaction.objectStore('projects');
      
      const request = store.add({
        ...project,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  }

  async getProjects(): Promise<Project[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['projects'], 'readonly');
      const store = transaction.objectStore('projects');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveComponent(component: Component, pageId: string): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['components'], 'readwrite');
      const store = transaction.objectStore('components');
      
      const request = store.put({
        ...component,
        pageId,
        updatedAt: new Date()
      });

      request.onsuccess = () => resolve(request.result as string);
      request.onerror = () => reject(request.error);
    });
  }

  async getComponentsByPage(pageId: string): Promise<Component[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['components'], 'readonly');
      const store = transaction.objectStore('components');
      const index = store.index('pageId');
      const request = index.getAll(pageId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteProject(projectId: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['projects', 'pages', 'components'], 'readwrite');
      
      // 删除项目下的所有页面和组件
      const pageStore = transaction.objectStore('pages');
      const componentStore = transaction.objectStore('components');
      
      // 获取该项目下的所有页面
      const pageIndex = pageStore.index('projectId');
      const pageRequest = pageIndex.getAll(projectId);

      pageRequest.onsuccess = () => {
        const pages = pageRequest.result;
        
        // 删除所有相关组件
        pages.forEach(page => {
          const componentIndex = componentStore.index('pageId');
          componentIndex.getAll(page.id).onsuccess = (event) => {
            const components = (event.target as IDBRequest).result;
            components.forEach(component => {
              componentStore.delete(component.id);
            });
          };
        });

        // 删除页面
        const pageCursor = pageIndex.openCursor(IDBKeyRange.only(projectId));
        pageCursor.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          }
        };

        // 删除项目
        const projectStore = transaction.objectStore('projects');
        projectStore.delete(projectId);
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export default IndexedDBManager;
```

### 3. 在Svelte5中的使用示例

```typescript
// stores/projectStore.svelte.ts
import IndexedDBManager from '../db/IndexedDBManager';

let dbManager: IndexedDBManager;
let projects = $state<Project[]>([]);
let currentProject = $state<Project | null>(null);

// 初始化数据库
async function initDB() {
  dbManager = new IndexedDBManager('drag-drop-db', 1);
  await dbManager.initDB();
  await loadProjects();
}

// 加载项目列表
async function loadProjects() {
  projects = await dbManager.getProjects();
}

// 创建新项目
async function createProject(name: string, description: string) {
  const project: Omit<Project, 'id'> = {
    name,
    description,
    pages: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  const projectId = await dbManager.saveProject(project);
  await loadProjects();
  return projectId;
}

// 保存组件
async function saveComponent(component: Component, pageId: string) {
  await dbManager.saveComponent(component, pageId);
}

// 导出供组件使用
export const projectStore = {
  projects: () => projects,
  currentProject: () => currentProject,
  initDB,
  createProject,
  saveComponent
};
```

## ⚠️ 注意事项与最佳实践

### 1. 错误处理
```javascript
// 统一的错误处理
const handleDBError = (error) => {
  console.error('IndexedDB Error:', error);
  // 降级到localStorage或其他存储方案
};
```

### 2. 版本管理
```javascript
// 数据库版本升级处理
request.onupgradeneeded = (event) => {
  const db = event.target.result;
  const oldVersion = event.oldVersion;
  
  if (oldVersion < 2) {
    // 版本2的升级逻辑
    const store = db.createObjectStore('newStore', { keyPath: 'id' });
  }
};
```

### 3. 性能优化
- 使用索引避免全表扫描
- 批量操作减少事务开销
- 合理使用游标避免内存溢出
- 及时关闭数据库连接

### 4. 浏览器兼容性
```javascript
// 兼容性检测
const isIndexedDBSupported = () => {
  return 'indexedDB' in window;
};

// 降级方案
const storageFallback = () => {
  return localStorage;
};
```

## 📊 与其他存储方案对比

| 特性 | IndexedDB | localStorage | sessionStorage |
|------|-----------|--------------|----------------|
| 存储容量 | 数百MB | 5-10MB | 5-10MB |
| 数据类型 | 结构化数据 | 字符串 | 字符串 |
| 查询能力 | 索引+游标 | 键值查询 | 键值查询 |
| 事务支持 | ✅ | ❌ | ❌ |
| 异步操作 | ✅ | ❌ | ❌ |
| 浏览器兼容 | 现代浏览器 | 全兼容 | 全兼容 |

## 🚀 下一步学习方向

1. **Dexie.js封装库**：学习更简洁的IndexedDB封装
2. **Web Workers**：在后台线程中处理大量数据
3. **数据同步**：实现客户端与服务端的数据同步
4. **性能监控**：监控数据库操作的性能指标
5. **数据迁移**：处理数据库结构变更的数据迁移

## 📚 参考资料
- [MDN IndexedDB API文档](https://developer.mozilla.org/zh-CN/docs/Web/API/IndexedDB_API)
- [掘金教程：前端本地存储数据库IndexedDB完整教程](https://juejin.cn/post/7026900352968425486)
- [Can I Use: IndexedDB兼容性](https://caniuse.com/indexeddb)

---
*学习笔记整理时间：2025年7月*
*适用项目：低代码拖拽平台数据持久化*