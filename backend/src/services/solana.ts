/**
 * Solana 服务
 * 处理与 Solana 区块链的交互
 */

import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
  ParsedAccountData,
  ConfirmedSignatureInfo,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount,
} from '@solana/spl-token';
import config from '../config';
import logger from '../utils/logger';
import axios from 'axios';

export class SolanaService {
  private connection: Connection;

  constructor() {
    this.connection = new Connection(config.rpcEndpoint, 'confirmed');
    logger.info(`已连接到 Solana RPC: ${config.rpcEndpoint}`);
  }

  /**
   * 获取 SOL 余额
   */
  async getBalance(publicKey: PublicKey): Promise<number> {
    try {
      const balance = await this.connection.getBalance(publicKey);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      logger.error('获取余额失败:', error);
      throw error;
    }
  }

  /**
   * 获取代币账户信息
   */
  async getTokenAccounts(walletAddress: PublicKey): Promise<any[]> {
    try {
      const accounts = await this.connection.getParsedTokenAccountsByOwner(
        walletAddress,
        { programId: TOKEN_PROGRAM_ID }
      );

      return accounts.value.map((account) => {
        const data = account.account.data as ParsedAccountData;
        return {
          mint: data.parsed.info.mint,
          amount: data.parsed.info.tokenAmount.uiAmount,
          decimals: data.parsed.info.tokenAmount.decimals,
        };
      });
    } catch (error) {
      logger.error('获取代币账户失败:', error);
      throw error;
    }
  }

  /**
   * 获取代币余额
   */
  async getTokenBalance(walletAddress: PublicKey, tokenMint: PublicKey): Promise<number> {
    try {
      const ata = await getAssociatedTokenAddress(tokenMint, walletAddress);
      const account = await getAccount(this.connection, ata);
      return Number(account.amount) / Math.pow(10, account.decimals || 9);
    } catch (error) {
      // 账户可能不存在
      return 0;
    }
  }

  /**
   * 监听钱包交易
   */
  async getRecentTransactions(
    walletAddress: PublicKey,
    limit: number = 10
  ): Promise<ConfirmedSignatureInfo[]> {
    try {
      const signatures = await this.connection.getSignaturesForAddress(
        walletAddress,
        { limit }
      );
      return signatures;
    } catch (error) {
      logger.error('获取交易历史失败:', error);
      throw error;
    }
  }

