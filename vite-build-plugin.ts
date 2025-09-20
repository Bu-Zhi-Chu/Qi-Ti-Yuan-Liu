import type { Plugin } from 'vite'
import { build as viteBuild } from 'vite';
import { resolve } from 'path';
import { writeFileSync, existsSync, mkdirSync, rmSync, renameSync } from 'fs';
import { createHash } from 'crypto';
import formidable from 'formidable';
import { createServer, Server } from 'http';
import { parse } from 'url';
import { readFile } from 'fs/promises';
import { exec } from 'child_process';


interface BuildRequest {
  mode?: 'development' | 'production';
  liteData?: any;
  outputDir?: string;
}

interface BuildResponse {
  success: boolean;
  message: string;
  outputPath?: string;
  duration?: number;
}

// 全局变量，用于跟踪预览服务器实例
let previewServerInstance: Server | null = null;

export function viteBuildPlugin(): Plugin {
  return {
    name: 'vite-build-plugin',
    configureServer(server) {
      // 添加构建API端点 - 确保在路由处理之前注册
      server.middlewares.use('/api/build', async (req, res, next) => {
        if (req.method !== 'POST') {
          return next();
        }

        const contentType = req.headers['content-type'] || '';

        // multipart/form-data 解析路径（Blob 二进制链路）
        if (contentType.includes('multipart/form-data')) {
          const form = formidable({ multiples: false });
          form.parse(req, async (err: any, fields: any, files: any) => {
            try {
              if (err) throw err;

              console.log('[vite-build-plugin] /api/build multipart 接收字段', Object.keys(fields));

              const rawMode = (fields.mode as string) || 'production';
              const mode: 'development' | 'production' = rawMode === 'development' ? 'development' : 'production';
              const outputDir = (fields.outputDir as string) || 'dist-lite';
              const uploadFile = files.projectBlob as any;
              if (!uploadFile || !uploadFile.filepath) throw new Error('缺少 projectBlob 文件');

              const tempBlobPath = uploadFile.filepath; // 先记录临时路径，构建后再拷贝

              const buildRequest: BuildRequest = { mode, liteData: null, outputDir };
              const result = await performRealBuild(buildRequest);

              // 构建完成后，再写入 data/project-data.qqb，避免被 Vite 覆盖
              const dataDir = resolve(process.cwd(), outputDir, 'data');
              if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
              const targetPath = resolve(dataDir, 'project-data.qqb');

              // 直接保存上传的 Blob 数据，不进行任何处理
              const uploadedBuffer = await readFile(tempBlobPath);
              writeFileSync(targetPath, uploadedBuffer);
              console.log('[vite-build-plugin] 已直接保存上传的 Blob 数据 ->', targetPath);
              console.log('[vite-build-plugin] 构建后已写入上传Blob ->', targetPath);

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(result));
            } catch (error) {
              console.error('[vite-build-plugin] multipart 构建错误:', error);
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, message: error instanceof Error ? error.message : '构建失败' }));
            }
          });
          return; // 已处理
        }

        // JSON 流程已废弃，前端只上传 Blob
      });

      // 添加仅写入 Lite 数据的 API 端点，支持在构建完成后单独写入/覆盖 JSON
      server.middlewares.use('/api/write-lite', async (req, res, next) => {
        if (req.method !== 'POST') {
          return next();
        }

        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });

        req.on('end', () => {
          try {
            const { liteData, outputDir = 'dist-lite' } = JSON.parse(body);
            console.log('[vite-build-plugin] /api/write-lite 请求数据', { outputDir, hasLiteData: !!liteData });

            const outputPath = resolve(process.cwd(), outputDir);
            if (!existsSync(outputPath)) {
              mkdirSync(outputPath, { recursive: true });
            }

            // 创建data目录用于存储项目数据备份
            const dataDir = resolve(outputPath, 'data');
            if (!existsSync(dataDir)) {
              mkdirSync(dataDir, { recursive: true });
            }

            // 使用固定的英文文件名，忽略传入的fileName参数
            const liteDataPath = resolve(dataDir, 'project-data.qqb');
            let liteDataBuffer: Buffer;
            if (typeof liteData === 'string') {
              liteDataBuffer = Buffer.from(liteData);
            } else {
              liteDataBuffer = Buffer.from(JSON.stringify(liteData));
            }
            // 计算哈希并写入 revision 字段
            try {
              const jsonObj = JSON.parse(liteDataBuffer.toString('utf-8'));
              const hash = createHash('md5').update(liteDataBuffer).digest('hex');
              jsonObj.revision = hash;
              liteDataBuffer = Buffer.from(JSON.stringify(jsonObj, null, 2));
            } catch (_) {
              // 解析失败则保持原样
            }
            writeFileSync(liteDataPath, liteDataBuffer);

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true, path: liteDataPath }));
          } catch (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ ok: false, message: err instanceof Error ? err.message : '写入失败' }));
          }
        });
      });

      // 添加预览服务器API端点
      server.middlewares.use('/api/preview', async (req, res, next) => {
        if (req.method !== 'POST') {
          return next();
        }

        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });

        req.on('end', async () => {
          try {
            const { port = 4174, directory = 'dist-lite' } = JSON.parse(body);
            console.log('[vite-build-plugin] /api/preview 启动预览服务器', { port, directory });

            const staticDir = resolve(process.cwd(), directory);

            if (!existsSync(staticDir)) {
              throw new Error(`目录不存在: ${staticDir}`);
            }

            // 关闭之前的预览服务器（如果存在）
            if (previewServerInstance) {
              console.log('[vite-build-plugin] 关闭之前的预览服务器...');
              previewServerInstance.close(() => {
                console.log('[vite-build-plugin] 之前的预览服务器已关闭');
              });
            }

            // 启动新的预览服务器
            startNewPreviewServer(port, directory, res);

          } catch (error) {
            console.error('[vite-build-plugin] 预览服务器启动失败:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({
              success: false,
              message: error instanceof Error ? error.message : '启动失败',
              port: 4174
            }));
          }
        });
      });
    }
  };
}

