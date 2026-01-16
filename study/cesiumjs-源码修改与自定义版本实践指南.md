# CesiumJS 源码修改与自定义版本实践指南

> 场景背景：
> 当前项目使用 npm 包形式的 CesiumJS，但官方默认能力不能完全满足需求，需要在 Cesium 源码层面做定制，并在自己的项目中持续使用这一“自定义版本”。

本笔记的目标：

-   弄清楚“从哪里下手修改 Cesium 源码”
-   如何在本地构建、验证修改
-   在自己的项目（Vite + vite-plugin-static-copy）中使用自定义版本
-   如何管理这些修改（避免每次装依赖都重改 node_modules）

参考资料：

-   官方构建说明（Build Guide）【强烈推荐通读】：
    https://github.com/CesiumGS/cesium/blob/main/Documentation/Contributors/BuildGuide/README.md
    该文档说明如何 fork、构建、运行测试等，是从源码层面修改 Cesium 的权威起点。 [web_search_result 3]
-   社区关于本地构建的讨论：
    https://community.cesium.com/t/steps-to-build-cesium-locally-from-source/27403 [web_search_result 5]

---

## 一、几种“修改 CesiumJS”的思路对比

当我们说“修改 Cesium”时，实际上有几种不同层级的做法，难度和维护成本不一样：

1. 在自己项目里封装扩展（不改 Cesium 源码）

    - 通过继承、组合、hook 等方式包装 Cesium 的 API，比如写一个 `CustomViewer` 类，把某些行为统一修改。
    - 优点：不会动到第三方库，升级简单。
    - 缺点：对于“内部算法”“私有属性”等深层逻辑，可能无法满足需求。

2. 在 node_modules 里直接改 Cesium 代码（最原始、最危险，不推荐）

    - 手改 `node_modules/cesium/` 里的文件。
    - 缺点致命：
        - 每次 `npm install` 就可能被覆盖
        - 无版本管理，无法回滚，团队协作容易乱

3. 使用 patch-package 给 npm 包打补丁（对少量改动比较合适）

    - 安装 patch-package，在 node_modules 修改后自动生成 `.patch` 文件，提交到项目仓库。
    - 优点：
        - 保持使用官方 npm 包，但自动在安装后应用补丁
        - 不需要维护完整 Cesium fork 仓库
    - 缺点：
        - 只适合“改动量不太大”的情况
        - Cesium 升级版本时需要重做或调整补丁

4. Fork Cesium 官方仓库，维护自己的定制版（长期定制的标准方案）
    - 在 GitHub 上 fork CesiumGS/cesium，修改源码、构建，发布为：
        - 你的私有 npm 包（作用域包，如 `@your-scope/cesium`），或者
        - 通过 git URL 直接依赖你的 fork 仓库
    - 优点：
        - 完整掌控源码，适合大规模修改
        - 可以按自己的节奏跟进官方版本
    - 缺点：
        - 维护成本较高，需要自己定期 merge upstream

本项目的情况：

-   如果只是想改几个内部行为（例如小范围 patch）：可以优先考虑 **patch-package 方案**
-   如果准备长期深入改造（例如加入 WASM、改动核心引擎等）：更推荐走 **Fork + 自定义构建** 的路径

下面会分别给出两条路线的具体操作步骤。

---

## 二、路线 A：使用 patch-package 定制 Cesium（适合改动较小）

### 1. 安装 patch-package 及其配套

以 npm 为例（pnpm/yarn 类似）：

```bash
npm install patch-package postinstall-postinstall --save-dev
```

在 `package.json` 里增加：

```json
{
    "scripts": {
        "postinstall": "patch-package"
    }
}
```

这样每次执行 `npm install` 后，patch-package 会自动把补丁打回 node_modules。

### 2. 在 node_modules 中修改 Cesium 源码

> 注意：这一步仍然是“直接改 node_modules”，但随后会立刻固化为补丁文件。

-   在编辑器中打开：
    -   `node_modules/cesium/Source/...`（如果你想改的是源码）
    -   或者 `node_modules/cesium/Build/Cesium/` 下的构建输出（不太推荐直接改构建产物）
-   根据需求，修改对应 js/ts 文件。

示例（伪代码，只是说明流程）：

```js
// node_modules/cesium/Source/Scene/SomeFile.js

// 原逻辑
function computeSomething(a, b) {
    return a + b
}

// 修改后逻辑
function computeSomething(a, b) {
    // 自定义行为
    return a + b + 42
}
```

### 3. 生成补丁文件

完成修改后，在项目根目录执行：

```bash
npx patch-package cesium
```

会在项目里生成类似：

```txt
patches/
  cesium+X.Y.Z.patch
```

将 `patches` 目录提交到你的 git 仓库。

从此以后：

