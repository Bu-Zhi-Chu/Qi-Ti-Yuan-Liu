//初始化地图
var tps = []


function initMap(config) {
    map = new maptalks.Map("map", {
        center: config.center,
        zoom: 2,
        minZoom: config.minZoom,
        maxZoom: config.maxZoom,
        spatialReference: {
            projection: "EPSG:4326",
        },
        lights: {
            directional: {
                direction: [1, 0, -1],
                color: [1, 1, 1],
            },
            ambient: {
                //配置天空盒的资源
                resource: config.resourceSkybox,
                exposure: 0.8,
                hsv: [0, 0.34, 0],
                orientation: 1,
            },
        },
    });

    map.on("click", function () {
        console.log(map.getView())
    });

    // map.on("mousemove", onMouseMove);
    // map.on("mouseout", onMouseOut);
    // map.on("renderend", onRenderEnd);

    if (config.animate) {
        map.flyTo({
            center: config.center,
            zoom: config.zoom,
            pitch: config.pitch,
            bearing: config.bearing
        }, {
            duration: config.duration,
            easing: 'out'
        })
    } else {
        map.setView({
            center: config.center,
            zoom: config.zoom,
            pitch: config.pitch,
            bearing: config.bearing
        });
    }

    groupGLLayer.addTo(map);

    if (config.baseLayer != "tianYX") {
        mapPM()
    } else {
        mapYX()
    }
    if (config.terrain == null) {
        groupGLLayer.setTerrain(null);
    }
}

function onMouseMove(e) {
    mousePosition = e.containerPoint;
    map.getRenderer().setToRedraw();
}

function onMouseOut() {
    mousePosition = null;
    map.getRenderer().setToRedraw();
}

function onRenderEnd(e) {
    if (!mousePosition) {
        return;
    }
    // map's canvas context
    const ctx = e.context;
    // radius of magnifier
    let radius = 150;
    const pixelRatio =
        window.devicePixelRatio ||
        window.screen.deviceXDPI / window.screen.logicalXDPI;
    radius *= pixelRatio > 1 ? 2 : 1;
    const centerX = mousePosition.x * pixelRatio,
        centerY = mousePosition.y * pixelRatio;
    const originX = centerX - radius,
        originY = centerY - radius;
    const size = 2 * radius + 2;
    // manipulate pixel values to magnify
    const sourceData = ctx.getImageData(originX, originY, size, size).data;
    const dest = ctx.createImageData(size, size);
    const destData = dest.data;
    for (let j = 0; j < size; ++j) {
        for (let i = 0; i < size; ++i) {
            const dI = i - radius;
            const dJ = j - radius;
            const dist = Math.sqrt(dI * dI + dJ * dJ);
            let sourceI = i;
            let sourceJ = j;
            if (dist < radius) {
                sourceI = Math.round(radius + dI / 2);
                sourceJ = Math.round(radius + dJ / 2);
            }
            const destOffset = (j * size + i) * 4;
            const sourceOffset = (sourceJ * size + sourceI) * 4;
            destData[destOffset] = sourceData[sourceOffset];
            destData[destOffset + 1] = sourceData[sourceOffset + 1];
            destData[destOffset + 2] = sourceData[sourceOffset + 2];
            destData[destOffset + 3] = sourceData[sourceOffset + 3];
        }
    }
    // draw magnifier's outline
    ctx.beginPath();
    ctx.strokeStyle = "#bbb";
    ctx.lineWidth = 2;
    ctx.arc(centerX, centerY, radius + 2, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.closePath();

    // draw magnified image and clip it by circle
    ctx.drawImage(
        createMagCircle(dest, size),
        centerX - size / 2,
        centerY - size / 2
    );
}

function createMagCircle(imageData, size) {
    const magImg = document.createElement("canvas");
    const magCircle = document.createElement("canvas");

    magImg.width = magImg.height = magCircle.width = magCircle.height = size;
    magImg.getContext("2d").putImageData(imageData, 0, 0);

    const ctx = magCircle.getContext("2d");
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, 2 * Math.PI);
    // clip canvas
    ctx.clip();
    ctx.drawImage(magImg, 0, 0);
    return magCircle;
}

//天地图平面底图
function mapPM() {
    tianPM.show();
    tianPMBZ.show();
    tianYX.hide();
    tianYXBZ.hide();
}

//天地图平面底图
function mapYX() {
    tianPM.hide();
    tianPMBZ.hide();
    tianYX.show();
    tianYXBZ.show();
}

//地图放大
function mapJIA() {
    map.setZoom(map.getZoom() + 0.5)
}

//地图缩小
function mapJIAN() {
    map.setZoom(map.getZoom() - 0.5)
}

//地图测距
function mapCHANGDU() {
    distanceTool.addTo(map);
}

//地图测面
function mapMIANJI() {
    areaTool.addTo(map);
}

//添加图层
function addLaryers(config) {
    for (var a = 0; a < config.layers.length; a++) {
        if (config.layers[a].type == "SuperMap") {
            if (config.layers[a].epsg == "4326") {
                SuperMap4326(
                    config.layers[a].id,
                    config.layers[a].name,
                    config.layers[a].url,
                    config.layers[a].leftBottom.x,
                    config.layers[a].leftBottom.y,
                    config.layers[a].rightTop.x,
                    config.layers[a].rightTop.y,
                    config.layers[a].opacity,
                    config.layers[a].zIndex,
                    config.layers[a].minZoom,
                    config.layers[a].maxZoom,
                    config.layers[a].show
                )
            }
        } else {
            VectorLayers(
                config.layers[a].id,
                config.layers[a].name,
                config.layers[a].zIndex,
                config.layers[a].show,
                config.layers[a].minZoom,
                config.layers[a].maxZoom,
            )
        }
    }
}

function VectorLayers(id, name, zIndex, show, minZoom, maxZoom) {
    var Layer = new maptalks.VectorLayer(id, {
        id: id,
        name: name,
        zIndex: zIndex,
        visible: show,
        zIndex: 99,
        minZoom: minZoom,
        maxZoom: maxZoom
    }).addTo(map)
}

