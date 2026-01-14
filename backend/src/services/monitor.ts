/**
 * 监控服务
 * 核心监控逻辑：监控持仓盈利和其他钱包买入
 */

import { PublicKey, Keypair } from '@solana/web3.js';
import { EventEmitter } from 'events';
import db from './database';
import solanaService from './solana';
import WalletService from './wallet';
import logger from '../utils/logger';
import config from '../config';
import { TokenPosition, MonitorConfig, Transaction } from '../types';

export class MonitorService extends EventEmitter {
  private isRunning = false;
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();
  private subscriptions: Map<string, number> = new Map();

  constructor() {
    super();
  }

  /**
   * 启动监控服务
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('监控服务已在运行');
      return;
    }

    this.isRunning = true;
    logger.info('监控服务启动');

    // 获取所有启用的监控配置
    const configs = db.getEnabledMonitorConfigs();
    
    for (const monitorConfig of configs) {
      await this.startMonitoringWallet(monitorConfig);
    }

    this.emit('started');
  }

  /**
   * 停止监控服务
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    logger.info('监控服务停止');

    // 清除所有定时器
    for (const [walletAddress, interval] of this.monitoringIntervals) {
      clearInterval(interval);
      logger.info(`停止监控钱包: ${walletAddress}`);
    }
    this.monitoringIntervals.clear();

    // 取消所有订阅
    for (const [walletAddress, subscriptionId] of this.subscriptions) {
      await solanaService.unsubscribe(subscriptionId);
      logger.info(`取消订阅钱包: ${walletAddress}`);
    }
    this.subscriptions.clear();

    this.emit('stopped');
  }

  /**
   * 开始监控特定钱包
   */
  async startMonitoringWallet(monitorConfig: MonitorConfig): Promise<void> {
    const { walletAddress } = monitorConfig;

    if (this.monitoringIntervals.has(walletAddress)) {
      logger.warn(`钱包 ${walletAddress} 已在监控中`);
      return;
    }

    logger.info(`开始监控钱包: ${walletAddress}`);

    // 1. 启动持仓监控（检查盈利）
    const positionInterval = setInterval(async () => {
      await this.checkPositions(monitorConfig);
    }, config.positionCheckInterval);

    this.monitoringIntervals.set(walletAddress, positionInterval);

    // 2. 订阅新交易（检测新买入）
    try {
      const publicKey = new PublicKey(walletAddress);
      
      // 定期轮询新交易
      const txCheckInterval = setInterval(async () => {
        await this.checkNewTransactions(walletAddress);
      }, config.bigBuyCheckInterval);

      this.monitoringIntervals.set(`${walletAddress}_tx`, txCheckInterval);

    } catch (error) {
      logger.error(`订阅钱包失败 ${walletAddress}:`, error);
    }

    this.emit('wallet-monitoring-started', walletAddress);
  }

  /**
   * 停止监控特定钱包
   */
  async stopMonitoringWallet(walletAddress: string): Promise<void> {
    // 清除定时器
    const interval = this.monitoringIntervals.get(walletAddress);
    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(walletAddress);
    }

    const txInterval = this.monitoringIntervals.get(`${walletAddress}_tx`);
    if (txInterval) {
      clearInterval(txInterval);
      this.monitoringIntervals.delete(`${walletAddress}_tx`);
    }

    // 取消订阅
    const subscriptionId = this.subscriptions.get(walletAddress);
    if (subscriptionId !== undefined) {
      await solanaService.unsubscribe(subscriptionId);
      this.subscriptions.delete(walletAddress);
    }

