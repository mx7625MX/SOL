/**
 * API 路由
 * 定义所有的 REST API 端点
 */

import express, { Request, Response } from 'express';
import { PublicKey } from '@solana/web3.js';
import db from '../services/database';
import WalletService from '../services/wallet';
import solanaService from '../services/solana';
import monitorService from '../services/monitor';
import logger from '../utils/logger';
import { ApiResponse, WalletInfo, MonitorConfig } from '../types';

const router = express.Router();

// ==================== 钱包路由 ====================

/**
 * 导入钱包
 * POST /api/wallet/import
 */
router.post('/wallet/import', async (req: Request, res: Response) => {
  try {
    const { type, data, label } = req.body;

    if (!type || !data) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数',
      } as ApiResponse);
    }

    let keypair;

    // 根据类型导入钱包
    switch (type) {
      case 'mnemonic':
        keypair = WalletService.fromMnemonic(data);
        break;
      case 'privateKey':
        keypair = WalletService.fromPrivateKey(data);
        break;
      case 'phantom':
        keypair = WalletService.fromPhantom(data);
        break;
      case 'okx':
        keypair = WalletService.fromOKX(data);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: '不支持的钱包类型',
        } as ApiResponse);
    }

    const address = keypair.publicKey.toBase58();

    // 检查钱包是否已存在
    const existing = db.getWallet(address);
    if (existing) {
      return res.status(400).json({
        success: false,
        error: '钱包已存在',
      } as ApiResponse);
    }

    // 加密并保存私钥
    const encryptedKey = WalletService.encryptPrivateKey(keypair);
    
    db.addWallet({
      address,
      encryptedKey,
      label: label || `钱包-${address.slice(0, 8)}`,
      createdAt: new Date().toISOString(),
    });

    // 创建默认监控配置
    db.upsertMonitorConfig({
      walletAddress: address,
      profitThreshold: 30,
      bigBuyThreshold: 1.0,
      sellRatio: 1.0,
      enabled: false,
    });

    logger.info(`钱包导入成功: ${address}`);

    res.json({
      success: true,
      data: {
        address,
        label: label || `钱包-${address.slice(0, 8)}`,
      },
      message: '钱包导入成功',
    } as ApiResponse);

  } catch (error) {
    logger.error('导入钱包失败:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    } as ApiResponse);
  }
});

/**
 * 获取所有钱包
 * GET /api/wallet/list
 */
router.get('/wallet/list', async (req: Request, res: Response) => {
  try {
    const wallets = db.getAllWallets();

    // 获取每个钱包的余额
    const walletsWithBalance = await Promise.all(
      wallets.map(async (wallet) => {
        try {
          const publicKey = new PublicKey(wallet.address);
          const balance = await solanaService.getBalance(publicKey);
          return {
            address: wallet.address,
            label: wallet.label,
            balance,
            createdAt: wallet.createdAt,
          };
        } catch (error) {
          return {
            address: wallet.address,
            label: wallet.label,
            balance: 0,
            createdAt: wallet.createdAt,
          };
        }
      })
    );

    res.json({
      success: true,
      data: walletsWithBalance,
    } as ApiResponse);

  } catch (error) {
    logger.error('获取钱包列表失败:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    } as ApiResponse);
  }
});

/**
 * 删除钱包
 * DELETE /api/wallet/:address
 */
router.delete('/wallet/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;

    db.deleteWallet(address);
    logger.info(`钱包已删除: ${address}`);

    res.json({
      success: true,
      message: '钱包已删除',
    } as ApiResponse);

  } catch (error) {
    logger.error('删除钱包失败:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    } as ApiResponse);
  }
});

// ==================== 监控配置路由 ====================

/**
 * 获取监控配置
 * GET /api/monitor/config/:address
 */
router.get('/monitor/config/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const config = db.getMonitorConfig(address);

    if (!config) {
      return res.status(404).json({
        success: false,
        error: '未找到配置',
      } as ApiResponse);
    }

    res.json({
      success: true,
      data: config,
    } as ApiResponse);

  } catch (error) {
    logger.error('获取监控配置失败:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    } as ApiResponse);
  }
});

/**
 * 更新监控配置
 * PUT /api/monitor/config/:address
 */
router.put('/monitor/config/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { profitThreshold, bigBuyThreshold, sellRatio, enabled } = req.body;

    const config: MonitorConfig = {
      walletAddress: address,
      profitThreshold: profitThreshold || 30,
      bigBuyThreshold: bigBuyThreshold || 1.0,
      sellRatio: sellRatio || 1.0,
      enabled: enabled !== undefined ? enabled : true,
    };

    db.upsertMonitorConfig(config);

    // 如果启用了监控，开始监控
    if (enabled) {
      await monitorService.startMonitoringWallet(config);
    } else {
      await monitorService.stopMonitoringWallet(address);
    }

    logger.info(`监控配置已更新: ${address}`);

    res.json({
      success: true,
      data: config,
      message: '配置已更新',
    } as ApiResponse);

  } catch (error) {
    logger.error('更新监控配置失败:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    } as ApiResponse);
  }
});

// ==================== 持仓路由 ====================

/**
 * 获取持仓列表
 * GET /api/positions/:address
 */
router.get('/positions/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const positions = db.getPositions(address);

    res.json({
      success: true,
      data: positions,
    } as ApiResponse);

  } catch (error) {
    logger.error('获取持仓失败:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    } as ApiResponse);
  }
});

/**
 * 获取所有活跃持仓
 * GET /api/positions
 */
router.get('/positions', async (req: Request, res: Response) => {
  try {
    const positions = db.getAllActivePositions();

    res.json({
      success: true,
      data: positions,
    } as ApiResponse);

  } catch (error) {
    logger.error('获取持仓失败:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    } as ApiResponse);
  }
});

// ==================== 交易路由 ====================

/**
 * 获取交易历史
 * GET /api/transactions/:address
 */
router.get('/transactions/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;

    const transactions = db.getTransactions(address, limit);

    res.json({
      success: true,
      data: transactions,
    } as ApiResponse);

  } catch (error) {
    logger.error('获取交易历史失败:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    } as ApiResponse);
  }
});

// ==================== 监控控制路由 ====================

/**
 * 启动监控服务
 * POST /api/monitor/start
 */
router.post('/monitor/start', async (req: Request, res: Response) => {
  try {
    await monitorService.start();

    res.json({
      success: true,
      message: '监控服务已启动',
    } as ApiResponse);

  } catch (error) {
    logger.error('启动监控失败:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    } as ApiResponse);
  }
});

/**
 * 停止监控服务
 * POST /api/monitor/stop
 */
router.post('/monitor/stop', async (req: Request, res: Response) => {
  try {
    await monitorService.stop();

    res.json({
      success: true,
      message: '监控服务已停止',
    } as ApiResponse);

  } catch (error) {
    logger.error('停止监控失败:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    } as ApiResponse);
  }
});

/**
 * 获取监控状态
 * GET /api/monitor/status
 */
router.get('/monitor/status', async (req: Request, res: Response) => {
  try {
    const status = monitorService.getStatus();

    res.json({
      success: true,
      data: status,
    } as ApiResponse);

  } catch (error) {
    logger.error('获取监控状态失败:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    } as ApiResponse);
  }
});

// ==================== 系统路由 ====================

/**
 * 健康检查
 * GET /api/health
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const isConnected = await solanaService.getConnectionStatus();

    res.json({
      success: true,
      data: {
        status: 'ok',
        solanaConnected: isConnected,
        timestamp: new Date().toISOString(),
      },
    } as ApiResponse);

  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    } as ApiResponse);
  }
});

export default router;
