<script lang="ts">
    import SimpleBox from '../Core/SimpleBox.svelte'
    import ResponsiveBox from '../Core/ResponsiveBox.svelte'
</script>

<!-- 七巧板背景动画层 -->
<ResponsiveBox style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;overflow: hidden;">
    <SimpleBox
        class="tangram-shape tangram-triangle-1"
        style="position: absolute; left: 10%; top: calc(-60px * var(--scale-ratio, 1)); width: 0; height: 0; border-left: calc(60px * var(--scale-ratio, 1)) solid transparent; border-right: calc(60px * var(--scale-ratio, 1)) solid transparent; border-bottom: calc(120px * var(--scale-ratio, 1)) solid rgba(99, 102, 241, 0.3); animation: tangram-fall-1 15s linear infinite;"
    ></SimpleBox>
    <SimpleBox
        class="tangram-shape tangram-triangle-2"
        style="position: absolute; left: 25%; top: calc(-50px * var(--scale-ratio, 1)); width: 0; height: 0; border-left: calc(50px * var(--scale-ratio, 1)) solid transparent; border-right: calc(50px * var(--scale-ratio, 1)) solid transparent; border-bottom: calc(100px * var(--scale-ratio, 1)) solid rgba(139, 92, 246, 0.3); animation: tangram-fall-2 18s linear infinite;"
    ></SimpleBox>
    <SimpleBox
        class="tangram-shape tangram-triangle-3"
        style="position: absolute; left: 40%; top: calc(-40px * var(--scale-ratio, 1)); width: 0; height: 0; border-left: calc(40px * var(--scale-ratio, 1)) solid transparent; border-right: calc(40px * var(--scale-ratio, 1)) solid transparent; border-bottom: calc(80px * var(--scale-ratio, 1)) solid rgba(59, 130, 246, 0.3); animation: tangram-fall-3 20s linear infinite;"
    ></SimpleBox>
    <SimpleBox
        class="tangram-shape tangram-square"
        style="position: absolute; left: 55%; top: calc(-40px * var(--scale-ratio, 1)); width: calc(80px * var(--scale-ratio, 1)); height: calc(80px * var(--scale-ratio, 1)); background: rgba(16, 185, 129, 0.3); transform: rotate(45deg); animation: tangram-fall-4 22s linear infinite;"
    ></SimpleBox>
    <SimpleBox
        class="tangram-shape tangram-parallelogram"
        style="position: absolute; left: 70%; top: calc(-30px * var(--scale-ratio, 1)); width: calc(100px * var(--scale-ratio, 1)); height: calc(60px * var(--scale-ratio, 1)); background: rgba(245, 158, 11, 0.3); transform: skew(-20deg); animation: tangram-fall-5 25s linear infinite;"
    ></SimpleBox>
    <SimpleBox
        class="tangram-shape tangram-medium-triangle"
        style="position: absolute; left: 85%; top: calc(-35px * var(--scale-ratio, 1)); width: 0; height: 0; border-left: calc(40px * var(--scale-ratio, 1)) solid transparent; border-right: calc(40px * var(--scale-ratio, 1)) solid transparent; border-bottom: calc(70px * var(--scale-ratio, 1)) solid rgba(239, 68, 68, 0.3); animation: tangram-fall-1 17s linear infinite;"
    ></SimpleBox>
    <SimpleBox
        class="tangram-shape tangram-small-triangle"
        style="position: absolute; left: 15%; top: calc(-25px * var(--scale-ratio, 1)); width: 0; height: 0; border-left: calc(30px * var(--scale-ratio, 1)) solid transparent; border-right: calc(30px * var(--scale-ratio, 1)) solid transparent; border-bottom: calc(50px * var(--scale-ratio, 1)) solid rgba(34, 197, 94, 0.3); animation: tangram-fall-2 19s linear infinite;"
    ></SimpleBox>

    <SimpleBox
        class="tangram-shape tangram-triangle-1"
        style="position: absolute; left: 80%; top: calc(-100px * var(--scale-ratio, 1)); width: 0; height: 0; border-left: calc(60px * var(--scale-ratio, 1)) solid transparent; border-right: calc(60px * var(--scale-ratio, 1)) solid transparent; border-bottom: calc(120px * var(--scale-ratio, 1)) solid rgba(99, 102, 241, 0.3); animation: tangram-fall-1 15s linear infinite; animation-delay: -10s;"
    ></SimpleBox>
    <SimpleBox
        class="tangram-shape tangram-triangle-2"
        style="position: absolute; left: 5%; top: calc(-80px * var(--scale-ratio, 1)); width: 0; height: 0; border-left: calc(50px * var(--scale-ratio, 1)) solid transparent; border-right: calc(50px * var(--scale-ratio, 1)) solid transparent; border-bottom: calc(100px * var(--scale-ratio, 1)) solid rgba(139, 92, 246, 0.3); animation: tangram-fall-2 18s linear infinite; animation-delay: -13s;"
    ></SimpleBox>
    <SimpleBox
        class="tangram-shape tangram-square"
        style="position: absolute; left: 35%; top: calc(-90px * var(--scale-ratio, 1)); width: calc(80px * var(--scale-ratio, 1)); height: calc(80px * var(--scale-ratio, 1)); background: rgba(16, 185, 129, 0.3); transform: rotate(45deg); animation: tangram-fall-4 22s linear infinite; animation-delay: -18s;"
    ></SimpleBox>
    <SimpleBox
        class="tangram-shape tangram-parallelogram"
        style="position: absolute; left: 60%; top: calc(-70px * var(--scale-ratio, 1)); width: calc(100px * var(--scale-ratio, 1)); height: calc(60px * var(--scale-ratio, 1)); background: rgba(245, 158, 11, 0.3); transform: skew(-20deg); animation: tangram-fall-5 25s linear infinite; animation-delay: -20s;"
    ></SimpleBox>
    <SimpleBox
        class="tangram-shape tangram-medium-triangle"
        style="position: absolute; left: 20%; top: calc(-85px * var(--scale-ratio, 1)); width: 0; height: 0; border-left: calc(40px * var(--scale-ratio, 1)) solid transparent; border-right: calc(40px * var(--scale-ratio, 1)) solid transparent; border-bottom: calc(70px * var(--scale-ratio, 1)) solid rgba(239, 68, 68, 0.3); animation: tangram-fall-1 17s linear infinite; animation-delay: -16s;"
    ></SimpleBox>
    <SimpleBox
        class="tangram-shape tangram-small-triangle"
        style="position: absolute; left: 75%; top: calc(-75px * var(--scale-ratio, 1)); width: 0; height: 0; border-left: calc(30px * var(--scale-ratio, 1)) solid transparent; border-right: calc(30px * var(--scale-ratio, 1)) solid transparent; border-bottom: calc(50px * var(--scale-ratio, 1)) solid rgba(34, 197, 94, 0.3); animation: tangram-fall-2 19s linear infinite; animation-delay: -22s;"
    ></SimpleBox>

    <SimpleBox
        class="tangram-shape tangram-triangle-3"
        style="position: absolute; left: 50%; top: calc(-120px * var(--scale-ratio, 1)); width: 0; height: 0; border-left: calc(40px * var(--scale-ratio, 1)) solid transparent; border-right: calc(40px * var(--scale-ratio, 1)) solid transparent; border-bottom: calc(80px * var(--scale-ratio, 1)) solid rgba(59, 130, 246, 0.3); animation: tangram-fall-3 20s linear infinite; animation-delay: -25s;"
    ></SimpleBox>
    <SimpleBox
        class="tangram-shape tangram-square"
        style="position: absolute; left: 12%; top: calc(-110px * var(--scale-ratio, 1)); width: calc(80px * var(--scale-ratio, 1)); height: calc(80px * var(--scale-ratio, 1)); background: rgba(16, 185, 129, 0.3); transform: rotate(45deg); animation: tangram-fall-4 22s linear infinite; animation-delay: -28s;"
    ></SimpleBox>
    <SimpleBox
        class="tangram-shape tangram-parallelogram"
        style="position: absolute; left: 88%; top: calc(-95px * var(--scale-ratio, 1)); width: calc(100px * var(--scale-ratio, 1)); height: calc(60px * var(--scale-ratio, 1)); background: rgba(245, 158, 11, 0.3); transform: skew(-20deg); animation: tangram-fall-5 25s linear infinite; animation-delay: -30s;"
    ></SimpleBox>
