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
     * 判断数据库是否存在
     */
    static async databaseExists(dbName: string): Promise<boolean> {
        try {
            const dbs = await indexedDB.databases()
            return dbs.some((db) => db.name === dbName)
        } catch {
            return false
        }
    }

    /**
     * 创建数据库并插入默认模板
     */
    static async createDatabase(dbName: string): Promise<void> {
        const db = new Dexie(dbName)
        db.version(1).stores({
            templates: '++id, name, desc, cover, tag, thumbnailUrl',
            projects: 'id, name, templateId, data, createdAt, updatedAt, canvasState',
            doms: 'id, projectId, parentId, type, attributes, style, textContent',
        })


        await db.open()

        // 插入默认模板
        const count = await db.table('templates').count()
        if (count === 0) {
            const blankBlob = new Blob(
                [
                    `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150">
                        <rect width="200" height="150" fill="#f5f5f5"/>
                        <text x="100" y="75" text-anchor="middle" dominant-baseline="middle" font-family="Arial" font-size="14" fill="#999">空白项目</text>
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
                    thumbnailUrl: blankBlob
                }
            ])
        }
    }

    /**
     * 查询表数据
     */
    static async queryRecords<T>(dbName: string, tableName: string): Promise<T[]> {
        const db = new Dexie(dbName)
        await db.open()
        return db.table(tableName).toArray()
    }

    /**
     * 获取指定主键的记录
     */
    static async getRecord<T>(dbName: string, tableName: string, key: any): Promise<T | undefined> {
        const db = new Dexie(dbName)
        await db.open()
        return db.table(tableName).get(key)
    }

    /**
     * 删除表中指定主键记录
     * @param dbName   数据库名称
     * @param tableName 表名
     * @param key       主键值
     * @returns 删除是否成功
     */
    static async deleteRecord(dbName: string, tableName: string, key: any): Promise<boolean> {
        try {
            const db = new Dexie(dbName)
            await db.open()
            await db.table(tableName).delete(key)
            return true
        } catch (error) {
            console.error(`删除记录失败: ${tableName}.${key}`, error)
            return false
        }
    }

    static async addRecord<T>(dbName: string, tableName: string, data: T): Promise<any> {
        try {
            const db = new Dexie(dbName)
            await db.open()
            return await db.table(tableName).add(data as any)
        } catch (error) {
            console.error(`新增记录失败: ${tableName}`, error)
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
        try {
            const db = new Dexie(dbName)
            await db.open()
            await db.table(tableName).update(key, data as any)
            return true
        } catch (error) {
            console.error(`更新记录失败: ${tableName}.${key}`, error)
            return false
        }
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
