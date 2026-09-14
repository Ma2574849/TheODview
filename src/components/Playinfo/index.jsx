import React, { useEffect, useCallback, useRef, useState } from 'react';
import { Slider, Button, Select, Row, Col } from 'antd';
import { CaretRightOutlined, PauseOutlined, StepForwardOutlined, StepBackwardOutlined } from '@ant-design/icons';
import { useDispatch, useMappedState } from 'redux-react-hook';
import { setCurrentTime_tmp, setTimePlayback_tmp } from '@/redux/actions/traj';
import './index.css';

const { Option } = Select;

export default function Playinfo() {
    const dispatch = useDispatch();
    const mapState = useCallback(state => ({
        timeRange: state.traj.timeRange,
        currentTime: state.traj.currentTime,
        timePlayback: state.traj.timePlayback,
        globalDark: state.traj.globalDark,
    }), []);
    const { timeRange, currentTime, timePlayback, globalDark } = useMappedState(mapState);

    const [speed, setSpeed] = useState(1); // 播放速度倍率
    const timerRef = useRef(null);

    // 播放逻辑
    useEffect(() => {
        if (timePlayback && timeRange && timeRange.steps.length > 0) {
            const interval = Math.max(200, 1000 / speed);
            timerRef.current = setInterval(() => {
                dispatch(setCurrentTime_tmp(null)); // 标记需要前进一步
            }, interval);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [timePlayback, speed, timeRange, dispatch]);

    // 处理前进（用 null 标记触发）
    useEffect(() => {
        if (currentTime === null && timeRange && timeRange.steps.length > 0) {
            dispatch(setCurrentTime_tmp(timeRange.steps[0]));
            return;
        }
        // 自动前进时，currentTime 由 timer 回调更新
    }, []);

    // 前进到下一步
    const stepForward = useCallback(() => {
        if (!timeRange) return;
        const idx = timeRange.steps.indexOf(currentTime);
        if (idx < timeRange.steps.length - 1) {
            dispatch(setCurrentTime_tmp(timeRange.steps[idx + 1]));
        } else {
            // 循环播放
            dispatch(setCurrentTime_tmp(timeRange.steps[0]));
        }
    }, [currentTime, timeRange, dispatch]);

    const stepBackward = useCallback(() => {
        if (!timeRange) return;
        const idx = timeRange.steps.indexOf(currentTime);
        if (idx > 0) {
            dispatch(setCurrentTime_tmp(timeRange.steps[idx - 1]));
        }
    }, [currentTime, timeRange, dispatch]);

    // 播放 timer 触发前进
    useEffect(() => {
        if (timePlayback && timeRange) {
            const interval = Math.max(200, 1000 / speed);
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = setInterval(() => {
                stepForward();
            }, interval);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [timePlayback, speed, stepForward, timeRange]);

    const togglePlay = () => {
        dispatch(setTimePlayback_tmp(!timePlayback));
    };

    const handleSliderChange = (val) => {
        if (!timeRange) return;
        const idx = Math.min(val, timeRange.steps.length - 1);
        dispatch(setCurrentTime_tmp(timeRange.steps[idx]));
    };

    if (!timeRange || timeRange.steps.length === 0) {
        return null; // 没有时间数据时不显示
    }

    const currentIdx = timeRange.steps.indexOf(currentTime);
    const totalSteps = timeRange.steps.length;

    return (
        <div className={`playinfo-bar ${globalDark ? 'playinfo-dark' : ''}`}>
            <Row align="middle" gutter={8} wrap={false}>
                <Col flex="none">
                    <Button size="small" icon={<StepBackwardOutlined />} onClick={stepBackward} disabled={currentIdx <= 0} />
                </Col>
                <Col flex="none">
                    <Button size="small" type="primary"
                        icon={timePlayback ? <PauseOutlined /> : <CaretRightOutlined />}
                        onClick={togglePlay}
                    />
                </Col>
                <Col flex="none">
                    <Button size="small" icon={<StepForwardOutlined />} onClick={stepForward} />
                </Col>
                <Col flex="auto" style={{ minWidth: 120 }}>
                    <Slider
                        min={0}
                        max={totalSteps - 1}
                        value={currentIdx >= 0 ? currentIdx : 0}
                        onChange={handleSliderChange}
                        tipFormatter={(val) => timeRange.steps[val] || ''}
                    />
                </Col>
                <Col flex="none" className="playinfo-label">
                    {currentTime || '--'}
                </Col>
                <Col flex="none">
                    <Select size="small" value={speed} onChange={setSpeed} style={{ width: 62 }}>
                        <Option value={0.5}>0.5x</Option>
                        <Option value={1}>1x</Option>
                        <Option value={2}>2x</Option>
                        <Option value={5}>5x</Option>
                    </Select>
                </Col>
                <Col flex="none" className="playinfo-counter">
                    {currentIdx + 1} / {totalSteps}
                </Col>
            </Row>
        </div>
    );
}
