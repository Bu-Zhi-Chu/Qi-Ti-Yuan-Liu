# 前端 Mock 拦截器实现方案

## 需求概述

实现一个前端 Mock 拦截器，通过变量控制是否拦截指定请求路径，并返回预设的 Mock 数据，而不是传统的后端 Mock 服务器。

## 核心特性

1. **前端拦截**：在浏览器端拦截 HTTP 请求
2. **变量控制**：通过开关变量控制是否启用 Mock
3. **动态配置**：支持运行时配置拦截路径和返回数据
4. **零依赖**：基于浏览器原生 API 实现
5. **框架无关**：可集成到任何前端框架

## 技术方案

### 1. 拦截机制选择

使用 `fetch` API 的拦截方案：
- 重写全局 `fetch` 函数
- 在请求发送前进行拦截判断
- 匹配配置的 Mock 规则则返回 Mock 数据

### 2. 配置管理

```typescript
interface MockConfig {
  enabled: boolean;                    // 总开关
  rules: MockRule[];                   // Mock 规则列表
  defaultDelay?: number;               // 默认延迟时间(ms)
}

interface MockRule {
  id: string;                           // 规则ID
  enabled: boolean;                   // 规则开关
  method: string;                     // HTTP方法 (GET, POST, etc.)
  urlPattern: string | RegExp;        // URL匹配模式
  response: MockResponse;             // 响应配置
  delay?: number;                     // 延迟时间
  description?: string;               // 规则描述
}

interface MockResponse {
  status: number;                     // HTTP状态码
  headers?: Record<string, string>;   // 响应头
  data: any;                         // 响应数据
}
```

### 3. 实现架构

```
Frontend Mock Interceptor
├── Core
│   ├── FetchInterceptor.ts          // fetch拦截器
│   ├── XHRInterceptor.ts           // XMLHttpRequest拦截器
│   └── InterceptorManager.ts       // 拦截器管理器
├── Config
│   ├── MockConfig.ts              // 配置管理
│   ├── MockStorage.ts             // 本地存储
│   └── MockValidator.ts           // 配置验证
├── UI
│   ├── MockPanel.svelte           // 配置面板
│   ├── MockList.svelte           // 规则列表
│   └── MockEditor.svelte         // 规则编辑器
└── Utils
    ├── URLMatcher.ts              // URL匹配工具
    ├── ResponseGenerator.ts       // 响应生成器
    └── DelaySimulator.ts         // 延迟模拟器
```

## 详细实现

### 1. 核心拦截器 (FetchInterceptor.ts)

```typescript
export class FetchInterceptor {
  private originalFetch: typeof fetch;
  private isActive: boolean = false;
  private rules: MockRule[] = [];

  constructor() {
    this.originalFetch = window.fetch;
  }

  activate(rules: MockRule[]) {
    if (this.isActive) return;

    this.rules = rules;
    this.isActive = true;
    this.intercept();
  }

  deactivate() {
    if (!this.isActive) return;

    this.isActive = false;
    window.fetch = this.originalFetch;
  }

  updateRules(rules: MockRule[]) {
    this.rules = rules;
  }

  private intercept() {
    const self = this;

    window.fetch = async function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const method = init?.method || 'GET';

      // 查找匹配的 Mock 规则
      const matchedRule = self.findMatchingRule(url, method);

      if (matchedRule) {
        return self.createMockResponse(matchedRule);
      }

      // 没有匹配规则，调用原始 fetch
      return self.originalFetch.call(window, input, init);
    };
  }

  private findMatchingRule(url: string, method: string): MockRule | undefined {
    return this.rules.find(rule =>
      rule.enabled &&
      rule.method.toUpperCase() === method.toUpperCase() &&
      this.matchUrl(url, rule.urlPattern)
    );
  }

  private matchUrl(url: string, pattern: string | RegExp): boolean {
    if (pattern instanceof RegExp) {
      return pattern.test(url);
    }

    // 支持通配符匹配
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');

    return new RegExp(`^${regexPattern}$`).test(url);
  }

  private async createMockResponse(rule: MockRule): Promise<Response> {
    // 模拟延迟
    if (rule.delay && rule.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, rule.delay));
    }

    const { status, headers = {}, data } = rule.response;

    return new Response(JSON.stringify(data), {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    });
  }
}
```

### 2. 配置管理 (MockConfig.ts)

