/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly LITE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}