    logger.info(`停止监控钱包: ${walletAddress}`);
    this.emit('wallet-monitoring-stopped', walletAddress);
  }

  /**
   * 检查持仓盈利情况
   */
  private async checkPositions(monitorConfig: MonitorConfig): Promise<void> {
    const { walletAddress, profitThreshold, sellRatio } = monitorConfig;

    try {
      // 获取所有活跃持仓
      const positions = db.getPositions(walletAddress);

      for (const position of positions) {
        // 更新当前价格
        const currentPrice = await solanaService.getTokenPrice(position.tokenMint);
        
        if (!currentPrice) {
          logger.warn(`无法获取代币价格: ${position.tokenMint}`);
          continue;
        }

        // 计算盈利百分比
        const profitPercent = ((currentPrice - position.buyPrice) / position.buyPrice) * 100;

        // 更新数据库
        db.upsertPosition({
          ...position,
          currentPrice,
          profitPercent,
        });

        // 发送价格更新事件
        this.emit('price-updated', {
          walletAddress,
          tokenMint: position.tokenMint,
          currentPrice,
          profitPercent,
        });

        // 检查是否达到盈利阈值
        if (profitPercent >= profitThreshold) {
          logger.info(
            `代币 ${position.tokenSymbol || position.tokenMint} 达到盈利阈值: ${profitPercent.toFixed(2)}%`
          );

          // 执行自动卖出
          await this.executeSell(
            walletAddress,
            position.tokenMint,
            position.amount * sellRatio,
            profitPercent,
            'profit_target'
          );
        }
      }
    } catch (error) {
      logger.error(`检查持仓失败 (${walletAddress}):`, error);
    }
  }

  /**
   * 检查新交易（检测买入）
   */
  private async checkNewTransactions(walletAddress: string): Promise<void> {
    try {
      const publicKey = new PublicKey(walletAddress);
      const signatures = await solanaService.getRecentTransactions(publicKey, 5);

      for (const sig of signatures) {
        // 获取交易详情
        const tx = await solanaService.getTransaction(sig.signature);
        
        if (!tx) continue;

        // 分析交易，检测代币买入
        const buyInfo = this.analyzeBuyTransaction(tx);
        
        if (buyInfo) {
          logger.info(
            `检测到买入: ${buyInfo.tokenMint}, 金额: ${buyInfo.amount}, SOL: ${buyInfo.solAmount}`
          );

          // 创建或更新持仓记录
          const metadata = await solanaService.getTokenMetadata(buyInfo.tokenMint);
          
          db.upsertPosition({
            walletAddress,
            tokenMint: buyInfo.tokenMint,
            tokenSymbol: metadata?.symbol,
            tokenName: metadata?.name,
            buyPrice: buyInfo.price,
            currentPrice: buyInfo.price,
            amount: buyInfo.amount,
            buyTime: new Date().toISOString(),
            profitPercent: 0,
            status: 'monitoring',
          });

          this.emit('new-position', {
            walletAddress,
            tokenMint: buyInfo.tokenMint,
            amount: buyInfo.amount,
            price: buyInfo.price,
          });
        }
      }
    } catch (error) {
      logger.error(`检查新交易失败 (${walletAddress}):`, error);
    }
  }

  /**
   * 分析交易，判断是否为买入
   */
  private analyzeBuyTransaction(tx: any): { 
    tokenMint: string; 
    amount: number; 
    solAmount: number;
    price: number;
  } | null {
    try {
      // 这里需要根据实际的交易结构来解析
      // 通常买入交易会包含 SOL 转出和 Token 转入
      
      // 简化实现：检查是否有 token transfer
      const postTokenBalances = tx.meta?.postTokenBalances || [];
      const preTokenBalances = tx.meta?.preTokenBalances || [];

      // 查找新增的代币余额
      for (const postBalance of postTokenBalances) {
        const preBalance = preTokenBalances.find(
          (b: any) => b.accountIndex === postBalance.accountIndex
        );

        if (!preBalance || postBalance.uiTokenAmount.uiAmount > preBalance.uiTokenAmount.uiAmount) {
          const amount = postBalance.uiTokenAmount.uiAmount - (preBalance?.uiTokenAmount.uiAmount || 0);
          
          // 估算使用的 SOL 数量
          const preLamports = tx.meta?.preBalances?.[0] || 0;
          const postLamports = tx.meta?.postBalances?.[0] || 0;
          const solAmount = (preLamports - postLamports) / LAMPORTS_PER_SOL;

          if (solAmount > 0 && amount > 0) {
            return {
              tokenMint: postBalance.mint,
              amount,
              solAmount,
              price: solAmount / amount,
            };
          }
        }
      }

      return null;
    } catch (error) {
      logger.error('分析交易失败:', error);
      return null;
    }
  }

  /**
   * 执行卖出
   */
  private async executeSell(
    walletAddress: string,
    tokenMint: string,
    amount: number,
    profitPercent: number,
    reason: string
  ): Promise<void> {
    const startTime = Date.now();

    try {
      logger.info(`开始执行卖出: ${tokenMint}, 数量: ${amount}, 原因: ${reason}`);

      // 获取钱包密钥
      const walletInfo = db.getWallet(walletAddress);
      if (!walletInfo) {
        throw new Error('钱包不存在');
      }

      const keypair = WalletService.decryptPrivateKey(walletInfo.encryptedKey);

      // 获取当前价格
      const currentPrice = await solanaService.getTokenPrice(tokenMint);
      if (!currentPrice) {
        throw new Error('无法获取当前价格');
      }

      // 执行卖出交易
      const signature = await solanaService.sellToken(
        keypair,
        tokenMint,
        amount,
        config.defaultSlippage
      );

      const executionTime = Date.now() - startTime;

      logger.info(
        `卖出成功! 签名: ${signature}, 执行时间: ${executionTime}ms, 盈利: ${profitPercent.toFixed(2)}%`
      );

      // 记录交易
      db.addTransaction({
        walletAddress,
        tokenMint,
        type: 'sell',
        amount,
        price: currentPrice,
        signature,
        status: 'confirmed',
        timestamp: new Date().toISOString(),
      });

      // 更新持仓状态
      db.updatePositionStatus(walletAddress, tokenMint, 'sold');

      // 发送事件
      this.emit('sell-executed', {
        walletAddress,
        tokenMint,
        amount,
        price: currentPrice,
        profitPercent,
        signature,
        executionTime,
        reason,
      });

    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.error(`卖出失败: ${error}, 执行时间: ${executionTime}ms`);

      // 记录失败的交易
      db.addTransaction({
        walletAddress,
        tokenMint,
        type: 'sell',
        amount,
        price: 0,
        signature: 'failed',
        status: 'failed',
        timestamp: new Date().toISOString(),
        error: (error as Error).message,
      });

      this.emit('sell-failed', {
        walletAddress,
        tokenMint,
        amount,
        error: (error as Error).message,
        executionTime,
      });
    }
  }

  /**
   * 监控其他钱包的大额买入
   */
  async monitorOtherWallets(
    targetWallets: string[],
    tokenMint: string,
    threshold: number
  ): Promise<void> {
    logger.info(`开始监控其他钱包的大额买入: ${tokenMint}, 阈值: ${threshold} SOL`);

    for (const wallet of targetWallets) {
      try {
        const publicKey = new PublicKey(wallet);
        const signatures = await solanaService.getRecentTransactions(publicKey, 10);

        for (const sig of signatures) {
          const tx = await solanaService.getTransaction(sig.signature);
          if (!tx) continue;

          const buyInfo = this.analyzeBuyTransaction(tx);
          
          if (buyInfo && buyInfo.tokenMint === tokenMint && buyInfo.solAmount >= threshold) {
            logger.info(
              `检测到大额买入! 钱包: ${wallet}, 金额: ${buyInfo.solAmount} SOL`
            );

            this.emit('big-buy-detected', {
              wallet,
              tokenMint,
              amount: buyInfo.amount,
              solAmount: buyInfo.solAmount,
              signature: sig.signature,
            });
          }
        }
      } catch (error) {
        logger.error(`监控钱包失败 ${wallet}:`, error);
      }
    }
  }

  /**
   * 获取监控状态
   */
  getStatus(): {
    isRunning: boolean;
    monitoredWallets: number;
    activePositions: number;
  } {
    const activePositions = db.getAllActivePositions().length;

    return {
      isRunning: this.isRunning,
      monitoredWallets: this.monitoringIntervals.size / 2, // 每个钱包有2个定时器
      activePositions,
    };
  }
}

// 导出单例
export const monitorService = new MonitorService();
export default monitorService;
