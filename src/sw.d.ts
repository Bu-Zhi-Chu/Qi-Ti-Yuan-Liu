/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope

declare global {
  interface Window {
    __WB_MANIFEST: Array<{
      revision: string | null
      url: string
    }>
  }
}

export {}