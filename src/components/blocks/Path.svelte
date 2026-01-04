<!-- 簇粗细随机改成 簇随机 把流光错开也并入 簇随机里  还有簇的路径和流光的颜色透明值也要偏移 簇偏像素 流光速度也要互相偏移一点 都是微量的改变 -->
<script lang="ts">
    import ResponsiveBox from '../core/ResponsiveBox.svelte'
    import * as THREE from 'three'
    import type { Mesh, BufferGeometry, ShaderMaterial, Sprite, Group, MeshBasicMaterial } from 'three'
    import { onMount } from 'svelte'
    import { Line2 } from 'three/examples/jsm/lines/Line2.js'
    import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
    import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js'
    import { updateNodeProps } from '../../services/parser/property-panel.service'
    interface NodePoint {
        anchor: THREE.Vector3
    }
    interface Props {
        id?: string
        style?: string
        pathNodes?: string
        pathType?: 'line' | 'bezier'
        color?: string
        lineWidth?: number
        segments?: number
        samples?: number
        interactive?: boolean
        /* removed */
        taperStart?: boolean
        taperEnd?: boolean
        flowLight?: boolean
        flowSpeed?: number
        flowTrail?: number
        taperRatio?: number
        taperStartRatio?: number
        taperEndRatio?: number
        flowWidth?: number
        flowColor?: string
        flowReverse?: boolean
        clusterEnabled?: boolean
        clusterCount?: number
        clusterOffset?: number
        clusterRandom?: boolean
        clusterTaperRandom?: boolean
        clusterFlowStagger?: boolean
        [key: string]: any
    }
    let {
        id = crypto.randomUUID(),
        style = '',
        pathNodes = '',
        pathType,
        color = '#4ade80',
        lineWidth = 2,
        segments = 1,
        samples = 128,
        interactive = false,
        taperStart = false,
        taperEnd = false,
        flowLight = false,
        flowSpeed = 0.6,
        flowTrail = 0.2,
        taperStartRatio = 0.12,
        taperEndRatio = 0.12,
        flowWidth = 2,
        flowColor = '#4ade80',
        flowReverse = false,
        clusterEnabled = false,
        clusterCount = 2,
        clusterOffset = 6,
        clusterRandom = false,
        clusterTaperRandom = false,
        clusterFlowStagger = false,
        ...rest
    }: Props = $props()
    let containerRef: HTMLDivElement | null = null
    let renderer: THREE.WebGLRenderer | null = null
    let scene: THREE.Scene | null = null
    let camera: THREE.PerspectiveCamera | null = null
    let line: Line2 | Mesh | null = null
    let lineMaterial: LineMaterial | MeshBasicMaterial | null = null
    let nodes: NodePoint[] = []
    let raf = 0
    let resizeObserver: ResizeObserver | null = null
    const raycaster = new THREE.Raycaster()
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
    let dragging = false
    let dragTarget: { type: 'anchor' | 'in' | 'out'; index: number } | null = null
    let dragOffset = new THREE.Vector3()
    let handleGroup: Group | null = null
    let anchorMeshes: Mesh[] = []
    let flowMesh: Sprite | null = null
    let flowProgress = 0
    let lastPts: THREE.Vector3[] = []
    let lastTime = 0
    let flowTube: Mesh | null = null
    let flowShaderMat: ShaderMaterial | null = null
    let clusterLines: Array<Line2 | Mesh> = []
    let clusterMaterials: Array<LineMaterial | MeshBasicMaterial> = []
    let clusterFlowTubes: Mesh[] = []
    let clusterFlowMats: ShaderMaterial[] = []
    let clusterFlowOffsets: number[] = []
    let clusterFlowSpeedScales: number[] = []
    function clampNumber(v: number, min: number, max: number) {
        return Math.min(max, Math.max(min, v))
    }
    function parseColorOpacity(input: string): { color: THREE.Color; opacity: number } {
        let opacity = 1
        let color = new THREE.Color('#ffffff')
        const s = (input || '').trim()
        if (s.startsWith('#')) {
            if (s.length === 9) {
                const r = parseInt(s.slice(1, 3), 16)
                const g = parseInt(s.slice(3, 5), 16)
                const b = parseInt(s.slice(5, 7), 16)
                const a = parseInt(s.slice(7, 9), 16) / 255
                color = new THREE.Color(r / 255, g / 255, b / 255)
                opacity = Math.max(0, Math.min(1, a))
            } else {
                color = new THREE.Color(s)
                opacity = 1
            }
        } else if (/^rgba?\(/i.test(s)) {
            const m = s.match(/rgba?\s*\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)/i)
            if (m) {
                const r = parseFloat(m[1])
                const g = parseFloat(m[2])
                const b = parseFloat(m[3])
                const a = m[4] ? parseFloat(m[4]) : 1
                color = new THREE.Color(r / 255, g / 255, b / 255)
                opacity = Math.max(0, Math.min(1, a))
            } else {
                color = new THREE.Color(s)
                opacity = 1
            }
        } else {
            color = new THREE.Color(s || '#ffffff')
            opacity = 1
        }
        return { color, opacity }
    }
    function serializeNodes(nextNodes: NodePoint[]) {
        return JSON.stringify(nextNodes.map((n) => ({ x: n.anchor.x, y: n.anchor.y, z: n.anchor.z })))
    }

    function parseNodes(raw: unknown): NodePoint[] | null {
        if (typeof raw !== 'string') return null
        try {
            const arr = JSON.parse(raw) as Array<{ x: number; y: number; z: number }>
            if (!Array.isArray(arr) || arr.length < 2) return null
            return arr.map((p) => ({ anchor: new THREE.Vector3(p.x, p.y, p.z) }))
        } catch {
            return null
        }
    }

    function saveNodesToDoms() {
        const value = serializeNodes(nodes)
        updateNodeProps(id, { attributes: { pathNodes: value } })
    }

    function tryLoadNodesFromProps(): boolean {
        const parsed = parseNodes(pathNodes)
        if (!parsed) return false
        nodes = parsed
        return true
    }

    function migrateFromLocalStorage(): boolean {
        try {
            const key = `path_nodes_${id}`
            const raw = localStorage.getItem(key)
            if (!raw) return false
            const parsed = parseNodes(raw)
            if (!parsed) return false
            nodes = parsed
            updateNodeProps(id, { attributes: { pathNodes: raw } })
            localStorage.removeItem(key)
            return true
        } catch {
            return false
        }
    }
    function pseudoRandom(x: number, y: number) {
        const v = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453
        return v - Math.floor(v)
    }
    function init() {
        if (!containerRef) return
        const r = containerRef.getBoundingClientRect()
        const w = Math.max(1, r.width)
        const h = Math.max(1, r.height)
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
        renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
        renderer.setSize(w, h)
        renderer.domElement.className = 'pathcanvas'
        renderer.domElement.style.pointerEvents = interactive ? 'auto' : 'none'
        containerRef.appendChild(renderer.domElement)
        scene = new THREE.Scene()
        camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000)
        camera.position.set(0, 0, 20)
        lineMaterial = null
        line = null
        handleGroup = new THREE.Group()
        scene.add(handleGroup)
        buildDefaultNodes()
        rebuildLine()
        rebuildHandles()
        attachPointerHandlers()
        bindResizeObserver()
        animate()
        window.addEventListener('resize', onResize)
        document.addEventListener('visibilitychange', onVisibility)
    }
    function dispose() {
        cancelAnimationFrame(raf)
        document.removeEventListener('visibilitychange', onVisibility)
        window.removeEventListener('resize', onResize)
        resizeObserver?.disconnect()
        resizeObserver = null
        detachPointerHandlers()
        if (line) {
            line.geometry.dispose()
            lineMaterial?.dispose()
            scene?.remove(line)
            line = null
        }
        if (handleGroup) {
            anchorMeshes.forEach((m) => {
                m.geometry.dispose()
                ;(m.material as THREE.Material).dispose()
            })
            scene?.remove(handleGroup)
            handleGroup = null
            anchorMeshes = []
        }
        if (flowMesh) {
            const mat = flowMesh.material as THREE.SpriteMaterial
            const mapTex = mat.map as THREE.Texture
            mapTex?.dispose()
            mat.dispose()
            scene?.remove(flowMesh)
            flowMesh = null
        }
        renderer?.dispose()
        if (renderer?.domElement?.parentElement) renderer.domElement.parentElement.removeChild(renderer.domElement)
        renderer = null
        scene = null
        camera = null
    }
    function buildDefaultNodes() {
        if (tryLoadNodesFromProps()) return
        if (migrateFromLocalStorage()) return
        nodes = []
        const a0 = new THREE.Vector3(-6, 0, 0)
        const a1 = new THREE.Vector3(6, 0, 0)
        nodes.push({ anchor: a0 })
        nodes.push({ anchor: a1 })
    }
    function applySegmentsEqual(n: number) {
        if (n < 1) n = 1
        if (nodes.length === 0) {
            nodes.push({ anchor: new THREE.Vector3(-6, 0, 0) })
            nodes.push({ anchor: new THREE.Vector3(6, 0, 0) })
        }
        const start = nodes[0].anchor.clone()
        const end = nodes[nodes.length - 1].anchor.clone()
        const total = n + 1
        const dir = end.clone().sub(start)
        const len = dir.length()
        if (len < 0.0001) {
            dir.set(1, 0, 0)
        } else {
            dir.divideScalar(total - 1)
        }
        const nextNodes: NodePoint[] = []
        for (let i = 0; i < total; i++) {
            const p = start.clone().add(dir.clone().multiplyScalar(i))
            nextNodes.push({ anchor: p })
        }
        nodes = nextNodes
        saveNodesToDoms()
    }

    type EffectivePathType = 'line' | 'bezier'
    function normalizePathType(v: unknown): EffectivePathType {
        return v === 'bezier' ? 'bezier' : 'line'
    }
    function buildCurve(points: THREE.Vector3[], type: EffectivePathType): THREE.Curve<THREE.Vector3> {
        if (type === 'line') {
            const path = new THREE.CurvePath<THREE.Vector3>()
            for (let i = 0; i < points.length - 1; i++) {
                path.add(new THREE.LineCurve3(points[i], points[i + 1]))
            }
            return path
        }
        return new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.5)
    }

    function rebuildLine() {
        if (!scene) return
        const effectivePathType = normalizePathType(pathType)
        const anchors = nodes.map((n) => n.anchor.clone())
        let pts: THREE.Vector3[] = []
        if (anchors.length >= 2) {
            const curve = buildCurve(anchors, effectivePathType)
            const totalSamples = Math.max(4, samples * Math.max(1, anchors.length - 1))
            pts = curve.getPoints(totalSamples)
            if (flowReverse) {
                pts.reverse()
            }
        }
        lastPts = pts
        if (line) {
            if ((line as any).geometry) {
                ;(line as any).geometry.dispose()
            }
            if (lineMaterial) {
                ;(lineMaterial as any).dispose?.()
            }
            scene!.remove(line)
            line = null
            lineMaterial = null
        }
        if (clusterLines.length) {
            for (const l of clusterLines) {
                ;(l.geometry as LineGeometry).dispose()
                ;(l.material as LineMaterial).dispose()
                scene!.remove(l)
            }
            clusterLines = []
            clusterMaterials = []
        }
        if (flowTube) {
            ;(flowTube.geometry as THREE.BufferGeometry).dispose()
            flowShaderMat?.dispose()
            scene!.remove(flowTube)
            flowTube = null
            flowShaderMat = null
        }
        if (clusterFlowTubes.length) {
            for (const t of clusterFlowTubes) {
                ;(t.geometry as THREE.BufferGeometry).dispose()
                ;(t.material as ShaderMaterial)?.dispose?.()
                scene!.remove(t)
            }
            clusterFlowTubes = []
            clusterFlowMats = []
            clusterFlowOffsets = []
            clusterFlowSpeedScales = []
        }
        if (taperStart || taperEnd) {
            const positions: number[] = []
            const indices: number[] = []
            const n = pts.length
            const rect = containerRef?.getBoundingClientRect()
            const viewportH = Math.max(1, rect?.height || 1)
            const fovRad = ((camera?.fov || 45) * Math.PI) / 180
            for (let i = 0; i < n; i++) {
                const p = pts[i]
                const s = n > 1 ? i / (n - 1) : 0
                const startFactor = taperStart ? Math.min(1, s / Math.max(0.0001, taperStartRatio)) : 1
                const endFactor = taperEnd ? Math.min(1, (1 - s) / Math.max(0.0001, taperEndRatio)) : 1
                const factor = Math.min(startFactor, endFactor)
                const depth = Math.abs((camera?.position.z || 20) - p.z)
                const worldPerPixel = (2 * depth * Math.tan(fovRad / 2)) / viewportH
                const w = lineWidth * 0.5 * worldPerPixel * factor
                const dir = i < n - 1 ? pts[i + 1].clone().sub(p) : p.clone().sub(pts[i - 1])
                if (dir.lengthSq() < 1e-6) dir.set(1, 0, 0)
                const normal = new THREE.Vector3(-dir.y, dir.x, 0).normalize().multiplyScalar(w)
                const left = p.clone().sub(normal)
                const right = p.clone().add(normal)
                positions.push(left.x, left.y, left.z)
                positions.push(right.x, right.y, right.z)
            }
            for (let i = 0; i < n - 1; i++) {
                const a = i * 2
                const b = i * 2 + 1
                const c = i * 2 + 2
                const d = i * 2 + 3
                indices.push(a, b, c)
                indices.push(b, d, c)
            }
            const geom = new THREE.BufferGeometry()
            geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
            geom.setIndex(indices)
            geom.computeVertexNormals()
            const { color: baseColor, opacity: baseOpacity } = parseColorOpacity(color)
            lineMaterial = new THREE.MeshBasicMaterial({
                color: baseColor,
                side: THREE.DoubleSide,
                transparent: baseOpacity < 1,
                opacity: baseOpacity
            })
            line = new THREE.Mesh(geom, lineMaterial)
            ;(line as THREE.Object3D).renderOrder = 0
            scene!.add(line)
        } else {
            const positions: number[] = []
            for (let i = 0; i < pts.length; i++) {
                const p = pts[i]
                positions.push(p.x, p.y, p.z)
            }
            const geom = new LineGeometry()
            geom.setPositions(positions)
            const { color: baseColor, opacity: baseOpacity } = parseColorOpacity(color)
            lineMaterial = new LineMaterial({ color: baseColor })
            ;(lineMaterial as LineMaterial).linewidth = lineWidth
            const r = containerRef?.getBoundingClientRect()
            const w = Math.max(1, r?.width || 1)
            const h = Math.max(1, r?.height || 1)
            ;(lineMaterial as LineMaterial).resolution.set(w, h)
            ;(lineMaterial as LineMaterial).transparent = baseOpacity < 1
            ;(lineMaterial as LineMaterial).opacity = baseOpacity
            line = new Line2(geom, lineMaterial)
            ;(line as THREE.Object3D).renderOrder = 0
            scene!.add(line)
        }
        ;(lineMaterial as any).needsUpdate = true
        if (clusterEnabled && pts.length > 1) {
            const effectiveClusterRandom = clusterRandom || clusterTaperRandom || clusterFlowStagger
            const { color: baseLineColor, opacity: baseLineOpacity } = parseColorOpacity(color)
            const { color: baseFlowColor, opacity: baseFlowOpacity } = parseColorOpacity(flowColor)
            const rectC = containerRef?.getBoundingClientRect()
            const viewportHC = Math.max(1, rectC?.height || 1)
            const fovRadC = ((camera?.fov || 45) * Math.PI) / 180
            const depthC = Math.abs((camera?.position.z || 20) - (pts[0]?.z || 0))
            const worldPerPixelC = (2 * depthC * Math.tan(fovRadC / 2)) / viewportHC
            const clones = Math.max(1, Math.floor(clusterCount))
            for (let c = 1; c <= clones; c++) {
                const ro = effectiveClusterRandom ? pseudoRandom(c, 2.34) : 0.5
                const clusterOffsetPx = Math.max(0, clusterOffset + (ro - 0.5) * 2)
                const amp = clusterOffsetPx * worldPerPixelC
                const magnitude = Math.ceil(c / 2)
                const sign = c % 2 === 1 ? 1 : -1
                const n = pts.length
                const clusterPts: THREE.Vector3[] = []
                let taperStartRatioC = taperStartRatio
                let taperEndRatioC = taperEndRatio
                if (effectiveClusterRandom) {
                    const r1 = pseudoRandom(c, 1.23)
                    const r2 = pseudoRandom(c, 4.56)
                    const d1 = (r1 - 0.5) * 0.4
                    const d2 = (r2 - 0.5) * 0.4
                    taperStartRatioC = clampNumber(taperStartRatio * (1 + d1), 0.02, 0.5)
                    taperEndRatioC = clampNumber(taperEndRatio * (1 + d2), 0.02, 0.5)
                }
                for (let i = 0; i < n; i++) {
                    const p = pts[i]
                    const s = n > 1 ? i / (n - 1) : 0
                    const dir = i < n - 1 ? pts[i + 1].clone().sub(p) : p.clone().sub(pts[i - 1])
                    if (dir.lengthSq() < 1e-6) dir.set(1, 0, 0)
                    const normal = new THREE.Vector3(-dir.y, dir.x, 0).normalize()
                    const offset = normal.multiplyScalar(amp * s * sign * magnitude)
                    const q = p.clone().add(offset)
                    clusterPts.push(q)
                }
                if (taperStart || taperEnd) {
                    const positions2: number[] = []
                    const indices2: number[] = []
                    const n2 = clusterPts.length
                    const rect2 = containerRef?.getBoundingClientRect()
                    const viewportH2 = Math.max(1, rect2?.height || 1)
                    const fovRad2 = ((camera?.fov || 45) * Math.PI) / 180
                    for (let i = 0; i < n2; i++) {
                        const p = clusterPts[i]
                        const s = n2 > 1 ? i / (n - 1) : 0
                        const startFactor = taperStart ? Math.min(1, s / Math.max(0.0001, taperStartRatioC)) : 1
                        const endFactor = taperEnd ? Math.min(1, (1 - s) / Math.max(0.0001, taperEndRatioC)) : 1
                        const factor = Math.min(startFactor, endFactor)
                        const depth = Math.abs((camera?.position.z || 20) - p.z)
                        const worldPerPixel = (2 * depth * Math.tan(fovRad2 / 2)) / viewportH2
                        const w = lineWidth * 0.5 * worldPerPixel * factor
                        const dir = i < n2 - 1 ? clusterPts[i + 1].clone().sub(p) : p.clone().sub(clusterPts[i - 1])
                        if (dir.lengthSq() < 1e-6) dir.set(1, 0, 0)
                        const normal = new THREE.Vector3(-dir.y, dir.x, 0).normalize().multiplyScalar(w)
                        const left = p.clone().sub(normal)
                        const right = p.clone().add(normal)
                        positions2.push(left.x, left.y, left.z)
                        positions2.push(right.x, right.y, right.z)
                    }
                    for (let i = 0; i < n2 - 1; i++) {
                        const a = i * 2
                        const b = i * 2 + 1
                        const cidx = i * 2 + 2
                        const didx = i * 2 + 3
                        indices2.push(a, b, cidx)
                        indices2.push(b, didx, cidx)
                    }
                    const geom2 = new THREE.BufferGeometry()
                    geom2.setAttribute('position', new THREE.Float32BufferAttribute(positions2, 3))
                    geom2.setIndex(indices2)
                    geom2.computeVertexNormals()
                    const rCol = effectiveClusterRandom ? pseudoRandom(c, 6.78) : 0.5
                    const rA = effectiveClusterRandom ? pseudoRandom(c, 7.89) : 0.5
                    const col2 = baseLineColor.clone().offsetHSL(0, 0, (rCol - 0.5) * 0.08)
                    const opacity2 = clampNumber(baseLineOpacity * (1 + (rA - 0.5) * 0.2), 0, 1)
                    const mat2 = new THREE.MeshBasicMaterial({
                        color: col2,
                        side: THREE.DoubleSide,
                        transparent: opacity2 < 1,
                        opacity: opacity2
                    })
                    const mesh2 = new THREE.Mesh(geom2, mat2)
                    ;(mesh2 as THREE.Object3D).renderOrder = 0
                    scene!.add(mesh2)
                    clusterLines.push(mesh2)
                    clusterMaterials.push(mat2)
                } else {
                    const positions: number[] = []
                    for (let i = 0; i < clusterPts.length; i++) {
                        const p = clusterPts[i]
                        positions.push(p.x, p.y, p.z)
                    }
                    const geom = new LineGeometry()
                    geom.setPositions(positions)
                    const rCol = effectiveClusterRandom ? pseudoRandom(c, 6.78) : 0.5
                    const rA = effectiveClusterRandom ? pseudoRandom(c, 7.89) : 0.5
                    const col3 = baseLineColor.clone().offsetHSL(0, 0, (rCol - 0.5) * 0.08)
                    const opacity3 = clampNumber(baseLineOpacity * (1 + (rA - 0.5) * 0.2), 0, 1)
                    const mat = new LineMaterial({ color: col3 })
                    ;(mat as LineMaterial).linewidth = lineWidth
                    const r = containerRef?.getBoundingClientRect()
                    const w = Math.max(1, r?.width || 1)
                    const h = Math.max(1, r?.height || 1)
                    ;(mat as LineMaterial).resolution.set(w, h)
                    ;(mat as LineMaterial).transparent = opacity3 < 1
                    ;(mat as LineMaterial).opacity = opacity3
                    const l = new Line2(geom, mat)
                    ;(l as THREE.Object3D).renderOrder = 0
                    scene!.add(l)
                    clusterLines.push(l)
                    clusterMaterials.push(mat)
                }
                if (flowLight) {
                    const rFlowCol = effectiveClusterRandom ? pseudoRandom(c, 10.11) : 0.5
                    const rFlowA = effectiveClusterRandom ? pseudoRandom(c, 11.12) : 0.5
                    const flowCol = baseFlowColor.clone().offsetHSL(0, 0, (rFlowCol - 0.5) * 0.08)
                    const flowOpacityC = clampNumber(baseFlowOpacity * (1 + (rFlowA - 0.5) * 0.2), 0, 1)
                    const curveC = buildCurve(clusterPts, effectivePathType)
                    const tubularSegmentsC = Math.max(32, Math.floor(samples))
                    const tubeGeomC = new THREE.TubeGeometry(curveC, tubularSegmentsC, Math.max(0.0001, flowWidth * 0.5 * worldPerPixelC), 8, false)
                    const uniformsC = {
                        uColor: { value: flowCol },
                        uOpacity: { value: flowOpacityC },
                        uHead: { value: 0.0 },
                        uTrail: { value: Math.max(0.02, Math.min(0.9, flowTrail)) }
                    }
                    const matC = new THREE.ShaderMaterial({
                        uniforms: uniformsC,
                        vertexShader: `
                            varying vec2 vUv;
                            void main() {
                                vUv = uv;
                                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                            }
                        `,
                        fragmentShader: `
                            varying vec2 vUv;
                            uniform vec3 uColor;
                            uniform float uOpacity;
                            uniform float uHead;
                            uniform float uTrail;
                            void main() {
                                float d = abs(vUv.x - uHead);
                                float a = smoothstep(uTrail, 0.0, d);
                                a = pow(a, 1.5);
                                gl_FragColor = vec4(uColor, a * uOpacity);
                            }
                        `,
                        transparent: true,
                        depthTest: false,
                        depthWrite: false,
                        blending: THREE.AdditiveBlending
                    })
                    const tubeC = new THREE.Mesh(tubeGeomC, matC)
                    tubeC.renderOrder = 1000
                    scene!.add(tubeC)
                    clusterFlowTubes.push(tubeC)
                    clusterFlowMats.push(matC)
                    const phase = effectiveClusterRandom ? pseudoRandom(c, 9.87) : 0
                    clusterFlowOffsets.push(phase)
                    const rs = effectiveClusterRandom ? pseudoRandom(c, 12.34) : 0.5
                    clusterFlowSpeedScales.push(1 + (rs - 0.5) * 0.08)
                }
            }
        }
        if (flowLight) {
            flowProgress = 0
            lastTime = performance.now()
            // Build tube with shader tail
            const curve = buildCurve(lastPts, effectivePathType)
            const rect2 = containerRef?.getBoundingClientRect()
            const viewportH2 = Math.max(1, rect2?.height || 1)
            const fovRad2 = ((camera?.fov || 45) * Math.PI) / 180
            const depth2 = Math.abs((camera?.position.z || 20) - (lastPts[0]?.z || 0))
            const worldPerPixel2 = (2 * depth2 * Math.tan(fovRad2 / 2)) / viewportH2
            const radius = Math.max(0.0001, flowWidth * 0.5 * worldPerPixel2)
            const tubularSegments = Math.max(32, Math.floor(samples))
            const tubeGeom = new THREE.TubeGeometry(curve, tubularSegments, radius, 8, false)
            const { color: baseFlowColor, opacity: baseFlowOpacity } = parseColorOpacity(flowColor)
            const uniforms = {
                uColor: { value: baseFlowColor },
                uOpacity: { value: baseFlowOpacity },
                uHead: { value: 0.0 },
                uTrail: { value: Math.max(0.02, Math.min(0.9, flowTrail)) }
            }
            const vert = `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `
            const frag = `
                varying vec2 vUv;
                uniform vec3 uColor;
                uniform float uOpacity;
                uniform float uHead;
                uniform float uTrail;
                void main() {
                    float d = abs(vUv.x - uHead);
                    float a = smoothstep(uTrail, 0.0, d);
                    a = pow(a, 1.5);
                    vec3 col = uColor;
                    gl_FragColor = vec4(col, a * uOpacity);
                }
            `
            flowShaderMat?.dispose()
            flowShaderMat = new THREE.ShaderMaterial({
                uniforms,
                vertexShader: vert,
                fragmentShader: frag,
                transparent: true,
                depthTest: false,
                depthWrite: false,
                blending: THREE.AdditiveBlending
            })
            if (flowTube !== null) {
                const tube = flowTube as Mesh
                const oldGeom = tube.geometry as BufferGeometry
                oldGeom.dispose()
                scene!.remove(tube)
            }
            flowTube = new THREE.Mesh(tubeGeom, flowShaderMat)
            flowTube.renderOrder = 1000
            scene!.add(flowTube)
        } else {
            if (flowTube !== null) {
                const tube = flowTube as Mesh
                const oldGeom = tube.geometry as BufferGeometry
                oldGeom.dispose()
                flowShaderMat?.dispose()
                scene!.remove(tube)
                flowTube = null
                flowShaderMat = null
            }
            if (clusterFlowTubes.length) {
                for (const t of clusterFlowTubes) {
                    ;(t.geometry as THREE.BufferGeometry).dispose()
                    ;(t.material as ShaderMaterial).dispose()
                    scene!.remove(t)
                }
                clusterFlowTubes = []
                clusterFlowMats = []
                clusterFlowOffsets = []
                clusterFlowSpeedScales = []
            }
        }
    }
    function rebuildHandles() {
        if (!scene || !handleGroup) return
        anchorMeshes.forEach((m) => {
            m.geometry.dispose()
            ;(m.material as THREE.Material).dispose()
            handleGroup!.remove(m)
        })
        anchorMeshes = []
        if (!interactive) return
        const anchorGeom = new THREE.SphereGeometry(0.6, 16, 16)
        const anchorMat = new THREE.MeshBasicMaterial({ color: '#f59e0b', depthTest: false })
        for (let i = 0; i < nodes.length; i++) {
            const n = nodes[i]
            const a = new THREE.Mesh(anchorGeom, anchorMat)
            a.position.copy(n.anchor)
            a.renderOrder = 10
            handleGroup.add(a)
            anchorMeshes.push(a)
        }
    }
    function refreshHandlesPositions() {
        if (!handleGroup || !interactive) return
        if (anchorMeshes.length !== nodes.length) {
            rebuildHandles()
        }
        for (let i = 0; i < nodes.length && i < anchorMeshes.length; i++) {
            const n = nodes[i]
            const a = anchorMeshes[i]
            a.position.copy(n.anchor)
        }
    }
    function animate() {
        if (!renderer || !scene || !camera) return
        if (flowLight && lastPts.length > 1) {
            const now = performance.now()
            const dt = lastTime ? (now - lastTime) / 1000 : 0
            lastTime = now
            flowProgress = (flowProgress + flowSpeed * dt) % 1
            const t = flowProgress * (lastPts.length - 1)
            // update shader uniforms only
            if (flowShaderMat) {
                const uniforms = flowShaderMat.uniforms as {
                    uHead: { value: number }
                    uTrail: { value: number }
                }
                uniforms.uHead.value = flowProgress
                uniforms.uTrail.value = Math.max(0.02, Math.min(0.9, flowTrail))
            }
            if (clusterFlowMats.length) {
                const clones = clusterFlowMats.length
                for (let i = 0; i < clones; i++) {
                    const mat = clusterFlowMats[i]
                    const phase = clusterFlowOffsets[i] || 0
                    const speedScale = clusterFlowSpeedScales[i] || 1
                    const uniforms = mat.uniforms as {
                        uHead: { value: number }
                        uTrail: { value: number }
                    }
                    const head = flowProgress * speedScale + phase
                    uniforms.uHead.value = head - Math.floor(head)
                    uniforms.uTrail.value = Math.max(0.02, Math.min(0.9, flowTrail))
                }
            }
        }
        renderer.render(scene, camera)
        raf = requestAnimationFrame(animate)
    }
    function onResize() {
        if (!renderer || !camera || !containerRef) return
        const r = containerRef.getBoundingClientRect()
        const w = Math.max(1, r.width)
        const h = Math.max(1, r.height)
        renderer.setSize(w, h)
        camera.aspect = w / h
        camera.updateProjectionMatrix()
        if (lineMaterial && (lineMaterial as any).resolution) {
            ;(lineMaterial as LineMaterial).resolution.set(w, h)
        }
        if (clusterMaterials.length) {
            for (const m of clusterMaterials) {
                if ((m as any).resolution) {
                    ;(m as LineMaterial).resolution.set(w, h)
                }
            }
        }
    }
    function onVisibility() {
        if (document.hidden) {
            cancelAnimationFrame(raf)
            raf = 0
        } else {
            if (!raf) raf = requestAnimationFrame(animate)
        }
    }
    function getPointer(event: PointerEvent) {
        if (!renderer) return new THREE.Vector2(0, 0)
        const rect = renderer.domElement.getBoundingClientRect()
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
        const y = -((event.clientY - rect.top) / rect.height) * 2 + 1
        return new THREE.Vector2(x, y)
    }
    function onPointerDown(e: PointerEvent) {
        if (!interactive || !camera) return
        const ndc = getPointer(e)
        raycaster.setFromCamera(ndc, camera)
        const all: THREE.Object3D[] = []
        if (interactive) all.push(...anchorMeshes)
        const intersects = raycaster.intersectObjects(all, false)
        if (intersects.length > 0) {
            const obj = intersects[0].object
            let idxAnchor = anchorMeshes.indexOf(obj as THREE.Mesh)
            if (idxAnchor >= 0) {
                dragTarget = { type: 'anchor', index: idxAnchor }
            }
            const hit = new THREE.Vector3()
            if (raycaster.ray.intersectPlane(plane, hit)) {
                const targetPos = nodes[dragTarget!.index].anchor
                dragOffset.copy(targetPos).sub(hit)
                dragging = true
            }
        } else {
            dragging = false
            dragTarget = null
        }
    }
    function onPointerMove(e: PointerEvent) {
        if (!interactive || !dragging || !camera || !dragTarget) return
        const ndc = getPointer(e)
        raycaster.setFromCamera(ndc, camera)
        const hit = new THREE.Vector3()
        if (raycaster.ray.intersectPlane(plane, hit)) {
            const pos = hit.add(dragOffset)
            if (dragTarget.type === 'anchor') {
                const idx = dragTarget.index
                const prev = nodes[idx].anchor.clone()
                const delta = pos.clone().sub(prev)
                nodes[idx].anchor.copy(pos)
                if (idx === 1 && nodes.length >= 2) {
                    const pEnd = nodes[0].anchor
                    const d = pos.distanceTo(pEnd)
                    const radius = 4
                    const k = d < radius ? (1 - d / radius) * 0.5 : 0
                    if (k > 0) {
                        pEnd.add(delta.clone().multiplyScalar(k))
                    }
                } else if (idx === nodes.length - 2 && nodes.length >= 2) {
                    const pEnd = nodes[nodes.length - 1].anchor
                    const d = pos.distanceTo(pEnd)
                    const radius = 4
                    const k = d < radius ? (1 - d / radius) * 0.5 : 0
                    if (k > 0) {
                        pEnd.add(delta.clone().multiplyScalar(k))
                    }
                }
            }
            rebuildLine()
            refreshHandlesPositions()
        }
    }
    function onPointerUp() {
        dragging = false
        dragTarget = null
        saveNodesToDoms()
    }
    function attachPointerHandlers() {
        if (!renderer) return
        renderer.domElement.addEventListener('pointerdown', onPointerDown)
        window.addEventListener('pointermove', onPointerMove)
        window.addEventListener('pointerup', onPointerUp)
    }
    function detachPointerHandlers() {
        if (!renderer) return
        renderer.domElement.removeEventListener('pointerdown', onPointerDown)
        window.removeEventListener('pointermove', onPointerMove)
        window.removeEventListener('pointerup', onPointerUp)
    }
    function bindResizeObserver() {
        if (!containerRef || !renderer || !camera) return
        resizeObserver = new ResizeObserver((entries) => {
            const r = entries[0].contentRect
            const w = Math.max(1, Math.floor(r.width))
            const h = Math.max(1, Math.floor(r.height))
            renderer!.setSize(w, h)
            camera!.aspect = w / h
            camera!.updateProjectionMatrix()
            if (lineMaterial && (lineMaterial as any).resolution) {
                ;(lineMaterial as LineMaterial).resolution.set(w, h)
            }
        })
        resizeObserver.observe(containerRef)
    }
    onMount(() => {
        init()
        return () => {
            dispose()
        }
    })
    $effect(() => {
        if (renderer) {
            renderer.domElement.style.pointerEvents = interactive ? 'auto' : 'none'
        }
        rebuildHandles()
    })
    $effect(() => {
        const parsed = parseNodes(pathNodes)
        if (parsed) {
            const incoming = serializeNodes(parsed)
            const current = serializeNodes(nodes)
            if (incoming !== current) {
                nodes = parsed
            }
        }
        if (nodes.length !== segments + 1) {
            applySegmentsEqual(segments)
        }
        rebuildLine()
        rebuildHandles()
        refreshHandlesPositions()
        pathNodes
        segments
        samples
        color
        lineWidth
        taperStart
        taperEnd
        taperStartRatio
        taperEndRatio
        flowLight
        flowSpeed
        flowTrail
        flowWidth
        flowColor
        flowReverse
        pathType
        clusterEnabled
        clusterCount
        clusterOffset
        clusterRandom
        clusterTaperRandom
        clusterFlowStagger
    })
</script>

<ResponsiveBox {id} {style} {...rest}>
    <div class="wrapper" bind:this={containerRef}></div>
</ResponsiveBox>

<style>
    .wrapper {
        width: 100%;
        height: 100%;
        pointer-events: all;
    }
    :global(canvas.pathcanvas) {
        width: 100%;
        height: 100%;
        display: block;
        pointer-events: none;
    }
</style>
