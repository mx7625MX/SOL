/**
 * 数据库服务
 * 使用 SQLite 进行数据持久化
 */

import Database from 'better-sqlite3';
import config from '../config';
import logger from '../utils/logger';
import path from 'path';
import fs from 'fs';
import { WalletInfo, TokenPosition, MonitorConfig, Transaction } from '../types';

class DatabaseService {
  private db: Database.Database;

  constructor() {
    // 确保数据目录存在
    const dbDir = path.dirname(config.dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // 初始化数据库连接
    this.db = new Database(config.dbPath);
    this.db.pragma('journal_mode = WAL');
    
    // 初始化表结构
    this.initTables();
    logger.info('数据库初始化成功');
  }

  /**
   * 初始化数据库表
   */
  private initTables(): void {
    // 钱包信息表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS wallets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        address TEXT UNIQUE NOT NULL,
        encrypted_key TEXT NOT NULL,
        label TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Token持仓表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS positions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        wallet_address TEXT NOT NULL,
        token_mint TEXT NOT NULL,
        token_symbol TEXT,
        token_name TEXT,
        buy_price REAL NOT NULL,
        current_price REAL NOT NULL,
        amount REAL NOT NULL,
        buy_time TEXT NOT NULL,
        profit_percent REAL DEFAULT 0,
        status TEXT DEFAULT 'monitoring',
        UNIQUE(wallet_address, token_mint)
      )
    `);

    // 监控配置表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS monitor_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        wallet_address TEXT UNIQUE NOT NULL,
        profit_threshold REAL DEFAULT 30.0,
        big_buy_threshold REAL DEFAULT 1.0,
        sell_ratio REAL DEFAULT 1.0,
        enabled INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 交易记录表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        wallet_address TEXT NOT NULL,
        token_mint TEXT NOT NULL,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        price REAL NOT NULL,
        signature TEXT UNIQUE NOT NULL,
        status TEXT DEFAULT 'pending',
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        error TEXT
      )
    `);

