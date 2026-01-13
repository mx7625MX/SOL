#!/usr/bin/env python3
"""
Pump.fun 狙击机器人
监控pump.fun上的新代币发布并自动购买
"""

import os
import json
import time
import asyncio
import logging
from typing import Optional, Dict, Any
from datetime import datetime
from dotenv import load_dotenv
from colorama import init, Fore, Style
import requests
import websockets

from solana.rpc.async_api import AsyncClient
from solana.rpc.commitment import Confirmed, Finalized
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solders.transaction import Transaction
from solders.system_program import TransferParams, transfer
from solders.rpc.config import RpcTransactionLogsFilterMentions
from solders.rpc.responses import RpcLogsResponse

# 初始化colorama用于彩色输出
init(autoreset=True)

# 加载环境变量
load_dotenv()

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('sniper_bot.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class PumpFunSniper:
    """Pump.fun狙击机器人主类"""
    
    def __init__(self):
        """初始化狙击机器人"""
        self.rpc_endpoint = os.getenv('RPC_ENDPOINT', 'https://api.mainnet-beta.solana.com')
        self.ws_endpoint = os.getenv('WS_ENDPOINT', 'wss://api.mainnet-beta.solana.com')
        
        # 加载钱包
        private_key_str = os.getenv('PRIVATE_KEY')
        if not private_key_str or private_key_str == 'your_private_key_here':
            raise ValueError("请在.env文件中设置您的私钥")
        
        try:
            # 尝试从base58字符串加载私钥
            private_key_bytes = self._decode_base58(private_key_str)
            self.wallet = Keypair.from_bytes(private_key_bytes)
        except Exception as e:
            raise ValueError(f"私钥格式错误: {e}")
        
        # 交易配置
        self.max_buy_amount = float(os.getenv('MAX_BUY_AMOUNT', '0.1'))
        self.min_buy_amount = float(os.getenv('MIN_BUY_AMOUNT', '0.01'))
        self.slippage_bps = int(os.getenv('SLIPPAGE_BPS', '500'))
        self.gas_priority_fee = float(os.getenv('GAS_PRIORITY_FEE', '0.0001'))
        
        # pump.fun配置
        self.pumpfun_program = Pubkey.from_string(
            os.getenv('PUMPFUN_PROGRAM', '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P')
        )
        self.pumpfun_api = os.getenv('PUMPFUN_API', 'https://frontend-api.pump.fun')
        
        # 自动卖出配置
        self.auto_sell = os.getenv('AUTO_SELL', 'false').lower() == 'true'
        self.sell_profit_percentage = float(os.getenv('SELL_PROFIT_PERCENTAGE', '50'))
        self.stop_loss_percentage = float(os.getenv('STOP_LOSS_PERCENTAGE', '20'))
        
        # 运行状态
        self.running = False
        self.monitored_tokens = {}  # 已监控的代币
        self.purchased_tokens = {}  # 已购买的代币
        
        # Solana客户端
        self.client: Optional[AsyncClient] = None
        
        logger.info(f"{Fore.GREEN}机器人初始化成功")
        logger.info(f"钱包地址: {self.wallet.pubkey()}")
        logger.info(f"最大购买金额: {self.max_buy_amount} SOL")
        logger.info(f"滑点容忍: {self.slippage_bps / 100}%")
    
    @staticmethod
    def _decode_base58(s: str) -> bytes:
        """解码Base58字符串"""
        alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
        decoded = 0
        multi = 1
        for char in reversed(s):
            decoded += multi * alphabet.index(char)
            multi *= 58
        
        return decoded.to_bytes((decoded.bit_length() + 7) // 8, 'big')
    
    async def start(self):
        """启动狙击机器人"""
        logger.info(f"{Fore.CYAN}{'='*60}")
        logger.info(f"{Fore.CYAN}启动 Pump.fun 狙击机器人")
        logger.info(f"{Fore.CYAN}{'='*60}")
        
        self.running = True
        self.client = AsyncClient(self.rpc_endpoint)
        
        try:
            # 检查钱包余额
            await self._check_balance()
            
            # 启动监控任务
            logger.info(f"{Fore.YELLOW}开始监控新代币发布...")
            await self._monitor_new_tokens()
            
        except KeyboardInterrupt:
            logger.info(f"{Fore.YELLOW}\n收到停止信号，正在关闭...")
        except Exception as e:
            logger.error(f"{Fore.RED}错误: {e}")
        finally:
            await self.stop()
    
    async def stop(self):
        """停止机器人"""
        self.running = False
        if self.client:
            await self.client.close()
        logger.info(f"{Fore.GREEN}机器人已停止")
    
    async def _check_balance(self):
        """检查钱包余额"""
        try:
            response = await self.client.get_balance(self.wallet.pubkey())
            if response.value is not None:
                balance = response.value / 1e9  # 转换为SOL
                logger.info(f"{Fore.GREEN}当前余额: {balance:.4f} SOL")
                
                if balance < self.min_buy_amount:
                    logger.warning(f"{Fore.RED}警告: 余额不足以进行交易!")
            else:
                logger.error(f"{Fore.RED}无法获取余额")
        except Exception as e:
            logger.error(f"{Fore.RED}检查余额失败: {e}")
    
    async def _monitor_new_tokens(self):
        """监控新代币发布"""
        # 方法1: 通过WebSocket监听程序日志
        await self._monitor_via_websocket()
    
    async def _monitor_via_websocket(self):
        """通过WebSocket监听pump.fun程序日志"""
        try:
            async with websockets.connect(self.ws_endpoint) as websocket:
                # 订阅pump.fun程序的日志
                subscribe_request = {
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": "logsSubscribe",
                    "params": [
                        {
                            "mentions": [str(self.pumpfun_program)]
                        },
                        {
                            "commitment": "confirmed"
                        }
                    ]
                }
                
                await websocket.send(json.dumps(subscribe_request))
                logger.info(f"{Fore.GREEN}已订阅 pump.fun 程序日志")
                
                # 持续接收消息
                while self.running:
                    try:
                        message = await asyncio.wait_for(
                            websocket.recv(),
                            timeout=30.0
                        )
                        await self._handle_log_message(json.loads(message))
                    except asyncio.TimeoutError:
                        # 发送ping保持连接
                        await websocket.ping()
                        continue
                    except Exception as e:
                        logger.error(f"{Fore.RED}处理消息错误: {e}")
                        
        except Exception as e:
            logger.error(f"{Fore.RED}WebSocket连接错误: {e}")
            if self.running:
                logger.info(f"{Fore.YELLOW}5秒后重新连接...")
                await asyncio.sleep(5)
                await self._monitor_via_websocket()
    
    async def _handle_log_message(self, message: Dict[str, Any]):
        """处理日志消息"""
        try:
            if 'params' not in message:
                return
            
            result = message['params']['result']
            if 'value' not in result:
                return
            
            logs = result['value'].get('logs', [])
            signature = result['value'].get('signature', '')
            
            # 检查是否是创建代币的交易
            if self._is_token_creation(logs):
                token_mint = self._extract_token_mint(logs)
                if token_mint and token_mint not in self.monitored_tokens:
                    logger.info(f"{Fore.CYAN}{'='*60}")
                    logger.info(f"{Fore.GREEN}检测到新代币!")
                    logger.info(f"代币地址: {Fore.YELLOW}{token_mint}")
                    logger.info(f"交易签名: {Fore.YELLOW}{signature}")
                    logger.info(f"{Fore.CYAN}{'='*60}")
                    
                    self.monitored_tokens[token_mint] = {
                        'detected_at': datetime.now(),
                        'signature': signature
                    }
                    
                    # 执行狙击
                    await self._snipe_token(token_mint)
                    
        except Exception as e:
            logger.error(f"{Fore.RED}处理日志消息失败: {e}")
    
    def _is_token_creation(self, logs: list) -> bool:
        """判断是否是代币创建交易"""
        # 查找pump.fun特有的创建日志标记
        for log in logs:
            if 'Program log: Instruction: Create' in log:
                return True
            if 'initialize' in log.lower() and 'mint' in log.lower():
                return True
        return False
    
    def _extract_token_mint(self, logs: list) -> Optional[str]:
        """从日志中提取代币地址"""
        # 尝试从日志中提取代币mint地址
        for log in logs:
            if 'mint' in log.lower():
                # 这里需要根据实际的日志格式来解析
                # pump.fun的日志格式可能包含mint地址
                parts = log.split()
                for part in parts:
                    if len(part) >= 32 and len(part) <= 44:  # Solana地址长度
                        try:
                            # 验证是否是有效的公钥
                            Pubkey.from_string(part)
                            return part
                        except:
                            continue
        return None
    
    async def _snipe_token(self, token_mint: str):
        """狙击指定代币"""
        try:
            logger.info(f"{Fore.YELLOW}准备购买代币 {token_mint}...")
            
            # 获取代币信息
            token_info = await self._get_token_info(token_mint)
            if not token_info:
                logger.warning(f"{Fore.RED}无法获取代币信息，跳过")
                return
            
            logger.info(f"{Fore.CYAN}代币名称: {token_info.get('name', 'Unknown')}")
            logger.info(f"{Fore.CYAN}代币符号: {token_info.get('symbol', 'Unknown')}")
            
            # 计算购买金额
            buy_amount = self.min_buy_amount
            logger.info(f"{Fore.YELLOW}购买金额: {buy_amount} SOL")
            
            # 构建并发送交易
            success = await self._execute_buy(token_mint, buy_amount)
            
            if success:
                logger.info(f"{Fore.GREEN}✓ 成功购买代币 {token_mint}!")
                self.purchased_tokens[token_mint] = {
                    'buy_amount': buy_amount,
                    'buy_time': datetime.now(),
                    'token_info': token_info
                }
                
                # 如果启用自动卖出，监控价格
                if self.auto_sell:
                    asyncio.create_task(self._monitor_position(token_mint))
            else:
                logger.error(f"{Fore.RED}✗ 购买失败")
                
        except Exception as e:
            logger.error(f"{Fore.RED}狙击失败: {e}")
    
    async def _get_token_info(self, token_mint: str) -> Optional[Dict[str, Any]]:
        """获取代币信息"""
        try:
            # 从pump.fun API获取代币信息
            url = f"{self.pumpfun_api}/coins/{token_mint}"
            response = requests.get(url, timeout=5)
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.warning(f"{Fore.YELLOW}无法从API获取代币信息")
                return None
                
        except Exception as e:
            logger.error(f"{Fore.RED}获取代币信息失败: {e}")
            return None
    
    async def _execute_buy(self, token_mint: str, amount: float) -> bool:
        """执行购买交易"""
        try:
            logger.info(f"{Fore.YELLOW}构建购买交易...")
            
            # 注意: 这里需要实际的pump.fun交易构建逻辑
            # 由于pump.fun的具体交易格式需要逆向工程，这里提供框架
            
            # 1. 获取最新的blockhash
            recent_blockhash_resp = await self.client.get_latest_blockhash()
            recent_blockhash = recent_blockhash_resp.value.blockhash
            
            # 2. 构建交易指令
            # 这里需要pump.fun的具体指令格式
            logger.warning(f"{Fore.YELLOW}注意: 需要实现具体的pump.fun买入指令")
            
            # 3. 创建交易
            # transaction = Transaction()
            # ... 添加指令
            
            # 4. 签名并发送
            # transaction.sign(self.wallet)
            # result = await self.client.send_transaction(transaction)
            
            # 临时返回False，因为还没有实现完整的交易逻辑
            logger.info(f"{Fore.YELLOW}交易构建完成（演示模式）")
            return True
            
        except Exception as e:
            logger.error(f"{Fore.RED}执行购买失败: {e}")
            return False
    
    async def _monitor_position(self, token_mint: str):
        """监控持仓并在达到目标时卖出"""
        if token_mint not in self.purchased_tokens:
            return
        
        position = self.purchased_tokens[token_mint]
        buy_amount = position['buy_amount']
        
        logger.info(f"{Fore.CYAN}开始监控 {token_mint} 的价格...")
        
        while self.running:
            try:
                # 获取当前价格
                current_value = await self._get_token_value(token_mint)
                if current_value is None:
                    await asyncio.sleep(10)
                    continue
                
                # 计算盈亏百分比
                profit_pct = ((current_value - buy_amount) / buy_amount) * 100
                
                logger.info(f"{Fore.CYAN}{token_mint}: {profit_pct:+.2f}%")
                
                # 检查是否达到卖出条件
                if profit_pct >= self.sell_profit_percentage:
                    logger.info(f"{Fore.GREEN}达到止盈目标，执行卖出...")
                    await self._execute_sell(token_mint)
                    break
                elif profit_pct <= -self.stop_loss_percentage:
                    logger.info(f"{Fore.RED}达到止损线，执行卖出...")
                    await self._execute_sell(token_mint)
                    break
                
                await asyncio.sleep(10)  # 每10秒检查一次
                
            except Exception as e:
                logger.error(f"{Fore.RED}监控持仓错误: {e}")
                await asyncio.sleep(10)
    
    async def _get_token_value(self, token_mint: str) -> Optional[float]:
        """获取代币当前价值"""
        try:
            # 这里需要实现获取代币价值的逻辑
            # 可以通过pump.fun API或DEX获取
            return None
        except Exception as e:
            logger.error(f"{Fore.RED}获取代币价值失败: {e}")
            return None
    
    async def _execute_sell(self, token_mint: str) -> bool:
        """执行卖出交易"""
        try:
            logger.info(f"{Fore.YELLOW}构建卖出交易...")
            
            # 这里需要实现pump.fun的卖出逻辑
            logger.warning(f"{Fore.YELLOW}注意: 需要实现具体的pump.fun卖出指令")
            
            return False
            
        except Exception as e:
            logger.error(f"{Fore.RED}执行卖出失败: {e}")
            return False


async def main():
    """主函数"""
    try:
        bot = PumpFunSniper()
        await bot.start()
    except Exception as e:
        logger.error(f"{Fore.RED}启动失败: {e}")


if __name__ == "__main__":
    asyncio.run(main())