  /**
   * 获取交易详情
   */
  async getTransaction(signature: string): Promise<any> {
    try {
      const tx = await this.connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      });
      return tx;
    } catch (error) {
      logger.error('获取交易详情失败:', error);
      throw error;
    }
  }

  /**
   * 从Jupiter获取代币价格
   */
  async getTokenPrice(tokenMint: string): Promise<number | null> {
    try {
      // 使用 Jupiter API 获取价格
      const response = await axios.get(
        `https://price.jup.ag/v4/price?ids=${tokenMint}`,
        { timeout: 5000 }
      );

      if (response.data?.data?.[tokenMint]?.price) {
        return response.data.data[tokenMint].price;
      }

      return null;
    } catch (error) {
      logger.error(`获取代币价格失败 (${tokenMint}):`, error);
      return null;
    }
  }

  /**
   * 执行代币交换（通过 Jupiter）
   */
  async swapToken(
    wallet: Keypair,
    inputMint: string,
    outputMint: string,
    amount: number,
    slippage: number = 0.5
  ): Promise<string> {
    try {
      logger.info(`准备交换: ${amount} ${inputMint} -> ${outputMint}`);

      // 1. 获取报价
      const quoteResponse = await axios.get(
        'https://quote-api.jup.ag/v6/quote',
        {
          params: {
            inputMint,
            outputMint,
            amount: Math.floor(amount * LAMPORTS_PER_SOL),
            slippageBps: Math.floor(slippage * 100),
          },
          timeout: 10000,
        }
      );

      const quote = quoteResponse.data;

      if (!quote) {
        throw new Error('无法获取交换报价');
      }

      logger.info(`报价获取成功: ${quote.outAmount} ${outputMint}`);

      // 2. 获取交换交易
      const swapResponse = await axios.post(
        'https://quote-api.jup.ag/v6/swap',
        {
          quoteResponse: quote,
          userPublicKey: wallet.publicKey.toString(),
          wrapAndUnwrapSol: true,
        },
        { timeout: 10000 }
      );

      const { swapTransaction } = swapResponse.data;

      // 3. 反序列化并签名交易
      const transactionBuf = Buffer.from(swapTransaction, 'base64');
      const transaction = Transaction.from(transactionBuf);
      transaction.sign(wallet);

      // 4. 发送交易
      const signature = await this.connection.sendRawTransaction(
        transaction.serialize(),
        {
          skipPreflight: false,
          maxRetries: 3,
        }
      );

      logger.info(`交易已发送: ${signature}`);

      // 5. 确认交易
      await this.connection.confirmTransaction(signature, 'confirmed');

      logger.info(`交易已确认: ${signature}`);
      return signature;
    } catch (error) {
      logger.error('代币交换失败:', error);
      throw error;
    }
  }

  /**
   * 卖出代币（换成 SOL）
   */
  async sellToken(
    wallet: Keypair,
    tokenMint: string,
    amount: number,
    slippage: number = 0.5
  ): Promise<string> {
    const SOL_MINT = 'So11111111111111111111111111111111111111112';
    return this.swapToken(wallet, tokenMint, SOL_MINT, amount, slippage);
  }

  /**
   * 买入代币（使用 SOL）
   */
  async buyToken(
    wallet: Keypair,
    tokenMint: string,
    solAmount: number,
    slippage: number = 0.5
  ): Promise<string> {
    const SOL_MINT = 'So11111111111111111111111111111111111111112';
    return this.swapToken(wallet, SOL_MINT, tokenMint, solAmount, slippage);
  }

  /**
   * 订阅账户变化
   */
  subscribeToAccount(
    publicKey: PublicKey,
    callback: (accountInfo: any) => void
  ): number {
    return this.connection.onAccountChange(publicKey, callback, 'confirmed');
  }

  /**
   * 取消订阅
   */
  async unsubscribe(subscriptionId: number): Promise<void> {
    await this.connection.removeAccountChangeListener(subscriptionId);
  }

  /**
   * 检查代币元数据
   */
  async getTokenMetadata(tokenMint: string): Promise<any> {
    try {
      // 尝试从多个来源获取代币信息
      
      // 1. 尝试从 Jupiter 获取
      try {
        const response = await axios.get(
          `https://tokens.jup.ag/token/${tokenMint}`,
          { timeout: 5000 }
        );
        if (response.data) {
          return {
            symbol: response.data.symbol,
            name: response.data.name,
            decimals: response.data.decimals,
            logoURI: response.data.logoURI,
          };
        }
      } catch (e) {
        // 继续尝试其他来源
      }

      // 2. 尝试从链上获取
      try {
        const mintPubkey = new PublicKey(tokenMint);
        const mintInfo = await this.connection.getParsedAccountInfo(mintPubkey);
        
        if (mintInfo.value) {
          const data = mintInfo.value.data as ParsedAccountData;
          return {
            symbol: 'UNKNOWN',
            name: 'Unknown Token',
            decimals: data.parsed?.info?.decimals || 9,
            logoURI: null,
          };
        }
      } catch (e) {
        logger.error('从链上获取代币信息失败:', e);
      }

      return null;
    } catch (error) {
      logger.error('获取代币元数据失败:', error);
      return null;
    }
  }

  /**
   * 获取当前连接状态
   */
  async getConnectionStatus(): Promise<boolean> {
    try {
      await this.connection.getSlot();
      return true;
    } catch {
      return false;
    }
  }
}

// 导出单例
export const solanaService = new SolanaService();
export default solanaService;
