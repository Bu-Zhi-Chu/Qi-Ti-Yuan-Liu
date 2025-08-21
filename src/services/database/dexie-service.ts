/**
 * DexieService - IndexedDB 封装服务
 * 功能：
 *   - databaseExists: 判断指定数据库是否存在
 *   - createDatabase: 初始化数据库并插入默认模板
 *   - queryRecords:   查询指定表的数据
 */

import Dexie from 'dexie'

export default class DexieService {
    /**
     * 缓存数据库存在状态，避免频繁调用 indexedDB.databases()
     * key 为数据库名，value 为是否存在
     */
    private static dbExistenceCache: Map<string, boolean> = new Map()
    /**
     * 判断数据库是否存在
     */
    static async databaseExists(dbName: string): Promise<boolean> {
        // 优先使用缓存，避免频繁调用 indexedDB.databases()
        if (DexieService.dbExistenceCache.has(dbName)) {
            return DexieService.dbExistenceCache.get(dbName) as boolean
        }

        console.log(`【数据库交互】检查数据库是否存在: ${dbName}`)
        try {
            const dbs = await indexedDB.databases()
            const exists = dbs.some(db => db.name === dbName)
            // 写入缓存
            DexieService.dbExistenceCache.set(dbName, exists)
            console.log(`【数据库交互】数据库${dbName}存在状态: ${exists}`)
            return exists
        } catch (error) {
            console.error(`【数据库交互】检查数据库是否存在失败: ${dbName}`, error)
            return false
        }
    }

