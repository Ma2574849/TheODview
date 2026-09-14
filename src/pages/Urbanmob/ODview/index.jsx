import React, { useEffect, useState, useCallback } from 'react'
import { Typography, Divider, Col, Upload, message, Switch, Table, Modal, Row, Button, Slider, Card, Form, Select, Collapse, Tooltip, Spin, Space } from 'antd';
import {
    InfoCircleOutlined, InboxOutlined, LoadingOutlined,
    CameraOutlined, DownloadOutlined, UploadOutlined, SettingOutlined,
    CloseCircleOutlined, AimOutlined, ShareAltOutlined, Html5Outlined, ClockCircleOutlined
} from '@ant-design/icons';
import { nanoid } from 'nanoid';
import { useDispatch, useMappedState } from 'redux-react-hook'
import {
    setlocations_tmp, setflows_tmp, setconfig_tmp, setcustomlayers_tmp,
    setSelectedLocation_tmp, setTimeRange_tmp
} from '@/redux/actions/traj'
import { exportFlowsAsCSV, exportScreenshot, exportConfig, importConfig, downloadJSON } from '@/utils/downloadFile';
import { exportStandaloneHtml } from '@/utils/exportHtml';
import { copyShareUrl } from '@/utils/shareUrl';
import { processODInWorker } from '@/utils/csvWorker';
import COLOR_SCHEMES from '@/utils/colorSchemes';
import axios from 'axios'
import { GeoJsonLayer } from '@deck.gl/layers';

const { Dragger } = Upload;
const { Title, Text } = Typography;
const csv = require('csvtojson')
const { Panel } = Collapse;
const { Option } = Select;
const loadingIcon = <LoadingOutlined style={{ fontSize: 24 }} spin />;
const PREVIEW_LIMIT = 100;

function ColorSwatch({ scheme }) {
    const colors = COLOR_SCHEMES[scheme];
    if (!colors) return null;
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{
                display: 'inline-block', width: 60, height: 12, borderRadius: 2,
                background: `linear-gradient(to right, ${colors.join(', ')})`,
                border: '1px solid #d9d9d9', verticalAlign: 'middle',
            }} />
            <span>{scheme}</span>
        </span>
    );
}

