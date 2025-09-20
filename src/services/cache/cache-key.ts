/**
 * 对对象或数组的键进行递归排序，以确保稳定的字符串表示。
 * @param obj - 要排序的对象或数组。
 * @returns 排序后的对象或数组。
 */
function sortObject<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sortObject) as T;
  }

  const sortedKeys = Object.keys(obj).sort();
  const sortedObj: { [key: string]: any } = {};

  for (const key of sortedKeys) {
    sortedObj[key] = sortObject((obj as any)[key]);
  }

  return sortedObj as T;
}

/**
 * 从 URL 和请求选项生成稳定的、哈希过的缓存键。
 * @param url - 请求 URL。
 * @param options - 请求选项 (RequestInit)。
 * @returns 一个解析为缓存键字符串的 Promise。
 */
export async function generateCacheKey(url: string, options: RequestInit = {}): Promise<string> {
  const method = (options.method || 'GET').toUpperCase();

  // 使用一个基础 URL 来正确解析相对路径
  const urlObject = new URL(url, window.location.origin);

  // 排序 URL 查询参数
  const sortedSearchParams = new URLSearchParams();
  const searchParamsKeys = Array.from(urlObject.searchParams.keys()).sort();
  for (const key of searchParamsKeys) {
    urlObject.searchParams.getAll(key).sort().forEach(value => {
      sortedSearchParams.append(key, value);
    });
  }
  urlObject.search = sortedSearchParams.toString();

  let bodyPart = '';
  if (options.body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    try {
      // 尝试将 body 解析为 JSON 并排序
      const bodyObject = JSON.parse(options.body as string);
      const sortedBody = sortObject(bodyObject);
      bodyPart = JSON.stringify(sortedBody);
    } catch (e) {
      // 如果 body 不是有效的 JSON，则直接使用原始字符串
      bodyPart = options.body as string;
    }
  }

  const keyString = `${method}|${urlObject.pathname}${urlObject.search}|${bodyPart}`;

  // 使用 SubtleCrypto API 对 key 进行 SHA-256 哈希，以避免超长键并确保格式统一
  const encoder = new TextEncoder();
  const data = encoder.encode(keyString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}
""