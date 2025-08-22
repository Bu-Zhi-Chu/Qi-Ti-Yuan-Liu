/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PROD_LITE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}