import { Server, Model, Response } from 'miragejs'

let server: Server | null = null

export async function ensureMirage() {
    if (server) return

    server = new Server({
        models: {
            charts: Model // 示例模型，可根据业务扩展
        },

        routes() {
            // 与默认 mockBase 保持一致
            this.namespace = '/mock-api'

            // 通用 GET 拦截，根据 encoded 原始 URL 返回数据
            this.get('/:encoded', (schema, request) => {
                const original = decodeURIComponent(request.params.encoded)
                console.info('[Mirage] GET', original)

                // 结果列表，根据数据库或默认示例生成
                let dataList: any[] = (schema.db.charts as unknown as any[])

                // 如果数据库里没有预置数据，返回一份默认示例，确保任何路径都有数据
                if (dataList.length === 0) {
                    dataList = [
                        {
                            rn: 1,
                            planting_area: 2902,
                            updated_datetime_str: '2025-09-15 06:17:05',
                            irr: 110.59,
                            etc: 4.3,
                            pop: 2.3,
                            mx2t24: 30.3,
                            target_level: '0',
                            olh: 120,
                            mean2t24: 26.7,
                            id: 170041,
                            release_date_str: '2025-09-15',
                            sfd: 0,
                            kc: 1.4,
                            date_str: '2025-09-15',
                            nrd: 0,
                            _2w: 0.29,
                            crop_name: '水稻',
                            ks: 1,
                            wla1: -267.5,
                            moia: 51,
                            irri_volumn: 214062,
                            moib: 30,
                            msl: 0,
                            wlb: -267.5,
                            wla: 60,
                            leak: 4.78,
                            mn2t24: 23.1,
                            growth_period: '水稻_乳熟期',
                            et0: 3.07,
                            irrigated_unit: '二支渠',
                            warning: '无',
                            irrigated_area: '2503高邮水利专业模型'
                        },
                        {
                            rn: 2,
                            planting_area: 1800,
                            updated_datetime_str: '2025-09-16 07:20:10',
                            irr: 98.2,
                            etc: 3.9,
                            pop: 2.1,
                            mx2t24: 28.5,
                            target_level: '1',
                            olh: 100,
                            mean2t24: 24.3,
                            id: 170042,
                            release_date_str: '2025-09-16',
                            sfd: 0,
                            kc: 1.35,
                            date_str: '2025-09-16',
                            nrd: 1,
                            _2w: 0.25,
                            crop_name: '小麦',
                            ks: 0.9,
                            wla1: -200.0,
                            moia: 48,
                            irri_volumn: 178000,
                            moib: 32,
                            msl: 0,
                            wlb: -200.0,
                            wla: 50,
                            leak: 4.12,
                            mn2t24: 22.0,
                            growth_period: '小麦_拔节期',
                            et0: 2.95,
                            irrigated_unit: '三支渠',
                            warning: '适宜',
                            irrigated_area: '高邮示范田'
                        },
                        {
                            rn: 3,
                            planting_area: 3500,
                            updated_datetime_str: '2025-09-17 08:15:30',
                            irr: 125.7,
                            etc: 4.6,
                            pop: 2.6,
                            mx2t24: 31.1,
                            target_level: '0',
                            olh: 130,
                            mean2t24: 27.5,
                            id: 170043,
                            release_date_str: '2025-09-17',
                            sfd: 0,
                            kc: 1.45,
                            date_str: '2025-09-17',
                            nrd: 0,
                            _2w: 0.31,
                            crop_name: '玉米',
                            ks: 1.05,
                            wla1: -290.0,
                            moia: 55,
                            irri_volumn: 240000,
                            moib: 28,
                            msl: 0,
                            wlb: -290.0,
                            wla: 65,
                            leak: 5.04,
                            mn2t24: 24.0,
                            growth_period: '玉米_抽雄期',
                            et0: 3.25,
                            irrigated_unit: '四支渠',
                            warning: '注意灌溉',
                            irrigated_area: '2503高邮水利专业模型'
                        }
                    ]
                }

                // 返回统一格式结构体
                return {
                    isSuccess: true,
                    resultMessage: '查询成功。',
                    result: dataList
                }
            })

            // 示例 POST
            this.post('/:encoded', (schema, request) => {
                const data = JSON.parse(request.requestBody)
                const inserted = schema.db.charts.insert(data)
                return new Response(201, {}, inserted)
            })
        }
    })

    console.info('MirageJS server started')
}