//添加supermap4326类型图层
function SuperMap4326(id, name, url, left, bottom, right, top, opacity, zIndex, minZoom, maxZoom, show) {
    // A complete customized TileLayer
    // Radius of the earth
    var earchRadiusInMeters = 6378137;
    var inchPerMeter = 1 / 0.0254;
    var meterPerMapUnit = (Math.PI * 2 * earchRadiusInMeters) / 360;

    function replaceURL(url, x, y, scale) {
        var str = ["x", x, "y", y, "scale", scale];
        for (var i = 0, len = str.length; i < len; i += 2) {
            url = url.replace("{" + str[i] + "}", str[i + 1]);
        }
        return url;
    }

    function resolutionToScale(resolution, dpi) {
        var scale = resolution * dpi * inchPerMeter * meterPerMapUnit;
        scale = 1 / scale;
        return scale;
    }

    //切图参数
    var parmas = {
        zooms: 17,
        firstRes: 1.4062499999999996,
        origin: [left, top],
        maxBounds: [
            [left, right],
            [right, top],
        ],
    };

    var url = url +
        "/tileImage.png?scale={scale}&x={x}&y={y}&width=256&height=256&layersID=&tileversion=&transparent=true&prjCoordSys=%7B%22epsgCode%22%3A4326%7D";
    var res = [];
    for (var i = 0; i <= parmas.zooms; i++) {
        res.push(parmas.firstRes / Math.pow(2, i));
    }
    var crs = {
        projection: "EPSG:4326",
        resolutions: res,

    };

    var tileLayer = new maptalks.TileLayer(id, {
        id: id,
        visible: show,
        opacity: opacity,
        zIndex: zIndex,
        minZoom: minZoom,
        maxZoom: maxZoom,
        debug: false,
        repeatWorld: true,
        urlTemplate: url,
        spatialReference: crs,
        subdomains: ["a", "b", "c", "d"],
        attribution:
            '&copy; <a href="https://www.supermap.com/cn/">supermap</a> contributors',
        tileSystem: [1, -1].concat(parmas.origin), // tile system

    });

    // 重写瓦片获取的方法
    tileLayer.getTileUrl = function (x, y, z) {
        this.scales = this.scales || {};
        if (this.scales[z]) {
            return replaceURL(this.options.urlTemplate, x, y, this.scales[z]);
        }
        var crs = this.getMap().getSpatialReference().getProjection();
        var bounds = this._getTileExtent(x, y, z);
        var min = bounds.getMin(),
            max = bounds.getMax();
        var ne = crs.project(max);
        var sw = crs.project(min);
        var tileSize = this.options.tileSize[0];
        var resolution = Math.max(
            Math.abs(ne.x - sw.x) / tileSize,
            Math.abs(ne.y - sw.y) / tileSize,
        );
        var scale = resolutionToScale(resolution, 96);
        this.scales[z] = scale;
        return replaceURL(this.options.urlTemplate, x, y, this.scales[z]);
    };

    tileLayer.on('renderercreate', function (e) {
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

    //获取瓦片的bbox
    tileLayer._getTileExtent = function (x, y, z) {
        var map = this.getMap(),
            res = map._getResolution(z),
            tileConfig = this._getTileConfig(),
            tileExtent = tileConfig.getTilePrjExtent(x, y, res);
        return tileExtent;
    };


    tileLayer.addTo(map);

}

//灌区概况
function initGQGK() {
    $("#report_title").html(gqgkData.gqmc);
    var html = "";
    for (var a = 0; a < gqgkData.gqjj.length; a++) {
        html += '<div style=\'font-size: 20px\'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' + gqgkData.gqjj[a] + '</div><br><div style=\'font-size: 20px\'>'
    }
    $('#sideContent').html(html);
}

//实时监测 用水监管 视频监控
function initSJJC() {
    $.ajax({
        url: "/00RealTimeData_Query",
        type: "post",
        dataType: "json",
        data: {
            "ALL": true,
        },
        success: function (data, status) {
            var strHtml = ""
            var strHtml1 = ""
            var strHtml2 = ""
            ssjcData = data.result
            strHtml += '<table id="dg"  style="width: 100%;font-size: 12px" border="0" cellspacing="0" cellpadding="0">';
            strHtml += '    <thead class="tableheader">';
            strHtml += '        <tr class="gcgrid-header-row">';
            strHtml += '            <th style="width: 30%;font-weight: 400;">站点名称</th>';
            strHtml += '            <th style="width: 40%;font-weight: 400;" >监测时间</th>';
            strHtml += '            <th style="width: 30%;font-weight: 400;" >操作</th>';
            strHtml += '        </tr>';
            strHtml += '   </thead>';
            strHtml += '   <tbody>';

            strHtml1 += '<table id="dg1"  style="width: 100%;font-size: 12px" border="0" cellspacing="0" cellpadding="0">';
            strHtml1 += '    <thead class="tableheader">';
            strHtml1 += '        <tr class="gcgrid-header-row">';
            strHtml1 += '            <th style="width: 30%;font-weight: 400;">站点名称</th>';
            strHtml1 += '            <th style="width: 40%;font-weight: 400;" >监测时间</th>';
            strHtml1 += '            <th style="width: 30%;font-weight: 400;" >操作</th>';
            strHtml1 += '        </tr>';
            strHtml1 += '   </thead>';
            strHtml1 += '   <tbody>';

            strHtml2 += '<table id="dg2"  style="width: 100%;font-size: 12px" border="0" cellspacing="0" cellpadding="0">';
            strHtml2 += '    <thead class="tableheader">';
            strHtml2 += '        <tr class="gcgrid-header-row">';
            strHtml2 += '            <th style="width: 30%;font-weight: 400;">序号</th>';
            strHtml2 += '            <th style="width: 40%;font-weight: 400;" >站点名称</th>';
            strHtml2 += '            <th style="width: 30%;font-weight: 400;" >操作</th>';
            strHtml2 += '        </tr>';
            strHtml2 += '   </thead>';
            strHtml2 += '   <tbody>';

            var yy = 0;
            var yy1 = 0
            var yy2 = 0

            var types = []

            // 使用 parseInt() 排序
            ssjcData.sort((a, b) => {
                const codeA = parseInt(a.SELF_CODE, 10);
                const codeB = parseInt(b.SELF_CODE, 10);
                return codeA - codeB;
            });

            for (var i = 0; i < ssjcData.length; i++) {

                if (types.indexOf(ssjcData[i].MONITOR_TYPE) == -1) {
                    types.push(ssjcData[i].MONITOR_TYPE);
                }

                ssjcData[i].MONITOR_TIME = (ssjcData[i].MONITOR_TIME != "" && ssjcData[i].MONITOR_TIME != null && ssjcData[i].MONITOR_TIME != "undefined") ? ssjcData[i].MONITOR_TIME : "";

                if (ssjcData[i].MONITOR_TYPE == "01") {
                    if (yy1 % 2 != 0) {
                        strHtml1 += '      <tr  onmouseout="ShiftIn0(this)" onmouseover="CutIn0(this)" id="' + ssjcData[i].ID + 'ysjg" name ="ysjg" title="' + (ssjcData[i].MONITOR_DATA == null ? "" : ssjcData[i].MONITOR_DATA) + '" class="gcgrid-list-row1">';
                    } else {
                        strHtml1 += '      <tr onmouseout="ShiftIn0(this)" onmouseover="CutIn0(this)" id="' + ssjcData[i].ID + 'ysjg" name ="ysjg" title="' + (ssjcData[i].MONITOR_DATA == null ? "" : ssjcData[i].MONITOR_DATA) + '" class="gcgrid-list-row2">';
                    }
                    strHtml1 += '          <th class="ellipsis" style="max-width: 60px;"><a style="color: #b9ccdf;font-weight: 400;">' + ssjcData[i].MONITOR_NAME + '</a></th>';
                    strHtml1 += '          <th class="ellipsis" style="max-width: 60px;"><a style="color: #b9ccdf;font-weight: 400;">' + ssjcData[i].MONITOR_TIME + '</a></th>';
                    strHtml1 += '          <th style="width: 100px;"><img style="width: 40px;color: rgb(138,219,115);text-decoration:underline;cursor: pointer;font-weight: 400;" onclick=\"point_ysjg(' + "'row_" + (parseInt(yy1) + 1) + "'" + ')\"  src=\"/develop/FormulaMap/img/grid_DingWei.png\">' +
                        '<img style="width: 40px;color: rgb(227,160,96);text-decoration:underline;cursor:pointer; font-weight: 400;" onclick=\"postal_ysjg(' + "'row_" + (parseInt(yy1) + 1) + "'" + ')\"  src=\"/develop/FormulaMap/img/grid_XiangQing.png\"></th>';
                    strHtml1 += "<input type='hidden' name='ycy' value='" + JSON.stringify(ssjcData[i]) + "' > ";
                    strHtml1 += '      </tr>';
                    yy1 = yy1 + 1;
                }

                if (ssjcData[i].MONITOR_TYPE == "20") {
                    if (yy1 % 2 != 0) {
                        strHtml2 += '      <tr onmouseout="ShiftIn0(this)" onmouseover="CutIn0(this)" id="' + ssjcData[i].ID + 'ysjg" name ="ysjg" title="' + (ssjcData[i].MONITOR_DATA == null ? "" : ssjcData[i].MONITOR_DATA) + '" class="gcgrid-list-row1">';
                    } else {
                        strHtml2 += '      <tr onmouseout="ShiftIn0(this)" onmouseover="CutIn0(this)" id="' + ssjcData[i].ID + 'ysjg" name ="ysjg" title="' + (ssjcData[i].MONITOR_DATA == null ? "" : ssjcData[i].MONITOR_DATA) + '" class="gcgrid-list-row2">';
                    }

                    strHtml2 += '          <th style="max-width: 40px;"><a style="color: rgb(138,219,115);font-weight: 600;">' + (yy2 + 1) + '</a></th>';
                    strHtml2 += '          <th class="ellipsis" style="max-width: 60px;"><a style="color: #b9ccdf;font-weight: 400;">' + ssjcData[i].MONITOR_NAME + '</a></th>';
                    strHtml2 += '          <th style="width: 100px;"><img style="width: 40px;color: rgb(138,219,115);text-decoration:underline;cursor: pointer;font-weight: 400;" onclick=\"point_ssjc(this)\"  src=\"/develop/FormulaMap/img/grid_DingWei.png\">' +
                        '<img style="width: 40px;color: rgb(227,160,96);text-decoration:underline;cursor:pointer; font-weight: 400;" onclick=\"postal_ssjc(this)\"  src=\"/develop/FormulaMap/img/grid_XiangQing.png\"></th>';
                    strHtml2 += "<input type='hidden' name='ycy' value='" + JSON.stringify(ssjcData[i]) + "' > ";
                    strHtml2 += '      </tr>';
                    yy2 = yy2 + 1;
                }


                if (yy % 2 != 0) {
                    strHtml += '      <tr style="text-align: center"  onmouseout="ShiftIn(this)" onmouseover="CutIn(this)" id="' + ssjcData[i].ID + '"   title="' + (ssjcData[i].MONITOR_DATA == null ? "" : ssjcData[i].MONITOR_DATA) + '" class="gcgrid-list-row1">';
                } else {
                    strHtml += '      <tr style="text-align: center"  onmouseout="ShiftIn(this)" onmouseover="CutIn(this)" id="' + ssjcData[i].ID + '"   title="' + (ssjcData[i].MONITOR_DATA == null ? "" : ssjcData[i].MONITOR_DATA) + '" class="gcgrid-list-row2">';
                }
                strHtml += '          <td class="ellipsis" style="max-width: 60px;"><a style="color: #b9ccdf;font-weight: 400;">' + ssjcData[i].MONITOR_NAME + '</a></td>';
                strHtml += '          <td class="ellipsis" style="max-width: 60px;"><a style="color: #b9ccdf;font-weight: 400;">' + ssjcData[i].MONITOR_TIME + '</a></td>';
                strHtml += '          <td style="width: 100px;"><img style="width: 40px;color: rgb(138,219,115);text-decoration:underline;cursor: pointer;font-weight: 400;" onclick=\"point_ssjc(this)\"  src=\"/develop/FormulaMap/img/grid_DingWei.png\">' +
                    '<img style="width: 40px;color: rgb(227,160,96);text-decoration:underline;cursor:pointer; font-weight: 400;" onclick=\"postal_ssjc(this)\"  src=\"/develop/FormulaMap/img/grid_XiangQing.png\"></td>';
                strHtml += "<input type='hidden' name='ycy' value='" + JSON.stringify(ssjcData[i]) + "' > ";
                strHtml += '      </tr>';
                yy = yy + 1;
            }


            strHtml += '      </tbody>';
            strHtml += '</table>';
            strHtml1 += '      </tbody>';
            strHtml1 += '</table>';
            strHtml2 += '      </tbody>';
            strHtml2 += '</table>';

            $('#divDg_ssjc').html(strHtml);
            $('#divDg_ysjg').html(strHtml1);
            $('#divDg_spjk').html(strHtml2);

            var sqlParam = new SuperMap.GetFeaturesByBufferParameters({
                toIndex: -1,
                maxFeatures: 10000,
                queryParameter: {
                    attributeFilter: "1=1",
                },
                datasetNames: ["山美灌区:INFO_MONITOR"]
            });


            var mm1 = new maptalks.Marker([118.52017066, 24.94665347], {
                symbol: {
                    markerType: "ellipse",
                    markerWidth: 15,
                    markerHeight: 15,
                    markerFill: "#fab505",
                },
                properties: {
                    ID: "111111",
                    NAME: "金鸡拦河闸闸前",
                    INDEX: 1
                },
            });

            $.ajax({
                url: '/develop/FormulaMap/shanmeishuizhi',
                type: 'post', // 修正了多余的逗号
                async: false,
                data: {},
                success: function (data, status) {
                    if (data.isSuccess) {

                        mm1.setInfoWindow({
                            single: false,
                            collision: true,
                            collisionBufferSize: 2,
                            collisionWeight: 2,
                            collisionFadeIn: true,
                            autoPan: false,
                            content: '<div id="11111ysjgdiv" style=" transform: scale(0.95);width: 387px;height: 223px;background: url(develop/FormulaMap/img/2/2.png);background-size: 100% 100%">' +
                                '       <div style="padding-left: 10px;padding-top: 5px;font-size: 16px;color: white;font-weight: bold">金鸡拦河闸闸前</div>' +
                                '       <div style="margin: 1% 7%;width: 82%;height: 80%">' +
                                '           <div style="width: 100%;height: 33.33%;display: flex">' +
                                '               <div style="height: 100%;width: 46%">' +
                                '                   <div style="display: flex;align-items: center;height: 50%">' +
                                '                       <div style="height: 9px;width: 8px;background: url(develop/FormulaMap/img/2/山美灌区_06.png);background-size: 100% 100%">' +
                                '                       </div>' +
                                '                       <div style="margin-left: 5px;color: white;font-size: 15px;font-weight: bolder" >时间</div>' +
                                '                   </div>' +
                                '                   <div style="margin-left: 14px;font-weight: bolder;font-size: 13px;color: #fccb54;height: 50%">' + data.result[0].TM +
                                '                   </div>' +
                                '               </div>' +
                                '               <div style="height: 100%;width: 27%">' +
                                '                   <div style="display: flex;align-items: center;height: 50%">' +
                                '                       <div style="height: 9px;width: 8px;background: url(develop/FormulaMap/img/2/山美灌区_06.png);background-size: 100% 100%">' +
                                '                       </div>' +
                                '                       <div style="margin-left: 5px;color: white;font-size: 15px;font-weight: bolder" >PH值</div>' +
                                '                   </div>' +
                                '                   <div style="margin-left: 14px;font-weight: bolder;font-size: 13px;height: 50%">' + (data.result[0].PH > 8.5 ? '<span style="color: #fc5454">' + data.result[0].PH + '</span>' : '<span style="color: #fccb54">' + data.result[0].PH + '</span>') +
                                '                   </div>' +
                                '               </div>' +
                                '               <div style="height: 100%;width: 27%">' +
                                '                   <div style="display: flex;align-items: center;height: 50%">' +
                                '                       <div style="height: 9px;width: 8px;background: url(develop/FormulaMap/img/2/山美灌区_06.png);background-size: 100% 100%">' +
                                '                       </div>' +
                                '                       <div style="margin-left: 5px;color: white;font-size: 15px;font-weight: bolder" >瞬时水温</div>' +
                                '                   </div>' +
                                '                   <div style="margin-left: 14px;font-weight: bolder;font-size: 13px;height: 50%">' + (data.result[0].C > 30 ? '<span style="color: #fc5454">' + data.result[0].C + '</span>' : '<span style="color: #fccb54">' + data.result[0].C + '</span>') +
                                '                   </div>' +
                                '               </div>' +
                                '           </div>' +

                                '           <div style="width: 100%;height: 33.33%;display: flex">' +
                                '               <div style="height: 100%;width: 46%">' +
                                '                   <div style="display: flex;align-items: center;height: 50%">' +
                                '                       <div style="height: 9px;width: 8px;background: url(develop/FormulaMap/img/2/山美灌区_06.png);background-size: 100% 100%">' +
                                '                       </div>' +
                                '                       <div style="margin-left: 5px;color: white;font-size: 15px;font-weight: bolder" >电导率</div>' +
                                '                   </div>' +
                                '                   <div style="margin-left: 14px;font-weight: bolder;font-size: 13px;height: 50%">' + (data.result[0].COND > 1000 ? '<span style="color: #fc5454">' + data.result[0].COND + '</span>' : '<span style="color: #fccb54">' + data.result[0].COND + '</span>') +
                                '                   </div>' +
                                '               </div>' +
                                '               <div style="height: 100%;width: 27%">' +
                                '                   <div style="display: flex;align-items: center;height: 50%">' +
                                '                       <div style="height: 9px;width: 8px;background: url(develop/FormulaMap/img/2/山美灌区_06.png);background-size: 100% 100%">' +
                                '                       </div>' +
                                '                       <div style="margin-left: 5px;color: white;font-size: 15px;font-weight: bolder" >溶解氧</div>' +
                                '                   </div>' +
                                '                   <div style="margin-left: 14px;font-weight: bolder;font-size: 13px;height: 50%">' + (data.result[0].DO > 1000 ? '<span style="color: #fc5454">' + data.result[0].DO + '</span>' : '<span style="color: #fccb54">' + data.result[0].DO + '</span>') +
                                '                   </div>' +
                                '               </div>' +
                                '               <div style="height: 100%;width: 27%">' +
                                '                   <div style="display: flex;align-items: center;height: 50%">' +
                                '                       <div style="height: 9px;width: 8px;background: url(develop/FormulaMap/img/2/山美灌区_06.png);background-size: 100% 100%">' +
                                '                       </div>' +
                                '                       <div style="margin-left: 5px;color: white;font-size: 15px;font-weight: bolder" >浊度</div>' +
                                '                   </div>' +
                                '                   <div style="margin-left: 14px;font-weight: bolder;font-size: 13px;height: 50%">' + (data.result[0].TURB > 3 ? '<span style="color: #fc5454">' + data.result[0].TURB + '</span>' : '<span style="color: #fccb54">' + data.result[0].TURB + '</span>') +
                                '                   </div>' +
                                '               </div>' +
                                '           </div>' +

                                '           <div style="width: 100%;height: 33.33%;display: flex">' +
                                '               <div style="height: 100%;width: 46%">' +
                                '                   <div style="display: flex;align-items: center;height: 50%">' +
                                '                       <div style="height: 9px;width: 8px;background: url(develop/FormulaMap/img/2/山美灌区_06.png);background-size: 100% 100%">' +
                                '                       </div>' +
                                '                       <div style="margin-left: 5px;color: white;font-size: 15px;font-weight: bolder" >氦氮</div>' +
                                '                   </div>' +
                                '                   <div style="margin-left: 14px;font-weight: bolder;font-size: 13px;height: 50%">' + (data.result[0].NH4N > 1 ? '<span style="color: #fc5454">' + data.result[0].NH4N + '</span>' : '<span style="color: #fccb54">' + data.result[0].TURB + '</span>') +

                                '                   </div>' +
                                '               </div>' +
                                '               <div style="height: 100%;width: 54%">' +
                                '                   <div style="display: flex;align-items: center;height: 50%">' +
                                '                       <div style="height: 9px;width: 8px;background: url(develop/FormulaMap/img/2/山美灌区_06.png);background-size: 100% 100%">' +
                                '                       </div>' +
                                '                       <div style="margin-left: 5px;color: white;font-size: 15px;font-weight: bolder" >化学需氧量</div>' +
                                '                   </div>' +
                                '                   <div style="margin-left: 14px;font-weight: bolder;font-size: 13px;height: 50%">' + (data.result[0].COD > 30 ? '<span style="color: #fc5454">' + data.result[0].COD + '</span>' : '<span style="color: #fccb54">' + data.result[0].TURB + '</span>') +

                                '                   </div>' +
                                '               </div>' +
                                '           </div>' +

                                '       </div>' +

                                '   </div>'
                        });


                        mm1.addTo(map.getLayer("ysjgLayer"))
                    }
                },
                error: function (jqXHR, textStatus, errorThrown) {

                }
            });


            // 假设 ssjcData 变量已经在外部定义并已填充数据
            // 假设 map, maptalks, showWindowsMethod, sqlParam 也已定义

            new ol.supermap.FeatureService("http://183.252.9.117:8090/iserver/services/data-ShanMeiGuanQu/rest/data").getFeaturesBySQL(sqlParam, function (serviceResult) {

                // 检查服务结果是否有效
                if (!serviceResult || !serviceResult.result || !serviceResult.result.features || !serviceResult.result.features.features) {
                    console.error("获取 features 数据失败或数据格式不正确。", serviceResult);
                    // 你可能需要在这里处理错误，例如通知用户或设置一个默认状态
                    return; // 提前退出
                }

                var features = serviceResult.result.features.features;
                var ssjcMapData = features; // 存储 features 数组

                // 初始化 tts 数组，现在它将用于存放没有找到匹配的 features
                var tts = [];

                // 只有当 features 数组有数据时才进行后续处理
                if (features.length > 0) {

                    // Step 1: 将 ssjcData 转换为一个 Map，以便通过 ID 快速查找
                    // Map 的键是 ssjcData 的 ID，值是对应的 ssjcData 对象
                    var ssjcDataMap = new Map();

                    // 增加对 ssjcData 是否存在的检查
                    if (ssjcData && Array.isArray(ssjcData)) {
                        for (var i = 0; i < ssjcData.length; i++) {
                            var dataItem = ssjcData[i];
                            // 确保 dataItem 和其 ID 存在且有效，且 ID 不为空字符串或 null/undefined
                            if (dataItem && dataItem.ID !== null && dataItem.ID !== undefined && dataItem.ID !== '') {
                                ssjcDataMap.set(dataItem.ID, dataItem);
                            }
                        }
                    } else {
                        console.warn("ssjcData 为空或不是一个有效的数组，无法进行对照。所有 features 将视为未匹配。");
                        // 如果 ssjcData 无效，则 features 中的所有项都将视为未匹配
                        tts = features.slice(); // 复制 features 到 tts
                        console.log("没有对照上的 features (存放在 tts 中):", tts);
                        // 退出或返回，因为没有数据可用于匹配
                        return;
                    }

                    // Step 2: 遍历 features 数组，尝试在 ssjcDataMap 中查找匹配项
                    for (var a = 0; a < features.length; a++) {
                        var feature = features[a];

                        // 确保 feature 和其 properties 存在
                        var linkId = (feature && feature.properties) ? feature.properties.LINK_ID : null;

                        // 只有当 feature 有一个有效的 LINK_ID 时才尝试查找匹配
                        if (linkId !== null && linkId !== '') { // 也检查 linkId 是否为空字符串
                            var matchedData = ssjcDataMap.get(linkId); // 在 Map 中快速查找

                            if (matchedData) {
                                // 找到了匹配项 (feature.properties.LINK_ID == matchedData.ID)
                                // 根据匹配到的 ssjcData 项的 MONITOR_TYPE 创建对应的 Marker

                                if (matchedData.MONITOR_TYPE == "01") {
                                    // 创建主要的地表水 Marker
                                    var mm = new maptalks.Marker(feature.geometry.coordinates, {
                                        id: matchedData.ID, // 使用 ssjcData 的 ID 作为 Marker 的 ID
                                        symbol: {
                                            markerFile: "/develop/FormulaMap/img/4/地表水.png",
                                            markerWidth: 87 / 1.5,
                                            markerHeight: 162 / 1.5,
                                        },
                                        properties: {
                                            ID: matchedData.ID,
                                            REGION_ID: matchedData.REGION_ID,
                                            MONITOR_ID: matchedData.ID, // 这里看起来是重复的，但保留原代码结构
                                            MONITOR_TYPE: matchedData.MONITOR_TYPE,
                                            NAME: matchedData.MONITOR_NAME,
                                            SHOW_PAGE_PATH: "07GISOneMap/module/popups/GISRealTime.html",
                                            PAGE_WIDTH: 1200,
                                            PAGE_HEIGHT: 600
                                        },
                                    });

                                    // 为 type "01" 创建第二个 Marker 和信息窗口
                                    var mm1 = new maptalks.Marker(feature.geometry.coordinates, {
                                        symbol: {
                                            markerType: "ellipse",
                                            markerWidth: 10,
                                            markerHeight: 10,
                                            markerFill: "#6a8eed",
                                        },
                                        properties: {
                                            ID: matchedData.ID,
                                            NAME: matchedData.MONITOR_NAME,
                                            INDEX: 1 // 保留原代码属性
                                        },
                                    });

                                    // 设置 mm1 的信息窗口内容
                                    mm1.setInfoWindow({
                                        single: false,
                                        collision: true,
                                        collisionBufferSize: 2,
                                        collisionWeight: 2,
                                        collisionFadeIn: true,
                                        autoPan: false,
                                        content: '<div id="' + matchedData.ID + 'ysjgdiv" style=" transform: scale(0.8);width: 194px;height: 157px;background: url(develop/FormulaMap/img/2/1.png);background-size: 100% 100%">' +
                                            '   <div style="padding-left: 10px;padding-top: 5px;font-size: 15px;color: white;font-weight: bold">' + (matchedData.MONITOR_NAME || '') + '</div>' + // 使用 || '' 防止 MONITOR_NAME 是 null/undefined
                                            '   <div style="display: flex;align-items: center;margin-left: 15px;margin-top: 5%;font-size: 19px;color: white;font-weight: bold">' +
                                            '       <div style="display: inline-block;width: 8px;height: 9px;background: url(develop/FormulaMap/img/2/山美灌区_03.png);background-size: 100% 100%"></div>' +
                                            '       <span style="margin-left: 5px;margin-top: -5px">今日水量</span>' +
                                            '   </div>' +
                                            '   <div style="display: flex;align-items: center;margin-left: 15px;margin-top: 3%;font-size: 19px;color: white;font-weight: bold">' +
                                            '       <span style="color: #37a0ff;margin-left: 25px;margin-top: -5px">' + (matchedData.SQ_WATER == null ? "--" : matchedData.SQ_WATER) + '</span ><span style="color: white;margin-top: -5px;margin-left: 2px">m³</span>' +
                                            '   </div>' +
                                            '   <div style="display: flex;align-items: center;margin-left: 15px;margin-top:3%;font-size: 19px;color: white;font-weight: bold">' +
                                            '       <div style="display: inline-block;width: 8px;height: 9px;background: url(develop/FormulaMap/img/2/山美灌区_03.png);background-size: 100% 100%"></div>' +
                                            '       <span style="margin-left: 5px;margin-top: -5px">总水量</span>' +
                                            '   </div>' +
                                            '   <div style="display: flex;align-items: center;margin-left: 15px;margin-top: 3%;font-size: 19px;color: white;font-weight: bold">' +
                                            '       <span style="color: #37a0ff;margin-left: 25px;margin-top: -5px">' + (matchedData.YEAR_WATER_DAILY == null ? "--" : (matchedData.YEAR_WATER_DAILY / 10000).toFixed(2)) + '</span><span style="color: white;margin-top: -5px;margin-left: 2px">万m³</span>' +
                                            '   </div>' +
                                            '</div>'
                                    });


                                    var ssjcLayer = map.getLayer("ssjcLayer");
                                    if (ssjcLayer) {
                                        mm.addTo(ssjcLayer).on('click', function (e) {
                                            showWindowsMethod(e.target.properties);
                                        });
                                    } else {
                                        console.warn("地图上未找到 ssjcLayer 图层，Marker (ID: " + matchedData.ID + ") 无法添加。");
                                    }
                                    var ysjgLayer = map.getLayer("ysjgLayer");
                                    if (ysjgLayer) {
                                        mm1.addTo(ysjgLayer);
                                    } else {
                                        console.warn("地图上未找到 ysjgLayer 图层，Marker (ID: " + matchedData.ID + ", ellipse) 无法添加。");
                                    }


                                } else if (matchedData.MONITOR_TYPE == "03") {
                                    var mm = new maptalks.Marker(feature.geometry.coordinates, {
                                        id: matchedData.ID,
                                        symbol: {
                                            markerFile: "/develop/FormulaMap/img/4/雨情.png",
                                            markerWidth: 87 / 1.5,
                                            markerHeight: 162 / 1.5,
                                        },
                                        properties: {
                                            ID: matchedData.ID,
                                            REGION_ID: matchedData.REGION_ID,
                                            MONITOR_ID: matchedData.ID,
                                            MONITOR_TYPE: matchedData.MONITOR_TYPE,
                                            NAME: matchedData.MONITOR_NAME,
                                            SHOW_PAGE_PATH: "07GISOneMap/module/popups/GISRealTime.html",
                                            PAGE_WIDTH: 1200,
                                            PAGE_HEIGHT: 600
                                        },
                                    });
                                    var ssjcLayer = map.getLayer("ssjcLayer");
                                    if (ssjcLayer) {
                                        mm.addTo(ssjcLayer).on('click', function (e) {
                                            // 原代码此处为空的点击事件。如果你需要调用 showWindowsMethod，可以在这里添加
                                            showWindowsMethod(e.target.properties);
                                        });
                                    } else {
                                        console.warn("地图上未找到 ssjcLayer 图层，Marker (ID: " + matchedData.ID + ") 无法添加。");
                                    }


                                } else if (matchedData.MONITOR_TYPE == "04") {
                                    var mm = new maptalks.Marker(feature.geometry.coordinates, {
                                        id: matchedData.ID,
                                        symbol: {
                                            markerFile: "/develop/FormulaMap/img/4/管道.png",
                                            markerWidth: 87 / 1.5,
                                            markerHeight: 162 / 1.5,
                                        },
                                        properties: {
                                            ID: matchedData.ID,
                                            REGION_ID: matchedData.REGION_ID,
                                            MONITOR_ID: matchedData.ID,
                                            MONITOR_TYPE: matchedData.MONITOR_TYPE,
                                            NAME: matchedData.MONITOR_NAME,
                                            SHOW_PAGE_PATH: "07GISOneMap/module/popups/GISRealTime.html",
                                            PAGE_WIDTH: 1200,
                                            PAGE_HEIGHT: 600
                                        },
                                    });
                                    var ssjcLayer = map.getLayer("ssjcLayer");
                                    if (ssjcLayer) {
                                        mm.addTo(ssjcLayer).on('click', function (e) {
                                            showWindowsMethod(e.target.properties); // 原代码此处调用了 showWindowsMethod
                                        });
                                    } else {
                                        console.warn("地图上未找到 ssjcLayer 图层，Marker (ID: " + matchedData.ID + ") 无法添加。");
                                    }


                                } else if (matchedData.MONITOR_TYPE == "06") {
                                    var mm = new maptalks.Marker(feature.geometry.coordinates, {
                                        id: matchedData.ID,
                                        symbol: {
                                            markerFile: "/develop/FormulaMap/img/4/气象.png",
                                            markerWidth: 87 / 1.5,
                                            markerHeight: 162 / 1.5,
                                        },
                                        properties: {
                                            ID: matchedData.ID,
                                            REGION_ID: matchedData.REGION_ID,
                                            MONITOR_ID: matchedData.ID,
                                            MONITOR_TYPE: matchedData.MONITOR_TYPE,
                                            NAME: matchedData.MONITOR_NAME,
                                            SHOW_PAGE_PATH: "07GISOneMap/module/popups/GISRealTime.html",
                                            PAGE_WIDTH: 1200,
                                            PAGE_HEIGHT: 600
                                        },
                                    });
                                    var ssjcLayer = map.getLayer("ssjcLayer");
                                    if (ssjcLayer) {
                                        mm.addTo(ssjcLayer).on('click', function (e) {
                                            showWindowsMethod(e.target.properties); // 原代码此处调用了 showWindowsMethod
                                        });
                                    } else {
                                        console.warn("地图上未找到 ssjcLayer 图层，Marker (ID: " + matchedData.ID + ") 无法添加。");
                                    }


                                } else if (matchedData.MONITOR_TYPE == "20") {
                                    var mm = new maptalks.Marker(feature.geometry.coordinates, {
                                        id: matchedData.ID,
                                        symbol: {
                                            markerFile: "/develop/FormulaMap/img/4/视频.png",
                                            markerWidth: 87 / 1.5,
                                            markerHeight: 162 / 1.5,
                                        },
                                        properties: {
                                            ID: matchedData.ID,
                                            REGION_ID: matchedData.REGION_ID,
                                            MONITOR_ID: matchedData.ID,
                                            MONITOR_TYPE: matchedData.MONITOR_TYPE,
                                            NAME: matchedData.MONITOR_NAME,
                                            SHOW_PAGE_PATH: "07GISOneMap/module/popups/GISRealTime.html",
                                            PAGE_WIDTH: 1200,
                                            PAGE_HEIGHT: 600
                                        },
                                    });
                                    var ssjcLayer = map.getLayer("ssjcLayer");
                                    if (ssjcLayer) {
                                        mm.addTo(ssjcLayer).on('click', function (e) {
                                            showWindowsMethod(e.target.properties); // 原代码此处调用了 showWindowsMethod
                                        });
                                    } else {
                                        console.warn("地图上未找到 ssjcLayer 图层，Marker (ID: " + matchedData.ID + ") 无法添加。");
                                    }
                                }

                                // 注意：原代码中的 tts.push(ssjcData[b].MONITOR_TYPE) 逻辑在这里被移除了，
                                // 因为我们假定 tts 现在是用来存放未匹配的 features。
                                // 如果你还需要收集所有匹配到的 MONITOR_TYPE 的唯一值，你需要使用一个单独的数组。

                            } else {
                                // 没有在 ssjcDataMap 中找到与当前 feature 的 LINK_ID 匹配的项
                                // 将当前 feature 添加到 tts 数组中
                                tts.push(feature);
                            }
                        } else {
                            // feature 没有有效的 LINK_ID，也视为未匹配，添加到 tts 数组
                            tts.push(feature);
                        }
                    }

                    // 循环结束后，tts 数组中存放的就是所有没有在 ssjcData 中找到匹配项的 features
                    console.log("没有对照上的 features (存放在 tts 中):", tts);

                    // 如果需要，可以在这里添加代码来处理这些未匹配的 features，
                    // 例如将它们显示为另一种样式，或者记录日志。


                } else {
                    // features 数组为空，说明没有从服务获取到 features
                    console.warn("从 SuperMap 服务获取到的 features 数组为空。");
                    // 此时 tts 数组是空的，符合逻辑（没有 features 自然没有未匹配的 features）
                    console.log("没有对照上的 features (存放在 tts 中):", tts);
                }
            });


        },

        error: function (data, status) {
        }
    });
}

function bingSJJC() {

    var strHtml = ""
    strHtml += '<table id="dg"  style="width: 100%;font-size: 12px" border="0" cellspacing="0" cellpadding="0">';
    strHtml += '    <thead class="tableheader">';
    strHtml += '        <tr class="gcgrid-header-row">';
    strHtml += '            <th id="ssjcBT1" style="width: 30%;font-weight: 400;">站点名称</th>';
    strHtml += '            <th id="ssjcBT2" style="width: 40%;font-weight: 400;" >监测时间</th>';
    strHtml += '            <th id="ssjcBT3" style="width: 30%;font-weight: 400;" >操作</th>';
    strHtml += '        </tr>';
    strHtml += '   </thead>';
    strHtml += '   <tbody>';
    var yy = 0;
    for (var i = 0; i < ssjcData.length; i++) {
        if (ssjcData[i].MONITOR_NAME.indexOf($("#SSJCCXZD").val()) != -1) {

            if ($("#rrrrdivSSJC input[type='checkbox']:checked").val() == "all") {
                ssjcData[i].MONITOR_TIME = (ssjcData[i].MONITOR_TIME != "" && ssjcData[i].MONITOR_TIME != null && ssjcData[i].MONITOR_TIME != "undefined") ? ssjcData[i].MONITOR_TIME : "";
                if (yy % 2 != 0) {
                    strHtml += '      <tr style="text-align: center" onmouseout="ShiftIn(this)" onmouseover="CutIn(this)" id="' + ssjcData[i].ID + '"   title="' + (ssjcData[i].MONITOR_DATA == null ? "" : ssjcData[i].MONITOR_DATA) + '" class="gcgrid-list-row1">';
                } else {
                    strHtml += '      <tr style="text-align: center" onmouseout="ShiftIn(this)" onmouseover="CutIn(this)" id="' + ssjcData[i].ID + '"   title="' + (ssjcData[i].MONITOR_DATA == null ? "" : ssjcData[i].MONITOR_DATA) + '" class="gcgrid-list-row2">';
                }
                strHtml += '          <td class="ellipsis" style="max-width: 60px;"><a style="color: #b9ccdf;font-weight: 400;">' + ssjcData[i].MONITOR_NAME + '</a></td>';
                strHtml += '          <td class="ellipsis" style="max-width: 60px;"><a style="color: #b9ccdf;font-weight: 400;">' + ssjcData[i].MONITOR_TIME + '</a></td>';
                strHtml += '          <td style="width: 100px;"><img style="width: 40px;color: rgb(138,219,115);text-decoration:underline;cursor: pointer;font-weight: 400;" onclick=\"point_ssjc(this)\"  src=\"/develop/FormulaMap/img/grid_DingWei.png\">' +
                    '<img style="width: 40px;color: rgb(227,160,96);text-decoration:underline;cursor:pointer; font-weight: 400;" onclick=\"postal_ssjc(this)\"  src=\"/develop/FormulaMap/img/grid_XiangQing.png\"></td>';
                strHtml += "<input type='hidden' name='ycy' value='" + JSON.stringify(ssjcData[i]) + "' > ";
                strHtml += '      </tr>';
                yy = yy + 1;
            } else {
                if (ssjcData[i].MONITOR_TYPE == $("#rrrrdivSSJC input[type='checkbox']:checked").val()) {
                    ssjcData[i].MONITOR_TIME = (ssjcData[i].MONITOR_TIME != "" && ssjcData[i].MONITOR_TIME != null && ssjcData[i].MONITOR_TIME != "undefined") ? ssjcData[i].MONITOR_TIME : "";
                    if (yy % 2 != 0) {
                        strHtml += '      <tr style="text-align: center" onmouseout="ShiftIn(this)" onmouseover="CutIn(this)" id="' + ssjcData[i].ID + '"   title="' + (ssjcData[i].MONITOR_DATA == null ? "" : ssjcData[i].MONITOR_DATA) + '" class="gcgrid-list-row1">';
                    } else {
                        strHtml += '      <tr style="text-align: center" onmouseout="ShiftIn(this)" onmouseover="CutIn(this)" id="' + ssjcData[i].ID + '"   title="' + (ssjcData[i].MONITOR_DATA == null ? "" : ssjcData[i].MONITOR_DATA) + '" class="gcgrid-list-row2">';
                    }
                    strHtml += '          <td class="ellipsis" style="max-width: 60px;"><a style="color: #b9ccdf;font-weight: 400;">' + ssjcData[i].MONITOR_NAME + '</a></td>';
                    strHtml += '          <td class="ellipsis" style="max-width: 60px;"><a style="color: #b9ccdf;font-weight: 400;">' + ssjcData[i].MONITOR_TIME + '</a></td>';
                    strHtml += '          <td style="width: 100px;"><img style="width: 40px;color: rgb(138,219,115);text-decoration:underline;cursor: pointer;font-weight: 400;" onclick=\"point_ssjc(this)\"  src=\"/develop/FormulaMap/img/grid_DingWei.png\">' +
                        '<img style="width: 40px;color: rgb(227,160,96);text-decoration:underline;cursor:pointer; font-weight: 400;" onclick=\"postal_ssjc(this)\"  src=\"/develop/FormulaMap/img/grid_XiangQing.png\"></td>';
                    strHtml += "<input type='hidden' name='ycy' value='" + JSON.stringify(ssjcData[i]) + "' > ";
                    strHtml += '      </tr>';
                    yy = yy + 1;
                }
            }


        }
    }
    strHtml += '      </tbody>';
    strHtml += '</table>';
    $('#divDg_ssjc').html(strHtml);

    var filtered = map.getLayer("ssjcLayer").filter(["!=", "NAME", ""]);
    filtered.forEach(function (polygon) {
        polygon.hide()
    });

    var filtered = map.getLayer("ssjcLayer").filter(["contains", "NAME", $("#SSJCCXZD").val()]);
    filtered.forEach(function (polygon) {
        polygon.show()
    });

}


function bingYSJG() {


    var strHtml = ""
    strHtml += '<table id="dg"  style="width: 100%;font-size: 12px" border="0" cellspacing="0" cellpadding="0">';
    strHtml += '    <thead class="tableheader">';
    strHtml += '        <tr class="gcgrid-header-row">';
    strHtml += '            <th style="width: 30%;font-weight: 400;">站点名称</th>';
    strHtml += '            <th style="width: 40%;font-weight: 400;" >监测时间</th>';
    strHtml += '            <th style="width: 30%;font-weight: 400;" >操作</th>';
    strHtml += '        </tr>';
    strHtml += '   </thead>';
    strHtml += '   <tbody>';
    var yy = 0;
    for (var i = 0; i < ssjcData.length; i++) {

        if (ssjcData[i].MONITOR_TYPE == "01") {
            if (ssjcData[i].MONITOR_NAME.indexOf($("#YSJGCXZD").val()) != -1) {

                ssjcData[i].MONITOR_TIME = (ssjcData[i].MONITOR_TIME != "" && ssjcData[i].MONITOR_TIME != null && ssjcData[i].MONITOR_TIME != "undefined") ? ssjcData[i].MONITOR_TIME : "";
                if (yy % 2 != 0) {
                    strHtml += '      <tr onmouseout="ShiftIn0(this)" onmouseover="CutIn0(this)" id="' + ssjcData[i].ID + 'ysjg" name ="ysjg"   title="' + (ssjcData[i].MONITOR_DATA == null ? "" : ssjcData[i].MONITOR_DATA) + '" class="gcgrid-list-row1">';
                } else {
                    strHtml += '      <tr onmouseout="ShiftIn0(this)" onmouseover="CutIn0(this)" id="' + ssjcData[i].ID + 'ysjg" name ="ysjg"   title="' + (ssjcData[i].MONITOR_DATA == null ? "" : ssjcData[i].MONITOR_DATA) + '" class="gcgrid-list-row2">';
                }
                strHtml += '          <td class="ellipsis" style="max-width: 60px;"><a style="color: #b9ccdf;font-weight: 400;">' + ssjcData[i].MONITOR_NAME + '</a></td>';
                strHtml += '          <td class="ellipsis" style="max-width: 60px;"><a style="color: #b9ccdf;font-weight: 400;">' + ssjcData[i].MONITOR_TIME + '</a></td>';
                strHtml += '          <td style="width: 100px;"><img style="width: 40px;color: rgb(138,219,115);text-decoration:underline;cursor: pointer;font-weight: 400;" onclick=\"point_ssjc(this)\"  src=\"/develop/FormulaMap/img/grid_DingWei.png\">' +
                    '<img style="width: 40px;color: rgb(227,160,96);text-decoration:underline;cursor:pointer; font-weight: 400;" onclick=\"postal_ssjc(this)\"  src=\"/develop/FormulaMap/img/grid_XiangQing.png\"></td>';
                strHtml += "<input type='hidden' name='ycy' value='" + JSON.stringify(ssjcData[i]) + "' > ";
                strHtml += '      </tr>';
                yy = yy + 1;
            }
        }
    }
    strHtml += '      </tbody>';
    strHtml += '</table>';
    $('#divDg_ysjg').html(strHtml);

    var filtered = map.getLayer("ysjgLayer").filter(["!=", "NAME", ""]);
    filtered.forEach(function (polygon) {
        polygon.hide()
    });

    var filtered = map.getLayer("ysjgLayer").filter(["contains", "NAME", $("#YSJGCXZD").val()]);
    filtered.forEach(function (polygon) {
        polygon.show()
        polygon.openInfoWindow();
    });
}

function point_ssjc(a) {

    var imgElement = a;
    // 找到父级的父级（即 <tr> 元素）
    var parentTr = imgElement.parentNode.parentNode;
    // 获取 <tr> 元素的 id
    var trId = parentTr.id;
    const filtered = map.getLayer("ssjcLayer").filter(["==", "ID", trId]);
    filtered.forEach(function (polygon) {
        map.setView({
            center: [polygon.getCoordinates().x, polygon.getCoordinates().y],
            zoom: 15,
        });

        polygon.flash(
            200,
            5,
        );
    });
}

function point_ysjg(index) {
    var imgElement = a;
    // 找到父级的父级（即 <tr> 元素）
    var parentTr = imgElement.parentNode.parentNode;
    // 获取 <tr> 元素的 id
    var trId = parentTr.id;
    const filtered = map.getLayer("ysjgLayer").filter(["==", "ID", trId]);
    filtered.forEach(function (polygon) {
        map.setView({
            center: [polygon.getCoordinates().x, polygon.getCoordinates().y],
            zoom: 15,
        });

        polygon.flash(
            200,
            5,
        );
    });
}

function postal_ssjc(index) {
    var row
    var imgElement = index;
    // 找到父级的父级（即 <tr> 元素）
    var parentTr = imgElement.parentNode.parentNode;
    // 获取 <tr> 元素的 id
    var trId = parentTr.id;
    for (var a = 0; a < ssjcData.length; a++) {
        console.log(ssjcData[a]);
        if (trId == ssjcData[a].ID) {
            row = ssjcData[a];
        }
    }


    var attribute = {};
    attribute.REGION_ID = row.REGION_ID;
    attribute.MONITOR_ID = row.ID;
    attribute.MONITOR_TYPE = row.MONITOR_TYPE;
    attribute.NAME = row.MONITOR_NAME;
    attribute.SHOW_PAGE_PATH = "07GISOneMap/module/popups/GISRealTime.html";
    attribute.PAGE_WIDTH = 1200;
    attribute.PAGE_HEIGHT = 600;
    showWindowsMethod(attribute);
}

function postal_ysjg(index) {
    var shusData = index.split("_");
    var reow = $("#divDg_ysjg").find("input").eq(shusData[1] - 1).val();
    var row = JSON.parse(reow);
    var attribute = {};
    attribute.REGION_ID = row.REGION_ID;
    attribute.MONITOR_ID = row.ID;
    attribute.MONITOR_TYPE = row.MONITOR_TYPE;
    attribute.NAME = row.MONITOR_NAME;
    attribute.SHOW_PAGE_PATH = "07GISOneMap/module/popups/GISRealTime.html";
    attribute.PAGE_WIDTH = 1200;
    attribute.PAGE_HEIGHT = 600;
    showWindowsMethod(attribute);
}

function ShiftIn0(content) {
    var DivIds = $(content).attr('id');
    $("#" + DivIds).css("background-color", bgys)
    $("#" + DivIds + "div").parent().parent().css("background-color", "rgba(24, 38, 42, 0.93)")
    $("#" + DivIds + "div").parent().parent().css("visibility", ysjgvisible);
    $("#" + DivIds + "div").parent().parent().css("z-index", "1");
}

function CutIn0(content) {
    var DivIds = $(content).attr('id');
    bgys = $("#" + DivIds).css("background-color")
    $("#" + DivIds).css("background-color", "rgba(103,221,24,0.34)")
    sccs = DivIds
    ysjgvisible = $("#" + DivIds + "div").parent().parent().css("visibility");
    $("#" + DivIds + "div").parent().parent().css("background-color", "rgba(2,21,28,0.93)")
    $("#" + DivIds + "div").parent().parent().css("visibility", "visible");
    $("#" + DivIds + "div").parent().parent().css("z-index", "10000");
}

function ShiftIn(content) {
    var DivIds = $(content).attr('id');
    $("#" + DivIds).css("background-color", bgys)
    var filtered = map.getLayer("ssjcLayer").filter(["==", "ID", sccs]);
    filtered.forEach(function (polygon) {
        polygon.updateSymbol({
            markerWidth: 87 / 1.5,
            markerHeight: 162 / 1.5,
            zIndex: 99
        });
    });
}

function CutIn(content) {
    var DivIds = $(content).attr('id');
    bgys = $("#" + DivIds).css("background-color")
    $("#" + DivIds).css("background-color", "rgba(103,221,24,0.34)")
    sccs = DivIds
    const filtered = map.getLayer("ssjcLayer").filter(["==", "ID", DivIds]);
    filtered.forEach(function (polygon) {
        polygon.updateSymbol({
            markerWidth: 87 / 1.1,
            markerHeight: 162 / 1.1,
            zIndex: 1000
        });
    });
}


//工程分布
function initGCFB(a) {
    $.ajax({
        url: '/07GISOneMap/module/02EngineerManage/01EngineerDistribution_LoadSfqData',
        type: 'post',
        async: true,
        data: {
            DATA_TABLE_NAME: gcfbAlltype[a].TN
        },
        success: function (data, status) {
            if (data) {
                if (data.length > 0) {
                    gcfbAlltype[a].DATA = data;
                    $("#rrrrdiv").append('   <label style="cursor: pointer"><div style="margin-top: -2%;display: inline-block;width: 23%">' +
                        '       <input style="float: left;zoom: 120%;cursor: pointer;" type="checkbox" value="' + gcfbAlltype[a].TN + '" name="' + gcfbAlltype[a].MN + '" onclick="radionone(this)"><div style="margin-left: 5%;margin-top: 3%;float: left">' + gcfbAlltype[a].MN + '</div>' +
                        '   </div></label>')

                    gcfbtype.push(gcfbAlltype[a])
                    var sqlParam = new SuperMap.GetFeaturesByBufferParameters({
                        toIndex: -1,
                        maxFeatures: gcfbAlltype[a].INDEX,
                        queryParameter: {
                            attributeFilter: "1=1",
                        },
                        datasetNames: gcfbAlltype[a].SUPERMAPCX,
                    });
                    new ol.supermap.FeatureService("http://183.252.9.117:8090/iserver/services/data-ShanMeiGuanQu/rest/data").getFeaturesBySQL(sqlParam, function (serviceResult) {
                        var features = serviceResult.result.features.features
                        if (features.length > 0) {
                            var lx;
                            var mm;
                            var path;
                            for (var a = 0; a < gcfbtype.length; a++) {
                                if (gcfbtype[a].INDEX == serviceResult.object.maxFeatures) {
                                    lx = gcfbtype[a].MN
                                    path = gcfbtype[a].SPP
                                }
                            }
                            for (var a = 0; a < features.length; a++) {
                                if (features[a].geometry.type == "LineString") {
                                    mm = new maptalks.LineString(
                                        features[a].geometry.coordinates,
                                        {
                                            visible: false,
                                            symbol: {
                                                lineColor: "#24bfe1",
                                                lineWidth: 6,
                                                lineJoin: "round", // miter, round, bevel
                                                lineCap: "round", // butt, round, square
                                                lineDasharray: null, // dasharray, e.g. [10, 5, 5]
                                                lineOpacity: 1,
                                            },
                                            properties: {
                                                TYPE: lx,
                                                REGION_ID: features[a].properties.IRRID,
                                                ID: features[a].properties.LINK_ID,
                                                NAME: features[a].properties.NAME,
                                                SHOW_PAGE_PATH: path,
                                                PAGE_WIDTH: 1200,
                                                PAGE_HEIGHT: 600
                                            },
                                        }
                                    )

                                } else {
                                    if (lx == "水闸") {
                                        mm = new maptalks.Marker(features[a].geometry.coordinates, {
                                            visible: false,
                                            symbol: {
                                                markerFile: "/develop/FormulaMap/img/5/sz.png",
                                                markerWidth: 87 / 1.5,
                                                markerHeight: 162 / 1.5,
                                            },
                                            properties: {
                                                TYPE: lx,
                                                REGION_ID: features[a].properties.IRRID,
                                                ID: features[a].properties.LINK_ID,
                                                NAME: features[a].properties.NAME,
                                                SHOW_PAGE_PATH: path,
                                                PAGE_WIDTH: 1200,
                                                PAGE_HEIGHT: 600
                                            },
                                        });
                                    } else if (lx == "泵站") {

                                        mm = new maptalks.Marker(features[a].geometry.coordinates, {
                                            visible: false,
                                            symbol: {
                                                markerFile: "/develop/FormulaMap/img/5/bz.png",
                                                markerWidth: 87 / 1.5,
                                                markerHeight: 162 / 1.5,
                                            },
                                            properties: {
                                                TYPE: lx,
                                                REGION_ID: features[a].properties.IRRID,
                                                ID: features[a].properties.LINK_ID,
                                                NAME: features[a].properties.NAME,
                                                SHOW_PAGE_PATH: path,
                                                PAGE_WIDTH: 1200,
                                                PAGE_HEIGHT: 600
                                            },
                                        });
                                    }
                                }
                                mm.addTo(map.getLayer("gcfbLayer")).on('click', function (e) {
                                    showWindowsMethod(e.target.properties);
                                })
                            }
                        }
                    });
                }
                if (a < gcfbAlltype.length - 1) {
                    initGCFB(a += 1)
                } else {
                    $('#divDg_gcfb').css('height', (100 - Math.ceil(gcfbtype.length / 4) * 10) + '%')
                    $('#rrrr').find('input[type="checkbox"]:first').trigger("click");
                    gcfbAlltype = null;
                    if (gcfbtype.length == 1) {
                        $("#rrrrdiv").hide()
                        $('#divDg_gcfb').css('height', '90%')
                    }
                }
            }

        },
        error: function (data, status) {
            $.messager.alert("系统提示", data.resultMessage, 'error');
        }
    })
}

var aaannn = ""
var gclbdata = [];

function bingGCFB() {


    var strHtml = '';
    var yy = 0;
    strHtml += '<table id="dg"  style="width: 100%;font-size: 12px" border="0" cellspacing="0" cellpadding="0";>';
    strHtml += '    <thead class="tableheader">';
    strHtml += '        <tr class="gcgrid-header-row">';
    strHtml += '            <th style="width: 40px;font-weight: 400;">序号</th>';
    strHtml += '            <th style="width: 80px;font-weight: 400;" >工程名称</th>';
    strHtml += '            <th style="width: 96px;font-weight: 400;" >操作</th>';
    strHtml += '        </tr>';
    strHtml += '   </thead>';
    strHtml += '   <tbody>';


    for (var a = 0; a < gcfbtype.length; a++) {
        if (gcgbxz == gcfbtype[a].MN) {
            aaannn = gcfbtype[a].MN
            gclbdata = gcfbtype[a].DATA;
        }
    }

    for (var i = 0; i < gclbdata.length; i++) {
        if (gclbdata[i].DATA_NAME.indexOf($("#GCFBCXZD").val()) != -1) {
            if (yy % 2 != 0) {
                strHtml += '      <tr onmouseout="ShiftIn1(this)" onmouseover="CutIn1(this)" id="' + gclbdata[i].ID + '" class="gcgrid-list-row1">';
            } else {
                strHtml += '      <tr onmouseout="ShiftIn1(this)" onmouseover="CutIn1(this)" id="' + gclbdata[i].ID + '" class="gcgrid-list-row2">';
            }
            strHtml += '          <th style="max-width: 40px;"><a style="color: rgb(138,219,115);font-weight: 600;">' + (i + 1) + '</a></th>';
            strHtml += '          <th class="ellipsis" style="max-width: 80px;"><a style="color: #b9ccdf;font-weight: 400;">' + gclbdata[i].DATA_NAME + '</a></th>';
            strHtml += '          <th style="man-width: 96px;"><img style="cursor: pointer;width: 48px;" onclick=\"point_gcfb(this)\"  src="/develop/FormulaMap/img/grid_DingWei.png"></img>' +
                '<img style="cursor: pointer;width: 48px;" onclick=\"postal_gcfb(this)\"  src="/develop/FormulaMap/img/grid_XiangQing.png"></img></th>';
            strHtml += "<input type='hidden' name='ycy' value='" + JSON.stringify(gclbdata[i]) + "' > ";
            strHtml += '      </tr>';
            yy += 1
        }
    }
    strHtml += '      </tbody>';
    strHtml += '</table>';
    $('#divDg_gcfb').html(strHtml);

    var filtered = map.getLayer("gcfbLayer").filter(["!=", "NAME", ""]);
    filtered.forEach(function (polygon) {
        polygon.hide()
    });

    var filtered = map.getLayer("gcfbLayer").filter(["==", "TYPE", aaannn], ["contains", "NAME", $("#GCFBCXZD").val()]);
    filtered.forEach(function (polygon) {
        polygon.show()
    });

}

function postal_gcfb(shus) {


    var imgElement = shus;
    // 找到父级的父级（即 <tr> 元素）
    var parentTr = imgElement.parentNode.parentNode;
    // 获取 <tr> 元素的 id
    var trId = parentTr.id;
    for (var a = 0; a < gclbdata.length; a++) {

        if (trId == gclbdata[a].ID) {
            row = gclbdata[a];
        }
    }


    if (row.DATA_TABLE_NAME == "EM_TD_CANAL") {
        openpage1(row)
    } else if (row.DATA_TABLE_NAME == "EM_TD_RESERVOIR") {
        row.SHOW_PAGE_PATH = "07GISOneMap/module/popups/GISReservior.html";
        row.NAME = row.DATA_NAME;
        showWindowsMethod(row);
    } else if (row.DATA_TABLE_NAME == "EM_TD_PIVOT") {
        row.SHOW_PAGE_PATH = "07GISOneMap/module/popups/GISPivot.html";
        row.NAME = row.DATA_NAME;
        showWindowsMethod(row);
    } else {
        row.SHOW_PAGE_PATH = "07GISOneMap/module/popups/GISCanalBuild.html";
        row.NAME = row.DATA_NAME;
        showWindowsMethod(row);
    }

}

function point_gcfb(index) {

    var imgElement = index;
    // 找到父级的父级（即 <tr> 元素）
    var parentTr = imgElement.parentNode.parentNode;
    // 获取 <tr> 元素的 id
    var trId = parentTr.id;


    const filtered = map.getLayer("gcfbLayer").filter(["==", "ID", trId]);
    filtered.forEach(function (polygon) {
        map.setView({
            center: polygon.getCenter(),
            zoom: 15,
        });
        polygon.flash(
            200,
            5,
        );

    });
}

function ShiftIn1(content) {
    var DivIds = $(content).attr('id');
    $("#" + DivIds).css("background-color", bgys)

    const filtered = map.getLayer("gcfbLayer").filter(["==", "ID", sccs]);
    filtered.forEach(function (polygon) {
        polygon.updateSymbol({
            markerWidth: 87 / 1.5,
            markerHeight: 162 / 1.5,
            zIndex: 99,
            lineColor: "#24bfe1",
            lineWidth: 6,
        });
    });

}

function CutIn1(content) {
    var DivIds = $(content).attr('id');
    bgys = $("#" + DivIds).css("background-color")
    $("#" + DivIds).css("background-color", "rgba(103,221,24,0.34)")
    sccs = DivIds
    const filtered = map.getLayer("gcfbLayer").filter(["==", "ID", DivIds]);
    filtered.forEach(function (polygon) {
        polygon.updateSymbol({
            markerWidth: 87 / 1.1,
            markerHeight: 162 / 1.1,
            zIndex: 1000,
            lineColor: "#c8e124",
            lineWidth: 8,
        });
    });
}


function openpage1(row) {

    if (row.DATA_TABLE_NAME == "EM_TD_CANAL") {
        $("#ContentDiv_tmp").html('' +
            `<div id="ggqx_cbgq" style="padding-top: 0%;width: 100%;height: 90%;margin-top: 3%;position: fixed;display: block">
                    <div style="left: 10%;top: 1.3%;width: 77%;/* height: 25%; */position: absolute;text-align: center">
                        <div id="zlqdmc" style="font-size: 17px; font-weight: bold;">诗南左干渠</div>
                    </div>
                    <div style="left: 10%;top: 4%;width: 85%;/* height: 25%; */position: absolute;">
                        <div style="margin-top: 3%;float: left;">
                            <span style="color: rgb(1, 128, 238); font-size: 15px; font-weight: bold;">渠道级别 : </span>
                            <span id="zlqdjb" style="font-size: 15px;">干渠</span>
                        </div>
                        <div style="margin-top: 3%;margin-left: 5%;float: left;">
                            <span style="color: rgb(1, 128, 238); font-size: 15px; font-weight: bold;">渠道总长 : </span>
                            <span id="zlqdzc" style="font-size: 15px;"></span>
                        </div>
                        <div style="margin-top: 3%;margin-left: 5%;float: left;">
                            <span style="color: rgb(1, 128, 238); font-size: 15px; font-weight: bold;">设计流量 : </span>
                            <span id="zlqdsjll" style="font-size: 15px;"></span>
                        </div>
                        <div style="margin-top: 3%;margin-left: 5%;float: left;">
                            <span style="color: rgb(1, 128, 238); font-size: 15px; font-weight: bold;">灌溉面积 : </span>
                            <span id="zlqdggmj" style="font-size: 15px;"></span>
                        </div>
                    </div>
                    <div style="left: 10%;top: 9%;width: 85%;/* height: 25%; */position: absolute;">
                        <div style="margin-top: 3%;float: left;">
                            <span style="color: rgb(1, 128, 238); font-size: 15px; font-weight: bold;">渠道水利用系数 : </span>
                            <span id="zlqdsllxs" style="font-size: 15px;"></span>
                        </div>
                        <div style="margin-top: 3%;margin-left: 10%;float: left;">
                            <span style="color: rgb(1, 128, 238); font-size: 15px; font-weight: bold;">设计灌溉面积 : </span>
                            <span style="font-size: 15px;">--</span>
                        </div>
                    </div>
                    <div style="left: 10%;top: 14%;width: 85%;/* height: 43%; */overflow: hidden;position: absolute;">
                        <div style="margin-top: 3%;float: left;">
                            <span style="color: rgb(1, 128, 238); font-size: 15px; font-weight: bold">结构形式</span>
                            <br>
                            <img src="develop/FormulaMap/img/1/tc_j_4.png">
                            <span style="font-size: 15px;">&nbsp;&nbsp;&nbsp;<span id="zljgxs"></span>&nbsp;&nbsp;&nbsp;</span>
                            <img src="develop/FormulaMap/img/1/tc_j_3.png">
                        </div>
                        <div style="margin-top: 3%;margin-left: 8%;float: left;">
                            <span style="color: rgb(1, 128, 238); font-size: 15px; font-weight: bold; ">断面形式</span>
                            <br>
                            <img src="develop/FormulaMap/img/1/tc_j_4.png">
                            <span style="font-size: 15px;">&nbsp;&nbsp;&nbsp;<span id="zldmxs"></span>&nbsp;&nbsp;&nbsp;</span>
                            <img src="develop/FormulaMap/img/1/tc_j_3.png">
                        </div>
                        <div style="margin-top: 3%;margin-left: 8%;float: left;">
                            <span style="color: rgb(1, 128, 238); font-size: 15px; font-weight: bold; ">运行状况</span>
                            <br>
                            <img src="develop/FormulaMap/img/1/tc_j_4.png">
                            <span style="font-size: 15px;">&nbsp;&nbsp;&nbsp;<span id="zlyxzk"></span>&nbsp;&nbsp;&nbsp;</span>
                            <img src="develop/FormulaMap/img/1/tc_j_3.png">
                        </div>
                    </div>
                    
                    <div  id="ggggmj" style="display: flex;left: 10%;top: 32%;height: 18%;width:100%;position: absolute">
                       
                  
                        
                    </div>
                    
                    
                    <div style="left: 8%;top: 50%;width: 91%;height: 43%;overflow: hidden;position: absolute;">
                        <div id="divzlimg1" style="width: 40%;height: 100%;float: left;">
                            <img id="zlimg1" onclick="tpfangda(this)" class="pic" style="cursor: pointer;margin: 5%; border: 1.5px solid lightgrey; border-image: none; width: 100%; height: 85%;" src="/8-130-001/canal/Image/636cbad2bfcb44b14c1d5b28353678d6.jpg">
                        </div>
                        <div id="divzlimg2" style="width: 40%;height: 100%;float: left;margin-left: 5%;">
                            <img id="zlimg2" onclick="tpfangda(this)" class="pic" style="cursor: pointer;margin: 5%; border: 1.5px solid lightgrey; border-image: none; width: 100%; height: 85%;" src="/8-130-001/canal/Image/84061b5a66305a497aa647e7c2dd6803.jpg">
                        </div>
                    </div>
                </div>`
        )

        var data = {};
        data.Data = JSON.stringify({
            DATA_TABLE_NAME: "EM_TD_CANAL",
            LINK_ID: row.ID
        });

        $.ajax({
            url: "/07GISOneMap/module/popups/GISCanal_InitDate",
            type: "post",
            async: false,
            data: data,
            success: function (data, status) {
                if (data.result.length > 0) {
                    $("#zlqdmc").html(data.result[0].CANAL_NAME)
                    $("#zlqdjb").html(data.result[0].T_CANAL_LEVEL)
                    $("#zlqdzc").html(data.result[0].CANAL_LENGTH)
                    $("#zlqdsjll").html(data.result[0].DE_FLOW)
                    $("#zlqdsllxs").html(data.result[0].WU_PERCENT)
                    $("#zljgxs").html(data.result[0].STRUCTURAL_MODE)
                    $("#zldmxs").html(data.result[0].SECTION_MODE)
                    $("#zlyxzk").html(data.result[0].RUN_STATUS)
                }
            },
            error: function (data, status) {
                $.messager.alert("系统提示", '调用失败');
            }
        });
        $.ajax({
            url: "/07GISOneMap/module/popups/GISCanal_getPicture",
            type: "post",
            async: false,
            data: {
                id: row.ID
            },
            success: function (data, status) {
                if (data.result.length > 0) {
                    tps = []
                    $('#zlimg1').attr('src', 'upload' + data.result[0].FILE_PATH);
                    tps.push('upload' + data.result[0].FILE_PATH)
                    if (data.result.length > 1) {
                        $('#zlimg2').attr('src', 'upload' + data.result[1].FILE_PATH);
                        tps.push('upload' + data.result[1].FILE_PATH)
                        $('#divzlimg2').show()
                    } else {
                        $('#divzlimg2').hide()
                    }
                } else {
                    $('#divzlimg1').hide()
                    $('#divzlimg2').hide()
                }
            },
            error: function (data, status) {
                $.messager.alert("系统提示", '调用失败');
            }
        });


        $.ajax({
            url: "/develop/FormulaMap/shanmeiguanmian",
            type: "post",
            async: false,
            data: {
                name: row.DATA_NAME
            },
            success: function (data, status) {
                if (data && data.isSuccess) {
                    $("#zlqdggmj").html(data.result[0].TOTAL + "万亩")

                    var ss = ""

                    ss += ` <div>
                                    <div style="text-align:center;display: flex;align-items: center;justify-content: center;border: 1px solid steelblue;font-size: 12px;padding: 0 3px;height: 50%">
                                        水田
                                    </div>
                                    <div style="display: flex;align-items: center;justify-content: center;border: 1px solid steelblue;margin-top: -1px;font-size: 15px;height: 50%">
                                        ${data.result[0].PADDY_FIELD}
                                    </div>
                                </div>`


                    ss += ` <div>
                                    <div style="margin-left: -1px;text-align:center;display: flex;align-items: center;justify-content: center;border: 1px solid steelblue;font-size: 12px;padding: 0 3px;height: 50%">
                                        水浇地
                                    </div>
                                    <div style="margin-left: -1px;display: flex;align-items: center;justify-content: center;border: 1px solid steelblue;margin-top: -1px;font-size: 15px;height: 50%">
                                        ${data.result[0].IRRIGATED_LAND}
                                    </div>
                                </div>`


                    ss += ` <div>
                                    <div style="margin-left: -1px;text-align:center;display: flex;align-items: center;justify-content: center;border: 1px solid steelblue;font-size: 12px;padding: 0 3px;height: 50%">
                                        旱地
                                    </div>
                                    <div style="margin-left: -1px;display: flex;align-items: center;justify-content: center;border: 1px solid steelblue;margin-top: -1px;font-size: 15px;height: 50%">
                                        ${data.result[0].DRY_LAND}
                                    </div>
                                </div>`


                    ss += ` <div>
                                    <div style="margin-left: -1px;text-align:center;display: flex;align-items: center;justify-content: center;border: 1px solid steelblue;font-size: 12px;padding: 0 3px;height: 50%">
                                        果园
                                    </div>
                                    <div style="margin-left: -1px;display: flex;align-items: center;justify-content: center;border: 1px solid steelblue;margin-top: -1px;font-size: 15px;height: 50%">
                                        ${data.result[0].ORCHARD}
                                    </div>
                                </div>`


                    ss += ` <div>
                                    <div style="margin-left: -1px;text-align:center;display: flex;align-items: center;justify-content: center;border: 1px solid steelblue;font-size: 12px;padding: 0 3px;height: 50%">
                                        可调整</br>果园
                                    </div>
                                    <div style="margin-left: -1px;display: flex;align-items: center;justify-content: center;border: 1px solid steelblue;margin-top: -1px;font-size: 15px;height: 50%">
                                        ${data.result[0].ADJ_ORCHARD}
                                    </div>
                                </div>`

                    ss += ` <div>
                                    <div style="margin-left: -1px;text-align:center;display: flex;align-items: center;justify-content: center;border: 1px solid steelblue;font-size: 12px;padding: 0 3px;height: 50%">
                                        茶园
                                    </div>
                                    <div style="margin-left: -1px;display: flex;align-items: center;justify-content: center;border: 1px solid steelblue;margin-top: -1px;font-size: 15px;height: 50%">
                                        ${data.result[0].TEA_PLANTATION}
                                    </div>
                                </div>`

                    ss += ` <div>
                                    <div style="margin-left: -1px;text-align:center;display: flex;align-items: center;justify-content: center;border: 1px solid steelblue;font-size: 12px;padding: 0 3px;height: 50%">
                                        其他</br>园地
                                    </div>
                                    <div style="margin-left: -1px;display: flex;align-items: center;justify-content: center;border: 1px solid steelblue;margin-top: -1px;font-size: 15px;height: 50%">
                                        ${data.result[0].TEA_PLANTATION}
                                    </div>
                                </div>`

                    ss += ` <div>
                                    <div style="margin-left: -1px;text-align:center;display: flex;align-items: center;justify-content: center;border: 1px solid steelblue;font-size: 12px;padding: 0 3px;height: 50%">
                                        可调整</br>其他园地
                                    </div>
                                    <div style="margin-left: -1px;display: flex;align-items: center;justify-content: center;border: 1px solid steelblue;margin-top: -1px;font-size: 15px;height: 50%">
                                        ${data.result[0].ADJ_OTHER_PLANT}
                                    </div>
                                </div>`

                    ss += ` <div>
                                    <div style="margin-left: -1px;text-align:center;display: flex;align-items: center;justify-content: center;border: 1px solid steelblue;font-size: 12px;padding: 0 3px;height: 50%">
                                        乔木</br>林地
                                    </div>
                                    <div style="margin-left: -1px;display: flex;align-items: center;justify-content: center;border: 1px solid steelblue;margin-top: -1px;font-size: 15px;height: 50%">
                                        ${data.result[0].ARBOR_FOREST}
                                    </div>
                                </div>`

                    ss += ` <div>
                                    <div style="margin-left: -1px;text-align:center;display: flex;align-items: center;justify-content: center;border: 1px solid steelblue;font-size: 12px;padding: 0 3px;height: 50%">
                                        可调整</br>乔木林地
                                    </div>
                                    <div style="margin-left: -1px;display: flex;align-items: center;justify-content: center;border: 1px solid steelblue;margin-top: -1px;font-size: 15px;height: 50%">
                                        ${data.result[0].ADJ_ARBOR}
                                    </div>
                                </div>`

                    ss += ` <div>
                                    <div style="margin-left: -1px;text-align:center;display: flex;align-items: center;justify-content: center;border: 1px solid steelblue;font-size: 12px;padding: 0 3px;height: 50%">
                                        竹林地
                                    </div>
                                    <div style="margin-left: -1px;display: flex;align-items: center;justify-content: center;border: 1px solid steelblue;margin-top: -1px;font-size: 15px;height: 50%">
                                        ${data.result[0].BAMBOO_FOREST}
                                    </div>
                                </div>`

                    ss += ` <div>
                                    <div style="margin-left: -1px;text-align:center;display: flex;align-items: center;justify-content: center;border: 1px solid steelblue;font-size: 12px;padding: 0 3px;height: 50%">
                                        灌木林地
                                    </div>
                                    <div style="margin-left: -1px;display: flex;align-items: center;justify-content: center;border: 1px solid steelblue;margin-top: -1px;font-size: 15px;height: 50%">
                                        ${data.result[0].SHRUB_LAND}
                                    </div>
                                </div>`

                    ss += ` <div>
                                    <div style="margin-left: -1px;text-align:center;display: flex;align-items: center;justify-content: center;border: 1px solid steelblue;font-size: 12px;padding: 0 3px;height: 50%">
                                        其他林地
                                    </div>
                                    <div style="margin-left: -1px;display: flex;align-items: center;justify-content: center;border: 1px solid steelblue;margin-top: -1px;font-size: 15px;height: 50%">
                                        ${data.result[0].OTHER_WOODLAND}
                                    </div>
                                </div>`

                    ss += ` <div>
                                    <div style="margin-left: -1px;text-align:center;display: flex;align-items: center;justify-content: center;border: 1px solid steelblue;font-size: 12px;padding: 0 3px;height: 50%">
                                        可调整<br>其他林地
                                    </div>
                                    <div style="margin-left: -1px;display: flex;align-items: center;justify-content: center;border: 1px solid steelblue;margin-top: -1px;font-size: 15px;height: 50%">
                                        ${data.result[0].ADJ_WOODLAND}
                                    </div>
                                </div>`


                }
                $('#ggggmj').html(ss);
            },
            error: function (data, status) {
                $.messager.alert("系统提示", '调用失败');
            }
        });


        $("#modal-13").show()
    }


}


//遥感分析

function getLx(num) {
    switch (num) {
        case 1:
            return "干旱"
        case 2:
            return "较干旱"
        case 3:
            return "适中"
        case 4:
            return "较湿润"
        case 5:
            return "湿润"
    }
}

var YGFXData;


function sortDataByQi(data) {
    const chineseNumbers = {
        "一": 1,
        "二": 2,
        "三": 3,
        "四": 4,
        "五": 5,
        "六": 6,
        "七": 7,
        "八": 8,
        "九": 9,
        "十": 10
    };

    function getQiNumber(name) {
        const match = name.match(/第([一二三四五六七八九十]+)/);
        if (match) {
            const chineseNum = match[1];
            let number = 0;
            for (let i = 0; i < chineseNum.length; i++) {
                number = number * 10 + (chineseNumbers[chineseNum[i]] || 0);
            }
            return number;
        } else {
            return Infinity; // Use Infinity to push items without "期" to the end
        }
    }

    return data.sort((a, b) => getQiNumber(a.name) - getQiNumber(b.name));
}

function initYGFX(num) {

    // 使用 getUrlData 函数并处理响应数据
    getUrlData('http://120.46.44.187:8080/smgq/drought', function (data, error) {
        if (data) {
            data.result.sort(function (a, b) {
                return a.id - b.id;
            });
            YGFXData = data
            data.result = sortDataByQi(data.result)
            console.log(data.result);


            var isssc = true
            for (var a = 0; a < data.result.length; a++) {
                if (!data.result[a].name.includes("影像")) {
                    if (data.result[a].name.includes("面积") || data.result[a].name.includes("作物") || data.result[a].name.includes("旱地") || data.result[a].name.includes("耕地")) {
                        if (isssc) {
                            $("#yagaoSel").append(`<option selected style="text-indent: 2em;color: white;font-size: 15px" value="${data.result[a].name.replace("_", "").replace("年", "期")}">${data.result[a].name.replace("_", "").replace("年", "期")}</option>`);


                            isssc = false
                        } else {
                            $("#yagaoSel").append(`<option style="text-indent: 2em;color: white;font-size: 15px" value="${data.result[a].name.replace("_", "").replace("年", "期")}">${data.result[a].name.replace("_", "").replace("年", "期")}</option>`);

                        }
                    } else {
                        $("#yagaoSel").append(`<option style="display: none;text-indent: 2em;color: white;font-size: 15px" value="${data.result[a].name.replace("_", "").replace("年", "期")}">${data.result[a].name.replace("_", "").replace("年", "期")}</option>`);

                    }
                } else {
                    $("#yagaoSel").append(`<option style="display: none;text-indent: 2em;color: white;font-size: 15px" value="${data.result[a].name.replace("_", "").replace("年", "期")}">${data.result[a].name.replace("_", "").replace("年", "期")}</option>`);
                }
            }

            $('#yagaoSel').on('change', function () {
                var selectedOption = $(this).find('option:selected').index();
                doYGFX(selectedOption, YGFXData, false)
            });


        }
    });
}

function doYGFX(num, data, sc) {


    if ($('#tcyx').is(':checked')) {
        $('#tcyx').click();
    }
    if ($('#dyqsbnzw').is(':checked')) {
        $('#dyqsbnzw').click();
    }
    if ($('#dyqxbnzw').is(':checked')) {
        $('#dyqxbnzw').click();
    }
    if ($('#dyqsqgd').is(':checked')) {
        $('#dyqsqgd').click();
    }
    if ($('#dyqsqhd').is(':checked')) {
        $('#dyqsqhd').click();
    }
    if ($('#dyqggmj').is(':checked')) {
        $('#dyqggmj').click();
    }

    if ($('#deqsqgd').is(':checked')) {
        $('#deqsqgd').click();
    }
    if ($('#deqsqhd').is(':checked')) {
        $('#deqsqhd').click();
    }
    if ($('#tcgqbj').is(':checked')) {
        $('#tcgqbj').click();
    }
    if ($('#tcslgc').is(':checked')) {
        $('#tcslgc').click();
    }

    if ($('#dsqsqhd').is(':checked')) {
        $('#dsqsqhd').click();
    }
    if ($('#dsqsqgd').is(':checked')) {
        $('#dsqsqgd').click();
    }

    map.getLayer("smdyq").hide()
    map.getLayer("smdeq").hide()
    map.getLayer("smdyqsbnzw").hide()
    map.getLayer("smdyqxbnzw").hide()
    map.getLayer("smdyqggmjjc").hide()
    map.getLayer("smdyqsqgd").hide()
    map.getLayer("smdeqsqgd").hide()
    map.getLayer("smdyqsqhd").hide()
    map.getLayer("smdeqsqhd").hide()

    map.getLayer("smdsqsqgd").hide()
    map.getLayer("smdsqsqhd").hide()

    if (!$('#tcyx').is(':checked')) {
        $('#tcyx').click();
    }


    if ($("#yagaoSel").val().includes("耕地")) {
        if (data.result[num].name.includes("第一期")) {
            if (!$('#dyqsqgd').is(':checked')) {
                $('#dyqsqgd').click();
            }
        } else if (data.result[num].name.includes("第二期")) {
            if (!$('#deqsqgd').is(':checked')) {
                $('#deqsqgd').click();
            }
        } else if (data.result[num].name.includes("第三期")) {
            if (!$('#dsqsqgd').is(':checked')) {
                $('#dsqsqgd').click();
            }
        }
        $("#ygfxbtDiv").html(`
            <div style="margin-top: 2%;text-align: center;float: left;width: 20%;height: 97%;">
                序号
            </div>
            <div style="margin-top: 2%;text-align: center;float: left;width: 30%;height: 97%;">
                类型
            </div>
            <div style="margin-top: 2%;text-align: center;float: left;width: 25%;height: 97%;">
                面积(亩)
            </div>
            <div style="margin-top: 2%;text-align: center;float: left;width: 25%;height: 97%;">
                占比
            </div>
        `)
        //面积
        getUrlData(data.result[num].area, function (data, error) {
            if (data) {
                var lx = [];
                var mj = [];
                var zb = [];
                $("#ygfxDiv").html("")
                for (var a = 0; a < data.result.table_data.length; a++) {
                    lx.push(getLx(data.result.table_data[a].Value));
                    mj.push(data.result.table_data[a]['亩']);
                    zb.push(data.result.table_data[a].PR);
                    $("#ygfxDiv").append('              <div style="width: 100%;height: 12.5%;">' +
                        '                                    <div style="margin-top: ' + ygfxData[a].MT + '%;text-align: center;float: left;width: 20%;height: 97%;">' +
                        (a + 1) +
                        '                                    </div>' +
                        '                                    <div style="margin-top: ' + ygfxData[a].MT + '%;text-align: center;float: left;width: 30%;height: 97%;">' +
                        getLx(data.result.table_data[a].Value) +
                        '                                    </div>' +
                        '                                    <div style="margin-top: ' + ygfxData[a].MT + '%;text-align: center;float: left;width: 25%;height: 97%;">' +
                        data.result.table_data[a]['亩'] +
                        '                                    </div>' +
                        '                                    <div style="margin-top: ' + ygfxData[a].MT + '%;text-align: center;float: left;width: 25%;height: 97%;">' +
                        data.result.table_data[a].PR +
                        '                                    </div>' +
                        '                                </div>')
                }


                var option = {
                    backgroundColor: "rgba(17,131,220,0.25)",
                    color: ["#ab7329", "#ddbf44", "#f3f3f3", "#7fccbf", "#057c97",],
                    grid: {
                        left: -100,
                        top: 50,
                        bottom: 10,
                        right: 10,
                        containLabel: true
                    },
                    tooltip: {
                        trigger: 'item',
                        formatter: "{b} : {c} ({d}%)"
                    },
                    legend: {
                        type: "scroll",
                        orient: "vartical",
                        top: "center",
                        right: "15",
                        // bottom: "0%",
                        itemWidth: 16,
                        itemHeight: 8,
                        itemGap: 16,
                        textStyle: {
                            color: '#A3E2F4',
                            fontSize: 12,
                            fontWeight: 0
                        },
                        data: lx
                    },
                    polar: {},
                    angleAxis: {
                        interval: 1,
                        type: 'category',
                        data: [],
                        z: 10,
                        axisLine: {
                            show: false,
                            lineStyle: {
                                color: "#0B4A6B",
                                width: 1,
                                type: "solid"
                            },
                        },
                        axisLabel: {
                            interval: 0,
                            show: true,
                            color: "#0B4A6B",
                            margin: 8,
                            fontSize: 16
                        },
                    },
                    radiusAxis: {
                        min: 40,
                        max: 120,
                        interval: 20,
                        axisLine: {
                            show: false,
                            lineStyle: {
                                color: "#0B3E5E",
                                width: 1,
                                type: "solid"
                            },
                        },
                        axisLabel: {
                            formatter: '{value} %',
                            show: false,
                            padding: [0, 0, 20, 0],
                            color: "#0B3E5E",
                            fontSize: 16
                        },
                        splitLine: {
                            lineStyle: {
                                color: "#0B3E5E",
                                width: 2,
                                type: "solid"
                            }
                        }
                    },
                    calculable: true,
                    series: [{
                        type: 'pie',
                        radius: ["5%", "10%"],
                        hoverAnimation: false,
                        labelLine: {
                            normal: {
                                show: false,
                                length: 10,
                                length2: 20
                            },
                            emphasis: {
                                show: false
                            }
                        },
                        data: [{
                            name: '',
                            value: 0,
                            itemStyle: {
                                normal: {
                                    color: "#0B4A6B"
                                }
                            }
                        }]
                    }, {
                        type: 'pie',
                        radius: ["90%", "95%"],
                        hoverAnimation: false,
                        labelLine: {
                            normal: {
                                show: false,
                                length: 10,
                                length2: 20
                            },
                            emphasis: {
                                show: false
                            }
                        },
                        name: "",
                        data: [{
                            name: '',
                            value: 0,
                            itemStyle: {
                                normal: {
                                    color: "#0B4A6B"
                                }
                            }
                        }]
                    }, {
                        stack: 'a',
                        type: 'pie',
                        radius: ['20%', '80%'],
                        roseType: 'area',
                        zlevel: 10,
                        label: {
                            normal: {
                                show: true,
                                formatter: "{c}",
                                textStyle: {
                                    fontSize: 12,
                                },
                                position: 'outside'
                            },
                            emphasis: {
                                show: true
                            }
                        },
                        labelLine: {
                            normal: {
                                show: true,
                                length: 10,
                                length2: 20
                            },
                            emphasis: {
                                show: false
                            }
                        },
                        data: [
                            {
                                value: zb[0].replace('%', ''),
                                name: lx[0]
                            },
                            {
                                value: zb[1].replace('%', ''),
                                name: lx[1]
                            },
                            {
                                value: zb[2].replace('%', ''),
                                name: lx[2]
                            },
                            {
                                value: zb[3].replace('%', ''),
                                name: lx[3]
                            },
                            {
                                value: zb[4].replace('%', ''),
                                name: lx[4]
                            }
                        ]
                    },]
                }

                ygfxbiaoge = echarts.init(document.getElementById('ygfxBiao'));
                ygfxbiaoge.setOption(option);

            }
        });

        //图例
        getUrlData(data.result[num].legeng, function (data, error) {
            if (data) {
                var existingLegendContainer = document.getElementById('legendContainer');
                if (existingLegendContainer) {
                    existingLegendContainer.parentNode.removeChild(existingLegendContainer);
                }
                // 创建一个容器用于放置图例
                var legendContainer = document.createElement('div');
                legendContainer.id = 'legendContainer';
                if (sc) {
                    legendContainer.style.display = 'none';
                } else {
                    legendContainer.style.display = 'block';
                }

                legendContainer.style.position = 'absolute'; // 使容器浮动
                legendContainer.style.zIndex = '100';
                legendContainer.style.bottom = '23px'; // 容器顶部距离视口顶部的距离
                legendContainer.style.right = '77px'; // 容器右侧距离视口右侧的距离
                legendContainer.style.padding = '5px';
                legendContainer.style.backgroundColor = 'rgba(58,58,58,0.61)'; // 容器背景色和透明度
                legendContainer.style.borderRadius = '5px'; // 容器边框圆角
                legendContainer.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)'; // 容器阴影

                // 遍历图例数组，为每个图例项创建一个div元素
                data.result.legend.forEach(function (legendItem) {
                    var legendItemDiv = document.createElement('div');
                    legendItemDiv.style.display = 'inline-block'; // 使div元素内联块级显示
                    legendItemDiv.style.padding = '3px 8px';
                    legendItemDiv.style.backgroundColor = legendItem.color; // 设置背景色为图例颜色
                    legendItemDiv.style.color = '#000000'; // 设置文字颜色为白色
                    legendItemDiv.style.borderRadius = '3px'; // 设置边框圆角
                    legendItemDiv.style.marginRight = '5px'; // 设置右边距
                    legendItemDiv.textContent = legendItem.label; // 设置文本内容为图例标签
                    if (legendItem.label == "干旱") {
                        legendItemDiv.title = "干旱表示土壤水分极度匮乏，适合作物生长的水分供应严重不足"
                    } else if (legendItem.label == "较干旱") {
                        legendItemDiv.title = "较干旱意味着土壤水分较少，但仍能支持某些作物的生长"
                    } else if (legendItem.label == "适中") {
                        legendItemDiv.title = "适中表示土壤水分适宜大多数作物的正常生长"
                    } else if (legendItem.label == "较湿润") {
                        legendItemDiv.title = "较湿润则表示土壤水分充足，适合多数作物的生长"
                    } else if (legendItem.label == "湿润") {
                        legendItemDiv.title = "湿润表示土壤水分丰富，可能接近饱和，适合作物生长"
                    }
                    // 将div元素添加到容器中
                    legendContainer.appendChild(legendItemDiv);
                });
                // 将容器添加到body中
                document.body.appendChild(legendContainer);
            }
        });

    } else if ($("#yagaoSel").val().includes("旱地")) {
        if (data.result[num].name.includes("第一期")) {
            if (!$('#deqsqgd').is(':checked')) {
                $('#deqsqgd').click();
            }
        } else if (data.result[num].name.includes("第二期")) {
            if (!$('#deqsqhd').is(':checked')) {
                $('#deqsqhd').click();
            }
        } else if (data.result[num].name.includes("第三期")) {
            if (!$('#dqsqhd').is(':checked')) {
                $('#dsqsqhd').click();
            }
        }

        $("#ygfxbtDiv").html(`
            <div style="margin-top: 2%;text-align: center;float: left;width: 20%;height: 97%;">
                序号
            </div>
            <div style="margin-top: 2%;text-align: center;float: left;width: 30%;height: 97%;">
                类型
            </div>
            <div style="margin-top: 2%;text-align: center;float: left;width: 25%;height: 97%;">
                面积(亩)
            </div>
            <div style="margin-top: 2%;text-align: center;float: left;width: 25%;height: 97%;">
                占比
            </div>
        `)
        //面积
        getUrlData(data.result[num].area, function (data, error) {
            if (data) {
                var lx = [];
                var mj = [];
                var zb = [];
                $("#ygfxDiv").html("")
                for (var a = 0; a < data.result.table_data.length; a++) {
                    lx.push(getLx(data.result.table_data[a].Value));
                    mj.push(data.result.table_data[a]['亩']);
                    zb.push(data.result.table_data[a].PR);
                    $("#ygfxDiv").append('              <div style="width: 100%;height: 12.5%;">' +
                        '                                    <div style="margin-top: ' + ygfxData[a].MT + '%;text-align: center;float: left;width: 20%;height: 97%;">' +
                        (a + 1) +
                        '                                    </div>' +
                        '                                    <div style="margin-top: ' + ygfxData[a].MT + '%;text-align: center;float: left;width: 30%;height: 97%;">' +
                        getLx(data.result.table_data[a].Value) +
                        '                                    </div>' +
                        '                                    <div style="margin-top: ' + ygfxData[a].MT + '%;text-align: center;float: left;width: 25%;height: 97%;">' +
                        data.result.table_data[a]['亩'] +
                        '                                    </div>' +
                        '                                    <div style="margin-top: ' + ygfxData[a].MT + '%;text-align: center;float: left;width: 25%;height: 97%;">' +
                        data.result.table_data[a].PR +
                        '                                    </div>' +
                        '                                </div>')
                }


                var option = {
                    backgroundColor: "rgba(17,131,220,0.25)",
                    color: ["#ab7329", "#ddbf44", "#f3f3f3", "#7fccbf", "#057c97",],
                    grid: {
                        left: -100,
                        top: 50,
                        bottom: 10,
                        right: 10,
                        containLabel: true
                    },
                    tooltip: {
                        trigger: 'item',
                        formatter: "{b} : {c} ({d}%)"
                    },
                    legend: {
                        type: "scroll",
                        orient: "vartical",
                        top: "center",
                        right: "15",
                        // bottom: "0%",
                        itemWidth: 16,
                        itemHeight: 8,
                        itemGap: 16,
                        textStyle: {
                            color: '#A3E2F4',
                            fontSize: 12,
                            fontWeight: 0
                        },
                        data: lx
                    },
                    polar: {},
                    angleAxis: {
                        interval: 1,
                        type: 'category',
                        data: [],
                        z: 10,
                        axisLine: {
                            show: false,
                            lineStyle: {
                                color: "#0B4A6B",
                                width: 1,
                                type: "solid"
                            },
                        },
                        axisLabel: {
                            interval: 0,
                            show: true,
                            color: "#0B4A6B",
                            margin: 8,
                            fontSize: 16
                        },
                    },
                    radiusAxis: {
                        min: 40,
                        max: 120,
                        interval: 20,
                        axisLine: {
                            show: false,
                            lineStyle: {
                                color: "#0B3E5E",
                                width: 1,
                                type: "solid"
                            },
                        },
                        axisLabel: {
                            formatter: '{value} %',
                            show: false,
                            padding: [0, 0, 20, 0],
                            color: "#0B3E5E",
                            fontSize: 16
                        },
                        splitLine: {
                            lineStyle: {
                                color: "#0B3E5E",
                                width: 2,
                                type: "solid"
                            }
                        }
                    },
                    calculable: true,
                    series: [{
                        type: 'pie',
                        radius: ["5%", "10%"],
                        hoverAnimation: false,
                        labelLine: {
                            normal: {
                                show: false,
                                length: 10,
                                length2: 20
                            },
                            emphasis: {
                                show: false
                            }
                        },
                        data: [{
                            name: '',
                            value: 0,
                            itemStyle: {
                                normal: {
                                    color: "#0B4A6B"
                                }
                            }
                        }]
                    }, {
                        type: 'pie',
                        radius: ["90%", "95%"],
                        hoverAnimation: false,
                        labelLine: {
                            normal: {
                                show: false,
                                length: 10,
                                length2: 20
                            },
                            emphasis: {
                                show: false
                            }
                        },
                        name: "",
                        data: [{
                            name: '',
                            value: 0,
                            itemStyle: {
                                normal: {
                                    color: "#0B4A6B"
                                }
                            }
                        }]
                    }, {
                        stack: 'a',
                        type: 'pie',
                        radius: ['20%', '80%'],
                        roseType: 'area',
                        zlevel: 10,
                        label: {
                            normal: {
                                show: true,
                                formatter: "{c}",
                                textStyle: {
                                    fontSize: 12,
                                },
                                position: 'outside'
                            },
                            emphasis: {
                                show: true
                            }
                        },
                        labelLine: {
                            normal: {
                                show: true,
                                length: 10,
                                length2: 20
                            },
                            emphasis: {
                                show: false
                            }
                        },
                        data: [
                            {
                                value: zb[0].replace('%', ''),
                                name: lx[0]
                            },
                            {
                                value: zb[1].replace('%', ''),
                                name: lx[1]
                            },
                            {
                                value: zb[2].replace('%', ''),
                                name: lx[2]
                            },
                            {
                                value: zb[3].replace('%', ''),
                                name: lx[3]
                            },
                            {
                                value: zb[4].replace('%', ''),
                                name: lx[4]
                            }
                        ]
                    },]
                }

                ygfxbiaoge = echarts.init(document.getElementById('ygfxBiao'));
                ygfxbiaoge.setOption(option);

            }
        });

        //图例
        getUrlData(data.result[num].legeng, function (data, error) {
            if (data) {
                var existingLegendContainer = document.getElementById('legendContainer');
                if (existingLegendContainer) {
                    existingLegendContainer.parentNode.removeChild(existingLegendContainer);
                }
                // 创建一个容器用于放置图例
                var legendContainer = document.createElement('div');
                legendContainer.id = 'legendContainer';
                if (sc) {
                    legendContainer.style.display = 'none';
                } else {
                    legendContainer.style.display = 'block';
                }

                legendContainer.style.position = 'absolute'; // 使容器浮动
                legendContainer.style.zIndex = '100';
                legendContainer.style.bottom = '23px'; // 容器顶部距离视口顶部的距离
                legendContainer.style.right = '77px'; // 容器右侧距离视口右侧的距离
                legendContainer.style.padding = '5px';
                legendContainer.style.backgroundColor = 'rgba(58,58,58,0.61)'; // 容器背景色和透明度
                legendContainer.style.borderRadius = '5px'; // 容器边框圆角
                legendContainer.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)'; // 容器阴影

                // 遍历图例数组，为每个图例项创建一个div元素
                data.result.legend.forEach(function (legendItem) {
                    var legendItemDiv = document.createElement('div');
                    legendItemDiv.style.display = 'inline-block'; // 使div元素内联块级显示
                    legendItemDiv.style.padding = '3px 8px';
                    legendItemDiv.style.backgroundColor = legendItem.color; // 设置背景色为图例颜色
                    legendItemDiv.style.color = '#000000'; // 设置文字颜色为白色
                    legendItemDiv.style.borderRadius = '3px'; // 设置边框圆角
                    legendItemDiv.style.marginRight = '5px'; // 设置右边距
                    legendItemDiv.textContent = legendItem.label; // 设置文本内容为图例标签

                    if (legendItem.label == "干旱") {
                        legendItemDiv.title = "干旱表示土壤水分极度匮乏，适合作物生长的水分供应严重不足"
                    } else if (legendItem.label == "较干旱") {
                        legendItemDiv.title = "较干旱意味着土壤水分较少，但仍能支持某些作物的生长"
                    } else if (legendItem.label == "适中") {
                        legendItemDiv.title = "适中表示土壤水分适宜大多数作物的正常生长"
                    } else if (legendItem.label == "较湿润") {
                        legendItemDiv.title = "较湿润则表示土壤水分充足，适合多数作物的生长"
                    } else if (legendItem.label == "湿润") {
                        legendItemDiv.title = "湿润表示土壤水分丰富，可能接近饱和，适合作物生长"
                    }

                    // 将div元素添加到容器中
                    legendContainer.appendChild(legendItemDiv);
                });
                // 将容器添加到body中
                document.body.appendChild(legendContainer);
            }
        });
    } else if ($("#yagaoSel").val().includes("作物")) {

        // alert(data.result[num].name)
        if (data.result[num].name.includes("第一年_上半年")) {
            if (!$('#dyqsbnzw').is(':checked')) {
                $('#dyqsbnzw').click();
            }


        } else if (data.result[num].name.includes("第一年_下半年")) {
            if (!$('#dyqxbnzw').is(':checked')) {
                $('#dyqxbnzw').click();
            }


        }

        $("#ygfxbtDiv").html(`
                <div style="margin-top: 2%;text-align: center;float: left;width: 20%;height: 97%;">
                    序号
                </div>
                <div style="margin-top: 2%;text-align: center;float: left;width: 30%;height: 97%;">
                    类型
                </div>
                <div style="margin-top: 2%;text-align: center;float: left;width: 45%;height: 97%;">
                    面积(亩)
                </div>
            `)

        //面积
        getUrlData(data.result[num].area, function (data, error) {
            if (data) {


                var lx = [];
                var mj = [];
                var zmj = 0
                var zb = [];
                var color = []
                $("#ygfxDiv").html("")
                for (var a = 0; a < data.result.length; a++) {
                    lx.push(data.result[a]['crop type']);
                    mj.push(data.result[a]['area'].replace("亩", ''));
                    zmj += Number(data.result[a]['area'].replace("亩", ''))
                    if (data.result[a]['color']) {
                        color.push(data.result[a]['color'])
                    }
                    if (data.result[a]['types']) {
                        color.push(data.result[a]['types'])
                    }
                    $("#ygfxDiv").append('              <div style="width: 100%;height: 12.5%;">' +
                        '                                    <div style="margin-top: ' + ygfxData[a].MT + '%;text-align: center;float: left;width: 20%;height: 97%;">' +
                        (a + 1) +
                        '                                    </div>' +
                        '                                    <div style="margin-top: ' + ygfxData[a].MT + '%;text-align: center;float: left;width: 30%;height: 97%;">' +
                        data.result[a]['crop type'] +
                        '                                    </div>' +
                        '                                    <div style="margin-top: ' + ygfxData[a].MT + '%;text-align: center;float: left;width: 45%;height: 97%;">' +
                        data.result[a]['area'].replace("亩", '') +
                        '                                    </div>' +
                        '                                </div>')
                }
                for (var a = 0; a < data.result.length; a++) {
                    zb.push(Number(data.result[a]['area'].replace("亩", '')) / zmj + "%");
                }


                var option = {
                    backgroundColor: "rgba(17,131,220,0.25)",
                    color: color,
                    grid: {
                        left: 150,
                        top: 50,
                        bottom: 50,
                        right: 50,
                        containLabel: true
                    },
                    tooltip: {
                        trigger: 'item',
                        formatter: "{b} : {c} ({d}%)"
                    },
                    legend: {
                        type: "scroll",
                        orient: "vartical",
                        top: "center",
                        right: "15",
                        // bottom: "0%",
                        itemWidth: 16,
                        itemHeight: 8,
                        itemGap: 16,
                        textStyle: {
                            color: '#A3E2F4',
                            fontSize: 12,
                            fontWeight: 0
                        },
                        data: lx
                    },
                    polar: {},
                    angleAxis: {
                        interval: 1,
                        type: 'category',
                        data: [],
                        z: 10,
                        axisLine: {
                            show: false,
                            lineStyle: {
                                color: "#0B4A6B",
                                width: 1,
                                type: "solid"
                            },
                        },
                        axisLabel: {
                            interval: 0,
                            show: true,
                            color: "#0B4A6B",
                            margin: 8,
                            fontSize: 16
                        },
                    },
                    radiusAxis: {
                        min: 40,
                        max: 120,
                        interval: 20,
                        axisLine: {
                            show: false,
                            lineStyle: {
                                color: "#0B3E5E",
                                width: 1,
                                type: "solid"
                            },
                        },
                        axisLabel: {
                            formatter: '{value} %',
                            show: false,
                            padding: [0, 0, 20, 0],
                            color: "#0B3E5E",
                            fontSize: 16
                        },
                        splitLine: {
                            lineStyle: {
                                color: "#0B3E5E",
                                width: 2,
                                type: "solid"
                            }
                        }
                    },
                    calculable: true,
                    series: [{
                        type: 'pie',
                        radius: ["5%", "10%"],
                        hoverAnimation: false,
                        labelLine: {
                            normal: {
                                show: false,
                                length: 10,
                                length2: 20
                            },
                            emphasis: {
                                show: false
                            }
                        },
                        data: [{
                            name: '',
                            value: 0,
                            itemStyle: {
                                normal: {
                                    color: "#0B4A6B"
                                }
                            }
                        }]
                    }, {
                        type: 'pie',
                        radius: ["80%", "85%"],
                        hoverAnimation: false,
                        labelLine: {
                            normal: {
                                show: false,
                                length: 10,
                                length2: 20
                            },
                            emphasis: {
                                show: false
                            }
                        },
                        name: "",
                        data: [{
                            name: '',
                            value: 0,
                            itemStyle: {
                                normal: {
                                    color: "#0B4A6B"
                                }
                            }
                        }]
                    }, {
                        stack: 'a',
                        type: 'pie',
                        radius: ['10%', '70%'],
                        roseType: 'area',
                        zlevel: 10,
                        label: {
                            normal: {
                                show: true,
                                formatter: "{c}",
                                textStyle: {
                                    fontSize: 12,
                                },
                                position: 'outside'
                            },
                            emphasis: {
                                show: true
                            }
                        },
                        labelLine: {
                            normal: {
                                show: true,
                                length: 5,
                                length2: 5
                            },
                            emphasis: {
                                show: false
                            }
                        },
                        data: [
                            {
                                value: mj[0],
                                name: lx[0]
                            },
                            {
                                value: mj[1],
                                name: lx[1]
                            },

                        ]
                    },]
                }

                ygfxbiaoge = echarts.init(document.getElementById('ygfxBiao'));
                ygfxbiaoge.setOption(option);

            }
        });

        //图例
        getUrlData(data.result[num].legeng, function (data, error) {
            if (data) {
                var existingLegendContainer = document.getElementById('legendContainer');
                if (existingLegendContainer) {
                    existingLegendContainer.parentNode.removeChild(existingLegendContainer);
                }
                // 创建一个容器用于放置图例
                var legendContainer = document.createElement('div');
                legendContainer.id = 'legendContainer';
                legendContainer.style.position = 'absolute'; // 使容器浮动
                legendContainer.style.zIndex = '100';
                legendContainer.style.bottom = '23px'; // 容器顶部距离视口顶部的距离
                legendContainer.style.right = '77px'; // 容器右侧距离视口右侧的距离
                legendContainer.style.padding = '5px';
                legendContainer.style.backgroundColor = 'rgba(58,58,58,0.61)'; // 容器背景色和透明度
                legendContainer.style.borderRadius = '5px'; // 容器边框圆角
                legendContainer.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)'; // 容器阴影
                if (sc) {
                    legendContainer.style.display = 'none';
                } else {
                    legendContainer.style.display = 'block';
                }
                // 遍历图例数组，为每个图例项创建一个div元素
                data.result.legend.forEach(function (legendItem) {
                    var legendItemDiv = document.createElement('div');
                    legendItemDiv.style.display = 'inline-block'; // 使div元素内联块级显示
                    legendItemDiv.style.padding = '3px 8px';
                    legendItemDiv.style.backgroundColor = legendItem.color; // 设置背景色为图例颜色
                    legendItemDiv.style.color = '#000000'; // 设置文字颜色为白色
                    legendItemDiv.style.borderRadius = '3px'; // 设置边框圆角
                    legendItemDiv.style.marginRight = '5px'; // 设置右边距
                    legendItemDiv.textContent = legendItem.label; // 设置文本内容为图例标签

                    // 将div元素添加到容器中
                    legendContainer.appendChild(legendItemDiv);
                });
                // 将容器添加到body中
                document.body.appendChild(legendContainer);
            }
        });
    } else if ($("#yagaoSel").val().includes("面积监测")) {

        if (data.result[num].name.includes("第一期")) {

            if (!$('#dyqggmj').is(':checked')) {
                $('#dyqggmj').click();
            }

        }

        $("#ygfxbtDiv").html(`
                <div style="margin-top: 2%;text-align: center;float: left;width: 20%;height: 97%;">
                    序号
                </div>
                <div style="margin-top: 2%;text-align: center;float: left;width: 30%;height: 97%;">
                    类型
                </div>
                <div style="margin-top: 2%;text-align: center;float: left;width: 45%;height: 97%;">
                    面积(亩)
                </div>
            `)

        console.log(data.result[num].area)


        //图例
        getUrlData(data.result[num].legeng, function (data1, error) {
            if (data1) {
                var existingLegendContainer = document.getElementById('legendContainer');
                if (existingLegendContainer) {
                    existingLegendContainer.parentNode.removeChild(existingLegendContainer);
                }
                // 创建一个容器用于放置图例
                var legendContainer = document.createElement('div');
                legendContainer.id = 'legendContainer';
                legendContainer.style.position = 'absolute'; // 使容器浮动
                legendContainer.style.zIndex = '100';
                legendContainer.style.bottom = '23px'; // 容器顶部距离视口顶部的距离
                legendContainer.style.right = '77px'; // 容器右侧距离视口右侧的距离
                legendContainer.style.padding = '5px';
                legendContainer.style.backgroundColor = 'rgba(58,58,58,0.61)'; // 容器背景色和透明度
                legendContainer.style.borderRadius = '5px'; // 容器边框圆角
                legendContainer.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)'; // 容器阴影
                if (sc) {
                    legendContainer.style.display = 'none';
                } else {
                    legendContainer.style.display = 'block';
                }


                // 遍历图例数组，为每个图例项创建一个div元素
                data1.result.legend.forEach(function (legendItem) {
                    var legendItemDiv = document.createElement('div');
                    legendItemDiv.style.display = 'inline-block'; // 使div元素内联块级显示
                    legendItemDiv.style.padding = '3px 8px';
                    legendItemDiv.style.backgroundColor = legendItem.color; // 设置背景色为图例颜色
                    legendItemDiv.style.color = '#000000'; // 设置文字颜色为白色
                    legendItemDiv.style.borderRadius = '3px'; // 设置边框圆角
                    legendItemDiv.style.marginRight = '5px'; // 设置右边距
                    legendItemDiv.textContent = legendItem.label; // 设置文本内容为图例标签

                    // 将div元素添加到容器中
                    legendContainer.appendChild(legendItemDiv);
                });
                // 将容器添加到body中
                document.body.appendChild(legendContainer);

                var ssss = data1

                function getV(v) {
                    for (var a = 0; a < ssss.result.legend.length; a++) {
                        if (ssss.result.legend[a].id == v) {
                            return ssss.result.legend[a].label;
                        }
                    }
                }

                //面积
                getUrlData(data.result[num].area, function (data2, error) {

                    if (data2) {

                        var lx = [];
                        var mj = [];
                        var zmj = 0
                        var zb = [];
                        var color = []
                        $("#ygfxDiv").html("")
                        for (var a = 0; a < data2.table_data.length; a++) {
                            lx.push(getV(data2.table_data[a]['Value']));
                            mj.push(parseFloat(data2.table_data[a]['亩']));
                            zmj += Number(data2.table_data[a]['亩'])
                            if (data2.table_data[a]['color']) {
                                color.push(data2.table_data[a]['color'])
                            }
                            $("#ygfxDiv").append('              <div style="width: 100%;height: 12.5%;">' +
                                '                                    <div style="margin-top: ' + ygfxData[a].MT + '%;text-align: center;float: left;width: 20%;height: 97%;">' +
                                (a + 1) +
                                '                                    </div>' +
                                '                                    <div style="margin-top: ' + ygfxData[a].MT + '%;text-align: center;float: left;width: 30%;height: 97%;">' +
                                getV(data2.table_data[a]['Value']) +
                                '                                    </div>' +
                                '                                    <div style="margin-top: ' + ygfxData[a].MT + '%;text-align: center;float: left;width: 45%;height: 97%;">' +
                                data2.table_data[a]['亩'] +
                                '                                    </div>' +
                                '                                </div>')
                        }
                        for (var a = 0; a < data2.table_data.length; a++) {
                            zb.push(Number(data2.table_data[a]['亩']) / zmj * 100 + "%");
                        }

                        var option = {
                            "title": {
                                "text": lx[0] + mj[0] + '亩',
                                "top": '85%',
                                "left": '12%',
                                "textStyle": {
                                    "fontSize": 28,
                                    "fontWeight": "bold",
                                    "color": "#bcbfff"
                                }
                            },
                            "tooltip": {
                                "trigger": 'item',
                                "formatter": "{a} : ({d}%)"
                            },
                            "series": [{
                                "name": lx[0],
                                "center": [
                                    "50%",
                                    "50%"
                                ],
                                "radius": [
                                    "49%",
                                    "50%"
                                ],
                                "clockWise": false,
                                "hoverAnimation": false,
                                "type": "pie",
                                "data": [{
                                    "value": mj[0],
                                    "name": "",
                                    "label": {
                                        "normal": {
                                            "show": true,
                                            "formatter": '{d} %',
                                            "textStyle": {
                                                "fontSize": 28,
                                                "fontWeight": "bold"
                                            },
                                            "position": "center"
                                        }
                                    },
                                    "labelLine": {
                                        "show": false
                                    },
                                    "itemStyle": {
                                        "normal": {
                                            "color": "#5886f0",
                                            "borderColor": new echarts.graphic.LinearGradient(0, 0, 0, 1, [{
                                                offset: 0,
                                                color: '#00a2ff'
                                            }, {
                                                offset: 1,
                                                color: '#70ffac'
                                            }]),
                                            "borderWidth": 25
                                        },
                                        "emphasis": {
                                            "color": "#5886f0",
                                            "borderColor": new echarts.graphic.LinearGradient(0, 0, 0, 1, [{
                                                offset: 0,
                                                color: '#85b6b2'
                                            }, {
                                                offset: 1,
                                                color: '#6d4f8d'
                                            }]),
                                            "borderWidth": 25
                                        }
                                    },
                                }, {
                                    "name": " ",
                                    "value": 0,
                                    "itemStyle": {
                                        "normal": {
                                            "label": {
                                                "show": false
                                            },
                                            "labelLine": {
                                                "show": false
                                            },
                                            "color": 'rgba(0,0,0,0)',
                                            "borderColor": 'rgba(0,0,0,0)',
                                            "borderWidth": 0
                                        },
                                        "emphasis": {
                                            "color": 'rgba(0,0,0,0)',
                                            "borderColor": 'rgba(0,0,0,0)',
                                            "borderWidth": 0
                                        }
                                    }
                                }]
                            }, {
                                "name": lx[0],
                                "center": [
                                    "50%",
                                    "50%"
                                ],
                                "radius": [
                                    "59%",
                                    "60%"
                                ],
                                "clockWise": false,
                                "hoverAnimation": false,
                                "type": "pie",
                                "data": [{
                                    "value": mj[0],
                                    "name": "",
                                    "label": {
                                        "normal": {
                                            "show": true,
                                            "formatter": '{d} %',
                                            "textStyle": {
                                                "fontSize": 28,
                                                "fontWeight": "bold"
                                            },
                                            "position": "center"
                                        }
                                    },
                                    "labelLine": {
                                        "show": false
                                    },
                                    "itemStyle": {
                                        "normal": {
                                            "color": "#5886f0",
                                            "borderColor": new echarts.graphic.LinearGradient(0, 0, 0, 1, [{
                                                offset: 0,
                                                color: '#00a2ff'
                                            }, {
                                                offset: 1,
                                                color: '#70ffac'
                                            }]),
                                            "borderWidth": 1
                                        },
                                        "emphasis": {
                                            "color": "#5886f0",
                                            "borderColor": new echarts.graphic.LinearGradient(0, 0, 0, 1, [{
                                                offset: 0,
                                                color: '#85b6b2'
                                            }, {
                                                offset: 1,
                                                color: '#6d4f8d'
                                            }]),
                                            "borderWidth": 1
                                        }
                                    },
                                }, {
                                    "name": " ",
                                    "value": 0,
                                    "itemStyle": {
                                        "normal": {
                                            "label": {
                                                "show": false
                                            },
                                            "labelLine": {
                                                "show": false
                                            },
                                            "color": 'rgba(0,0,0,0)',
                                            "borderColor": 'rgba(0,0,0,0)',
                                            "borderWidth": 0
                                        },
                                        "emphasis": {
                                            "color": 'rgba(0,0,0,0)',
                                            "borderColor": 'rgba(0,0,0,0)',
                                            "borderWidth": 0
                                        }
                                    }
                                }]
                            }]
                        };

                        ygfxbiaoge = echarts.init(document.getElementById('ygfxBiao'));
                        ygfxbiaoge.setOption(option);

                    } else {
                        var data2 = {
                            "table_data": [
                                {
                                    "OID": 0,
                                    "Value": 1,
                                    "亩": 246510
                                }
                            ]
                        }

                        var lx = [];
                        var mj = [];
                        var zmj = 0
                        var zb = [];
                        var color = []
                        $("#ygfxDiv").html("")
                        for (var a = 0; a < data2.table_data.length; a++) {
                            lx.push(getV(data2.table_data[a]['Value']));
                            mj.push(parseFloat(data2.table_data[a]['亩']));
                            zmj += Number(data2.table_data[a]['亩'])
                            if (data2.table_data[a]['color']) {
                                color.push(data2.table_data[a]['color'])
                            }
                            $("#ygfxDiv").append('              <div style="width: 100%;height: 12.5%;">' +
                                '                                    <div style="margin-top: ' + ygfxData[a].MT + '%;text-align: center;float: left;width: 20%;height: 97%;">' +
                                (a + 1) +
                                '                                    </div>' +
                                '                                    <div style="margin-top: ' + ygfxData[a].MT + '%;text-align: center;float: left;width: 30%;height: 97%;">' +
                                getV(data2.table_data[a]['Value']) +
                                '                                    </div>' +
                                '                                    <div style="margin-top: ' + ygfxData[a].MT + '%;text-align: center;float: left;width: 45%;height: 97%;">' +
                                data2.table_data[a]['亩'] +
                                '                                    </div>' +
                                '                                </div>')
                        }
                        for (var a = 0; a < data2.table_data.length; a++) {
                            zb.push(Number(data2.table_data[a]['亩']) / zmj * 100 + "%");
                        }

                        var option = {
                            "title": {
                                "text": lx[0] + mj[0] + '亩',
                                "top": '85%',
                                "left": '12%',
                                "textStyle": {
                                    "fontSize": 28,
                                    "fontWeight": "bold",
                                    "color": "#bcbfff"
                                }
                            },
                            "tooltip": {
                                "trigger": 'item',
                                "formatter": "{a} : ({d}%)"
                            },
                            "series": [{
                                "name": lx[0],
                                "center": [
                                    "50%",
                                    "50%"
                                ],
                                "radius": [
                                    "49%",
                                    "50%"
                                ],
                                "clockWise": false,
                                "hoverAnimation": false,
                                "type": "pie",
                                "data": [{
                                    "value": mj[0],
                                    "name": "",
                                    "label": {
                                        "normal": {
                                            "show": true,
                                            "formatter": '{d} %',
                                            "textStyle": {
                                                "fontSize": 28,
                                                "fontWeight": "bold"
                                            },
                                            "position": "center"
                                        }
                                    },
                                    "labelLine": {
                                        "show": false
                                    },
                                    "itemStyle": {
                                        "normal": {
                                            "color": "#5886f0",
                                            "borderColor": new echarts.graphic.LinearGradient(0, 0, 0, 1, [{
                                                offset: 0,
                                                color: '#00a2ff'
                                            }, {
                                                offset: 1,
                                                color: '#70ffac'
                                            }]),
                                            "borderWidth": 25
                                        },
                                        "emphasis": {
                                            "color": "#5886f0",
                                            "borderColor": new echarts.graphic.LinearGradient(0, 0, 0, 1, [{
                                                offset: 0,
                                                color: '#85b6b2'
                                            }, {
                                                offset: 1,
                                                color: '#6d4f8d'
                                            }]),
                                            "borderWidth": 25
                                        }
                                    },
                                }, {
                                    "name": " ",
                                    "value": 0,
                                    "itemStyle": {
                                        "normal": {
                                            "label": {
                                                "show": false
                                            },
                                            "labelLine": {
                                                "show": false
                                            },
                                            "color": 'rgba(0,0,0,0)',
                                            "borderColor": 'rgba(0,0,0,0)',
                                            "borderWidth": 0
                                        },
                                        "emphasis": {
                                            "color": 'rgba(0,0,0,0)',
                                            "borderColor": 'rgba(0,0,0,0)',
                                            "borderWidth": 0
                                        }
                                    }
                                }]
                            }, {
                                "name": lx[0],
                                "center": [
                                    "50%",
                                    "50%"
                                ],
                                "radius": [
                                    "59%",
                                    "60%"
                                ],
                                "clockWise": false,
                                "hoverAnimation": false,
                                "type": "pie",
                                "data": [{
                                    "value": mj[0],
                                    "name": "",
                                    "label": {
                                        "normal": {
                                            "show": true,
                                            "formatter": '{d} %',
                                            "textStyle": {
                                                "fontSize": 28,
                                                "fontWeight": "bold"
                                            },
                                            "position": "center"
                                        }
                                    },
                                    "labelLine": {
                                        "show": false
                                    },
                                    "itemStyle": {
                                        "normal": {
                                            "color": "#5886f0",
                                            "borderColor": new echarts.graphic.LinearGradient(0, 0, 0, 1, [{
                                                offset: 0,
                                                color: '#00a2ff'
                                            }, {
                                                offset: 1,
                                                color: '#70ffac'
                                            }]),
                                            "borderWidth": 1
                                        },
                                        "emphasis": {
                                            "color": "#5886f0",
                                            "borderColor": new echarts.graphic.LinearGradient(0, 0, 0, 1, [{
                                                offset: 0,
                                                color: '#85b6b2'
                                            }, {
                                                offset: 1,
                                                color: '#6d4f8d'
                                            }]),
                                            "borderWidth": 1
                                        }
                                    },
                                }, {
                                    "name": " ",
                                    "value": 0,
                                    "itemStyle": {
                                        "normal": {
                                            "label": {
                                                "show": false
                                            },
                                            "labelLine": {
                                                "show": false
                                            },
                                            "color": 'rgba(0,0,0,0)',
                                            "borderColor": 'rgba(0,0,0,0)',
                                            "borderWidth": 0
                                        },
                                        "emphasis": {
                                            "color": 'rgba(0,0,0,0)',
                                            "borderColor": 'rgba(0,0,0,0)',
                                            "borderWidth": 0
                                        }
                                    }
                                }]
                            }]
                        };

                        ygfxbiaoge = echarts.init(document.getElementById('ygfxBiao'));
                        ygfxbiaoge.setOption(option);
                    }
                });

            }
        });
    }

}


