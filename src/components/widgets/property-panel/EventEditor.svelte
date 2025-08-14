<!-- EventEditor.svelte
     节点事件编辑器骨架
-->
<script lang="ts">
  import { EVENT_WHITELIST } from '../../../services/property-panel/constants';
  import { getNodeProps } from '../../../services/property-panel/property-panel.service';

  export let selectedId: string | null = null;
  let eventSnapshot: ReturnType<typeof getNodeProps> | null = null;

  $: if (selectedId) {
    eventSnapshot = getNodeProps(selectedId);
  }
</script>

<p>事件编辑器占位（共 {EVENT_WHITELIST.length} 种可绑定事件）</p>