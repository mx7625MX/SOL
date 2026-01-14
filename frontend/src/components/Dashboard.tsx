/**
 * 监控看板组件
 */

import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Progress } from 'antd';
import {
  RiseOutlined,
  FallOutlined,
  DollarOutlined,
  AppstoreOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import api from '../services/api';
import { Position } from '../types';
import dayjs from 'dayjs';

const Dashboard: React.FC = () => {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalPositions: 0,
    profitableCount: 0,
    totalProfit: 0,
    averageProfit: 0,
  });

  useEffect(() => {
    loadPositions();
    const interval = setInterval(loadPositions, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadPositions = async () => {
    setLoading(true);
    try {
      const response = await api.getAllPositions();
      if (response.success && response.data) {
        setPositions(response.data);
        calculateStats(response.data);
      }
    } catch (error) {
      console.error('加载持仓失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (positions: Position[]) => {
    const totalPositions = positions.length;
    const profitableCount = positions.filter(p => p.profitPercent > 0).length;
    const totalProfit = positions.reduce((sum, p) => sum + p.profitPercent, 0);
    const averageProfit = totalPositions > 0 ? totalProfit / totalPositions : 0;

    setStats({
      totalPositions,
      profitableCount,
      totalProfit,
      averageProfit,
    });
  };

  const columns = [
    {
      title: '代币',
      dataIndex: 'tokenSymbol',
      key: 'tokenSymbol',
      render: (symbol: string, record: Position) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{symbol || '未知'}</div>
          <div style={{ fontSize: '12px', color: '#888' }}>
            {record.tokenMint.slice(0, 8)}...
          </div>
        </div>
      ),
    },
    {
      title: '买入价格',
      dataIndex: 'buyPrice',
      key: 'buyPrice',
      render: (price: number) => `$${price.toFixed(6)}`,
    },
    {
      title: '当前价格',
      dataIndex: 'currentPrice',
      key: 'currentPrice',
      render: (price: number) => `$${price.toFixed(6)}`,
    },
    {
      title: '持仓数量',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => amount.toFixed(2),
    },
    {
      title: '盈亏',
      dataIndex: 'profitPercent',
      key: 'profitPercent',
      render: (profit: number) => (
        <Tag color={profit >= 0 ? 'green' : 'red'} icon={profit >= 0 ? <RiseOutlined /> : <FallOutlined />}>
          {profit >= 0 ? '+' : ''}{profit.toFixed(2)}%
        </Tag>
      ),
      sorter: (a: Position, b: Position) => a.profitPercent - b.profitPercent,
    },
    {
      title: '买入时间',
      dataIndex: 'buyTime',
      key: 'buyTime',
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusMap = {
          monitoring: { color: 'blue', text: '监控中' },
          sold: { color: 'default', text: '已卖出' },
          error: { color: 'red', text: '错误' },
        };
        const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.monitoring;
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
      },
    },
  ];

  return (
    <div>
      <h2>📊 监控看板</h2>
      
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总持仓数"
              value={stats.totalPositions}
              prefix={<AppstoreOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="盈利持仓"
              value={stats.profitableCount}
              valueStyle={{ color: '#3f8600' }}
              prefix={<RiseOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="平均盈亏"
              value={stats.averageProfit}
              precision={2}
              valueStyle={{ color: stats.averageProfit >= 0 ? '#3f8600' : '#cf1322' }}
              prefix={stats.averageProfit >= 0 ? <RiseOutlined /> : <FallOutlined />}
              suffix="%"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="活跃监控"
              value={stats.totalPositions}
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="实时持仓" extra={<span style={{ color: '#888', fontSize: '12px' }}>每10秒自动更新</span>}>
        <Table
          columns={columns}
          dataSource={positions}
          rowKey={(record) => `${record.walletAddress}-${record.tokenMint}`}
          loading={loading}
          pagination={{ pageSize: 10 }}
          size="small"
        />
      </Card>

      <Row gutter={16} style={{ marginTop: 24 }}>
        <Col span={12}>
          <Card title="盈利分布" size="small">
            <div style={{ padding: '16px 0' }}>
              {positions.filter(p => p.profitPercent !== 0).map((position, index) => (
                <div key={index} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>{position.tokenSymbol || '未知'}</span>
                    <span style={{ color: position.profitPercent >= 0 ? '#3f8600' : '#cf1322' }}>
                      {position.profitPercent >= 0 ? '+' : ''}{position.profitPercent.toFixed(2)}%
                    </span>
                  </div>
                  <Progress
                    percent={Math.abs(position.profitPercent)}
                    strokeColor={position.profitPercent >= 0 ? '#52c41a' : '#ff4d4f'}
                    showInfo={false}
                  />
                </div>
              ))}
              {positions.filter(p => p.profitPercent !== 0).length === 0 && (
                <div style={{ textAlign: 'center', color: '#888' }}>暂无数据</div>
              )}
            </div>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="快速统计" size="small">
            <div style={{ padding: '16px' }}>
              <Row gutter={16}>
                <Col span={12}>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ color: '#888', marginBottom: 4 }}>最大盈利</div>
                    <div style={{ fontSize: '20px', color: '#3f8600', fontWeight: 'bold' }}>
                      +{positions.length > 0 ? Math.max(...positions.map(p => p.profitPercent)).toFixed(2) : '0.00'}%
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ color: '#888', marginBottom: 4 }}>最大亏损</div>
                    <div style={{ fontSize: '20px', color: '#cf1322', fontWeight: 'bold' }}>
                      {positions.length > 0 ? Math.min(...positions.map(p => p.profitPercent)).toFixed(2) : '0.00'}%
                    </div>
                  </div>
                </Col>
              </Row>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
