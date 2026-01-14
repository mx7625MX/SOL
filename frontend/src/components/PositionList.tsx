/**
 * 持仓列表组件
 */

import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Select, message } from 'antd';
import { RiseOutlined, FallOutlined } from '@ant-design/icons';
import api from '../services/api';
import { Position, Wallet } from '../types';
import dayjs from 'dayjs';

const { Option } = Select;

const PositionList: React.FC = () => {
  const [positions, setPositions] = useState<Position[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadWallets();
  }, []);

  useEffect(() => {
    loadPositions();
    const interval = setInterval(loadPositions, 10000);
    return () => clearInterval(interval);
  }, [selectedWallet]);

  const loadWallets = async () => {
    try {
      const response = await api.getWallets();
      if (response.success && response.data) {
        setWallets(response.data);
      }
    } catch (error) {
      console.error('加载钱包失败:', error);
    }
  };

  const loadPositions = async () => {
    setLoading(true);
    try {
      const response = selectedWallet === 'all'
        ? await api.getAllPositions()
        : await api.getPositions(selectedWallet);

      if (response.success && response.data) {
        setPositions(response.data);
      }
    } catch (error) {
      message.error('加载持仓失败');
      console.error('加载持仓失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: '钱包',
      dataIndex: 'walletAddress',
      key: 'walletAddress',
      render: (address: string) => {
        const wallet = wallets.find(w => w.address === address);
        return wallet ? wallet.label : `${address.slice(0, 8)}...`;
      },
    },
    {
      title: '代币',
      dataIndex: 'tokenSymbol',
      key: 'tokenSymbol',
      render: (symbol: string, record: Position) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{symbol || '未知'}</div>
          <div style={{ fontSize: '11px', color: '#888', fontFamily: 'monospace' }}>
            {record.tokenMint.slice(0, 12)}...
          </div>
        </div>
      ),
    },
    {
      title: '买入价',
      dataIndex: 'buyPrice',
      key: 'buyPrice',
      render: (price: number) => `$${price.toFixed(8)}`,
    },
    {
      title: '当前价',
      dataIndex: 'currentPrice',
      key: 'currentPrice',
      render: (price: number) => `$${price.toFixed(8)}`,
    },
    {
      title: '数量',
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
      render: (time: string) => dayjs(time).format('MM-DD HH:mm'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusMap: Record<string, { color: string; text: string }> = {
          monitoring: { color: 'processing', text: '监控中' },
          sold: { color: 'default', text: '已卖出' },
          error: { color: 'error', text: '错误' },
        };
        const info = statusMap[status] || statusMap.monitoring;
        return <Tag color={info.color}>{info.text}</Tag>;
      },
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2>📦 持仓管理</h2>
        <Select
          value={selectedWallet}
          onChange={setSelectedWallet}
          style={{ width: 300 }}
        >
          <Option value="all">全部钱包</Option>
          {wallets.map(wallet => (
            <Option key={wallet.address} value={wallet.address}>
              {wallet.label}
            </Option>
          ))}
        </Select>
      </div>

      <Card extra={<span style={{ color: '#888', fontSize: '12px' }}>每10秒自动更新</span>}>
        <Table
          columns={columns}
          dataSource={positions}
          rowKey={(record) => `${record.walletAddress}-${record.tokenMint}`}
          loading={loading}
          pagination={{ pageSize: 20 }}
        />
      </Card>
    </div>
  );
};

export default PositionList;
