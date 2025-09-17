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
        console.log('🔐【授权服务】开始令牌验证...')
        this.updateStatus('checking', false)

        try {
            // 获取设备密钥哈希值
            const deviceKeyHash = await getStableDeviceKeyHash()
            console.log('🔑【设备密钥】获取成功')

            // 获取远程JSON数据并对比密钥
            try {
                console.log('🌐【远程验证】开始获取远程密钥数据...')

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
                        this.updateStatus('authorized', true)
                    } else {
                        console.log('❌【密钥验证】密钥不匹配')
                        this.updateStatus('unauthorized', false)
                    }
                } else {
                    console.log('⚠️【远程验证】远程数据中没有找到任何密钥值')
                    this.updateStatus('unauthorized', false)
                }
            } catch (fetchError) {
                console.error('🌐【远程验证】获取远程数据失败:', fetchError)
                this.updateStatus('error', false)
            }
        } catch (error) {
            console.error('🔑【设备密钥】获取失败:', error)
            this.updateStatus('error', false)
        }
    }

    /**
     * 重置授权状态
     */
    reset() {
        this.updateStatus('checking', false)
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