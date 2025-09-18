<script lang="ts">
    import { beforeEach } from '@dvcol/svelte-simple-router'
    import { onMount } from 'svelte'
    import { authService } from '../../services/auth/auth.service'
    import { cleanupBlobUrls } from '../../services/utils/blob-url-manager'
    import { ENABLE_AUTH_VERIFICATION } from '../../config/auth.config'

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
                // 根据控制开关决定是否执行验证
                if (ENABLE_AUTH_VERIFICATION) {
                    // 执行缓存验证以检测作弊行为
                    try {
                        const isValid = await authService.quickLocalAuthCheck()

                        if (!isValid) {
                        }
                    } catch (error) {}
                } else {
                    // 验证已禁用，跳过验证
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
