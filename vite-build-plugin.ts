import type { Plugin } from 'vite'
import { build as viteBuild } from 'vite';
import { resolve } from 'path';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { createServer } from 'http';
import { parse } from 'url';
import { readFile } from 'fs/promises';

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

export function viteBuildPlugin(): Plugin {
  return {
    name: 'vite-build-plugin',
    configureServer(server) {
      // 添加构建API端点 - 确保在路由处理之前注册
      server.middlewares.use('/api/build', async (req, res, next) => {
        if (req.method !== 'POST') {
          return next();
        }

        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });

        req.on('end', async () => {
          try {
            console.log('[vite-build-plugin] /api/build 收到构建请求');

            if (!body || body.trim() === '') {
              throw new Error('请求体为空');
            }

            const request: BuildRequest = JSON.parse(body);
            console.log('[vite-build-plugin] /api/build 请求参数解析成功', {
              mode: request.mode,
              hasLiteData: !!request.liteData,
              liteDataLength: request.liteData ? (typeof request.liteData === 'string' ? request.liteData.length : JSON.stringify(request.liteData).length) : 0,
              outputDir: request.outputDir
            });

            const result = await performRealBuild(request);
            console.log('[vite-build-plugin] /api/build 构建完成', {
              success: result.success,
              duration: result.duration,
              output: result.outputPath
            });

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(result));
          } catch (error) {
            console.error('[vite-build-plugin] /api/build 构建错误:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({
              success: false,
              message: error instanceof Error ? error.message : '构建失败',
              stack: error instanceof Error ? error.stack : undefined
            }));
          }
        });
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
            const { liteData, fileName = 'project-data.json', outputDir = 'dist-lite' } = JSON.parse(body);
            console.log('[vite-build-plugin] /api/write-lite 请求数据', { fileName, outputDir, hasLiteData: !!liteData });

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
            const liteDataPath = resolve(dataDir, 'project-data.json');
            const jsonContent = typeof liteData === 'string' ? liteData : JSON.stringify(liteData, null, 2);
            writeFileSync(liteDataPath, jsonContent);

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

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: true,
                port,
                url: `http://localhost:${port}`
              }));
            });

            // 处理服务器错误
            previewServer.on('error', (error) => {
              console.error('[vite-build-plugin] 预览服务器错误:', error);

              // 如果端口被占用，尝试使用下一个可用端口
              if ((error as any).code === 'EADDRINUSE') {
                const newPort = port + 1;
                previewServer.listen(newPort, () => {
                  console.log(`[vite-build-plugin] 端口${port}被占用，使用端口${newPort}`);

                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({
                    success: true,
                    port: newPort,
                    url: `http://localhost:${newPort}`
                  }));
                });
              } else {
                throw error;
              }
            });

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

async function performRealBuild(request: BuildRequest): Promise<BuildResponse> {
  const startTime = Date.now();

  try {
    const { liteData, outputDir = 'dist-lite' } = request;

    // 确保输出目录存在
    const outputPath = resolve(process.cwd(), outputDir);
    if (!existsSync(outputPath)) {
      mkdirSync(outputPath, { recursive: true });
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

      // 使用固定的英文文件名，不包含项目ID
      const liteDataPath = resolve(dataDir, 'project-data.json');
      const jsonContent = typeof liteData === 'string' ? liteData : JSON.stringify(liteData, null, 2);
      writeFileSync(liteDataPath, jsonContent);
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