    /**
     * 创建数据库并插入默认模板
     */
    static async createDatabase(dbName: string): Promise<void> {
        console.log(`【数据库交互】开始创建数据库: ${dbName}`)
        const db = new Dexie(dbName)

        // 版本2：添加templates表的domStructure字段
        db.version(1).stores({
            templates: '++id, name, desc, cover, tag, thumbnailUrl, domStructure',
            projects: 'id, name, templateId, data, createdAt, updatedAt, canvasState, mode',
            doms: '[projectId+id], projectId, parentId, type, attributes, style, textContent'
        })

        await db.open()
        // 打开成功后写入缓存，避免后续重复检查
        DexieService.dbExistenceCache.set(dbName, true)
        console.log('【数据库交互】数据库创建成功')

        // 插入默认模板
        const count = await db.table('templates').count()
        if (count === 0) {
            // 空白模板
            const blankBlob = new Blob(
                [
                    `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150">
                        <rect width="200" height="150" fill="#f5f5f5"/>
                        <text x="100" y="75" text-anchor="middle" dominant-baseline="middle" font-family="Arial" font-size="14" fill="#999">空白项目</text>
                    </svg>`
                ],
                { type: 'image/svg+xml' }
            )

            // 登录页面模板
            const loginBlob = new Blob(
                [
                    `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150">
                        <rect width="200" height="150" fill="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"/>
                        <rect x="50" y="40" width="100" height="70" fill="#ffffff" rx="8"/>
                        <circle cx="100" cy="60" r="12" fill="#e5e7eb"/>
                        <rect x="70" y="80" width="60" height="8" fill="#e5e7eb" rx="4"/>
                        <rect x="70" y="95" width="60" height="8" fill="#e5e7eb" rx="4"/>
                        <text x="100" y="130" text-anchor="middle" font-family="Arial" font-size="12" fill="#ffffff">登录页</text>
                    </svg>`
                ],
                { type: 'image/svg+xml' }
            )

            // 仪表盘模板
            const dashboardBlob = new Blob(
                [
                    `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150">
                        <rect width="200" height="150" fill="#f8fafc"/>
                        <rect x="10" y="10" width="180" height="40" fill="#ffffff" stroke="#e2e8f0" rx="4"/>
                        <rect x="10" y="60" width="85" height="35" fill="#3b82f6" rx="4"/>
                        <rect x="105" y="60" width="85" height="35" fill="#10b981" rx="4"/>
                        <rect x="10" y="105" width="180" height="35" fill="#ffffff" stroke="#e2e8f0" rx="4"/>
                        <text x="100" y="145" text-anchor="middle" font-family="Arial" font-size="12" fill="#64748b">仪表盘</text>
                    </svg>`
                ],
                { type: 'image/svg+xml' }
            )

            await db.table('templates').bulkAdd([
                {
                    id: 'blank',
                    name: '空白项目',
                    desc: '从零开始创建',
                    cover: blankBlob,
                    tag: '默认',
                    thumbnailUrl: blankBlob,
                    domStructure: []
                },
                {
                    id: 'login',
                    name: '登录页面',
                    desc: '包含登录表单的基础页面',
                    cover: loginBlob,
                    tag: '页面',
                    thumbnailUrl: loginBlob,
                    domStructure: [
                        {
                            id: 'header',
                            componentType: 'SimpleBox',
                            styles: {
                                width: '100%',
                                height: '60px',
                                backgroundColor: '#ffffff',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            },
                            children: [
                                {
                                    id: 'logo',
                                    componentType: 'SimpleBox',
                                    styles: {
                                        width: '40px',
                                        height: '40px',
                                        backgroundColor: '#3b82f6',
                                        borderRadius: '50%'
                                    }
                                },
                                {
                                    id: 'title',
                                    componentType: 'SimpleBox',
                                    styles: {
                                        marginLeft: '12px',
                                        fontSize: '20px',
                                        fontWeight: 'bold',
                                        color: '#1f2937'
                                    },
                                    textContent: '欢迎登录'
                                }
                            ]
                        },
                        {
                            id: 'login-form',
                            componentType: 'SimpleBox',
                            styles: {
                                width: '400px',
                                margin: '100px auto',
                                padding: '40px',
                                backgroundColor: '#ffffff',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                            },
                            children: [
                                {
                                    id: 'form-title',
                                    componentType: 'SimpleBox',
                                    styles: {
                                        fontSize: '24px',
                                        fontWeight: 'bold',
                                        textAlign: 'center',
                                        marginBottom: '24px',
                                        color: '#1f2937'
                                    },
                                    textContent: '用户登录'
                                },
                                {
                                    id: 'username-input',
                                    componentType: 'SimpleBox',
                                    styles: {
                                        width: '100%',
                                        height: '40px',
                                        marginBottom: '16px',
                                        padding: '8px 12px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '4px',
                                        fontSize: '16px'
                                    },
                                    attributes: { placeholder: '请输入用户名' }
                                },
                                {
                                    id: 'password-input',
                                    componentType: 'SimpleBox',
                                    styles: {
                                        width: '100%',
                                        height: '40px',
                                        marginBottom: '24px',
                                        padding: '8px 12px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '4px',
                                        fontSize: '16px'
                                    },
                                    attributes: { placeholder: '请输入密码', type: 'password' }
                                },
                                {
                                    id: 'login-button',
                                    componentType: 'SimpleBox',
                                    styles: {
                                        width: '100%',
                                        height: '40px',
                                        backgroundColor: '#3b82f6',
                                        color: '#ffffff',
                                        borderRadius: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        fontSize: '16px',
                                        fontWeight: '500'
                                    },
                                    textContent: '登录'
                                }
                            ]
                        }
                    ]
                },
                {
                    id: 'dashboard',
                    name: '仪表盘',
                    desc: '数据展示和分析页面',
                    cover: dashboardBlob,
                    tag: '页面',
                    thumbnailUrl: dashboardBlob,
                    domStructure: [
                        {
                            id: 'sidebar',
                            componentType: 'SimpleBox',
                            styles: {
                                width: '250px',
                                height: '100vh',
                                backgroundColor: '#1f2937',
                                position: 'fixed',
                                left: '0',
                                top: '0',
                                padding: '20px',
                                color: '#ffffff'
                            },
                            children: [
                                {
                                    id: 'sidebar-title',
                                    componentType: 'SimpleBox',
                                    styles: {
                                        fontSize: '20px',
                                        fontWeight: 'bold',
                                        marginBottom: '30px'
                                    },
                                    textContent: '仪表盘'
                                },
                                {
                                    id: 'nav-item-1',
                                    componentType: 'SimpleBox',
                                    styles: {
                                        padding: '12px 16px',
                                        marginBottom: '8px',
                                        backgroundColor: '#374151',
                                        borderRadius: '6px',
                                        cursor: 'pointer'
                                    },
                                    textContent: '总览'
                                },
                                {
                                    id: 'nav-item-2',
                                    componentType: 'SimpleBox',
                                    styles: {
                                        padding: '12px 16px',
                                        marginBottom: '8px',
                                        backgroundColor: '#374151',
                                        borderRadius: '6px',
                                        cursor: 'pointer'
                                    },
                                    textContent: '数据分析'
                                }
                            ]
                        },
                        {
                            id: 'main-content',
                            componentType: 'SimpleBox',
                            styles: {
                                marginLeft: '250px',
                                padding: '20px',
                                backgroundColor: '#f3f4f6',
                                minHeight: '100vh'
                            },
                            children: [
                                {
                                    id: 'page-header',
                                    componentType: 'SimpleBox',
                                    styles: {
                                        fontSize: '28px',
                                        fontWeight: 'bold',
                                        marginBottom: '24px',
                                        color: '#1f2937'
                                    },
                                    textContent: '数据总览'
                                },
                                {
                                    id: 'stats-row',
                                    componentType: 'SimpleBox',
                                    styles: {
                                        display: 'flex',
                                        gap: '20px',
                                        marginBottom: '24px'
                                    },
                                    children: [
                                        {
                                            id: 'stat-card-1',
                                            componentType: 'SimpleBox',
                                            styles: {
                                                flex: '1',
                                                padding: '20px',
                                                backgroundColor: '#ffffff',
                                                borderRadius: '8px',
                                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                            },
                                            children: [
                                                {
                                                    id: 'stat-title-1',
                                                    componentType: 'SimpleBox',
                                                    styles: {
                                                        fontSize: '14px',
                                                        color: '#6b7280',
                                                        marginBottom: '4px'
                                                    },
                                                    textContent: '总用户数'
                                                },
                                                {
                                                    id: 'stat-value-1',
                                                    componentType: 'SimpleBox',
                                                    styles: {
                                                        fontSize: '24px',
                                                        fontWeight: 'bold',
                                                        color: '#1f2937'
                                                    },
                                                    textContent: '1,234'
                                                }
                                            ]
                                        },
                                        {
                                            id: 'stat-card-2',
                                            componentType: 'SimpleBox',
                                            styles: {
                                                flex: '1',
                                                padding: '20px',
                                                backgroundColor: '#ffffff',
                                                borderRadius: '8px',
                                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                            },
                                            children: [
                                                {
                                                    id: 'stat-title-2',
                                                    componentType: 'SimpleBox',
                                                    styles: {
                                                        fontSize: '14px',
                                                        color: '#6b7280',
                                                        marginBottom: '4px'
                                                    },
                                                    textContent: '今日订单'
                                                },
                                                {
                                                    id: 'stat-value-2',
                                                    componentType: 'SimpleBox',
                                                    styles: {
                                                        fontSize: '24px',
                                                        fontWeight: 'bold',
                                                        color: '#1f2937'
                                                    },
                                                    textContent: '56'
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ])
        }
    }

    /**
     * 查询表数据
     */
    static async queryRecords<T>(dbName: string, tableName: string): Promise<T[]> {
        console.log(`【数据库交互】查询数据: 数据库=${dbName}, 表=${tableName}`)
        const db = new Dexie(dbName)
        await db.open()
        const result = await db.table(tableName).toArray()
        console.log(`【数据库交互】查询结果: 共${result.length}条记录`)
        return result
    }

    /**
     * 获取指定主键的记录
     */
    static async getRecord<T>(dbName: string, tableName: string, key: any): Promise<T | undefined> {
        console.log(`【数据库交互】获取单条记录: 数据库=${dbName}, 表=${tableName}, ID=${key}`)
        const db = new Dexie(dbName)
        await db.open()
        const result = await db.table(tableName).get(key)
        console.log(`【数据库交互】获取记录结果: ${result ? '找到记录' : '未找到记录'}`)
        return result
    }

    /**
     * 删除表中指定主键记录
     * @param dbName   数据库名称
     * @param tableName 表名
     * @param key       主键值
     * @returns 删除是否成功
     */
    static async deleteRecord(dbName: string, tableName: string, key: any): Promise<boolean> {
        console.log(`【数据库交互】删除记录: 数据库=${dbName}, 表=${tableName}, ID=${key}`)
        try {
            const db = new Dexie(dbName)
            await db.open()
            await db.table(tableName).delete(key)
            console.log('【数据库交互】删除记录成功')
            return true
        } catch (error) {
            console.error(`【数据库交互】删除记录失败: ${tableName}.${key}`, error)
            return false
        }
    }

    static async addRecord<T>(dbName: string, tableName: string, data: T): Promise<any> {
        console.log(`【数据库交互】添加记录: 数据库=${dbName}, 表=${tableName}`)
        try {
            const db = new Dexie(dbName)
            // 配置Dexie以支持Blob存储
            db.version(2).stores({
                templates: '++id, name, desc, cover, tag, thumbnailUrl, domStructure',
                projects: 'id, name, templateId, data, createdAt, updatedAt, canvasState, mode',
                doms: '[projectId+id], projectId, parentId, type, attributes, style, textContent'
            })
            await db.open()
            const id = await db.table(tableName).add(data as any)
            console.log(`【数据库交互】添加记录成功: 新记录ID=${id}`)
            return id
        } catch (error) {
            console.error(`【数据库交互】新增记录失败: ${tableName}`, error)
            throw error
        }
    }

    /**
     * 更新表中指定主键记录
     * @param dbName   数据库名称
     * @param tableName 表名
     * @param key       主键值
     * @param data      要更新的数据
     * @returns 更新是否成功
     */
    static async updateRecord<T>(dbName: string, tableName: string, key: any, data: Partial<T>): Promise<boolean> {
        console.log(`【数据库交互】更新记录: 数据库=${dbName}, 表=${tableName}, ID=${key}`)
        try {
            const db = new Dexie(dbName)
            // 配置Dexie以支持Blob存储
            db.version(2).stores({
                templates: '++id, name, desc, cover, tag, thumbnailUrl, domStructure',
                projects: 'id, name, templateId, data, createdAt, updatedAt, canvasState, mode',
                doms: '[projectId+id], projectId, parentId, type, attributes, style, textContent'
            })
            await db.open()
            await db.table(tableName).update(key, data as any)
            console.log('【数据库交互】更新记录成功')
            return true
        } catch (error) {
            console.error(`【数据库交互】更新记录失败: ${tableName}.${key}`, error)
            return false
        }
    }

    /**
     * 颜色卡相关 API 已废弃（改用 doms 表统计颜色）
     * 兼容旧逻辑，保留方法签名但不做任何数据库操作
     */
    static async saveColorPalette(..._args: any[]): Promise<void> {
        console.warn('DexieService.saveColorPalette 已废弃');
    }

    static async queryColorPalette(..._args: any[]): Promise<any[]> {
        console.warn('DexieService.queryColorPalette 已废弃');
        return [];
    }

    static async clearColorPalette(..._args: any[]): Promise<void> {
        console.warn('DexieService.clearColorPalette 已废弃');
    }

    /**
     * 获取数据库实例
     */
    static async getDatabase(dbName: string): Promise<Dexie | null> {
        try {
            const db = new Dexie(dbName)
            await db.open()
            return db
        } catch (error) {
            console.error(`获取数据库实例失败: ${dbName}`, error)
            return null
        }
    }
}
