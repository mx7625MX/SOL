/**
 * 类型定义文件
 * 定义系统中使用的所有接口和类型
 */

export interface WalletInfo {
  id?: number;
  address: string;
  encryptedKey: string;
  createdAt: string;
  label?: string;
}

export interface TokenPosition {
  id?: number;
  walletAddress: string;
  tokenMint: string;
  tokenSymbol?: string;
  tokenName?: string;
  buyPrice: number;
  currentPrice: number;
  amount: number;
  buyTime: string;
  profitPercent: number;
  status: 'monitoring' | 'sold' | 'error';
}

export interface MonitorConfig {
  id?: number;
  walletAddress: string;
  profitThreshold: number; // 盈利百分比阈值
  bigBuyThreshold: number; // 大额买入阈值(SOL)
  sellRatio: number; // 卖出比例 (0.1-1.0)
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Transaction {
  id?: number;
  walletAddress: string;
  tokenMint: string;
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  signature: string;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: string;
  error?: string;
}

export interface WalletActivity {
  signature: string;
  type: 'buy' | 'sell';
  tokenMint: string;
  amount: number;
  solAmount: number;
  timestamp: number;
  slot: number;
}

export interface MonitoringState {
  isMonitoring: boolean;
  monitoredWallets: string[];
  activePositions: number;
  totalProfit: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
