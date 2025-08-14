<!-- AttrEditor.svelte
     节点属性编辑器骨架
-->
<script lang="ts">
  import type { DomNode } from '../../../types/dom-node.types';
  import { ATTR_WHITELIST } from '../../../services/property-panel/constants';
  import { getNodeProps, updateNodeProps } from '../../../services/property-panel/property-panel.service';

  // 属性面板需要的参数
  export let selectedId: string | null = null;
  let propsSnapshot: ReturnType<typeof getNodeProps> | null = null;

  $: if (selectedId) {
    propsSnapshot = getNodeProps(selectedId);
  }
</script>

<p>属性编辑器占位（共 {ATTR_WHITELIST.length} 个可编辑字段）</p>