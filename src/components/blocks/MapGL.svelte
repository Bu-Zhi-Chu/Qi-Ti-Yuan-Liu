<script lang="ts">
    import { onMount } from 'svelte'
    import ResponsiveBox from '../core/ResponsiveBox.svelte'
    import { updateNodeProps } from '../../services/parser/property-panel.service'
    import type { Map as MaptalksMap, GroupGLLayer, GLTFLayer, PolygonLayer } from 'maptalks-gl'
    import { Map, GroupGLLayer as GroupGLLayerImpl, GLTFLayer as GLTFLayerImpl, PolygonLayer as PolygonLayerImpl } from 'maptalks-gl'
    import * as maptalks from 'maptalks'

    interface Props {
        id?: string
        style?: string
        center?: string
        bearing?: number
        pitch?: number
        zoom?: number
        currentView?: boolean
        baseMapType?: 'imagery' | 'vector' | 'terrain'
        tiandituToken?: string
        enableCache?: boolean
        [key: string]: any
    }

    let {
        id = crypto.randomUUID(),
        style = '',
        center = '103.23455542513432, 37.44294599727905',
        bearing = 3.4508053211576963,
        pitch = -89.84554611545481,
        zoom = 1,
        currentView = false,
        baseMapType = 'imagery',
        tiandituToken = '094fca72d164a2810961bb5fbd67862d',
        enableCache = false,
        ...rest
    }: Props = $props()

    let containerRef: HTMLDivElement | null = null
    let map: MaptalksMap | null = null
    let groupLayer: GroupGLLayer | null = null
    let handleClick: ((e: any) => void) | null = null
    let tianYX: maptalks.TileLayer | null = null
    let tianYXBZ: maptalks.TileLayer | null = null
    let tianPM: maptalks.TileLayer | null = null
    let tianPMBZ: maptalks.TileLayer | null = null
    let tianDX: maptalks.TileLayer | null = null
    let tianDXBZ: maptalks.TileLayer | null = null

    const MAP_CACHE_DB = 'mapCache'
    const MAP_CACHE_STORE = 'tiles'
    let mapCacheDbPromise: Promise<IDBDatabase> | null = null

    function openMapCacheDb(): Promise<IDBDatabase> {
        if (typeof indexedDB === 'undefined') {
            return Promise.reject(new Error('indexedDB not available'))
        }
        if (!mapCacheDbPromise) {
            mapCacheDbPromise = new Promise((resolve, reject) => {
                const req = indexedDB.open(MAP_CACHE_DB, 1)
                req.onupgradeneeded = () => {
                    const db = req.result
                    if (!db.objectStoreNames.contains(MAP_CACHE_STORE)) {
                        db.createObjectStore(MAP_CACHE_STORE, { keyPath: 'id' })
                    }
                }
                req.onsuccess = () => resolve(req.result)
                req.onerror = () => reject(req.error || new Error('openMapCacheDb failed'))
            })
        }
        return mapCacheDbPromise
    }

    function fetchAndStoreTile(id: string, url: string): Promise<Blob> {
        return fetch(url)
            .then((resp) => {
                if (!resp.ok) {
                    throw new Error(`tile request failed: ${resp.status}`)
                }
                return resp.blob()
            })
            .then(async (blob) => {
                try {
                    const db = await openMapCacheDb()
                    const tx = db.transaction(MAP_CACHE_STORE, 'readwrite')
                    const store = tx.objectStore(MAP_CACHE_STORE)
                    store.put({ id, blob })
                } catch {}
                return blob
            })
    }

    function getTileBlob(id: string, url: string): Promise<Blob> {
        return openMapCacheDb()
            .then(
                (db) =>
                    new Promise<Blob>((resolve, reject) => {
                        const tx = db.transaction(MAP_CACHE_STORE, 'readonly')
                        const store = tx.objectStore(MAP_CACHE_STORE)
                        const req = store.get(id)
                        req.onsuccess = () => {
                            const record = req.result as any
                            if (record && record.blob instanceof Blob) {
                                resolve(record.blob)
                            } else {
                                fetchAndStoreTile(id, url).then(resolve).catch(reject)
                            }
                        }
                        req.onerror = () => {
                            fetchAndStoreTile(id, url).then(resolve).catch(reject)
                        }
                    })
            )
            .catch(() => fetchAndStoreTile(id, url))
    }

    function deleteMapCacheDb() {
        if (typeof indexedDB === 'undefined') return
        indexedDB.deleteDatabase(MAP_CACHE_DB)
        mapCacheDbPromise = null
    }
    let lastEnableCache = enableCache

    function parseCenter(value: string): [number, number] {
        const s = (value || '').trim()
        const parts = s.split(',')
        if (parts.length !== 2) return [0, 0]
        const lng = parseFloat(parts[0])
        const lat = parseFloat(parts[1])
        if (!isFinite(lng) || !isFinite(lat)) return [0, 0]
        return [lng, lat]
    }

    function applyViewToProps(view: any) {
        if (!view) return
        const c = view.center || [0, 0]
        const lng = typeof c[0] === 'number' ? c[0] : 0
        const lat = typeof c[1] === 'number' ? c[1] : 0
        center = `${lng}, ${lat}`
        if (typeof view.zoom === 'number') {
            zoom = view.zoom
        }
        if (typeof view.pitch === 'number') {
            pitch = view.pitch
        }
        if (typeof view.bearing === 'number') {
            bearing = view.bearing
        }
    }

    function createTiandituLayers(token: string) {
        const tileSystem: [number, number, number, number] = [1, -1, -180, 90]
        const spatialReference = {
            projection: 'EPSG:4326'
        } as const

        tianYX = new maptalks.TileLayer('tianYX', {
            tileSystem,
            urlTemplate: `http://t0.tianditu.com/DataServer?T=img_c&x={x}&y={y}&l={z}&tk=${token}`,
            spatialReference,
            maxAvailableZoom: 18.45
        })

        tianYXBZ = new maptalks.TileLayer('tianYXBZ', {
            tileSystem,
            urlTemplate: `http://t0.tianditu.com/DataServer?T=cia_c&x={x}&y={y}&l={z}&tk=${token}`,
            spatialReference,
            maxAvailableZoom: 18.45
        })

        tianPM = new maptalks.TileLayer('tianPM', {
            tileSystem,
            urlTemplate: `http://t0.tianditu.com/DataServer?T=vec_c&x={x}&y={y}&l={z}&tk=${token}`,
            spatialReference,
            maxAvailableZoom: 18.45
        })

        tianPMBZ = new maptalks.TileLayer('tianPMBZ', {
            tileSystem,
            urlTemplate: `http://t0.tianditu.com/DataServer?T=cva_c&x={x}&y={y}&l={z}&tk=${token}`,
            spatialReference,
            maxAvailableZoom: 18.45
        })

        tianDX = new maptalks.TileLayer('tianDX', {
            tileSystem,
            urlTemplate: `http://t0.tianditu.com/DataServer?T=ter_c&x={x}&y={y}&l={z}&tk=${token}`,
            spatialReference,
            maxAvailableZoom: 18.45
        })

        tianDXBZ = new maptalks.TileLayer('tianDXBZ', {
            tileSystem,
            urlTemplate: `http://t0.tianditu.com/DataServer?T=cta_c&x={x}&y={y}&l={z}&tk=${token}`,
            spatialReference,
            maxAvailableZoom: 18.45
        })

        const layers: maptalks.TileLayer[] = []
        if (tianYX) layers.push(tianYX)
        if (tianYXBZ) layers.push(tianYXBZ)
        if (tianPM) layers.push(tianPM)
        if (tianPMBZ) layers.push(tianPMBZ)
        if (tianDX) layers.push(tianDX)
        if (tianDXBZ) layers.push(tianDXBZ)

        layers.forEach((layer) => {
            layer.on('renderercreate', (e: any) => {
                const renderer = e.renderer
                if (!renderer) return
                const original = renderer.loadTileImage?.bind(renderer)
                renderer.loadTileImage = (img: HTMLImageElement, url: string) => {
                    if (!enableCache) {
                        if (original) {
                            original(img, url)
                        } else {
                            img.src = url
                        }
                        return
                    }
                    getTileBlob(url, url)
                        .then((blob) => {
                            img.src = URL.createObjectURL(blob)
                        })
                        .catch(() => {
                            if (original) {
                                original(img, url)
                            } else {
                                img.src = url
                            }
                        })
                }
            })
        })
    }

    function applyBaseMap(type: 'imagery' | 'vector' | 'terrain') {
        if (!map) return
        const baseLayers: (maptalks.TileLayer | null)[] = [tianYX, tianYXBZ, tianPM, tianPMBZ, tianDX, tianDXBZ]
        for (const l of baseLayers) {
            if (l && l.getMap()) {
                map.removeLayer(l)
            }
        }
        if (type === 'imagery') {
            if (tianYX) map.addLayer(tianYX)
            if (tianYXBZ) map.addLayer(tianYXBZ)
        } else if (type === 'vector') {
            if (tianPM) map.addLayer(tianPM)
            if (tianPMBZ) map.addLayer(tianPMBZ)
        } else {
            if (tianDX) map.addLayer(tianDX)
            if (tianDXBZ) map.addLayer(tianDXBZ)
        }
    }

    onMount(() => {
        if (!containerRef) return

        map = new Map(containerRef, {
            center: [0, 0],
            zoom: 2,
            devicePixelRatio: 1,
            lights: {
                //方相光
                directional: {
                    direction: [1, 0, -1],
                    color: [1, 1, 1]
                },
                //环境光
                ambient: {
                    resource: null,
                    exposure: 0.8,
                    hsv: [0, 0.34, 0],
                    orientation: 1
                }
            }
        } as any) as MaptalksMap

        createTiandituLayers(tiandituToken)
        applyBaseMap(baseMapType || 'imagery')

        groupLayer = new GroupGLLayerImpl('group', [], {}) as GroupGLLayer
        map.addLayer(groupLayer)

        const gltfLayer = new GLTFLayerImpl('gltflayer') as GLTFLayer
        const polygonLayer = new PolygonLayerImpl('polygonlayer') as PolygonLayer
        groupLayer.addLayer(gltfLayer)
        groupLayer.addLayer(polygonLayer)

        handleClick = () => {
            if (!map) return
            const view = (map as any).getView()
            applyViewToProps(view)
        }
        ;(map as any).on('click', handleClick)

        return () => {
            const baseLayers: (maptalks.TileLayer | null)[] = [tianYX, tianYXBZ, tianPM, tianPMBZ, tianDX, tianDXBZ]
            if (map) {
                for (const l of baseLayers) {
                    if (l && l.getMap()) {
                        map.removeLayer(l)
                    }
                }
            }
            if (groupLayer) {
                groupLayer.remove()
                groupLayer = null
            }
            if (map) {
                if (handleClick) {
                    ;(map as any).off('click', handleClick)
                    handleClick = null
                }
                map.remove()
                map = null
            }
            if (enableCache) {
                deleteMapCacheDb()
            }
        }
    })

    $effect(() => {
        if (!map || !id) return
        const trigger = currentView
        if (trigger) {
            const view = (map as any).getView()
            const c = view.center || [0, 0]
            const lng = typeof c[0] === 'number' ? c[0] : 0
            const lat = typeof c[1] === 'number' ? c[1] : 0
            const nextCenter = `${lng}, ${lat}`
            const nextZoom = typeof view.zoom === 'number' ? view.zoom : zoom
            const nextPitch = typeof view.pitch === 'number' ? view.pitch : pitch
            const nextBearing = typeof view.bearing === 'number' ? view.bearing : bearing
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
        if (lastEnableCache && !enableCache) {
            deleteMapCacheDb()
        }
        lastEnableCache = enableCache
        enableCache
    })

    $effect(() => {
        if (!map) return
        applyBaseMap(baseMapType || 'imagery')
        baseMapType
    })

    $effect(() => {
        if (!map) return
        const [lng, lat] = parseCenter(center)
        ;(map as any).setView({
            center: [lng, lat],
            zoom,
            pitch,
            bearing
        })
        center
        zoom
        pitch
        bearing
    })
</script>

<ResponsiveBox {id} {style} {...rest}>
    <div class="map-wrapper" bind:this={containerRef}></div>
</ResponsiveBox>

<style>
    .map-wrapper {
        width: 100%;
        height: 100%;
    }
</style>
