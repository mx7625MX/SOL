# Pump.fun 狙击机器人 API 文档

## 核心类: PumpFunSniper

### 初始化

```python
from sniper_bot import PumpFunSniper

bot = PumpFunSniper()
```

初始化时会自动从 `.env` 文件加载配置。

### 配置参数

| 参数 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| `RPC_ENDPOINT` | string | Solana RPC节点URL | https://api.mainnet-beta.solana.com |
| `WS_ENDPOINT` | string | WebSocket端点URL | wss://api.mainnet-beta.solana.com |
| `PRIVATE_KEY` | string | 钱包私钥(Base58) | 必需 |
| `MAX_BUY_AMOUNT` | float | 最大购买金额(SOL) | 0.1 |
| `MIN_BUY_AMOUNT` | float | 最小购买金额(SOL) | 0.01 |
| `SLIPPAGE_BPS` | int | 滑点容忍度(基点) | 500 |
| `GAS_PRIORITY_FEE` | float | 优先费用(SOL) | 0.0001 |
| `AUTO_SELL` | bool | 是否自动卖出 | false |
| `SELL_PROFIT_PERCENTAGE` | float | 止盈百分比 | 50 |
| `STOP_LOSS_PERCENTAGE` | float | 止损百分比 | 20 |

### 主要方法

#### start()

启动机器人，开始监控新代币。

```python
import asyncio

async def main():
    bot = PumpFunSniper()
    await bot.start()

asyncio.run(main())
```

#### stop()

停止机器人。

```python
await bot.stop()
```

## 工作流程

### 1. 监控新代币

机器人通过WebSocket监听pump.fun程序的交易日志:

```python
async def _monitor_via_websocket(self):
    # 订阅pump.fun程序日志
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
```

### 2. 检测代币创建

当检测到包含 "Program log: Instruction: Create" 的日志时，判定为新代币创建:

```python
def _is_token_creation(self, logs: list) -> bool:
    for log in logs:
        if 'Program log: Instruction: Create' in log:
            return True
    return False
```

### 3. 提取代币地址

从日志中解析代币mint地址:

```python
def _extract_token_mint(self, logs: list) -> Optional[str]:
    # 查找符合Solana地址格式的字符串
    # 验证是否为有效公钥
```

### 4. 执行购买

构建并发送购买交易:

```python
async def _execute_buy(self, token_mint: str, amount: float) -> bool:
    # 1. 获取最新blockhash
    # 2. 构建pump.fun交易指令
    # 3. 签名交易
    # 4. 发送交易
```

### 5. 监控持仓

如果启用自动卖出，持续监控价格并在达到目标时卖出:

```python
async def _monitor_position(self, token_mint: str):
    while self.running:
        current_value = await self._get_token_value(token_mint)
        profit_pct = ((current_value - buy_amount) / buy_amount) * 100
        
        if profit_pct >= self.sell_profit_percentage:
            await self._execute_sell(token_mint)
            break
```

## 扩展开发

### 自定义交易策略

可以继承 `PumpFunSniper` 类并重写交易方法:

```python
class CustomSniper(PumpFunSniper):
    async def _snipe_token(self, token_mint: str):
        # 自定义狙击逻辑
        token_info = await self._get_token_info(token_mint)
        
        # 根据代币信息决定是否购买
        if self._should_buy(token_info):
            await self._execute_buy(token_mint, self.min_buy_amount)
    
    def _should_buy(self, token_info: dict) -> bool:
        # 自定义过滤逻辑
        # 例如: 检查代币名称、符号、社交链接等
        return True
```

### 添加过滤器

在购买前添加代币过滤逻辑:

```python
def _filter_token(self, token_info: dict) -> bool:
    """过滤不符合条件的代币"""
    
    # 检查代币名称是否包含特定关键词
    name = token_info.get('name', '').lower()
    if 'scam' in name or 'test' in name:
        return False
    
    # 检查是否有社交媒体链接
    if not token_info.get('twitter') and not token_info.get('telegram'):
        return False
    
    return True
```

### 集成通知服务

添加Telegram或Discord通知:

```python
async def _send_notification(self, message: str):
    """发送通知"""
    # Telegram
    import requests
    bot_token = os.getenv('TELEGRAM_BOT_TOKEN')
    chat_id = os.getenv('TELEGRAM_CHAT_ID')
    
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    requests.post(url, json={
        'chat_id': chat_id,
        'text': message
    })
```

## 安全建议

1. **私钥安全**
   - 永远不要硬编码私钥
   - 使用环境变量存储敏感信息
   - 定期轮换私钥

2. **资金管理**
   - 使用专门的交易钱包
   - 设置合理的购买限额
   - 不要在钱包中存放超过必要的资金

3. **风险控制**
   - 始终设置止损点
   - 分散投资，不要全仓单个代币
   - 监控机器人运行状态

4. **代码审计**
   - 在主网使用前充分测试
   - 审查所有依赖包
   - 定期更新依赖以修复安全漏洞

## 常见问题

### Q: 如何获取更快的RPC访问?

A: 使用付费RPC服务如Helius、QuickNode等，它们提供更高的速率限制和更低的延迟。

### Q: 为什么交易总是失败?

A: 可能的原因:
- 网络延迟太高，被其他人抢先
- 滑点设置太低
- 钱包余额不足
- RPC节点限速

### Q: 如何提高狙击成功率?

A: 
- 使用专业RPC节点
- 提高gas优先费
- 优化网络连接
- 使用多个机器人并行运行

### Q: 代币信息从哪里获取?

A: pump.fun提供公开API: `https://frontend-api.pump.fun/coins/{mint}`

## pump.fun 合约分析

### 程序地址

```
6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P
```

### 主要指令

1. **Create**: 创建新代币
2. **Buy**: 购买代币
3. **Sell**: 卖出代币

### 交易结构

pump.fun使用bonding curve机制:
- 初始价格很低
- 随着购买量增加价格上涨
- 达到特定市值后迁移到Raydium

## 参考资源

- [Solana Web3.js 文档](https://solana-labs.github.io/solana-web3.js/)
- [pump.fun 官网](https://pump.fun)
- [Solana 开发者文档](https://docs.solana.com/)

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License
