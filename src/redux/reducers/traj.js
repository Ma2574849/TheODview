const MAP_STYLES = {
    lightZh: 'cl38pr5lx001f15nyyersk7in',
    darkZh: 'clvlrr1re03yv01phbhwge3k3',
};

const initState = {
    locations: [],
    flows: [],
    config: {
        colorScheme: 'Blues',
        opacity: 1,
        clusteringEnabled: true,
        animationEnabled: false,
        locationTotalsEnabled: true,
        fadeOpacityEnabled: true,
        fadeEnabled: true,
        fadeAmount: 10,
        clusteringAuto: true,
        clusteringLevel: 10,
        darkMode: false,
        maxTopFlowsDisplayNum: 8398,
    },
    customlayers: [],
    mapStyle: MAP_STYLES.lightZh,
    showPanel: true,
    globalDark: false,
    selectedLocation: null,

    // 时间轴播放
    timeRange: null,     // { min, max, steps: [] }
    currentTime: null,   // 当前时间步
    timePlayback: false, // 是否正在播放

    // 视图状态（用于分享 URL）
    viewState: {
        longitude: 139.691, latitude: 35.6011, zoom: 11, pitch: 0, bearing: 0
    },
}

export default function trajReducer(preState = initState, action) {
    const { type, data } = action
    switch (type) {
        case 'setlocations':
            return { ...preState, locations: data }
        case 'setflows':
            return { ...preState, flows: data }
        case 'setconfig':
            if (data.darkMode !== undefined && data.darkMode !== preState.config.darkMode) {
                return {
                    ...preState, config: data, globalDark: data.darkMode,
                    mapStyle: data.darkMode ? MAP_STYLES.darkZh : MAP_STYLES.lightZh,
                }
            }
            return { ...preState, config: data }
        case 'setcustomlayers':
            return { ...preState, customlayers: data }
        case 'setMapStyle':
            return { ...preState, mapStyle: data }
        case 'setShowPanel':
            return { ...preState, showPanel: data }
        case 'setGlobalDark':
            return {
                ...preState, globalDark: data,
                config: { ...preState.config, darkMode: data },
                mapStyle: data ? MAP_STYLES.darkZh : MAP_STYLES.lightZh,
            }
        case 'setSelectedLocation':
            return { ...preState, selectedLocation: data }
        case 'setTimeRange':
            return { ...preState, timeRange: data, currentTime: data ? data.steps[0] : null }
        case 'setCurrentTime':
            return { ...preState, currentTime: data }
        case 'setTimePlayback':
            return { ...preState, timePlayback: data }
        case 'setViewState':
            return { ...preState, viewState: data }
        default:
            return preState;
    }
}
