/**
 * 序列提取服务
 * 负责从JavaScript代码中提取数据序列
 */
import { selectedId } from '../../stores/dom-tree.store.svelte'
import { getEChartsInstance } from '../component-instance/echarts-instance.service'
export interface SeriesExtractionResult {
  /** 提取到的数据数组 */
  dataArrays: string[]
  /** 正则匹配结果 */
  matches: RegExpMatchArray[]
  /** 是否需要回写 */
  needsWriteBack: boolean
  /** 提取到的 legend 数据 */
  legendData?: string[] | null
}

/**
 * 从JavaScript代码中提取数据序列
 * @param code - JavaScript代码
 * @param existingSeriesData - 已存在的序列数据
 * @returns 提取结果
 */
export function extractSeriesFromCode(
  code: string | undefined,
  existingSeriesData: string[] | undefined
): SeriesExtractionResult {
  if (!code) {
    return {
      dataArrays: existingSeriesData || [],
      matches: [],
      needsWriteBack: false,
      legendData: null,
    }
  }

  // 使用通用方法提取数据匹配项
  const matches = extractDataMatches(code)
  const legendData = extractLegendData(code)

  // 提取数据数组
  const parsed = matches.map((m) => m[1])

  // 保底：若没抽到任何数据但解析到图例，用图例长度生成空壳，避免输入框消失
  const fallbackData =
    parsed.length === 0 && legendData && legendData.length > 0
      ? Array(legendData.length).fill('[]')   // 空数组字符串，保持格式一致
      : parsed

  // 决定最终数据：如果 existingSeriesData 有值，则优先使用；否则用保底数据
  const finalData =
    existingSeriesData && existingSeriesData.length > 0 ? existingSeriesData : fallbackData

  // 检查是否需要回写
  const needsWriteBack = JSON.stringify(existingSeriesData) !== JSON.stringify(finalData)

  return {
    dataArrays: finalData,
    matches,
    needsWriteBack,
    legendData,
  }
}

/**
 * 获取中文序数词
 * @param num - 数字索引（0-based）
 * @returns 中文序数词
 */
export function getChineseOrdinal(num: number): string {
  const ordinals = ['第一', '第二', '第三', '第四', '第五', '第六', '第七', '第八', '第九', '第十']
  return ordinals[num] || `第${num + 1}`
}

/**
 * 从代码中提取 legend.data 的数据
 * @param code - JavaScript代码
 * @returns legend 数据数组, 如果没有则返回 null
 */
export function extractLegendData(code: string): string[] | null {
  // 正则表达式匹配 legend.data，处理各种空格和换行
  const legendMatch = code.match(/legend\s*:\s*\{(?:.|\n)*?data\s*:\s*(\[(?:.|\n)*?\])/);

  if (legendMatch && legendMatch[1]) {
    try {
      // 使用Function构造器安全地解析数组字符串，比eval更安全
      // 它可以处理单引号、尾随逗号等情况
      const parsedData = new Function(`return ${legendMatch[1]}`)();
      if (Array.isArray(parsedData)) {
        // 确保数组内容是字符串
        return parsedData.map(item => String(item));
      }
    } catch (e) {
      console.error("解析legend数据时出错:", e);
      return null;
    }
  }
  return null;
}

/**
 * 判断是否为有效的序列数据
 * @param code - JavaScript代码
 * @returns 是否有有效的序列数据
 */
export function hasValidSeries(code: string | undefined): boolean {
  if (!code) return false
  return extractDataMatches(code).length > 0
}

/**
 * 获取序列数量
 * @param code - JavaScript代码
 * @returns 序列数量
 */
export function getSeriesCount(code: string | undefined): number {
  console.log(1)
  if (!code) return 0
  return extractDataMatches(code).length
}

/**
 * 从代码中提取数据匹配项（排除tooltip相关的数据）
 * @param code - JavaScript代码
 * @returns 过滤后的匹配结果
 */
export function extractDataMatches(code: string): RegExpMatchArray[] {
  // --------------------------- 新实现：直接使用实例数据 ---------------------------
  const currentId = selectedId?.()
  let instanceSeriesData: any[] = []
  let instanceLegendData: any[] | undefined = undefined
  let instanceXAxisData: any[] | undefined = undefined
  let originalOption: any = null

  if (currentId) {
    const chartInst = getEChartsInstance(currentId)
    if (chartInst && typeof chartInst.getOption === 'function') {
      try {
        const option = chartInst.getOption()
        originalOption = option
        // series
        let series = (option?.series ?? []) as any
        if (!Array.isArray(series)) {
          series = [series]
        }
        instanceSeriesData = series.map((s: any) => s?.data).filter((d: any) => Array.isArray(d))
        // legend
        const legend = option?.legend ?? {}
        if (Array.isArray(legend)) {
          instanceLegendData = legend[0]?.data ?? undefined
        } else if (legend && typeof legend === 'object') {
          instanceLegendData = (legend as any).data
        }
        // xAxis
        const xAxis = option?.xAxis ?? {}
        if (Array.isArray(xAxis)) {
          instanceXAxisData = xAxis[0]?.data ?? undefined
        } else if (xAxis && typeof xAxis === 'object') {
          instanceXAxisData = (xAxis as any).data
        }
      } catch (err) {
        console.warn('[series-extractor] 读取 ECharts 实例 option 时失败', err)
      }
    }
  }


  // 将实例数据转换为伪 RegExpMatchArray，保持旧接口兼容，顺序：legend → xAxis → series
  const fakeMatches: RegExpMatchArray[] = []

  if (instanceLegendData && Array.isArray(instanceLegendData)) {
    const legendStr = JSON.stringify(instanceLegendData)
    fakeMatches.push([`legend.data: ${legendStr}`, legendStr] as unknown as RegExpMatchArray)

    // 同步更新series[].name（只更新这里的fake数据，实际会在ECharts组件中回写）
    if (originalOption && originalOption.series && Array.isArray(originalOption.series)) {


      // 更新series的name属性，确保与legend.data同步
      originalOption.series.forEach((series: any, index: number) => {
        if (instanceLegendData && instanceLegendData[index]) {
          series.name = instanceLegendData[index]
        }
      })
    }
  }
  if (instanceXAxisData && Array.isArray(instanceXAxisData)) {
    const xAxisStr = JSON.stringify(instanceXAxisData)
    fakeMatches.push([`xAxis.data: ${xAxisStr}`, xAxisStr] as unknown as RegExpMatchArray)
  }
  // 再追加各 series.data
  instanceSeriesData.forEach((arr) => {
    const arrStr = JSON.stringify(arr)
    fakeMatches.push([`series.data: ${arrStr}`, arrStr] as unknown as RegExpMatchArray)
  })

  return fakeMatches
}
