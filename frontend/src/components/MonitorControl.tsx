/**
 * 监控控制组件
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  InputNumber,
  Switch,
  Button,
  Select,
  message,
  Alert,
  Divider,
  Space,
  Statistic,
  Row,
  Col,
} from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  SettingOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import api from '../services/api';
import { Wallet, MonitorConfig, MonitorStatus } from '../types';

const { Option } = Select;

const MonitorControl: React.FC = () => {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<string>('');
  const [config, setConfig] = useState<MonitorConfig | null>(null);
  const [status, setStatus] = useState<MonitorStatus>({
    isRunning: false,
    monitoredWallets: 0,
    activePositions: 0,
  });
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadWallets();
    loadStatus();
    const interval = setInterval(loadStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedWallet) {
      loadConfig(selectedWallet);
    }
  }, [selectedWallet]);

  const loadWallets = async () => {
    try {
      const response = await api.getWallets();
      if (response.success && response.data) {
        setWallets(response.data);
        if (response.data.length > 0 && !selectedWallet) {
          setSelectedWallet(response.data[0].address);
        }
      }
    } catch (error) {
      console.error('加载钱包失败:', error);
    }
  };

  const loadConfig = async (address: string) => {
    try {
      const response = await api.getMonitorConfig(address);
      if (response.success && response.data) {
        setConfig(response.data);
        form.setFieldsValue(response.data);
      }
    } catch (error) {
      console.error('加载配置失败:', error);
    }
  };

  const loadStatus = async () => {
    try {
      const response = await api.getMonitorStatus();
      if (response.success && response.data) {
        setStatus(response.data);
      }
    } catch (error) {
      console.error('加载状态失败:', error);
    }
  };

  const handleSaveConfig = async (values: any) => {
    if (!selectedWallet) {
      message.warning('请选择钱包');
      return;
    }

    setLoading(true);
    try {
      const response = await api.updateMonitorConfig(selectedWallet, values);
      if (response.success) {
        message.success('配置已保存');
        loadConfig(selectedWallet);
        loadStatus();
      }
    } catch (error) {
      message.error('保存配置失败');
      console.error('保存配置失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartMonitoring = async () => {
    try {
      const response = await api.startMonitoring();
      if (response.success) {
        message.success('监控服务已启动');
        loadStatus();
      }
    } catch (error) {
      message.error('启动监控失败');
      console.error('启动监控失败:', error);
    }
  };

  const handleStopMonitoring = async () => {
    try {
      const response = await api.stopMonitoring();
      if (response.success) {
        message.success('监控服务已停止');
        loadStatus();
      }
    } catch (error) {
      message.error('停止监控失败');
      console.error('停止监控失败:', error);
    }
  };

  return (
    <div>
      <h2>⚙️ 监控设置</h2>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="监控状态"
              value={status.isRunning ? '运行中' : '已停止'}
              valueStyle={{ color: status.isRunning ? '#3f8600' : '#888' }}
              prefix={<ThunderboltOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="监控钱包数"
              value={status.monitoredWallets}
              prefix={<SettingOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="活跃持仓数"
              value={status.activePositions}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="监控控制"
        extra={
          <Space>
            <Button
              type={status.isRunning ? 'default' : 'primary'}
              icon={<PlayCircleOutlined />}
              onClick={handleStartMonitoring}
              disabled={status.isRunning}
            >
              启动监控
            </Button>
            <Button
              danger
              icon={<PauseCircleOutlined />}
              onClick={handleStopMonitoring}
              disabled={!status.isRunning}
            >
              停止监控
            </Button>
          </Space>
        }
        style={{ marginBottom: 24 }}
      >
        <Alert
          message="监控服务说明"
          description={
            <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
              <li>启动监控后，系统将自动监控所有已启用监控的钱包</li>
              <li>实时检测代币价格变化，当达到盈利阈值时自动卖出</li>
              <li>监控其他钱包的大额买入，触发自动卖出</li>
              <li>所有交易日志都会被详细记录</li>
            </ul>
          }
          type="info"
          showIcon
        />
      </Card>

      <Card title="监控参数配置">
        <Form.Item label="选择钱包" style={{ marginBottom: 24 }}>
          <Select
            value={selectedWallet}
            onChange={setSelectedWallet}
            placeholder="请选择要配置的钱包"
            style={{ width: '100%' }}
          >
            {wallets.map((wallet) => (
              <Option key={wallet.address} value={wallet.address}>
                {wallet.label} ({wallet.address.slice(0, 8)}...{wallet.address.slice(-8)})
              </Option>
            ))}
          </Select>
        </Form.Item>

        {selectedWallet && (
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSaveConfig}
            initialValues={{
              profitThreshold: 30,
              bigBuyThreshold: 1.0,
              sellRatio: 1.0,
              enabled: false,
            }}
          >
            <Form.Item
              label="盈利百分比阈值（%）"
              name="profitThreshold"
              rules={[{ required: true, message: '请输入盈利阈值' }]}
              tooltip="当代币盈利达到此百分比时自动卖出"
            >
              <InputNumber
                min={1}
                max={1000}
                step={5}
                style={{ width: '100%' }}
                addonAfter="%"
              />
            </Form.Item>

            <Form.Item
              label="大额买入阈值（SOL）"
              name="bigBuyThreshold"
              rules={[{ required: true, message: '请输入买入阈值' }]}
              tooltip="监控其他钱包买入金额达到此阈值时触发卖出"
            >
              <InputNumber
                min={0.1}
                max={1000}
                step={0.1}
                style={{ width: '100%' }}
                addonAfter="SOL"
              />
            </Form.Item>

            <Form.Item
              label="卖出比例"
              name="sellRatio"
              rules={[{ required: true, message: '请输入卖出比例' }]}
              tooltip="触发卖出时卖出持仓的百分比（1.0 = 100%）"
            >
              <InputNumber
                min={0.1}
                max={1}
                step={0.1}
                style={{ width: '100%' }}
                formatter={(value) => `${(Number(value) * 100).toFixed(0)}%`}
                parser={(value) => Number(value?.replace('%', '')) / 100}
              />
            </Form.Item>

            <Divider />

            <Form.Item
              label="启用监控"
              name="enabled"
              valuePropName="checked"
              tooltip="开启后此钱包将被纳入监控"
            >
              <Switch
                checkedChildren="已启用"
                unCheckedChildren="已禁用"
              />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block>
                保存配置
              </Button>
            </Form.Item>
          </Form>
        )}
      </Card>

      <Card title="使用说明" style={{ marginTop: 24 }} size="small">
        <div style={{ lineHeight: 1.8 }}>
          <p><strong>1. 盈利百分比阈值：</strong></p>
          <p style={{ marginLeft: 20, color: '#666' }}>
            设置自动卖出的盈利目标。例如设置为 30%，当代币盈利达到 30% 时会自动卖出。
          </p>

          <p><strong>2. 大额买入阈值：</strong></p>
          <p style={{ marginLeft: 20, color: '#666' }}>
            监控其他地址对同一代币的买入行为。当检测到有地址买入金额超过阈值时，触发自动卖出。
          </p>

          <p><strong>3. 卖出比例：</strong></p>
          <p style={{ marginLeft: 20, color: '#666' }}>
            设置触发卖出时卖出持仓的百分比。设置为 100% 表示全部卖出，设置为 50% 表示卖出一半。
          </p>

          <p><strong>4. 执行速度：</strong></p>
          <p style={{ marginLeft: 20, color: '#666' }}>
            系统会在检测到触发条件后 2000ms 内完成卖出交易，确保快速执行。
          </p>
        </div>
      </Card>
    </div>
  );
};

export default MonitorControl;
