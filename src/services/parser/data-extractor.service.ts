/**
 * 通用数据抽取服务
 * 负责从代码片段或对象中统一提取标准格式的 result 数组
 */

/**
 * 从字符串或对象中抽取 result 数组
 * 支持：
 * 1. 直接返回数组的代码片段
 * 2. 返回 {result: [...]} 的代码片段
 * 3. 直接传入对象
 */
export function extractResultArray(raw: string | any): any[] {
  let data: any

  if (typeof raw === 'string') {
    // 优先按 JSON 解析，失败再 eval
    try {
      data = JSON.parse(raw)
    } catch {
      data = eval(raw)
    }
  } else {
    data = raw
  }

  // 已经是数组直接返回
  if (Array.isArray(data)) return data

  // 如果是对象且包含 result 字段，返回 result
  if (data && typeof data === 'object' && Array.isArray(data.result)) {
    return data.result
  }

  throw new Error('无法提取 result 数组')
}

export default { extractResultArray }