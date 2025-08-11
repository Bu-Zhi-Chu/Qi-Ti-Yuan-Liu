// 这是默认的 Svelte 4 组件代码
export const defaultSvelteComponentCode = `
<script>
  console.log(1111); // 初始加载时打印，验证脚本执行
  let count = $state(0); // Svelte 5 使用 $state 创建响应式状态
  console.log(count); // 打印初始值
  function increment() {
    count++; // 直接修改 $state 创建的响应式变量
    console.log(count); // 打印更新后的值
  }
</script>

<button onclick={increment}>
  点击次数：{count}
</button>
`;

// 这是重置时使用的 Svelte 5 组件代码
export const resetSvelteComponentCode = `
<script>
  let count = $state(0);
  function increment() {
    count++;
  }
</script>

<button onclick={increment}>
  点击次数：{count}
</button>
`;
