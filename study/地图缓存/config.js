//地图相关配置
const pool = new PhotoPool()
//天地图Token
// var tiandituToken = "6929a4e43aa5bf862cdba83837624eae";
// var tiandituToken ="403d9444d1013d18fb5b3052056863b3"
// var tiandituToken ="dbbe43ccac08fa8af59bfbcc14a3b7c2"
var tiandituToken = "094fca72d164a2810961bb5fbd67862d";
//天地图底图
var tianYX = new maptalks.TileLayer("tianYX", {
    tileSystem: [1, -1, -180, 90],
    urlTemplate: "http://t0.tianditu.com/DataServer?T=img_c&x={x}&y={y}&l={z}&tk=" + tiandituToken,
    spatialReference: {
        projection: "EPSG:4326",
    },
    maxAvailableZoom: 18.45,
})
tianYX.on('renderercreate', function (e) {
    //load tile image
    //   img(Image): an Image object
    //   url(String): the url of the tile
    e.renderer.loadTileImage = function (img, url) {
        pool.getImageData(url, url, (blob) => {
            // 为瓦片图片赋值
            img.src = URL.createObjectURL(blob)
        })
    };
});
var tianYXBZ = new maptalks.TileLayer("tianYXBZ", {
    tileSystem: [1, -1, -180, 90],
    urlTemplate: "http://t0.tianditu.com/DataServer?T=cia_c&x={x}&y={y}&l={z}&tk=" + tiandituToken,
    spatialReference: {
        projection: "EPSG:4326",
    },
    maxAvailableZoom: 18.45,
});
tianYXBZ.on('renderercreate', function (e) {
    //load tile image
    //   img(Image): an Image object
    //   url(String): the url of the tile
    e.renderer.loadTileImage = function (img, url) {
        pool.getImageData(url, url, (blob) => {
            // 为瓦片图片赋值
            img.src = URL.createObjectURL(blob)
        })
    };
});
var tianPM = new maptalks.TileLayer("tianPM", {
    tileSystem: [1, -1, -180, 90],
    urlTemplate: "http://t0.tianditu.com/DataServer?T=vec_c&x={x}&y={y}&l={z}&tk=" + tiandituToken,
    spatialReference: {
        projection: "EPSG:4326",
    },
    maxAvailableZoom: 18.45,
})
tianPM.on('renderercreate', function (e) {
    //load tile image
    //   img(Image): an Image object
    //   url(String): the url of the tile
    e.renderer.loadTileImage = function (img, url) {
        pool.getImageData(url, url, (blob) => {
            // 为瓦片图片赋值
            img.src = URL.createObjectURL(blob)
        })
    };
});
var tianPMBZ = new maptalks.TileLayer("tianPMBZ", {
    tileSystem: [1, -1, -180, 90],
    urlTemplate: "http://t0.tianditu.com/DataServer?T=cva_c&x={x}&y={y}&l={z}&tk=" + tiandituToken,
    spatialReference: {
        projection: "EPSG:4326",
    },
    maxAvailableZoom: 18.45,
})
tianPMBZ.on('renderercreate', function (e) {
    //load tile image
    //   img(Image): an Image object
    //   url(String): the url of the tile
    e.renderer.loadTileImage = function (img, url) {
        pool.getImageData(url, url, (blob) => {
            // 为瓦片图片赋值
            img.src = URL.createObjectURL(blob)
        })
    };
});

var terrain = {
    type: "tianditu",
    tileSize: 256,
    terrainWidth: 65,
    shader: "lit",
    maxAvailableZoom: 12,
    tileSystem: [1, -1, -180, 90],
    urlTemplate:
        "https://t{s}.tianditu.gov.cn/mapservice/swdx?T=elv_c&tk=" + tiandituToken + "&x={x}&y={y}&l={z}",
    subdomains: ["1", "2", "3", "4", "5"],
    exaggeration: 2.5,
    material: {
        baseColorFactor: [1, 1, 1, 1],
        outputSRGB: 1,
        roughnessFactor: 0.69,
        metallicFactor: 0,
    },
};


//天空
var resourceSkybox = {
    url: {
        front: "/develop/FormulaMap/hdr/446/front.jpg",
        back: "/develop/FormulaMap/hdr/446/back.jpg",
        left: "/develop/FormulaMap/hdr/446/left.jpg",
        right: "/develop/FormulaMap/hdr/446/right.jpg",
        top: "./develop/FormulaMap/hdr/446/top.jpg",
        bottom: "/develop/FormulaMap/hdr/446/bottom.jpg"
    },
    prefilterCubeSize: 512,
};

