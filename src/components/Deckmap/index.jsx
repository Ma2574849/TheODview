/* global window */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { _MapContext as MapContext, StaticMap, NavigationControl, ScaleControl, FlyToInterpolator } from 'react-map-gl';
import DeckGL from '@deck.gl/react';
import { useInterval } from 'ahooks';
import { AmbientLight, LightingEffect, MapView, _SunLight as SunLight } from '@deck.gl/core';
import { BitmapLayer } from '@deck.gl/layers';
import { TileLayer } from '@deck.gl/geo-layers';
import { useDispatch, useMappedState } from 'redux-react-hook'
import { setSelectedLocation_tmp, setViewState_tmp } from '@/redux/actions/traj'
import { FlowmapLayer } from '@flowmap.gl/layers';
import './index.css';

const DEFAULT_TOKEN = 'pk.eyJ1IjoibmkxbzEiLCJhIjoiY2t3ZDgzMmR5NDF4czJ1cm84Z3NqOGt3OSJ9.yOYP6pxDzXzhbHfyk3uORg';
const MAPBOX_ACCESS_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN || DEFAULT_TOKEN;
const MAPBOX_USER = process.env.REACT_APP_MAPBOX_USER || 'ni1o1';

const getFlowMagnitude = (flow) => flow.count || 0;
const getFlowOriginId = (flow) => flow.origin;
const getFlowDestId = (flow) => flow.dest;
const getLocationId = (loc) => loc.id;
const getLocationLat = (loc) => loc.lat;
const getLocationLon = (loc) => loc.lon;
const getLocationCentroid = (location) => [location.lon, location.lat];
const fmt = (n) => typeof n === 'number' ? n.toLocaleString() : n;