    // 创建索引
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_positions_wallet ON positions(wallet_address);
      CREATE INDEX IF NOT EXISTS idx_positions_status ON positions(status);
      CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON transactions(wallet_address);
      CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp);
    `);
  }

  // ==================== 钱包操作 ====================

  /**
   * 添加钱包
   */
  addWallet(wallet: WalletInfo): number {
    const stmt = this.db.prepare(`
      INSERT INTO wallets (address, encrypted_key, label)
      VALUES (?, ?, ?)
    `);
    const result = stmt.run(wallet.address, wallet.encryptedKey, wallet.label || null);
    return result.lastInsertRowid as number;
  }

  /**
   * 获取钱包
   */
  getWallet(address: string): WalletInfo | undefined {
    const stmt = this.db.prepare(`
      SELECT id, address, encrypted_key as encryptedKey, label, created_at as createdAt
      FROM wallets WHERE address = ?
    `);
    return stmt.get(address) as WalletInfo | undefined;
  }

  /**
   * 获取所有钱包
   */
  getAllWallets(): WalletInfo[] {
    const stmt = this.db.prepare(`
      SELECT id, address, encrypted_key as encryptedKey, label, created_at as createdAt
      FROM wallets
    `);
    return stmt.all() as WalletInfo[];
  }

  /**
   * 删除钱包
   */
  deleteWallet(address: string): void {
    const stmt = this.db.prepare('DELETE FROM wallets WHERE address = ?');
    stmt.run(address);
  }

  // ==================== 持仓操作 ====================

  /**
   * 添加或更新持仓
   */
  upsertPosition(position: TokenPosition): void {
    const stmt = this.db.prepare(`
      INSERT INTO positions (
        wallet_address, token_mint, token_symbol, token_name,
        buy_price, current_price, amount, buy_time, profit_percent, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(wallet_address, token_mint) DO UPDATE SET
        current_price = excluded.current_price,
        profit_percent = excluded.profit_percent,
        status = excluded.status
    `);
    stmt.run(
      position.walletAddress,
      position.tokenMint,
      position.tokenSymbol || null,
      position.tokenName || null,
      position.buyPrice,
      position.currentPrice,
      position.amount,
      position.buyTime,
      position.profitPercent,
      position.status
    );
  }

  /**
   * 获取钱包的所有持仓
   */
  getPositions(walletAddress: string): TokenPosition[] {
    const stmt = this.db.prepare(`
      SELECT 
        id, wallet_address as walletAddress, token_mint as tokenMint,
        token_symbol as tokenSymbol, token_name as tokenName,
        buy_price as buyPrice, current_price as currentPrice,
        amount, buy_time as buyTime, profit_percent as profitPercent, status
      FROM positions 
      WHERE wallet_address = ? AND status = 'monitoring'
    `);
    return stmt.all(walletAddress) as TokenPosition[];
  }

  /**
   * 获取所有活跃持仓
   */
  getAllActivePositions(): TokenPosition[] {
    const stmt = this.db.prepare(`
      SELECT 
        id, wallet_address as walletAddress, token_mint as tokenMint,
        token_symbol as tokenSymbol, token_name as tokenName,
        buy_price as buyPrice, current_price as currentPrice,
        amount, buy_time as buyTime, profit_percent as profitPercent, status
      FROM positions 
      WHERE status = 'monitoring'
    `);
    return stmt.all() as TokenPosition[];
  }

  /**
   * 更新持仓状态
   */
  updatePositionStatus(walletAddress: string, tokenMint: string, status: string): void {
    const stmt = this.db.prepare(`
      UPDATE positions SET status = ? 
      WHERE wallet_address = ? AND token_mint = ?
    `);
    stmt.run(status, walletAddress, tokenMint);
  }

  // ==================== 监控配置操作 ====================

  /**
   * 添加或更新监控配置
   */
  upsertMonitorConfig(config: MonitorConfig): void {
    const stmt = this.db.prepare(`
      INSERT INTO monitor_configs (
        wallet_address, profit_threshold, big_buy_threshold, sell_ratio, enabled
      ) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(wallet_address) DO UPDATE SET
        profit_threshold = excluded.profit_threshold,
        big_buy_threshold = excluded.big_buy_threshold,
        sell_ratio = excluded.sell_ratio,
        enabled = excluded.enabled,
        updated_at = CURRENT_TIMESTAMP
    `);
    stmt.run(
      config.walletAddress,
      config.profitThreshold,
      config.bigBuyThreshold,
      config.sellRatio,
      config.enabled ? 1 : 0
    );
  }

  /**
   * 获取监控配置
   */
  getMonitorConfig(walletAddress: string): MonitorConfig | undefined {
    const stmt = this.db.prepare(`
      SELECT 
        id, wallet_address as walletAddress,
        profit_threshold as profitThreshold,
        big_buy_threshold as bigBuyThreshold,
        sell_ratio as sellRatio,
        enabled,
        created_at as createdAt,
        updated_at as updatedAt
      FROM monitor_configs 
      WHERE wallet_address = ?
    `);
    const result = stmt.get(walletAddress) as any;
    if (result) {
      result.enabled = result.enabled === 1;
      return result as MonitorConfig;
    }
    return undefined;
  }

  /**
   * 获取所有启用的监控配置
   */
  getEnabledMonitorConfigs(): MonitorConfig[] {
    const stmt = this.db.prepare(`
      SELECT 
        id, wallet_address as walletAddress,
        profit_threshold as profitThreshold,
        big_buy_threshold as bigBuyThreshold,
        sell_ratio as sellRatio,
        enabled,
        created_at as createdAt,
        updated_at as updatedAt
      FROM monitor_configs 
      WHERE enabled = 1
    `);
    const results = stmt.all() as any[];
    return results.map(r => ({ ...r, enabled: r.enabled === 1 })) as MonitorConfig[];
  }

  // ==================== 交易记录操作 ====================

  /**
   * 添加交易记录
   */
  addTransaction(tx: Transaction): number {
    const stmt = this.db.prepare(`
      INSERT INTO transactions (
        wallet_address, token_mint, type, amount, price, signature, status, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      tx.walletAddress,
      tx.tokenMint,
      tx.type,
      tx.amount,
      tx.price,
      tx.signature,
      tx.status,
      tx.timestamp
    );
    return result.lastInsertRowid as number;
  }

  /**
   * 更新交易状态
   */
  updateTransactionStatus(signature: string, status: string, error?: string): void {
    const stmt = this.db.prepare(`
      UPDATE transactions SET status = ?, error = ? WHERE signature = ?
    `);
    stmt.run(status, error || null, signature);
  }

  /**
   * 获取钱包的交易记录
   */
  getTransactions(walletAddress: string, limit: number = 100): Transaction[] {
    const stmt = this.db.prepare(`
      SELECT 
        id, wallet_address as walletAddress, token_mint as tokenMint,
        type, amount, price, signature, status, timestamp, error
      FROM transactions 
      WHERE wallet_address = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);
    return stmt.all(walletAddress, limit) as Transaction[];
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    this.db.close();
  }
}

// 导出单例
export const db = new DatabaseService();
export default db;
