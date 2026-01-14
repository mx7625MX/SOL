/**
 * 钱包服务
 * 处理钱包导入、加密和管理
 */

import { Keypair, PublicKey } from '@solana/web3.js';
import * as bip39 from 'bip39';
import bs58 from 'bs58';
import crypto from 'crypto';
import { derivePath } from 'ed25519-hd-key';
import logger from '../utils/logger';

// 简单的加密密钥（实际应用中应该使用环境变量或密钥管理系统）
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-this-in-production';

export class WalletService {
  /**
   * 从助记词导入钱包
   * @param mnemonic 助记词（12或24个单词）
   * @param derivationPath 派生路径，默认为 Phantom 钱包路径
   */
  static fromMnemonic(mnemonic: string, derivationPath: string = "m/44'/501'/0'/0'"): Keypair {
    try {
      // 验证助记词
      if (!bip39.validateMnemonic(mnemonic)) {
        throw new Error('无效的助记词');
      }

      // 生成种子
      const seed = bip39.mnemonicToSeedSync(mnemonic);
      
      // 派生密钥
      const derivedSeed = derivePath(derivationPath, seed.toString('hex')).key;
      
      // 创建 Keypair
      const keypair = Keypair.fromSeed(derivedSeed);
      
      logger.info(`从助记词导入钱包成功: ${keypair.publicKey.toBase58()}`);
      return keypair;
    } catch (error) {
      logger.error('从助记词导入钱包失败:', error);
      throw new Error('导入助记词失败: ' + (error as Error).message);
    }
  }

  /**
   * 从私钥导入钱包
   * @param privateKey 私钥（Base58 格式或字节数组）
   */
  static fromPrivateKey(privateKey: string | Uint8Array): Keypair {
    try {
      let keyBytes: Uint8Array;

      if (typeof privateKey === 'string') {
        // 尝试 Base58 解码
        try {
          keyBytes = bs58.decode(privateKey);
        } catch {
          // 如果 Base58 解码失败，尝试作为十六进制
          keyBytes = Buffer.from(privateKey, 'hex');
        }
      } else {
        keyBytes = privateKey;
      }

      // 验证密钥长度
      if (keyBytes.length !== 64) {
        throw new Error(`私钥长度不正确。期望 64 字节，得到 ${keyBytes.length} 字节`);
      }

      const keypair = Keypair.fromSecretKey(keyBytes);
      logger.info(`从私钥导入钱包成功: ${keypair.publicKey.toBase58()}`);
      return keypair;
    } catch (error) {
      logger.error('从私钥导入钱包失败:', error);
      throw new Error('导入私钥失败: ' + (error as Error).message);
    }
  }

  /**
   * 从 Phantom 钱包格式导入
   * Phantom 导出格式通常是 Base58 编码的私钥
   */
  static fromPhantom(exportedKey: string): Keypair {
    try {
      // Phantom 导出的是完整的密钥对（64字节）
      return this.fromPrivateKey(exportedKey);
    } catch (error) {
      logger.error('从 Phantom 格式导入失败:', error);
      throw new Error('Phantom 钱包导入失败: ' + (error as Error).message);
    }
  }

  /**
   * 从欧易钱包格式导入
   * 欧易可能导出助记词或私钥
   */
  static fromOKX(data: string): Keypair {
    try {
      // 检查是否是助记词
      const words = data.trim().split(/\s+/);
      if (words.length === 12 || words.length === 24) {
        return this.fromMnemonic(data);
      }

      // 否则尝试作为私钥导入
      return this.fromPrivateKey(data);
    } catch (error) {
      logger.error('从 OKX 格式导入失败:', error);
      throw new Error('OKX 钱包导入失败: ' + (error as Error).message);
    }
  }

  /**
   * 加密私钥
   */
  static encryptPrivateKey(keypair: Keypair): string {
    try {
      const secretKey = Buffer.from(keypair.secretKey);
      const cipher = crypto.createCipheriv(
        'aes-256-cbc',
        crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32),
        Buffer.alloc(16, 0)
      );
      
      let encrypted = cipher.update(secretKey);
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      
      return encrypted.toString('hex');
    } catch (error) {
      logger.error('加密私钥失败:', error);
      throw new Error('加密失败');
    }
  }

  /**
   * 解密私钥
   */
  static decryptPrivateKey(encryptedKey: string): Keypair {
    try {
      const encrypted = Buffer.from(encryptedKey, 'hex');
      const decipher = crypto.createDecipheriv(
        'aes-256-cbc',
        crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32),
        Buffer.alloc(16, 0)
      );
      
      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      return Keypair.fromSecretKey(new Uint8Array(decrypted));
    } catch (error) {
      logger.error('解密私钥失败:', error);
      throw new Error('解密失败');
    }
  }

  /**
   * 验证钱包地址格式
   */
  static isValidAddress(address: string): boolean {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 生成新钱包（用于测试）
   */
  static generateNew(): { keypair: Keypair; mnemonic: string } {
    const mnemonic = bip39.generateMnemonic();
    const keypair = this.fromMnemonic(mnemonic);
    
    logger.info(`生成新钱包: ${keypair.publicKey.toBase58()}`);
    
    return { keypair, mnemonic };
  }
}

export default WalletService;