</ResponsiveBox>

<style>
    /* 七巧板动画定义 */
    @keyframes tangram-fall-1 {
        0% {
            transform: translateY(calc(-200px * var(--scale-ratio, 1))) rotate(calc(15deg * var(--scale-ratio, 1)));
            opacity: 0;
        }
        5% {
            opacity: 0.8;
        }
        95% {
            opacity: 0.8;
        }
        100% {
            transform: translateY(calc(120vh * var(--scale-ratio, 1))) rotate(calc(375deg * var(--scale-ratio, 1)));
            opacity: 0;
        }
    }

    @keyframes tangram-fall-2 {
        0% {
            transform: translateY(calc(-250px * var(--scale-ratio, 1))) rotate(calc(-20deg * var(--scale-ratio, 1)));
            opacity: 0;
        }
        8% {
            opacity: 0.7;
        }
        92% {
            opacity: 0.7;
        }
        100% {
            transform: translateY(calc(120vh * var(--scale-ratio, 1))) rotate(calc(340deg * var(--scale-ratio, 1)));
            opacity: 0;
        }
    }

    @keyframes tangram-fall-3 {
        0% {
            transform: translateY(calc(-300px * var(--scale-ratio, 1))) rotate(calc(45deg * var(--scale-ratio, 1)));
            opacity: 0;
        }
        6% {
            opacity: 0.9;
        }
        94% {
            opacity: 0.9;
        }
        100% {
            transform: translateY(calc(120vh * var(--scale-ratio, 1))) rotate(calc(405deg * var(--scale-ratio, 1)));
            opacity: 0;
        }
    }

    @keyframes tangram-fall-4 {
        0% {
            transform: translateY(calc(-350px * var(--scale-ratio, 1))) skew(calc(-20deg * var(--scale-ratio, 1)));
            opacity: 0;
        }
        10% {
            opacity: 0.6;
        }
        90% {
            opacity: 0.6;
        }
        100% {
            transform: translateY(calc(120vh * var(--scale-ratio, 1))) skew(calc(-20deg * var(--scale-ratio, 1)));
            opacity: 0;
        }
    }

    @keyframes tangram-fall-5 {
        0% {
            transform: translateY(calc(-280px * var(--scale-ratio, 1))) rotate(calc(30deg * var(--scale-ratio, 1)));
            opacity: 0;
        }
        7% {
            opacity: 0.8;
        }
        93% {
            opacity: 0.8;
        }
        100% {
            transform: translateY(calc(120vh * var(--scale-ratio, 1))) rotate(calc(390deg * var(--scale-ratio, 1)));
            opacity: 0;
        }
    }

    @keyframes tangram-fall-6 {
        0% {
            transform: translateY(0) rotate(calc(-45deg * var(--scale-ratio, 1)));
            opacity: 0;
        }
        5% {
            opacity: 0.7;
        }
        95% {
            opacity: 0.7;
        }
        100% {
            transform: translateY(calc(120vh * var(--scale-ratio, 1))) rotate(calc(315deg * var(--scale-ratio, 1)));
            opacity: 0;
        }
    }

    @keyframes tangram-fall-7 {
        0% {
            transform: translateY(0) rotate(calc(60deg * var(--scale-ratio, 1)));
            opacity: 0;
        }
        8% {
            opacity: 0.9;
        }
        92% {
            opacity: 0.9;
        }
        100% {
            transform: translateY(calc(120vh * var(--scale-ratio, 1))) rotate(calc(420deg * var(--scale-ratio, 1)));
            opacity: 0;
        }
    }
</style>