//地图容器
var map;
//地图设置
var mapConfig = {
    "center": [118.52478644, 24.80786534],
    "baseLayer": "tianYX",
    "minZoom": 5,
    "maxZoom": 20,
    "zoom": 11.5,
    "pitch": 15.900000000000095,
    "bearing": -0.44999999999993173,
    "animate": false,
    "terrain": null,
    "resourceSkybox": null
}
//地图图层
var mapLayers = {
    "layers": [
        {
            "id": "gm",
            "name": "灌面",
            "type": "SuperMap",
            "epsg": "4326",
            "url": "http://183.252.9.117:8090/iserver/services/map-ShanMeiGuanQu/rest/maps/灌面",
            "minZoom": 5,
            "maxZoom": 12,
            "leftBottom": {
                "x": 118.36097002000007,
                "y": 24.511910709297883
            },
            "rightTop": {
                "x": 118.99206771000004,
                "y": 25.20459168928356
            },
            "opacity": 1,
            "show": true,
            "zIndex": 10
        },
        {
            "id": "xzqj",
            "name": "行政区界",
            "type": "SuperMap",
            "epsg": "4326",
            "url": "http://183.252.9.117:8090/iserver/services/map-ShanMeiGuanQu/rest/maps/行政区界",
            "minZoom": 5,
            "maxZoom": 20,
            "leftBottom": {
                "x": 118.36097002000007,
                "y": 24.511910709297883
            },
            "rightTop": {
                "x": 118.99206771000004,
                "y": 25.20459168928356
            },
            "opacity": 1,
            "show": true,
            "zIndex": 11
        },
        {
            "id": "slgc",
            "name": "水利工程",
            "type": "SuperMap",
            "epsg": "4326",
            "url": "http://183.252.9.117:8090/iserver/services/map-ShanMeiGuanQu/rest/maps/水利工程",
            "minZoom": 5,
            "maxZoom": 20,
            "leftBottom": {
                "x": 118.37855189000004,
                "y": 24.601647433295984
            },
            "rightTop": {
                "x": 118.96728649600006,
                "y": 25.1938694192838
            },
            "opacity": 1,
            "show": true,
            "zIndex": 20
        },
        {
            "id": "jtlw",
            "name": "交通路网",
            "type": "SuperMap",
            "epsg": "4326",
            "url": "http://183.252.9.117:8090/iserver/services/map-ShanMeiGuanQu/rest/maps/交通路网",
            "minZoom": 5,
            "maxZoom": 14,
            "leftBottom": {
                "x": 118.39453658000004,
                "y": 24.73738186229318
            },
            "rightTop": {
                "x": 118.79748957400011,
                "y": 25.418155875279272
            },
            "opacity": 1,
            "show": true,
            "zIndex": 21
        },
        {
            "id": "smdyq",
            "name": "山美灌区第一期",
            "type": "SuperMap",
            "epsg": "4326",
            "url": "http://183.252.9.117:8090/iserver/services/map-ShanMeiGuanQu/rest/maps/山美灌区第一期",
            "minZoom": 5,
            "maxZoom": 20,
            "leftBottom": {
                "x": 118.35340931051387,
                "y": 24.504903154212773
            },
            "rightTop": {
                "x": 119.003201286149,
                "y": 25.21176038531008
            },
            "opacity": 0.65,
            "show": false,
            "zIndex": 30
        },
        {
            "id": "smdeq",
            "name": "山美灌区第二期",
            "type": "SuperMap",
            "epsg": "4326",
            "url": "http://183.252.9.117:8090/iserver/services/map-ShanMeiGuanQu/rest/maps/山美灌区第二期",
            "minZoom": 5,
            "maxZoom": 20,
            "leftBottom": {
                "x": 118.35346987026054,
                "y": 24.507030988251834
            },
            "rightTop": {
                "x": 118.99512869806695,
                "y": 25.204647465620056
            },
            "opacity": 0.65,
            "show": false,
            "zIndex": 31
        },
        {
            "id": "smdyqsbnzw",
            "name": "山美灌区第一年上半年作物",
            "type": "SuperMap",
            "epsg": "4326",
            "url": "http://183.252.9.117:8090/iserver/services/map-ShanMeiGuanQu/rest/maps/山美灌区第一年上半年作物",
            "minZoom": 5,
            "maxZoom": 20,
            "leftBottom": {
                "x": 118.364905722474,
                "y": 24.51396490178207
            },
            "rightTop": {
                "x": 118.99020156181396,
                "y": 25.196922556327575
            },
            "opacity": 0.65,
            "show": false,
            "zIndex": 40
        },
        {
            "id": "smdyqxbnzw",
            "name": "山美灌区第一年下半年作物",
            "type": "SuperMap",
            "epsg": "4326",
            "url": "http://183.252.9.117:8090/iserver/services/map-ShanMeiGuanQu/rest/maps/山美灌区第一年下半年作物",
            "minZoom": 5,
            "maxZoom": 20,
            "leftBottom": {
                "x": 118.364905722474,
                "y": 24.51396490178207
            },
            "rightTop": {
                "x": 118.99020156181396,
                "y": 25.196922556327575
            },
            "opacity": 0.65,
            "show": false,
            "zIndex": 40
        },
        {
            "id": "smdyqsqgd",
            "name": "山美灌区第一期墒情（耕地）",
            "type": "SuperMap",
            "epsg": "4326",
            "url": "http://183.252.9.117:8090/iserver/services/map-ShanMeiGuanQu/rest/maps/山美灌区第一期墒情（耕地）",
            "minZoom": 5,
            "maxZoom": 20,
            "leftBottom": {
                "x": 118.3632902722292,
                "y": 24.515068665677244
            },
            "rightTop": {
                "x": 118.99210822871352,
                "y": 25.204647626767873
            },
            "opacity": 0.65,
            "show": false,
            "zIndex": 41
        },
        {
            "id": "smdyqsqhd",
            "name": "山美灌区第一期墒情（旱地）",
            "type": "SuperMap",
            "epsg": "4326",
            "url": "http://183.252.9.117:8090/iserver/services/map-ShanMeiGuanQu/rest/maps/山美灌区第一期墒情（旱地）",
            "minZoom": 5,
            "maxZoom": 20,
            "leftBottom": {
                "x": 118.36613410227316,
                "y": 24.554447975611204
            },
            "rightTop": {
                "x": 118.973626325981,
                "y": 25.20452672893795
            },
            "opacity": 0.65,
            "show": false,
            "zIndex": 42
        },
        {
            "id": "smdyqggmjjc",
            "name": "山美灌区第一期灌溉面积监测",
            "type": "SuperMap",
            "epsg": "4326",
            "url": "http://183.252.9.117:8090/iserver/services/map-ShanMeiGuanQu/rest/maps/山美灌区第一期灌溉面积监测",
            "minZoom": 5,
            "maxZoom": 20,
            "leftBottom": {
                "x": 118.38818545851198,
                "y": 24.526412267422533
            },
            "rightTop": {
                "x": 118.99204255898952,
                "y": 25.164712986035987
            },
            "opacity": 0.65,
            "show": false,
            "zIndex": 43
        },
        {
            "id": "smdeqsqgd",
            "name": "山美灌区第二期墒情（耕地）",
            "type": "SuperMap",
            "epsg": "4326",
            "url": "http://183.252.9.117:8090/iserver/services/map-ShanMeiGuanQu/rest/maps/山美灌区第二期墒情（耕地）",
            "minZoom": 5,
            "maxZoom": 20,
            "leftBottom": {
                "x": 118.3658554535648,
                "y": 24.512239326964657
            },
            "rightTop": {
                "x": 118.99201301998733,
                "y": 25.200438666143665
            },
            "opacity": 0.65,
            "show": false,
            "zIndex": 44
        },
        {
            "id": "smdeqsqhd",
            "name": "山美灌区第二期墒情（旱地）",
            "type": "SuperMap",
            "epsg": "4326",
            "url": "http://183.252.9.117:8090/iserver/services/map-ShanMeiGuanQu/rest/maps/山美灌区第二期墒情（旱地）",
            "minZoom": 5,
            "maxZoom": 20,
            "leftBottom": {
                "x": 118.3662439174235,
                "y": 24.55446014531925
            },
            "rightTop": {
                "x": 118.97369541512955,
                "y": 25.204548185409777
            },
            "opacity": 0.65,
            "show": false,
            "zIndex": 45
        },
        {
            "id": "smdsqsqgd",
            "name": "山美灌区第二期墒情（耕地）",
            "type": "SuperMap",
            "epsg": "4326",
            "url": "http://183.252.9.117:8090/iserver/services/map-ShanMeiGuanQu/rest/maps/山美灌区第三期墒情（耕地）",
            "minZoom": 5,
            "maxZoom": 20,
            "leftBottom": {
                "x": 118.3658554535648,
                "y": 24.512239326964657
            },
            "rightTop": {
                "x": 118.99201301998733,
                "y": 25.200438666143665
            },
            "opacity": 0.65,
            "show": false,
            "zIndex": 51
        },
        {
            "id": "smdsqsqhd",
            "name": "山美灌区第三期墒情（旱地）",
            "type": "SuperMap",
            "epsg": "4326",
            "url": "http://183.252.9.117:8090/iserver/services/map-ShanMeiGuanQu/rest/maps/山美灌区第三期墒情（旱地）",
            "minZoom": 5,
            "maxZoom": 20,
            "leftBottom": {
                "x": 118.3662439174235,
                "y": 24.55446014531925
            },
            "rightTop": {
                "x": 118.97369541512955,
                "y": 25.204548185409777
            },
            "opacity": 0.65,
            "show": false,
            "zIndex": 52
        },
        {
            "id": "ssjcLayer",
            "name": "实时监测图层",
            "type": "Vector",
            "show": false,
            "zIndex": 99
        },
        {
            "id": "gcfbLayer",
            "name": "工程分布图层",
            "type": "Vector",
            "show": false,
            "zIndex": 99
        },
        {
            "id": "xjglLayer",
            "name": "巡检管理图层",
            "type": "Vector",
            "show": false,
            "zIndex": 99
        },
        {
            "id": "ysjgLayer",
            "name": "用水监管图层",
            "type": "Vector",
            "show": false,
            "zIndex": 99
        },
        {
            "id": "spjkLayer",
            "name": "视频监控图层",
            "type": "Vector",
            "show": false,
            "zIndex": 99
        },
        {
            "id": "zttLayer2",
            "name": "专题图图层2",
            "type": "Vector",
            "show": false,
            "minZoom": 5,
            "maxZoom": 20,
            "zIndex": 98,
        },
        {
            "id": "zttLayer",
            "name": "专题图图层",
            "type": "Vector",
            "show": false,
            "minZoom": 12.918983461638069,
            "maxZoom": 20,
            "zIndex": 99,
        },
        {
            "id": "zttLayer1",
            "name": "专题图图层1",
            "type": "Vector",
            "show": false,
            "minZoom": 12.411795366309143,
            "maxZoom": 20,
            "zIndex": 100,
        },
    ]
}
//特殊图层组
var groupGLLayer = new maptalks.GroupGLLayer("gl", [tianYX, tianYXBZ, tianPM, tianPMBZ], {
    terrain,
    sceneConfig: {
        environment: {
            enable: true,
            mode: 1,
            level: 0,
            brightness: 0,
        },
        shadow: {
            type: "esm",
            enable: true,
            quality: "high",
            opacity: 0.11,
            color: [0, 0, 0],
            blurOffset: 1,
        },
        // weather: {
        //     enable: true,
        //     fog: {
        //         enable: true,
        //         start: 0.1,
        //         end: 26,
        //         color: [0.9, 0.9, 0.9]
        //     }
        // },
        postProcess: {
            enable: true,
            antialias: {
                enable: true,
                taa: true,
                jitterRatio: 0.25,
            },
            ssr: {
                enable: true,
            },
            bloom: {
                enable: true,
                threshold: 0,
                factor: 0.2,
                radius: 0.105,
            },
            ssao: {
                enable: true,
                bias: 0.08,
                radius: 0.08,
                intensity: 1.5,
            },
            sharpen: {
                enable: false,
                factor: 0.2,
            },
        },
        ground: {
            enable: false,
            renderPlugin: {
                type: "fill",
            },
            symbol: {
                polygonFill: [0.517647, 0.517647, 0.517647, 1],
            },
        },
    },
});
//测面工具
var distanceTool = new maptalks.DistanceTool({
    once: true,
    symbol: {
        lineColor: "#34495e",
        lineWidth: 2,
    },
    vertexSymbol: {
        markerType: "ellipse",
        markerFill: "#1bbc9b",
        markerLineColor: "#000",
        markerLineWidth: 3,
        markerWidth: 10,
        markerHeight: 10,
    },
    labelOptions: {
        textSymbol: {
            textFaceName: "monospace",
            textFill: "#fff",
            textLineSpacing: 1,
            textHorizontalAlignment: "right",
            textDx: 15,
            markerLineColor: "#b4b3b3",
            markerFill: "#000",
        },
        boxStyle: {
            padding: [6, 2],
            symbol: {
                markerType: "square",
                markerFill: "#000",
                markerFillOpacity: 0.9,
                markerLineColor: "#b4b3b3",
            },
        },
    },
    clearButtonSymbol: [{
        markerType: "square",
        markerFill: "#000",
        markerLineColor: "#b4b3b3",
        markerLineWidth: 2,
        markerWidth: 15,
        markerHeight: 15,
        markerDx: 20,
    },
        {
            markerType: "x",
            markerWidth: 10,
            markerHeight: 10,
            markerLineColor: "#fff",
            markerDx: 20,
        },
    ],
})
//测面工具
var areaTool = new maptalks.AreaTool({
    once: true,
    symbol: {
        lineColor: "#1bbc9b",
        lineWidth: 2,
        polygonFill: "#fff",
        polygonOpacity: 0.3,
    },
    vertexSymbol: {
        markerType: "ellipse",
        markerFill: "#34495e",
        markerLineColor: "#1bbc9b",
        markerLineWidth: 3,
        markerWidth: 10,
        markerHeight: 10,
    },
    labelOptions: {
        textSymbol: {
            textFaceName: "monospace",
            textFill: "#fff",
            textLineSpacing: 1,
            textHorizontalAlignment: "right",
            textDx: 15,
        },
        boxStyle: {
            padding: [6, 2],
            symbol: {
                markerType: "square",
                markerFill: "#000",
                markerFillOpacity: 0.9,
                markerLineColor: "#b4b3b3",
            },
        },
    },
    clearButtonSymbol: [{
        markerType: "square",
        markerFill: "#000",
        markerLineColor: "#b4b3b3",
        markerLineWidth: 2,
        markerWidth: 15,
        markerHeight: 15,
        markerDx: 22,
    },
        {
            markerType: "x",
            markerWidth: 10,
            markerHeight: 10,
            markerLineColor: "#fff",
            markerDx: 22,
        },
    ],
});
//放大镜
let mousePosition = null;

