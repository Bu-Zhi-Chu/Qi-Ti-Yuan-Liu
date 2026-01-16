BabylonJS + GIS 内核设计路线图
===============================

> 目标：在 BabylonJS 上构建一套“带 GIS 能力的 3D 引擎内核”，  
> 支持地理坐标、切片地图、地形、高度雾、阳光/丁达尔光等效果，逐步替代/补充 Cesium 的地理能力。

---

一、总体定位与设计原则
----------------------

### 1.1 项目定位

- 渲染内核：使用 BabylonJS（强项：PBR、后处理、体积效果等）
- GIS 内核：自研一层“Geo 内核”，负责：
  - 坐标系与地理计算
  - 地球几何与瓦片映射
  - 地图/地形数据加载与管理
  - 与 Babylon 相机、灯光、后处理的整合

目标不是“照搬 Cesium”，而是：

- 参考其架构和算法
- 结合自己产品需求，做一个更专注的 GIS 3D 内核

### 1.2 设计原则

- 分层清晰：渲染（Babylon）与 GIS（Geo 内核）解耦
- 迭代优先：按阶段实现可用能力，每一阶段都能跑 demo
- 可替换性：Geo 内核对上层暴露统一 API，未来可以并行接入 Babylon/Cesium 等不同渲染后端
- 参考而不复制：阅读 Cesium 等源码，理解原理后以自己的方式实现

---

二、阶段划分（整体路线）
------------------------

从易到难、大步骤拆分为四个阶段：

1. Phase 0：预研与技术选型
2. Phase 1：基础地球与切片渲染
3. Phase 2：地理交互与矢量叠加
4. Phase 3：地形 + 高度雾 + 阳光/丁达尔光

后续可以继续扩展：

- Phase 4：时间轴、动态效果（太阳位置、昼夜变化等）
- Phase 5：三维城市、BIM / 3D Tiles 类数据

以下重点写 Phase 0–3。

---

三、Phase 0：预研与技术选型
---------------------------

### 3.1 目标

- 搞清楚“两套世界观”：
  - Cesium 的地球/GIS 是如何组织的
  - Babylon 的三维场景/相机/后处理是如何组织的
- 给后面设计 Geo 内核打基础

### 3.2 主要工作

1. **阅读 Cesium 核心模块（理解，不急着改）**
   - 坐标和椭球相关：
     - `Core/Ellipsoid.js`
     - `Core/Cartesian3.js`
     - `Core/Cartographic.js`
     - `Core/Transforms.js`
   - 地球与瓦片相关：
     - `Scene/Globe.js`
     - `Scene/GlobeSurfaceTileProvider.js`
     - `Scene/QuadtreePrimitive.js`
   - 影像与图层：
     - `Scene/ImageryLayer.js`
     - `Scene/ImageryLayerCollection.js`
   - Fog / Atmosphere（为以后做高度雾/大气打基础）：
     - `Scene/Fog.js`
     - `Scene/SkyAtmosphere.js`

2. **熟悉 BabylonJS 的基础能力**
   - 相机：
     - ArcRotateCamera（绕中心旋转）
     - UniversalCamera / FreeCamera
   - 灯光与材质：
     - DirectionalLight / HemisphericLight
     - PBRMaterial / StandardMaterial
   - 后处理与体积效果：
     - PostProcess
     - Volumetric Light / God Rays 示例

3. **搭建最简单 Babylon Demo 项目**
   - 场景中创建一个球体（作为地球占位）
   - 添加一个 ArcRotateCamera 和简单光源
   - 做相机绕球旋转的交互

### 3.3 输出物

- 一份自己的笔记（区别 Cesium / Babylon 的角色划分）
- 一个最简单的 Babylon 场景 demo（球 + 相机 + 光）

---

四、Phase 1：基础地球与切片渲染
-------------------------------

### 4.1 目标

- 在 Babylon 里实现“能转的地球 + 切片贴图”（先不管地形起伏）
- 支持：
  - WGS84 经纬度 ↔ 三维坐标转换
  - 从本地或网络加载 XYZ 瓦片
  - 相机绕地球旋转、缩放

### 4.2 核心设计：Geo 内核的基础类

定义一个独立的 Geo 内核模块，例如：

- `GeoEllipsoid`
  - 封装椭球参数（WGS84 a/b）
  - 提供：
    - `cartographicToCartesian(long, lat, height)`
    - `cartesianToCartographic(x, y, z)`
