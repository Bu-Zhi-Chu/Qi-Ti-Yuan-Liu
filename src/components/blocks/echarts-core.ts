// 按需注册 ECharts 核心及常用图表/组件，导出统一的 echarts 实例（函数形式）
// 只要变更图表类型或组件，在此文件追加 use 即可，无需改业务代码

import * as echarts from 'echarts/core'

// 图表类型
import { BarChart, LineChart, PieChart } from 'echarts/charts'
// 组件
import { GridComponent, TooltipComponent, LegendComponent, TitleComponent, MarkPointComponent, MarkLineComponent, ToolboxComponent, DataZoomComponent, GraphicComponent } from 'echarts/components'
// 渲染器
import { CanvasRenderer } from 'echarts/renderers'

// 按需注册
echarts.use([
  BarChart,
  LineChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  MarkPointComponent,
  MarkLineComponent,
  ToolboxComponent,
  DataZoomComponent,
  GraphicComponent,
  CanvasRenderer
])

// ✅ 导出函数形式，与官方 init 接口保持一致
export default function (dom: HTMLElement, theme?: string, opts?: any) {
  return echarts.init(dom, theme, opts)
}