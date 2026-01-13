# Pump.fun 狙击机器人

一个用于监控并自动购买 pump.fun 平台上新发布代币的狙击机器人。

## 功能特性

- 🔍 **实时监控**: 通过WebSocket实时监听pump.fun上的新代币发布
- ⚡ **快速狙击**: 检测到新代币后立即执行购买
- 💰 **自动交易**: 支持自动买入和可选的自动卖出
- 🛡️ **风险控制**: 内置滑点保护、止盈止损功能
- 📊 **详细日志**: 记录所有操作和交易结果
- ⚙️ **灵活配置**: 通过环境变量轻松配置各项参数

## 快速开始

### 1. 环境要求

- Python 3.8+
- Solana 钱包（需要有SOL余额）
- Solana RPC节点访问（推荐使用付费RPC以获得更好性能）

### 2. 安装

```bash
# 克隆仓库
git clone https://github.com/mx7625MX/SOL.git
cd SOL

# 安装依赖
pip install -r requirements.txt
```

### 3. 配置

复制示例配置文件并编辑：

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置以下必需参数：

```env
# Solana RPC节点（建议使用付费节点如Helius, QuickNode等）
RPC_ENDPOINT=https://api.mainnet-beta.solana.com
WS_ENDPOINT=wss://api.mainnet-beta.solana.com

# 你的钱包私钥（Base58格式）
PRIVATE_KEY=your_private_key_here

# 交易配置
MAX_BUY_AMOUNT=0.1          # 每次最大购买金额(SOL)
MIN_BUY_AMOUNT=0.01         # 每次最小购买金额(SOL)
SLIPPAGE_BPS=500            # 滑点容忍度(基点, 500=5%)

# 自动卖出配置
AUTO_SELL=false             # 是否启用自动卖出
SELL_PROFIT_PERCENTAGE=50   # 止盈百分比
STOP_LOSS_PERCENTAGE=20     # 止损百分比
```

### 4. 运行

```bash
python sniper_bot.py
```

## 配置说明

### RPC节点配置

免费的公共RPC节点可能会限速，建议使用付费RPC服务：

- **Helius**: https://helius.dev/
- **QuickNode**: https://www.quicknode.com/
- **Alchemy**: https://www.alchemy.com/
- **Triton**: https://triton.one/

### 私钥格式

私钥需要是Base58编码格式。你可以从以下来源获取：

- Phantom钱包导出
- Solflare钱包导出
- solana-keygen工具生成

**⚠️ 警告**: 永远不要分享你的私钥！确保 `.env` 文件已加入 `.gitignore`

### 交易参数

- **MAX_BUY_AMOUNT**: 单次购买的最大SOL数量
- **MIN_BUY_AMOUNT**: 单次购买的最小SOL数量
- **SLIPPAGE_BPS**: 滑点容忍度（基点），500 = 5%
- **GAS_PRIORITY_FEE**: 优先费用，提高可以加快交易确认

### 自动卖出

启用 `AUTO_SELL=true` 后，机器人会监控已购买的代币价格：

- 当盈利达到 `SELL_PROFIT_PERCENTAGE` 时自动卖出（止盈）
- 当亏损达到 `STOP_LOSS_PERCENTAGE` 时自动卖出（止损）

## 工作原理

1. **监控新代币**: 机器人通过WebSocket订阅pump.fun程序的交易日志
2. **检测创建事件**: 当检测到新代币创建交易时，立即提取代币地址
3. **获取代币信息**: 从pump.fun API获取代币的详细信息
4. **执行购买**: 构建并发送购买交易到Solana区块链
5. **监控持仓**: 如果启用自动卖出，持续监控代币价格并在达到目标时卖出

## 注意事项

⚠️ **重要风险提示**:

1. **资金风险**: 狙击新代币存在极高风险，可能导致资金损失
2. **技术风险**: pump.fun的合约逻辑可能随时变化
3. **网络风险**: 需要极快的网络连接才能抢先完成交易
4. **Rug Pull风险**: 许多新代币是骗局，可能会血本无归

**使用建议**:

- 仅投资你能承受损失的资金
- 使用专门的交易钱包，不要使用存放大量资金的主钱包
- 建议先在devnet测试
- 使用高质量的RPC节点
- 设置合理的止损点

## 开发状态

当前版本是框架实现，包含以下功能：

- ✅ 基础框架和配置系统
- ✅ WebSocket监控新代币
- ✅ 日志检测和代币提取
- ✅ 基础交易逻辑框架
- ⚠️ 需要实现: 完整的pump.fun交易指令构建
- ⚠️ 需要实现: 代币价格查询和价值计算

**注意**: 完整实现需要对pump.fun的合约进行逆向工程以获取准确的交易指令格式。

## 高级配置

### 使用付费RPC

编辑 `.env`:

```env
RPC_ENDPOINT=https://your-project.helius-rpc.com/?api-key=your-key
WS_ENDPOINT=wss://your-project.helius-rpc.com/?api-key=your-key
```

### 调整优先费用

在网络拥堵时提高优先费用可以加快交易：

```env
GAS_PRIORITY_FEE=0.001  # 增加到0.001 SOL
```

## 故障排除

### 无法连接到RPC

- 检查RPC端点是否正确
- 确认网络连接正常
- 尝试使用其他RPC提供商

### 私钥错误

- 确保私钥是Base58格式
- 检查是否有多余的空格或换行符
- 验证私钥对应的钱包是否有SOL余额

### 交易失败

- 检查钱包SOL余额是否充足
- 增加 `SLIPPAGE_BPS` 值
- 提高 `GAS_PRIORITY_FEE`
- 使用更快的RPC节点

## 许可证

MIT License

## 免责声明

本软件仅供学习和研究使用。使用本软件进行交易的所有风险由使用者自行承担。作者不对任何资金损失负责。

加密货币交易具有高风险，请谨慎投资。
