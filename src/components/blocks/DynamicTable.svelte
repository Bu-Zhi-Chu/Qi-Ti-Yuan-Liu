<script lang="ts">
    interface Props {
        tableIdPrefix?: string
        headers?: string[]
        columnLabels?: string[]
        bodyData?: (string | number)[][]
        columnFlexRatios?: number[] | null
        rowBackgroundImageUrl?: string
        headerRowHeight?: string
        bodyRowHeight?: string
        tableWidth?: string
        headerTextColor?: string
        bodyTextColor?: string
        fontSize?: string
        marginTop?: string
        bodyMaxHeight?: string
        emptyText?: string
        id?: string
        'data-name'?: string
        style?: string
        class?: string
        onclick?: (event: MouseEvent) => void
        [key: string]: any
    }

    let {
        tableIdPrefix = 'dynamic-table',
        headers = [],
        columnLabels = [],
        bodyData = [],
        columnFlexRatios = null,
        rowBackgroundImageUrl = '',
        headerRowHeight = 'calc(36px * var(--scale-ratio, 1))',
        bodyRowHeight = 'calc(36px * var(--scale-ratio, 1))',
        tableWidth = '100%',
        headerTextColor = '#a1a5a9',
        bodyTextColor = 'black',
        headerBackgroundColor = 'rgba(0, 212, 255, 0.2)',
        bodyBackgroundColor = 'rgba(255, 255, 255, 0.1)',
        fontSize = 'calc(16px * var(--scale-ratio, 1))',
        marginTop = '0',
        bodyMaxHeight = 'calc(300px * var(--scale-ratio, 1))',
        bodyHeight = 'calc(250px * var(--scale-ratio, 1))',
        showScrollbar = true,
        emptyText = '暂无数据',

        id = '',
        'data-name': dataName = 'DynamicTable',
        style = '',
        class: className = '',
        onclick,
        ...rest
    }: Props = $props()

    // 调试信息：检查接收到的数据
    $effect(() => {
        console.log('[DynamicTable] 接收到的数据:', { headers, columnLabels, bodyData, headersLength: headers?.length, bodyDataLength: bodyData?.length })
        console.log('[DynamicTable] 显示的数据:', { displayHeaders, displayBodyData })
    })

    // 默认数据，确保组件能正常显示
    let displayHeaders = $derived.by(() => {
        // 优先使用 columnLabels，然后使用 headers，最后生成默认值
        if (columnLabels && columnLabels.length > 0) {
            return columnLabels
        }
        if (headers && headers.length > 0) {
            return headers
        }
        if (bodyData && bodyData.length > 0 && bodyData[0].length > 0) {
            return Array.from({ length: bodyData[0].length }, (_, i) => `列${i + 1}`)
        }
        return ['列1', '列2', '列3']
    })

    let displayBodyData = $derived.by(() => {
        if (bodyData && bodyData.length > 0) {
            return bodyData
        }

        const numCols = displayHeaders.length
        const numRows = 50 // Match original default data row count
        return Array.from({ length: numRows }, (_, rowIndex) => Array.from({ length: numCols }, (_, colIndex) => `示例 ${rowIndex + 1}-${colIndex + 1}`))
    })

    // 计算列数
    let numColumns = $derived(displayHeaders.length)

    // 监听 columnLabels 变化，确保动态更新
    $effect(() => {
        // 这个 effect 会追踪 columnLabels 的变化，确保 displayHeaders 重新计算
        if (columnLabels) {
            console.log('[DynamicTable] columnLabels 已更新:', columnLabels)
        }
    })
    let useFlexRatios = $derived(columnFlexRatios && Array.isArray(columnFlexRatios) && columnFlexRatios.length === numColumns)

    // 生成表头样式
    function getHeaderCellStyle(index: number): string {
        let cellStyle = `display: flex; align-items: center; justify-content: center; font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`

        if (useFlexRatios) {
            cellStyle += ` flex-grow: ${columnFlexRatios![index]}; flex-shrink: 1; flex-basis: 0%;`
        } else {
            const cellWidthPercent = 100 / numColumns
            cellStyle += ` width: ${cellWidthPercent}%;`
        }

        return cellStyle
    }

    // 生成单元格样式
    function getBodyCellStyle(index: number): string {
        let cellStyle = `display: flex; align-items: center; justify-content: center; color: ${bodyTextColor}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`

        if (useFlexRatios) {
            cellStyle += ` flex-grow: ${columnFlexRatios![index]}; flex-shrink: 1; flex-basis: 0%;`
        } else {
            const cellWidthPercent = 100 / numColumns
            cellStyle += ` width: ${cellWidthPercent}%;`
        }

        return cellStyle
    }

    // 生成表头背景样式
    function getHeaderBackgroundStyle(): string {
        if (rowBackgroundImageUrl && rowBackgroundImageUrl.trim() !== '') {
            return `background: url(${rowBackgroundImageUrl}) no-repeat center center / 100% 100%;`
        }
        return `background: ${headerBackgroundColor}; backdrop-filter: blur(calc(10px * var(--scale-ratio, 1)));`
    }

    // 获取数据行背景样式
    function getBodyBackgroundStyle(): string {
        if (rowBackgroundImageUrl && rowBackgroundImageUrl.trim() !== '') {
            return `background: url(${rowBackgroundImageUrl}) no-repeat center center / 100% 100%;`
        }
        return `background: ${bodyBackgroundColor}; backdrop-filter: blur(calc(10px * var(--scale-ratio, 1)));`
    }
</script>