```typescript
export class MockConfig {
  private config: MockConfig;
  private storage: MockStorage;

  constructor() {
    this.storage = new MockStorage();
    this.config = this.loadConfig();
  }

  getConfig(): MockConfig {
    return this.config;
  }

  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    this.saveConfig();
  }

  addRule(rule: MockRule): void {
    rule.id = this.generateId();
    this.config.rules.push(rule);
    this.saveConfig();
  }

  updateRule(id: string, updates: Partial<MockRule>): void {
    const index = this.config.rules.findIndex(r => r.id === id);
    if (index !== -1) {
      this.config.rules[index] = { ...this.config.rules[index], ...updates };
      this.saveConfig();
    }
  }

  deleteRule(id: string): void {
    this.config.rules = this.config.rules.filter(r => r.id !== id);
    this.saveConfig();
  }

  toggleRule(id: string): void {
    const rule = this.config.rules.find(r => r.id === id);
    if (rule) {
      rule.enabled = !rule.enabled;
      this.saveConfig();
    }
  }

  private loadConfig(): MockConfig {
    const stored = this.storage.getConfig();
    return stored || this.getDefaultConfig();
  }

  private saveConfig(): void {
    this.storage.saveConfig(this.config);
  }

  private getDefaultConfig(): MockConfig {
    return {
      enabled: false,
      rules: [],
      defaultDelay: 300
    };
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
```

### 3. 存储管理 (MockStorage.ts)

```typescript
export class MockStorage {
  private readonly STORAGE_KEY = 'frontend_mock_config';

  getConfig(): MockConfig | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to load mock config:', error);
      return null;
    }
  }

  saveConfig(config: MockConfig): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
    } catch (error) {
      console.error('Failed to save mock config:', error);
    }
  }

  clearConfig(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}
```

## 使用方式

### 1. 基础集成

```typescript
// 在你的应用中初始化
import { MockManager } from './services/mock/MockManager';

// 创建 Mock 管理器实例
const mockManager = new MockManager();

// 初始化（通常在应用启动时）
mockManager.initialize();

// 现在所有的 fetch 请求都会被拦截
```

### 2. 动态配置示例

```typescript
// 添加 Mock 规则
mockManager.addRule({
  enabled: true,
  method: 'GET',
  urlPattern: '/api/users/*',
  response: {
    status: 200,
    data: {
      users: [
        { id: 1, name: '张三' },
        { id: 2, name: '李四' }
      ]
    }
  },
  delay: 500,
  description: '获取用户列表'
});

// 启用/禁用 Mock
mockManager.setEnabled(true);  // 开启
mockManager.setEnabled(false); // 关闭
```

### 3. 在 Svelte 中使用

```svelte
<script>
  import { mockManager } from '../services/mock/MockManager';

  let isMockEnabled = false;

  function toggleMock() {
    mockManager.setEnabled(!isMockEnabled);
    isMockEnabled = !isMockEnabled;
  }

  async function testMock() {
    const response = await fetch('/api/test');
    const data = await response.json();
    console.log('Mock data:', data);
  }
</script>

<button on:click={toggleMock}>
  {isMockEnabled ? '关闭' : '开启'} Mock
</button>

<button on:click={testMock}>测试 Mock</button>
```

## 高级功能

### 1. 正则表达式匹配

```typescript
mockManager.addRule({
  enabled: true,
  method: 'GET',
  urlPattern: /^\/api\/products\/\d+$/,  // 匹配 /api/products/123
  response: {
    status: 200,
    data: { id: 123, name: '产品名称' }
  }
});
```

### 2. 动态响应数据

```typescript
mockManager.addRule({
  enabled: true,
  method: 'POST',
  urlPattern: '/api/users',
  response: {
    status: 201,
    data: (requestData) => ({
      id: Date.now(),
      ...requestData,
      createdAt: new Date().toISOString()
    })
  }
});
```

### 3. 错误模拟

```typescript
mockManager.addRule({
  enabled: true,
  method: 'GET',
  urlPattern: '/api/error',
  response: {
    status: 500,
    data: { error: '服务器内部错误' }
  },
  delay: 1000
});
```

## 部署和配置

### 开发环境

```typescript
// main.ts 或 main.js
if (import.meta.env.DEV) {
  const mockManager = new MockManager();
  mockManager.initialize();

  // 添加一些默认的 Mock 数据
  mockManager.addDefaultRules();
}
```

### 生产环境

```typescript
// 生产环境默认不启用，但可以通过配置开启
const mockManager = new MockManager();

// 从环境变量或配置文件中读取是否启用
if (config.enableMock) {
  mockManager.initialize();
}
```

## 优势

1. **零依赖**：基于浏览器原生 API，无需额外依赖
2. **轻量级**：体积小，不影响应用性能
3. **易集成**：几行代码即可集成到现有项目
4. **动态配置**：运行时动态添加/修改规则
5. **框架无关**：适用于任何前端框架
6. **开发友好**：支持热重载，实时更新规则

## 扩展性

这个方案具有良好的扩展性：
- 支持添加更多的拦截器（如 WebSocket）
- 可以集成到开发者工具中
- 支持导入/导出配置文件
- 可以添加更多的响应生成策略
- 支持自定义匹配算法

这个实现方案完全满足你的需求：前端拦截、变量控制、动态配置，而且使用简单，集成方便。