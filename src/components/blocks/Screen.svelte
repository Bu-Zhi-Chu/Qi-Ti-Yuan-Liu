<script lang="ts">
    import { currentPage } from '../../services/repository/dom-tree.store.svelte'
    export let styles: Record<string, any> = {}
    // 默认全屏定位，可被外部 styles 覆盖
    const defaultStyles: Record<string, any> = {
        position: 'absolute',
        inset: '0',
        width: '100%',
        height: '100%'
    }
    export let id: string = crypto.randomUUID()
    export let keepMounted: boolean | string = true

    // 转成布尔
    $: keepMountedBool = typeof keepMounted === 'string' ? keepMounted !== 'false' : !!keepMounted
    $: isVisible = $currentPage === id || !$currentPage
    $: mergedStyles = keepMountedBool
        ? {
              ...defaultStyles,
              ...styles,
              display: isVisible ? (styles.display ?? 'block') : 'none'
          }
        : { ...defaultStyles, ...styles }
    $: {
        console.debug('[Screen]', id, 'currentPage=', $currentPage, 'isVisible=', isVisible, 'keepMounted=', keepMountedBool)
    }
    $: hiddenClass = keepMountedBool && !isVisible ? 'hidden' : ''
</script>

{#if keepMountedBool || isVisible}
    <div {id} {...$$restProps} class={`screen ${hiddenClass}`} class:use-pseudo-bg={(($$restProps as any).class ?? '').includes('use-pseudo-bg')} style:apply={mergedStyles as any}>
        <slot></slot>
    </div>
{/if}

<style>
    .hidden {
        display: none !important;
    }
</style>
