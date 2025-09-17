/**
 * 浏览器指纹服务
 * 用于收集浏览器的唯一标识信息，生成设备指纹
 *
 * 功能特性：
 * - 收集浏览器基本信息（用户代理、语言、时区等）
 * - 收集屏幕和显示器信息
 * - 收集硬件信息（CPU、内存、GPU等）
 * - 收集字体信息
 * - 收集插件信息
 * - 生成唯一指纹哈希
 */

export interface BrowserFingerprintData {
    // 基本浏览器信息
    userAgent: string;
    language: string;
    languages: string[];
    platform: string;
    cookieEnabled: boolean;
    doNotTrack: string | null;
    timezone: string;

    // 屏幕信息
    screenResolution: string;
    availableScreenResolution: string;
    colorDepth: number;
    pixelRatio: number;

    // 硬件信息
    hardwareConcurrency: number;
    deviceMemory?: number;

    // 渲染信息
    canvas: string;
    webgl: string;
    webglVendor: string;
    webglRenderer: string;

    // 字体信息
    fonts: string[];

    // 插件信息
    plugins: string[];

    // 其他特征
    touchSupport: boolean;
    audioContext: string;
    localStorage: boolean;
    sessionStorage: boolean;
    indexedDB: boolean;

    // 生成的指纹哈希
    fingerprint: string;
}

/**
 * 浏览器指纹服务类
 */
export class BrowserFingerprintService {
    private static instance: BrowserFingerprintService;
    private fingerprintData: BrowserFingerprintData | null = null;

    private constructor() { }

    /**
     * 获取服务实例（单例模式）
     */
    public static getInstance(): BrowserFingerprintService {
        if (!BrowserFingerprintService.instance) {
            BrowserFingerprintService.instance = new BrowserFingerprintService();
        }
        return BrowserFingerprintService.instance;
    }

    /**
     * 收集浏览器指纹信息
     */
    public async collectFingerprint(): Promise<BrowserFingerprintData> {
        if (this.fingerprintData) {
            return this.fingerprintData;
        }

        const data: Partial<BrowserFingerprintData> = {};

        // 收集基本浏览器信息
        data.userAgent = navigator.userAgent;
        data.language = navigator.language;
        data.languages = Array.from(navigator.languages);
        data.platform = navigator.platform;
        data.cookieEnabled = navigator.cookieEnabled;
        data.doNotTrack = navigator.doNotTrack;
        data.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        // 收集屏幕信息
        data.screenResolution = `${screen.width}x${screen.height}`;
        data.availableScreenResolution = `${screen.availWidth}x${screen.availHeight}`;
        data.colorDepth = screen.colorDepth;
        data.pixelRatio = window.devicePixelRatio;

        // 收集硬件信息
        data.hardwareConcurrency = navigator.hardwareConcurrency;
        if ('deviceMemory' in navigator) {
            data.deviceMemory = (navigator as any).deviceMemory;
        }

        // 收集渲染信息
        data.canvas = await this.getCanvasFingerprint();
        const webglInfo = this.getWebGLFingerprint();
        data.webgl = webglInfo.webgl;
        data.webglVendor = webglInfo.vendor;
        data.webglRenderer = webglInfo.renderer;

        // 收集字体信息
        data.fonts = await this.getAvailableFonts();

        // 收集插件信息
        data.plugins = this.getPluginsList();

        // 收集其他特征
        data.touchSupport = this.getTouchSupport();
        data.audioContext = await this.getAudioContextFingerprint();
        data.localStorage = this.isStorageAvailable('localStorage');
        data.sessionStorage = this.isStorageAvailable('sessionStorage');
        data.indexedDB = this.isIndexedDBAvailable();

        // 生成指纹哈希
        data.fingerprint = await this.generateFingerprint(data);

        this.fingerprintData = data as BrowserFingerprintData;
        return this.fingerprintData;
    }

