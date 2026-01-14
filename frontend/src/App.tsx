/**
 * 主应用组件
 */

import React, { useState, useEffect } from 'react';
import { Layout, Menu, message, Badge } from 'antd';
import {
  DashboardOutlined,
  WalletOutlined,
  SettingOutlined,
  HistoryOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import Dashboard from './components/Dashboard';
import WalletManager from './components/WalletManager';
import PositionList from './components/PositionList';
import TransactionHistory from './components/TransactionHistory';
import MonitorControl from './components/MonitorControl';
import api from './services/api';
import ws from './services/websocket';
import './App.css';

const { Header, Sider, Content } = Layout;

type MenuItem = {
  key: string;
  icon: React.ReactNode;
  label: string;
};

const menuItems: MenuItem[] = [
  { key: '1', icon: <DashboardOutlined />, label: '监控看板' },
  { key: '2', icon: <WalletOutlined />, label: '钱包管理' },
  { key: '3', icon: <AppstoreOutlined />, label: '持仓管理' },
  { key: '4', icon: <HistoryOutlined />, label: '交易历史' },
  { key: '5', icon: <SettingOutlined />, label: '监控设置' },
];

const App: React.FC = () => {
  const [currentMenu, setCurrentMenu] = useState('1');
  const [isConnected, setIsConnected] = useState(false);
  const [monitorStatus, setMonitorStatus] = useState({
    isRunning: false,
    monitoredWallets: 0,
    activePositions: 0,
  });

  useEffect(() => {
    // 连接 WebSocket
    ws.connect();

    ws.on('connected', () => {
      setIsConnected(true);
      message.success('已连接到服务器');
    });

    ws.on('disconnected', () => {
      setIsConnected(false);
      message.warning('与服务器断开连接');
    });

    ws.on('price-updated', (data) => {
      console.log('价格更新:', data);
    });

    ws.on('sell-executed', (data) => {
      message.success(`卖出成功！代币: ${data.tokenMint.slice(0, 8)}..., 盈利: ${data.profitPercent.toFixed(2)}%`);
    });

    ws.on('sell-failed', (data) => {
      message.error(`卖出失败: ${data.error}`);
    });

    ws.on('new-position', (data) => {
      message.info(`检测到新持仓: ${data.tokenMint.slice(0, 8)}...`);
    });

    ws.on('big-buy-detected', (data) => {
      message.warning(`检测到大额买入！金额: ${data.solAmount} SOL`);
    });

    // 定期更新监控状态
    const updateStatus = async () => {
      try {
        const response = await api.getMonitorStatus();
        if (response.success && response.data) {
          setMonitorStatus(response.data);
        }
      } catch (error) {
        console.error('获取监控状态失败:', error);
      }
    };

    updateStatus();
    const interval = setInterval(updateStatus, 5000);

    return () => {
      clearInterval(interval);
      ws.disconnect();
    };
  }, []);

  const renderContent = () => {
    switch (currentMenu) {
      case '1':
        return <Dashboard />;
      case '2':
        return <WalletManager />;
      case '3':
        return <PositionList />;
      case '4':
        return <TransactionHistory />;
      case '5':
        return <MonitorControl />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        background: '#001529',
        padding: '0 24px'
      }}>
        <div style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>
          🤖 Solana 监控机器人
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <Badge status={isConnected ? 'success' : 'error'} text={isConnected ? '已连接' : '未连接'} style={{ color: 'white' }} />
          <Badge 
            status={monitorStatus.isRunning ? 'processing' : 'default'} 
            text={monitorStatus.isRunning ? '监控中' : '已停止'} 
            style={{ color: 'white' }} 
          />
        </div>
      </Header>
      <Layout>
        <Sider width={200} style={{ background: '#fff' }}>
          <Menu
            mode="inline"
            selectedKeys={[currentMenu]}
            style={{ height: '100%', borderRight: 0 }}
            items={menuItems}
            onClick={({ key }) => setCurrentMenu(key)}
          />
        </Sider>
        <Layout style={{ padding: '24px' }}>
          <Content
            style={{
              padding: 24,
              margin: 0,
              minHeight: 280,
              background: '#fff',
              borderRadius: '8px',
            }}
          >
            {renderContent()}
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
};

export default App;