- `GeoGlobe`
  - 管理 Babylon 中代表地球的 mesh（球或椭球）
  - 负责：
    - 根据 zoom/tile 分辨率设置贴图
    - 管理瓦片材质
- `GeoTileProvider`
  - 管理切片 URL 模板，例如：
    - `https://server/{z}/{x}/{y}.png`
    - `file://` 或本地路径
  - 缓存瓦片贴图
- `GeoCameraController`
  - 封装 Babylon 相机，使其支持：
    - 以经纬度为中心点旋转
    - 以高度为参数缩放

### 4.3 关键技术点

1. **地球网格**
   - 第一版可以用简单球体（Sphere）代替椭球：
     - 半径设为 1 或某个比例
     - 后续再逐步引入椭球参数

2. **经纬度 → UV 映射**
   - 对于简单球体，通常用经纬度映射到 (u, v)：
     - u = (lon + 180) / 360
     - v = (lat + 90) / 180
   - 使用 Babylon 的自定义 ShaderMaterial / NodeMaterial，按这个规则采样瓦片纹理

3. **XYZ 瓦片加载**
   - 在给定 zoom 下：
     - 通过相机可视范围估算需要的 (x, y) tile 范围
     - 请求对应的瓦片（可先简化为固定一批）
   - 第一版可以只支持单个 zoom 级别或少量级别，以便快速出效果

4. **相机控制**
   - 基于 ArcRotateCamera：
     - 记录一个“目标点”的地理坐标（中心经纬度 + 高度）
     - 每次更新相机时：
       - 用 `GeoEllipsoid.cartographicToCartesian` 把目标点转为三维坐标
       - 相机 target 指向该点，radius 控制距离

### 4.4 阶段验收

- 在 Babylon 场景中：
  - 可以围绕地球旋转
  - 地球上显示正确的世界地图切片（至少能切换缩放级别）
  - 通过接口设置中心经纬度，地球会转到对应位置

---

五、Phase 2：地理交互与矢量叠加
-------------------------------

### 5.1 目标

- 实现“点击取经纬度”“在地图上画点线面”的能力
- 为后续叠加各种业务数据做准备

### 5.2 设计：GeoEntity 与拾取

- `GeoPickResult`
  - 包含：
    - `cartographic`（经纬度 + 高度）
    - `worldPosition`（Babylon 世界坐标）
- `GeoEntity`
  - 抽象 GIS 实体：
    - 点：Point
    - 线：Polyline
    - 面：Polygon
  - 持有：
    - 几何数据（经纬度）
    - 对应的 Babylon mesh/lines
  - 方法：
    - `updateGeometry()`
    - `setStyle(...)`

### 5.3 关键技术点

1. **鼠标拾取 → 经纬度**
   - 使用 Babylon 的射线拾取：
     - 从相机通过屏幕点发射一条 ray
     - 与地球 mesh 求交点
   - 将交点的世界坐标通过 `GeoEllipsoid.cartesianToCartographic` 转为经纬度

2. **矢量叠加**
   - 点：
     - 使用 Billboard / Sprite / 小 mesh
   - 线：
     - 把多段经纬度转换为世界坐标，使用 `MeshBuilder.CreateLines` 或自定义 shader 渲染
   - 面：
     - 把多边形经纬度投影到地球表面，生成三角网，创建 Mesh

3. **样式系统**
   - 给 `GeoEntity` 设计一个简单样式结构：
     - 点：大小、颜色、图标
     - 线：宽度、颜色、虚线样式
     - 面：填充色、边线色、透明度

### 5.4 阶段验收

- 在场景中：
  - 鼠标点击任意位置能得到经纬度
  - 可以通过 API 在地球上画点、线、面
  - 支持修改样式并实时刷新

---

六、Phase 3：地形 + 高度雾 + 阳光 / 丁达尔光
-----------------------------------------

### 6.1 目标

- 引入地形起伏（不只是光滑球体）
- 利用 Babylon 的体积效果，实现：
  - 高度相关雾（高度雾/指数雾）
  - 阳光/丁达尔光（God Rays）

### 6.2 地形系统设计

- `GeoTerrainProvider`
  - 负责解析地形数据（本地 DEM，高度图，或自定义格式）
  - 根据经纬度范围与 zoom 返回高度栅格数据
- `GeoTerrainMesh`
  - 根据地形数据生成 mesh（局部块或全局）
  - 与 GeoGlobe 组合，替换原本的光滑球体

可以按渐进策略：

1. **静态地形 demo**
   - 读取一个小范围 DEM（如某个城市附近）
   - 在 Babylon 中用平面或弯曲网格表现高度起伏
