<script lang="ts">
    import { beforeEach } from '@dvcol/svelte-simple-router'
    import { onMount } from 'svelte'
    import { authService } from '../../services/auth/auth.service'
    import { cleanupBlobUrls } from '../../services/utils/blob-url-manager'

    let isFirstNavigation = true
    let navigationCount = 0

    onMount(() => {
        // 注册路由守卫
        const unsubscribe = beforeEach(async (event) => {
            // 使用封装好的 Blob URL 清理函数
            cleanupBlobUrls()

            // 跳过第一次进入路由的验证
            if (isFirstNavigation) {
                isFirstNavigation = false
            } else {
                // 执行缓存验证以检测作弊行为
                try {
                    const isValid = await authService.quickLocalAuthCheck()
                } catch (error) {
                    console.error('❌ 令牌验证过程中发生错误:', error)
                }
            }

            // 增加导航计数
            navigationCount++
        })

        // 组件销毁时取消订阅
        return unsubscribe
    })
</script>

<!-- 这个组件不需要渲染任何内容，只是用来注册路由守卫 -->