// 启动新的预览服务器
function startNewPreviewServer(port: number, directory: string, res: any) {
  try {
    const staticDir = resolve(process.cwd(), directory);

    if (!existsSync(staticDir)) {
      throw new Error(`目录不存在: ${staticDir}`);
    }

    // 创建静态文件服务器
    const previewServer = createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url || '/', true);
        let pathname = parsedUrl.pathname || '/';

        // 默认访问index.html
        if (pathname === '/') {
          pathname = '/index.html';
        }

        // 构建文件路径
        const filePath = resolve(staticDir, `.${pathname}`);

        // 安全检查：确保文件在静态目录内
        if (!filePath.startsWith(staticDir)) {
          res.statusCode = 403;
          res.end('Forbidden');
          return;
        }

        // 读取文件
        const data = await readFile(filePath);

        // 设置正确的Content-Type
        const ext = pathname.split('.').pop()?.toLowerCase();
        const mimeTypes: Record<string, string> = {
          'html': 'text/html',
          'js': 'text/javascript',
          'css': 'text/css',
          'json': 'application/json',
          'png': 'image/png',
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'gif': 'image/gif',
          'svg': 'image/svg+xml',
          'ico': 'image/x-icon'
        };

        res.setHeader('Content-Type', mimeTypes[ext || ''] || 'text/plain');
        res.end(data);

      } catch (error) {
        if ((error as any).code === 'ENOENT') {
          res.statusCode = 404;
          res.end('File not found');
        } else {
          res.statusCode = 500;
          res.end('Internal server error');
        }
      }
    });

    // 启动服务器
    previewServer.listen(port, () => {
      console.log(`[vite-build-plugin] 预览服务器已启动: http://localhost:${port}`);

      // 自动打开浏览器，模拟vite preview --open的行为
      try {
        const url = `http://localhost:${port}`;

        // 根据操作系统选择合适的打开命令
        let command: string;
        switch (process.platform) {
          case 'win32':
            command = `start "" "${url}"`;
            break;
          case 'darwin':
            command = `open "${url}"`;
            break;
          case 'linux':
            command = `xdg-open "${url}"`;
            break;
          default:
            console.warn(`[vite-build-plugin] 不支持的平台: ${process.platform}`);
            return;
        }

        exec(command, (error: any) => {
          if (error) {
            console.warn(`[vite-build-plugin] 打开浏览器失败: ${error.message}`);
          } else {
            console.log(`[vite-build-plugin] 已自动打开浏览器: ${url}`);
          }
        });
      } catch (e) {
        console.warn('[vite-build-plugin] 自动打开浏览器功能不可用:', e);
      }

      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        success: true,
        port: port,
        url: `http://localhost:${port}`
      }));
    });

    previewServer.on('error', (error) => {
      console.error('[vite-build-plugin] 预览服务器错误:', error);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end(JSON.stringify({
          success: false,
          message: error instanceof Error ? error.message : '启动失败',
          port: port
        }));
      }
    });

    // 记录新的服务器实例
    previewServerInstance = previewServer;

  } catch (error) {
    console.error('[vite-build-plugin] 预览服务器启动失败:', error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.end(JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : '启动失败',
        port: port
      }));
    }
  }
}