function utmZone50NToLatLonWGS84(easting, northing) {
    // WGS84 Ellipsoid Parameters
    const a = 6378137.0; // Semi-major axis (meters)
    const f = 1 / 298.257223563; // Flattening
    const b = a * (1 - f); // Semi-minor axis (meters)
    const e2 = (a * a - b * b) / (a * a); // First eccentricity squared
    const n = (a - b) / (a + b); // Third flattening

    // UTM Zone 50N Parameters
    const zone = 50;
    const centralMeridian = (zone * 6) - 183; // Central meridian in degrees East (50 * 6 - 183 = 117 E)
    const scaleFactor = 0.9996; // Scale factor on the central meridian
    const falseEasting = 500000.0; // False Easting (meters)
    const falseNorthing = 0.0; // False Northing for Northern Hemisphere (meters)

    // Adjust coordinates by false easting/northing
    const x = easting - falseEasting;
    const y = northing - falseNorthing;

    // Inverse UTM calculation (Simplified Krüger series or similar approach)
    // This part is complex and involves approximations/series expansions.
    // The following is a common form of the inverse calculation.

    const m = y / scaleFactor; // Adjusted Northing to approximate meridional arc distance
    const mu = m / (a * (1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 * e2 * e2 / 256)); // Footpoint latitude approximation

    // Iteratively calculate latitude (or use series expansion)
    // Using iterative method for simplicity in demonstration
    let phi1_rad = mu; // Initial guess for footpoint latitude
    for (let i = 0; i < 5; i++) { // Iterate a few times for convergence
        const c1 = Math.cos(phi1_rad);
        const N1 = a / Math.sqrt(1 - e2 * Math.sin(phi1_rad) * Math.sin(phi1_rad));
        const T1 = Math.tan(phi1_rad) * Math.tan(phi1_rad);
        const C1 = e2 / (1 - e2) * c1 * c1;
        const D = m / (N1 * (1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 * e2 * e2 / 256)); // Re-calculate D based on better phi1
        // Calculate meridional arc distance for current latitude guess
        const M1 = a * ((1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 * e2 * e2 / 256) * phi1_rad
            - (3 * e2 / 8 + 3 * e2 * e2 / 32 + 45 * e2 * e2 * e2 / 1024) * Math.sin(2 * phi1_rad)
            + (15 * e2 * e2 / 256 + 45 * e2 * e2 * e2 / 1024) * Math.sin(4 * phi1_rad)
            - (35 * e2 * e2 * e2 / 3072) * Math.sin(6 * phi1_rad));

        const delta_phi1 = (m - M1) / N1;
        phi1_rad = phi1_rad + delta_phi1; // Update phi1_rad
        // Check for convergence if needed (e.g., if Math.abs(delta_phi1) < epsilon)
    }


    const cos_phi1 = Math.cos(phi1_rad);
    const sin_phi1 = Math.sin(phi1_rad);
    const tan_phi1 = Math.tan(phi1_rad);
    const N1 = a / Math.sqrt(1 - e2 * sin_phi1 * sin_phi1); // Radius of curvature in prime vertical
    const R1 = a * (1 - e2) / Math.pow(1 - e2 * sin_phi1 * sin_phi1, 1.5); // Meridian radius of curvature
    const T1 = tan_phi1 * tan_phi1; // tan(phi1)^2
    const C1 = e2 / (1 - e2) * cos_phi1 * cos_phi1; // C = e'^2 * cos(phi1)^2, where e'^2 is the second eccentricity squared

    const D = x / (N1 * scaleFactor); // D parameter

    // Calculate latitude and longitude using series expansion with D
    const lat_rad = phi1_rad - (N1 * tan_phi1 / R1) *
        (D * D / 2 -
            (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * e2) * Math.pow(D, 4) / 24 +
            (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * e2 - 3 * C1 * C1) * Math.pow(D, 6) / 720);

    const lon_rad = (D -
        (1 + 2 * T1 + C1) * Math.pow(D, 3) / 6 +
        (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * e2 + 24 * T1 * T1) * Math.pow(D, 5) / 120) / cos_phi1;

    // Convert radians to degrees
    const lat = lat_rad * 180 / Math.PI;
    const lon = (centralMeridian + lon_rad * 180 / Math.PI); // Add central meridian

    // Basic check for reasonable values (optional)
    if (isNaN(lat) || isNaN(lon)) {
        console.warn(`UTM to LatLon conversion resulted in NaN for input Easting=${easting}, Northing=${northing}`);
        return null; // Indicate conversion failure
    }


    // Return [longitude, latitude] (standard GeoJSON order)
    return [lon, lat];
}