2. **与地球组合**
   - 让局部地形贴合球体
   - 处理地形与影像叠加关系（贴图坐标）

### 6.3 高度雾（高度相关的 Fog）

思路：

- Babylon 自带 Fog/Volumetric Fog，可以作为基础
- 结合 Geo 内核提供的“高度信息”，实现：
  - 离地越高越清晰/越模糊
  - 或者某个高度区间雾最浓

实现步骤：

1. 在 Geo 内核中定义雾参数：
   - `fogMode`（线性 / 指数）
   - `fogDensity`
   - `heightFalloff`（随高度衰减）
2. 使用自定义 PostProcess 或修改场景 Fog：
   - 在 shader 中，需要有：
     - 当前片元的世界坐标或高度
     - 与相机距离
   - 根据高度和距离计算雾因子，混合场景颜色与雾色

### 6.4 阳光 / 丁达尔光（God Rays）

思路：

- 使用 Babylon 的后处理系统实现体积光：
  - 从光源方向对场景进行采样
  - 叠加多次采样，模拟光线在雾中的散射
- Geo 内核提供：
  - 太阳位置（可根据时间计算）
  - 地球相对于太阳的朝向

实现步骤：

1. 新建 `GeoSunLight` 模块：
   - 根据时间/经纬度计算太阳方向（可先简化为固定方位）
   - 在 Babylon 场景中创建 DirectionalLight，并同步方向
2. 新建 `GeoGodRays` 后处理 stage：
   - 使用 PostProcess，读取深度/颜色纹理
   - 根据光源方向和遮挡区域计算光束效果
3. 与高度雾结合：
   - 在雾的 shader 或 God Rays shader 中使用同一套雾参数，实现视觉统一感

### 6.5 阶段验收

- 场景中：
  - 地表有真实的起伏（来自 DEM/地形）
  - 雾的浓度与高度/距离相关，接近“高度雾/指数雾”效果
  - 在特定角度下能看到明显的阳光/丁达尔光效果

---

七、技术栈与工程组织建议
------------------------

### 7.1 仓库与模块划分

- 建议为 Babylon+GIS 单独建一个仓库：
  - 例如：`yourname/babylon-gis-core`
- 仓库内部结构建议：

```txt
src/
  core/          # 椭球、坐标转换、数学工具
  globe/         # GeoGlobe、瓦片映射
  tiles/         # GeoTileProvider、缓存
  camera/        # GeoCameraController
  interaction/   # GeoPick、GeoEntity
  terrain/       # GeoTerrainProvider、GeoTerrainMesh
  atmosphere/    # 雾、大气相关
  lighting/      # 太阳、God Rays
  renderers/
    babylon/     # Babylon 专属的适配层
examples/
  # 若干 demo：基础地球、矢量叠加、地形、雾、God Rays...
```

### 7.2 与现有项目的集成方式

- 先在独立仓库里把 demo 跑通
- 等 Geo 内核达到 Phase 1 或 Phase 2 之后：
  - 可以将其打包为 npm 包（如 `@your-scope/babylon-gis`）
  - 在当前 `qi-qiao-ban` 项目中新增一个“Babylon 地球组件”：
    - 和 CesiumMap 组件并行存在一段时间
    - 用于 A/B 对比和逐步验证功能

---

八、风险与控制
--------------

### 8.1 主要风险

- 开发周期长：从 0 到完整 GIS 内核，至少中长期
- 算法复杂度高：地形 LOD、瓦片调度、坐标精度等都有坑
- 与业务解耦：如果直接把现有产品迁移，容易业务和研发同时受阻

### 8.2 控制策略

- 分阶段目标，每个阶段保留“可 demo 的成果”
- 与现有 Cesium 产品并行推进，而不是硬替换
- 优先做“对现有产品帮助最大的环节”，例如：
  - 先用 Babylon 做“高真实感演示场景”
  - 再慢慢把核心能力（切片、地形）补齐

---

九、小结
--------

这条路线的核心思想是：

- 不否认 Cesium 的成熟度，而是把它当成“可以学习的老师”
- 用 Babylon 做更强的渲染与真实感，在此之上搭建一套自己的 GIS 内核
- 用长期项目的视角看待它：先拿到一个个可演示的阶段成果，再逐步逼近“理想中的引擎”

后续如果有更具体的方向（例如“先上高度雾 + God Rays”还是“先把个位精度搞准”），可以在这个路线图基础上再细化一个 1–3 个月的实施计划。  