//灌区概况
var gqgkData = {
    gqmc: "山美灌区",
    gqjj: [
        "山美灌区建于1972年，是福建省4个大型灌区之一，也是福建省最大的灌区，灌区设计灌溉面积64.81万亩，现状有效灌溉面积34.92万亩。涉及泉州市的鲤城区、丰泽区、洛江区、南安市、晋江市、石狮市、惠安县和台商投资区等8个县（市、区）。灌区工程主要包括山美水库枢纽、引水枢纽（金鸡拦河闸、洛阳桥闸）和灌溉工程三大部分。灌溉排水工程主要有金鸡闸上游区间、南干渠、北干渠三大块组成，共有5条干渠、47条支渠、14条区间骨干渠道及排水沟道。",
        "山美灌区现状农用地灌溉面积30.67万亩，其中现状耕地灌溉面积23.83万亩（包括水田12.54万亩、水浇地11.28万亩）。山美灌区主要包括水源工程、泵站/电灌站工程、灌区渠道、渠道建筑物等，其中水源工程包括山美水库、金鸡拦河闸和洛阳桥闸；泵站/电灌站工程共21座，均位于山美灌区；灌区渠道546.17km（山美灌区418.58km，补水灌片127.59km）、渠道建筑物（桥梁896座，其中山美灌区687座、补水灌片209座）；进水闸206座，其中山美灌区129座、补水灌片77座；泄洪闸48座，其中山美灌区25座、补水灌片23座。"
    ]
}

