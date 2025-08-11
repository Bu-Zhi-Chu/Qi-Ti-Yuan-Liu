declare module "https://cdn.jsdelivr.net/npm/svelte@next/src/compiler/index.js" {
  /**
   * Minimal compile options type mirroring Svelte compiler options.
   * This is intentionally partial; extend as needed for Playground use-cases.
   */
  export interface CompileOptions {
    filename?: string;
    generate?: "dom" | "ssr";
    hydratable?: boolean;
    css?: boolean;
    varsReport?: "full" | "summary" | false;
    [option: string]: unknown;
  }

  /**
   * Result shape returned by the compile function.
   */
  export interface CompileResult {
    js: { code: string; map?: any };
    css?: { code: string; map?: any };
    warnings: Array<any>;
  }

  /**
   * Compile a Svelte component (source string) to JS that can run in the browser.
   */
  export function compile(source: string, options?: CompileOptions): CompileResult;
}