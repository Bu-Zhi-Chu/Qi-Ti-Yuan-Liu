/**
 * Transform Scale 缩放方案服务
 * 
 * 基于CSS transform scale实现的响应式缩放方案
 * 通过计算视口与设计稿的比例，动态应用scale变换
 */

/**
 * 计算缩放比例
 * @param designWidth 设计稿宽度
 * @param designHeight 设计稿高度
 * @returns 缩放比例信息
 */
export function calculateScaleRatio(designWidth: number = 1920, designHeight: number = 1080): {
  scaleX: number
  scaleY: number
  scale: number
  offsetX: number
  offsetY: number
} {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  
  const scaleX = viewportWidth / designWidth
  const scaleY = viewportHeight / designHeight
  
  // 使用较小的比例值保持内容完整显示
  const scale = Math.min(scaleX, scaleY)
  
  // 计算居中偏移
  const offsetX = (viewportWidth - designWidth * scale) / 2
  const offsetY = (viewportHeight - designHeight * scale) / 2
  
  return {
    scaleX: parseFloat(scaleX.toFixed(3)),
    scaleY: parseFloat(scaleY.toFixed(3)),
    scale: parseFloat(scale.toFixed(3)),
    offsetX: parseFloat(offsetX.toFixed(1)),
    offsetY: parseFloat(offsetY.toFixed(1))
  }
}

/**
 * 应用transform scale缩放
 * @param element 目标元素
 * @param designWidth 设计稿宽度
 * @param designHeight 设计稿高度
 */
export function applyTransformScale(
  element: HTMLElement,
  designWidth: number = 1920,
  designHeight: number = 1080
): void {
  const { scale, offsetX, offsetY } = calculateScaleRatio(designWidth, designHeight)
  
  element.style.transform = `scale(${scale})`
  element.style.transformOrigin = 'top left'
  element.style.position = 'absolute'
  element.style.left = `${offsetX}px`
  element.style.top = `${offsetY}px`
}

/**
 * 监听窗口大小变化，动态调整缩放
 * @param callback 缩放比例变化时的回调函数
 * @returns 取消监听的函数
 */
export function onScaleChange(
  callback: (scaleInfo: ReturnType<typeof calculateScaleRatio>) => void,
  designWidth: number = 1920,
  designHeight: number = 1080
): () => void {
  const handleResize = () => {
    const scaleInfo = calculateScaleRatio(designWidth, designHeight)
    callback(scaleInfo)
  }
  
  window.addEventListener('resize', handleResize)
  
  // 立即执行一次
  handleResize()
  
  // 返回取消监听的函数
  return () => {
    window.removeEventListener('resize', handleResize)
  }
}

/**
 * 获取当前缩放信息
 */
export function getCurrentScaleInfo(): ReturnType<typeof calculateScaleRatio> {
  return calculateScaleRatio()
}

/**
 * 验证transform scale方案是否正常工作
 */
export function validateTransformScale(): {
  isWorking: boolean
  scale: number
  viewport: { width: number; height: number }
  design: { width: number; height: number }
} {
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight
  }
  
  const design = {
    width: 1920,
    height: 1080
  }
  
  const { scale } = calculateScaleRatio(design.width, design.height)
  
  return {
    isWorking: scale > 0 && scale <= 1,
    scale: parseFloat(scale.toFixed(3)),
    viewport,
    design
  }
}