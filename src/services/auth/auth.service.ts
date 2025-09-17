/**
 * 授权服务
 * 负责管理应用的授权状态和令牌验证
 */

import { getStableDeviceKeyHash } from '../fingerprint/browser-fingerprint.service'
import DexieService from '../database/dexie-service'

export type AuthStatus = 'checking' | 'authorized' | 'unauthorized' | 'error'

class AuthService {
    private _isAuthorized = false
    private _authStatus: AuthStatus = 'checking'
    private _listeners: Array<(status: AuthStatus, isAuthorized: boolean) => void> = []
    private _verificationTimer: number | null = null
    private _isVerifying = false
    private readonly VERIFICATION_INTERVAL = 10 * 60 * 1000
    private readonly CACHE_KEY = 'qi-qiao-ban-auth-cache'
    
    // 验证冷却时间（5分钟）
    private readonly VERIFICATION_COOLDOWN = 5 * 60 * 1000
    private _lastVerificationTime = 0
    
    // 缓存有效期（30分钟）
    private readonly CACHE_VALIDITY_PERIOD = 30 * 60 * 1000

    // 定期验证失败计数器
    private _periodicFailureCount = 0
    private readonly MAX_PERIODIC_FAILURES = 3



    /**
     * 快速本地授权验证
     * 通过比较当前设备密钥与缓存中的密钥来验证授权
     * @returns 是否通过本地验证
     */
    async quickLocalAuthCheck(): Promise<boolean> {
        try {
            // 获取当前设备密钥哈希
            const currentDeviceKeyHash = await getStableDeviceKeyHash()
            
            // 读取缓存中的授权信息（已包含过期检查）
            const cacheData = this.readFromCache()
            if (!cacheData) {
                console.warn('⚠️【本地授权】缓存为空或已过期，需要远程验证')
                return false
            }

            const cachedDeviceKeyHash = cacheData.deviceKeyHash

            // 比较密钥
            if (currentDeviceKeyHash === cachedDeviceKeyHash) {
                const cacheAge = Date.now() - cacheData.timestamp
                const cacheAgeMinutes = Math.round(cacheAge / (1000 * 60))
                console.log(`✅【本地授权】密钥匹配，授权通过（缓存时间：${cacheAgeMinutes}分钟）`)
                return true
            } else {
                console.warn('❌【本地授权】密钥不匹配，拒绝访问')
                // 密钥不匹配时清除缓存
                this.clearCache()
                return false
            }
        } catch (error) {
            console.error('❌【本地授权】验证失败:', error)
            return false
        }
    }

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
                
                // 检查缓存是否过期
                const now = Date.now()
                const cacheAge = now - parsed.timestamp
                
                if (cacheAge > this.CACHE_VALIDITY_PERIOD) {
                    console.log('⏰【缓存过期】缓存已过期，清除缓存')
                    this.clearCache()
                    return null
                }