<div class="dynamic-table-container {className}" style="width: {tableWidth}; margin-top: {marginTop}; {style}" {id} data-name={dataName} data-component="DynamicTable" data-headers={JSON.stringify(displayHeaders)} data-rows={displayBodyData.length} {onclick} {...rest}>
    <!-- 表头 -->
    <div class="styled-table-row-header" style="color: {headerTextColor}; font-size: {fontSize}; margin-top: {marginTop}; width: {tableWidth}; height: {headerRowHeight}; {getHeaderBackgroundStyle()} display: flex;">
        {#each displayHeaders as header, index}
            <div class="styled-table-cell" style={getHeaderCellStyle(index)}>
                {header}
            </div>
        {/each}
    </div>

    <!-- 表体 -->
    <div class="styled-table-body" style="font-size: {fontSize}; width: 100%; height: {bodyHeight}; overflow-y: {showScrollbar ? 'scroll' : 'hidden'};">
        {#if displayBodyData && displayBodyData.length > 0}
            {#each displayBodyData as rowData}
                <div class="styled-table-row-body" style="margin-top: calc(0.5% * var(--scale-ratio, 1)); width: {tableWidth}; height: {bodyRowHeight}; {getBodyBackgroundStyle()} display: flex;">
                    {#each Array(displayHeaders.length) as _, colIndex}
                        {@const cellData = rowData[colIndex] !== undefined ? rowData[colIndex] : ''}
                        <div class="styled-table-cell" style={getBodyCellStyle(colIndex)}>
                            {cellData}
                        </div>
                    {/each}
                </div>
            {/each}
        {:else}
            <div class="styled-table-row-body empty-row" style="margin-top: calc(0.5% * var(--scale-ratio, 1)); width: {tableWidth}; height: {bodyRowHeight}; {getBodyBackgroundStyle()} display: flex; align-items: center; justify-content: center; color: {bodyTextColor};">
                {emptyText}
            </div>
        {/if}
    </div>
</div>

<style>
    .dynamic-table-container {
        border-radius: calc(4px * var(--scale-ratio, 1));
        display: flex;
        flex-direction: column;
        overflow: hidden;
        height: 100%;
        max-height: 100%;
        background: rgba(0, 0, 0, 0.3);
        border: calc(1px * var(--scale-ratio, 1)) solid rgba(255, 255, 255, 0.1);
    }

    .styled-table-row-header {
        border-radius: calc(4px * var(--scale-ratio, 1)) calc(4px * var(--scale-ratio, 1)) 0 0;
        box-shadow: 0 calc(2px * var(--scale-ratio, 1)) calc(4px * var(--scale-ratio, 1)) rgba(0, 0, 0, 0.1);
        padding-right: var(--scrollbar-width, calc(12px * var(--scale-ratio, 1)));
        box-sizing: border-box;
    }

    .styled-table-row-body {
        border-radius: calc(2px * var(--scale-ratio, 1));
        transition: all calc(0.2s * var(--scale-ratio, 1)) ease;
    }

    .styled-table-row-body:hover {
        transform: translateY(calc(-1px * var(--scale-ratio, 1)));
        box-shadow: 0 calc(4px * var(--scale-ratio, 1)) calc(8px * var(--scale-ratio, 1)) rgba(0, 0, 0, 0.15);
    }

    .styled-table-cell {
        padding: calc(8px * var(--scale-ratio, 1)) calc(12px * var(--scale-ratio, 1));
        border-right: calc(1px * var(--scale-ratio, 1)) solid rgba(255, 255, 255, 0.1);
        min-height: calc(36px * var(--scale-ratio, 1));
        box-sizing: border-box;
    }

    .styled-table-cell:last-child {
        border-right: none;
    }

    .styled-table-body {
        --scrollbar-width: calc(12px * var(--scale-ratio, 1));
        overflow-y: overlay;
        flex: 1;
        scrollbar-width: thin;
        scrollbar-color: #4a90e2 rgba(30, 30, 50, 0);
        border-right: calc(2px * var(--scale-ratio, 1)) solid rgba(100, 150, 255, 0.3);
        box-sizing: border-box;
    }

    .styled-table-body::-webkit-scrollbar {
        width: calc(12px * var(--scale-ratio, 1));
    }

    .styled-table-body::-webkit-scrollbar-track {
        background: rgba(30, 30, 50, calc(0.8 * var(--scale-ratio, 1)));
        border-radius: calc(6px * var(--scale-ratio, 1));
    }

    .styled-table-body::-webkit-scrollbar-thumb {
        background: linear-gradient(45deg, #4a90e2, #7bb3f0);
        border-radius: calc(6px * var(--scale-ratio, 1));
        border: calc(2px * var(--scale-ratio, 1)) solid rgba(30, 30, 50, 0.5);
        box-shadow: inset 0 0 calc(3px * var(--scale-ratio, 1)) rgba(255, 255, 255, 0.3);
    }

    .styled-table-body::-webkit-scrollbar-thumb:hover {
        background: linear-gradient(45deg, #5ba0f2, #8bc4ff);
        box-shadow: inset 0 0 calc(5px * var(--scale-ratio, 1)) rgba(255, 255, 255, 0.5);
    }

    .styled-table-body::-webkit-scrollbar-thumb:active {
        background: linear-gradient(45deg, #3a80d2, #6ba3e0);
    }

    .empty-row {
        font-style: italic;
        opacity: calc(0.7 * var(--scale-ratio, 1));
    }

    /* 响应式设计 */
    @media (max-width: calc(768px * var(--scale-ratio, 1))) {
        .dynamic-table-container {
            width: 100% !important;
        }

        .styled-table-row-header,
        .styled-table-row-body {
            width: 100% !important;
        }
    }
</style>
