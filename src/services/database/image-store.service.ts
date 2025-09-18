import DexieService from './dexie-service'
import { DEFAULT_DB_NAME } from './database.config'

export interface ImageRecord {
    projectId: string
    hash: string
    blob: Blob
    name: string
    width: number
    height: number
    refCount: number
}

const TABLE = 'imageStore'

/**
 * 根据哈希获取图片记录
 */
export async function getImage(projectId: string, hash: string): Promise<ImageRecord | undefined> {
    const db = await DexieService.getDatabase(DEFAULT_DB_NAME)
    return db.table<ImageRecord>(TABLE).get({ projectId, hash })
}

/**
 * 新增或引用计数 +1（事务）
 */
export async function addOrIncrement(record: Omit<ImageRecord, 'refCount'>, increment = 1): Promise<void> {
    const db = await DexieService.getDatabase(DEFAULT_DB_NAME)
    await db.transaction('rw', db.table(TABLE), async () => {
        const existing = await db.table<ImageRecord>(TABLE).get({ projectId: record.projectId, hash: record.hash })
        if (existing) {
            await db.table(TABLE).update([record.projectId, record.hash], { refCount: existing.refCount + increment })
        } else {
            await db.table(TABLE).add({ ...record, refCount: increment })
        }
    })
}

/**
 * 引用计数 -1，若减至 0 则删除记录
 */
export async function decrementOrDelete(projectId: string, hash: string): Promise<void> {
    const db = await DexieService.getDatabase(DEFAULT_DB_NAME)
    await db.transaction('rw', db.table(TABLE), async () => {
        const existing = await db.table<ImageRecord>(TABLE).get({ projectId, hash })
        if (!existing) return
        const newCount = existing.refCount - 1
        if (newCount <= 0) {
            await db.table(TABLE).delete([projectId, hash])
        } else {
            await db.table(TABLE).update([projectId, hash], { refCount: newCount })
        }
    })
}