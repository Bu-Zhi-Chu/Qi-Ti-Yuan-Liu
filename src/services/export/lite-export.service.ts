/**
 * 精简导出服务
 * 使用dexie-export-import导出指定项目的数据
 */

import { exportDB } from 'dexie-export-import';
import DexieService from '../database/dexie-service';

export interface LiteExportData {
    projects: any[];
    doms: any[];
    exportTime: string;
    projectId: string;
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
     * @param projectId 项目ID
     * @returns 导出的JSON数据
     */
    async exportLiteData(projectId: string): Promise<LiteExportData> {
        try {
            console.log(`开始导出项目 ${projectId} 的精简数据...`);

            // 获取项目数据
            const project = await DexieService.getRecord<any>('qi-qiao-ban', 'projects', projectId);
            if (!project) {
                throw new Error(`未找到项目: ${projectId}`);
            }

            // 用户要求的调试输出
            console.log('项目记录:', project);
            // 获取该项目的所有DOM数据
            const allDoms = await DexieService.queryRecords<any>('qi-qiao-ban', 'doms');

            const projectDoms = allDoms.filter((dom: any) => dom.projectId === projectId);
            // 用户要求的调试输出
            console.log('DOM 数量:', projectDoms.length);

            const exportData: LiteExportData = {
                projects: [project],
                doms: projectDoms,
                exportTime: new Date().toISOString(),
                projectId
            };

            console.log(`导出完成: ${exportData.projects.length} 个项目, ${exportData.doms.length} 个DOM节点`);
            return exportData;

        } catch (error) {
            console.error('导出精简数据失败:', error);
            throw error;
        }
    }

    /**
     * 使用dexie-export-import导出数据库中的指定表
     * @param tables 要导出的表名数组
     * @returns Blob格式的导出数据
     */
    async exportTablesWithDexie(tables: string[]): Promise<Blob> {
        try {
            // 创建新的Dexie实例用于导出
            const Dexie = (await import('dexie')).default;
            const db = new Dexie('qi-qiao-ban');

            // 定义表结构
            db.version(1).stores({
                templates: '++id, name, desc, cover, tag, thumbnailUrl, domStructure',
                projects: 'id, name, templateId, createdAt, updatedAt, canvasState, mode',
                doms: '[projectId+id], projectId, parentId, type, attributes, style, textContent'
            });

            await db.open();

            // 使用exportDB导出指定表
            const exportBlob = await exportDB(db, {
                prettyJson: true,
                filter: (tableName) => tables.includes(tableName)
            });

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
            const text = await blob.text();
            return JSON.parse(text);
        } catch (error) {
            console.error('Blob转JSON失败:', error);
            throw error;
        }
    }

    /**
     * 导出指定项目的精简数据为JSON格式
     * @param projectId 项目ID
     * @returns JSON字符串
     */
    async exportLiteJson(projectId: string): Promise<string> {
        try {
            const exportData = await this.exportLiteData(projectId);
            const jsonString = JSON.stringify(exportData, null, 2);
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