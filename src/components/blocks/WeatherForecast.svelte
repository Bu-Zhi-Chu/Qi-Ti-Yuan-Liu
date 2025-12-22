<script lang="ts">
    import type { Snippet } from 'svelte'
    import ResponsiveBox from '../core/ResponsiveBox.svelte'

    interface Props {
        style?: string
        stationId?: string
        layout?: 'compact' | 'day' | 'three' | 'seven'
        panelColor?: string
        subPanelColor?: string
        children?: Snippet
        'data-id'?: string
        [key: string]: any
    }

    let { style = '', stationId = 'TynGR', layout = 'compact', panelColor = '', subPanelColor = '', children, 'data-id': dataId = '', ...restProps }: Props = $props()

    let loading = $state(false)
    let error = $state<string | null>(null)
    let data = $state<any>(null)

    const endpoint = $derived(() => {
        const id = String(stationId ?? 'TynGR').trim() || 'TynGR'
        return `https://www.nmc.cn/rest/weather?stationid=${encodeURIComponent(id)}`
    })

    const real = $derived(() => data?.data?.real ?? null)
    const station = $derived(() => real()?.station ?? null)
    const weather = $derived(() => real()?.weather ?? null)
    const wind = $derived(() => real()?.wind ?? null)
    const publishTime = $derived(() => String(real()?.publish_time ?? ''))

    const iconUrl = $derived(() => {
        const img = weather()?.img
        const code = img === undefined || img === null ? '' : String(img).trim()
        if (!code || code === '9999') return ''
        return `https://image.nmc.cn/assets/img/w/40x40/4/${encodeURIComponent(code)}.png`
    })

    function iconUrlFromImg(img: any): string {
        const code = img === undefined || img === null ? '' : String(img).trim()
        if (!code || code === '9999') return ''
        return `https://image.nmc.cn/assets/img/w/40x40/4/${encodeURIComponent(code)}.png`
    }

    const predict = $derived(() => data?.data?.predict ?? null)
    const forecastPublishTime = $derived(() => String(predict()?.publish_time ?? ''))
    const forecastDetail = $derived(() => (Array.isArray(predict()?.detail) ? (predict()?.detail as any[]) : []))

    const forecastDays = $derived(() => {
        const list = forecastDetail()
        if (layout === 'seven') return list.slice(0, 7)
        if (layout === 'three') return list.slice(0, 3)
        if (layout === 'day') return list.slice(0, 1)
        return []
    })

    const forecastGridTemplateColumns = $derived(() => {
        const n = forecastDays().length
        return n > 0 ? `repeat(${n}, minmax(0, 1fr))` : '1fr'
    })

    const forecastDensity = $derived(() => {
        const n = forecastDays().length
        if (n >= 7) return 0.8
        if (n >= 5) return 0.88
        return 1
    })

    function formatForecastDateShort(dateStr: any): string {
        const s = String(dateStr ?? '').trim()
        const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
        if (!m) return s
        return `${m[2]}-${m[3]}`
    }

    function formatForecastWeekday(dateStr: any): string {
        const s = String(dateStr ?? '').trim()
        const d = new Date(`${s}T00:00:00`)
        if (!Number.isFinite(d.getTime())) return ''
        const labels = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
        return labels[d.getDay()] ?? ''
    }

    function formatTempValue(v: any): string {
        const n = Number(v)
        if (!Number.isFinite(n)) return ''
        const rounded = Math.round(n * 10) / 10
        return String(rounded).replace(/\.0$/, '')
    }

    function getForecastTempRange(d: any): { minText: string; maxText: string; rangeText: string } {
        const dayT = formatTempValue(d?.day?.weather?.temperature)
        const nightT = formatTempValue(d?.night?.weather?.temperature)
        const a = dayT ? Number(dayT) : NaN
        const b = nightT ? Number(nightT) : NaN
        const nums = [a, b].filter((x) => Number.isFinite(x)) as number[]
        if (!nums.length) return { minText: '--', maxText: '--', rangeText: '--' }
        const min = Math.min(...nums)
        const max = Math.max(...nums)
        const minText = formatTempValue(min) || '--'
        const maxText = formatTempValue(max) || '--'
        return { minText, maxText, rangeText: `${minText}~${maxText}℃` }
    }

    function getForecastLabel(d: any): { info: string; img: any; windDirect: string; windPower: string } {
        const info = String(d?.day?.weather?.info ?? d?.night?.weather?.info ?? '')
        const img = d?.day?.weather?.img ?? d?.night?.weather?.img
        const windDirect = String(d?.day?.wind?.direct ?? d?.night?.wind?.direct ?? '')
        const windPower = String(d?.day?.wind?.power ?? d?.night?.wind?.power ?? '')
        return { info, img, windDirect, windPower }
    }

    const todayForecast = $derived(() => forecastDetail()[0] ?? null)
    const compactCity = $derived(() => String(station()?.city ?? ''))
    const dayTempRange = $derived(() => {
        const d = todayForecast()
        return d ? getForecastTempRange(d) : { minText: '--', maxText: '--', rangeText: '--' }
    })
    const dayIconUrl = $derived(() => {
        const d = todayForecast()
        return iconUrlFromImg(d?.day?.weather?.img ?? weather()?.img)
    })
    const compactIconUrl = $derived(() => {
        const d = todayForecast()
        return iconUrlFromImg(d?.day?.weather?.img ?? weather()?.img)
    })
    const compactTempRange = $derived(() => {
        const d = todayForecast()
        const dayT = formatTempValue(d?.day?.weather?.temperature)
        const nightT = formatTempValue(d?.night?.weather?.temperature)
        if (dayT && nightT) {
            const a = Number(dayT)
            const b = Number(nightT)
            const min = Math.min(a, b)
            const max = Math.max(a, b)
            return `${formatTempValue(min)}~${formatTempValue(max)}℃`
        }
        const t = formatTempValue(weather()?.temperature)
        return t ? `${t}℃` : '--'
    })
    const compactWindText = $derived(() => {
        const d = todayForecast()
        const w = wind()?.direct ?? d?.day?.wind?.direct ?? d?.night?.wind?.direct ?? ''
        return String(w ?? '')
    })

    const panelBg = $derived(() => {
        const c = String(panelColor ?? '').trim()
        return c || 'rgba(15, 23, 42, 0.35)'
    })

    const subPanelBg = $derived(() => {
        const c = String(subPanelColor ?? '').trim()
        return c || 'rgba(2, 6, 23, 0.22)'
    })

    const styleHasColor = $derived(() => /(^|;)\s*color\s*:/i.test(String(style ?? '')))
    const styleHasFontSize = $derived(() => /(^|;)\s*font-size\s*:/i.test(String(style ?? '')))
    const styleHasFontWeight = $derived(() => /(^|;)\s*font-weight\s*:/i.test(String(style ?? '')))
    const styleHasLineHeight = $derived(() => /(^|;)\s*line-height\s*:/i.test(String(style ?? '')))
    const styleHasTextAlign = $derived(() => /(^|;)\s*text-align\s*:/i.test(String(style ?? '')))

    const cardStyle = $derived(() => {
        const pad = layout === 'compact' ? 6 : 10
        const gap = layout === 'compact' ? 6 : 8
        const justify = layout === 'compact' ? 'center' : layout === 'day' ? 'center' : 'flex-start'
        const color = styleHasColor() ? 'inherit' : '#e2e8f0'
        const fontSize = styleHasFontSize() ? 'inherit' : 'calc(14px * var(--scale-ratio, 1))'
        const fontWeight = styleHasFontWeight() ? 'inherit' : '600'
        const lineHeight = styleHasLineHeight() ? 'inherit' : '1.4'
        const textAlign = styleHasTextAlign() ? 'inherit' : layout === 'day' ? 'center' : 'left'
        return `width:100%;height:100%;min-width:0;min-height:0;display:flex;flex-direction:column;justify-content:${justify};gap:calc(${gap}px * var(--scale-ratio, 1));padding:calc(${pad}px * var(--scale-ratio, 1));box-sizing:border-box;color:${color};font-family:inherit;font-size:${fontSize};font-weight:${fontWeight};line-height:${lineHeight};text-align:${textAlign};background:${panelBg()};overflow:hidden;`
    })

    $effect(() => {
        const url = endpoint()
        const controller = new AbortController()

        loading = true
        error = null
        data = null

        fetch(url, { signal: controller.signal })
            .then(async (res) => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`)
                return res.json()
            })
            .then((json) => {
                data = json
                console.log('[WeatherForecast] data:', json)
            })
            .catch((err) => {
                if (controller.signal.aborted) return
                error = err instanceof Error ? err.message : String(err)
                console.log('[WeatherForecast] error:', err)
            })
            .finally(() => {
                if (!controller.signal.aborted) loading = false
            })

        return () => controller.abort()
    })
</script>

<ResponsiveBox {style} data-id={dataId} {...restProps}>
    <div style="position:absolute;inset:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;padding:calc(10px * var(--scale-ratio, 1));box-sizing:border-box;overflow:hidden;">
        <div style={cardStyle()}>
            {#if loading}
                <div style="opacity:0.85;text-align:center;">loading...</div>
            {:else if error}
                <div style="color:#fb7185;word-break:break-word;overflow:hidden;text-overflow:ellipsis;">{error}</div>
            {:else if weather()}
                {#if layout === 'compact'}
                    <div style="display:flex;align-items:center;justify-content:center;gap:calc(10px * var(--scale-ratio, 1));width:100%;min-width:0;white-space:nowrap;overflow:hidden;">
                        <div style="overflow:hidden;text-overflow:ellipsis;">
                            {compactCity() || station()?.province || ''}
                        </div>
                        {#if compactIconUrl()}
                            <img src={compactIconUrl()} alt={weather()?.info ?? 'weather'} style="width:calc(22px * var(--scale-ratio, 1));height:calc(22px * var(--scale-ratio, 1));flex:0 0 auto;margin-top:-1%;" />
                        {/if}
                        <div style="flex:0 0 auto;">
                            {compactTempRange()}
                        </div>
                        <div style="opacity:0.9;overflow:hidden;text-overflow:ellipsis;">
                            {compactWindText()}
                        </div>
                    </div>
                {:else if layout === 'day'}
                    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:calc(10px * var(--scale-ratio, 1));width:100%;min-width:0;">
                        <div style="font-size:1.1em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;">
                            {station()?.province ?? ''}{station()?.city ?? ''}
                        </div>

                        <div style="display:flex;align-items:center;justify-content:center;gap:calc(10px * var(--scale-ratio, 1));min-width:0;max-width:100%;overflow:hidden;">
                            {#if dayIconUrl()}
                                <img src={dayIconUrl()} alt={weather()?.info ?? 'weather'} style="width:calc(44px * var(--scale-ratio, 1));height:calc(44px * var(--scale-ratio, 1));flex:0 0 auto;" />
                            {/if}
                            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:calc(2px * var(--scale-ratio, 1));min-width:0;">
                                <div style="font-size:2em;line-height:1;white-space:nowrap;">
                                    {dayTempRange().minText}~{dayTempRange().maxText}°
                                </div>
                                <div style="font-size:0.86em;opacity:0.75;white-space:nowrap;">
                                    当前 {weather()?.temperature ?? '--'}°{weather()?.info ? ` · ${weather()?.info}` : ''}
                                </div>
                            </div>
                        </div>

                        <div style="font-size:0.79em;opacity:0.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;">
                            风 {wind()?.direct ?? ''}{wind()?.power ? ` ${wind()?.power}` : ''} · 湿度 {weather()?.humidity ?? '--'}% · 体感 {weather()?.feelst ?? '--'}°
                        </div>

                        <div style="display:flex;justify-content:center;flex-wrap:wrap;gap:calc(8px * var(--scale-ratio, 1));font-size:0.79em;opacity:0.85;overflow:hidden;max-width:100%;">
                            <div style="white-space:nowrap;">温差 {weather()?.temperatureDiff ?? '--'}°</div>
                            <div style="white-space:nowrap;">降水 {weather()?.rain ?? '--'}mm</div>
                        </div>
                    </div>
                {/if}

                {#if layout !== 'compact' && layout !== 'day' && forecastDays().length}
                    <div style={`--forecast-density:${forecastDensity()};flex:1 1 0;min-height:0;overflow:hidden;display:flex;flex-direction:column;gap:calc(6px * var(--scale-ratio, 1) * var(--forecast-density, 1));`}>
                        <div style={`flex:1 1 0;min-height:0;display:grid;grid-template-columns:${forecastGridTemplateColumns()};grid-template-rows:minmax(0, 1fr);gap:calc(8px * var(--scale-ratio, 1) * var(--forecast-density, 1));align-items:stretch;overflow:hidden;`}>
                            {#each forecastDays() as d (d.date)}
                                {@const label = getForecastLabel(d)}
                                {@const temps = getForecastTempRange(d)}
                                <div
                                    style={`height:100%;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:space-between;text-align:${styleHasTextAlign() ? 'inherit' : 'center'};gap:calc(6px * var(--scale-ratio, 1) * var(--forecast-density, 1));padding:calc(8px * var(--scale-ratio, 1) * var(--forecast-density, 1));border-radius:calc(8px * var(--scale-ratio, 1));background:${subPanelBg()};border:calc(1px * var(--scale-ratio, 1)) solid rgba(255,255,255,0.06);min-width:0;overflow:hidden;`}
                                >
                                    <div style="display:flex;flex-direction:column;gap:calc(2px * var(--scale-ratio, 1));min-width:0;">
                                        <div style="font-size:calc(0.79em * var(--forecast-density, 1));opacity:0.95;white-space:nowrap;">
                                            {formatForecastDateShort(d.date)}
                                        </div>
                                        <div style="font-size:calc(0.71em * var(--forecast-density, 1));opacity:0.75;white-space:nowrap;">
                                            {formatForecastWeekday(d.date)}
                                        </div>
                                    </div>

                                    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:calc(4px * var(--scale-ratio, 1) * var(--forecast-density, 1));min-width:0;min-height:0;overflow:hidden;">
                                        {#if iconUrlFromImg(label.img)}
                                            <img src={iconUrlFromImg(label.img)} alt={label.info || 'weather'} style="width:calc(28px * var(--scale-ratio, 1) * var(--forecast-density, 1));height:calc(28px * var(--scale-ratio, 1) * var(--forecast-density, 1));flex:0 0 auto;" />
                                        {/if}

                                        <div style="font-size:calc(0.79em * var(--forecast-density, 1));white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;">
                                            {label.info}
                                        </div>

                                        <div style="font-size:calc(0.71em * var(--forecast-density, 1));opacity:0.8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;">
                                            {label.windDirect}{label.windPower ? ` ${label.windPower}` : ''}
                                        </div>
                                    </div>

                                    <div
                                        style="width:100%;min-width:0;padding:calc(5px * var(--scale-ratio, 1) * var(--forecast-density, 1)) calc(6px * var(--scale-ratio, 1) * var(--forecast-density, 1));border-radius:calc(999px * var(--scale-ratio, 1));background:linear-gradient(90deg, rgba(56,189,248,0.22) 0%, rgba(251,113,133,0.22) 100%);border:calc(1px * var(--scale-ratio, 1)) solid rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:space-between;gap:calc(6px * var(--scale-ratio, 1) * var(--forecast-density, 1));box-sizing:border-box;"
                                    >
                                        <div style="font-size:calc(0.71em * var(--forecast-density, 1));opacity:0.95;white-space:nowrap;">
                                            {temps.minText}°
                                        </div>
                                        <div style="font-size:calc(0.71em * var(--forecast-density, 1));opacity:0.95;white-space:nowrap;">
                                            {temps.maxText}°
                                        </div>
                                    </div>
                                </div>
                            {/each}
                        </div>
                    </div>
                {/if}
            {:else}
                <div style="opacity:0.85;text-align:center;">no data</div>
            {/if}
        </div>
    </div>
</ResponsiveBox>
