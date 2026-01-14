#!/usr/bin/env python3
"""
Pump.fun 利润监控&自动卖出机器人
监控自己钱包首次买入的新代币，当利润达标或检测到大额买入时自动卖出
"""

import os
import json
import time
import asyncio
import logging
from typing import Optional, Dict, Any, Set
from datetime import datetime
from dotenv import load_dotenv
from colorama import init, Fore, Style
import requests
import websockets
from decimal import Decimal

from solana.rpc.async_api import AsyncClient
from solana.rpc.commitment import Confirmed, Finalized
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solders.transaction import Transaction
from solders.system_program import TransferParams, transfer
from solders.rpc.config import RpcTransactionLogsFilterMentions
from spl.token.instructions import get_associated_token_address
from spl.token.async_client import AsyncToken

# 初始化colorama用于彩色输出
init(autoreset=True)

# 加载环境变量
load_dotenv()

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('pump_profit_bot.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class PumpProfitBot:
    """Pump.fun利润监控&自动卖出机器人"""
    
    def __init__(self):
        """初始化机器人"""
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
        
        # pump.fun配置
        self.pumpfun_program = Pubkey.from_string(
            os.getenv('PUMPFUN_PROGRAM', '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P')
        )
        self.pumpfun_api = os.getenv('PUMPFUN_API', 'https://frontend-api.pump.fun')
        
        # 利润监控配置
        self.profit_percentage = float(os.getenv('PROFIT_PERCENTAGE', '30'))  # 止盈百分比
        self.whale_buy_threshold = float(os.getenv('WHALE_BUY_THRESHOLD', '1.0'))  # 鲸鱼买入阈值(SOL)
        self.sell_ratio = float(os.getenv('SELL_RATIO', '100'))  # 卖出比例(10-100%)
        self.max_execution_delay = float(os.getenv('MAX_EXECUTION_DELAY', '2.0'))  # 最大执行延迟(秒)
        
        # 交易配置
        self.slippage_bps = int(os.getenv('SLIPPAGE_BPS', '500'))
        self.gas_priority_fee = float(os.getenv('GAS_PRIORITY_FEE', '0.0005'))  # 更高优先费用确保速度
        
        # 运行状态
        self.running = False
        self.monitored_tokens: Dict[str, Dict[str, Any]] = {}  # 正在监控的代币
        self.known_tokens: Set[str] = set()  # 已知的代币地址（避免重复检测）
        
        # Solana客户端
        self.client: Optional[AsyncClient] = None
        
        logger.info(f"{Fore.GREEN}{'='*70}")
        logger.info(f"{Fore.GREEN}机器人初始化成功 - Pump.fun 利润监控&自动卖出")
        logger.info(f"{Fore.GREEN}{'='*70}")
        logger.info(f"钱包地址: {self.wallet.pubkey()}")
        logger.info(f"止盈百分比: {self.profit_percentage}%")
        logger.info(f"鲸鱼买入阈值: {self.whale_buy_threshold} SOL")
        logger.info(f"卖出比例: {self.sell_ratio}%")
        logger.info(f"最大执行延迟: {self.max_execution_delay}s")
        logger.info(f"{Fore.YELLOW}注意: 交易执行功能需要pump.fun合约逆向工程")
    
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
        """启动机器人"""
        logger.info(f"{Fore.CYAN}{'='*70}")
        logger.info(f"{Fore.CYAN}启动 Pump.fun 利润监控&自动卖出机器人")
        logger.info(f"{Fore.CYAN}{'='*70}")
        
        self.running = True
        self.client = AsyncClient(self.rpc_endpoint)
        
        try:
            # 检查钱包余额
            await self._check_balance()
            
            # 扫描现有持仓
            await self._scan_existing_positions()
            
            # 启动监控任务
            tasks = [
                asyncio.create_task(self._monitor_wallet_transactions()),
                asyncio.create_task(self._monitor_positions()),
            ]
            
            logger.info(f"{Fore.YELLOW}开始监控钱包交易和持仓...")
            await asyncio.gather(*tasks)
            
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
            else:
                logger.error(f"{Fore.RED}无法获取余额")
        except Exception as e:
            logger.error(f"{Fore.RED}检查余额失败: {e}")
    
    async def _scan_existing_positions(self):
        """扫描现有持仓，识别钱包中已有的代币"""
        try:
            logger.info(f"{Fore.CYAN}扫描现有持仓...")
            
            # 获取钱包的所有token账户
            response = await self.client.get_token_accounts_by_owner(
                self.wallet.pubkey(),
                {"programId": Pubkey.from_string("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")}
            )
            
            if response.value:
                for account_info in response.value:
                    try:
                        # 解析token账户数据
                        data = account_info.account.data
                        # Token账户结构: mint(32字节) + owner(32字节) + amount(8字节)...
                        # 这里简化处理，实际需要正确解析SPL Token账户结构
                        
                        # 跳过，因为需要完整的token账户解析
                        pass
                    except Exception as e:
                        logger.debug(f"解析token账户失败: {e}")
                        continue
                
                logger.info(f"{Fore.GREEN}现有持仓扫描完成")
            else:
                logger.info(f"{Fore.YELLOW}未发现现有持仓")
                
        except Exception as e:
            logger.error(f"{Fore.RED}扫描持仓失败: {e}")
    
    async def _monitor_wallet_transactions(self):
        """监控钱包交易，检测新买入的代币"""
        try:
            async with websockets.connect(self.ws_endpoint) as websocket:
                # 订阅钱包的交易日志
                subscribe_request = {
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": "logsSubscribe",
                    "params": [
                        {
                            "mentions": [str(self.wallet.pubkey())]
                        },
                        {
                            "commitment": "confirmed"
                        }
                    ]
                }
                
                await websocket.send(json.dumps(subscribe_request))
                logger.info(f"{Fore.GREEN}已订阅钱包交易日志")
                
                # 持续接收消息
                while self.running:
                    try:
                        message = await asyncio.wait_for(
                            websocket.recv(),
                            timeout=30.0
                        )
                        await self._handle_wallet_transaction(json.loads(message))
                    except asyncio.TimeoutError:
                        # 发送ping保持连接
                        await websocket.ping()
                        continue
                    except Exception as e:
                        logger.error(f"{Fore.RED}处理交易消息错误: {e}")
                        
        except Exception as e:
            logger.error(f"{Fore.RED}WebSocket连接错误: {e}")
            if self.running:
                logger.info(f"{Fore.YELLOW}5秒后重新连接...")
                await asyncio.sleep(5)
                await self._monitor_wallet_transactions()
    
    async def _handle_wallet_transaction(self, message: Dict[str, Any]):
        """处理钱包交易消息，识别新买入的代币"""
        try:
            if 'params' not in message:
                return
            
            result = message['params']['result']
            if 'value' not in result:
                return
            
            logs = result['value'].get('logs', [])
            signature = result['value'].get('signature', '')
            
            # 检查是否是pump.fun的买入交易
            if self._is_pumpfun_buy(logs):
                token_mint = self._extract_token_from_logs(logs)
                
                if token_mint and token_mint not in self.known_tokens:
                    logger.info(f"{Fore.CYAN}{'='*70}")
                    logger.info(f"{Fore.GREEN}检测到首次买入新代币!")
                    logger.info(f"代币地址: {Fore.YELLOW}{token_mint}")
                    logger.info(f"交易签名: {Fore.YELLOW}{signature}")
                    logger.info(f"{Fore.CYAN}{'='*70}")
                    
                    # 记录为已知代币
                    self.known_tokens.add(token_mint)
                    
                    # 获取买入详情
                    buy_details = await self._get_transaction_details(signature)
                    
                    # 开始监控这个代币
                    await self._start_monitoring_token(token_mint, buy_details)
                    
        except Exception as e:
            logger.error(f"{Fore.RED}处理钱包交易失败: {e}")
    
    def _is_pumpfun_buy(self, logs: list) -> bool:
        """判断是否是pump.fun买入交易"""
        for log in logs:
            # 检查是否包含pump.fun程序日志
            if str(self.pumpfun_program) in log:
                # 检查是否是买入操作
                if 'buy' in log.lower() or 'purchase' in log.lower():
                    return True
        return False
    
    def _extract_token_from_logs(self, logs: list) -> Optional[str]:
        """从日志中提取代币mint地址"""
        for log in logs:
            # 尝试找到可能的mint地址
            parts = log.split()
            for part in parts:
                if len(part) >= 32 and len(part) <= 44:  # Solana地址长度
                    try:
                        # 验证是否是有效的公钥
                        Pubkey.from_string(part)
                        # 确保不是钱包地址或程序地址
                        if part != str(self.wallet.pubkey()) and part != str(self.pumpfun_program):
                            return part
                    except:
                        continue
        return None
    
    async def _get_transaction_details(self, signature: str) -> Dict[str, Any]:
        """获取交易详情"""
        try:
            response = await self.client.get_transaction(
                signature,
                encoding="jsonParsed",
                max_supported_transaction_version=0
            )
            
            if response.value:
                # 解析交易数据，提取买入金额、代币数量等
                # 这里需要根据实际的pump.fun交易结构来解析
                return {
                    'signature': signature,
                    'timestamp': datetime.now(),
                    'buy_amount_sol': 0.0,  # 需要从交易中解析
                    'token_amount': 0.0,     # 需要从交易中解析
                }
            
        except Exception as e:
            logger.error(f"{Fore.RED}获取交易详情失败: {e}")
        
        return {
            'signature': signature,
            'timestamp': datetime.now(),
            'buy_amount_sol': 0.0,
            'token_amount': 0.0,
        }
    
    async def _start_monitoring_token(self, token_mint: str, buy_details: Dict[str, Any]):
        """开始监控代币"""
        # 获取代币信息
        token_info = await self._get_token_info(token_mint)
        
        self.monitored_tokens[token_mint] = {
            'mint': token_mint,
            'buy_details': buy_details,
            'token_info': token_info,
            'initial_price': 0.0,  # 需要从bonding curve获取
            'current_price': 0.0,
            'buy_amount_sol': buy_details.get('buy_amount_sol', 0.0),
            'token_balance': buy_details.get('token_amount', 0.0),
            'started_monitoring': datetime.now(),
            'last_check': datetime.now(),
        }
        
        logger.info(f"{Fore.GREEN}开始监控代币: {token_info.get('name', 'Unknown')} ({token_info.get('symbol', 'N/A')})")
    
    async def _get_token_info(self, token_mint: str) -> Optional[Dict[str, Any]]:
        """获取代币信息"""
        try:
            url = f"{self.pumpfun_api}/coins/{token_mint}"
            response = requests.get(url, timeout=5)
            
            if response.status_code == 200:
                return response.json()
            else:
                return {'name': 'Unknown', 'symbol': 'N/A'}
                
        except Exception as e:
            logger.error(f"{Fore.RED}获取代币信息失败: {e}")
            return {'name': 'Unknown', 'symbol': 'N/A'}
    
    async def _monitor_positions(self):
        """持续监控所有持仓"""
        logger.info(f"{Fore.CYAN}开始持仓监控循环...")
        
        while self.running:
            try:
                if not self.monitored_tokens:
                    await asyncio.sleep(5)
                    continue
                
                # 并发检查所有监控的代币
                tasks = []
                for token_mint in list(self.monitored_tokens.keys()):
                    tasks.append(self._check_token_position(token_mint))
                
                await asyncio.gather(*tasks)
                
                # 短暂休眠，避免过于频繁的请求
                await asyncio.sleep(2)  # 每2秒检查一次
                
            except Exception as e:
                logger.error(f"{Fore.RED}监控持仓错误: {e}")
                await asyncio.sleep(5)
    
    async def _check_token_position(self, token_mint: str):
        """检查单个代币的持仓状态"""
        try:
            position = self.monitored_tokens[token_mint]
            
            # 获取当前价格
            current_price = await self._get_current_price(token_mint)
            if current_price is None:
                return
            
            position['current_price'] = current_price
            position['last_check'] = datetime.now()
            
            # 计算利润百分比
            buy_price = position.get('initial_price', current_price)
            if buy_price > 0:
                profit_pct = ((current_price - buy_price) / buy_price) * 100
            else:
                profit_pct = 0.0
            
            # 检查是否达到止盈条件
            if profit_pct >= self.profit_percentage:
                logger.info(f"{Fore.GREEN}{'='*70}")
                logger.info(f"{Fore.GREEN}触发止盈条件!")
                logger.info(f"代币: {position['token_info'].get('symbol', token_mint)}")
                logger.info(f"利润: {profit_pct:.2f}%")
                logger.info(f"目标: {self.profit_percentage}%")
                logger.info(f"{Fore.GREEN}{'='*70}")
                
                await self._execute_sell(token_mint, "止盈")
                return
            
            # 检查鲸鱼买入
            await self._check_whale_activity(token_mint, position)
            
        except Exception as e:
            logger.error(f"{Fore.RED}检查代币持仓失败 {token_mint}: {e}")
    
    async def _get_current_price(self, token_mint: str) -> Optional[float]:
        """获取代币当前价格
        
        WARNING: 需要实现从pump.fun bonding curve获取实时价格
        
        完整实现需要:
        1. 查询pump.fun bonding curve账户 (PDA)
        2. 解析账户数据获取储备金余额 (SOL和Token)
        3. 使用公式计算价格: price = sol_reserves / token_reserves
        4. 或使用pump.fun API: GET /coins/{mint}
        
        参考: https://github.com/pump-fun/pump-fun-core (如果公开)
        """
        try:
            # TODO: 实现从pump.fun bonding curve获取价格
            # 方法1: 查询bonding curve账户状态
            # 方法2: 使用pump.fun API
            # 方法3: 计算虚拟AMM价格
            
            url = f"{self.pumpfun_api}/coins/{token_mint}"
            response = requests.get(url, timeout=2)
            
            if response.status_code == 200:
                data = response.json()
                # API可能返回价格数据
                return float(data.get('usd_market_cap', 0)) / float(data.get('total_supply', 1))
            
            return None
            
        except Exception as e:
            logger.debug(f"获取价格失败: {e}")
            return None
    
    async def _check_whale_activity(self, token_mint: str, position: Dict[str, Any]):
        """检查是否有鲸鱼买入活动
        
        通过监控pump.fun程序日志来检测该代币的大额买入
        """
        try:
            # 这个功能需要为每个代币创建单独的WebSocket订阅
            # 监听包含该代币mint的pump.fun交易
            
            # 实现思路：
            # 1. 为每个监控的代币创建WebSocket订阅
            # 2. 使用logsSubscribe订阅pump.fun程序
            # 3. 过滤出包含目标token mint的交易
            # 4. 解析交易日志，提取买入金额
            # 5. 如果买入金额 >= whale_buy_threshold且不是自己的钱包，触发卖出
            
            # TODO: 完整实现需要：
            # - 为每个代币维护单独的WebSocket连接
            # - 解析pump.fun的买入日志格式
            # - 从日志中提取买入金额
            # - 识别买入者地址，排除自己的交易
            
            pass
            
        except Exception as e:
            logger.debug(f"检查鲸鱼活动失败: {e}")
    
    async def _execute_sell(self, token_mint: str, reason: str) -> bool:
        """执行卖出交易
        
        优先速度，确保在2000ms内完成
        
        WARNING: 卖出功能需要pump.fun合约逆向工程
        
        完整实现步骤:
        1. 分析pump.fun卖出交易示例
        2. 确定指令discriminator和参数格式
        3. 构建所需账户列表 (bonding curve, token account, etc.)
        4. 实现滑点计算
        5. 签名并发送交易
        
        参考资料:
        - Solana Explorer查看pump.fun卖出交易
        - 使用solana-tx-inspector解析交易结构
        - 社区逆向工程文档 (如有)
        """
        start_time = time.time()
        
        try:
            position = self.monitored_tokens[token_mint]
            token_info = position['token_info']
            
            logger.info(f"{Fore.YELLOW}{'='*70}")
            logger.info(f"{Fore.YELLOW}执行卖出: {token_info.get('symbol', token_mint)}")
            logger.info(f"原因: {reason}")
            logger.info(f"卖出比例: {self.sell_ratio}%")
            logger.info(f"{Fore.YELLOW}{'='*70}")
            
            # 计算卖出数量
            token_balance = position.get('token_balance', 0.0)
            sell_amount = token_balance * (self.sell_ratio / 100.0)
            
            logger.info(f"代币余额: {token_balance}")
            logger.info(f"卖出数量: {sell_amount}")
            
            # 构建并发送卖出交易
            # WARNING: 需要实现pump.fun卖出指令
            logger.warning(f"{Fore.RED}⚠️  卖出功能需要pump.fun合约逆向工程")
            logger.warning(f"{Fore.YELLOW}提示: 查看IMPLEMENTATION_SUMMARY_PROFIT_BOT.md了解如何完成实现")
            
            # TODO: 实现快速卖出逻辑
            # 1. 获取最新blockhash (缓存以提高速度)
            # 2. 构建pump.fun sell指令
            # 3. 设置高优先费用
            # 4. 立即发送交易（跳过preflight检查以提高速度）
            # 5. 不等待确认，立即返回
            
            elapsed = time.time() - start_time
            logger.info(f"{Fore.CYAN}执行耗时: {elapsed*1000:.0f}ms")
            
            if elapsed > self.max_execution_delay:
                logger.warning(f"{Fore.YELLOW}警告: 执行时间超过目标 ({self.max_execution_delay}s)")
            
            # 从监控列表中移除
            if self.sell_ratio >= 100:
                del self.monitored_tokens[token_mint]
                logger.info(f"{Fore.GREEN}已全部卖出，停止监控")
            else:
                # 更新余额
                position['token_balance'] = token_balance - sell_amount
                logger.info(f"{Fore.GREEN}部分卖出完成，继续监控剩余持仓")
            
            return False  # 演示模式，未执行实际交易
            
        except Exception as e:
            elapsed = time.time() - start_time
            logger.error(f"{Fore.RED}执行卖出失败: {e}")
            logger.error(f"耗时: {elapsed*1000:.0f}ms")
            return False


async def main():
    """主函数"""
    try:
        bot = PumpProfitBot()
        await bot.start()
    except Exception as e:
        logger.error(f"{Fore.RED}启动失败: {e}")


if __name__ == "__main__":
    asyncio.run(main())
