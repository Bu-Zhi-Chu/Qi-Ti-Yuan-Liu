/**
 * 构建和预览服务
 * 提供项目构建和预览功能
 */




export interface BuildOptions {
  // 精简模式专用，保留基础构建配置
  mode?: 'production' | 'development';
  sourcemap?: boolean;
  minify?: boolean;
  // 精简模式数据，兼容旧JSON字符串和新Blob格式
  liteData?: {
    projectBlob?: Blob; // 新增：二进制Blob
    projectData?: string; // 旧：JSON字符串
    filename?: string;
  };
}

export interface BuildResult {
  success: boolean;
  message: string;
  outputPath?: string;
  duration?: number;
  errors?: string[];
}

export interface PreviewResult {
  success: boolean;
  url: string;
  port: number;
}

/**
 * 构建服务类
 * 处理项目的构建和预览操作
 */
export class BuildService {
  private static instance: BuildService;

  public static getInstance(): BuildService {
    if (!BuildService.instance) {
      BuildService.instance = new BuildService();
    }
    return BuildService.instance;
  }

  /**
   * 执行项目构建
   */
  async buildProject(options: BuildOptions = {}): Promise<BuildResult> {
    const startTime = Date.now();

    try {
      console.log('开始构建项目...', options);

      // 执行真实的Vite构建
      await this.performRealBuild(options);


      const duration = Date.now() - startTime;
      const outputPath = 'dist-lite';
      const message = '精简构建成功完成';

      return {
        success: true,
        message,
        outputPath,
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;

      return {
        success: false,
        message: '构建失败: ' + (error as Error).message,
        duration,
        errors: [(error as Error).message]
      };
    }
  }

  /**
   * 启动预览服务器
   */
  async startPreview(port?: number): Promise<PreviewResult> {
    const defaultPort = 4174;
    const actualPort = port || defaultPort;

    try {
      console.log(`启动预览服务器，端口: ${actualPort} (精简模式)`);

      // 调用后端API启动真实的预览服务器
      const response = await fetch('/api/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          port: actualPort,
          directory: 'dist-lite'
        })
      });

      if (!response.ok) {
        throw new Error(`预览服务器启动失败: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || '预览服务器启动失败');
      }

      const url = `http://localhost:${result.port || actualPort}`;
      console.log(`✅ 预览服务器已启动: ${url}`);

      return {
        success: true,
        url,
        port: result.port || actualPort
      };

    } catch (error) {
      console.error('启动预览服务器失败:', error);
      return {
        success: false,
        url: '',
        port: actualPort
      };
    }
  }

  /**
   * 构建并预览
   * 一键完成构建和预览
   */
  async buildAndPreview(options: BuildOptions = {}): Promise<{
    build: BuildResult;
    preview: PreviewResult;
  }> {
    console.log('🚀 开始构建并启动4174端口预览...')

    const buildResult = await this.buildProject(options);

    if (!buildResult.success) {
      throw new Error(buildResult.message);
    }

    const previewResult = await this.startPreview();

    // 确保使用4174端口并准备预览数据
    if (previewResult.success) {
      console.log('✅ 构建完成，4174端口预览服务器已启动:', previewResult.url)
      // 返回预览URL供前端处理，不再自动打开浏览器
      // 这样可以避免Node.js环境下的弹窗拦截问题
    }

    return {
      build: buildResult,
      preview: previewResult
    };
  }

  /**
   * 执行真实的Vite构建
   */
  private async performRealBuild(options: BuildOptions): Promise<void> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔧 触发真实的Vite构建... (尝试 ${attempt}/${maxRetries})`);

        let requestBody: BodyInit;
        let headers: Record<string, string> | undefined;

        // 使用FormData发送Blob，保持二进制链路
        const projectBlob = options.liteData?.projectBlob;
        if (!projectBlob) {
          throw new Error('缺少项目数据 Blob');
        }
        const fd = new FormData();
        fd.append('mode', options.mode || 'production');
        fd.append('outputDir', 'dist-lite');
        fd.append('projectBlob', projectBlob, options.liteData?.filename || 'project-data.qqb');
        requestBody = fd;
        headers = undefined; // 让浏览器自动设置 multipart 边界
        console.log('准备发送构建请求，使用multipart/form-data，Blob大小:', projectBlob.size);

        // 将超时时间延长到120秒，避免大项目构建超时
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000);

        // 调用后端API执行构建
        const response = await fetch('/api/build', {
          method: 'POST',
          headers,
          body: requestBody,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`构建请求失败: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.message);
        }

        console.log(`✅ 构建完成，耗时: ${result.duration}ms`);
        console.log(`📁 输出目录: ${result.outputPath}`);
        return; // 成功完成

      } catch (error) {
        lastError = error as Error;
        console.error(`Vite构建失败 (尝试 ${attempt}/${maxRetries}):`, error);

        // 如果不是最后一次尝试，等待2秒后重试
        if (attempt < maxRetries) {
          console.log(`等待2秒后重试...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    // 所有重试都失败
    throw lastError;
  }
}

// 导出单例实例
export const buildService = BuildService.getInstance();