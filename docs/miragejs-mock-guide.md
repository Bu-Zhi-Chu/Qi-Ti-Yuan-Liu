# MirageJS 动态 Mock 方案设计

> 本文档说明如何在 **Qi-Qiao-Ban** 项目内接入 MirageJS，使运行时可在「属性面板」中随时切换 **真实 API** / **虚假 API**，并允许用户输入任意假接口路径。

---

## 1. 设计目标

| 需求 | 说明 |
| ---- | ---- |
| 切换 Mock | 运行时勾选/取消即可决定请求是否走 MirageJS，打包后亦然 |
| 动态路径 | 面板中输入任意 `mockBase`（如 `https://mock.acme.com/`）或自定义路由匹配规则 |
| 状态持久 | 假接口支持 CRUD，数据保存在 Mirage 内存 DB，刷新浏览器即重置 |
| 轻量按需 | MirageJS 代码通过 **动态 import**，仅在勾选 Mock 时加载，避免影响初始包体积 |

---

## 2. 全局 Store
```ts
// src/services/env/mock-store.ts
import { writable } from 'svelte/store';

export interface MockSettings {
  useMock: boolean;      // 是否启用 Mirage
  mockBase: string;      // 假接口前缀，如 /mock-api 或 https://mock.xxx.com/
}

export const mockSettings = writable<MockSettings>({
  useMock: false,
  mockBase: '/mock-api',
});
```

---

## 3. 请求适配层
```ts
// src/services/request.ts
import { mockSettings } from './env/mock-store';

export async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let { useMock, mockBase } = $mockSettings; // 通过 Svelte `$` 自动订阅

  if (useMock) {
    // ① 确保 mirage server 已启动
    const { ensureMirage } = await import('../mirage');
    await ensureMirage();
    // ② 将原始 URL 转换为假接口 URL
    url = mockBase + encodeURIComponent(url);
  }

  const res = await fetch(url, init);
  return res.json();
}
```

---

## 4. Mirage Server 封装
```ts
// src/mirage/index.ts
import { Server, Model, Response } from 'miragejs';
let server: Server | null = null;

export async function ensureMirage() {
  if (server) return;

  server = new Server({
    models: {
      charts: Model,
      // 其他模型...
    },

    routes() {
      this.namespace = '/mock-api'; // 与 mockBase 首段保持一致

      this.get('/:encoded', (schema, request) => {
        const original = decodeURIComponent(request.params.encoded);
        // 根据 original 决定返回数据
        // 可在这里写 switch，也可从 schema.db 中查
        return schema.db.charts;
      });

      this.post('/:encoded', (schema, request) => {
        const data = JSON.parse(request.requestBody);
        schema.db.charts.insert(data);
        return new Response(201, {}, data);
      });
      // ...其他 REST/GraphQL 路由
    },
  });
}
```

---

## 5. 属性面板字段
在 `FeatureEditor`（或专属 Network 面板）中新增：

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| useMock | `boolean` | 复选框：开 = MirageJS，关 = 真实 API |
| mockBase | `string` | 文本框：假接口前缀，修改后立即生效 |

勾选/修改后，通过 `mockSettings.set({ useMock, mockBase })` 更新全局 Store。

---

## 6. 运行时流程
1. 组件调用 `request(url)` 发起请求。
2. `request` 读取 Store：
   * `useMock=false` → 直接 `fetch(url)`
   * `useMock=true` →
     1. 动态 `import('../mirage')` 并 `ensureMirage()`
     2. 把 url 转成 `mockBase + encodeURIComponent(url)`
     3. `fetch` 到 Mirage 的 Service Worker，返回伪造数据
3. UI 正常渲染。

---

## 7. 构建与性能
- MirageJS 经动态 import 打包为独立 chunk，只有在 `useMock=true` 时才会下载。
- 生产模式可默认关闭 Mock，也可在 URL 参数 `?mock=1` 中强制开启（启动时读取并写入 Store）。

---

## 8. 常见问题
| 问题 | 解决方法 |
| ---- | ---- |
| 如何持久化假数据？ | Mirage 只在内存中保存，刷新即丢；如需持久化，可在 `localStorage` 手动存/取并在 `seeds()` 恢复 |
| 是否支持 WebSocket？ | Mirage 仅拦截 `fetch/XHR`；若要 Mock WS，可另行使用 `mock-socket` 库 |
| 单元测试也想用同一套 Mock？ | 在 Vitest/Jest 的 setup 文件中 `import '../src/mirage'` 并启动 `ensureMirage()` |

---

> 至此，你就可以在低代码编辑器运行态，通过属性面板随时切换真实 / 虚假接口，并指定任意假接口前缀，而无需改动任何业务组件代码。