-   团队成员 `npm install` 后，会自动执行 `patch-package`，把这个 patch 应用到 `node_modules/cesium` 上。
-   你的定制行为会持续生效，而不用每次手工改。

### 4. 和 Vite / vite-plugin-static-copy 的关系

你现在的 Vite 配置里，用 `vite-plugin-static-copy` 把 Cesium 的静态资源（`Build/Cesium/ThirdParty / Workers / Assets / Widgets`）拷贝到输出目录。这个逻辑 **不用改**：

-   patch-package 改的是 `node_modules/cesium` 里的源码或构建文件
-   vite-plugin-static-copy 会继续从 `node_modules/cesium/Build/Cesium/...` 复制
-   只要你修改过的文件位于这些被复制的目录内，最终打包产物中就会包含你的改动

因此，patch-package 方案和你现有的静态资源复制方案是兼容的。

### 5. 升级 Cesium 版本时的注意事项

-   当你想从官方 `1.110` 升级到 `1.112` 时：
    1. 修改 `package.json`，升级 `cesium` 版本
    2. 删除原来的 `patches/cesium+旧版本.patch`
    3. 安装新版本依赖：`npm install`
    4. 在新的 node_modules 上重新做一次修改
    5. 再执行 `npx patch-package cesium` 生成新的 patch 文件

---

## 三、路线 B：Fork 官方 Cesium 仓库，自定义构建并作为依赖使用

当你准备长期、深入地修改 Cesium，比如：

-   改动核心渲染/数据结构
-   引入新模块（如 WASM）并和 Cesium 深度集成
-   需要对 Cesium 的模块划分、打包方式进行调整

推荐使用 **Fork + 自定义构建** 方案。

### 1. Fork 官方仓库

1. 打开官方仓库：
   https://github.com/CesiumGS/cesium
2. 点击 “Fork”，创建自己的仓库，例如 `yourname/cesium`。
3. 根据官方 Build Guide 的建议，在你的 fork 仓库里保留 `main` 分支，并定期从上游同步。 [web_search_result 3]

### 2. 在本地克隆并构建

参考官方 Build Guide【强烈建议具体按文档操作】： [web_search_result 3]

```bash
git clone https://github.com/yourname/cesium.git
cd cesium

npm install
npm run build
```

常见构建目标（可能会随版本变化，以官方文档为准）：

-   `npm run build`：构建打包版本（类似 `Build/Cesium`）
-   `npm run test`：运行测试，确保你的修改没有破坏基础行为

构建完成后，关键输出目录通常在：

-   `Build/Cesium/`（打包版）
-   或 `Build/` 下的其他子目录

### 3. 在 fork 仓库中修改源码

你可以直接修改 `Source/` 下的源码文件：

```js
// Source/Scene/YourTargetFile.js
// 在这里加入你的新逻辑或修改
```

然后重新执行：

```bash
npm run build
```

构建产物会更新到 `Build/...` 目录。

### 4. 在你自己的项目中引用这个 fork

有两种常见方式：

#### 方式一：通过 git URL 引用 fork 版本

在 `z:\X\qi-qiao-ban\package.json` 里（略伪代码）：

```json
{
    "dependencies": {
        "cesium": "git+https://github.com/yourname/cesium.git#your-branch"
    }
}
```

然后在项目根目录执行：

```bash
npm install
```

这样安装的 `cesium` 依赖就是你 fork 仓库当前分支的版本，其中包括了你对源码的修改和构建结果。

如果你只想用你构建好的打包产物，也可以在 fork 里保留 `Build/Cesium`，让项目继续使用原来的 Vite 配置（`vite-plugin-static-copy` 从 `node_modules/cesium/Build/Cesium` 拷贝）。

#### 方式二：发布为私有 npm 包（推荐给团队使用）

1. 在 fork 仓库中修改 `package.json`：

    ```json
    {
        "name": "@your-scope/cesium",
        "version": "1.110.0-custom.1"
    }
    ```

2. 发布到私有 npm 仓库（如公司内部 registry）：

    ```bash
    npm publish --access=public # 或者你的私有 registry 发布命令
    ```

3. 在你项目里使用：

    ```json
    {
        "dependencies": {
            "@your-scope/cesium": "1.110.0-custom.1"
        }
    }
    ```

    并在代码中改 import：

    ```ts
    import * as Cesium from '@your-scope/cesium'
    ```

4. Vite 配置中，`vite-plugin-static-copy` 的路径也改为新的包名：

    ```ts
    const cesiumSource = 'node_modules/@your-scope/cesium/Build/Cesium'
    ```

### 5. 和当前项目（Vite + vite-plugin-static-copy）的衔接

无论使用 git URL 还是自定义 npm 包，只要 **安装结果的目录结构** 保持和原版 Cesium 一致（尤其是 `Build/Cesium/...`），你就可以继续沿用现在的复制配置：

