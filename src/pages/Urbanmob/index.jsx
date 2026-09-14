import React, { useState, useEffect, useCallback } from 'react'
import { Layout, Modal, Typography, Table, Button, Drawer } from 'antd';
import { useDispatch, useMappedState } from 'redux-react-hook'
import { setconfig_tmp, setMapStyle_tmp, setGlobalDark_tmp, setSelectedLocation_tmp, setViewState_tmp } from '@/redux/actions/traj'
import { decodeStateFromUrl } from '@/utils/shareUrl';

import Deckmap from '@@/Deckmap';
import MyHeader from '@@/Header'
import Panelpage from './Panelpage';
import Playinfo from '@@/Playinfo';
import 'antd/dist/antd.css';
import './index.css';

const { Sider } = Layout;
const { Title, Paragraph, Text } = Typography;

const formatColumns = [
    { title: '列名', dataIndex: 'col', key: 'col', render: t => <Text code>{t}</Text> },
    { title: '说明', dataIndex: 'desc', key: 'desc' },
    { title: '必填', dataIndex: 'required', key: 'required' },
];
const formatData = [
    { key: '1', col: 'slon', desc: '起点经度', required: '是' },
    { key: '2', col: 'slat', desc: '起点纬度', required: '是' },
    { key: '3', col: 'elon', desc: '终点经度', required: '是' },
    { key: '4', col: 'elat', desc: '终点纬度', required: '是' },
    { key: '5', col: 'count', desc: '流量计数', required: '否' },
    { key: '6', col: 'time', desc: '时间列（启用时间轴播放）', required: '否' },
];
const shortcutColumns = [
    { title: '按键', dataIndex: 'key', key: 'key', render: t => <Text keyboard>{t}</Text> },
    { title: '功能', dataIndex: 'desc', key: 'desc' },
];
const shortcutData = [
    { id: '1', key: '?', desc: '打开帮助面板' },
    { id: '2', key: 'Esc', desc: '关闭弹窗' },
    { id: '3', key: '鼠标左键拖拽', desc: '平移地图' },
    { id: '4', key: '鼠标右键拖拽', desc: '旋转视角' },
    { id: '5', key: '滚轮', desc: '缩放地图' },
    { id: '6', key: '点击节点', desc: '筛选该节点相关流向' },
];