/**
 * 将指定投影坐标系的嵌套数组结构转换为 WGS84 经纬度 (EPSG:4326) 的相应结构。
 * 这个版本**手动实现**了 EPSG:32650 到 EPSG:4326 的转换，不使用 proj4js。
 *
 * 输入和输出的数据结构格式如下：
 * [[[coord1, coord2], [coord1, coord2], ...], [[coord1, coord2], ...], ...]
 * 其中 [coord1, coord2] 是输入的源投影坐标对 (假设是 EPSG:32650)。
 * 输出坐标为 [经度, 纬度]。
 *
 * @param {Array<Array<Array<number>>>} projectedDataArray - 包含源投影坐标的嵌套数组 (假设是 EPSG:32650)。
 * @param {boolean} [isYXOrder=false] - 可选参数。如果为 true，表示输入的坐标对是 [y, x] 的顺序；如果为 false (默认)，表示输入的坐标对是 [x, y] 的顺序。
 * @returns {Array<Array<Array<number>>>} - 转换后的包含经纬度坐标的嵌套数组，每个坐标为 [经度, 纬度]。
 */
function convertProjectedDataToLatLonManual(projectedDataArray, isYXOrder = false) {

    // Initialize the result array structure
    const latLonData = [];

    // Basic validation for the main input
    if (!Array.isArray(projectedDataArray)) {
        console.error("Invalid input: Expected an array for projectedDataArray.");
        return latLonData; // Return empty array for invalid input
    }

    // Iterate through the outer array (e.g., representing multiple rings/lines)
    for (let i = 0; i < projectedDataArray.length; i++) {
        const part = projectedDataArray[i]; // This should be an array of coordinate pairs

        // Basic validation for the inner array
        if (!Array.isArray(part)) {
            console.warn(`Skipping invalid part at index ${i}: Expected an array of coordinate pairs.`);
            continue; // Skip this part if it's not an array
        }

        const latLonPart = []; // Array to store converted coordinates for the current part

        // Iterate through the coordinate pairs within the current part
        for (let j = 0; j < part.length; j++) {
            const projectedCoord = part[j]; // This should be a [coord1, coord2] pair

            // Basic validation for the coordinate pair
            if (!Array.isArray(projectedCoord) || projectedCoord.length !== 2 || typeof projectedCoord[0] !== 'number' || typeof projectedCoord[1] !== 'number') {
                console.warn(`Skipping invalid coordinate at index ${j} in part ${i}: Expected a pair of numbers [x, y] or [y, x]. Found:`, projectedCoord);
                continue; // Skip this coordinate if it's not a valid pair of numbers
            }

            let easting, northing; // Using easting/northing terms for UTM

            // Determine easting and northing based on the specified order
            // In EPSG:32650 (UTM), standard order is [Easting, Northing], i.e., [x, y]
            if (isYXOrder) {
                northing = projectedCoord[0]; // Assuming Y is Northing
                easting = projectedCoord[1]; // Assuming X is Easting
            } else { // Default is [x, y] order (Easting, Northing)
                easting = projectedCoord[0]; // Assuming X is Easting
                northing = projectedCoord[1]; // Assuming Y is Northing
            }

            // Call the manual conversion function
            const latLonCoord = utmZone50NToLatLonWGS84(easting, northing);

            // Add the converted coordinate if conversion was successful
            if (latLonCoord !== null) {
                latLonPart.push(latLonCoord);
            }
        }

        // Add the current part's Lat/Lon coordinate array to the final result array
        if (latLonPart.length > 0) { // Only add if the part had valid coordinates
            latLonData.push(latLonPart);
        }
    }

    // Return the complete converted data structure
    return latLonData;
}


