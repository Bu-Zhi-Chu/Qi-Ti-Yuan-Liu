(function () {
  function printBanner() {
    console.log(
      '%c 🧩  欢迎使用七巧板 · 低代码开发工具 ',
      'background:linear-gradient(90deg,#f97316,#fb923c);color:#fff;font-weight:bold;font-size:16px;padding:4px 10px;border-radius:6px'
    );
    console.group('%c📜 版权声明', 'color:#16a34a;font-weight:bold;font-size:14px;');
    console.log(
      '%c1. 七巧板版权完全属于 %c"步知处社团"%c 全体开发成员所有。',
      'color:#6b7280;font-size:12px;',
      'color:#f59e0b;font-size:12px;font-weight:bold;',
      'color:#6b7280;font-size:12px;'
    );
    console.log(
      '%c2. 七巧板软件包，任何个人或组织获取授权后在遵守下列条件的前提下可以使用：',
      'color:#6b7280;font-size:12px;'
    );
    console.log('%c   • 不进行任何形式的破解和裁剪，程序包完整引用；', 'color:#6b7280;font-size:12px;');
    console.log('%c   • 保留此版权信息在控制台输出。', 'color:#6b7280;font-size:12px;');
    console.log('%c3. 我们保留对此版权信息的最终解释权。', 'color:#6b7280;font-size:12px;');
    console.groupEnd();
  }
  // 使用微任务/宏任务让调用栈变为匿名，从而在 DevTools 中显示 <anonymous>
  setTimeout(printBanner, 0);
})();