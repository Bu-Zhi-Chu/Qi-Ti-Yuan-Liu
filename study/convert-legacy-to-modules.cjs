/**
 * 旧版精简导出 QTYL 转换脚本
 *
 * 功能：
 * - 读取 study/project-data.qtyl（旧版本导出的精简数据）
 * - 基于当前固定的数据库配置补齐 modules 表、doms.moduleId、templates 表等字段
 * - 对齐 databaseName / databaseVersion 为当前项目使用的值
 * - 输出新的 study/project-data-converted.qtyl，供当前版本直接导入使用
 *
 * 使用方法（在仓库根目录执行）：
 * 1. 将旧版导出的 QTYL 文件复制为：study/project-data.qtyl
 * 2. 运行：node .\\study\\convert-legacy-to-modules.cjs
 * 3. 使用生成的 study/project-data-converted.qtyl 在当前应用中导入/替换
 *
 * 注意：
 * - 本脚本假定旧数据结构与当前仓库中的 study/project-data-legacy.json 相同
 * - 如若将来数据结构再发生大变动，需要同步调整本脚本的表字段映射
 */
const fs = require('fs')
const path = require('path')

const CURRENT_DB_NAME = 'qi-ti-yuan-liu'
const CURRENT_DB_VERSION = 1

function decodeQtyl(text) {
    const magic = 'QQB1'
    const shift = 0x40
    if (!text.startsWith(magic)) {
        throw new Error('Invalid magic header')
    }
    const shifted = text.slice(magic.length)
    const base64 = Array.from(shifted)
        .map((c) => String.fromCharCode((c.charCodeAt(0) - shift + 256) & 0xff))
        .join('')
    const buffer = Buffer.from(base64, 'base64')
    const jsonText = buffer.toString('utf8')
    return JSON.parse(jsonText)
}

function encodeQtyl(jsonString) {
    const magic = 'QQB1'
    const shift = 0x40
    const base64 = Buffer.from(jsonString, 'utf8').toString('base64')
    const shifted = Array.from(base64)
        .map((c) => String.fromCharCode((c.charCodeAt(0) + shift) & 0xff))
        .join('')
    return magic + shifted
}

function convertLegacyToModules(legacyJson) {
    if (!legacyJson || !legacyJson.data) {
        throw new Error('Invalid legacy JSON structure')
    }
    const legacy = JSON.parse(JSON.stringify(legacyJson))
    const root = legacy.data

    root.databaseName = CURRENT_DB_NAME
    root.databaseVersion = CURRENT_DB_VERSION

    const tablesMeta = Array.isArray(root.tables) ? root.tables : []
    const tablesData = Array.isArray(root.data) ? root.data : []

    function findMeta(name, sourceRoot) {
        if (!sourceRoot || !Array.isArray(sourceRoot.tables)) return null
        return sourceRoot.tables.find((t) => t.name === name) || null
    }

    function ensureMeta(name, templateMeta, fallbackSchema) {
        let meta = tablesMeta.find((t) => t.name === name)
        if (!meta) {
            if (templateMeta) {
                meta = { ...templateMeta }
            } else {
                meta = {
                    name,
                    schema: fallbackSchema || '',
                    rowCount: 0
                }
            }
            tablesMeta.push(meta)
        }
        return meta
    }

    function ensureData(name) {
        let table = tablesData.find((t) => t.tableName === name)
        if (!table) {
            table = { tableName: name, inbound: true, rows: [] }
            tablesData.push(table)
        }
        if (!Array.isArray(table.rows)) table.rows = []
        return table
    }

    const domsMeta = ensureMeta('doms', null, '[projectId+id],moduleId,attributes,parentId,projectId,style')
    const modulesMeta = ensureMeta('modules', null, 'id,projectId,name,templateId,designWidth,designHeight,createdAt,updatedAt,exportTime')
    const templatesMeta = ensureMeta('templates', null, '++id,cover,desc,domStructure,name,tag,thumbnailUrl')
    const configMeta = ensureMeta('config', null, '++id,authCache,moduleId,nextVerificationAt,perfMonitor,showLogs')

    ensureData('templates')

    const projectsTable = tablesData.find((t) => t.tableName === 'projects')
    if (!projectsTable || !Array.isArray(projectsTable.rows) || projectsTable.rows.length === 0) {
        throw new Error('Legacy JSON has no projects table rows')
    }
    const projectRow = projectsTable.rows[0]
    const projectId = projectRow.id

    const designWidth = typeof projectRow.designWidth === 'number' ? projectRow.designWidth : 1920
    const designHeight = typeof projectRow.designHeight === 'number' ? projectRow.designHeight : 1000
    const nowIso = new Date().toISOString()

    const moduleId = String(projectId)

    const modulesTable = ensureData('modules')
    const moduleRow = {
        id: moduleId,
        projectId: projectId,
        name: projectRow.name || '默认模块',
        templateId: projectRow.templateId || 'blank',
        designWidth,
        designHeight,
        createdAt: projectRow.createdAt || Date.now(),
        updatedAt: projectRow.updatedAt || projectRow.createdAt || Date.now(),
        exportTime: projectRow.exportTime || nowIso
    }
    modulesTable.rows = [moduleRow]

    const domsTable = ensureData('doms')
    domsTable.rows.forEach((row) => {
        if (!row.projectId) {
            row.projectId = projectId
        }
        row.moduleId = moduleId
    })

    tablesMeta.forEach((meta) => {
        const dataEntry = tablesData.find((t) => t.tableName === meta.name)
        if (dataEntry && Array.isArray(dataEntry.rows)) {
            meta.rowCount = dataEntry.rows.length
        }
    })

    return legacy
}

function main() {
    const projectRoot = path.resolve(__dirname, '..')
    const legacyPath = path.join(projectRoot, 'study', 'project-data.qtyl')
    const outPath = path.join(projectRoot, 'study', 'project-data-converted.qtyl')

    console.log('Decoding legacy (old) file:', legacyPath)
    const legacyText = fs.readFileSync(legacyPath, 'utf8')
    const legacyJson = decodeQtyl(legacyText)

    console.log('Converting legacy JSON to modules-enabled format...')
    const convertedJson = convertLegacyToModules(legacyJson)

    const jsonString = JSON.stringify(convertedJson, null, 2)
    console.log('Converted JSON size:', jsonString.length, 'bytes')

    const encoded = encodeQtyl(jsonString)
    fs.writeFileSync(outPath, encoded, 'utf8')
    console.log('Written converted file to:', outPath)
}

main()
