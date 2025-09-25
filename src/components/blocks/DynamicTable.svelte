<script lang="ts">
    interface Props {
        tableIdPrefix?: string
        headers?: string[]
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
        console.log('[DynamicTable] 接收到的数据:', { headers, bodyData, headersLength: headers?.length, bodyDataLength: bodyData?.length })
        console.log('[DynamicTable] 显示的数据:', { displayHeaders, displayBodyData })
    })

    // 计算列数
    let numColumns = $derived(headers && headers.length > 0 ? headers.length : 1)
    let useFlexRatios = $derived(columnFlexRatios && Array.isArray(columnFlexRatios) && columnFlexRatios.length === numColumns)

    // 默认数据，确保组件能正常显示
    let displayHeaders = $derived(headers && headers.length > 0 ? headers : ['列1', '列2', '列3'])
    let displayBodyData = $derived(
        bodyData && bodyData.length > 0
            ? bodyData
            : [
                  ['示例数据1', '示例数据2', '示例数据3'],
                  ['示例数据4', '示例数据5', '示例数据6'],
                  ['示例数据7', '示例数据8', '示例数据9'],
                  ['示例数据10', '示例数据11', '示例数据12'],
                  ['示例数据13', '示例数据14', '示例数据15'],
                  ['示例数据16', '示例数据17', '示例数据18'],
                  ['示例数据19', '示例数据20', '示例数据21'],
                  ['示例数据22', '示例数据23', '示例数据24'],
                  ['示例数据25', '示例数据26', '示例数据27'],
                  ['示例数据28', '示例数据29', '示例数据30'],
                  ['示例数据31', '示例数据32', '示例数据33'],
                  ['示例数据34', '示例数据35', '示例数据36'],
                  ['示例数据37', '示例数据38', '示例数据39'],
                  ['示例数据40', '示例数据41', '示例数据42'],
                  ['示例数据43', '示例数据44', '示例数据45'],
                  ['示例数据46', '示例数据47', '示例数据48'],
                  ['示例数据49', '示例数据50', '示例数据51'],
                  ['示例数据52', '示例数据53', '示例数据54'],
                  ['示例数据55', '示例数据56', '示例数据57'],
                  ['示例数据58', '示例数据59', '示例数据60'],
                  ['示例数据61', '示例数据62', '示例数据63'],
                  ['示例数据64', '示例数据65', '示例数据66'],
                  ['示例数据67', '示例数据68', '示例数据69'],
                  ['示例数据70', '示例数据71', '示例数据72'],
                  ['示例数据73', '示例数据74', '示例数据75'],
                  ['示例数据76', '示例数据77', '示例数据78'],
                  ['示例数据79', '示例数据80', '示例数据81'],
                  ['示例数据82', '示例数据83', '示例数据84'],
                  ['示例数据85', '示例数据86', '示例数据87'],
                  ['示例数据88', '示例数据89', '示例数据90'],
                  ['示例数据91', '示例数据92', '示例数据93'],
                  ['示例数据94', '示例数据95', '示例数据96'],
                  ['示例数据97', '示例数据98', '示例数据99'],
                  ['示例数据100', '示例数据101', '示例数据102'],
                  ['示例数据103', '示例数据104', '示例数据105'],
                  ['示例数据106', '示例数据107', '示例数据108'],
                  ['示例数据109', '示例数据110', '示例数据111'],
                  ['示例数据112', '示例数据113', '示例数据114'],
                  ['示例数据115', '示例数据116', '示例数据117'],
                  ['示例数据118', '示例数据119', '示例数据120'],
                  ['示例数据121', '示例数据122', '示例数据123'],
                  ['示例数据124', '示例数据125', '示例数据126'],
                  ['示例数据127', '示例数据128', '示例数据129'],
                  ['示例数据130', '示例数据131', '示例数据132'],
                  ['示例数据133', '示例数据134', '示例数据135'],
                  ['示例数据136', '示例数据137', '示例数据138'],
                  ['示例数据139', '示例数据140', '示例数据141'],
                  ['示例数据142', '示例数据143', '示例数据144'],
                  ['示例数据145', '示例数据146', '示例数据147'],
                  ['示例数据148', '示例数据149', '示例数据150']
              ]
    )

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
