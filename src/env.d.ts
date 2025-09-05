/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly LITE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// 支持导入 AVIF/WebP 图片资源
declare module '*.avif' {
  const src: string
  export default src
}

declare module '*.webp' {
  const src: string
  export default src
}