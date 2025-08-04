/*
  DexieService 通用数据库工具
  ==================================
  1. databaseExists(dbName:string): Promise<boolean>
     - 检测指定名称的数据库是否存在。

  2. createDatabase(dbName:string, schema?: Record<string, string>): Promise<Dexie>
     - 创建一个新数据库并返回 Dexie 实例。
     - 可选传入 schema 定义表结构，例如：
         {
           projects: '++id, name, createdAt',
           components: '++id, pageId, type'
         }

  使用示例：
  ```ts
  import DexieService from '@/services/database/dexie-service'

  const exists = await DexieService.databaseExists('MyDB')
  if (!exists) {
    await DexieService.createDatabase('MyDB', {
      users: '++id, name, age'
    })
  }
  ```
*/

import Dexie from 'dexie'

export default class DexieService {
    /**
     * 检测指定名称的数据库是否存在
     * @param dbName 数据库名称
     */
    static async databaseExists(dbName: string): Promise<boolean> {
        // Dexie.exists 在 3.x+ 可用，返回 Promise<boolean>
        return Dexie.exists(dbName)
    }

    /**
     * 创建一个新的数据库
     * @param dbName 数据库名称
     * @param schema 数据库表结构定义，可选
     * @returns 已打开的 Dexie 实例
     */
    static async createDatabase(dbName: string, schema?: Record<string, string>): Promise<Dexie> {
        // 如果已经存在则直接打开返回
        if (await Dexie.exists(dbName)) {
            const existing = new Dexie(dbName)
            await existing.open()
            return existing
        }

        const db = new Dexie(dbName)

        // Dexie 要求至少定义一次 version().stores() 才能创建数据库
        // 默认项目表 schema（含项目ID、自增主键，名称、创建时间、模板编号、缩略图URL）
        const defaultProjectSchema = {
            projects: '++id, name, createdAt, templateId, thumbnailUrl'
        }

        // 合并用户自定义 schema 与默认项目表，用户自定义同名表优先
        const mergedSchema = { ...defaultProjectSchema, ...(schema || {}) }

        db.version(1).stores(mergedSchema)

        await db.open()
        return db
    }

    /**
     * 通用查询方法
     * @template T 返回数据的类型
     * @param dbName 数据库名称
     * @param tableName 要查询的表名
     * @param index 索引字段名，可选；若不传则返回整表数据
     * @param value 索引值，可选；当 index 存在且 value 为空时将返回空数组
     * @returns 满足条件的记录数组
     */
    static async queryRecords<T = any>(dbName: string, tableName: string, index?: string, value?: any): Promise<T[]> {
        // 数据库不存在直接返回空
        if (!(await Dexie.exists(dbName))) return []

        const db = new Dexie(dbName)
        await db.open()

        // 若未提供索引，直接返回整表数据
        const table = db.table(tableName) as Dexie.Table<T, any>
        if (!index) {
            return table.toArray()
        }

        // 若索引存在但未传值，返回空数组，避免全表扫描
        if (value === undefined || value === null) {
            return []
        }

        // 使用索引查询
        return (table as any).where(index).equals(value).toArray()
    }
}