//实时监测
var ssjcData;
var ssjcMapData;


//工程分布
var gcfbAlltype = [
    {
        TN: "EM_TD_CANAL",
        MN: "渠道",
        SUPERMAPCX: ["山美灌区:CANAL_BRANCH", "山美灌区:CANAL_HEAD_DIT", "山美灌区:CANAL_MAIN", "山美灌区:CANAL_SMALL_BR", "山美灌区:CANAL_TRUNK"],
        INDEX: 10006,
        DATA: [],
        SPP: "07GISOneMap/module/popups/GISCanal.html"
    },
    {
        TN: "EM_TD_RESERVOIR",
        MN: "水库",
        SUPERMAPCX: ["山美灌区:RESERVOIR_POLYGON"],
        INDEX: 10001,
        DATA: [],
        SPP: "07GISOneMap/module/popups/GISCanal.html"
    },
    {
        TN: "EM_TD_RIVER",
        MN: "河道",
        SUPERMAPCX: [],
        INDEX: 10002,
        DATA: [],
        SPP: "07GISOneMap/module/popups/GISCanal.html"
    },
    {
        TN: "EM_TD_DAM",
        MN: "大坝",
        SUPERMAPCX: [],
        INDEX: 10003,
        DATA: [],
        SPP: "07GISOneMap/module/popups/GISCanal.html"
    },
    {
        TN: "EM_TD_DIKE",
        MN: "提防",
        SUPERMAPCX: [],
        INDEX: 10004,
        DATA: [],
        SPP: "07GISOneMap/module/popups/GISCanal.html"
    },
    {
        TN: "EM_TD_PIVOT",
        MN: "渠首",
        SUPERMAPCX: [],
        INDEX: 10005,
        DATA: [],
        SPP: "07GISOneMap/module/popups/GISCanal.html"
    },

    {
        TN: "EM_TD_CONDUIT",
        MN: "沟道",
        SUPERMAPCX: [],
        INDEX: 10007,
        DATA: [],
        SPP: "07GISOneMap/module/popups/GISCanal.html"
    },
    {
        TN: "EM_TD_SLUICE",
        MN: "水闸",
        SUPERMAPCX: ["山美灌区:E_SLUICE"],
        INDEX: 10008,
        DATA: [],
        SPP: "07GISOneMap/module/popups/GISCanalBuild.html"
    },
    {
        TN: "EM_TD_PUMP_P",
        MN: "泵站",
        SUPERMAPCX: ["山美灌区:E_PUMP"],
        INDEX: 10009,
        DATA: [],
        SPP: "07GISOneMap/module/popups/GISCanalBuild.html"
    },
    {
        TN: "EM_TD_FLUME",
        MN: "渡槽",
        SUPERMAPCX: [],
        INDEX: 10010,
        DATA: [],
        SPP: "07GISOneMap/module/popups/GISCanal.html"
    },
    {
        TN: "EM_TD_CULVERT",
        MN: "涵洞",
        SUPERMAPCX: [],
        INDEX: 10011,
        DATA: [],
        SPP: "07GISOneMap/module/popups/GISCanal.html"
    },
    {
        TN: "EM_TD_TUNNEL",
        MN: "隧洞",
        SUPERMAPCX: [],
        INDEX: 10012,
        DATA: [],
        SPP: "07GISOneMap/module/popups/GISCanal.html"
    },
    {
        TN: "EM_TD_SIPHON",
        MN: "倒虹吸",
        SUPERMAPCX: [],
        INDEX: 10013,
        DATA: [],
        SPP: "07GISOneMap/module/popups/GISCanal.html"
    },
    {
        TN: "EM_TD_DROP",
        MN: "跌水",
        SUPERMAPCX: [],
        INDEX: 10014,
        DATA: [],
        SPP: "07GISOneMap/module/popups/GISCanal.html"
    },
    {
        TN: "EM_TD_BRIDGE",
        MN: "桥梁",
        SUPERMAPCX: [],
        INDEX: 10015,
        DATA: [],
        SPP: "07GISOneMap/module/popups/GISCanal.html"
    },
    {
        TN: "EM_TD_SLOPE",
        MN: "陡坡",
        SUPERMAPCX: [],
        INDEX: 10016,
        DATA: [],
        SPP: "07GISOneMap/module/popups/GISCanal.html"
    },
    {
        TN: "EM_TD_BASIN",
        MN: "沉沙池",
        SUPERMAPCX: [],
        INDEX: 10001,
        DATA: [],
        SPP: "07GISOneMap/module/popups/GISCanal.html"
    },
    {
        TN: "EM_TD_HYDROPLANT",
        MN: "水电站",
        SUPERMAPCX: [],
        INDEX: 10017,
        DATA: [],
        SPP: "07GISOneMap/module/popups/GISCanal.html"
    },
    {
        TN: "EM_TD_PIPELINE",
        MN: "管道",
        SUPERMAPCX: [],
        INDEX: 10018,
        DATA: [],
        SPP: "07GISOneMap/module/popups/GISCanal.html"
    },
]
var gcfbtype = [];
var gcgbxz;

