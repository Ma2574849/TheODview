/**
 * 导出为独立 HTML 文件
 * 生成一个包含数据和 deck.gl 渲染的自包含 HTML，无需服务器即可打开
 * 使用 deck.gl TileLayer 作为底图（免 token），自动适配数据范围
 */
export function exportStandaloneHtml(locations, flows, config, viewState, mapStyle) {
    // 限制内联数据量，超大数据集只取 Top N
    const maxFlows = 50000;
    const trimmedFlows = flows.length > maxFlows ? flows.slice(0, maxFlows) : flows;

    // 根据数据自动计算视角范围（不依赖传入的 viewState，避免视野不在数据上导致空白）
    let centerLon = 116.4, centerLat = 39.9, autoZoom = 10;
    if (locations && locations.length > 0) {
        const lons = locations.map(l => Number(l.lon)).filter(v => !isNaN(v));
        const lats = locations.map(l => Number(l.lat)).filter(v => !isNaN(v));
        if (lons.length > 0 && lats.length > 0) {
            const minLon = Math.min(...lons), maxLon = Math.max(...lons);
            const minLat = Math.min(...lats), maxLat = Math.max(...lats);
            centerLon = (minLon + maxLon) / 2;
            centerLat = (minLat + maxLat) / 2;
            const range = Math.max(maxLon - minLon, maxLat - minLat);
            if (range > 50) autoZoom = 3;
            else if (range > 20) autoZoom = 5;
            else if (range > 5) autoZoom = 7;
            else if (range > 1) autoZoom = 9;
            else if (range > 0.3) autoZoom = 11;
            else autoZoom = 13;
        }
    }

    const isDark = config && config.darkMode;
    const tileUrl = isDark
        ? 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'
        : 'https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png';

    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ODview - 交通出行可视化</title>
<script src="https://unpkg.com/deck.gl@8.9.35/dist.min.js"><\/script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: ${isDark ? '#141414' : '#fff'}; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  #container { width: 100vw; height: 100vh; position: relative; overflow: hidden; }
  /* deck.gl vanilla JS 将 canvas 直接挂到 body 下(id=deckgl-overlay)，需直接定位 */
  #deckgl-overlay { position: absolute !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; display: block !important; }
  .deck-tooltip { z-index: 20; }
  .info-bar {
    position: absolute; top: 12px; left: 12px; z-index: 10;
    background: ${isDark ? 'rgba(20,20,20,0.85)' : 'rgba(255,255,255,0.9)'};
    color: ${isDark ? '#ddd' : '#333'};
    padding: 10px 16px; border-radius: 6px; font-size: 13px; line-height: 1.6;
    backdrop-filter: blur(8px);
    box-shadow: 0 2px 12px rgba(0,0,0,0.15);
  }
  .info-bar h3 { margin: 0 0 4px 0; font-size: 15px; }
  .info-bar span { opacity: 0.7; }
  .loading { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); color: #888; font-size: 14px; z-index: 5; }
</style>
</head>
<body>
<div id="container"></div>
<div class="info-bar">
  <h3>ODview</h3>
  <div>${locations.length} 个节点 / ${trimmedFlows.length} 条流向</div>
  <span>配色: ${config.colorScheme} | 生成时间: ${new Date().toLocaleDateString()}</span>
</div>
<div class="loading" id="loading">加载中...</div>
<script>
(function() {
  const DATA = {
    locations: ${JSON.stringify(locations)},
    flows: ${JSON.stringify(trimmedFlows)}
  };

  const CONFIG = ${JSON.stringify({
    colorScheme: config.colorScheme,
    opacity: typeof config.opacity === 'number' ? config.opacity : 1,
    darkMode: isDark,
  })};

  const CENTER = [${centerLon}, ${centerLat}];
  const AUTO_ZOOM = ${autoZoom};

  // 构建 location id -> [lon, lat] 查找表，避免每次 find
  const locMap = {};
  DATA.locations.forEach(function(l) {
    locMap[l.id] = [Number(l.lon), Number(l.lat)];
  });

  function getPos(id) {
    return locMap[id] || [0, 0];
  }

  const { Deck, ArcLayer, ScatterplotLayer, TileLayer, BitmapLayer, MapView } = deck;

  // 底图瓦片层（CartoDB 免费瓦片，暗色/亮色随配置）
  const tileLayer = new TileLayer({
    id: 'base-map',
    data: '${tileUrl}',
    minZoom: 0,
    maxZoom: 19,
    tileSize: 256,
    renderSubLayers: function(props) {
      var bbox = props.tile.boundingBox;
      return new BitmapLayer(props, {
        data: null,
        image: props.data,
        bounds: [bbox[0][0], bbox[0][1], bbox[1][0], bbox[1][1]]
      });
    }
  });

  // OD 流向弧线层
  const arcLayer = new ArcLayer({
    id: 'od-arcs',
    data: DATA.flows,
    getSourcePosition: function(d) { return getPos(d.origin); },
    getTargetPosition: function(d) { return getPos(d.dest); },
    getSourceColor: CONFIG.darkMode ? [0, 180, 255, 200] : [0, 100, 180, 180],
    getTargetColor: CONFIG.darkMode ? [80, 255, 200, 200] : [40, 160, 120, 180],
    getWidth: function(d) { return Math.max(0.5, Math.sqrt(d.count || 1) * 0.25); },
    pickable: true,
    autoHighlight: true,
    opacity: CONFIG.opacity
  });

  // 节点散点层
  const scatterLayer = new ScatterplotLayer({
    id: 'locations',
    data: DATA.locations,
    getPosition: function(d) { return [Number(d.lon), Number(d.lat)]; },
    getRadius: function(d) { return Math.max(150, Math.sqrt(d.count || 1) * 25); },
    getFillColor: CONFIG.darkMode ? [0, 160, 255, 200] : [0, 90, 160, 180],
    getLineColor: CONFIG.darkMode ? [255,255,255,120] : [255,255,255,200],
    lineWidthMinPixels: 1,
    pickable: true
  });

  var containerEl = document.getElementById('container');
  var deckgl = new Deck({
    container: containerEl,
    views: [new MapView({ id: 'base' })],
    initialViewState: {
      base: {
        longitude: CENTER[0],
        latitude: CENTER[1],
        zoom: AUTO_ZOOM,
        pitch: 0,
        bearing: 0
      }
    },
    controller: true,
    layers: [tileLayer, arcLayer, scatterLayer],
    getTooltip: function(info) {
      if (!info.object) return null;
      var o = info.object;
      if (o.origin !== undefined) {
        return '流量: ' + (o.count || 0).toLocaleString();
      }
      if (o.id !== undefined) {
        return '节点: ' + o.id + '<br>总量: ' + (o.count || 0).toLocaleString();
      }
      return null;
    },
    onLoad: function() {
      var el = document.getElementById('loading');
      if (el) el.style.display = 'none';
      // 强制修正 deck.gl canvas 位置（它直接挂在 body 下）
      var c = document.getElementById('deckgl-overlay');
      if (c) {
        c.style.position = 'absolute';
        c.style.top = '0';
        c.style.left = '0';
        c.style.width = '100vw';
        c.style.height = '100vh';
      }
    }
  });
})();
<\/script>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = `odview_${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
    return true;
}