//视频监控
function initSPJK() {

}

//专题图
function initZTT() {

    for (var a = 0; a < zttData.length; a++) {
        $("#divZTT").append('<div style="margin-top: 3%;width: 100%;height:30%;">' +
            '                                    <div style="border: #4c9ae1 1px solid;border-bottom:none;line-height: 200%;font-weight: bolder;background-color: #0E2D5F;width: 99.5%;height: 20%;text-align: center;font-size: 15px;">' +
            '                                        <div style="margin-top: 2%;height: 100%;width: 100%">' + zttData[a].mc + '</div>' +
            '                                    </div>' +
            '                                    <div style="width: 100%;height: 50%;font-size: 14px;">' +
            '                                        <div style="font-weight: bolder;text-align: center;font-size: 15px;float: left;width: 25%;height: 100%;border: #4c9ae1 1px solid">' +
            '                                            <div style="height: 100%;width: 100%;margin-top: 20%">主要<br>建设<br>内容</div>' +
            '                                        </div>' +
            '                                        <div style="display: flex;justify-content: center;align-items: center;float: left;width: 74.2%;height: 100%;border: #4c9ae1 1px solid;border-left:none">' +
            '                                            <div style="margin: 4%">' + zttData[a].nr + '</div>' +
            '                                        </div>' +
            '                                    </div>' +
            '                                    <div style="width: 100%;height: 30%;font-size: 14px">' +
            '                                        <div style="font-weight: bolder;text-align: center;font-size: 15px;float: left;width: 25%;height: 95%;border: #4c9ae1 1px solid;border-top:none;border-right: none ">' +
            '                                            <div style="margin-top: 8%;height: 100%;width: 100%">工程实际<br>完成投资</div>' +
            '                                        </div>' +
            '                                        <div style="text-align: center;float: left;width: 28%;height: 95%;border: #4c9ae1 1px solid;border-top:none;border-right: none">' +
            '                                            <div style="margin-top: 20%;height: 100%;width: 100%">' + zttData[a].tz + '</div>' +
            '                                        </div>' +
            '                                        <div style="font-weight: bolder;text-align: center;float: left;width: 20%;height: 95%;border: #4c9ae1 1px solid;border-top:none;border-right: none">' +
            '                                            <div style="margin-top: 20%;height: 100%;width: 100%">建设单位</div>' +
            '                                        </div>' +
            '                                        <div style="text-align: center;float: left;width: 25.7%;height: 95%;border: #4c9ae1 1px solid;border-top:none">' +
            '                                            <div style="margin-top: 8%;height: 100%;width: 100%">' + zttData[a].dw + '</div>' +
            '                                        </div>' +
            '                                    </div>' +
            '                                </div>')
    }


    $.getJSON("/develop/FormulaMap/json/专题图线.geojson", function (geojson) {
        for (var a = 0; a < geojson.features.length; a++) {
            var line = new maptalks.LineString(
                geojson.features[a].geometry.coordinates[0],
                {
                    symbol: lineSymbol[geojson.features[a].properties.color],
                }
            ).addTo(map.getLayer("zttLayer2"));
        }
        addZttText(
            [118.7375475, 24.90219293],
            "第九批项目终点1:南北东西主干道",
            [118.74093952, 24.90295046],
            0
        )
        addZttText(
            [118.66758051, 24.95907374],
            "第八批项目起点:洛阳江汇入口",
            [118.63300093, 24.9752022],
            0
        )
        addZttText(
            [118.67320071, 24.96089071],
            "第九批项目起点1:渠首闸",
            [118.68864919, 24.98883469],
            0
        )
        addZttText(
            [118.57145436, 24.92250126],
            "第六批项目终点:环城新闸",
            [118.58716777, 24.92003286],
            0
        )
        addZttText(
            [118.60017444, 24.92519451],
            "第八批项目起点:温陵北路与少林路",
            [118.616142, 24.93743142],
            0
        )
        addZttText(
            [118.56634265, 24.9437296],
            "第七批项目终点:西埔生产桥",
            [118.57213613, 24.95399836],
            0
        )
        addZttText(
            [118.56634265, 24.9437296],
            "第六批项目起点:西埔生产桥",
            [118.53882341, 24.92793782],
            0
        )
        addZttText(
            [118.51949804, 24.95059603],
            "第七批项目起点:0+225",
            [118.52807516, 24.96454851],
            0
        )
        addZttText(
            [118.51700219, 24.94580994],
            "第五批项目起点1∶金鸡水闸暗涵出口",
            [118.48208697, 24.95660598],
            0
        )
        addZttText(
            [118.55369255, 24.88285891],
            "第四批项目区起点:赤涂村",
            [118.58383966, 24.88721703],
            0
        )
        addZttText(
            [118.55369255, 24.88285891],
            "第五批项目区终点1:赤涂村",
            [118.5303638, 24.88073436],
            0
        )
        addZttText(
            [118.58905993, 24.84094878],
            "第九批项目起点2:南低1#水闸",
            [118.61478896, 24.85542125],
            0
        )
        addZttText(
            [118.5900311, 24.82839168],
            "第九批项目终点2:苏厝支流汇合口",
            [118.61698482, 24.82191663],
            0
        )
        addZttText(
            [118.54598055, 24.81555594],
            "第九批项目起点4:仕头干渠0+348",
            [118.57209939, 24.79432797],
            0
        )
        addZttText(
            [118.54750624, 24.81819011],
            "第九批项目起点3:仕头干渠0+000",
            [118.57611494, 24.81418917],
            0
        )
        addZttText(
            [118.54687546, 24.81684429],
            "第九批:泉州市山美灌区续建配套与节水改造工程(2013年度)主要建设内容整治渠道总长12.427km(包含惠东南干渠、南低干渠及仕头干渠)，清淤疏浚总长12.079km，其中惠东南干渠10.788km，南低干渠1.291km,仕头干渠0.348km;配套改造渠系建筑物15座，其中改造水闸14座，修复箱涵1座;清除整治渠道沿线排污口53处",
            [118.4865848, 24.81154875],
            1
        )
        addZttText(
            [118.56068025, 24.84320456],
            "第五批泉州市山美灌区节水改造工程(南高干渠渠首至赤涂村段)主要建设内容:改造渠道6993m(其中改线段1874m)清淤5119m，新建截污沟6546m,隔离网2898m，栏杆12174m新建水闸(涵)2座，倒虹吸2座渠系建筑物更新改造18座，配套设置量水及水质监测设施",
            [118.50096889, 24.84154654],
            1
        )
        addZttText(
            [118.54893432, 24.82124765],
            "仕头灌电站",
            [118.56421224, 24.82473052],
            3
        )
        addZttText(
            [118.55921055, 24.84102723],
            "第五批项目终点2:石狮取水口",
            [118.52501521, 24.83100049],
            0
        )
        addZttText(
            [118.56065886, 24.84766701],
            "第五批项目起点2:石狮水厂取水口",
            [118.53818112, 24.85256786],
            0
        )
        addZttText(
            [118.56065886, 24.84766701],
            "第三批项目终点:石狮水厂取水口",
            [118.57837931, 24.84714608],
            0
        )
        addZttText(
            [118.55921055, 24.84102723],
            "田洋节制闸",
            [118.56633314, 24.83571431],
            4
        )
        addZttText(
            [118.56186575, 24.85817382],
            "第三批:山美灌区2001年度节水改造(南高干渠)项目主要建设内容:改造渠道4668.694m(其中2002年1027.694m)清淤，新建截污沟，新建隔离网，拆除重建小桥3座,水闸整修2座新建节制闸1座",
            [118.50123044, 24.86867104],
            1
        )
        addZttText(
            [118.55053429, 24.89317467],
            "第四批:山美灌区2003年度节水改造工程(南高干渠)项目主要建设内容疏浚清淤3.578km,，防渗衬砌3.437km,设置隔离墙(网)8.706km，设置截污沟4.911km,渠系建筑物改造15座,新建洗衣渡头5座",
            [118.48719041, 24.89689049],
            1
        )
        addZttText(
            [118.51815851, 24.92518029],
            "第五批泉州市山美灌区节水改造工程(南高干渠渠首至赤涂村段)主要建设内容:改造渠道6993m(其中改线段1874m)清淤5119m，新建截污沟6546m,隔离网2898m,栏杆12174m新建水闸(涵)2座，倒虹吸2座，渠系建筑物更新改造18座，配套设置量水及水质监测设施",
            [118.47230429, 24.93508507],
            1
        )
        addZttText(
            [118.54750691, 24.95699684],
            "第七批:山美灌区续建配套与节水改造工程(北高干渠桩号0+225~6+258渠段)主要建设内容:整治渠道长6.258km，渠岸护砌9.682km水闸改造5座，改造桥梁12座，拆除生产桥1座，新建支渠暗涵1座,倒虹吸清淤7座,信息化建设1项。",
            [118.55405804, 24.99699334],
            1
        )
        addZttText(
            [118.59300581, 24.93744594],
            "第六批:山美灌区续建配套与节水改造(北高干渠桩号6+615~11+180渠段)主要建设内容:渠道清淤改造4.565km，水闸改造1座",
            [118.61836086, 24.95597834],
            1
        )
        addZttText(
            [118.64692349, 24.93325947],
            "第八批:山美灌区续建配套与节水改造(北高干渠桩号11+465~24+599渠段)主要建设内容:整治渠道11.59km，渠岸修复11.59km水闸改造3座改造桥梁12座，拆除生产桥3座,信息化建设1项。",
            [118.68156093, 24.90119969],
            1
        )
        addZttText(
            [118.70834538, 24.93474304],
            "第九批:泉州市山美灌区续建配套与节水改造工程(2013年度主要建设内容:整治渠道总长12.427km(包含惠东南干渠、南低干渠及仕头干渠),清淤疏浚总长12.079km,其中惠东南干渠10.788km，南低干渠1.291km,仕头干渠0.348km;配套改造渠系建筑物15座，其中改造水闸14座，修复箱涵1座;清除整治渠道沿线排污口53处。",
            [118.76087449, 24.95133693],
            1
        )
        addZttText(
            [118.59015722, 24.83357969],
            "第九批:泉州市山美灌区续建配套与节水改造工程(2013年度)主要建设内容:整治渠道总长12.427km(包含惠东南干渠、南低干渠及仕头干渠)，清淤疏浚总长12.079km,其中惠东南干渠10.788km，南低干渠1.291km,仕头干渠0.348km;配套改造渠系建筑物15座，其中改造水闸14座，修复箱涵1座;清除整治渠道沿线排污口53处。",
            [118.65380086, 24.8432761],
            1
        )
    });

}

