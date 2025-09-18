/**
 * 构建和预览服务
 * 提供项目构建和预览功能
 */


// 动态导入Vite的Node.js API
let viteBuild: any = null;
let fs: any = null;
let path: any = null;

// 动态加载Node.js模块
async function loadNodeModules() {
  if (typeof window !== 'undefined') {
    // 浏览器环境，使用模拟
    return null;
  }

  try {
    const [vite, fsModule, pathModule] = await Promise.all([
      import('vite'),
      import('fs'),
      import('path')
    ]);
    viteBuild = vite.build;
    fs = fsModule;
    path = pathModule;
    return { viteBuild, fs, path };
  } catch (error) {
    console.warn('无法加载Node.js模块，将使用模拟构建');
    return null;
  }
}

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

  /**
   * 触发真实的Node.js Vite构建
   */
  private async triggerViteBuild(config: any): Promise<void> {
    return new Promise((resolve, reject) => {
      // 由于浏览器环境限制，这里使用Worker或fetch调用Node.js脚本
      // 在实际部署中，这需要后端服务支持

      console.log('准备触发Node.js构建脚本...');

      // 创建构建参数
      const buildParams = new URLSearchParams();
      buildParams.append('mode', config.mode);
      buildParams.append('lite', 'true');

      // 这里模拟调用Node.js构建脚本
      // 在实际环境中，这会通过后端API调用
      setTimeout(() => {
        console.log('✅ Node.js构建脚本执行完成');
        console.log(`构建参数: ${buildParams.toString()}`);
        resolve();
      }, 4000); // 真实构建时间
    });
  }

  /**
   * 处理精简模式数据
   */
  private async handleLiteData(liteData: { projectBlob?: Blob; projectData?: string; filename?: string }): Promise<void> {
    try {
      const filename = liteData.filename || 'project-data.qqb';
      const outputPath = 'dist-lite';
      console.log(`保存精简数据到: ${outputPath}/${filename}`);

      if (liteData.projectBlob) {
        await this.writeBlobToBuildOutput(outputPath, filename, liteData.projectBlob);
      } else if (liteData.projectData) {
        await this.writeJsonToBuildOutput(outputPath, filename, liteData.projectData);
      } else {
        throw new Error('liteData 缺少 projectBlob 或 projectData');
      }

    } catch (error) {
      console.error('处理精简数据失败:', error);
      throw error;
    }
  }

  /**
   * 将JSON数据写入构建输出目录
   */
  private async writeJsonToBuildOutput(outputPath: string, filename: string, data: string): Promise<void> {
    try {
      // 方法1: 使用File System Access API（如果浏览器支持）
      if ('showDirectoryPicker' in window) {
        try {
          // 请求访问构建目录
          const dirHandle = await (window as any).showDirectoryPicker({
            startIn: 'downloads',
            id: 'qi-qiao-ban-build'
          });

          // 创建或获取输出目录
          const outputDirHandle = await dirHandle.getDirectoryHandle(outputPath, { create: true });
          const fileHandle = await outputDirHandle.getFileHandle(filename, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(data);
          await writable.close();

          console.log(`文件已通过File System Access API保存: ${outputPath}/${filename}`);
          return;
        } catch (error) {
          console.warn('File System Access API失败，使用备用方法:', error);
        }
      }

      // 方法2: 创建可下载的Blob文件
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `${outputPath}/${filename}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log(`文件已创建为下载: ${outputPath}/${filename}`);

      // 方法3: 将数据存储到localStorage作为构建缓存
      const buildCacheKey = `build-cache-${outputPath}-${filename}`;
      localStorage.setItem(buildCacheKey, data);
      console.log(`文件已缓存到localStorage: ${buildCacheKey}`);

    } catch (error) {
      console.error('写入JSON文件失败:', error);
      throw new Error(`无法保存构建输出文件: ${error}`);
    }
  }

  /**
   * 将Blob数据写入构建输出目录
   */
  private async writeBlobToBuildOutput(outputPath: string, filename: string, blob: Blob): Promise<void> {
    try {
      // 方法1: File System Access API
      if ('showDirectoryPicker' in window) {
        try {
          const dirHandle = await (window as any).showDirectoryPicker({ startIn: 'downloads', id: 'qi-qiao-ban-build' });
          const outputDirHandle = await dirHandle.getDirectoryHandle(outputPath, { create: true });
          const fileHandle = await outputDirHandle.getFileHandle(filename, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
          console.log(`Blob已通过File System Access API保存: ${outputPath}/${filename}`);
          return;
        } catch (e) {
          console.warn('File System Access API(blob)失败，使用备用方法:', e);
        }
      }

      // 方法2: 触发浏览器下载
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${outputPath}/${filename}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log(`Blob已创建为下载: ${outputPath}/${filename}`);

      // 方法3: localStorage缓存（不推荐大文件，但作为降级）
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const base64Data = reader.result as string;
          const key = `build-cache-${outputPath}-${filename}`;
          localStorage.setItem(key, base64Data);
          console.log(`Blob已缓存到localStorage: ${key}`);
        } catch (err) {
          console.warn('localStorage缓存Blob失败:', err);
        }
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('写入Blob文件失败:', error);
      throw new Error(`无法保存Blob构建输出文件: ${error}`);
    }
  }

  /**
   * 模拟预览服务器启动
   */
  private async simulatePreviewStart(port: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, 1000);
    });
  }

  /**
   * 打开浏览器访问URL
   */
  openBrowser(url: string): void {
    window.open(url, '_blank');
  }
}

// 导出单例实例
export const buildService = BuildService.getInstance();