export default function Urbanmob() {
    const dispatch = useDispatch();
    const mapState = useCallback(state => ({
        showPanel: state.traj.showPanel,
        globalDark: state.traj.globalDark,
        timeRange: state.traj.timeRange,
    }), []);
    const { showPanel, globalDark, timeRange } = useMappedState(mapState);

    const [welcomeVisible, setWelcomeVisible] = useState(false);
    const [helpVisible, setHelpVisible] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [drawerVisible, setDrawerVisible] = useState(false);

    // 从 URL hash 恢复分享状态
    useEffect(() => {
        const shared = decodeStateFromUrl();
        if (shared) {
            if (shared.config) dispatch(setconfig_tmp(shared.config));
            if (shared.mapStyle) dispatch(setMapStyle_tmp(shared.mapStyle));
            if (shared.globalDark) dispatch(setGlobalDark_tmp(shared.globalDark));
            if (shared.selectedLocation) dispatch(setSelectedLocation_tmp(shared.selectedLocation));
            if (shared.viewState) dispatch(setViewState_tmp(shared.viewState));
            // 有分享链接时不显示欢迎弹窗
        } else {
            const hasVisited = sessionStorage.getItem('odview_visited');
            if (!hasVisited) { setWelcomeVisible(true); sessionStorage.setItem('odview_visited', '1'); }
        }
    }, [dispatch]);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.key === '?' || e.key === '/') && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault(); setHelpVisible(true);
            }
            if (e.key === 'Escape') { setHelpVisible(false); setWelcomeVisible(false); }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const panelContent = (
        <Layout>
            <MyHeader />
            <div style={showPanel ? {} : { height: '0px', overflowY: 'hidden' }}>
                <Panelpage />
            </div>
        </Layout>
    );

    const rootClass = globalDark ? 'odview-root odview-dark' : 'odview-root';

    return (
        <div className={rootClass}>
            <Layout>
                {isMobile ? (
                    <>
                        <div className="mobile-header">
                            <Button type="primary" size="small" onClick={() => setDrawerVisible(true)} className="mobile-menu-btn">设置面板</Button>
                            <Button size="small" onClick={() => setHelpVisible(true)} className="mobile-help-btn">帮助</Button>
                        </div>
                        <Drawer title="ODview" placement="left" width="85vw"
                            onClose={() => setDrawerVisible(false)} visible={drawerVisible}
                            bodyStyle={{ padding: 0 }} className={globalDark ? 'odview-dark' : ''}>
                            {panelContent}
                        </Drawer>
                    </>
                ) : (
                    <Sider width={showPanel ? '45%' : '50px'} className="panel">
                        {panelContent}
                    </Sider>
                )}
                <Deckmap />
            </Layout>

            {/* 时间轴播放条 */}
            <Playinfo />

            {/* 欢迎弹窗 */}
            <Modal title="ODview 交通出行可视化分析系统"
                visible={welcomeVisible} onCancel={() => setWelcomeVisible(false)} width={600}
                className={globalDark ? 'odview-dark' : ''}
                footer={[
                    <Button key="help" onClick={() => { setWelcomeVisible(false); setHelpVisible(true); }}>操作帮助</Button>,
                    <Button key="start" type="primary" onClick={() => setWelcomeVisible(false)}>开始使用</Button>,
                ]}>
                <Typography>
                    <Paragraph>ODview 是一个 OD 数据可视化分析工具。支持导入 CSV 格式的 OD 数据，在地图上以流线形式展示出行流向、流量分布和空间聚类。</Paragraph>
                    <Paragraph>系统已加载示例数据。你可以直接在右侧地图上查看效果，也可以在左侧面板导入自己的数据。数据含时间列时，底部会出现时间轴播放控件。</Paragraph>
                    <Title level={5}>数据格式</Title>
                    <Table columns={formatColumns} dataSource={formatData} pagination={false} size="small" bordered />
                    <Paragraph style={{ marginTop: 12, color: '#888', fontSize: 13 }}>也支持 GeoJSON 矢量图层叠加。</Paragraph>
                </Typography>
            </Modal>

            {/* 帮助弹窗 */}
            <Modal title="操作帮助" visible={helpVisible} onCancel={() => setHelpVisible(false)} width={480}
                className={globalDark ? 'odview-dark' : ''}
                footer={[<Button key="close" type="primary" onClick={() => setHelpVisible(false)}>关闭</Button>]}>
                <Typography>
                    <Title level={5}>快捷操作</Title>
                    <Table columns={shortcutColumns} dataSource={shortcutData} pagination={false} size="small" bordered rowKey="id" />
                    <Title level={5} style={{ marginTop: 16 }}>功能说明</Title>
                    <Paragraph><Text strong>时间轴播放</Text> — 如果导入的 CSV 含时间列（如 hour、date），底部会出现播放条，可自动播放或手动拖拽，观察流向随时间的变化。</Paragraph>
                    <Paragraph><Text strong>节点筛选</Text> — 点击地图上的节点，仅显示该节点的进出流向。再次点击或在面板中清除。</Paragraph>
                    <Paragraph><Text strong>分享链接</Text> — 在导出面板中点击「复制分享链接」，当前的配色、视角、筛选条件会编码在链接中，对方打开即可看到同样的视图。</Paragraph>
                    <Paragraph><Text strong>独立 HTML</Text> — 导出为自包含的 HTML 文件，无需服务器即可在浏览器中交互查看，适合发邮件或嵌入报告。</Paragraph>
                </Typography>
            </Modal>
        </div>
    )
}
