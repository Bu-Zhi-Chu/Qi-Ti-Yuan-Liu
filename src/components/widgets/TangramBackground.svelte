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
