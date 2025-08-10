/**
 * global-cursor.service.ts  全局自定义光标服务
 * ------------------------------------------------------
 * 该服务在 <body> 内动态插入一个元素, 使其跟随鼠标移动以实现全局自定义光标效果。
 *
 * 特性:
 *   1. 支持配置光标大小、颜色、边框宽度。
 *   2. 可选隐藏原生系统光标, 组件卸载/禁用后自动恢复。
 *   3. 统一单例设计, 避免在多处重复初始化导致性能浪费。
 *   4. 纯 TypeScript 实现, 与框架无耦合, 可在任意环境调用。
 *
 * 使用示例:
 *   import {
 *     enableGlobalCursor,
 *     disableGlobalCursor,
 *     updateGlobalCursorOptions
 *   } from '@/services/utils/global-cursor.service';
 *
 *   // 开启
 *   enableGlobalCursor({ size: 18, color: '#ff0055', hideNative: true });
 *
 *   // 动态更新
 *   updateGlobalCursorOptions({ color: '#00c8ff' });
 *
 *   // 关闭
 *   disableGlobalCursor();
 */

export interface GlobalCursorOptions {
  /** 光标直径 */
  size?: number;
  /** 颜色 (作用于边框颜色) */
  color?: string;
  /** 边框宽度, 默认 2px */
  borderWidth?: number;
  /** 是否隐藏原生系统光标 */
  hideNative?: boolean;
}

// 默认配置
const DEFAULT_OPTIONS: Required<GlobalCursorOptions> = {
  size: 12,
  color: '#000',
  borderWidth: 2,
  hideNative: false,
};

// 当前配置, 供外部读取
let currentOptions: Required<GlobalCursorOptions> = { ...DEFAULT_OPTIONS };

// 单例元素及监听器引用
let cursorEl: HTMLDivElement | null = null;
let moveListener: ((e: MouseEvent) => void) | null = null;

/**
 * 根据当前配置更新光标 DOM 的样式
 */
function applyStyles() {
  if (!cursorEl) return;
  const { size, color, borderWidth } = currentOptions;
  cursorEl.style.width = `${size}px`;
  cursorEl.style.height = `${size}px`;
  cursorEl.style.borderWidth = `${borderWidth}px`;
  cursorEl.style.borderColor = color;
}

/**
 * 启用全局光标
 */
export function enableGlobalCursor(options: GlobalCursorOptions = {}): void {
  // 如果已启用, 仅更新配置即可
  if (cursorEl) {
    updateGlobalCursorOptions(options);
    return;
  }

  currentOptions = { ...currentOptions, ...options } as Required<GlobalCursorOptions>;

  // 创建光标元素
  cursorEl = document.createElement('div');
  cursorEl.style.cssText = [
    'position: fixed',
    'top: 0',
    'left: 0',
    'transform: translate(-50%, -50%)',
    'pointer-events: none',
    'border-style: solid',
    'border-radius: 50%',
    'z-index: 9999',
    'transition: transform 0.08s ease-out',
  ].join(';');
  document.body.appendChild(cursorEl);

  // 初始样式
  applyStyles();

  // 跟随鼠标移动
  moveListener = (e: MouseEvent) => {
    if (!cursorEl) return;
    cursorEl.style.left = `${e.clientX}px`;
    cursorEl.style.top = `${e.clientY}px`;
  };
  window.addEventListener('mousemove', moveListener);

  // 隐藏原生光标
  if (currentOptions.hideNative) {
    document.body.style.cursor = 'none';
  }
}

/**
 * 更新已启用光标的选项
 */
export function updateGlobalCursorOptions(options: GlobalCursorOptions): void {
  if (!cursorEl) return; // 未开启
  currentOptions = { ...currentOptions, ...options } as Required<GlobalCursorOptions>;
  applyStyles();

  // 处理 hideNative 动态切换
  document.body.style.cursor = currentOptions.hideNative ? 'none' : '';
}

/**
 * 关闭全局光标并清理资源
 */
export function disableGlobalCursor(): void {
  if (!cursorEl) return;
  window.removeEventListener('mousemove', moveListener!);
  cursorEl.remove();
  cursorEl = null;
  moveListener = null;

  // 恢复系统光标
  document.body.style.cursor = '';

  // 重置选项
  currentOptions = { ...DEFAULT_OPTIONS };
}