function addZttText(p1, str, p2, type) {

    if (type == 0) {
        var src = new maptalks.Marker(p1, {
            zIndex: 100,
            symbol: {
                markerType: "ellipse",
                markerFill: "rgb(172,0,0)",
                markerFillOpacity: 0.8,
                markerLineColor: "#fff",
                markerLineWidth: 1,
                markerWidth: 10,
                markerHeight: 10,
            },
        });
        var dst = new maptalks.TextBox(
            str, // content
            p2, // coordinate
            240, // width
            28, // height
            {
                zIndex: 100,
                draggable: true,
                textStyle: {
                    wrap: true, // auto wrap text
                    verticalAlignment: "center",
                    horizontalAlignment: "center",
                    symbol: {
                        textFaceName: "monospace",
                        textFill: "#000000",
                        textSize: 12,
                    },
                },
                boxSymbol: {
                    // box's symbol
                    markerType: "square",
                    markerFill: "rgb(243,156,119)",
                    markerFillOpacity: 1,
                    markerLineColor: "#34495e",
                    markerLineWidth: 0,
                },
            }
        );
    } else if (type == 1) {
        var src = new maptalks.Marker(p1, {
            zIndex: 100,
            symbol: {
                markerType: "ellipse",
                markerFill: "rgb(172,0,0)",
                markerFillOpacity: 0.8,
                markerLineColor: "#fff",
                markerLineWidth: 1,
                markerWidth: 0,
                markerHeight: 0,
            },
        });
        var dst = new maptalks.TextBox(
            str, // content
            p2, // coordinate
            360, // width
            90, // height
            {
                zIndex: 100,
                draggable: true,
                textStyle: {
                    wrap: true, // auto wrap text
                    verticalAlignment: "center",
                    horizontalAlignment: "left",
                    symbol: {
                        textFaceName: "monospace",
                        textFill: "#ffffff",
                        textSize: 12,

                    },
                },
                boxSymbol: {
                    // box's symbol
                    markerType: "square",
                    markerFill: "rgb(168,63,0)",
                    markerFillOpacity: 1,
                    markerLineColor: "#34495e",
                    markerLineWidth: 0,
                },
            }
        );
    } else if (type == 3) {
        var src = new maptalks.Marker(p1, {
            zIndex: 100,
            symbol: {
                markerType: "ellipse",
                markerFill: "rgb(172,0,0)",
                markerFillOpacity: 0.8,
                markerLineColor: "#fff",
                markerLineWidth: 1,
                markerWidth: 10,
                markerHeight: 10,
            },
        });
        var dst = new maptalks.TextBox(
            str, // content
            p2, // coordinate
            80, // width
            28, // height
            {
                zIndex: 100,
                draggable: true,
                textStyle: {
                    wrap: true, // auto wrap text
                    verticalAlignment: "center",
                    horizontalAlignment: "center",
                    symbol: {
                        textFaceName: "monospace",
                        textFill: "#000000",
                        textSize: 12,
                    },
                },
                boxSymbol: {
                    // box's symbol
                    markerType: "square",
                    markerFill: "rgb(250,245,91)",
                    markerFillOpacity: 1,
                    markerLineColor: "#34495e",
                    markerLineWidth: 0,
                },
            }
        );
    } else if (type == 4) {
        var src = new maptalks.Marker(p1, {
            zIndex: 100,
            symbol: {
                markerType: "ellipse",
                markerFill: "rgb(172,0,0)",
                markerFillOpacity: 0.8,
                markerLineColor: "#fff",
                markerLineWidth: 1,
                markerWidth: 10,
                markerHeight: 10,
            },
        });
        var dst = new maptalks.TextBox(
            str, // content
            p2, // coordinate
            80, // width
            28, // height
            {
                zIndex: 100,
                draggable: true,
                textStyle: {
                    wrap: true, // auto wrap text
                    verticalAlignment: "center",
                    horizontalAlignment: "center",
                    symbol: {
                        textFaceName: "monospace",
                        textFill: "#000000",
                        textSize: 12,
                    },
                },
                boxSymbol: {
                    // box's symbol
                    markerType: "square",
                    markerFill: "rgb(64,139,203)",
                    markerFillOpacity: 1,
                    markerLineColor: "#34495e",
                    markerLineWidth: 0,
                },
            }
        );
    }


    var line = new maptalks.ConnectorLine(src, dst, {
        showOn: "always", //'moving', 'click', 'mouseover', 'always'
        zIndex: 90,
        arrowPlacement: "vertex-last", // 'vertex-last', //vertex-first, vertex-last, vertex-firstlast, point
        symbol: {
            lineColor: "#000000",
            lineWidth: 2,
        },
    });

    if (type != 1) {
        map.getLayer("zttLayer").addGeometry(src, dst, line);
    } else {
        map.getLayer("zttLayer1").addGeometry(src, dst, line);
    }

}


