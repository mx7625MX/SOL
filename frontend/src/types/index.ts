/**
 * 类型定义
 */

export interface Wallet {
  address: string;
  label: string;
  balance: number;
  createdAt: string;
}

export interface Position {
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
  walletAddress: string;
  profitThreshold: number;
  bigBuyThreshold: number;
  sellRatio: number;
  enabled: boolean;
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

export interface MonitorStatus {
  isRunning: boolean;
  monitoredWallets: number;
  activePositions: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface WebSocketMessage {
  type: string;
  data?: any;
  timestamp: string;
}
