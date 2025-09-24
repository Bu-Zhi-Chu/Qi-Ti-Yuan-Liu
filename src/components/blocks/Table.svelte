<script lang="ts">
    export let columns: Array<{ key: string; title: string; width?: number }> = []
    export let data: Array<Record<string, any>> = []
    export let height: string = '400px'
    export let striped: boolean = true
    export let bordered: boolean = true
    export let hover: boolean = true

    $: columnCount = columns.length
    $: columnWidth = columnCount > 0 ? `${100 / columnCount}%` : 'auto'

    function getCellValue(row: any, columnKey: string): any {
        return row[columnKey]
    }
</script>

<div class="table-container" style="height: {height};">
    <div class="table-wrapper">
        <!-- 固定表头 -->
        <div class="table-header">
            <table class="table">
                <thead>
                    <tr>
                        {#each columns as column}
                            <th class="table-header-cell" style="width: {column.width ? column.width + 'px' : columnWidth};">
                                {column.title}
                            </th>
                        {/each}
                    </tr>
                </thead>
            </table>
        </div>

        <!-- 表体滚动区域 -->
        <div class="table-body">
            <table class="table">
                <tbody>
                    {#each data as row, rowIndex}
                        <tr class="table-row" class:striped-row={striped && rowIndex % 2 === 0} class:hover-row={hover}>
                            {#each columns as column}
                                <td class="table-cell" style="width: {column.width ? column.width + 'px' : columnWidth};">
                                    {getCellValue(row, column.key)}
                                </td>
                            {/each}
                        </tr>
                    {/each}
                    {#if data.length === 0}
                        <tr class="empty-row">
                            <td colspan={columnCount} class="empty-cell">暂无数据</td>
                        </tr>
                    {/if}
                </tbody>
            </table>
        </div>
    </div>
</div>

<style>
    .table-container {
        position: relative;
        border: 1px solid #e8e8e8;
        border-radius: 6px;
        background: #ffffff;
        overflow: hidden;
    }

    .table-wrapper {
        display: flex;
        flex-direction: column;
        height: 100%;
    }

    /* 固定表头样式 */
    .table-header {
        flex-shrink: 0;
        background: #fafafa;
        border-bottom: 1px solid #e8e8e8;
        overflow: hidden;
    }

    .table-header table {
        table-layout: fixed;
        width: 100%;
    }

    .table-header-cell {
        padding: 12px 16px;
        text-align: left;
        font-weight: 600;
        color: #262626;
        background: #fafafa;
        border-right: 1px solid #e8e8e8;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .table-header-cell:last-child {
        border-right: none;
    }

    /* 表体滚动区域 */
    .table-body {
        flex: 1;
        overflow: auto;
        background: #ffffff;
    }

    .table-body::-webkit-scrollbar {
        width: 8px;
        height: 8px;
    }

    .table-body::-webkit-scrollbar-track {
        background: #f0f0f0;
        border-radius: 4px;
    }

    .table-body::-webkit-scrollbar-thumb {
        background: #c0c0c0;
        border-radius: 4px;
    }

    .table-body::-webkit-scrollbar-thumb:hover {
        background: #a0a0a0;
    }

    .table-body table {
        table-layout: fixed;
        width: 100%;
    }

    /* 表格基础样式 */
    .table {
        border-collapse: collapse;
        margin: 0;
    }

    /* 表格行样式 */
    .table-row {
        transition: background-color 0.2s ease;
    }

    .striped-row {
        background-color: #fafafa;
    }

    .hover-row:hover {
        background-color: #f5f5f5;
    }

    /* 表格单元格样式 */
    .table-cell {
        padding: 12px 16px;
        text-align: left;
        color: #595959;
        border-right: 1px solid #e8e8e8;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .table-cell:last-child {
        border-right: none;
    }

    /* 空数据样式 */
    .empty-row {
        height: 200px;
    }

    .empty-cell {
        text-align: center;
        color: #bfbfbf;
        font-size: 14px;
        border: none;
    }

    /* 边框控制 */
    .table-container.bordered {
        border: 1px solid #e8e8e8;
    }

    .table-container.bordered .table-cell,
    .table-container.bordered .table-header-cell {
        border: 1px solid #e8e8e8;
    }
</style>