//详情窗口
function showWindowsMethod(attribute) {
    if (attribute.TYPE == "渠道") {
        attribute.DATA_TABLE_NAME = "EM_TD_CANAL"
        openpage1(attribute)
    } else {
        var el = document.getElementById("iframeWindow");
        if (el != null) {
            iframe = el.contentWindow;
            if (el) {
                el.src = 'about:blank';
                iframe.document.write('');
                iframe.document.clear();
            }
        }
        var divWindowTemp = $("<div style='overflow: hidden;'/>");
        divWindowTemp.attr("id", "divWindowTemp");
        $(document.body).append(divWindowTemp);
        attribute = JSON.stringify(attribute);
        var paths = "/07GISONeMap_LoadShowWindows?ATTRIBUTE=" + encodeURI(encodeURI(attribute));
        var inHtml = "<iframe id='iframeWindow' allowfullscreen='true' scrolling='no' marginheight='0' marginwidth='0' frameborder='0' src='" + paths + "' style='position:relative;width:100%;height:100%;'></iframe>"
        var attribute = JSON.parse(attribute);
        $('#divWindowTemp').window({
            closed: true,
            width: ($(window).width()) * 0.6,
            height: ($(window).height()) * 0.6,
            top: ($(window).height()) * 0.2,
            left: ($(window).width()) * 0.2,
            minimizable: false,
            maximizable: true,
            resizable: false,
            collapsible: false,
            shadow: false,
            openAnimation: 'slide',
            closeAnimation: 'slide',
            title: attribute.NAME,
            content: inHtml,
            onBeforeClose: function () {
                try {
                    soundSign = false;
                    HideSoundWindow();
                } catch (e) {
                }
                var el1 = document.getElementById("iframeWindow");
                if (el1 != null) {
                    iframe = el1.contentWindow;
                    var ifmObj = iframe.document.getElementsByTagName("iframe");
                    for (var i = ifmObj.length - 1; i >= 0; i--) {
                        try {
                            if (ifmObj[i].contentWindow.stopVideo) {
                                ifmObj[i].contentWindow.stopVideo();
                                ifmObj[i].contentWindow.logout();
                                $(ifmObj[i]).parent().remove();
                            }
                        } catch (err) {
                        }
                    }
                    if (el1) {
                        el1.src = 'about:blank';
                        iframe.document.write('');
                        iframe.document.clear();
                    }
                }
            },
        });
        $('#divWindowTemp').window('open');
    }

}

