/**
 * 序列提取服务
 * 负责从JavaScript代码中提取数据序列
 */

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

  // 决定最终数据：如果 existingSeriesData 有值，则优先使用
  const finalData =
    existingSeriesData && existingSeriesData.length > 0 ? existingSeriesData : parsed

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
  if (!code) return 0
  return extractDataMatches(code).length
}

/**
 * 从代码中提取数据匹配项（排除tooltip相关的数据）
 * @param code - JavaScript代码
 * @returns 过滤后的匹配结果
 */
export function extractDataMatches(code: string): RegExpMatchArray[] {
  const allMatches = [...code.matchAll(/data\s*:\s*(\[[^\]]*\])/g)]
  return allMatches.filter((match) => {
    const matchStart = match.index!
    const beforeMatch = code.substring(Math.max(0, matchStart - 20), matchStart)
    return !beforeMatch.includes('tooltip')
  })
}