/**
 * API 服务
 */

import axios, { AxiosInstance } from 'axios';
import { Wallet, MonitorConfig, Position, Transaction, MonitorStatus, ApiResponse } from '../types';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: '/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 响应拦截器
    this.client.interceptors.response.use(
      (response) => response.data,
      (error) => {
        console.error('API 错误:', error);
        throw error;
      }
    );
  }

  // ==================== 钱包相关 ====================

  async importWallet(type: string, data: string, label?: string): Promise<ApiResponse> {
    return this.client.post('/wallet/import', { type, data, label });
  }

  async getWallets(): Promise<ApiResponse<Wallet[]>> {
    return this.client.get('/wallet/list');
  }

  async deleteWallet(address: string): Promise<ApiResponse> {
    return this.client.delete(`/wallet/${address}`);
  }

  // ==================== 监控配置相关 ====================

  async getMonitorConfig(address: string): Promise<ApiResponse<MonitorConfig>> {
    return this.client.get(`/monitor/config/${address}`);
  }

  async updateMonitorConfig(address: string, config: Partial<MonitorConfig>): Promise<ApiResponse<MonitorConfig>> {
    return this.client.put(`/monitor/config/${address}`, config);
  }

  // ==================== 持仓相关 ====================

  async getPositions(address: string): Promise<ApiResponse<Position[]>> {
    return this.client.get(`/positions/${address}`);
  }

  async getAllPositions(): Promise<ApiResponse<Position[]>> {
    return this.client.get('/positions');
  }

  // ==================== 交易相关 ====================

  async getTransactions(address: string, limit?: number): Promise<ApiResponse<Transaction[]>> {
    return this.client.get(`/transactions/${address}`, { params: { limit } });
  }

  // ==================== 监控控制相关 ====================

  async startMonitoring(): Promise<ApiResponse> {
    return this.client.post('/monitor/start');
  }

  async stopMonitoring(): Promise<ApiResponse> {
    return this.client.post('/monitor/stop');
  }

  async getMonitorStatus(): Promise<ApiResponse<MonitorStatus>> {
    return this.client.get('/monitor/status');
  }

  // ==================== 系统相关 ====================

  async checkHealth(): Promise<ApiResponse> {
    return this.client.get('/health');
  }
}

export const api = new ApiService();
export default api;