export default function ODview() {
    const dispatch = useDispatch()
    const setlocations = (data) => dispatch(setlocations_tmp(data))
    const setflows = (data) => dispatch(setflows_tmp(data))
    const setconfig = (data) => dispatch(setconfig_tmp(data))
    const setcustomlayers = (data) => dispatch(setcustomlayers_tmp(data))

    const mapState = useCallback(state => ({
        traj: state.traj,
        selectedLocation: state.traj.selectedLocation,
        viewState: state.traj.viewState,
        timeRange: state.traj.timeRange,
    }), []);
    const { traj, selectedLocation, viewState, timeRange } = useMappedState(mapState);
    const { flows, locations, config, customlayers } = traj

    const [dataLoading, setDataLoading] = useState(false);
    const [loadingTip, setLoadingTip] = useState('');
    const [layernum, setlayernum] = useState(1)
    const [tableinfo, setTableinfo] = useState({ columns: [], data: [], totalRows: 0 })
    const [form] = Form.useForm()
    const [isModalVisible, setisModalVisible] = useState(false)
    const [form2] = Form.useForm()
    const [maxflow, setmaxflow] = useState(100)
    const [allCsvData, setAllCsvData] = useState([]) // 完整数据（表格只显示前100行）
    // =====车辆筛选状态=====
    const [vehicleOD,setVehicleOD]=useState([]);

    const [vehicleFilter,setVehicleFilter]=useState({
        port:'全部',
        energy:'全部',
        emission:'全部',
        type:'全部'
    });

const [filterOptions,setFilterOptions]=useState({
    port:[],
    energy:[],
    emission:[],
    type:[]
});

// =====车辆筛选结果统计=====
const [allVehicleFlowTotal, setAllVehicleFlowTotal] = useState(0);
const [vehicleStats, setVehicleStats] = useState({
    nodeCount: 0,
    flowCount: 0,
    totalCount: 0,
    ratio: 100
});

// =====上海港电子围栏中心点=====
const PORT_COORDINATES = {

    "外1":[
        [121.586873,31.363756],
        [121.595051,31.358685],
        [121.599335,31.363506],
        [121.607123,31.373731],
        [121.596901,31.377887]
    ],

    "外2":[
        [121.570438,31.364917],
        [121.581687,31.360010],
        [121.588891,31.369270],
        [121.595146,31.378672],
        [121.582116,31.383700],
        [121.575698,31.373348]
    ],

    "外4":[
        [121.642206,31.328022],
        [121.656283,31.320261],
        [121.663270,31.329788],
        [121.670398,31.339346],
        [121.655715,31.346895],
        [121.648695,31.337488]
    ],

    "外5":[
        [121.656825,31.320151],
        [121.669544,31.312562],
        [121.684350,31.332396],
        [121.671036,31.339285],
        [121.663784,31.329473]
    ],

    "外6":[
        [121.669764,31.312168],
        [121.676482,31.321295],
        [121.684737,31.332288],
        [121.691779,31.329454],
        [121.686275,31.318046],
        [121.683685,31.312099],
        [121.679962,31.306775],
        [121.675025,31.309403]
    ]
};



// 计算港口中心点
const PORT_CENTER={};


Object.keys(PORT_COORDINATES).forEach(name=>{


    const points=PORT_COORDINATES[name];


    const lon=
    points.reduce((sum,p)=>sum+p[0],0)
    /
    points.length;


    const lat=
    points.reduce((sum,p)=>sum+p[1],0)
    /
    points.length;


    PORT_CENTER[name]=[
        lon,
        lat
    ];

});

    // CSV 文件上传
    const handleupload_traj = (file) => {
        setDataLoading(true);
        setLoadingTip(`正在读取 ${file.name} ...`);
        message.loading({ content: '读取数据中', key: 'readcsv', duration: 0 })
        return new Promise(resolve => {
            const reader = new FileReader();
            reader.readAsText(file)
            reader.onload = function (f) {
                const data = f.target.result
                if (file.name.slice(-3) === 'csv') {
                    const hasHeader = data.slice(0, data.indexOf('\n')).split(',').map(f => isNaN(f[0])).indexOf(false) === -1;
                    const csvoption = hasHeader ? {} : { noheader: true };
                    csv(csvoption).fromString(data).then((jsonObj) => {
                        setDataLoading(false);
                        setisModalVisible(true);
                        const columns = Object.keys(jsonObj[0]).map(key => ({
                            title: key, dataIndex: key, key: key, ellipsis: true,
                        }));
                        // 只预览前 PREVIEW_LIMIT 行
                        setTableinfo({
                            columns,
                            data: jsonObj.slice(0, PREVIEW_LIMIT),
                            totalRows: jsonObj.length,
                        });
                        setAllCsvData(jsonObj);
                        // 自动识别列名
                        const names = columns.map(f => f.key);
                        const find = (keyword) => names[names.map(f => f.toLowerCase().indexOf(keyword) >= 0).indexOf(true)];
                        form.setFieldsValue({
                            SLON: find('slon') || names[0],
                            SLAT: find('slat') || names[1],
                            ELON: find('elon') || names[2],
                            ELAT: find('elat') || names[3],
                            COUNT: find('count') || names[4],
                            TIME: find('time') || find('hour') || find('date') || '',
                        });
                        message.destroy('readcsv');
                    });
                }
                if (file.name.slice(-4) === 'json') {
                    const jsondata = JSON.parse(data);
                    setcustomlayers([
                        ...customlayers,
                        new GeoJsonLayer({
                            id: 'Layer' + layernum.toString(),
                            type: jsondata.features[0].geometry.type,
                            data: jsondata, pickable: true, stroked: true, filled: true,
                            extruded: true, lineWidthScale: 20, lineWidthMinPixels: 2,
                            opacity: 0.8, getFillColor: [180, 180, 220], getLineColor: [180, 180, 220],
                            getPointRadius: 100, getLineWidth: 1, getElevation: 30
                        })
                    ]);
                    setlayernum(layernum + 1);
                    setDataLoading(false);
                    message.destroy('readcsv');
                }
            }
        })
    }

    // 确认字段映射 → 使用 Web Worker 处理
 const settraj = () => {
        setisModalVisible(false);
        setDataLoading(true);
        setLoadingTip('正在后台处理 OD 数据...');
        const field = form.getFieldValue();

        processODInWorker(allCsvData, {
            SLON: field.SLON,
            SLAT: field.SLAT,
            ELON: field.ELON,
            ELAT: field.ELAT,
            COUNT: field.COUNT,
            TIME: field.TIME || null,
        }).then(result => {
            setflows(result.flows);
            setlocations(result.locations);
            setmaxflow(result.maxFlow);
            setconfig({ ...config, maxTopFlowsDisplayNum: result.maxFlow });
            dispatch(setSelectedLocation_tmp(null));
            // 时间轴
            if (result.timeRange) {
                dispatch(setTimeRange_tmp(result.timeRange));
                message.success({
                    content: `加载完成 — ${result.locations.length} 个节点，${result.flows.length} 条流向，${result.timeRange.steps.length} 个时间步`,
                    duration: 4
                });
            } else {
                dispatch(setTimeRange_tmp(null));
                message.success({
                    content: `加载完成 — ${result.locations.length} 个节点，${result.flows.length} 条流向`,
                    duration: 3
                });
            }
            setDataLoading(false);
        }).catch(err => {
            console.error('OD processing failed:', err);
            setDataLoading(false);
            message.error('数据处理失败: ' + err.message);
        });
    }
    //读取车辆OD数据
// 清理CSV中的空格
const cleanValue = value =>
    String(value === undefined || value === null ? '' : value).trim();


// 把车辆CSV转换成地图可以读取的数据
const buildVehicleMapData = rows => {

    const locationMap = new Map();
    const vehicleFlows = [];

    rows.forEach(x => {

        const portName =
            cleanValue(x.origin_port);

        const originCoordinates =
            PORT_CENTER[portName];

        const destLon =
            Number(x.grid_center_lon);

        const destLat =
            Number(x.grid_center_lat);

        const count =
            Number(
                x.vehicle_count_x ||
                x.vehicle_count ||
                x.trip_count ||
                x.count ||
                0
            );

        // 找不到港区中心点就跳过
        if (!originCoordinates) {
            return;
        }

        const originLon =
            Number(originCoordinates[0]);

        const originLat =
            Number(originCoordinates[1]);

        // 防止无效经纬度传给deck.gl
        const coordinatesValid =
            Number.isFinite(originLon) &&
            Number.isFinite(originLat) &&
            Number.isFinite(destLon) &&
            Number.isFinite(destLat) &&
            originLon >= -180 &&
            originLon <= 180 &&
            destLon >= -180 &&
            destLon <= 180 &&
            originLat >= -90 &&
            originLat <= 90 &&
            destLat >= -90 &&
            destLat <= 90;

        if (!coordinatesValid) {
            return;
        }

        if (!Number.isFinite(count) || count <= 0) {
            return;
        }

        const originId =
            'port_' + portName;

        const destId =
            'grid_' +
            destLon.toFixed(6) +
            '_' +
            destLat.toFixed(6);

        // 注意：地图读取的是lon和lat，不是coordinates
        if (!locationMap.has(originId)) {
            locationMap.set(originId, {
                id: originId,
                name: portName,
                lon: originLon,
                lat: originLat
            });
        }

        if (!locationMap.has(destId)) {
            locationMap.set(destId, {
                id: destId,
                lon: destLon,
                lat: destLat
            });
        }

        // 流向读取的是origin和dest
        vehicleFlows.push({
            origin: originId,
            dest: destId,
            count: count
        });

    });

    return {
        locations: Array.from(locationMap.values()),
        flows: vehicleFlows
    };

};


// 页面打开时自动读取车辆OD数据
useEffect(() => {

    let cancelled = false;

    axios
        .get(process.env.PUBLIC_URL + '/data/12_vehicle_filter_od.csv')
        .then(async response => {

            const odData =
                await csv().fromString(response.data);

            if (cancelled) {
                return;
            }

            setVehicleOD(odData);

            // 直接从车辆OD文件生成筛选选项
            setFilterOptions({

                port: [
                    '全部',
                    ...new Set(
                        odData
                            .map(x => cleanValue(x.origin_port))
                            .filter(Boolean)
                    )
                ],

                energy: [
                    '全部',
                    ...new Set(
                        odData
                            .map(x => cleanValue(x.energy_type))
                            .filter(Boolean)
                    )
                ],

                emission: [
                    '全部',
                    ...new Set(
                        odData
                            .map(x => cleanValue(x.emission_standard))
                            .filter(Boolean)
                    )
                ],

                type: [
                    '全部',
                    ...new Set(
                        odData
                            .map(x => cleanValue(x.type))
                            .filter(Boolean)
                    )
                ]

            });

            // 页面打开时直接显示全部车辆路线
            const result =
                buildVehicleMapData(odData);

            console.log(
                '车辆CSV总行数：',
                odData.length
            );

            console.log(
                '有效路线数：',
                result.flows.length
            );

            if (
                result.locations.length === 0 ||
                result.flows.length === 0
            ) {
                message.error(
                    '车辆CSV读取成功，但没有可绘制路线，请检查港区名称和经纬度字段'
                );
                return;
            }

            dispatch(setSelectedLocation_tmp(null));
            dispatch(setTimeRange_tmp(null));

            setflows(result.flows);
            setlocations(result.locations);

            setmaxflow(
                Math.max(
                    ...result.flows.map(x => x.count)
                )
            );

            const totalCount = result.flows.reduce(
                (sum, item) => sum + item.count,
                0
            );

            setAllVehicleFlowTotal(totalCount);
            setVehicleStats({
                nodeCount: result.locations.length,
                flowCount: result.flows.length,
                totalCount: totalCount,
                ratio: 100
            });

            message.success(
                `车辆数据加载完成：${result.locations.length} 个节点，${result.flows.length} 条流向`
            );

        })
        .catch(err => {

            console.error(
                '车辆OD加载失败：',
                err
            );

            message.error(
                '车辆OD文件加载失败，请检查文件是否放在 public/data 文件夹'
            );

        });

    return () => {
        cancelled = true;
    };

}, []);


// 点击“应用筛选”
const applyVehicleFilter = () => {

    if (vehicleOD.length === 0) {
        message.warning(
            '车辆OD数据尚未加载完成，请稍后再试'
        );
        return;
    }

    const filteredData =
        vehicleOD.filter(x => {

            const portMatch =
                vehicleFilter.port === '全部' ||
                cleanValue(x.origin_port) ===
                cleanValue(vehicleFilter.port);

            const energyMatch =
                vehicleFilter.energy === '全部' ||
                cleanValue(x.energy_type) ===
                cleanValue(vehicleFilter.energy);

            const emissionMatch =
                vehicleFilter.emission === '全部' ||
                cleanValue(x.emission_standard) ===
                cleanValue(vehicleFilter.emission);

            const typeMatch =
                vehicleFilter.type === '全部' ||
                cleanValue(x.type) ===
                cleanValue(vehicleFilter.type);

            return (
                portMatch &&
                energyMatch &&
                emissionMatch &&
                typeMatch
            );

        });

    const result =
        buildVehicleMapData(filteredData);

    if (
        result.locations.length === 0 ||
        result.flows.length === 0
    ) {
        message.warning(
            '当前筛选条件下没有符合要求的车辆OD数据'
        );
        return;
    }

    dispatch(setSelectedLocation_tmp(null));
    dispatch(setTimeRange_tmp(null));

    setflows(result.flows);
    setlocations(result.locations);

    setmaxflow(
        Math.max(
            ...result.flows.map(x => x.count)
        )
    );

    const totalCount = result.flows.reduce(
        (sum, item) => sum + item.count,
        0
    );

    setVehicleStats({
        nodeCount: result.locations.length,
        flowCount: result.flows.length,
        totalCount: totalCount,
        ratio: allVehicleFlowTotal > 0
            ? totalCount / allVehicleFlowTotal * 100
            : 0
    });

    message.success(
        `筛选完成：${result.locations.length} 个节点，${result.flows.length} 条流向`
    );

};


// 点击“一键重置”
const resetVehicleFilter = () => {

    const resetFilter = {
        port: '全部',
        energy: '全部',
        emission: '全部',
        type: '全部'
    };

    setVehicleFilter(resetFilter);

    const result = buildVehicleMapData(vehicleOD);

    if (
        result.locations.length === 0 ||
        result.flows.length === 0
    ) {
        message.warning('车辆OD数据尚未加载完成');
        return;
    }

    dispatch(setSelectedLocation_tmp(null));
    dispatch(setTimeRange_tmp(null));

    setflows(result.flows);
    setlocations(result.locations);

    setmaxflow(
        Math.max(...result.flows.map(x => x.count))
    );

    const totalCount = result.flows.reduce(
        (sum, item) => sum + item.count,
        0
    );

    setVehicleStats({
        nodeCount: result.locations.length,
        flowCount: result.flows.length,
        totalCount: totalCount,
        ratio: 100
    });

    message.success('筛选条件已重置');
};

    useEffect(()=>{

    if(flows.length>0){

        setmaxflow(
            Math.max(
                ...flows.map(x=>x.count)
            )
        );

    }

},[flows]);


    const handleconfigchange = (d) => setconfig({ ...config, ...d })

    const filteredFlowCount = selectedLocation
        ? flows.filter(f => f.origin === selectedLocation || f.dest === selectedLocation).length
        : flows.length;

    return (
        <>
            <Col span={24}>
                <Card title="OD流向图" extra={<Tooltip title='Import OD data to show flow map'><InfoCircleOutlined /></Tooltip>} bordered={false}>
                    <Collapse defaultActiveKey={['ImportOD', 'Settings']}>
                        <Panel header="导入OD数据" key="ImportOD">
                            {dataLoading && (
                                <div style={{ textAlign: 'center', padding: '12px 0', marginBottom: 12, background: config.darkMode ? '#111b26' : '#e6f7ff', borderRadius: 4, border: `1px solid ${config.darkMode ? '#153450' : '#91d5ff'}` }}>
                                    <Spin indicator={loadingIcon} />
                                    <span style={{ marginLeft: 10, color: '#1890ff' }}>{loadingTip}</span>
                                </div>
                            )}
                            {!dataLoading && locations.length > 0 && (
                                <div style={{ padding: '8px 12px', marginBottom: 12, background: config.darkMode ? '#162312' : '#f6ffed', borderRadius: 4, border: `1px solid ${config.darkMode ? '#274916' : '#b7eb8f'}`, fontSize: 13, color: '#52c41a' }}>
                                    {locations.length} 个节点 / {flows.length} 条流向
                                    {flows.length > 0 && ` / 最大流量 ${flows.reduce((x, y) => x.count > y.count ? x : y).count.toLocaleString()}`}
                                    {timeRange && ` / ${timeRange.steps.length} 个时间步`}
                                </div>
                            )}
                            {selectedLocation && (
                                <div style={{ padding: '8px 12px', marginBottom: 12, background: config.darkMode ? '#1a1325' : '#f9f0ff', borderRadius: 4, border: `1px solid ${config.darkMode ? '#301c4d' : '#d3adf7'}`, fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span><AimOutlined style={{ marginRight: 6 }} />已筛选节点，显示 {filteredFlowCount} 条相关流向</span>
                                    <Button type="link" size="small" icon={<CloseCircleOutlined />} onClick={() => dispatch(setSelectedLocation_tmp(null))}>清除筛选</Button>
                                </div>
                            )}
                            <Row gutters={4}>
                                <Col>
                                    <Dragger maxCount={1} beforeUpload={handleupload_traj}>
                                        <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                                        <p className="ant-upload-text">点击或将数据拖到此处</p>
                                        <p className="ant-upload-hint">
                                            支持 CSV（OD数据）和 GeoJSON（矢量图层）。OD数据需含 slon/slat/elon/elat 列，可选 count 和 time 列。
                                        </p>
                                    </Dragger>
                                </Col>
                            </Row>
                        </Panel>

                        {customlayers.length > 0 && (
                            <Panel header="图层" key="Layers">
                                <Table size='small' columns={[
                                    { title: 'ID', dataIndex: 'id', key: 'id' },
                                    { title: '类型', dataIndex: 'type', key: 'type' },
                                ]} dataSource={customlayers.map(l => ({ id: l.id, type: l.props.type }))} pagination={false} />
                            </Panel>
                        )}
                        
                        <Panel 
                        header="车辆分析筛选"
                        key="VehicleFilter"
                        >


                        <Card size="small">

                        <Text strong>港区</Text>
                        <Select
                        style={{width:'100%',marginTop:6,marginBottom:12}}
                        value={vehicleFilter.port}
                        onChange={v=>
                        setVehicleFilter({...vehicleFilter,port:v})
                        }
                        >

                        {
                        filterOptions.port.map(v=>
                        <Option key={v}>{v}</Option>
                        )
                        }

                        </Select>


                        <Text strong>能源类型</Text>
                        <Select
                        style={{width:'100%',marginTop:6,marginBottom:12}}
                        value={vehicleFilter.energy}
                        onChange={v=>
                        setVehicleFilter({...vehicleFilter,energy:v})
                        }
                        >

                        {
                        filterOptions.energy.map(v=>
                        <Option key={v}>{v}</Option>
                        )
                        }

                        </Select>


                        <Text strong>排放标准</Text>
                        <Select
                            style={{width:'100%',marginTop:6,marginBottom:12}}
                            value={vehicleFilter.emission}
                            onChange={v=>
                                setVehicleFilter({...vehicleFilter, emission:v})
                            }
                        >

                        {
                            filterOptions.emission.map(v=>(
                                <Option key={v}>{v}</Option>
                            ))
                        }

                        </Select>


                        <Text strong>车辆类型</Text>
                        <Select
                        style={{width:'100%',marginTop:6,marginBottom:12}}
                        value={vehicleFilter.type}
                        onChange={v=>
                        setVehicleFilter({...vehicleFilter,type:v})
                        }
                        >

                        {
                        filterOptions.type.map(v=>
                        <Option key={v}>{v}</Option>
                        )
                        }

                        </Select>



                        
                        <Button
                            type="primary"
                            block
                            onClick={applyVehicleFilter}
                        >
                            应用筛选
                        </Button>

                        <Button
                            block
                            style={{marginTop:10}}
                            onClick={resetVehicleFilter}
                        >
                            一键重置
                        </Button>

                        <div style={{
                            marginTop: 14,
                            padding: 12,
                            background: config.darkMode ? '#111b26' : '#f5f7fa',
                            borderRadius: 6,
                            fontSize: 13,
                            lineHeight: 1.9
                        }}>
                            <Text strong>当前筛选结果</Text>
                            <div>地图节点：{vehicleStats.nodeCount.toLocaleString()} 个</div>
                            <div>OD流向：{vehicleStats.flowCount.toLocaleString()} 条</div>
                            <div>累计车辆流量：{vehicleStats.totalCount.toLocaleString()}</div>
                            <div>占全部车辆流量：{vehicleStats.ratio.toFixed(1)}%</div>
                        </div>


                         </Card>


                         </Panel>

                         <Panel header="OD设置" key="Settings">
                            <Form {...{ labelCol: { span: 16 }, wrapperCol: { span: 8 } }}
                                size="small" name="basic" layout='inline'
                                form={form2} initialValues={config}
                                autoComplete="off" onValuesChange={handleconfigchange}>
                                <Title level={4}>基础设置</Title>
                                <Row gutters={4}>
                                    <Col span={24}>
                                        <Form.Item label="颜色" name="colorScheme">
                                            <Select defaultValue='Blues' dropdownMatchSelectWidth={240} optionLabelProp="label">
                                                {Object.keys(COLOR_SCHEMES).map(v => (
                                                    <Option key={v} value={v} label={v}><ColorSwatch scheme={v} /></Option>
                                                ))}
                                            </Select>
                                        </Form.Item>
                                    </Col>
                                    <Col span={24}><Form.Item label="透明度" name="opacity"><Slider min={0} max={1} step={0.01} value={typeof config.opacity === 'number' ? config.opacity : 0} /></Form.Item></Col>
                                    <Col span={24}><Form.Item label="动画特效" name="animationEnabled"><Switch size="small" checked={config.animationEnabled} /></Form.Item></Col>
                                    <Col span={24}><Form.Item label="显示节点" name="locationTotalsEnabled"><Switch size="small" checked={config.locationTotalsEnabled} /></Form.Item></Col>
                                    <Col span={24}><Form.Item label="暗色模式" name="darkMode"><Switch size="small" checked={config.darkMode} /></Form.Item></Col>
                                </Row>
                                <Divider />
                                <Title level={4}>聚类</Title>
                                <Row gutters={4}>
                                    <Col span={24}><Form.Item label="是否聚类" name="clusteringEnabled"><Switch size="small" checked={config.clusteringEnabled} /></Form.Item></Col>
                                    <Col span={24}><Form.Item label="自动聚类参数" name="clusteringAuto"><Switch size="small" checked={config.clusteringAuto} /></Form.Item></Col>
                                    <Col span={24}><Form.Item label="聚类层数" name="clusteringLevel"><Slider min={0} max={20} step={1} value={typeof config.clusteringLevel === 'number' ? config.clusteringLevel : 0} /></Form.Item></Col>
                                    <Divider />
                                    <Title level={4}>褪色</Title>
                                    <Col span={24}><Form.Item label="是否褪色" name="fadeEnabled"><Switch size="small" checked={config.fadeEnabled} /></Form.Item></Col>
                                    <Col span={24}><Form.Item label="褪色透明" name="fadeOpacityEnabled"><Switch size="small" checked={config.fadeOpacityEnabled} /></Form.Item></Col>
                                    <Col span={24}><Form.Item label="褪色比例" name="fadeAmount"><Slider min={0} max={100} step={0.1} value={typeof config.fadeAmount === 'number' ? config.fadeAmount : 0} /></Form.Item></Col>
                                </Row>
                            </Form>
                        </Panel>

                        <Panel header="导出与分享" key="Export">
                            <Space direction="vertical" style={{ width: '100%' }} size="middle">
                                <Button icon={<ShareAltOutlined />} block
                                    onClick={() => {
                                        copyShareUrl({ config, viewState, mapStyle: traj.mapStyle, globalDark: traj.globalDark, selectedLocation })
                                            .then(() => message.success('分享链接已复制到剪贴板'))
                                            .catch(() => message.error('复制失败'));
                                    }}>
                                    复制分享链接
                                </Button>
                                <Button icon={<Html5Outlined />} block
                                    onClick={() => {
                                        exportStandaloneHtml(locations, flows, config, viewState, traj.mapStyle);
                                        message.success('独立 HTML 文件已导出');
                                    }}
                                    disabled={flows.length === 0}>
                                    导出为独立 HTML
                                </Button>
                                <Divider style={{ margin: '4px 0' }} />
                                <Button icon={<CameraOutlined />} block
                                    onClick={() => { const ok = exportScreenshot(); message[ok ? 'success' : 'warning'](ok ? '截图已保存' : '截图失败'); }}
                                    disabled={locations.length === 0}>
                                    地图截图
                                </Button>
                                <Button icon={<DownloadOutlined />} block
                                    onClick={() => { exportFlowsAsCSV(flows, locations); message.success('已导出 CSV'); }}
                                    disabled={flows.length === 0}>
                                    导出 OD 数据（CSV）
                                </Button>
                                <Button icon={<DownloadOutlined />} block
                                    onClick={() => { downloadJSON(flows, 'flows'); downloadJSON(locations, 'locations'); message.success('已导出 JSON'); }}
                                    disabled={flows.length === 0}>
                                    导出原始数据（JSON）
                                </Button>
                                <Divider style={{ margin: '4px 0' }} />
                                <Button icon={<SettingOutlined />} block onClick={() => { exportConfig(config); message.success('配置已导出'); }}>导出当前配置</Button>
                                <Button icon={<UploadOutlined />} block
                                    onClick={() => { importConfig().then(i => { setconfig({ ...config, ...i }); message.success('配置已导入'); }).catch(e => message.error('失败: ' + e)); }}>
                                    导入配置文件
                                </Button>
                            </Space>
                        </Panel>
                    </Collapse>
                </Card>
            </Col>

            {/* 字段映射弹窗 */}
            <Modal key="model" title="数据预览与字段映射"
                width='80vw' visible={isModalVisible}
                onOk={settraj} onCancel={() => { setisModalVisible(false); setDataLoading(false); }}
                okText="确认导入" cancelText="取消">
                <Form {...{ labelCol: { span: 8 }, wrapperCol: { span: 0 } }}
                    name="fieldMapping" form={form} autoComplete="off">
                    <Row gutter={8}>
                        <Col span={4}><Form.Item name="SLON" label="slon"><Select style={{ width: 100 }}>{tableinfo.columns.map(v => <Option key={v.key} value={v.key}>{v.key}</Option>)}</Select></Form.Item></Col>
                        <Col span={4}><Form.Item name="SLAT" label="slat"><Select style={{ width: 100 }}>{tableinfo.columns.map(v => <Option key={v.key} value={v.key}>{v.key}</Option>)}</Select></Form.Item></Col>
                        <Col span={4}><Form.Item name="ELON" label="elon"><Select style={{ width: 100 }}>{tableinfo.columns.map(v => <Option key={v.key} value={v.key}>{v.key}</Option>)}</Select></Form.Item></Col>
                        <Col span={4}><Form.Item name="ELAT" label="elat"><Select style={{ width: 100 }}>{tableinfo.columns.map(v => <Option key={v.key} value={v.key}>{v.key}</Option>)}</Select></Form.Item></Col>
                        <Col span={4}><Form.Item name="COUNT" label="count"><Select style={{ width: 100 }}>{[...tableinfo.columns, { key: '=1' }].map(v => <Option key={v.key} value={v.key}>{v.key}</Option>)}</Select></Form.Item></Col>
                        <Col span={4}>
                            <Form.Item name="TIME" label={<Tooltip title="可选。指定时间列后可使用时间轴播放"><span><ClockCircleOutlined /> 时间</span></Tooltip>}>
                                <Select style={{ width: 100 }} allowClear placeholder="无">
                                    {tableinfo.columns.map(v => <Option key={v.key} value={v.key}>{v.key}</Option>)}
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
                {tableinfo.totalRows > PREVIEW_LIMIT && (
                    <div style={{ marginBottom: 8, fontSize: 12, color: '#888' }}>
                        共 {tableinfo.totalRows.toLocaleString()} 行，预览前 {PREVIEW_LIMIT} 行
                    </div>
                )}
                <Table columns={tableinfo.columns} dataSource={tableinfo.data}
                    rowKey={() => nanoid()} scroll={{ x: '100%', y: 300 }} size='small'
                    pagination={false}
                    style={{ overflowX: 'auto', overflowY: 'auto' }} />
            </Modal>
        </>
    )
}
