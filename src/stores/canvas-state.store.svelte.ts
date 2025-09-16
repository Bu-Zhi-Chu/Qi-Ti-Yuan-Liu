import { writable } from 'svelte/store'

// 全局画布缩放值（范围通常在 0.2 - 3 之间），默认为 1
export const canvasScale = writable(1)
export default canvasScale