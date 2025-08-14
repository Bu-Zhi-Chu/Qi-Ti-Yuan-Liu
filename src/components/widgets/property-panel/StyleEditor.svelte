<!-- StyleEditor.svelte
     节点样式编辑器骨架
-->
<script lang="ts">
  import { STYLE_WHITELIST } from '../../../services/property-panel/constants';
  import { getNodeProps } from '../../../services/property-panel/property-panel.service';

  export let selectedId: string | null = null;
  let styleSnapshot: ReturnType<typeof getNodeProps> | null = null;

  $: if (selectedId) {
    styleSnapshot = getNodeProps(selectedId);
  }
</script>

<p>样式编辑器占位（共 {STYLE_WHITELIST.length} 个可编辑字段）</p>