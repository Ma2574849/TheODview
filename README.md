# TheODview

OD（Origin-Destination）交通出行数据可视化分析系统。

基于 [ni1o1/ODview](https://github.com/ni1o1/ODview) 修改优化。Powered by Flowmap.gl + deck.gl + React。

## 环境要求

- Node.js 16+（兼容 Node 22）
- npm 或 yarn

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 配置 Mapbox Token（可选，默认使用内置 token）
#    复制 .env.example 为 .env，替换为你自己的 token
cp .env.example .env

# 3. 启动
npm start
```

浏览器打开 http://localhost:3000

## 配置 Mapbox Token

项目使用 Mapbox 底图，需要 Access Token。在 `.env` 文件中配置：

```
REACT_APP_MAPBOX_TOKEN=pk.你的token
REACT_APP_MAPBOX_USER=你的mapbox用户名
```

注册免费账号获取 Token: https://account.mapbox.com/auth/signup/

## 部署到 GitHub Pages

```bash
npm run build
npm run deploy
```

访问 https://RavenPENG4893.github.io/TheODview

## 数据格式

CSV 文件需要包含以下列：

| 列名 | 说明 | 必填 |
|------|------|------|
| slon | 起点经度 | 是 |
| slat | 起点纬度 | 是 |
| elon | 终点经度 | 是 |
| elat | 终点纬度 | 是 |
| count | 流量计数 | 否 |

也支持导入 GeoJSON 格式的矢量图层。

## 功能

- OD 流向可视化（FlowmapLayer）
- 44 种颜色方案
- 聚类分析
- 动画特效
- 多底图切换
- 数据导出（截图、CSV、JSON、配置）
- 配置导入/导出
- 键盘快捷键（按 ? 查看帮助）
- 移动端自适应

## 技术栈

- React 17 + Redux
- deck.gl + @flowmap.gl/layers
- Mapbox GL JS
- Ant Design 4
