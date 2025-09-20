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
      needsWriteBack: false
    }
  }

  // 使用正则表达式匹配 data: [...] 模式
  const allMatches = [...code.matchAll(/data\s*:\s*(\[[^\]]*\])/g)]

  // 过滤掉legend和tooltip相关的数据
  const matches = allMatches.filter((match) => {
    const matchStart = match.index!
    const beforeMatch = code.substring(Math.max(0, matchStart - 20), matchStart)
    return !beforeMatch.includes('legend') && !beforeMatch.includes('tooltip')
  })

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
    needsWriteBack
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
 * 判断是否为有效的序列数据
 * @param code - JavaScript代码
 * @returns 是否有有效的序列数据
 */
export function hasValidSeries(code: string | undefined): boolean {
  if (!code) return false

  const allMatches = [...code.matchAll(/data\s*:\s*(\[[^\]]*\])/g)]
  const matches = allMatches.filter((match) => {
    const matchStart = match.index!
    const beforeMatch = code.substring(Math.max(0, matchStart - 20), matchStart)
    return !beforeMatch.includes('legend') && !beforeMatch.includes('tooltip')
  })

  return matches.length > 0
}

/**
 * 获取序列数量
 * @param code - JavaScript代码
 * @returns 序列数量
 */
export function getSeriesCount(code: string | undefined): number {
  if (!code) return 0

  const allMatches = [...code.matchAll(/data\s*:\s*(\[[^\]]*\])/g)]
  const matches = allMatches.filter((match) => {
    const matchStart = match.index!
    const beforeMatch = code.substring(Math.max(0, matchStart - 20), matchStart)
    return !beforeMatch.includes('legend') && !beforeMatch.includes('tooltip')
  })

  return matches.length
}