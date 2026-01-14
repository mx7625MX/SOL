# 快速开始指南 - 利润监控&自动卖出机器人

## 5分钟快速设置

### 第一步：安装依赖

```bash
pip install -r requirements.txt
```

### 第二步：配置环境变量

```bash
# 复制配置文件模板
cp .env.example .env

# 编辑配置文件
nano .env  # 或使用其他文本编辑器
```

必须配置的参数：
```env
# 1. RPC节点（推荐使用付费节点）
RPC_ENDPOINT=https://api.mainnet-beta.solana.com
WS_ENDPOINT=wss://api.mainnet-beta.solana.com

# 2. 钱包私钥（Base58格式）
PRIVATE_KEY=你的钱包私钥
```

### 第三步：选择策略（可选）

使用策略配置工具快速设置：

```bash
python configure_strategy.py
```

或者手动配置参数：

```env
# 利润监控配置
PROFIT_PERCENTAGE=30          # 利润30%时卖出
WHALE_BUY_THRESHOLD=1.0       # 检测到买入超过1 SOL时卖出
SELL_RATIO=100                # 卖出100%（全部）
MAX_EXECUTION_DELAY=2.0       # 最大延迟2秒
```

### 第四步：测试配置

```bash
python test_profit_bot.py
```

确保所有测试通过。

### 第五步：运行机器人

```bash
python pump_profit_bot.py
```

## 预设策略说明

### 1. 保守止盈策略
```env
PROFIT_PERCENTAGE=20
WHALE_BUY_THRESHOLD=2.0
SELL_RATIO=100
```
- 适合：追求稳定收益
- 特点：快速止盈，及时落袋

### 2. 激进策略
```env
PROFIT_PERCENTAGE=50
WHALE_BUY_THRESHOLD=0.5
SELL_RATIO=50
```
- 适合：追求高收益
- 特点：保留上涨空间，部分止盈

### 3. 跟随鲸鱼策略
```env
PROFIT_PERCENTAGE=100
WHALE_BUY_THRESHOLD=5.0
SELL_RATIO=100
```
- 适合：利用鲸鱼动向
- 特点：只在大额买入时退出

### 4. 分批止盈策略
```env
PROFIT_PERCENTAGE=30
WHALE_BUY_THRESHOLD=1.0
SELL_RATIO=30
```
- 适合：逐步锁定利润
- 特点：分批卖出，降低风险

### 5. 极速策略
```env
PROFIT_PERCENTAGE=25
WHALE_BUY_THRESHOLD=0.8
SELL_RATIO=100
MAX_EXECUTION_DELAY=1.0
GAS_PRIORITY_FEE=0.01
```
- 适合：追求最快速度
- 特点：高优先费用，极速执行

## 常见问题

### Q: 如何获取私钥？

从Phantom或Solflare钱包导出：
1. 打开钱包设置
2. 找到"导出私钥"选项
3. 复制Base58格式的私钥

⚠️ **警告**: 永远不要分享你的私钥！

### Q: 推荐使用哪个RPC节点？

付费RPC服务（推荐）：
- Helius: https://helius.dev/
- QuickNode: https://www.quicknode.com/
- Alchemy: https://www.alchemy.com/

免费节点可能会限速，影响执行速度。

### Q: 如何确保最快的执行速度？

1. 使用低延迟RPC节点
2. 提高GAS_PRIORITY_FEE（如0.001-0.01 SOL）
3. 将MAX_EXECUTION_DELAY设置为1.0-1.5秒
4. 部署在云服务器上（靠近Solana节点）

### Q: 机器人会自动买入吗？

**不会**。这个机器人只监控和卖出。它会：
1. 监测你钱包的买入交易
2. 识别新买的代币
3. 监控利润并自动卖出

如果需要自动买入，请使用 `sniper_bot.py`。

### Q: 可以同时运行多个机器人吗？

可以！你可以：
1. 用 `sniper_bot.py` 自动买入新代币
2. 用 `pump_profit_bot.py` 监控和卖出

### Q: 卖出功能是否已经可用？

⚠️ **当前状态**: 卖出功能框架已完成，但需要pump.fun合约逆向工程才能实际执行交易。

已实现：
- ✅ 监控逻辑
- ✅ 利润计算
- ✅ 触发条件
- ⚠️ 实际交易执行（待实现）

### Q: 如何知道机器人在正常运行？

查看日志文件：
```bash
tail -f pump_profit_bot.log
```

正常运行时会显示：
- 已订阅钱包交易日志
- 开始持仓监控循环
- 定期的状态更新

## 安全建议

1. ✅ **使用专门的交易钱包**
   - 不要使用存放大量资金的主钱包
   - 只存入用于交易的SOL

2. ✅ **保护私钥**
   - 确保.env文件已加入.gitignore
   - 不要分享或上传私钥
   - 定期更换交易钱包

3. ✅ **从小额开始**
   - 先测试配置是否正确
   - 从小额交易开始
   - 逐步增加金额

4. ✅ **设置合理的止盈**
   - 不要贪心，设置实际的目标
   - 考虑市场波动性
   - 适时调整参数

5. ✅ **监控运行状态**
   - 定期查看日志
   - 检查余额变化
   - 关注异常情况

## 下一步

设置完成后：

1. **监控运行状态**
   ```bash
   tail -f pump_profit_bot.log
   ```

2. **查看详细文档**
   - [PROFIT_BOT_README.md](./PROFIT_BOT_README.md) - 完整文档
   - [README.md](./README.md) - 项目概览

3. **调整策略**
   ```bash
   python configure_strategy.py
   ```

4. **获取帮助**
   - 查看日志中的错误信息
   - 阅读TROUBLESHOOTING.md

## 紧急停止

如果需要立即停止机器人：

1. **按 Ctrl+C** 停止运行
2. 机器人会安全关闭连接
3. 检查日志确认已停止

## 性能监控

监控机器人性能：

```bash
# 实时查看日志
tail -f pump_profit_bot.log

# 检查最近的卖出记录
grep "执行卖出" pump_profit_bot.log

# 查看利润达标记录
grep "触发止盈" pump_profit_bot.log
```

## 技术支持

如遇到问题：

1. 查看 [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
2. 运行测试脚本：`python test_profit_bot.py`
3. 检查日志文件：`pump_profit_bot.log`
4. 提交Issue到GitHub仓库

---

**免责声明**: 加密货币交易存在高风险，使用本软件的所有风险由使用者自行承担。
