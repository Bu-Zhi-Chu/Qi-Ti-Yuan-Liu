<script lang="ts">
    import ResponsiveBox from '../core/ResponsiveBox.svelte'
    import * as THREE from 'three'
    import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
    import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
    import { onMount } from 'svelte'
    import { getNodePropsStore } from '../../services/parser/property-panel.service'

    type PbrMaterial = THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial

    function makePipeMaterial(options?: { color?: THREE.ColorRepresentation; emissive?: THREE.ColorRepresentation; attenuationColor?: THREE.ColorRepresentation; specularColor?: THREE.ColorRepresentation; fresnelColor?: THREE.ColorRepresentation }) {
        const color = options?.color ?? 0x0088aa
        const emissive = options?.emissive ?? 0x004455
        const attenuationColor = options?.attenuationColor ?? 0x00eeff
        const specularColor = options?.specularColor ?? 0xd7f2ff
        const fresnelColor = options?.fresnelColor ?? 0x00ffff

        const mat = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color(color),
            emissive: new THREE.Color(emissive),
            emissiveIntensity: 0.2,
            transparent: true,
            opacity: 0.5,
            metalness: 0.6,
            roughness: 0.5,
            transmission: 0.4,
            thickness: 0.22,
            ior: 1.52,
            attenuationColor: new THREE.Color(attenuationColor),
            attenuationDistance: 10,
            clearcoat: 0.1,
            clearcoatRoughness: 0.5,
            specularIntensity: 0.5,
            specularColor: new THREE.Color(specularColor),
            envMapIntensity: 0.8,
            side: THREE.DoubleSide
        })

        mat.onBeforeCompile = (shader) => {
            shader.uniforms.uFresnelColor = { value: new THREE.Color(fresnelColor) }
            shader.uniforms.uFresnelPower = { value: 2.0 }
            shader.uniforms.uFresnelIntensity = { value: 1.5 }

            shader.fragmentShader =
                `
                uniform vec3 uFresnelColor;
                uniform float uFresnelPower;
                uniform float uFresnelIntensity;
            ` + shader.fragmentShader

            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <emissivemap_fragment>',
                `
                #include <emissivemap_fragment>

                vec3 viewDir = normalize(-vViewPosition);
                float fresnel = pow(1.0 - abs(dot(normal, viewDir)), uFresnelPower);
                totalEmissiveRadiance += uFresnelColor * fresnel * uFresnelIntensity;
                `
            )
        }

        return mat
    }

    interface Props {
        id?: string
        style?: string
        [key: string]: any
    }

    let { id = crypto.randomUUID(), style = '', ...rest }: Props = $props()

    let containerRef: HTMLDivElement | null = null
    let renderer: THREE.WebGLRenderer | null = null
    let scene: THREE.Scene | null = null
    let camera: THREE.PerspectiveCamera | null = null
    let rootGroup: THREE.Group | null = null
    let controls: OrbitControls | null = null
    let raf = 0
    let resizeObserver: ResizeObserver | null = null
    let ready = false
    const tunnelClipPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    let tunnelBorderFlowMats: THREE.ShaderMaterial[] = []
    let environmentTexture: THREE.Texture | null = null

    function initScene() {
        if (!containerRef) return

        const rect = containerRef.getBoundingClientRect()
        const width = Math.max(1, rect.width)
        const height = Math.max(1, rect.height)

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
        renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
        renderer.setSize(width, height, false)
        renderer.localClippingEnabled = true
        renderer.outputColorSpace = THREE.SRGBColorSpace
        renderer.toneMapping = THREE.ACESFilmicToneMapping
        renderer.toneMappingExposure = 1.25
        renderer.setClearColor(0x0a1427, 0)
        containerRef.appendChild(renderer.domElement)

        scene = new THREE.Scene()
        scene.background = null
        camera = new THREE.PerspectiveCamera(25, width / height, 0.1, 1000)
        camera.position.set(0, 32, 50) // Increased distance to compensate for lower FOV
        camera.lookAt(0, 0, 0)

        const pmrem = new THREE.PMREMGenerator(renderer)
        environmentTexture?.dispose()
        environmentTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
        pmrem.dispose()
        scene.environment = environmentTexture

        const ambient = new THREE.AmbientLight(0xffffff, 0.25)
        scene.add(ambient)

        const hemi = new THREE.HemisphereLight(0x36c4ed, 0x050b17, 0.95)
        scene.add(hemi)

        const keyLight = new THREE.DirectionalLight(0xffffff, 1.35)
        keyLight.position.set(6, 10, 6)
        scene.add(keyLight)

        const fillLight = new THREE.DirectionalLight(0x22b3df, 0.75)
        fillLight.position.set(-6, 3, -4)
        scene.add(fillLight)

        const rimLight = new THREE.PointLight(0x36c4ed, 1.35, 40)
        rimLight.position.set(-2, 5.5, -8)
        scene.add(rimLight)

        rootGroup = new THREE.Group()
        scene.add(rootGroup)

        buildFixedScene()

        controls = new OrbitControls(camera, renderer.domElement)
        controls.enableDamping = true
        controls.dampingFactor = 0.08
        controls.enablePan = false
        controls.enableZoom = true
        controls.mouseButtons = {
            LEFT: THREE.MOUSE.PAN,
            MIDDLE: THREE.MOUSE.PAN,
            RIGHT: THREE.MOUSE.ROTATE
        }
        controls.target.set(0, 0, 0)
        controls.update()

        setupResizeObserver()
        ready = true
        animate()
    }

    function disposeObject(obj: THREE.Object3D) {
        const mesh = obj as THREE.Mesh
        if (mesh.geometry) {
            ;(mesh.geometry as THREE.BufferGeometry).dispose()
        }
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined
        if (mat) {
            if (Array.isArray(mat)) {
                mat.forEach((m) => m.dispose())
            } else {
                mat.dispose()
            }
        }
    }

    function clearRootGroup() {
        if (!rootGroup) return
        const children = [...rootGroup.children]
        for (const child of children) {
            child.traverse((obj) => disposeObject(obj))
            rootGroup.remove(child)
        }
    }

    function makeChamferedCylinderGeometry(radius: number, length: number, chamfer: number) {
        const safeChamfer = Math.max(0, Math.min(chamfer, radius * 0.45, length * 0.45))
        if (safeChamfer <= 0) {
            return new THREE.CylinderGeometry(radius, radius, length, 64, 1, true)
        }

        const halfL = length / 2
        const r0 = Math.max(0, radius - safeChamfer)

        const profile = [new THREE.Vector2(r0, -halfL), new THREE.Vector2(radius, -halfL + safeChamfer), new THREE.Vector2(radius, halfL - safeChamfer), new THREE.Vector2(r0, halfL)]

        const geom = new THREE.LatheGeometry(profile, 96)
        geom.computeVertexNormals()
        return geom
    }

    function addStraightPipe(material: PbrMaterial): THREE.Mesh {
        const radius = 1.1
        const length = 6
        const geo = makeChamferedCylinderGeometry(radius, length, 0.06)
        const mesh = new THREE.Mesh(geo, material)
        mesh.rotation.z = Math.PI / 2
        return mesh
    }

    function addTPipe(material: PbrMaterial): THREE.Group {
        const group = new THREE.Group()

        const mainRadius = 1.1
        const mainLength = 5
        const branchRadius = 0.95
        const branchLength = 9

        const mainGeo = makeChamferedCylinderGeometry(mainRadius, mainLength, 0.05)
        const mainMesh = new THREE.Mesh(mainGeo, material)
        mainMesh.rotation.z = Math.PI / 2
        mainMesh.position.set(0, 0, 0)
        group.add(mainMesh)

        const branchGeo = makeChamferedCylinderGeometry(branchRadius, branchLength, 0.04)
        const branchMesh = new THREE.Mesh(branchGeo, material)
        branchMesh.rotation.x = Math.PI / 2
        branchMesh.position.set(0, 0, branchLength / 2)
        group.add(branchMesh)

        return group
    }

    function buildBorderStripGeometry(points: THREE.Vector3[], width: number) {
        const pts = points.length >= 2 ? points : []
        const n = pts.length
        const positions: number[] = []
        const uvs: number[] = []
        const indices: number[] = []
        if (n < 3) return new THREE.BufferGeometry()

        const segLens: number[] = new Array(n).fill(0)
        let total = 0
        for (let i = 0; i < n; i++) {
            const a = pts[i]
            const b = pts[i === n - 1 ? 0 : i + 1]
            const len = a.distanceTo(b)
            segLens[i] = len
            total += len
        }
        const halfW = width / 2
        let acc = 0
        for (let i = 0; i <= n; i++) {
            const iWrapped = i === n ? 0 : i
            const pPrev = pts[iWrapped === 0 ? n - 1 : iWrapped - 1]
            const p = pts[iWrapped]
            const pNext = pts[iWrapped === n - 1 ? 0 : iWrapped + 1]

            const tangent = pNext.clone().sub(pPrev)
            tangent.y = 0
            if (tangent.lengthSq() < 1e-6) tangent.set(1, 0, 0)
            tangent.normalize()
            const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize()

            const left = p.clone().addScaledVector(normal, halfW)
            const right = p.clone().addScaledVector(normal, -halfW)

            const u = total > 0 ? acc / total : 0

            positions.push(left.x, left.y, left.z, right.x, right.y, right.z)
            uvs.push(u, 0, u, 1)

            if (i < n) acc += segLens[i]
        }

        for (let i = 0; i < n; i++) {
            const iNext = i + 1
            const a = i * 2
            const b = i * 2 + 1
            const c = iNext * 2
            const d = iNext * 2 + 1
            indices.push(a, b, c, b, d, c)
        }

        const geom = new THREE.BufferGeometry()
        geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
        geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
        geom.setIndex(indices)
        geom.computeVertexNormals()
        return geom
    }

    function makeFlowBorderMaterial(color: THREE.Color) {
        const mat = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uColor: { value: color },
                uSpeed: { value: 0.55 },
                uRepeat: { value: 2 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float uTime;
                uniform vec3 uColor;
                uniform float uSpeed;
                uniform float uRepeat;
                varying vec2 vUv;

                float band(float x, float a, float b) {
                    return smoothstep(a, a + 0.06, x) * (1.0 - smoothstep(b - 0.06, b, x));
                }

                void main() {
                    float u = vUv.x * uRepeat;
                    float t = fract(u - uTime * uSpeed);
                    float pulse = band(t, 0.00, 0.44);
                    float core = band(t, 0.06, 0.30);
                    float width = pow(max(0.0, 1.0 - abs(vUv.y - 0.5) * 2.0), 2.2);
                    float glow = 0.18 + 0.65 * pulse + 1.15 * core;
                    float alpha = glow * width;
                    vec3 col = uColor * (0.55 + 1.45 * core + 0.65 * pulse);
                    gl_FragColor = vec4(col, alpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide
        })
        return mat
    }

    function addTunnel(material: PbrMaterial): THREE.Group {
        const group = new THREE.Group()

        const outerRadiusY = 3.15
        const outerRadiusZ = 2.85
        const innerRadiusY = 2.15
        const innerRadiusZ = 1.95
        const length = 6

        const outerShape = new THREE.Shape()
        outerShape.absellipse(0, 0, outerRadiusZ, outerRadiusY, 0, Math.PI * 2, false, 0)
        const hole = new THREE.Path()
        hole.absellipse(0, 0, innerRadiusZ, innerRadiusY, 0, Math.PI * 2, false, 0)
        outerShape.holes.push(hole)

        const tunnelGeo = new THREE.ExtrudeGeometry(outerShape, {
            depth: length,
            bevelEnabled: true,
            bevelThickness: 0.05,
            bevelSize: 0.05,
            bevelOffset: 0,
            bevelSegments: 3,
            steps: 1,
            curveSegments: 128
        })
        tunnelGeo.translate(0, 0, -length / 2)
        tunnelGeo.rotateY(Math.PI / 2)
        tunnelGeo.computeVertexNormals()

        const tunnelMat = material.clone() as THREE.MeshPhysicalMaterial
        tunnelMat.clippingPlanes = [tunnelClipPlane]
        tunnelMat.opacity = 0.7
        tunnelMat.transmission = 0.25

        const tunnelMesh = new THREE.Mesh(tunnelGeo, tunnelMat)
        tunnelMesh.position.set(0, 0.55, 0)
        group.add(tunnelMesh)

        const groundSize = 7
        const groundGeo = new THREE.PlaneGeometry(groundSize, groundSize)
        const groundMat = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color(0x143a67),
            roughness: 0.8,
            metalness: 0,
            transmission: 0,
            thickness: 0.08,
            ior: 1.45,
            attenuationColor: new THREE.Color(0x36c4ed),
            attenuationDistance: 22,
            clearcoat: 0,
            clearcoatRoughness: 1,
            envMapIntensity: 0.2,
            side: THREE.FrontSide,
            transparent: true,
            opacity: 0.15,
            depthWrite: false
        })
        const groundMesh = new THREE.Mesh(groundGeo, groundMat)
        groundMesh.rotation.x = -Math.PI / 2
        groundMesh.position.set(0, 0, 0)
        group.add(groundMesh)

        const half = groundSize / 2
        const borderY = 0.012
        const borderPoints = [new THREE.Vector3(-half, borderY, -half), new THREE.Vector3(half, borderY, -half), new THREE.Vector3(half, borderY, half), new THREE.Vector3(-half, borderY, half)]
        const borderGeo = buildBorderStripGeometry(borderPoints, 0.22)
        const borderMat = makeFlowBorderMaterial(new THREE.Color(0x36c4ed))
        const borderMesh = new THREE.Mesh(borderGeo, borderMat)
        group.add(borderMesh)

        tunnelBorderFlowMats.push(borderMat)

        return group
    }

    function buildFixedScene() {
        if (!rootGroup) return
        tunnelBorderFlowMats = []
        clearRootGroup()

        const mat = makePipeMaterial()
        const tPipeMat = makePipeMaterial({
            color: 0x8b0000,
            emissive: 0x500000,
            attenuationColor: 0xff4d4d,
            specularColor: 0xffcccc,
            fresnelColor: 0xff4d4d
        })

        // Layout: Tunnel 1 -> Straight -> T1 -> Straight -> T2 -> Straight -> Tunnel 2
        // X positions: -14, -9, -4.5, 0, 4.5, 9, 14
        const pipeLiftY = 0.9

        // Tunnel 1 (Left)
        const t1 = addTunnel(mat)
        t1.scale.set(0.85, 0.85, 0.85)
        t1.position.set(-14, 0, 0)
        rootGroup.add(t1)

        // Straight 1
        const s1 = addStraightPipe(mat)
        s1.position.set(-11, pipeLiftY, 0)
        rootGroup.add(s1)

        // T1
        const tp1 = addTPipe(tPipeMat)
        tp1.position.set(-5.5, pipeLiftY, 0)
        tp1.rotation.x = -Math.PI / 4
        rootGroup.add(tp1)

        // Straight 2
        const s2 = addStraightPipe(mat)
        s2.position.set(0, pipeLiftY, 0)
        rootGroup.add(s2)

        // T2
        const tp2 = addTPipe(tPipeMat)
        tp2.position.set(5.5, pipeLiftY, 0)
        tp2.rotation.x = -Math.PI / 4
        rootGroup.add(tp2)

        // Straight 3
        const s3 = addStraightPipe(mat)
        s3.position.set(11, pipeLiftY, 0)
        rootGroup.add(s3)

        // Tunnel 2 (Right)
        const t2 = addTunnel(mat)
        t2.scale.set(1.25, 1.25, 1.25)
        // Original ground Y is at 0. Scaling by 1.5 scales from (0,0,0) center?
        // addTunnel creates group. groundMesh is at (0,0,0).
        // If we scale the whole group, the ground plane at y=0 stays at y=0.
        // But the tunnel mesh is at y=0.55. Scaled y will be 0.55 * 1.5 = 0.825.
        // The visual ground level should remain 0 because the scaling origin is (0,0,0) of the group.
        // Wait, scaling origin is the group's position.
        // Let's verify addTunnel structure.
        t2.position.set(14, 0, 0)
        rootGroup.add(t2)
    }

    function setupResizeObserver() {
        if (!containerRef) return
        resizeObserver = new ResizeObserver((entries) => {
            if (!renderer || !camera) return
            for (const entry of entries) {
                const rect = entry.contentRect
                const width = Math.max(1, rect.width)
                const height = Math.max(1, rect.height)
                renderer.setSize(width, height, false)
                camera.aspect = width / height
                camera.updateProjectionMatrix()
            }
        })
        resizeObserver.observe(containerRef)
    }

    function animate(_time = 0) {
        if (!renderer || !scene || !camera) return
        raf = requestAnimationFrame(animate)

        const t = _time * 0.001
        for (const mat of tunnelBorderFlowMats) {
            mat.uniforms.uTime.value = t
        }

        controls?.update()
        renderer.render(scene, camera)
    }

    function dispose() {
        cancelAnimationFrame(raf)
        resizeObserver?.disconnect()
        resizeObserver = null
        controls?.dispose()
        controls = null

        if (scene) {
            scene.traverse((obj) => {
                const mesh = obj as THREE.Mesh
                if (mesh.geometry) {
                    mesh.geometry.dispose()
                }
                const mat = mesh.material as THREE.Material | THREE.Material[] | undefined
                if (mat) {
                    if (Array.isArray(mat)) {
                        mat.forEach((m) => m.dispose())
                    } else {
                        mat.dispose()
                    }
                }
            })
        }

        if (renderer) {
            renderer.dispose()
            if (renderer.domElement.parentElement) {
                renderer.domElement.parentElement.removeChild(renderer.domElement)
            }
        }

        renderer = null
        scene = null
        camera = null
        rootGroup = null
        ready = false
        tunnelBorderFlowMats = []
        environmentTexture?.dispose()
        environmentTexture = null
    }

    onMount(() => {
        initScene()
        return () => {
            dispose()
        }
    })
</script>

<ResponsiveBox {id} {style} {...rest}>
    <div class="tunnel-pipe-root" bind:this={containerRef}></div>
</ResponsiveBox>

<style>
    .tunnel-pipe-root {
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: transparent;
    }
</style>
