/**
 * 钱包管理组件
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Table,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm,
  Tag,
  Space,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  WalletOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import api from '../services/api';
import { Wallet } from '../types';

const { TextArea } = Input;
const { Option } = Select;

const WalletManager: React.FC = () => {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadWallets();
  }, []);

  const loadWallets = async () => {
    setLoading(true);
    try {
      const response = await api.getWallets();
      if (response.success && response.data) {
        setWallets(response.data);
      }
    } catch (error) {
      message.error('加载钱包失败');
      console.error('加载钱包失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (values: any) => {
    try {
      const response = await api.importWallet(values.type, values.data, values.label);
      if (response.success) {
        message.success('钱包导入成功！');
        setModalVisible(false);
        form.resetFields();
        loadWallets();
      } else {
        message.error(response.error || '导入失败');
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || '导入失败');
      console.error('导入钱包失败:', error);
    }
  };

  const handleDelete = async (address: string) => {
    try {
      const response = await api.deleteWallet(address);
      if (response.success) {
        message.success('钱包已删除');
        loadWallets();
      }
    } catch (error) {
      message.error('删除失败');
      console.error('删除钱包失败:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success('已复制到剪贴板');
  };

  const columns = [
    {
      title: '标签',
      dataIndex: 'label',
      key: 'label',
      render: (label: string) => (
        <Tag icon={<WalletOutlined />} color="blue">
          {label}
        </Tag>
      ),
    },
    {
      title: '钱包地址',
      dataIndex: 'address',
      key: 'address',
      render: (address: string) => (
        <Space>
          <span style={{ fontFamily: 'monospace' }}>
            {address.slice(0, 8)}...{address.slice(-8)}
          </span>
          <Button
            type="link"
            size="small"
            icon={<CopyOutlined />}
            onClick={() => copyToClipboard(address)}
          />
        </Space>
      ),
    },
    {
      title: 'SOL 余额',
      dataIndex: 'balance',
      key: 'balance',
      render: (balance: number) => (
        <Tag color={balance > 0 ? 'green' : 'default'}>
          {balance.toFixed(4)} SOL
        </Tag>
      ),
    },
    {
      title: '导入时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (time: string) => new Date(time).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Wallet) => (
        <Space>
          <Popconfirm
            title="确定要删除这个钱包吗？"
            description="删除后无法恢复，请确保已备份私钥。"
            onConfirm={() => handleDelete(record.address)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />} size="small">
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2>💼 钱包管理</h2>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setModalVisible(true)}
        >
          导入钱包
        </Button>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={wallets}
          rowKey="address"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="导入钱包"
        open={modalVisible}
        onOk={() => form.submit()}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        width={600}
        okText="导入"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" onFinish={handleImport}>
          <Form.Item
            label="钱包类型"
            name="type"
            rules={[{ required: true, message: '请选择钱包类型' }]}
            initialValue="mnemonic"
          >
            <Select>
              <Option value="mnemonic">助记词（12/24个单词）</Option>
              <Option value="privateKey">私钥（Base58格式）</Option>
              <Option value="phantom">Phantom 钱包导出</Option>
              <Option value="okx">OKX 欧易钱包导出</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="钱包数据"
            name="data"
            rules={[{ required: true, message: '请输入钱包数据' }]}
          >
            <TextArea
              rows={4}
              placeholder="输入助记词或私钥&#10;&#10;助记词示例：abandon abandon abandon ... (12或24个单词)&#10;私钥示例：3J2b... (Base58格式，请勿输入真实私钥作为示例)"
            />
          </Form.Item>

          <Form.Item
            label="钱包标签（可选）"
            name="label"
          >
            <Input placeholder="例如：我的交易钱包" />
          </Form.Item>

          <div style={{ background: '#fff3cd', padding: '12px', borderRadius: '4px', marginTop: 16 }}>
            <p style={{ margin: 0, color: '#856404', fontSize: '14px' }}>
              ⚠️ <strong>安全提示：</strong>
            </p>
            <ul style={{ marginTop: 8, marginBottom: 0, color: '#856404', fontSize: '12px' }}>
              <li>私钥和助记词将被加密存储在本地数据库中</li>
              <li>请确保您的电脑安全，避免病毒和恶意软件</li>
              <li>建议使用专门的交易钱包，不要使用存放大量资金的主钱包</li>
              <li>请妥善备份您的私钥和助记词</li>
            </ul>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default WalletManager;
