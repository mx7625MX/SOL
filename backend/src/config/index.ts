/**
 * 配置管理模块
 * 加载和管理应用程序配置
 */

import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  // Solana 配置
  rpcEndpoint: process.env.RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com',
  wsEndpoint: process.env.WS_ENDPOINT || 'wss://api.mainnet-beta.solana.com',
  
  // 服务器配置
  port: parseInt(process.env.PORT || '3001', 10),
  host: process.env.HOST || 'localhost',
  
  // 数据库配置
  dbPath: process.env.DB_PATH || path.join(__dirname, '../../data/monitor.db'),
  
  // 日志配置
  logLevel: process.env.LOG_LEVEL || 'info',
  logFile: process.env.LOG_FILE || path.join(__dirname, '../../logs/monitor.log'),
  
  // 交易配置
  defaultSlippage: parseFloat(process.env.DEFAULT_SLIPPAGE || '0.5'),
  maxRetry: parseInt(process.env.MAX_RETRY || '3', 10),
  transactionTimeout: parseInt(process.env.TRANSACTION_TIMEOUT || '30000', 10),
  
  // 监控配置
  priceUpdateInterval: 10000, // 10秒更新一次价格
  positionCheckInterval: 5000, // 5秒检查一次持仓
  bigBuyCheckInterval: 3000, // 3秒检查一次大额买入
};

export default config;
