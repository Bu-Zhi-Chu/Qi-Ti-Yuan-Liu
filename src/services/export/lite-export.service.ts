/**
 * 精简导出服务
 * 使用dexie-export-import导出指定项目的数据
 */

import { exportDB } from 'dexie-export-import';
import DexieService from '../database/dexie-service'
import { DEFAULT_DB_NAME } from '../../config/config';

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
     * 导出指定项目的精简数据
     * 使用 dexie-export-import 的 exportDB() 方法直接导出 Blob 数据
     * 包含指定项目的完整数据，包括 Blob 类型的图片数据
     * 自动排除模板表（templates），只包含项目和 DOM 数据
     * @param projectId 项目ID，用于筛选特定项目的数据（必需）
     * @returns 包含指定项目完整数据库数据的 Blob（不包含模板数据）
     */
    async exportLiteData(projectId: string): Promise<Blob> {
        try {
            console.log(`开始导出项目 ${projectId} 的精简数据（含Blob数据）...`);

            const now = new Date().toISOString();

            // 在导出前更新项目的 exportTime，方便后续导入时比较时间戳
            await DexieService.updateRecord(
                DEFAULT_DB_NAME,
                'projects',
                projectId,
                { exportTime: now }
            );

            // 同步更新模块表中的导出时间
            try {
                const db = await DexieService.getDatabase(DEFAULT_DB_NAME);
                await db.table('modules').where('projectId').equals(projectId).modify((m: any) => {
                    m.exportTime = now;
                });
            } catch (e) {
                console.warn('更新模块导出时间失败:', e);
            }

            // 使用 dexie-export-import 直接导出完整数据库（包含模块表）
            const exportBlob = await this.exportTablesWithDexie(['projects', 'modules', 'doms', 'imageStore'], projectId);

            // 将JSON文本编码后再生成Blob
            const jsonText = await exportBlob.text();
            const encodedText = this.encodeData(jsonText);
            const finalBlob = new Blob([encodedText], { type: 'application/octet-stream' });

            console.log(`导出完成: Blob大小 ${finalBlob.size} 字节 (已编码)`);
            return finalBlob;

        } catch (error) {
            console.error('导出精简数据失败:', error);
            throw error;
        }
    }

    /**
     * 使用dexie-export-import导出数据库中的指定表
     * 支持按项目ID过滤数据，自动排除模板表（templates）
     * 包括Blob类型的图片数据
     * @param tables 要导出的表名数组
     * @param projectId 项目ID，用于筛选特定项目的数据（必需）
     * @returns Blob格式的导出数据（包含过滤后的数据，包括Blob字段，不包含模板数据）
     */
    async exportTablesWithDexie(tables: string[], projectId: string): Promise<Blob> {
        try {
            // 获取现有的数据库实例
            const db = await DexieService.getDatabase(DEFAULT_DB_NAME);
            if (!db) {
                throw new Error('无法获取数据库实例');
            }

            console.log(`正在使用dexie-export-import导出项目 ${projectId} 的表: ${tables.join(', ')}`);

            // 在导出前检查数据库中的实际数据量
            for (const tableName of tables) {
                try {
                    const count = await db.table(tableName).count();
                    console.log(`表 ${tableName}: ${count} 条记录`);
                } catch (tableError) {
                    console.error(`检查表 ${tableName} 失败:`, tableError);
                }
            }

            // 使用exportDB导出数据，支持按项目ID过滤和排除模板表
            const exportBlob = await exportDB(db, {
                prettyJson: true,
                filter: (table, value, key) => {
                    // 排除模板表（templates表不需要导出）
                    if (table === 'templates') {
                        return false;
                    }

                    // 确保只导出指定的表
                    if (!tables.includes(table)) {
                        return false;
                    }

                    // 按项目ID过滤数据
                    switch (table) {
                        case 'projects':
                            // projects表按id过滤
                            return value?.id === projectId;
                        case 'modules':
                            // modules表按projectId过滤
                            return value?.projectId === projectId;
                        case 'doms':
                            // doms表按projectId过滤
                            return value?.projectId === projectId;
                        case 'imageStore':
                            // imageStore 表按 projectId 过滤
                            return value?.projectId === projectId;
                        default:
                            // 其他表默认包含
                            return true;
                    }
                }
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
     * 导出指定项目的精简数据为JSON格式
     * @param projectId 项目ID，用于筛选特定项目的数据（必需）
     * @returns JSON字符串
     */
    async exportLiteJson(projectId: string): Promise<string> {
        try {
            const exportBlob = await this.exportLiteData(projectId);
            const jsonString = await exportBlob.text();
            console.log(`项目 ${projectId} 导出JSON长度:`, jsonString.length);
            return jsonString;
        } catch (error) {
            console.error(`项目 ${projectId} 导出JSON失败:`, error);
            throw error;
        }
    }

    /**
     * 下载导出的JSON文件
     * @param jsonData JSON字符串
     * @param filename 文件名
     */
    private encodeData(jsonString: string): string {

        const magic = 'QQB1';
        const shift = 0x40;
        const base64 = btoa(unescape(encodeURIComponent(jsonString)));
        const shifted = Array.from(base64)
            .map((c) => String.fromCharCode((c.charCodeAt(0) + shift) & 0xff))
            .join('');
        return magic + shifted;
    }
    private decodeData(data: string): string {

        const magic = 'QQB1';
        const shift = 0x40;
        if (data.startsWith(magic)) {
            const shifted = data.slice(magic.length);
            const base64 = Array.from(shifted)
                .map((c) => String.fromCharCode((c.charCodeAt(0) - shift + 256) & 0xff))
                .join('');
            return decodeURIComponent(escape(atob(base64)));
        }
        return data;
    }

    downloadJson(jsonData: string, filename: string = 'lite-export.qtyl'): void {
        try {
            const encoded = this.encodeData(jsonData);
            const blob = new Blob([encoded], { type: 'application/octet-stream' });
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
