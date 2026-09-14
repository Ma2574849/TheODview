import React, { useCallback } from 'react'
import { PageHeader, Menu, Dropdown, Button } from 'antd';
import { SettingOutlined, UpOutlined, DownOutlined, GlobalOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { useDispatch, useMappedState } from 'redux-react-hook'
import { setMapStyle_tmp, setShowPanel_tmp } from '@/redux/actions/traj'
import './index.css';

const { SubMenu } = Menu;

export default function Header(props) {
    const dispatch = useDispatch()

    // P2: 从 Redux 读取 showPanel 状态
    const mapState = useCallback(state => ({ showPanel: state.traj.showPanel }), []);
    const { showPanel } = useMappedState(mapState);

    function toggleCollapsed() {
        dispatch(setShowPanel_tmp(!showPanel))
    }

    // P2: 底图切换改用 Redux dispatch
    const handleMapStyle = (styleKey) => {
        dispatch(setMapStyle_tmp(styleKey))
    }

    const menu = (
        <Menu>
            <SubMenu key='Mapstyle' title="地图样式" icon={<GlobalOutlined />}>
                <Menu.Item key="dark" onClick={() => handleMapStyle("clvlrr1re03yv01phbhwge3k3")}>黑色底图（中文）</Menu.Item>
                <Menu.Item key="dark2" onClick={() => handleMapStyle("cjetnd20i1vbi2qqxbh0by7p8")}>黑色底图（英语）</Menu.Item>
                <Menu.Item key="light" onClick={() => handleMapStyle("cl38pr5lx001f15nyyersk7in")}>白色底图（中文）</Menu.Item>
                <Menu.Item key="light2" onClick={() => handleMapStyle("ckwfx658z4dpb14ocnz6tky9d")}>白色底图（英语）</Menu.Item>
                <Menu.Item key="satellite" onClick={() => handleMapStyle("cjv36gyklf43q1fnuwibiuetl")}>卫星地图</Menu.Item>
                <Menu.Item key="outdoors" onClick={() => handleMapStyle("outdoors-v10")}>街道</Menu.Item>
            </SubMenu>
        </Menu>
    );

    return (
        <>
            {showPanel ? <PageHeader
                className="site-page-header"
                key="site-page-header"
                title="ODview"
                subTitle='交通出行可视化分析系统'
                avatar={{ src: 'images/logodark_3durbanmob.png', shape: 'square' }}
                {...props}
                extra={[
                    <div key='settings1' className="header-actions">
                        <Button key='help' type="text" onClick={() => {
                            // 触发全局键盘事件来打开帮助
                            window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }));
                        }}>
                            <QuestionCircleOutlined />
                        </Button>
                        <Dropdown key='settings' overlay={menu} trigger={['click']}>
                            <Button key='Settingbuttom' type="text">
                                <SettingOutlined />
                            </Button>
                        </Dropdown>
                        <Button key='navicollapsed' type="text" onClick={toggleCollapsed}>
                            {React.createElement(showPanel ? UpOutlined : DownOutlined)}
                        </Button>
                    </div>
                ]}
            >
            </PageHeader> : <Button key='navicollapsed' type="text" onClick={toggleCollapsed}>
                {React.createElement(showPanel ? UpOutlined : DownOutlined)}
            </Button>}
        </>
    )
}