    /**
     * 获取Canvas指纹
     */
    private async getCanvasFingerprint(): Promise<string> {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return '';

            canvas.width = 200;
            canvas.height = 50;

            // 绘制文本和图形
            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.fillStyle = '#f60';
            ctx.fillRect(125, 1, 62, 20);
            ctx.fillStyle = '#069';
            ctx.fillText('Browser Fingerprint 🔍', 2, 15);
            ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
            ctx.fillText('Browser Fingerprint 🔍', 4, 17);

            return canvas.toDataURL();
        } catch (error) {
            return '';
        }
    }

    /**
     * 获取WebGL指纹
     */
    private getWebGLFingerprint(): { webgl: string; vendor: string; renderer: string } {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (!gl || !(gl instanceof WebGLRenderingContext)) {
                return { webgl: '', vendor: '', renderer: '' };
            }

            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : '';
            const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '';

            // 获取WebGL参数
            const webglParams = [
                'VERSION',
                'SHADING_LANGUAGE_VERSION',
                'VENDOR',
                'RENDERER'
            ].map(param => {
                try {
                    // 使用WebGL常量而不是字符串键
                    const glParam = gl[param as keyof WebGLRenderingContext] as number;
                    if (typeof glParam === 'number') {
                        return gl.getParameter(glParam);
                    }
                    return 'unknown';
                } catch (error) {
                    return 'unknown';
                }
            }).join('|');

            return {
                webgl: webglParams,
                vendor: vendor || '',
                renderer: renderer || ''
            };
        } catch (error) {
            return { webgl: '', vendor: '', renderer: '' };
        }
    }

    /**
     * 获取可用字体列表
     */
    private async getAvailableFonts(): Promise<string[]> {
        const testFonts = [
            'Arial', 'Arial Black', 'Arial Narrow', 'Arial Rounded MT Bold',
            'Calibri', 'Cambria', 'Candara', 'Century Gothic', 'Comic Sans MS',
            'Consolas', 'Courier', 'Courier New', 'Georgia', 'Helvetica',
            'Impact', 'Lucida Console', 'Lucida Sans Unicode', 'Microsoft Sans Serif',
            'Palatino', 'Tahoma', 'Times', 'Times New Roman', 'Trebuchet MS',
            'Verdana', 'Monaco', 'Menlo', 'Ubuntu', 'DejaVu Sans'
        ];

        const availableFonts: string[] = [];
        const testString = 'mmmmmmmmmmlli';
        const testSize = '72px';
        const baseFonts = ['monospace', 'sans-serif', 'serif'];

        // 创建测试元素
        const span = document.createElement('span');
        span.style.fontSize = testSize;
        span.style.position = 'absolute';
        span.style.left = '-9999px';
        span.style.top = '-9999px';
        span.style.visibility = 'hidden';
        span.innerHTML = testString;
        document.body.appendChild(span);

        // 获取基础字体的尺寸
        const baseFontSizes: { [key: string]: { width: number; height: number } } = {};
        for (const baseFont of baseFonts) {
            span.style.fontFamily = baseFont;
            baseFontSizes[baseFont] = {
                width: span.offsetWidth,
                height: span.offsetHeight
            };
        }

        // 测试每个字体
        for (const font of testFonts) {
            let detected = false;
            for (const baseFont of baseFonts) {
                span.style.fontFamily = `${font}, ${baseFont}`;
                const size = {
                    width: span.offsetWidth,
                    height: span.offsetHeight
                };

                if (size.width !== baseFontSizes[baseFont].width ||
                    size.height !== baseFontSizes[baseFont].height) {
                    detected = true;
                    break;
                }
            }
            if (detected) {
                availableFonts.push(font);
            }
        }

        document.body.removeChild(span);
        return availableFonts;
    }

    /**
     * 获取插件列表
     */
    private getPluginsList(): string[] {
        const plugins: string[] = [];
        for (let i = 0; i < navigator.plugins.length; i++) {
            const plugin = navigator.plugins[i];
            // Plugin接口中version属性可能不存在，使用可选链和类型断言
            const version = (plugin as any).version || 'unknown';
            plugins.push(`${plugin.name}|${version}`);
        }
        return plugins;
    }

    /**
     * 检测触摸支持
     */
    private getTouchSupport(): boolean {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }

    /**
     * 获取音频上下文指纹
     */
    private async getAudioContextFingerprint(): Promise<string> {
        try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const analyser = audioContext.createAnalyser();
            const gainNode = audioContext.createGain();
            const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);

            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(10000, audioContext.currentTime);

            gainNode.gain.setValueAtTime(0, audioContext.currentTime);

            oscillator.connect(analyser);
            analyser.connect(scriptProcessor);
            scriptProcessor.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.start(0);

            return new Promise((resolve) => {
                scriptProcessor.onaudioprocess = function (bins) {
                    const samples = bins.inputBuffer.getChannelData(0);
                    let sum = 0;
                    for (let i = 0; i < samples.length; i++) {
                        sum += Math.abs(samples[i]);
                    }
                    oscillator.stop();
                    scriptProcessor.disconnect();
                    resolve(sum.toString());
                };
            });
        } catch (error) {
            return '';
        }
    }

    /**
     * 检查存储是否可用
     */
    private isStorageAvailable(type: 'localStorage' | 'sessionStorage'): boolean {
        try {
            const storage = window[type];
            const test = '__storage_test__';
            storage.setItem(test, test);
            storage.removeItem(test);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * 检查IndexedDB是否可用
     */
    private isIndexedDBAvailable(): boolean {
        return 'indexedDB' in window;
    }

    /**
     * 生成指纹哈希
     */
    private async generateFingerprint(data: Partial<BrowserFingerprintData>): Promise<string> {
        const fingerprintString = JSON.stringify(data, Object.keys(data).sort());

        // 使用Web Crypto API生成SHA-256哈希
        try {
            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(fingerprintString);
            const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (error) {
            // 降级到简单哈希
            return this.simpleHash(fingerprintString);
        }
    }

    /**
     * 简单哈希函数（降级方案）
     */
    private simpleHash(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 转换为32位整数
        }
        return Math.abs(hash).toString(16);
    }

    /**
     * 获取指纹哈希（快速方法）
     */
    public async getFingerprint(): Promise<string> {
        const data = await this.collectFingerprint();
        return data.fingerprint;
    }

    /**
     * 获取完整指纹数据
     */
    public async getFingerprintData(): Promise<BrowserFingerprintData> {
        return await this.collectFingerprint();
    }

    /**
     * 生成稳定的设备密钥字符串
     * 使用高稳定性属性组合，适合用于密钥生成
     */
    public async getStableDeviceKey(): Promise<string> {
        const data = await this.collectFingerprint();

        // 使用高稳定性属性组合
        const keyComponents = [
            data.hardwareConcurrency.toString(),
            data.screenResolution,
            data.timezone,
            data.platform,
            data.webglVendor,
            data.webglRenderer,
            data.canvas.substring(0, 100), // 取前100字符避免过长
            data.colorDepth.toString()
        ];

        // 过滤空值并用分隔符连接
        const stableKey = keyComponents
            .filter(component => component && component.trim() !== '')
            .join('|');

        return stableKey;
    }

    /**
     * 生成稳定设备密钥的哈希值
     * 返回SHA-256哈希，适合作为加密密钥
     */
    public async getStableDeviceKeyHash(): Promise<string> {
        const stableKey = await this.getStableDeviceKey();

        try {
            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(stableKey);
            const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (error) {
            // 降级到简单哈希
            return this.simpleHash(stableKey);
        }
    }

    /**
     * 清除缓存的指纹数据
     */
    public clearCache(): void {
        this.fingerprintData = null;
    }
}

/**
 * 导出服务实例
 */
export const browserFingerprintService = BrowserFingerprintService.getInstance();

/**
 * 便捷函数：获取浏览器指纹哈希
 */
export async function getBrowserFingerprint(): Promise<string> {
    return await browserFingerprintService.getFingerprint();
}

/**
 * 便捷函数：获取完整指纹数据
 */
export async function getBrowserFingerprintData(): Promise<BrowserFingerprintData> {
    return await browserFingerprintService.getFingerprintData();
}

/**
 * 便捷函数：获取稳定的设备密钥字符串
 */
export async function getStableDeviceKey(): Promise<string> {
    return await browserFingerprintService.getStableDeviceKey();
}

/**
 * 便捷函数：获取稳定设备密钥的哈希值
 */
export async function getStableDeviceKeyHash(): Promise<string> {
    return await browserFingerprintService.getStableDeviceKeyHash();
}