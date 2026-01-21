<script lang="ts">
    import ResponsiveBox from '../core/ResponsiveBox.svelte'
    import * as THREE from 'three'
    import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
    import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
    import { onMount } from 'svelte'
    import { getNodePropsStore, updateNodeProps } from '../../services/parser/property-panel.service'
    import { Evaluator, Brush, ADDITION } from 'three-bvh-csg'

    type PbrMaterial = THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial

    function makePipeMaterial(options?: { color?: THREE.ColorRepresentation; emissive?: THREE.ColorRepresentation; attenuationColor?: THREE.ColorRepresentation; specularColor?: THREE.ColorRepresentation; fresnelColor?: THREE.ColorRepresentation; fresnelAlpha?: boolean; side?: THREE.Side }) {
        const color = options?.color ?? 0x0088aa
        const emissive = options?.emissive ?? 0x004455
        const attenuationColor = options?.attenuationColor ?? 0x00eeff
        const specularColor = options?.specularColor ?? 0xd7f2ff
        const fresnelColor = options?.fresnelColor ?? 0x00ffff
        const fresnelAlpha = options?.fresnelAlpha ?? false
        const side = options?.side ?? THREE.DoubleSide

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
            side: side
        })

        mat.onBeforeCompile = (shader) => {
            shader.uniforms.uFresnelColor = { value: new THREE.Color(fresnelColor) }
            shader.uniforms.uFresnelPower = { value: 0.8 }
            shader.uniforms.uFresnelIntensity = { value: 2.0 }
            shader.uniforms.uFresnelAlpha = { value: fresnelAlpha ? 1.0 : 0.0 }

            shader.fragmentShader =
                `
                uniform vec3 uFresnelColor;
                uniform float uFresnelPower;
                uniform float uFresnelIntensity;
                uniform float uFresnelAlpha;
            ` + shader.fragmentShader

            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <emissivemap_fragment>',
                `
                #include <emissivemap_fragment>

                vec3 viewDir = normalize(-vViewPosition);
                float fresnelTerm = 1.0 - abs(dot(normal, viewDir));
                float fresnel = pow(fresnelTerm, uFresnelPower);

                // Add fresnel color
                totalEmissiveRadiance += uFresnelColor * fresnel * uFresnelIntensity;

                // Modulate alpha if enabled
                // Make center more transparent (fresnel is 0 at center, 1 at edge)
                // We keep some base opacity (0.15) and ramp up to full opacity at edges
                if (uFresnelAlpha > 0.5) {
                    float centerDim = 0.05 + 0.95 * fresnel;
                    diffuseColor.a *= centerDim;
                    // Also darken the color at the center to ensure it looks "dark/black"
                    diffuseColor.rgb *= (0.2 + 0.8 * fresnel);
                }
                `
            )
        }

        return mat
    }

    interface Props {
        id?: string
        style?: string
        currentView?: boolean
        initCameraPosition?: [number, number, number]
        initTargetPosition?: [number, number, number]
        disablePan?: boolean
        disableZoom?: boolean
        disableRotate?: boolean
        [key: string]: any
    }

    let { id = crypto.randomUUID(), style = '', currentView = false, initCameraPosition, initTargetPosition, disablePan = false, disableZoom = false, disableRotate = false, ...rest }: Props = $props()

    let containerRef: HTMLDivElement | null = null
    let renderer: THREE.WebGLRenderer | null = null
    let scene: THREE.Scene | null = null
    let camera: THREE.PerspectiveCamera | null = null
    let rootGroup: THREE.Group | null = null
    let controls: OrbitControls | null = $state(null)
    let raf = 0
    let resizeObserver: ResizeObserver | null = null
    let ready = false
    const tunnelClipPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    let tunnelBorderFlowMats: THREE.ShaderMaterial[] = []
    let arrowFlowMats: THREE.ShaderMaterial[] = []
    let textLabels: THREE.Mesh[] = []
    let billboardGroups: THREE.Group[] = []
    let tunnelAnimators: ((time: number) => void)[] = []
    let canvasRef: HTMLCanvasElement
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
        if (initCameraPosition) {
            camera.position.set(...initCameraPosition)
        } else {
            camera.position.set(0, 32, 50) // Increased distance to compensate for lower FOV
        }
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
        controls.enablePan = !disablePan
        controls.enableZoom = !disableZoom
        controls.enableRotate = !disableRotate
        controls.mouseButtons = {
            LEFT: THREE.MOUSE.PAN,
            MIDDLE: THREE.MOUSE.PAN,
            RIGHT: THREE.MOUSE.ROTATE
        }
        if (initTargetPosition) {
            controls.target.set(...initTargetPosition)
        } else {
            controls.target.set(0, 0, 0)
        }
        controls.update()

        setupResizeObserver()
        ready = true
        animate()
    }

    $effect(() => {
        if (controls) {
            controls.enablePan = !disablePan
            controls.enableZoom = !disableZoom
            controls.enableRotate = !disableRotate
            controls.update()
        }
    })

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
        tunnelBorderFlowMats = []
        tunnelAnimators = []
        arrowFlowMats = []
        billboardGroups = []
    }

    function makeArrowFlowMaterial(color: THREE.ColorRepresentation, speed: number = 2.0) {
        const mat = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uColor: { value: new THREE.Color(color) },
                uSpeed: { value: speed },
                uRepeatX: { value: 6.0 },
                uRepeatY: { value: 4.0 }
            },
            transparent: true,
            side: THREE.FrontSide, // Render outside of the inner cylinder
            depthWrite: false,
            blending: THREE.AdditiveBlending,
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
                uniform float uRepeatX;
                uniform float uRepeatY;
                varying vec2 vUv;

                void main() {
                    vec2 uv = vUv;
                    uv.x *= uRepeatX;
                    uv.y *= uRepeatY;

                    // Flow animation
                    uv.y -= uTime * uSpeed;

                    vec2 cell = fract(uv);

                    // Arrow shape logic
                    // Center the x coordinate
                    float x = abs(cell.x - 0.5);
                    // V-shape
                    // We want arrow pointing along flow direction (which is negative y direction in texture space if we subtract time)
                    // If uv.y decreases, textures move UP.
                    // Let's make an arrow pointing in the flow direction.

                    // Simple Chevron: y = x
                    // cell.y > x && cell.y < x + thickness
                    float thickness = 0.15;
                    float shape = step(x, cell.y) * step(cell.y, x + thickness);

                    // Fade edges
                    // shape *= smoothstep(0.45, 0.4, x); // Fade sides

                    float alpha = shape;

                    // Make it look nicer
                    // A brighter core
                    float core = step(x, cell.y - 0.05) * step(cell.y - 0.05, x + thickness - 0.05);

                    vec3 finalColor = uColor;
                    if (core > 0.5) {
                        finalColor += vec3(0.5); // Add white to core
                    }

                    gl_FragColor = vec4(finalColor, alpha * 0.8);
                }
            `
        })
        arrowFlowMats.push(mat)
        return mat
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

        const pipeMat = material.clone() as THREE.MeshPhysicalMaterial
        pipeMat.opacity = 0.8
        pipeMat.transmission = 0.25

        const mesh = new THREE.Mesh(geo, pipeMat)
        mesh.rotation.z = Math.PI / 2

        // Add internal flow
        const flowRadius = radius * 0.7
        const flowGeo = new THREE.CylinderGeometry(flowRadius, flowRadius, length, 32, 1, true)
        const flowMat = makeArrowFlowMaterial(0x00ffff, 1.5)
        const flowMesh = new THREE.Mesh(flowGeo, flowMat)
        // Cylinder is Y-up, mesh is Z-up (rotated).
        // If we add flowMesh to mesh, flowMesh inherits rotation.
        // CylinderGeometry is along Y. mesh is rotated Z=90.
        // So mesh local Y is world -X.
        // We want flow along cylinder axis.
        // So flowMesh should just be aligned with mesh geometry.
        // But `mesh` has rotation.z = PI/2.
        // The geometry of `mesh` (Lathe) is effectively along Y (profile defined along Y) then lathed around Y.
        // Wait, LatheGeometry revolves around Y. My profile points are (r, -h/2) to (r, h/2). So it is Y-aligned.
        // So mesh.rotation.z = PI/2 makes it X-aligned.
        // CylinderGeometry is Y-aligned.
        // So if we add flowMesh as child of mesh, we just need flowMesh to be standard orientation (Y-aligned).
        flowMesh.rotation.set(0, 0, 0)
        mesh.add(flowMesh)

        return mesh
    }

    function addTPipe(material: PbrMaterial): THREE.Group {
        const group = new THREE.Group()

        const mainRadius = 1.1
        const mainLength = 5
        const branchRadius = 0.95
        const branchLength = 9

        const mainGeo = makeChamferedCylinderGeometry(mainRadius, mainLength, 0.05)
        const branchGeo = makeChamferedCylinderGeometry(branchRadius, branchLength, 0.04)

        // Use CSG to merge geometries to avoid internal intersection artifacts
        const mainBrush = new Brush(mainGeo)
        mainBrush.rotation.z = Math.PI / 2
        mainBrush.position.set(0, 0, 0)
        mainBrush.updateMatrixWorld()

        const branchBrush = new Brush(branchGeo)
        branchBrush.rotation.x = Math.PI / 2
        branchBrush.position.set(0, 0, branchLength / 2)
        branchBrush.updateMatrixWorld()

        const evaluator = new Evaluator()
        // Use ADDITION to merge them into a single shell
        const result = evaluator.evaluate(mainBrush, branchBrush, ADDITION)

        result.material = material
        result.castShadow = true
        result.receiveShadow = true

        group.add(result)

        // Add internal flow
        // Main flow
        const mainFlowRadius = mainRadius * 0.7
        const mainFlowGeo = new THREE.CylinderGeometry(mainFlowRadius, mainFlowRadius, mainLength, 32, 1, true)
        const mainFlowMat = makeArrowFlowMaterial(0xff0000, 1.5) // Red flow for T-pipe
        const mainFlowMesh = new THREE.Mesh(mainFlowGeo, mainFlowMat)
        // Main pipe was rotated Z=90
        mainFlowMesh.rotation.z = Math.PI / 2
        mainFlowMesh.position.set(0, 0, 0)
        group.add(mainFlowMesh)

        // Branch flow
        const branchFlowRadius = branchRadius * 0.7
        const branchFlowGeo = new THREE.CylinderGeometry(branchFlowRadius, branchFlowRadius, branchLength, 32, 1, true)
        const branchFlowMat = makeArrowFlowMaterial(0xff0000, 1.5)
        const branchFlowMesh = new THREE.Mesh(branchFlowGeo, branchFlowMat)
        // Branch pipe was rotated X=90
        branchFlowMesh.rotation.x = Math.PI / 2
        branchFlowMesh.position.set(0, 0, branchLength / 2)
        group.add(branchFlowMesh)

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

    function makeFlowBorderMaterial(color: THREE.Color, offset: number = 0) {
        const mat = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uColor: { value: color },
                uSpeed: { value: 0.55 },
                uRepeat: { value: 2 },
                uOpacity: { value: 1.0 },
                uOffset: { value: offset }
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
                uniform float uOpacity;
                uniform float uOffset;
                varying vec2 vUv;

                float band(float x, float a, float b) {
                    return smoothstep(a, a + 0.06, x) * (1.0 - smoothstep(b - 0.06, b, x));
                }

                void main() {
                    float u = vUv.x * uRepeat;
                    float t = fract(u - (uTime + uOffset) * uSpeed);
                    float pulse = band(t, 0.00, 0.44);
                    float core = band(t, 0.06, 0.30);

                    // Edge fade for width
                    float width = pow(max(0.0, 1.0 - abs(vUv.y - 0.5) * 2.0), 1.5);

                    // Intensities
                    float baseIntensity = 0.8;
                    float flowIntensity = 1.5 * pulse + 2.5 * core;

                    // Calculate final color directly for AdditiveBlending
                    vec3 finalColor = uColor * (baseIntensity + flowIntensity);

                    // Add white core highlight
                    finalColor += vec3(1.0) * core * 0.6;

                    // Apply width and opacity
                    finalColor *= width * uOpacity;

                    gl_FragColor = vec4(finalColor, 1.0);
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide
        })
        return mat
    }

    // Arrow Animation State
    interface ArrowSystem {
        mesh: THREE.InstancedMesh
        curve: THREE.Curve<THREE.Vector3>
        speed: number
        count: number
    }
    let arrowSystems: ArrowSystem[] = []

    function createArrowGeometry() {
        const shape = new THREE.Shape()

        // Arrow dimensions - flatter and wider like the image
        // Scaled up by 1.5 (current + 0.5 scale)
        const scale = 1.5
        const shaftW = 0.06 * scale
        const headW = 0.2 * scale
        const shaftLen = 0.3 * scale
        const headLen = 0.3 * scale

        // Points for a arrow pointing to +X
        // Start from tail
        shape.moveTo(-shaftLen, shaftW)
        shape.lineTo(0, shaftW)
        shape.lineTo(0, headW)
        shape.lineTo(headLen, 0) // Tip
        shape.lineTo(0, -headW)
        shape.lineTo(0, -shaftW)
        shape.lineTo(-shaftLen, -shaftW)
        shape.lineTo(-shaftLen, shaftW) // Close

        const geometry = new THREE.ExtrudeGeometry(shape, {
            depth: 0.04, // Flat thickness
            bevelEnabled: true,
            bevelThickness: 0.01,
            bevelSize: 0.01,
            bevelSegments: 2
        })

        // Rotate to point to +Z (Currently points to +X because shape is in XY)
        // Extrude creates depth along Z, so the shape is flat on XY plane.
        // We want the arrow to fly along Z axis.
        // Rotating -90 deg around Y will make +X point to +Z.
        geometry.rotateY(-Math.PI / 2)

        // Rotate around Z to make it flat horizontal (face up/down)
        // After rotateY, the flat face is in YZ plane (Vertical). Normal is -X.
        // We want Normal to be +Y (Up).
        // Rotating -90 around Z will transform -X to +Y.
        geometry.rotateZ(-Math.PI / 2)

        return geometry
    }

    function createArrowSystem(curve: THREE.Curve<THREE.Vector3>, count: number, color: THREE.ColorRepresentation, speed: number = 0.5): ArrowSystem {
        const geometry = createArrowGeometry()

        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.9,
            depthTest: false, // Always visible
            depthWrite: false,
            blending: THREE.AdditiveBlending
        })

        const mesh = new THREE.InstancedMesh(geometry, material, count)
        mesh.renderOrder = 20 // Higher than pipe

        return { mesh, curve, speed, count }
    }

    function updateArrowSystems(dt: number, camera: THREE.Camera) {
        const time = Date.now() / 1000
        const dummy = new THREE.Object3D()

        arrowSystems.forEach((sys) => {
            const { mesh, curve, speed, count } = sys
            const curveLen = curve.getLength()

            // Distribute arrows evenly
            for (let i = 0; i < count; i++) {
                // Calculate phase (0 to 1) based on time and index
                // Offset each arrow by 1/count
                const offset = i / count

                // Move along curve
                // u goes from 0 to 1
                let u = (time * speed * (10 / curveLen) + offset) % 1.0

                const pos = curve.getPointAt(u)
                const tangent = curve.getTangentAt(u)

                dummy.position.copy(pos)

                // Axial Billboarding:
                // We want the arrow to point along the tangent (Z axis),
                // but rotate around that axis so its flat face (XZ plane, Normal Y) faces the camera.
                // dummy.lookAt uses dummy.up to determine the local Y axis orientation.
                // By setting dummy.up to the vector towards the camera, local Y will try to point to camera.
                dummy.up.subVectors(camera.position, pos)

                // orient the arrow along the tangent
                dummy.lookAt(pos.clone().add(tangent))

                dummy.updateMatrix()
                mesh.setMatrixAt(i, dummy.matrix)
            }
            mesh.instanceMatrix.needsUpdate = true
        })
    }

    function addFlowingArrows() {
        if (!rootGroup) return

        // Clear old systems
        arrowSystems = []

        const mainArrowColor = 0x00ffff // Cyan like image
        const branchArrowColor = 0xff9999 // Light Red / Salmon (Matched from image)
        const arrowSpeed = 0.35 // Moderate speed (was 0.5 -> 0.2 -> 0.35)

        // 1. Main Path (Horizontal along X)
        // REVERSED: From Right Tunnel (20) to Left Tunnel (-20)
        const mainPath = new THREE.LineCurve3(new THREE.Vector3(20, 0.9, 0), new THREE.Vector3(-20, 0.9, 0))
        // Length ~40.
        // Moderate count: 14 arrows (approx 1 per 2.8 units)
        const mainSys = createArrowSystem(mainPath, 14, mainArrowColor, arrowSpeed)
        rootGroup.add(mainSys.mesh)
        arrowSystems.push(mainSys)

        // 2. Branch Path 1 (From T1)
        const t1Center = new THREE.Vector3(-5.5, 0.9, 0)
        const angle = Math.PI / 4
        const dir = new THREE.Vector3(0, Math.sin(angle), Math.cos(angle))
        const branchLen = 9
        const t1End = t1Center.clone().add(dir.clone().multiplyScalar(branchLen))

        const branch1Path = new THREE.LineCurve3(t1Center, t1End)
        // Length 9. Moderate count: 3 arrows (approx 1 per 3 units)
        const branch1Sys = createArrowSystem(branch1Path, 3, branchArrowColor, arrowSpeed)
        rootGroup.add(branch1Sys.mesh)
        arrowSystems.push(branch1Sys)

        // 3. Branch Path 2 (From T2)
        const t2Center = new THREE.Vector3(5.5, 0.9, 0)
        const t2End = t2Center.clone().add(dir.clone().multiplyScalar(branchLen))

        const branch2Path = new THREE.LineCurve3(t2Center, t2End)
        const branch2Sys = createArrowSystem(branch2Path, 3, branchArrowColor, arrowSpeed)
        rootGroup.add(branch2Sys.mesh)
        arrowSystems.push(branch2Sys)
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
        tunnelMat.side = THREE.FrontSide
        tunnelMat.opacity = 0.8
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

        // Ground Animation Layers (Deep Scan Effect)
        // Create multiple transparent layers that move down and scale down
        const animLayerCount = 4
        const animLayers: { group: THREE.Group; materials: THREE.Material[] }[] = []
        // Use a simpler material for animation layers to reduce cost, or similar to groundMat
        // Using a basic material with additive blending for "light" effect
        const animLayerMat = new THREE.MeshBasicMaterial({
            color: 0x36c4ed,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        })

        const animLayerGeo = new THREE.PlaneGeometry(groundSize * 0.95, groundSize * 0.95)

        // Border geometry for animation layers
        const animHalf = (groundSize * 0.95) / 2
        // We need points on XZ plane for buildBorderStripGeometry
        const animBorderPoints = [new THREE.Vector3(-animHalf, 0, -animHalf), new THREE.Vector3(animHalf, 0, -animHalf), new THREE.Vector3(animHalf, 0, animHalf), new THREE.Vector3(-animHalf, 0, animHalf)]
        const animBorderGeo = buildBorderStripGeometry(animBorderPoints, 0.22)

        for (let i = 0; i < animLayerCount; i++) {
            const layerGroup = new THREE.Group()

            // Plane
            const plane = new THREE.Mesh(animLayerGeo, animLayerMat.clone())
            plane.rotation.x = -Math.PI / 2
            layerGroup.add(plane)

            // Border
            const borderMat = makeFlowBorderMaterial(new THREE.Color(0x36c4ed), Math.random() * 5.0)
            const border = new THREE.Mesh(animBorderGeo, borderMat)
            layerGroup.add(border)

            // Track for global updates (uTime)
            tunnelBorderFlowMats.push(borderMat)

            // Initial position (will be updated by animator)
            layerGroup.position.set(0, -0.05, 0)

            group.add(layerGroup)

            animLayers.push({
                group: layerGroup,
                materials: [plane.material as THREE.Material, borderMat]
            })
        }

        // Animation logic
        const cycleDuration = 4.0 // seconds
        const maxDepth = 3.0 // how far down it goes

        tunnelAnimators.push((time: number) => {
            animLayers.forEach((item, i) => {
                const { group, materials } = item
                // Staggered time for each layer
                const offset = (i / animLayerCount) * cycleDuration
                const t = (time + offset) % cycleDuration
                const progress = t / cycleDuration // 0 to 1

                // Move down: y goes from 0 to -maxDepth
                // Actually start from 0 and go down
                group.position.y = -progress * maxDepth

                // Scale down: scale from 1 to 0.2
                const scale = 1.0 - progress * 0.8
                group.scale.set(scale, scale, scale)

                // Opacity: fade out as it goes down
                // Fade in quickly at start, then fade out
                let alpha = 0
                if (progress < 0.1) {
                    alpha = progress / 0.1
                } else {
                    alpha = 1.0 - (progress - 0.1) / 0.9
                }

                materials.forEach((m) => {
                    if (m instanceof THREE.MeshBasicMaterial) {
                        m.opacity = alpha * 0.4 // Increased from 0.15 to 0.4
                    } else if (m instanceof THREE.ShaderMaterial) {
                        m.uniforms.uOpacity.value = alpha // Full brightness relative to fade
                    }
                })
            })
        })

        const half = groundSize / 2
        const borderY = 0.012
        const borderPoints = [new THREE.Vector3(-half, borderY, -half), new THREE.Vector3(half, borderY, -half), new THREE.Vector3(half, borderY, half), new THREE.Vector3(-half, borderY, half)]
        const borderGeo = buildBorderStripGeometry(borderPoints, 0.22)
        const borderMat = makeFlowBorderMaterial(new THREE.Color(0x36c4ed), Math.random() * 5.0)
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
            color: 0x330000,
            emissive: 0x100000,
            attenuationColor: 0xff0000,
            specularColor: 0xff0000,
            fresnelColor: 0xff0000,
            fresnelAlpha: true,
            side: THREE.FrontSide
        })

        // Layout: Tunnel 1 -> Straight -> T1 -> Straight -> T2 -> Straight -> Tunnel 2
        // X positions: -14, -9, -4.5, 0, 4.5, 9, 14
        const pipeLiftY = 0.9

        // Tunnel 1 (Left)
        const t1 = addTunnel(mat)
        t1.scale.set(0.85, 0.85, 0.85)
        t1.position.set(-20, 0, 0)
        rootGroup.add(t1)

        // Straight 1 Extension
        const s1_ext = addStraightPipe(mat)
        s1_ext.position.set(-17, pipeLiftY, 0)
        rootGroup.add(s1_ext)

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

        // Straight 3 Extension
        const s3_ext = addStraightPipe(mat)
        s3_ext.position.set(17, pipeLiftY, 0)
        rootGroup.add(s3_ext)

        // Tunnel 2 (Right)
        const t2 = addTunnel(mat)
        t2.scale.set(1.25, 1.25, 1.25)
        t2.position.set(20, 0, 0)
        rootGroup.add(t2)

        addFlowingArrows()
        addBillboards()
    }

    function addBillboards() {
        if (!rootGroup) return

        const loader = new THREE.TextureLoader()
        const maxAnisotropy = renderer?.capabilities.getMaxAnisotropy() || 1

        const texSplit = loader.load('/img/binChuan/分水口.png')
        texSplit.colorSpace = THREE.SRGBColorSpace
        texSplit.anisotropy = maxAnisotropy

        const texExit = loader.load('/img/binChuan/大银甸陇洞出口岔管.png')
        texExit.colorSpace = THREE.SRGBColorSpace
        texExit.anisotropy = maxAnisotropy

        const texYang = loader.load('/img/binChuan/杨公箐隧洞.png')
        texYang.colorSpace = THREE.SRGBColorSpace
        texYang.anisotropy = maxAnisotropy

        const texFrame = loader.load('/img/binChuan/框.png')
        texFrame.colorSpace = THREE.SRGBColorSpace
        texFrame.anisotropy = maxAnisotropy

        const createBoard = (texture: THREE.Texture, pos: THREE.Vector3, widthOrScale: number = 1, height?: number) => {
            const mat = new THREE.SpriteMaterial({
                map: texture,
                transparent: true,
                depthTest: false,
                depthWrite: false
            })

            const sprite = new THREE.Sprite(mat)
            sprite.position.copy(pos)

            if (height !== undefined) {
                sprite.scale.set(widthOrScale, height, 1)
            } else {
                sprite.scale.set(3.3 * widthOrScale, 1.14 * widthOrScale, 1)
            }

            sprite.renderOrder = 9999

            rootGroup?.add(sprite)
        }

        createBoard(texSplit, new THREE.Vector3(-6.0, 1, -3.8))
        createBoard(texSplit, new THREE.Vector3(5.0, 1, -3.8))

        createBoard(texExit, new THREE.Vector3(20.0, 8.5, -0.8), 2.5)
        createBoard(texYang, new THREE.Vector3(-20.0, 8.0, -0.8), 2.5)

        const createTitledBoard = (title: string, value: string, pos: THREE.Vector3) => {
            const group = new THREE.Group()
            group.position.copy(pos)

            // Frame (Mesh instead of Sprite to allow children positioning)
            const frameWidth = 4.8
            const frameHeight = 2.7
            const frameGeo = new THREE.PlaneGeometry(frameWidth, frameHeight)
            const frameMat = new THREE.MeshBasicMaterial({
                map: texFrame,
                transparent: true,
                depthTest: false,
                depthWrite: false,
                side: THREE.DoubleSide
            })
            const frameMesh = new THREE.Mesh(frameGeo, frameMat)
            group.add(frameMesh)

            // Helper to create text mesh
            const createTextMesh = (text: string, fontSize: number, color: string, align: CanvasTextAlign = 'center') => {
                const canvas = document.createElement('canvas')
                const ctx = canvas.getContext('2d')
                if (!ctx) return null

                ctx.font = `bold ${fontSize}px "Microsoft YaHei", sans-serif`
                const metrics = ctx.measureText(text)
                const textWidth = metrics.width
                const textHeight = fontSize * 1.4

                canvas.width = textWidth * 4
                canvas.height = textHeight * 4
                ctx.scale(4, 4)
                ctx.font = `bold ${fontSize}px "Microsoft YaHei", sans-serif`
                ctx.fillStyle = color
                ctx.textAlign = 'center'
                ctx.textBaseline = 'middle'
                ctx.fillText(text, textWidth / 2, textHeight / 2)

                const texture = new THREE.CanvasTexture(canvas)
                texture.colorSpace = THREE.SRGBColorSpace
                texture.minFilter = THREE.LinearFilter
                texture.anisotropy = maxAnisotropy

                const mat = new THREE.MeshBasicMaterial({
                    map: texture,
                    transparent: true,
                    depthTest: false,
                    depthWrite: false,
                    side: THREE.DoubleSide
                })

                const aspect = textWidth / textHeight
                // Scale factor for mesh size relative to font size
                // Adjust this factor to match desired visual size
                const meshHeight = (fontSize / 80) * 0.6
                const meshWidth = meshHeight * aspect
                const geo = new THREE.PlaneGeometry(meshWidth, meshHeight)
                const mesh = new THREE.Mesh(geo, mat)

                return { mesh, width: meshWidth, height: meshHeight }
            }

            // 1. Title (Top-Left)
            const titleObj = createTextMesh(title, 80, '#ffffff')
            if (titleObj) {
                // Padding
                const paddingX = 0.4
                const paddingY = 0.1
                const tx = -frameWidth / 2 + paddingX + titleObj.width / 2
                const ty = frameHeight / 2 - paddingY - titleObj.height / 2
                titleObj.mesh.position.set(tx, ty, 0.1)
                group.add(titleObj.mesh)
            }

            // 2. Value (Center)
            const valueObj = createTextMesh(value, 100, '#33D6C9')
            if (valueObj) {
                // Centered
                valueObj.mesh.position.set(0, 0, 0.1)
                group.add(valueObj.mesh)
            }

            rootGroup?.add(group)
            billboardGroups.push(group)
        }

        createTitledBoard('东1干渠', '0.3m³/s', new THREE.Vector3(-5.5, 10.3, 6.4))
        createTitledBoard('西干管', '0.89m³/s', new THREE.Vector3(5.5, 10.3, 6.4))

        // 添加文字标注
        addTextLabels()
    }

    function addTextLabels() {
        textLabels = []
        const maxAnisotropy = renderer?.capabilities.getMaxAnisotropy() || 1

        // 创建文字 Canvas
        const createTextLabel = (text: string, fontSize: number = 48, color: string = '#ffffff') => {
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            if (!ctx) return null

            // 设置字体以测量宽度
            ctx.font = `bold ${fontSize}px "Microsoft YaHei", sans-serif`
            const metrics = ctx.measureText(text)
            const textWidth = metrics.width
            const textHeight = fontSize * 1.4 // 稍微留点余量

            // 设置 Canvas 尺寸 (2倍分辨率以保证清晰度)
            canvas.width = textWidth * 4
            canvas.height = textHeight * 4

            ctx.scale(4, 4)
            ctx.font = `bold ${fontSize}px "Microsoft YaHei", sans-serif`
            ctx.fillStyle = color
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'

            // 绘制文字
            ctx.fillText(text, textWidth / 2, textHeight / 2)

            const texture = new THREE.CanvasTexture(canvas)
            texture.colorSpace = THREE.SRGBColorSpace
            texture.minFilter = THREE.LinearFilter
            texture.anisotropy = maxAnisotropy

            const mat = new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true,
                depthTest: false,
                depthWrite: false,
                side: THREE.DoubleSide
            })

            // 根据宽高比设置尺寸，基准高度设为 0.5 (世界单位)
            const aspect = textWidth / textHeight
            const baseHeight = 0.5
            const geometry = new THREE.PlaneGeometry(baseHeight * aspect, baseHeight)

            const mesh = new THREE.Mesh(geometry, mat)
            mesh.renderOrder = 9999

            textLabels.push(mesh)
            return mesh
        }

        // 辅助函数：添加一组上下标注
        const addLabelGroup = (x: number, topText: string, bottomText: string) => {
            const labelTop = createTextLabel(topText, 64, '#A5B8C6')
            if (labelTop && rootGroup) {
                labelTop.position.set(x, 3.2, 0)
                labelTop.scale.multiplyScalar(1.2)
                rootGroup.add(labelTop)
            }

            const labelBottom = createTextLabel(bottomText, 64, '#A5B8C6')
            if (labelBottom && rootGroup) {
                labelBottom.position.set(x, -1.5, 0)
                labelBottom.scale.multiplyScalar(1.2)
                rootGroup.add(labelBottom)
            }
        }

        // 1. 第一直管 (S1)
        // 位置在 -11，稍微偏左至 -13
        addLabelGroup(-13.0, '2.40m³/s-DN1600', 'l = 3314.57m')

        // 2. 第二直管 (S2)
        // 位置在 0，稍微偏右至 0.2
        addLabelGroup(0.3, '2.70m³/s-DN1600', 'l = 1466.57m')

        // 3. 第三直管 (S3)
        // 位置在 11，稍微偏右至 11.5
        addLabelGroup(11.5, '3.59m³/s-DN2000', 'l = 68.86m')
    }

    function updateTextLabels(camera: THREE.Camera) {
        const pipeDir = new THREE.Vector3(1, 0, 0)
        // 获取相机右方向（屏幕右侧）
        const cameraRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion)

        textLabels.forEach((label) => {
            // 1. 先让文字看向相机 (此时文字是正立的，但没有跟随管道倾斜)
            label.lookAt(camera.position)

            // 2. 计算跟随管道的旋转
            // 视线方向（也是 Label 平面的法线）
            const viewDir = new THREE.Vector3().subVectors(camera.position, label.position).normalize()

            // 将管道方向投影到 Label 平面上
            const projectedPipeDir = pipeDir.clone().projectOnPlane(viewDir).normalize()

            // 3. 修正文字方向，确保始终从左往右读
            // 如果投影后的管道方向指向屏幕左侧（与相机右向量点积为负），则反转方向
            // 这样可以解决“转到背面时文字反向/倒立”的问题
            if (projectedPipeDir.dot(cameraRight) < 0) {
                projectedPipeDir.negate()
            }

            // 4. 应用旋转
            if (projectedPipeDir.lengthSq() > 0.001) {
                // 当前 Label 的右方向（lookAt 后通常接近水平）
                const currentRight = new THREE.Vector3(1, 0, 0).applyQuaternion(label.quaternion)

                // 计算从 currentRight 到 projectedPipeDir 的旋转
                const quaternion = new THREE.Quaternion().setFromUnitVectors(currentRight, projectedPipeDir)
                label.quaternion.premultiply(quaternion)
            }
        })
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

    $effect(() => {
        if (currentView && camera && controls && id) {
            const nextCameraPosition = [camera.position.x, camera.position.y, camera.position.z]
            const nextTargetPosition = [controls.target.x, controls.target.y, controls.target.z]

            updateNodeProps(id, {
                attributes: {
                    initCameraPosition: nextCameraPosition,
                    initTargetPosition: nextTargetPosition,
                    currentView: false
                }
            })
        }
    })

    function animate(_time = 0) {
        if (!renderer || !scene || !camera) return
        raf = requestAnimationFrame(animate)

        const t = _time * 0.001
        tunnelBorderFlowMats.forEach((m, i) => {
            m.uniforms.uTime.value = t
            m.uniforms.uOffset.value = i * 2.5 // Staggered offsets
        })

        arrowFlowMats.forEach((m) => {
            m.uniforms.uTime.value = t
        })

        updateArrowSystems(0.016, camera)
        updateTextLabels(camera)
        billboardGroups.forEach((g) => g.lookAt(camera!.position))

        tunnelAnimators.forEach((anim) => anim(t))

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
        tunnelAnimators = []
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
