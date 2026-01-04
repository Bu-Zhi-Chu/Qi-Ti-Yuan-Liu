<script lang="ts">
    import { onMount } from 'svelte'
    import ResponsiveBox from '../core/ResponsiveBox.svelte'
    import { updateNodeProps } from '../../services/parser/property-panel.service'
    import type { Map as MaptalksMap, GroupGLLayer, VectorTileLayer, GLTFLayer, PolygonLayer } from 'maptalks-gl'
    import { Map, GroupGLLayer as GroupGLLayerImpl, VectorTileLayer as VectorTileLayerImpl, GLTFLayer as GLTFLayerImpl, PolygonLayer as PolygonLayerImpl } from 'maptalks-gl'
    import * as maptalks from 'maptalks'

    interface Props {
        id?: string
        style?: string
        center?: string
        bearing?: number
        pitch?: number
        zoom?: number
        currentView?: boolean
        baseMapType?: 'imagery' | 'vector'
        tiandituToken?: string
        [key: string]: any
    }

    let { id = crypto.randomUUID(), style = '', center = '0, 0', bearing = 0, pitch = 0, zoom = 2, currentView = false, baseMapType = 'imagery', tiandituToken = '094fca72d164a2810961bb5fbd67862d', ...rest }: Props = $props()

    let containerRef: HTMLDivElement | null = null
    let map: MaptalksMap | null = null
    let groupLayer: GroupGLLayer | null = null
    let handleClick: ((e: any) => void) | null = null
    let tianYX: maptalks.TileLayer | null = null
    let tianYXBZ: maptalks.TileLayer | null = null
    let tianPM: maptalks.TileLayer | null = null
    let tianPMBZ: maptalks.TileLayer | null = null

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
    }

    function applyBaseMap(type: 'imagery' | 'vector') {
        if (!map) return
        const baseLayers: (maptalks.TileLayer | null)[] = [tianYX, tianYXBZ, tianPM, tianPMBZ]
        for (const l of baseLayers) {
            if (l && l.getMap()) {
                map.removeLayer(l)
            }
        }
        if (type === 'imagery') {
            if (tianYX) map.addLayer(tianYX)
            if (tianYXBZ) map.addLayer(tianYXBZ)
        } else {
            if (tianPM) map.addLayer(tianPM)
            if (tianPMBZ) map.addLayer(tianPMBZ)
        }
    }

    onMount(() => {
        if (!containerRef) return

        map = new Map(containerRef, {
            center: [0, 0],
            zoom: 2
        }) as MaptalksMap

        createTiandituLayers(tiandituToken)
        applyBaseMap(baseMapType || 'imagery')

        const vtLayer = new VectorTileLayerImpl('vt', {
            urlTemplate: 'http://tile.maptalks.com/test/planet-single/{z}/{x}/{y}.mvt'
        }) as VectorTileLayer

        groupLayer = new GroupGLLayerImpl('group', [vtLayer], {}) as GroupGLLayer
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
            const baseLayers: (maptalks.TileLayer | null)[] = [tianYX, tianYXBZ, tianPM, tianPMBZ]
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