```ts
const cesiumSource = 'node_modules/cesium/Build/Cesium'
const cesiumBaseUrl = 'cesiumStatic'

viteStaticCopy({
    targets: [
        { src: `${cesiumSource}/ThirdParty`, dest: cesiumBaseUrl },
        { src: `${cesiumSource}/Workers`, dest: cesiumBaseUrl },
        { src: `${cesiumSource}/Assets`, dest: cesiumBaseUrl },
        { src: `${cesiumSource}/Widgets`, dest: cesiumBaseUrl }
    ]
})
```

如果包名改变（如使用 `@your-scope/cesium`），只需同步修改 `cesiumSource` 路径：

```ts
const cesiumSource = 'node_modules/@your-scope/cesium/Build/Cesium'
```

其他逻辑保持不变。

---

## 四、如何选择：什么时候用 patch-package，什么时候 fork？

可以按这几个维度判断：

1. 改动规模

    - 只是改几个函数、修一个 bug、暴露一个内部字段 → patch-package 更合适
    - 想做结构性改造、引入新模块、长期维护自己的定制版本 → Fork 自己维护源码

2. 升级频率

    - 希望跟官方同步升级很频繁（例如每个小版本都跟进）
        - patch-package：官方版本变了，补丁可能需要重做，但工作量集中在少数文件
        - fork：需要定期 merge upstream，但可以顺便调整自己的修改

3. 团队协作
    - 团队成员不熟悉 Cesium 内部结构，又需要稳定使用你的修改 → 私有 npm 包 + 文档（推荐）
    - 团队中有人专门维护引擎层，熟悉源码 → fork 仓库统一维护

本项目的实际建议：

-   短期：如果现在有「几个具体功能需要改」且改动范围不大，可以先用 **patch-package**，快速验证方案。
-   中长期：一旦这些修改证明是稳定需求，可以考虑：
    -   把 patch-package 中的改动“搬进” fork 仓库
    -   在 fork 基础上整理成“定制版 Cesium”，然后让项目依赖 fork 或私有包。

---

## 五、实践时的建议流程（结合你当前项目）

以“先 patch-package，后视情况 fork”为例，一个建议的步骤：

1. 明确你要改的 Cesium 行为

    - 是相机控制逻辑、图层管理、特定材质、还是数据源解析？
    - 尽量定位到具体文件（例如 `Scene/ImageryLayer.js`、`Scene/Camera.js` 等）

2. 在当前项目里用 patch-package 先做实验

    - 找到 `node_modules/cesium/Source/...` 对应文件
    - 修改逻辑 → 运行项目，确认和你的 CesiumMap 集成正常
    - 满意后执行 `npx patch-package cesium`，固化为 patch

3. 观察一段时间

    - 如果发现这些改动非常稳定，就是“你的标准行为”了，可以考虑：
        - Fork Cesium 官方仓库
        - 按 patch 里改动内容，把修改移植到 fork 的源码里
        - 在 fork 仓库中构建、验证

4. 替换项目依赖为 fork 版本（或私有 npm 包）

    - 修改 `package.json` 依赖
    - 根据实际包名，调整 Vite 配置中 `cesiumSource` 路径
    - 跑一遍构建和运行，确保线上/本地行为一致

5. 后续维护
    - 每次需要进一步修改 Cesium 时，在 fork 仓库里改源码
    - 更新版本号（例如 `1.110.0-custom.2`）
    - 更新项目依赖

---

## 六、版权与许可证注意事项

CesiumJS 使用的是 Apache 2.0 许可证（以仓库当前信息为准）。简要注意：

-   可以修改、分发、商用
-   需要保留原始版权声明和许可证
-   如果对外发布你的修改版（或作为产品的一部分），应在文档或 About 信息中保留 Cesium 的版权说明

在公司内部或私有项目中使用自定义 Cesium，一般不会有太大问题，但建议：

-   在 fork 仓库中保留原始 LICENSE
-   在项目文档中标明使用了定制版 CesiumJS，并引用原仓库链接

---

## 七、小结

要想“修改 Cesium 源码并用我们自己的版本”，关键有三点：

1. **确定修改方式**

    - 小改动 → patch-package
    - 大改动 / 长期维护 → Fork + 自建构建

2. **让构建与运行环境认得你的版本**

    - 在 `package.json` 中改依赖来源（npm 包名或 git URL）
    - 在 Vite 配置中保证静态资源路径仍然正确（`Build/Cesium/...`）

3. **把修改纳入版本管理**
    - 不要靠“手动改 node_modules”
    - 用 patch 或 fork 仓库记录每一次修改，方便回滚和升级

接下来如果你有某个具体“想改的 Cesium 行为”（比如图层排序逻辑、相机某种运动模式等），可以基于这份流程，我帮你一起选路线并给出对应的文件定位和修改建议。
