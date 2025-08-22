/**
 * ColorLogger - 彩色日志工具
 * 功能：
 *   - 为不同类型的数据库操作提供彩色日志输出
 *   - 支持创建、删除、查询、添加、更新、删除等操作的彩色标识
 *   - 提供统一的日志格式和颜色方案
 */

// 定义颜色常量
const COLORS = {
    // 操作类型颜色
    CREATE: '#10B981',      // 绿色 - 创建操作
    DELETE: '#EF4444',      // 红色 - 删除操作
    QUERY: '#3B82F6',       // 蓝色 - 查询操作
    ADD: '#8B5CF6',         // 紫色 - 添加操作
    UPDATE: '#F59E0B',      // 橙色 - 更新操作
    INFO: '#6B7280',        // 灰色 - 信息
    ERROR: '#DC2626',       // 深红色 - 错误
    SUCCESS: '#059669',     // 深绿色 - 成功

    // 文本颜色
    WHITE: '#FFFFFF',
    BLACK: '#000000'
} as const

// 定义日志类型
export type LogType = 'CREATE' | 'DELETE' | 'QUERY' | 'ADD' | 'UPDATE' | 'INFO' | 'ERROR' | 'SUCCESS'

/**
 * 彩色日志工具类
 */
export class ColorLogger {
    /**
     * 打印彩色日志
     * @param type - 日志类型
     * @param message - 日志消息
     * @param data - 可选的附加数据
     */
    static log(type: LogType, message: string, data?: any): void {
        const color = COLORS[type]
        const timestamp = new Date().toLocaleTimeString()

        // 构建日志前缀
        const prefix = `%c[${timestamp}] [${type}]`
        const styles = `color: ${COLORS.WHITE}; background-color: ${color}; padding: 2px 6px; border-radius: 3px; font-weight: bold;`

        if (data !== undefined) {
            console.log(prefix + ` ${message}`, styles, data)
        } else {
            console.log(prefix + ` ${message}`, styles)
        }
    }

    /**
     * 创建数据库日志
     */
    static create(message: string, data?: any): void {
        this.log('CREATE', message, data)
    }

    /**
     * 删除数据库日志
     */
    static delete(message: string, data?: any): void {
        this.log('DELETE', message, data)
    }

    /**
     * 查询数据库日志
     */
    static query(message: string, data?: any): void {
        this.log('QUERY', message, data)
    }

    /**
     * 添加记录日志
     */
    static add(message: string, data?: any): void {
        this.log('ADD', message, data)
    }

    /**
     * 更新记录日志
     */
    static update(message: string, data?: any): void {
        this.log('UPDATE', message, data)
    }

    /**
     * 信息日志
     */
    static info(message: string, data?: any): void {
        this.log('INFO', message, data)
    }

    /**
     * 错误日志
     */
    static error(message: string, error?: any): void {
        this.log('ERROR', message, error)
    }

    /**
     * 成功日志
     */
    static success(message: string, data?: any): void {
        this.log('SUCCESS', message, data)
    }

    /**
     * 表格形式打印多条记录
     */
    static table(type: LogType, title: string, data: any[]): void {
        const color = COLORS[type]
        const timestamp = new Date().toLocaleTimeString()

        console.log(
            `%c[${timestamp}] [${type}] ${title} (共${data.length}条)`,
            `color: ${COLORS.WHITE}; background-color: ${color}; padding: 2px 6px; border-radius: 3px; font-weight: bold;`
        )

        if (data.length > 0) {
            console.table(data)
        }
    }
}

/**
 * 数据库操作专用日志工具
 * 为DexieService提供专门的彩色日志包装
 */
export class DatabaseLogger {
    /**
     * 创建数据库
     */
    static creatingDatabase(dbName: string): void {
        ColorLogger.create(`开始创建数据库: ${dbName}`)
    }

    static databaseCreated(dbName: string): void {
        ColorLogger.success(`数据库创建成功: ${dbName}`)
    }

    /**
     * 检查数据库存在
     */
    static checkingDatabase(dbName: string): void {
        ColorLogger.query(`检查数据库是否存在: ${dbName}`)
    }

    static databaseExists(dbName: string, exists: boolean): void {
        ColorLogger.info(`数据库${dbName}存在状态: ${exists}`)
    }

    /**
     * 查询操作
     */
    static queryingRecords(dbName: string, tableName: string): void {
        ColorLogger.query(`查询数据: 数据库=${dbName}, 表=${tableName}`)
    }

    static queryResults(count: number): void {
        ColorLogger.info(`查询结果: 共${count}条记录`)
    }

    /**
     * 获取单条记录
     */
    static gettingRecord(dbName: string, tableName: string, key: any): void {
        ColorLogger.query(`获取单条记录: 数据库=${dbName}, 表=${tableName}, ID=${key}`)
    }

    static recordFound(found: boolean): void {
        ColorLogger.info(`获取记录结果: ${found ? '找到记录' : '未找到记录'}`)
    }

    /**
     * 删除操作
     */
    static deletingRecord(dbName: string, tableName: string, key: any): void {
        ColorLogger.delete(`删除记录: 数据库=${dbName}, 表=${tableName}, ID=${key}`)
    }

    static recordDeleted(success: boolean): void {
        if (success) {
            ColorLogger.success('删除记录成功')
        } else {
            ColorLogger.error('删除记录失败')
        }
    }

    /**
     * 添加操作
     */
    static addingRecord(dbName: string, tableName: string): void {
        ColorLogger.add(`添加记录: 数据库=${dbName}, 表=${tableName}`)
    }

    static recordAdded(id: any): void {
        ColorLogger.success(`添加记录成功: 新记录ID=${id}`)
    }

    /**
     * 更新操作
     */
    static updatingRecord(dbName: string, tableName: string, key: any): void {
        ColorLogger.update(`更新记录: 数据库=${dbName}, 表=${tableName}, ID=${key}`)
    }

    static recordUpdated(success: boolean): void {
        if (success) {
            ColorLogger.success('更新记录成功')
        } else {
            ColorLogger.error('更新记录失败')
        }
    }

    /**
     * 错误处理
     */
    static operationError(operation: string, error: any): void {
        ColorLogger.error(`数据库操作失败: ${operation}`, error)
    }
}

// 导出默认实例
export default ColorLogger