//遥感分析
var ygfxbiaoge;
var ygfxData = [
    {MC: "鲤城区", WD: 21, HSL: 60, MT: -2},
    {MC: "丰泽区", WD: 18, HSL: 47, MT: -0.5},
    {MC: "洛江区", WD: 22, HSL: 58, MT: -0.5},
    {MC: "南安市", WD: 24, HSL: 48, MT: -0.5},
    {MC: "晋江市", WD: 20, HSL: 52, MT: -0.5},
    {MC: "石狮市", WD: 19, HSL: 68, MT: -0.5},
    {MC: "惠安县", WD: 22, HSL: 48, MT: -0.25},
    {MC: "台商投资区", WD: 23, HSL: 61, MT: 0.25},
]

//专题图
var zttData = [
    {
        'mc': '第一批 : 山美灌区整修配套一期工程项目',
        'nr': '北高干渠整治、新华电灌站整治改造等9个子项目，共整治渠道23.12公里。',
        'tz': '1875(万元)',
        'dw': '鲤城、丰泽、晋江等'
    },
    {
        'mc': '第二批 : 山美灌区节水灌溉改造工程',
        'nr': '干渠道防渗改造89.85公里，埋设输水管道5.31公里，新砌石渠1.16公里，部分渠道建筑物的整修配套以及提水设备更新改造',
        'tz': '2950(万元)',
        'dw': '金鸡、惠安、南安等'
    },
    {
        'mc': '第三批 : 山美灌区2001年度节水改造项目',
        'nr': '清蒙福厦公路桥至石狮取水口段，整治渠长3.953公里(桩号9+770~13+723)',
        'tz': '2304.52(万元)',
        'dw': '泉州市山美灌区管理处'
    },
    {
        'mc': '第四批 : 山美灌区2003年度节水改造项目',
        'nr': '赤涂村到清蒙福厦公路桥段，整治渠长3.578公里',
        'tz': '2816.66(万元)',
        'dw': '泉州市山美灌区管理处'
    },
    {
        'mc': '第五批 : 山美灌区节水改造工程',
        'nr': '金鸡渠首暗涵至树兜水闸，整治渠长3.518公里;树兜水闸至赤涂村、石狮取水口至晋江取水口段，整治渠长3.063公里。',
        'tz': '16381.27(万元)',
        'dw': '泉州市山美灌区管理处'
    },
    {
        'mc': '第六批 : 山美灌区续建配替与节水改造工程',
        'nr': '环城桥整治至第三水厂取水口段，整治渠长4.56公里(号6+615~11+180渠段)',
        'tz': '3367.71(万元)',
        'dw': '泉州市北渠管理处'
    },
    {
        'mc': '第七批 : 山美灌区续建配替与节水改造工程',
        'nr': '渠首闸整治至西埔生产桥，整治渠长6.03Km(号0+225~6+258渠段)',
        'tz': '9800(万元)',
        'dw': '泉州市北渠管理处'
    },
    {
        'mc': '第八批 : 山美灌区续建配套与节水改造工程',
        'nr': '环城桥整治至杏宅尾水闸，整治渠长11.59Km(号11+465~24+599渠段)。',
        'tz': '6415(万元)',
        'dw': '泉州市北渠管理处'
    },
    {
        'mc': '第九批 : 山美灌区续建配套与节水改造工程',
        'nr': '衬砌改造渠道总长12.851km，配套改造渠系建筑物15座，清除沿线排污口53处。',
        'tz': '4329.3(万元)',
        'dw': '管理处、泉州投资区'
    },
]
//专题图样式
var lineSymbol = {
    lan: {
        lineColor: "#0b0afd",
        lineWidth: 8,
    },
    hong: {
        lineColor: "#f0021d",
        lineWidth: 8,
    },
    huang: {
        lineColor: "#faf106",
        lineWidth: 8,
    },
    zi: {
        lineColor: "#e11cea",
        lineWidth: 8,
    }
}