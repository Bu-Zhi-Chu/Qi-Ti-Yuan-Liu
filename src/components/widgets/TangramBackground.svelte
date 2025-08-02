<script lang="ts">
    import SimpleBox from '../Core/SimpleBox.svelte'
    import ResponsiveBox from '../Core/ResponsiveBox.svelte'
</script>

<ResponsiveBox style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;overflow: hidden;">
    <SimpleBox
        class="tangram-shape tangram-triangle-1"
        style="position: absolute; top: calc(50px * var(--scale-ratio, 1)); left: calc(20px * var(--scale-ratio, 1)); width: 0; height: 0; border-left: calc(40px * var(--scale-ratio, 1)) solid transparent; border-right: calc(40px * var(--scale-ratio, 1)) solid transparent; border-bottom: calc(60px * var(--scale-ratio, 1)) solid #ff6b6b; transform: rotate(calc(15deg * var(--scale-ratio, 1))); animation: tangram-fall-1 8s ease-in-out infinite;"
    />

    <SimpleBox
        class="tangram-shape tangram-triangle-2"
        style="position: absolute; top: calc(80px * var(--scale-ratio, 1)); right: calc(30px * var(--scale-ratio, 1)); width: 0; height: 0; border-left: calc(30px * var(--scale-ratio, 1)) solid transparent; border-right: calc(30px * var(--scale-ratio, 1)) solid transparent; border-bottom: calc(45px * var(--scale-ratio, 1)) solid #4ecdc4; transform: rotate(calc(-20deg * var(--scale-ratio, 1))); animation: tangram-fall-2 10s ease-in-out infinite;"
    />

    <!-- 七巧板形状组2 - 正方形 -->
    <SimpleBox
        class="tangram-shape tangram-square"
        style="position: absolute; top: calc(120px * var(--scale-ratio, 1)); left: calc(40% * var(--scale-ratio, 1)); width: calc(35px * var(--scale-ratio, 1)); height: calc(35px * var(--scale-ratio, 1)); background: #45b7d1; transform: rotate(calc(45deg * var(--scale-ratio, 1))); animation: tangram-fall-3 9s ease-in-out infinite;"
    />

    <!-- 七巧板形状组3 - 平行四边形 -->
    <SimpleBox
        class="tangram-shape tangram-parallelogram"
        style="position: absolute; top: calc(200px * var(--scale-ratio, 1)); right: calc(20% * var(--scale-ratio, 1)); width: calc(50px * var(--scale-ratio, 1)); height: calc(25px * var(--scale-ratio, 1)); background: #96ceb4; transform: skew(calc(-20deg * var(--scale-ratio, 1))); animation: tangram-fall-4 7s ease-in-out infinite;"
    />

    <!-- 七巧板形状组4 - 小三角形 -->
    <SimpleBox
        class="tangram-shape tangram-small-triangle-1"
        style="position: absolute; top: calc(150px * var(--scale-ratio, 1)); left: calc(15% * var(--scale-ratio, 1)); width: 0; height: 0; border-left: calc(20px * var(--scale-ratio, 1)) solid transparent; border-right: calc(20px * var(--scale-ratio, 1)) solid transparent; border-bottom: calc(30px * var(--scale-ratio, 1)) solid #feca57; transform: rotate(calc(30deg * var(--scale-ratio, 1))); animation: tangram-fall-5 11s ease-in-out infinite;"
    />

    <SimpleBox
        class="tangram-shape tangram-small-triangle-2"
        style="position: absolute; bottom: calc(100px * var(--scale-ratio, 1)); right: calc(25% * var(--scale-ratio, 1)); width: 0; height: 0; border-left: calc(15px * var(--scale-ratio, 1)) solid transparent; border-right: calc(15px * var(--scale-ratio, 1)) solid transparent; border-bottom: calc(25px * var(--scale-ratio, 1)) solid #ff9ff3; transform: rotate(calc(-45deg * var(--scale-ratio, 1))); animation: tangram-fall-6 6s ease-in-out infinite;"
    />

    <!-- 七巧板形状组5 - 中型三角形 -->
    <SimpleBox
        class="tangram-shape tangram-medium-triangle"
        style="position: absolute; bottom: calc(60px * var(--scale-ratio, 1)); left: calc(30% * var(--scale-ratio, 1)); width: 0; height: 0; border-left: calc(25px * var(--scale-ratio, 1)) solid transparent; border-right: calc(25px * var(--scale-ratio, 1)) solid transparent; border-bottom: calc(40px * var(--scale-ratio, 1)) solid #a29bfe; transform: rotate(calc(60deg * var(--scale-ratio, 1))); animation: tangram-fall-7 12s ease-in-out infinite;"
    />