function getUrlData(url, callback) {
    $.ajax({
        url: '/develop/FormulaMap/getYaoGanData', // 修正后的请求URL
        type: 'post', // 修正了多余的逗号
        data: {
            url: url
        },
        success: function (data, status) {
            if (data.isSuccess) {
                // 在成功获取数据后调用回调函数
                callback(data);
            } else {
                // 处理错误情况，例如通过回调函数传递错误信息
                callback(null, 'Failed to fetch data: ' + data.resultMessage);
            }
        },
        error: function (jqXHR, textStatus, errorThrown) {
            // 处理 AJAX 请求错误
            $.messager.alert("系统提示", 'Error fetching data: ' + textStatus, 'error');
            callback(null, 'AJAX error: ' + textStatus);
        }
    });
}

// 巡检管理
function initXJGL() {

    $.ajax({
        url: '/07GISOneMap/module/02EngineerManage/02EngineerPatrol_GetPatrol',
        type: 'post',
        data: {
            selectTime: document.getElementById('xjrq').value
        },
        async: true,
        success: function (data, status) {

            map.getLayer("xjglLayer").clear();

            if (data.isSuccess) {
                var dataMsg = data.result
                var xjglhtml = ''
                let xjids
                if (dataMsg.length > 0) {

                    xjids = []

                    xjglhtml =
                        ' <table id="dg" class="datagrid-htable" style="width: 100%;font-size: 12px" border="0" cellspacing="0" cellpadding="0";> ' +
                        "                                 <thead class='tableheader'> " +
                        '                                    <tr class="gcgrid-header-row" style="font-size: 14px"> ' +
                        '                                       <th style="width: 40px;font-weight: 400;">序号</th> ' +
                        '                                       <th style="width: 100px;font-weight: 400;" >工程名称</th> ' +
                        '                                        <th style="width: 70px;font-weight: 400;" >巡查人</th> ' +
                        '                                        <th style="width: 80px;font-weight: 400;" >起止桩号</th> ' +
                        '                                        <th style="width: 70px;font-weight: 400;" >状态</th> ' +
                        '                                        <th style="width: 120px;font-weight: 400;" >操作</th> ' +
                        '                                    </tr> ' +
                        '</thead> '
                    var xjglyy = 0

                    for (var i = 0; i < dataMsg.length; i++) {
                        dataMsg[i].REGION_ID = data.REGION_ID
                        if (xjglyy % 2 != 0) {
                            xjglhtml += '      <tr class="gcgrid-list-row1" style="font-size: 14px" >'
                        } else {
                            xjglhtml += '      <tr class="gcgrid-list-row2" style="font-size: 14px">'
                        }

                        xjglhtml += '          <th style="max-width: 40px;"><a style="color: rgb(138,219,115);font-weight: 600;">' + (xjglyy + 1) + '</a></th>'
                        xjglhtml += '          <th class="ellipsis" style="max-width: 100px;"><a style="color: #b9ccdf;font-weight: 400;">' + dataMsg[i].CANAL_NAME + '</a></th>'
                        xjglhtml += '          <th class="ellipsis" style="max-width: 70px;"><a style="color: #b9ccdf;font-weight: 400;">' + dataMsg[i].CK_NAME + '</a></th>'
                        xjglhtml += '          <th class="ellipsis" style="max-width: 80px;"><a style="color: #b9ccdf;font-weight: 400;">' + dataMsg[i].BEGINEND + '</a></th>'

                        if (dataMsg[i].STATUS == '巡查完成') {
                            xjglhtml += '<th class="ellipsis" style="max-width: 70px;"><a style="color: #00ff0c;font-weight: 400;">' + dataMsg[i].STATUS + '</a></th>'
                        } else {
                            xjglhtml += '<th class="ellipsis" style="max-width: 70px;"><a style="color: #ff7000;font-weight: 400;">' + dataMsg[i].STATUS + '</a></th>'
                        }

                        xjglhtml +=
                            '          <th style="man-width: 120px;"><img style="margin-top: 8px;cursor: pointer;width: 40px;" onclick="point_xjgl(' +
                            "'row_" +
                            (xjglyy + 1) +
                            "'" +
                            ')"  src="/develop/FormulaMap/img/grid_DingWei.png"></img>' +
                            '<img style="margin-top: 8px;cursor: pointer;width: 40px;" onclick="postal_xjgl(' +
                            "'row_" +
                            (xjglyy + 1) +
                            "'" +
                            ')"  src="/develop/FormulaMap/img/grid_XiangQing.png"></img></th>'
                        xjglhtml += "<input type='hidden' name='ycy' value='" + JSON.stringify(dataMsg[i]) + "' > "
                        xjglhtml += '      </tr>'
                        xjglyy += 1

                        xjids.push(`'${dataMsg[i].DAY_ID}'`);

                    }
                    xjglhtml += '</table>'
                } else {
                    xjglhtml = ""
                }
                $('#divDg_xjgl').html(xjglhtml)

                const idsString = xjids.join(',');
                var sqlParam = new SuperMap.GetFeaturesByBufferParameters({
                    toIndex: -1,
                    maxFeatures: 10000,
                    queryParameter: {
                        attributeFilter: `LINK_ID IN (${idsString}) `,
                    },
                    datasetNames: ["山美灌区:INFO_CHECK_INFO"]
                });
                new ol.supermap.FeatureService("http://183.252.9.117:8090/iserver/services/data-ShanMeiGuanQu/rest/data").getFeaturesBySQL(sqlParam, function (serviceResult) {
                    var features = serviceResult.result.features.features

                    if (features.length > 0) {
                        var lx;
                        var mm;
                        var path;

                        for (var a = 0; a < features.length; a++) {

                            if (features[a].geometry.type == "LineString") {

                                mm = new maptalks.LineString(
                                    features[a].geometry.coordinates,
                                    {
                                        visible: true,
                                        symbol: {
                                            lineColor: "#54ff00",
                                            lineWidth: 6,
                                            lineJoin: "round", // miter, round, bevel
                                            lineCap: "round", // butt, round, square
                                            lineDasharray: null, // dasharray, e.g. [10, 5, 5]
                                            lineOpacity: 1,
                                        },
                                        properties: {
                                            ID: features[a].properties.LINK_ID,
                                        },
                                    }
                                )
                                mm.addTo(map.getLayer("xjglLayer")).on('click', function (e) {
                                    showWindowsMethod(e.target.properties);
                                })
                            }
                        }
                    }
                });
            } else {
            }
        },
        error: function (data, status) {
        }
    })
}


function point_xjgl(index) {

    var shusData = index.split("_");
    var reow = $("#divDg_xjgl").find("input").eq(shusData[1] - 1).val();
    var row = JSON.parse(reow);

    const filtered = map.getLayer("xjglLayer").filter(["==", "ID", row.LLID]);
    filtered.forEach(function (polygon) {
        map.setView({
            center: polygon.getCenter(),
            zoom: 15,
        });
        polygon.flash(
            200,
            5,
        );

    });
}

function postal_xjgl(shus) {

    var shusData = shus.split("_");
    var reow = $("#divDg_xjgl").find("input").eq(shusData[1] - 1).val();
    var row = JSON.parse(reow);

    var attribute = {};
    attribute.REGION_ID = row.REGION_ID;
    attribute.LINK_ID = row.DAY_ID;
    attribute.NAME = row.CK_NAME;
    attribute.DATA_TABLE_NAME = "EM_TD_CHECK_CANAL_DAY";
    attribute.SHOW_PAGE_PATH = "07GISOneMap/module/popups/GISFinishInspecting.html";
    attribute.PAGE_WIDTH = 800;
    attribute.PAGE_HEIGHT = 600;

    showWindowsMethod(attribute);

}