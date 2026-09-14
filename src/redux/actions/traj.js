// 数据
export const setlocations_tmp = data => ({ type: 'setlocations', data })
export const setflows_tmp = data => ({ type: 'setflows', data })
export const setconfig_tmp = data => ({ type: 'setconfig', data })
export const setcustomlayers_tmp = data => ({ type: 'setcustomlayers', data })

// UI 状态
export const setMapStyle_tmp = data => ({ type: 'setMapStyle', data })
export const setShowPanel_tmp = data => ({ type: 'setShowPanel', data })
export const setGlobalDark_tmp = data => ({ type: 'setGlobalDark', data })
export const setSelectedLocation_tmp = data => ({ type: 'setSelectedLocation', data })

// 时间轴
export const setTimeRange_tmp = data => ({ type: 'setTimeRange', data })
export const setCurrentTime_tmp = data => ({ type: 'setCurrentTime', data })
export const setTimePlayback_tmp = data => ({ type: 'setTimePlayback', data })

// 视图状态（用于分享 URL）
export const setViewState_tmp = data => ({ type: 'setViewState', data })
