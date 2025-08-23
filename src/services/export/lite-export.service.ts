/**
 * 精简导出服务
 * 使用dexie-export-import导出指定项目的数据
 */

import { exportDB } from 'dexie-export-import';
import DexieService from '../database/dexie-service';

/**
 * 精简导出数据结构
 * 现在 exportLiteData 返回的是 Blob，不再使用此接口
 */
export interface LiteExportData {
    // 该接口已废弃，保留空结构以避免外部引用报错
}

export class LiteExportService {
    private static instance: LiteExportService;

    public static getInstance(): LiteExportService {
        if (!LiteExportService.instance) {
            LiteExportService.instance = new LiteExportService();
        }
        return LiteExportService.instance;
    }

    /**
     * 导出所有项目的精简数据
     * 使用 dexie-export-import 的 exportDB() 方法直接导出 Blob 数据
     * 包含完整的项目和 DOM 数据，包括 Blob 类型的图片数据
     * @param projectId 项目ID（保留参数，但不再用于筛选）
     * @returns 包含完整数据库数据的 Blob
     */
    async exportLiteData(projectId?: string): Promise<Blob> {
        try {
            console.log(`开始导出所有项目的精简数据（含Blob数据）...`);

            // 使用 dexie-export-import 直接导出完整数据库
            const exportBlob = await this.exportTablesWithDexie(['projects', 'doms'], projectId);

            console.log(`导出完成: Blob大小 ${exportBlob.size} 字节`);
            return exportBlob;

        } catch (error) {
            console.error('导出精简数据失败:', error);
            throw error;
        }
    }

    /**
     * 使用dexie-export-import导出数据库中的指定表
     * 支持完整导出，包括Blob类型的图片数据
     * @param tables 要导出的表名数组
     * @param projectId 项目ID，用于筛选特定项目的数据（仅用于日志记录）
     * @returns Blob格式的导出数据（包含完整数据，包括Blob字段）
     */
    async exportTablesWithDexie(tables: string[], projectId?: string): Promise<Blob> {
        try {
            // 获取现有的数据库实例
            const db = await DexieService.getDatabase('qi-qiao-ban');
            if (!db) {
                throw new Error('无法获取数据库实例');
            }

            console.log(`正在使用dexie-export-import导出表: ${tables.join(', ')}, 项目ID: ${projectId || '全部'}`);

            // 在导出前检查数据库中的实际数据量
            for (const tableName of tables) {
                try {
                    const count = await db.table(tableName).count();
                    console.log(`表 ${tableName}: ${count} 条记录`);
                } catch (tableError) {
                    console.error(`检查表 ${tableName} 失败:`, tableError);
                }
            }

            // 使用exportDB导出完整数据库，包括Blob数据
            // 移除filter参数，确保导出所有数据
            const exportBlob = await exportDB(db, {
                prettyJson: true
            });

            console.log(`导出完成，Blob大小: ${exportBlob.size} 字节`);
            return exportBlob;
        } catch (error) {
            console.error('使用dexie-export-import导出失败:', error);
            throw error;
        }
    }

    /**
     * 将Blob转换为JSON对象
     * @param blob Blob数据
     * @returns JSON对象
     */
    async blobToJson(blob: Blob): Promise<any> {
        try {
            const jsonString = await blob.text();
            return JSON.parse(jsonString);
        } catch (error) {
            console.error('Blob转JSON失败:', error);
            throw error;
        }
    }

    /**
     * 使用dexie-export-import从JSON导入数据到IndexedDB
     * 支持包含Blob数据（Base64字符串）的导入
     * @param jsonData JSON字符串或对象
     * @returns 导入成功提示
     */
    async importFromJson(jsonData: string | object): Promise<string> {
        try {
            const { importDB } = await import('dexie-export-import');

            let jsonString: string;
            if (typeof jsonData === 'object') {
                jsonString = JSON.stringify(jsonData);
            } else {
                jsonString = jsonData;
            }

            console.log('开始导入数据...');

            // 创建包含JSON数据的Blob
            const blob = new Blob([jsonString], { type: 'application/json' });

            // 使用importDB导入数据
            await importDB(blob);

            console.log('数据导入成功');
            return '数据导入成功';
        } catch (error) {
            console.error('导入数据失败:', error);
            throw error;
        }
    }

    /**
     * 从文件导入数据
     * @param file 用户选择的文件
     * @returns 导入结果
     */
    async importFromFile(file: File): Promise<string> {
        try {
            console.log(`开始从文件导入: ${file.name}`);

            // 读取文件内容为字符串
            const text = await file.text();

            // 使用导入方法
            return await this.importFromJson(text);
        } catch (error) {
            console.error('从文件导入失败:', error);
            throw error;
        }
    }
    /**
     * 导出所有项目的精简数据为JSON格式
     * @param projectId 项目ID（保留参数，但不再用于筛选）
     * @returns JSON字符串
     */
    async exportLiteJson(projectId?: string): Promise<string> {
        try {
            const exportBlob = await this.exportLiteData(projectId);
            const jsonString = await exportBlob.text();
            console.log('exportLiteJson length:', jsonString.length);
            return jsonString;
        } catch (error) {
            console.error('导出JSON失败:', error);
            throw error;
        }
    }

    /**
     * 下载导出的JSON文件
     * @param jsonData JSON字符串
     * @param filename 文件名
     */
    downloadJson(jsonData: string, filename: string = 'lite-export.json'): void {
        try {
            const blob = new Blob([jsonData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            URL.revokeObjectURL(url);
            console.log(`JSON文件已下载: ${filename}`);
        } catch (error) {
            console.error('下载JSON文件失败:', error);
            throw error;
        }
    }
}

// 导出单例实例
export const liteExportService = LiteExportService.getInstance();