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
    private readonly CACHE_EXPIRY_TIME = 5 * 60 * 1000

    // 令牌篡改检测标志
    private _cacheTempered = false



    /**
     * 检查令牌是否过期
     */
    private isCacheExpired(cacheData: { deviceKeyHash: string; timestamp: number; lastVerified: string }): boolean {
        const now = Date.now()
        return (now - cacheData.timestamp) > this.CACHE_EXPIRY_TIME
    }

    /**
     * 快速本地授权验证
     * 通过比较当前设备密钥与令牌中的密钥来验证授权
     * @returns 是否通过本地验证
     */
    async quickLocalAuthCheck(): Promise<boolean> {
        try {
            // 获取当前设备密钥哈希
            const currentDeviceKeyHash = await getStableDeviceKeyHash()

            // 读取令牌中的授权信息
            const cacheData = this.readFromCache()
            if (!cacheData) {
                console.log('🚨【令牌检测】无令牌数据')
                return false
            }

            // 检查令牌是否过期
            if (this.isCacheExpired(cacheData)) {
                console.log('🚨【令牌检测】令牌已过期，需要重新验证')
                this.clearCache()
                return false
            }

            const cachedDeviceKeyHash = cacheData.deviceKeyHash

            // 比较密钥
            if (currentDeviceKeyHash === cachedDeviceKeyHash) {
                console.log('🚨【令牌检测】检测通过')
                // 密钥匹配，重置令牌篡改标志
                this._cacheTempered = false
                return true
            } else {
                // 密钥不匹配，标记为令牌篡改
                this._cacheTempered = true
                console.log('🚨【令牌检测】检测异常')
                // 密钥不匹配时清除令牌
                this.clearCache()
                return false
            }
        } catch (error) {
            return false
        }
    }

    /**
     * 保存验证结果到本地令牌
     * @param deviceKeyHash 设备密钥哈希
     * @param timestamp 时间戳
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
     * 读取本地令牌
     */
    private readFromCache(): { deviceKeyHash: string; timestamp: number; lastVerified: string } | null {
        try {
            const cacheData = localStorage.getItem(this.CACHE_KEY)
            if (cacheData) {
                const parsed = JSON.parse(cacheData)
                return parsed
            }
        } catch (error) {

        }
        return null
    }

    /**
     * 清空本地令牌
     */
    private clearCache(): void {
        try {
            localStorage.removeItem(this.CACHE_KEY)

        } catch (error) {

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
     * @param isPeriodicCheck 是否为定期验证，默认为false（授权验证）
     * @param forceVerification 是否强制验证，跳过冷却时间检查，默认为false
     */
    async verifyToken(isPeriodicCheck: boolean = false, forceVerification: boolean = false): Promise<void> {
        // 防止重复验证
        if (this._isVerifying) {
            return
        }

        // 授权验证逻辑：优先使用本地令牌验证
        if (!isPeriodicCheck && !forceVerification) {
            // 尝试本地验证
            const localAuthResult = await this.quickLocalAuthCheck()
            if (localAuthResult) {
                console.log('✅【授权验证】授权成功')
                this.updateStatus('authorized', true)
                return
            } else {
                console.log('❌【授权验证】授权失败，再次验证')
            }
        }

        // 定期验证和强制验证直接进行远程验证，不使用令牌
        this._isVerifying = true
        this.updateStatus('checking', false)

        try {
            // 每次都重新获取设备密钥哈希值，不使用令牌，防止前端注入
            const deviceKeyHash = await getStableDeviceKeyHash()


            // 获取远程JSON数据并对比密钥
            try {
                // 使用CORS代理来解决跨域问题
                const proxyUrl = 'https://api.allorigins.win/get?url='
                const targetUrl = encodeURIComponent('https://buzhichu.netlify.app/societies/99%20asset/json/qi-qiao-ban.json')

                // 为所有验证类型都添加令牌破坏参数，确保获取最新数据
                const cacheBuster = `&_t=${Date.now()}&_r=${Math.random()}`
                const fetchUrl = proxyUrl + targetUrl + cacheBuster
                const fetchOptions: RequestInit = {
                    cache: 'no-cache'
                }

                const response = await fetch(fetchUrl, fetchOptions)

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`)
                }

                const proxyData = await response.json()
                const remoteData = JSON.parse(proxyData.contents)

                // 对比密钥 - 只考虑值，不关注键名
                const remoteValues = Object.values(remoteData)

                if (remoteValues.length > 0) {
                    // 遍历所有远程密钥值，进行精确字符串匹配
                    let keyMatched = false
                    for (const remoteValue of remoteValues) {
                        if (typeof remoteValue === 'string' && remoteValue === deviceKeyHash) {
                            keyMatched = true
                            break
                        }
                    }

                    if (keyMatched) {
                        // 只在授权验证时打印成功信息
                        if (!isPeriodicCheck) {
                            console.log('✅【授权验证】验证成功')
                        }
                        // 验证成功时保存到本地令牌
                        this.saveToCache(deviceKeyHash, Date.now())
                        // 重置令牌篡改标志
                        if (isPeriodicCheck) {
                            this._cacheTempered = false
                        }
                        this.updateStatus('authorized', true)
                    } else {
                        // 只在授权验证时打印失败信息
                        if (!isPeriodicCheck) {
                            console.log('❌【授权验证】验证失败')
                        }
                        // 验证失败时清除本地令牌
                        this.clearCache()

                        // 如果是定期验证失败，直接根据令牌篡改情况处理
                        if (isPeriodicCheck) {
                            // 区分令牌篡改和权限撤销的处理逻辑
                            if (this._cacheTempered) {
                                // 令牌篡改：立即执行令牌清空惩罚
                                console.log('🚨【作弊惩罚】令牌异常')
                                this.clearCache()
                                this._cacheTempered = false // 重置篡改标志
                            } else {
                                // 权限撤销：仅清除令牌
                                console.log('⚠️【权限撤销】权限异常')
                            }
                        }

                        this.updateStatus('unauthorized', false)
                    }
                } else {
                    console.log('❌【远程数据】数据异常')
                    // 远程数据异常时清除本地令牌
                    this.clearCache()

                    // 如果是定期验证失败，直接根据令牌篡改情况处理
                    if (isPeriodicCheck) {
                        // 区分令牌篡改和权限撤销的处理逻辑
                        if (this._cacheTempered) {
                            // 令牌篡改：立即执行令牌清空惩罚
                            console.log('🚨【作弊惩罚】令牌异常')
                            this.clearCache()
                            this._cacheTempered = false // 重置篡改标志
                        } else {
                            // 权限撤销：仅清除令牌
                            console.log('⚠️【权限撤销】权限异常')
                        }
                    }

                    this.updateStatus('unauthorized', false)
                }
            } catch (fetchError) {
                // 网络错误时清除本地令牌
                this.clearCache()

                // 网络错误不触发数据库清空，只有密钥对比失败才清空
                if (isPeriodicCheck) {

                }

                this.updateStatus('error', false)
            }
        } catch (error) {
            // 设备密钥获取失败时清除本地令牌
            this.clearCache()

            // 设备密钥获取失败不触发数据库清空
            if (isPeriodicCheck) {

            }

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


        // 设置定期验证（不立即执行）
        this._verificationTimer = window.setInterval(() => {
            this.verifyToken(true) // 传入true表示这是定期验证
        }, this.VERIFICATION_INTERVAL)
    }

    /**
     * 停止定期验证
     */
    stopPeriodicVerification(): void {
        if (this._verificationTimer) {
            clearInterval(this._verificationTimer)
            this._verificationTimer = null
        }
    }

    /**
     * 重置授权状态
     */
    reset() {
        this._isAuthorized = false
        this._authStatus = 'checking'
        this._cacheTempered = false
        this.clearCache()
        this.stopPeriodicVerification()
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

export function verifyToken(forceVerification: boolean = false): Promise<void> {
    return authService.verifyToken(false, forceVerification)
}

export function startPeriodicVerification(): void {
    return authService.startPeriodicVerification()
}

export function stopPeriodicVerification(): void {
    return authService.stopPeriodicVerification()
}

export function quickLocalAuthCheck(): Promise<boolean> {
    return authService.quickLocalAuthCheck()
}