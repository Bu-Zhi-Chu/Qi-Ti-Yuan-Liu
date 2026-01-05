<script lang="ts">
    import { onMount } from 'svelte'
    import ResponsiveBox from '../core/ResponsiveBox.svelte'
    import { updateNodeProps } from '../../services/parser/property-panel.service'
    import * as Cesium from 'cesium'
    import Dexie from 'dexie'

    interface Props {
        id?: string
        style?: string
        center?: string
        bearing?: number
        pitch?: number
        zoom?: number
        currentView?: boolean
        enableTileCache?: boolean
        basemapStandard?: string
        basemapType?: 'imagery' | 'vector' | 'terrain'
        mapKey?: string
        [key: string]: any
    }

    let mapCacheDb: Dexie | null = null
    let resourcePatched = false
    let originalFetchImage: any = null
    let originalFetchImageStatic: any = null
    let originalFetchBlob: any = null

    function matchCacheTile(url: string): boolean {
        if (!url) return false
        if (url.includes('tiles.virtualearth.net/tiles/')) return true
        if (url.includes('.tianditu.gov.cn/')) return true
        if (url.includes('/MapServer/tile/')) return true
        if (url.includes('/iserver/services/')) return true
        return false
    }

    async function getMapCacheDb(): Promise<Dexie> {
        if (!mapCacheDb) {
            mapCacheDb = new Dexie('mapCache')
            mapCacheDb.version(1).stores({
                tiles: 'url, ts'
            })
            await mapCacheDb.open()
        }
        return mapCacheDb
    }

    async function clearMapCacheDb() {
        try {
            if (mapCacheDb) {
                mapCacheDb.close()
                mapCacheDb = null
            }
            await Dexie.delete('mapCache')
        } catch {}
    }

    async function enableTileCacheResourcePatch() {
        if (resourcePatched) return
        const CesiumAny = Cesium as any
        const Resource = CesiumAny.Resource
        if (!Resource || !Resource.prototype) return

        const db = await getMapCacheDb()
        const tilesTable = (db as any).table('tiles')

        originalFetchImage = Resource.prototype.fetchImage
        originalFetchImageStatic = Resource.fetchImage
        originalFetchBlob = Resource.prototype.fetchBlob

        Resource.prototype.fetchBlob = function () {
            const resource = this
            const url = resource.url as string
            if (!matchCacheTile(url) || !originalFetchBlob) {
                return originalFetchBlob ? originalFetchBlob.call(this) : Promise.resolve(null)
            }

            return (async () => {
                try {
                    const cached = await tilesTable.get(url)
                    if (cached && cached.data) {
                        return new Blob([cached.data], {
                            type: cached.contentType || 'image/jpeg'
                        })
                    }
                } catch {}

                const blob: Blob | undefined = await originalFetchBlob.call(this)
                if (!blob) return blob

                try {
                    const buffer = await blob.arrayBuffer()
                    await tilesTable.put({
                        url,
                        data: buffer,
                        contentType: blob.type || 'image/jpeg',
                        ts: Date.now()
                    })
                } catch {}

                return blob
            })()
        }

        Resource.prototype.fetchImage = function (options?: any) {
            const resource = this
            const url = resource.url as string

            if (matchCacheTile(url)) {
                if (!options || typeof options !== 'object') {
                    options = {}
                }
                if (!options.preferBlob) {
                    options = {
                        ...options,
                        preferBlob: true
                    }
                }
            }

            if (originalFetchImage) {
                return originalFetchImage.call(this, options)
            }
            return Promise.resolve(undefined)
        }

        Resource.fetchImage = function (options: any) {
            let url: string | undefined

            if (typeof options === 'string') {
                url = options
                options = { url }
            } else if (options && typeof options.url === 'string') {
                url = options.url
            }

            if (url && matchCacheTile(url)) {
                if (!options || typeof options !== 'object') {
                    options = { url }
                }
                if (!options.preferBlob) {
                    options = {
                        ...options,
                        preferBlob: true
                    }
                }
            }

            if (originalFetchImageStatic) {
                return originalFetchImageStatic.call(Resource, options)
            }
            return Promise.resolve(undefined)
        }

        resourcePatched = true
    }

    function parseCenter(value: string): [number, number] {
        const s = (value || '').trim()
        const parts = s.split(',')
        if (parts.length !== 2) return [0, 0]
        const lng = parseFloat(parts[0])
        const lat = parseFloat(parts[1])
        if (!isFinite(lng) || !isFinite(lat)) return [0, 0]
        return [lng, lat]
    }

    function zoomToHeightLevel(z: number | undefined): number {
        const minZoom = 1
        const maxZoom = 20
        const minHeight = 500
        const maxHeight = 20000000
        const zoom = z ?? 2
        const clampedZoom = Math.max(minZoom, Math.min(maxZoom, zoom))
        const t = (maxZoom - clampedZoom) / (maxZoom - minZoom)
        return minHeight * Math.pow(maxHeight / minHeight, t)
    }

    function heightToZoomLevel(h: number | undefined): number {
        const minZoom = 1
        const maxZoom = 20
        const minHeight = 500
        const maxHeight = 20000000
        const height = h ?? maxHeight
        const heightClamped = Math.max(minHeight, Math.min(maxHeight, height))
        const logRatio = Math.log(maxHeight / minHeight)
        const t = Math.log(heightClamped / minHeight) / logRatio
        const z = maxZoom - t * (maxZoom - minZoom)
        return Math.max(minZoom, Math.min(maxZoom, z))
    }

    function tileXYToQuadKey(x: number, y: number, level: number): string {
        let quadKey = ''
        for (let i = level; i > 0; i--) {
            let digit = 0
            const mask = 1 << (i - 1)
            if ((x & mask) !== 0) {
                digit++
            }
            if ((y & mask) !== 0) {
                digit += 2
            }
            quadKey += digit.toString()
        }
        return quadKey
    }

    async function addSuperMapOverlayLayer(viewer: Cesium.Viewer, url: string, options?: any) {
        if (!viewer || !url) return null

        const CesiumAny = Cesium as any

        const scales84 = [
            3.38032714321e-9, 6.76065428641e-9, 1.352130857282e-8, 2.704261714564e-8, 5.408523429128e-8, 1.0817046858257e-7, 2.1634093716514e-7, 4.3268187433028e-7, 8.6536374866056e-7, 1.73072749732112e-6, 3.46145499464224e-6, 6.92290998928448e-6, 1.3845819978568952e-5, 2.7691639957137904e-5,
            5.538327991427581e-5, 1.1076655982855162e-4, 2.2153311965710323e-4, 4.4306623931420646e-4, 8.861324786284129e-4, 0.0017722649572568258, 0.0035445299145136517, 0.007089059829027303
        ]

        const scalesweb = [
            1.6901635716e-9, 3.38032714321e-9, 6.76065428641e-9, 1.352130857282e-8, 2.704261714564e-8, 5.408523429128e-8, 1.0817046858257e-7, 2.1634093716514e-7, 4.3268187433028e-7, 8.6536374866056e-7, 1.73072749732112e-6, 3.46145499464224e-6, 6.92290998928448e-6, 1.3845819978568952e-5,
            2.7691639957137904e-5, 5.538327991427581e-5, 1.1076655982855162e-4, 2.2153311965710323e-4, 4.4306623931420646e-4, 8.861324786284129e-4, 0.0017722649572568258, 0.0035445299145136517, 0.007089059829027303
        ]

        const opts = options || {}
        const alpha = typeof opts.alpha === 'number' ? opts.alpha : 1
        const show = typeof opts.show === 'boolean' ? opts.show : true

        let minlevel = typeof opts.minimumLevel === 'number' ? opts.minimumLevel : 0
        let maxlevel = typeof opts.maximumLevel === 'number' ? opts.maximumLevel : 22

        try {
            const response = await fetch(url + '.json')
            if (!response.ok) return null
            const result = await response.json()

            const rectangle = Cesium.Rectangle.fromDegrees(-180, -90, 180, 90)
            const proj = result.prjCoordSys || {}
            const epsgcode = proj.epsgCode

            let tilingScheme: any
            let originx = 0
            let originy = 0

            if (epsgcode === 4326 || epsgcode === 4490) {
                tilingScheme = new Cesium.GeographicTilingScheme({
                    numberOfLevelZeroTilesX: 2,
                    numberOfLevelZeroTilesY: 1
                })
                originx = -180
                originy = 90
            } else if (epsgcode === 3857) {
                tilingScheme = new Cesium.WebMercatorTilingScheme()
                originx = -20037508.34
                originy = 20037508.34
            }

            if (opts.minimumLevel !== undefined && typeof opts.minimumLevel === 'number') {
                minlevel = opts.minimumLevel
            }
            if (opts.maximumLevel !== undefined && typeof opts.maximumLevel === 'number') {
                maxlevel = opts.maximumLevel
            }

            const provider = new CesiumAny.UrlTemplateImageryProvider({
                url: url + "/tileImage.png?transparent=true&cacheEnabled=true&width=256&height=256&x={x}&y={y}&scale={scale}&redirect=false&overlapDisplayed=false&origin={'x':" + originx + ",'y':" + originy + '}',
                rectangle,
                minimumLevel: minlevel,
                maximumLevel: maxlevel,
                tilingScheme,
                customTags: {
                    scale: function (_provider: any, x: number, y: number, level: number) {
                        if (epsgcode === 4326 || epsgcode === 4490) {
                            return scales84[level]
                        }
                        if (epsgcode === 3857) {
                            return scalesweb[level]
                        }
                        return scales84[level] ?? 1
                    }
                }
            })

            const layer = viewer.imageryLayers.addImageryProvider(provider)
            ;(layer as any).alpha = 0
            layer.show = show

            const targetAlpha = alpha
            const fadeDuration = typeof opts.fadeDuration === 'number' ? opts.fadeDuration : 2

            if (fadeDuration > 0 && targetAlpha > 0 && typeof requestAnimationFrame === 'function') {
                const start = performance.now()
                function step(now: number) {
                    const t = Math.min(1, (now - start) / (fadeDuration * 1000))
                    const current = targetAlpha * t
                    ;(layer as any).alpha = current
                    if (t < 1 && layer.show) {
                        requestAnimationFrame(step)
                    } else {
                        ;(layer as any).alpha = targetAlpha
                    }
                }
                requestAnimationFrame(step)
            } else {
                ;(layer as any).alpha = targetAlpha
            }

            return layer
        } catch {
            return null
        }
    }

    let {
        id = crypto.randomUUID(),
        style = '',
        center = '103.23455542513432, 37.44294599727905',
        bearing = 3.4508053211576963,
        pitch = -89.84554611545481,
        zoom = 1,
        currentView = false,
        enableTileCache = false,
        basemapStandard = 'bing',
        basemapType = 'imagery',
        mapKey = '094fca72d164a2810961bb5fbd67862d',
        ...rest
    }: Props = $props()

    let containerRef: HTMLDivElement | null = null
    let viewer: Cesium.Viewer | null = null
    let lastEnableTileCache = enableTileCache
    let lastBasemapStandard = basemapStandard
    let lastBasemapType = basemapType
    let lastMapKey = mapKey

    onMount(() => {
        if (!containerRef) return

        if (enableTileCache) {
            enableTileCacheResourcePatch()
        }

        viewer = new Cesium.Viewer(containerRef, {
            imageryProvider: false,
            scene3DOnly: true,
            shadows: false,
            terrainShadows: (Cesium as any).ShadowMode.DISABLED,
            animation: false,
            timeline: false,
            fullscreenButton: false,
            geocoder: false,
            homeButton: false,
            infoBox: false,
            navigationHelpButton: false,
            sceneModePicker: false,
            selectionIndicator: false,
            baseLayerPicker: false,
            vrButton: false,
            shouldAnimate: false
        } as any)

        if (viewer) {
            const controller = viewer.scene.screenSpaceCameraController
            controller.zoomEventTypes = [Cesium.CameraEventType.WHEEL, Cesium.CameraEventType.PINCH]
            controller.tiltEventTypes = [Cesium.CameraEventType.RIGHT_DRAG]
        }

        const CesiumAny = Cesium as any

        function applyBaseLayer() {
            if (!viewer) return
            viewer.imageryLayers.removeAll()

            if (basemapStandard === 'tianditu') {
                const key = mapKey || '094fca72d164a2810961bb5fbd67862d'
                let baseLayer = 'img'
                let labelLayer = 'cia'
                if (basemapType === 'vector') {
                    baseLayer = 'vec'
                    labelLayer = 'cva'
                } else if (basemapType === 'terrain') {
                    baseLayer = 'ter'
                    labelLayer = 'cta'
                }

                const baseTemplate = 'https://t{s}.tianditu.gov.cn/' + baseLayer + '_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=' + baseLayer + '&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=' + key

                const labelTemplate = 'https://t{s}.tianditu.gov.cn/' + labelLayer + '_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=' + labelLayer + '&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=' + key

                const baseProvider = new CesiumAny.UrlTemplateImageryProvider({
                    url: baseTemplate,
                    subdomains: ['0', '1', '2', '3', '4', '5', '6', '7'],
                    minimumLevel: 1,
                    maximumLevel: 18,
                    tileWidth: 256,
                    tileHeight: 256
                })

                const labelProvider = new CesiumAny.UrlTemplateImageryProvider({
                    url: labelTemplate,
                    subdomains: ['0', '1', '2', '3', '4', '5', '6', '7'],
                    minimumLevel: 1,
                    maximumLevel: 18,
                    tileWidth: 256,
                    tileHeight: 256
                })

                viewer.imageryLayers.addImageryProvider(baseProvider)
                viewer.imageryLayers.addImageryProvider(labelProvider)
            } else if (basemapStandard === 'arcgis') {
                let baseUrl = 'https://elevation3d.arcgis.com/arcgis/rest/services/World_Imagery/MapServer'
                if (basemapType === 'vector') {
                    baseUrl = 'https://elevation3d.arcgis.com/arcgis/rest/services/World_Street_Map/MapServer'
                } else if (basemapType === 'terrain') {
                    baseUrl = 'https://elevation3d.arcgis.com/arcgis/rest/services/World_Terrain_Base/MapServer'
                }

                const arcgisTemplate = baseUrl + '/tile/{z}/{y}/{x}'
                const provider = new CesiumAny.UrlTemplateImageryProvider({
                    url: arcgisTemplate,
                    tileWidth: 256,
                    tileHeight: 256,
                    minimumLevel: 0,
                    maximumLevel: 23
                })
                viewer.imageryLayers.addImageryProvider(provider)
            } else {
                const isVector = basemapType === 'vector'
                const prefix = isVector ? 'r' : 'a'
                const ext = isVector ? 'png' : 'jpeg'
                const bingTemplate = 'http://ecn.{s}.tiles.virtualearth.net/tiles/' + prefix + '{quadkey}.' + ext + '?g=15456'

                const customBingProvider = new CesiumAny.UrlTemplateImageryProvider({
                    url: bingTemplate,
                    subdomains: ['t0', 't1', 't2', 't3'],
                    minimumLevel: 1,
                    maximumLevel: 21,
                    tileWidth: 256,
                    tileHeight: 256,
                    customTags: {
                        quadkey: (_provider: any, x: number, y: number, level: number) => tileXYToQuadKey(x, y, level)
                    }
                })

                viewer.imageryLayers.addImageryProvider(customBingProvider)
            }
        }

        applyBaseLayer()

        if (viewer) {
            addSuperMapOverlayLayer(viewer, 'http://211.137.224.74:8090/iserver/services/map-ZYXYZT/rest/maps/水利工程', {
                alpha: 1,
                show: true
            })
        }

        const scene = viewer.scene
        scene.shadowMap.enabled = false
        scene.globe.enableLighting = false
        scene.globe.baseColor = (Cesium as any).Color.DARKGRAY
        ;(scene as any).skyBox.show = false
        ;(scene as any).skyAtmosphere.show = false
        scene.backgroundColor = Cesium.Color.BLACK
        ;(scene as any).postProcessStages.fxaa.enabled = false
        ;(viewer as any).cesiumWidget.creditContainer.style.display = 'none'

        return () => {
            if (viewer) {
                viewer.destroy()
                viewer = null
            }
            if (enableTileCache) {
                clearMapCacheDb()
            }
        }
    })

    $effect(() => {
        if (!viewer) return
        const [lng, lat] = parseCenter(center)
        const height = zoomToHeightLevel(zoom)
        viewer.camera.setView({
            destination: Cesium.Cartesian3.fromDegrees(lng, lat, height),
            orientation: {
                heading: Cesium.Math.toRadians(bearing),
                pitch: Cesium.Math.toRadians(pitch),
                roll: 0
            }
        })
        center
        zoom
        pitch
        bearing
    })

    $effect(() => {
        if (!viewer || !id) return
        const trigger = currentView
        if (trigger) {
            const camera = viewer.camera
            const cartographic = Cesium.Ellipsoid.WGS84.cartesianToCartographic(camera.position)
            const lng = Cesium.Math.toDegrees(cartographic.longitude)
            const lat = Cesium.Math.toDegrees(cartographic.latitude)
            const height = cartographic.height
            const nextCenter = `${lng}, ${lat}`
            const nextZoom = heightToZoomLevel(height)
            const nextPitch = Cesium.Math.toDegrees(camera.pitch)
            const nextBearing = Cesium.Math.toDegrees(camera.heading)
            center = nextCenter
            zoom = nextZoom
            pitch = nextPitch
            bearing = nextBearing
            updateNodeProps(id, {
                attributes: {
                    center: nextCenter,
                    zoom: nextZoom,
                    pitch: nextPitch,
                    bearing: nextBearing,
                    currentView: false
                }
            })
        }
        currentView
    })

    $effect(() => {
        if (lastEnableTileCache && !enableTileCache) {
            clearMapCacheDb()
        }
        lastEnableTileCache = enableTileCache
        enableTileCache
    })

    $effect(() => {
        if (!viewer) return
        if (basemapStandard === lastBasemapStandard && basemapType === lastBasemapType && mapKey === lastMapKey) {
            basemapStandard
            basemapType
            mapKey
            return
        }

        const CesiumAny = Cesium as any
        viewer.imageryLayers.removeAll()

        if (basemapStandard === 'tianditu') {
            const key = mapKey || '094fca72d164a2810961bb5fbd67862d'
            let baseLayer = 'img'
            let labelLayer = 'cia'
            if (basemapType === 'vector') {
                baseLayer = 'vec'
                labelLayer = 'cva'
            } else if (basemapType === 'terrain') {
                baseLayer = 'ter'
                labelLayer = 'cta'
            }

            const baseTemplate = 'https://t{s}.tianditu.gov.cn/' + baseLayer + '_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=' + baseLayer + '&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=' + key

            const labelTemplate = 'https://t{s}.tianditu.gov.cn/' + labelLayer + '_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=' + labelLayer + '&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=' + key

            const baseProvider = new CesiumAny.UrlTemplateImageryProvider({
                url: baseTemplate,
                subdomains: ['0', '1', '2', '3', '4', '5', '6', '7'],
                minimumLevel: 1,
                maximumLevel: 18,
                tileWidth: 256,
                tileHeight: 256
            })

            const labelProvider = new CesiumAny.UrlTemplateImageryProvider({
                url: labelTemplate,
                subdomains: ['0', '1', '2', '3', '4', '5', '6', '7'],
                minimumLevel: 1,
                maximumLevel: 18,
                tileWidth: 256,
                tileHeight: 256
            })

            viewer.imageryLayers.addImageryProvider(baseProvider)
            viewer.imageryLayers.addImageryProvider(labelProvider)
        } else if (basemapStandard === 'arcgis') {
            let baseUrl = 'https://elevation3d.arcgis.com/arcgis/rest/services/World_Imagery/MapServer'
            if (basemapType === 'vector') {
                baseUrl = 'https://elevation3d.arcgis.com/arcgis/rest/services/World_Street_Map/MapServer'
            } else if (basemapType === 'terrain') {
                baseUrl = 'https://elevation3d.arcgis.com/arcgis/rest/services/World_Terrain_Base/MapServer'
            }

            const arcgisTemplate = baseUrl + '/tile/{z}/{y}/{x}'
            const provider = new CesiumAny.UrlTemplateImageryProvider({
                url: arcgisTemplate,
                tileWidth: 256,
                tileHeight: 256,
                minimumLevel: 0,
                maximumLevel: 23
            })
            viewer.imageryLayers.addImageryProvider(provider)
        } else {
            const isVector = basemapType === 'vector'
            const prefix = isVector ? 'r' : 'a'
            const ext = isVector ? 'png' : 'jpeg'
            const bingTemplate = 'http://ecn.{s}.tiles.virtualearth.net/tiles/' + prefix + '{quadkey}.' + ext + '?g=15456'

            const customBingProvider = new CesiumAny.UrlTemplateImageryProvider({
                url: bingTemplate,
                subdomains: ['t0', 't1', 't2', 't3'],
                minimumLevel: 1,
                maximumLevel: 21,
                tileWidth: 256,
                tileHeight: 256,
                customTags: {
                    quadkey: (_provider: any, x: number, y: number, level: number) => tileXYToQuadKey(x, y, level)
                }
            })

            viewer.imageryLayers.addImageryProvider(customBingProvider)
        }

        lastBasemapStandard = basemapStandard
        lastBasemapType = basemapType
        lastMapKey = mapKey
        basemapStandard
        basemapType
        mapKey
    })
</script>

<ResponsiveBox {id} {style} {...rest}>
    <div class="cesium-container" bind:this={containerRef}></div>
</ResponsiveBox>

<style>
    .cesium-container {
        width: 100%;
        height: 100%;
        overflow: hidden;
    }
</style>
