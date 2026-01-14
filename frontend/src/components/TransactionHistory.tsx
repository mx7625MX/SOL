/**
 * 交易历史组件
 */

import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Select, Button, message } from 'antd';
import { ReloadOutlined, LinkOutlined } from '@ant-design/icons';
import api from '../services/api';
import { Transaction, Wallet } from '../types';
import dayjs from 'dayjs';

const { Option } = Select;

// 交易状态常量
const TRANSACTION_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  FAILED: 'failed',
} as const;

const TransactionHistory: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadWallets();
  }, []);

  useEffect(() => {
    if (selectedWallet) {
      loadTransactions();
    }
  }, [selectedWallet]);

  const loadWallets = async () => {
    try {
      const response = await api.getWallets();
      if (response.success && response.data && response.data.length > 0) {
        setWallets(response.data);
        setSelectedWallet(response.data[0].address);
      }
    } catch (error) {
      console.error('加载钱包失败:', error);
    }
  };

  const loadTransactions = async () => {
    if (!selectedWallet) return;

    setLoading(true);
    try {
      const response = await api.getTransactions(selectedWallet, 100);
      if (response.success && response.data) {
        setTransactions(response.data);
      }
    } catch (error) {
      message.error('加载交易历史失败');
      console.error('加载交易历史失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const openExplorer = (signature: string) => {
    window.open(`https://solscan.io/tx/${signature}`, '_blank');
  };

  const columns = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={type === 'buy' ? 'green' : 'orange'}>
          {type === 'buy' ? '买入' : '卖出'}
        </Tag>
      ),
    },
    {
      title: '代币',
      dataIndex: 'tokenMint',
      key: 'tokenMint',
      render: (mint: string) => (
        <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
          {mint.slice(0, 12)}...
        </span>
      ),
    },
    {
      title: '数量',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => amount.toFixed(4),
    },
    {
      title: '价格',
      dataIndex: 'price',
      key: 'price',
      render: (price: number) => `$${price.toFixed(8)}`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusMap: Record<string, { color: string; text: string }> = {
          [TRANSACTION_STATUS.PENDING]: { color: 'processing', text: '处理中' },
          [TRANSACTION_STATUS.CONFIRMED]: { color: 'success', text: '已确认' },
          [TRANSACTION_STATUS.FAILED]: { color: 'error', text: '失败' },
        };
        const info = statusMap[status] || statusMap[TRANSACTION_STATUS.PENDING];
        return <Tag color={info.color}>{info.text}</Tag>;
      },
    },
    {
      title: '交易签名',
      dataIndex: 'signature',
      key: 'signature',
      render: (sig: string) => (
        sig !== TRANSACTION_STATUS.FAILED ? (
          <Button
            type="link"
            size="small"
            icon={<LinkOutlined />}
            onClick={() => openExplorer(sig)}
          >
            查看详情
          </Button>
        ) : <span style={{ color: '#999' }}>-</span>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2>📜 交易历史</h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Select
            value={selectedWallet}
            onChange={setSelectedWallet}
            style={{ width: 300 }}
          >
            {wallets.map(wallet => (
              <Option key={wallet.address} value={wallet.address}>
                {wallet.label}
              </Option>
            ))}
          </Select>
          <Button
            icon={<ReloadOutlined />}
            onClick={loadTransactions}
            loading={loading}
          >
            刷新
          </Button>
        </div>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={transactions}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20 }}
        />
      </Card>
    </div>
  );
};

export default TransactionHistory;
