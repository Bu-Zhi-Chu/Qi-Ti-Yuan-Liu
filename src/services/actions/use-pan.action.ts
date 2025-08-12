/**
 * use-pan.action.ts  通用平移（pan）Svelte Action
 * ------------------------------------------------------
 * 设计目标:
 *  1. 支持通过自定义按键(如 Space、V) + 左键拖动启用平移。
 *  2. 可选边界限制, 默认无限制; 传入 "parent" 或函数可约束移动范围。
 *  3. 兼容画布缩放, 提供 scaleAccessor 以校正位移。
 *  4. 通过回调 onPan 持续输出偏移量, 并返回总位移; 未来可扩展吸附/网格。
 *  5. 纯 TypeScript, 无 Svelte 依赖, 但符合 Svelte Action 规范。
 *
 * 用法示例:
 * ```svelte
 * <script lang="ts">
 *   import usePan from '@/services/utils/use-pan.action';
 *   let pos = {x:0,y:0};
 *   function move({ x, y }) { pos = { x, y }; }
 * </script>
 *
 * <!-- 画布: 空格 + 左键拖动 -->
 * <div class="canvas" use:usePan={{ key: 'Space', onPan: move }} />
 *
 * <!-- DOM 元素: V + 左键拖动, 且不能超出父级 -->
 * <div class="box" use:usePan={{ key: 'KeyV', constraints: 'parent', onPan: move }} />
 * ```
 */

export interface UsePanOptions {
  /** 触发拖动的键盘按键, 对应 KeyboardEvent.code, 例: 'Space' | 'KeyV'. 传入 undefined 则始终允许拖动 */
  key?: string;
  /** 边界限制: 传入 'parent' 自动限制在父元素内; 或自定义函数返回被约束的新坐标 */
  constraints?: 'parent' | ((coord: { x: number; y: number }) => { x: number; y: number });
  /** 画布缩放读取函数, 返回当前 scale 值, 默认 1 */
  scaleAccessor?: () => number;
  /** move 事件节流间隔(ms)。0 表示不节流, 默认 0 */
  throttle?: number;
  /** 位移回调, 持续触发 */
  onPan?: (info: {
    dx: number;
    dy: number;
    x: number;
    y: number;
    event: PointerEvent;
  }) => void;
  /** 当前偏移读取函数, 用于在按下时初始化总位移 */
  offsetAccessor?: () => { x: number; y: number };
  /** 是否处于编辑模式的 accessor */
  editingAccessor?: () => boolean;
}

interface InternalState {
  panActive: boolean;
  lastX: number;
  lastY: number;
  totalX: number;
  totalY: number;
  keyPressed: boolean;
  throttling: boolean;
}

const DEFAULT_OPTIONS: Required<Pick<UsePanOptions, 'scaleAccessor' | 'throttle'>> = {
  scaleAccessor: () => 1,
  throttle: 0,
};

/**
 * Svelte Action 实现
 */
export default function usePan(node: HTMLElement, opts: UsePanOptions = {}) {
  let options: UsePanOptions = { ...DEFAULT_OPTIONS, ...opts } as UsePanOptions;
  const state: InternalState = {
    panActive: false,
    lastX: 0,
    lastY: 0,
    totalX: 0,
    totalY: 0,
    keyPressed: false,
    throttling: false,
  };

  /** ----------------- 键盘监听 ---------------- */
  function handleKeyDown(e: KeyboardEvent) {
    if (e.code !== options.key) return;
    if (options.editingAccessor && !options.editingAccessor()) return;
    if (!state.keyPressed) {
      state.keyPressed = true;
      if (!state.panActive) {
        node.style.cursor = 'grab';
        document.body.style.cursor = 'grab';
      }
    }
  }
  function handleKeyUp(e: KeyboardEvent) {
    if (e.code !== options.key) return;
    state.keyPressed = false;
    if (!state.panActive) {
      node.style.cursor = '';
      document.body.style.cursor = '';
    }
  }
  if (options.key) {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
  }

  /** ----------------- 指针事件 ---------------- */
  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0) return; // 限制左键
    if (options.key && !state.keyPressed) return; // 未按触发键
    if (options.editingAccessor && !options.editingAccessor()) return;

    // 初始化累计位移为当前偏移, 解决缩放后首次拖动跳动
    const initOffset = options.offsetAccessor?.() ?? { x: 0, y: 0 };
    state.totalX = initOffset.x;
    state.totalY = initOffset.y;

    state.panActive = true;
    state.lastX = e.clientX;
    state.lastY = e.clientY;
    node.setPointerCapture(e.pointerId);
    node.style.cursor = 'grabbing';
    document.body.style.cursor = 'grabbing';
  }

  function onPointerMove(e: PointerEvent) {
    if (!state.panActive) return;
    if (options.throttle && state.throttling) return;

    const scale = options.scaleAccessor?.() ?? 1;
    const dx = (e.clientX - state.lastX) / scale;
    const dy = (e.clientY - state.lastY) / scale;

    state.totalX += dx;
    state.totalY += dy;

    state.lastX = e.clientX;
    state.lastY = e.clientY;

    // 初步坐标
    let next = { x: state.totalX, y: state.totalY };

    // 约束
    if (options.constraints) {
      if (options.constraints === 'parent') {
        const parentRect = node.parentElement?.getBoundingClientRect();
        const selfRect = node.getBoundingClientRect();
        if (parentRect) {
          next.x = Math.min(
            Math.max(next.x, -(selfRect.left - parentRect.left)),
            parentRect.right - selfRect.right + next.x
          );
          next.y = Math.min(
            Math.max(next.y, -(selfRect.top - parentRect.top)),
            parentRect.bottom - selfRect.bottom + next.y
          );
        }
      } else {
        next = options.constraints({ x: next.x, y: next.y });
      }
    }

    options.onPan?.({ dx, dy, x: next.x, y: next.y, event: e });

    if (options.throttle && options.throttle > 0) {
      state.throttling = true;
      setTimeout(() => (state.throttling = false), options.throttle);
    }
  }

  function onPointerUp(e: PointerEvent) {
    if (!state.panActive) return;
    state.panActive = false;
    node.releasePointerCapture(e.pointerId);
    const nextCursor = state.keyPressed ? 'grab' : '';
    node.style.cursor = nextCursor;
    document.body.style.cursor = nextCursor;
  }

  node.addEventListener('pointerdown', onPointerDown);
  node.addEventListener('pointermove', onPointerMove);
  node.addEventListener('pointerup', onPointerUp);
  node.addEventListener('pointercancel', onPointerUp);

  /** ----------------- Action 返回值 ---------------- */
  return {
    update(newOpts: UsePanOptions) {
      options = { ...options, ...newOpts };
    },
    destroy() {
      node.removeEventListener('pointerdown', onPointerDown);
      node.removeEventListener('pointermove', onPointerMove);
      node.removeEventListener('pointerup', onPointerUp);
      node.removeEventListener('pointercancel', onPointerUp);
      if (options.key) {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
      }
    },
  };
}