</ResponsiveBox>

<style>
    /* 七巧板动画定义 */
    @keyframes tangram-fall-1 {
        0% {
            transform: translateY(calc(-100px * var(--scale-ratio, 1))) rotate(calc(15deg * var(--scale-ratio, 1)));
            opacity: 0;
        }
        10% {
            opacity: 0.7;
        }
        90% {
            opacity: 0.7;
        }
        100% {
            transform: translateY(calc(100vh * var(--scale-ratio, 1))) rotate(calc(375deg * var(--scale-ratio, 1)));
            opacity: 0;
        }
    }

    @keyframes tangram-fall-2 {
        0% {
            transform: translateY(calc(-100px * var(--scale-ratio, 1))) rotate(calc(-20deg * var(--scale-ratio, 1)));
            opacity: 0;
        }
        15% {
            opacity: 0.6;
        }
        85% {
            opacity: 0.6;
        }
        100% {
            transform: translateY(calc(100vh * var(--scale-ratio, 1))) rotate(calc(340deg * var(--scale-ratio, 1)));
            opacity: 0;
        }
    }

    @keyframes tangram-fall-3 {
        0% {
            transform: translateY(calc(-100px * var(--scale-ratio, 1))) rotate(calc(45deg * var(--scale-ratio, 1)));
            opacity: 0;
        }
        12% {
            opacity: 0.8;
        }
        88% {
            opacity: 0.8;
        }
        100% {
            transform: translateY(calc(100vh * var(--scale-ratio, 1))) rotate(calc(405deg * var(--scale-ratio, 1)));
            opacity: 0;
        }
    }

    @keyframes tangram-fall-4 {
        0% {
            transform: translateY(calc(-100px * var(--scale-ratio, 1))) skew(calc(-20deg * var(--scale-ratio, 1)));
            opacity: 0;
        }
        18% {
            opacity: 0.5;
        }
        82% {
            opacity: 0.5;
        }
        100% {
            transform: translateY(calc(100vh * var(--scale-ratio, 1))) skew(calc(-20deg * var(--scale-ratio, 1)));
            opacity: 0;
        }
    }

    @keyframes tangram-fall-5 {
        0% {
            transform: translateY(calc(-100px * var(--scale-ratio, 1))) rotate(calc(30deg * var(--scale-ratio, 1)));
            opacity: 0;
        }
        14% {
            opacity: 0.7;
        }
        86% {
            opacity: 0.7;
        }
        100% {
            transform: translateY(calc(100vh * var(--scale-ratio, 1))) rotate(calc(390deg * var(--scale-ratio, 1)));
            opacity: 0;
        }
    }

    @keyframes tangram-fall-6 {
        0% {
            transform: translateY(calc(-100px * var(--scale-ratio, 1))) rotate(calc(-45deg * var(--scale-ratio, 1)));
            opacity: 0;
        }
        16% {
            opacity: 0.6;
        }
        84% {
            opacity: 0.6;
        }
        100% {
            transform: translateY(calc(100vh * var(--scale-ratio, 1))) rotate(calc(315deg * var(--scale-ratio, 1)));
            opacity: 0;
        }
    }

    @keyframes tangram-fall-7 {
        0% {
            transform: translateY(calc(-100px * var(--scale-ratio, 1))) rotate(calc(60deg * var(--scale-ratio, 1)));
            opacity: 0;
        }
        11% {
            opacity: 0.8;
        }
        89% {
            opacity: 0.8;
        }
        100% {
            transform: translateY(calc(100vh * var(--scale-ratio, 1))) rotate(calc(420deg * var(--scale-ratio, 1)));
            opacity: 0;
        }
    }
</style>
