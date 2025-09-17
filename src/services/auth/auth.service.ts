/**
 * 授权服务
 * 负责管理应用的授权状态和令牌验证
 */

import { getStableDeviceKeyHash } from '../fingerprint/browser-fingerprint.service'

export type AuthStatus = 'checking' | 'authorized' | 'unauthorized' | 'error'

class AuthService {
    private _isAuthorized = false
    private _authStatus: AuthStatus = 'checking'
    private _listeners: Array<(status: AuthStatus, isAuthorized: boolean) => void> = []
    private _verificationTimer: number | null = null
    private _isVerifying = false
    private readonly VERIFICATION_INTERVAL = 10 * 60 * 1000
    private readonly CACHE_KEY = 'qi-qiao-ban-auth-cache'



    /**
     * 写入本地缓存
     */
    private saveToCache(deviceKeyHash: string, timestamp: number): void {
        try {
            const cacheData = {
                deviceKeyHash,
                timestamp,
                lastVerified: new Date().toISOString()
            }
            localStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheData))

        } catch (error) {

        }
    }

    /**
     * 读取本地缓存
     */
    private readFromCache(): { deviceKeyHash: string; timestamp: number; lastVerified: string } | null {
        try {
            const cacheData = localStorage.getItem(this.CACHE_KEY)
            if (cacheData) {
                const parsed = JSON.parse(cacheData)
                console.log('💾【本地缓存】读取到缓存数据:', parsed.lastVerified)
                return parsed
            }
        } catch (error) {
            console.error('💾【本地缓存】读取失败:', error)
        }
        return null
    }

    /**
     * 清除本地缓存
     */
    private clearCache(): void {
        try {
            localStorage.removeItem(this.CACHE_KEY)
            console.log('💾【本地缓存】缓存已清除')
        } catch (error) {
            console.error('💾【本地缓存】清除失败:', error)
        }
    }

    get isAuthorized(): boolean {
        return this._isAuthorized
    }

    get authStatus(): AuthStatus {
        return this._authStatus
    }

    /**
     * 订阅授权状态变化
     */
    subscribe(callback: (status: AuthStatus, isAuthorized: boolean) => void): () => void {
        this._listeners.push(callback)
        // 立即调用一次回调，传递当前状态
        callback(this._authStatus, this._isAuthorized)

        // 返回取消订阅函数
        return () => {
            const index = this._listeners.indexOf(callback)
            if (index > -1) {
                this._listeners.splice(index, 1)
            }
        }
    }

    /**
     * 更新授权状态
     */
    private updateStatus(status: AuthStatus, isAuthorized: boolean) {
        this._authStatus = status
        this._isAuthorized = isAuthorized

        // 通知所有订阅者
        this._listeners.forEach(callback => {
            callback(status, isAuthorized)
        })
    }

    /**
     * 执行令牌验证
     */
    async verifyToken(): Promise<void> {
        // 防止重复验证
        if (this._isVerifying) {
            console.log('🔐【授权服务】验证正在进行中，跳过重复验证')
            return
        }

        this._isVerifying = true
        this.updateStatus('checking', false)

        try {
            // 获取设备密钥哈希值
            const deviceKeyHash = await getStableDeviceKeyHash()


            // 获取远程JSON数据并对比密钥
            try {


                // 使用CORS代理来解决跨域问题
                const proxyUrl = 'https://api.allorigins.win/get?url='
                const targetUrl = encodeURIComponent('https://buzhichu.netlify.app/societies/99%20asset/json/qi-qiao-ban.json')
                const response = await fetch(proxyUrl + targetUrl)

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`)
                }

                const proxyData = await response.json()
                const remoteData = JSON.parse(proxyData.contents)

                // 对比密钥 - 只考虑值，不关注键名
                const remoteValues = Object.values(remoteData)

                if (remoteValues.length > 0) {
                    // 遍历所有远程密钥值，进行精确匹配
                    let keyMatched = false
                    for (const remoteValue of remoteValues) {
                        if (remoteValue === deviceKeyHash) {
                            keyMatched = true
                            break
                        }
                    }

                    if (keyMatched) {
                        console.log('✅【密钥验证】密钥匹配成功！本设备已授权')
                        // 验证成功时保存到本地缓存
                        this.saveToCache(deviceKeyHash, Date.now())
                        this.updateStatus('authorized', true)
                    } else {
                        console.log('❌【密钥验证】密钥不匹配')
                        // 验证失败时清除本地缓存
                        this.clearCache()
                        this.updateStatus('unauthorized', false)
                    }
                } else {
                    console.log('⚠️【远程验证】远程数据中没有找到任何密钥值')
                    // 远程数据异常时清除本地缓存
                    this.clearCache()
                    this.updateStatus('unauthorized', false)
                }
            } catch (fetchError) {
                console.error('🌐【远程验证】获取远程数据失败:', fetchError)
                // 网络错误时清除本地缓存
                this.clearCache()
                this.updateStatus('error', false)
            }
        } catch (error) {
            console.error('🔑【设备密钥】获取失败:', error)
            // 设备密钥获取失败时清除本地缓存
            this.clearCache()
            this.updateStatus('error', false)
        } finally {
            this._isVerifying = false
        }
    }

    /**
     * 启动定期验证（不执行立即验证）
     */
    startPeriodicVerification(): void {
        // 如果已经有定时器在运行，先清除
        this.stopPeriodicVerification()

        console.log('🔄【授权服务】启动定期验证')

        // 设置定期验证（不立即执行）
        this._verificationTimer = window.setInterval(() => {
            console.log('🔄【授权服务】执行定期验证')
            this.verifyToken()
        }, this.VERIFICATION_INTERVAL)
    }

    /**
     * 停止定期验证
     */
    stopPeriodicVerification(): void {
        if (this._verificationTimer) {
            console.log('⏹️【授权服务】停止定期验证')
            clearInterval(this._verificationTimer)
            this._verificationTimer = null
        }
    }

    /**
     * 重置授权状态
     */
    reset() {
        this.stopPeriodicVerification()
        this.updateStatus('checking', false)
    }

    /**
     * 销毁服务，清理资源
     */
    destroy() {
        this.stopPeriodicVerification()
        this._listeners = []
        this._isVerifying = false
    }
}

// 导出单例实例
export const authService = new AuthService()

// 便捷函数
export function getAuthStatus(): AuthStatus {
    return authService.authStatus
}

export function isAuthorized(): boolean {
    return authService.isAuthorized
}

export function subscribeToAuth(callback: (status: AuthStatus, isAuthorized: boolean) => void): () => void {
    return authService.subscribe(callback)
}

export function verifyToken(): Promise<void> {
    return authService.verifyToken()
}

export function startPeriodicVerification(): void {
    return authService.startPeriodicVerification()
}

export function stopPeriodicVerification(): void {
    return authService.stopPeriodicVerification()
}