export default function Deckmap() {
  const dispatch = useDispatch();
  const mapState = useCallback(state => ({
    traj: state.traj,
    mapStyle: state.traj.mapStyle,
    selectedLocation: state.traj.selectedLocation,
    currentTime: state.traj.currentTime,
    timeRange: state.traj.timeRange,
  }), []);
  const { traj, mapStyle, selectedLocation, currentTime, timeRange } = useMappedState(mapState);
  const { locations, flows, config, customlayers } = traj;

  // 时间 + 节点双重过滤
  const filteredFlows = useMemo(() => {
    let result = flows;
    // 时间过滤
    if (timeRange && currentTime) {
      result = result.filter(f => f.time === currentTime);
    }
    // 节点过滤
    if (selectedLocation) {
      result = result.filter(f => f.origin === selectedLocation || f.dest === selectedLocation);
    }
    return result;
  }, [flows, selectedLocation, currentTime, timeRange]);

  const effects = useMemo(() => {
    const ambientLight = new AmbientLight({ color: [255, 255, 255], intensity: 1.0 });
    const sunLight = new SunLight({ timestamp: 1554937300, color: [255, 255, 255], intensity: 2 });
    return [new LightingEffect({ ambientLight, sunLight })];
  }, []);

  const [viewState, setViewState] = useState({
    longitude: 139.691, latitude: 35.6011, zoom: 11, pitch: 0, bearing: 0
  });

  useEffect(() => {
    document.getElementById("deckgl-wrapper").addEventListener("contextmenu", evt => evt.preventDefault());
  }, [])

  // 旋转
  function rotate(pitch, bearing, duration) {
    setViewState({ ...viewState, pitch, bearing, transitionDuration: duration, transitionInterpolator: new FlyToInterpolator() });
  }
  const [angle, setangle] = useState(120);
  const [interval, setInterval] = useState(undefined);
  useInterval(() => { rotate(viewState.pitch, angle, 2000); setangle(a => a + 30); }, interval, { immediate: true });

  function rotatecam() {
    setangle(viewState.bearing + 30);
    if (interval !== 2000) { setInterval(2000); } else { setInterval(undefined); setViewState(viewState); }
  }

  const cameraTools = (
    <div className="mapboxgl-ctrl-group mapboxgl-ctrl">
      <button title="Rotatecam" onClick={rotatecam} style={{ opacity: interval === 2000 ? 1 : 0.2 }}>
        <span className="iconfont icon-camrotate" />
      </button>
    </div>
  );

  // 数据加载后自动 fit bounds
  useEffect(() => {
    if (locations.length > 0) {
      const lons = locations.map(l => l.lon);
      const lats = locations.map(l => l.lat);
      const centerLon = (Math.min(...lons) + Math.max(...lons)) / 2;
      const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
      const range = Math.max(Math.max(...lons) - Math.min(...lons), Math.max(...lats) - Math.min(...lats));
      let zoom = 11;
      if (range > 50) zoom = 3; else if (range > 20) zoom = 5;
      else if (range > 5) zoom = 7; else if (range > 1) zoom = 9;
      else if (range > 0.3) zoom = 11; else zoom = 13;

      setViewState(prev => ({
        ...prev, longitude: centerLon, latitude: centerLat, zoom,
        transitionDuration: 1500, transitionInterpolator: new FlyToInterpolator(),
      }));
    }
  }, [locations]);

  const getTooltip = useCallback((info) => {
    if (!info.layer || info.layer.id !== 'OD' || !info.object) return undefined;
    if (info.object.type === 'flow') return `流量: ${fmt(info.object.count)}`;
    if (info.object.type === 'location') {
      const t = info.object.totals;
      return `流入: ${fmt(t.incomingCount)}\n流出: ${fmt(t.outgoingCount)}\n点击可筛选此节点`;
    }
    return undefined;
  }, []);

  const handleClick = useCallback((info) => {
    if (info.layer && info.layer.id === 'OD' && info.object && info.object.type === 'location') {
      const locId = info.object.id || info.object.name;
      dispatch(setSelectedLocation_tmp(selectedLocation === locId ? null : locId));
    }
  }, [selectedLocation, dispatch]);

  const handelhover = useCallback(() => {}, []);

  const layers = useMemo(() => [
    ...customlayers,
    new FlowmapLayer({
      id: 'OD',
      data: { locations, flows: filteredFlows },
      opacity: config.opacity,
      pickable: true,
      colorScheme: config.colorScheme,
      clusteringEnabled: config.clusteringEnabled,
      clusteringAuto: config.clusteringAuto,
      clusteringLevel: config.clusteringLevel,
      animationEnabled: config.animationEnabled,
      locationTotalsEnabled: config.locationTotalsEnabled,
      fadeOpacityEnabled: config.fadeOpacityEnabled,
      fadeEnabled: config.fadeEnabled,
      fadeAmount: config.fadeAmount,
      darkMode: config.darkMode,
      getFlowMagnitude, getFlowOriginId, getFlowDestId,
      getLocationId, getLocationLat, getLocationLon, getLocationCentroid,
      onHover: handelhover,
    })
  ], [locations, filteredFlows, config, customlayers, handelhover]);

  // viewState 同步到 Redux（用于分享 URL）
  const onViewStateChange = useCallback((newviewState) => {
    const nviewState = newviewState.viewState;
    const updated = {
      longitude: nviewState.longitude,
      latitude: nviewState.latitude,
      pitch: nviewState.pitch,
      bearing: nviewState.bearing,
      zoom: nviewState.zoom,
    };
    setViewState(prev => ({ ...prev, ...updated }));
    dispatch(setViewState_tmp(updated));
  }, [dispatch]);

  return (
    <div>
      <DeckGL
        layers={layers}
        initialViewState={{ 'baseMap': viewState }}
        effects={effects}
        controller={{ doubleClickZoom: false, inertia: true, touchRotate: true }}
        style={{ zIndex: 0 }}
        glOptions={{ preserveDrawingBuffer: true }}
        ContextProvider={MapContext.Provider}
        onViewStateChange={onViewStateChange}
        getTooltip={getTooltip}
        onClick={handleClick}
      >
        <MapView id="baseMap" controller={true} y="0%" height="100%" position={[0, 0, 0]}>
          <StaticMap reuseMaps
            mapboxApiAccessToken={MAPBOX_ACCESS_TOKEN}
            mapStyle={`mapbox://styles/${MAPBOX_USER}/${mapStyle}`}
            preserveDrawingBuffer={true}
            mapOptions={{ preserveDrawingBuffer: true }}
            preventStyleDiffing={true}>
            <div className='mapboxgl-ctrl-bottom-left' style={{ bottom: '20px' }}>
              <ScaleControl maxWidth={100} unit="metric" />
            </div>
          </StaticMap>
          <div className='mapboxgl-ctrl-bottom-right' style={{ bottom: '80px' }}>
            <NavigationControl onViewportChange={viewport => setViewState(viewport)} />
            {cameraTools}
          </div>
        </MapView>
      </DeckGL>
    </div>
  );
}