                return parsed
            }
        } catch (error) {

        }
        return null
    }

    /**
     * 清空本地缓存
     */
    private clearCache(): void {
        try {
            localStorage.removeItem(this.CACHE_KEY)

        } catch (error) {

        }
    }

    /**
     * 清空IndexedDB数据库（作弊惩罚）
     */
    private async clearIndexedDB(): Promise<void> {
        try {
            const success = await DexieService.clearDatabase('qi-qiao-ban')
            if (success) {
                console.error('❌【IndexedDB】清除数据库成功')
            } else {
                console.error('❌【IndexedDB】清除数据库失败')
            }
        } catch (error) {
            console.error('❌【IndexedDB】清除数据库失败:', error)
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
     * @param isPeriodicCheck 是否为定期验证，默认为false（首次验证）
     * @param forceVerification 是否强制验证，跳过冷却时间检查，默认为false
     */
    async verifyToken(isPeriodicCheck: boolean = false, forceVerification: boolean = false): Promise<void> {
        // 防止重复验证
        if (this._isVerifying) {
            return
        }

        // 初次验证逻辑：优先使用本地缓存验证
        if (!isPeriodicCheck && !forceVerification) {
            console.log('🔍【初次验证】优先尝试本地缓存验证')
            
            // 尝试本地验证
            const localAuthResult = await this.quickLocalAuthCheck()
            if (localAuthResult) {
                console.log('✅【初次验证】本地缓存验证成功，跳过远程验证')
                this.updateStatus('authorized', true)
                return
            } else {
                console.log('⚠️【初次验证】本地缓存验证失败，进行远程验证')
            }
        }

        // 检查验证冷却时间（仅对强制验证生效）
        if (forceVerification) {
            const now = Date.now()
            const timeSinceLastVerification = now - this._lastVerificationTime
            
            if (timeSinceLastVerification < this.VERIFICATION_COOLDOWN) {
                console.log(`⏰【强制验证冷却】距离上次验证仅${Math.round(timeSinceLastVerification / 1000)}秒，优先使用本地验证`)
                
                // 尝试本地验证
                const localAuthResult = await this.quickLocalAuthCheck()
                if (localAuthResult) {
                    this.updateStatus('authorized', true)
                    return
                } else {
                    console.log('🔄【本地验证失败】将进行远程验证')
                }
            }
        }

        this._isVerifying = true
        this.updateStatus('checking', false)

        try {
            // 记录验证开始时间
            this._lastVerificationTime = Date.now()
            
            // 每次都重新获取设备密钥哈希值，不使用缓存，防止前端注入
            const deviceKeyHash = await getStableDeviceKeyHash()


            // 获取远程JSON数据并对比密钥
            try {
                // 使用CORS代理来解决跨域问题
                const proxyUrl = 'https://api.allorigins.win/get?url='
                const targetUrl = encodeURIComponent('https://buzhichu.netlify.app/societies/99%20asset/json/qi-qiao-ban.json')
                
                // 根据验证类型决定是否添加缓存破坏参数
                let fetchUrl = proxyUrl + targetUrl
                let fetchOptions: RequestInit = {}
                
                if (isPeriodicCheck) {
                    // 定期验证：添加时间戳和随机数防止缓存，确保获取最新数据
                    const cacheBuster = `&_t=${Date.now()}&_r=${Math.random()}`
                    fetchUrl += cacheBuster
                    fetchOptions.cache = 'no-cache'
                    console.log('🔄【定期验证】强制获取最新远程数据，不使用缓存')
                } else {
                    // 初次验证：允许使用缓存，提高加载速度
                    console.log('🚀【初次验证】允许使用缓存，提高加载速度')
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
                        const verificationTypeText = isPeriodicCheck ? '定期验证' : '初次验证'
                        console.log(`✅【${verificationTypeText}】远程密钥验证成功`)
                        // 验证成功时保存到本地缓存
                        this.saveToCache(deviceKeyHash, Date.now())
                        // 重置定期验证失败计数器
                        if (isPeriodicCheck) {
                            this._periodicFailureCount = 0
                        }
                        this.updateStatus('authorized', true)
                    } else {
                        const verificationTypeText = isPeriodicCheck ? '定期验证' : '初次验证'
                        console.warn(`❌【${verificationTypeText}】远程密钥验证失败`)
                        // 验证失败时清除本地缓存
                        this.clearCache()

                        // 如果是定期验证失败，增加失败计数
                        if (isPeriodicCheck) {
                            this._periodicFailureCount++

                            // 连续3次失败才清空数据库
                            if (this._periodicFailureCount >= this.MAX_PERIODIC_FAILURES) {
                                await this.clearIndexedDB()
                                this._periodicFailureCount = 0 // 重置计数器
                            }
                        }

                        this.updateStatus('unauthorized', false)
                    }
                } else {

                    // 远程数据异常时清除本地缓存
                    this.clearCache()

                    // 如果是定期验证失败，增加失败计数
                    if (isPeriodicCheck) {
                        this._periodicFailureCount++

                        // 连续3次失败才清空数据库
                        if (this._periodicFailureCount >= this.MAX_PERIODIC_FAILURES) {
                            await this.clearIndexedDB()
                            this._periodicFailureCount = 0 // 重置计数器
                        }
                    }

                    this.updateStatus('unauthorized', false)
                }
            } catch (fetchError) {
                console.error('🌐【远程验证】获取远程数据失败:', fetchError)
                // 网络错误时清除本地缓存
                this.clearCache()

                // 网络错误不触发数据库清空，只有密钥对比失败才清空
                if (isPeriodicCheck) {

                }

                this.updateStatus('error', false)
            }
        } catch (error) {
            console.error('🔑【设备密钥】获取失败:', error)
            // 设备密钥获取失败时清除本地缓存
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