async function performRealBuild(request: BuildRequest): Promise<BuildResponse> {
  const startTime = Date.now();

  try {
    const { liteData, outputDir = 'dist-lite' } = request;

    // 确保输出目录存在，先删除确保干净
    const outputPath = resolve(process.cwd(), outputDir);
    // 让 Vite 的 emptyOutDir 负责清理，避免 Windows 锁文件导致 ENOTEMPTY
    if (!existsSync(outputPath)) {
      mkdirSync(outputPath, { recursive: true });
    }

    // 避免历史残留文件与未来目录冲突，例如 dist-lite/fonts 被当作文件
    try {
      const fontsPath = resolve(outputPath, 'fonts');
      if (existsSync(fontsPath)) {
        try {
          rmSync(fontsPath, { recursive: true, force: true });
        } catch (e) {
          // 最后尝试重命名，避免锁定造成的阻塞
          try {
            const tempName = fontsPath + '_old_' + Date.now();
            renameSync(fontsPath, tempName);
          } catch (_) {
            /* 仍失败时忽略，让后续 emptyOutDir 继续 */
          }
        }
      }
    } catch (_) {
      /* 忽略删除失败 */
    }

    // 设置环境变量供 Vite 使用（例如在配置或插件中读取）
    console.log('[vite-build-plugin] performRealBuild 开始', {
      mode: request.mode,
      outputDir: request.outputDir,
      hasLiteData: !!liteData
    });
    process.env.LITE = 'true';

    // 调用 Vite JavaScript API 进行构建
    await viteBuild({
      configFile: 'vite.config.ts',
      build: {
        outDir: outputDir,
        emptyOutDir: true
      }
    });

    // 构建完成后再写入 lite 数据，避免被 emptyOutDir 清空
    if (liteData) {
      // 创建data目录用于存储项目数据备份
      const dataDir = resolve(outputPath, 'data');
      if (!existsSync(dataDir)) {
        mkdirSync(dataDir, { recursive: true });
      }

      // 使用固定的英文文件名，不包含项目ID - 统一使用 .qqb 格式
      const liteDataPath = resolve(dataDir, 'project-data.qqb');
      // 前端传入的是 Blob（Buffer），直接写入即可
      writeFileSync(liteDataPath, liteData);
    }

    const duration = Date.now() - startTime;
    console.log('[vite-build-plugin] performRealBuild 完成', { duration, outputDir: outputPath });

    return {
      success: true,
      message: '构建成功完成',
      outputPath,
      duration
    };

  } catch (error) {
    throw new Error(`构建过程出错: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}