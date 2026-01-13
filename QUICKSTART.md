# 快速开始指南

## 5分钟快速启动

### 1. 安装依赖 (1分钟)

```bash
pip install -r requirements.txt
```

### 2. 配置机器人 (2分钟)

```bash
# 复制配置模板
cp .env.example .env

# 编辑配置文件
nano .env  # 或使用你喜欢的编辑器
```

**最少需要修改的配置:**
```env
PRIVATE_KEY=你的钱包私钥(Base58格式)
```

**推荐修改的配置:**
```env
RPC_ENDPOINT=你的RPC节点URL
MAX_BUY_AMOUNT=0.05  # 每次购买金额
```

### 3. 验证配置 (1分钟)

```bash
python setup.py
```

如果看到 "✓ 所有配置检查通过！"，说明配置正确。

### 4. 启动机器人 (1分钟)

```bash
python sniper_bot.py
```

看到以下输出表示启动成功:
```
机器人初始化成功
钱包地址: xxxxx
当前余额: x.xxxx SOL
开始监控新代币发布...
```

## 停止机器人

按 `Ctrl+C` 即可安全停止。

## 测试运行

如果你想先测试而不实际购买，可以运行监控模式:

```bash
python examples.py 3
```

这会只监控新代币但不执行购买。

## 常见问题

### Q: 私钥在哪里获取?

A: 
- **Phantom钱包**: 设置 → 安全与隐私 → 显示私钥
- **Solflare钱包**: 设置 → 导出私钥
- **命令行**: `solana-keygen new` (生成新钱包)

### Q: 需要多少SOL余额?

A: 至少需要:
- 交易金额 (MIN_BUY_AMOUNT)
- Gas费用 (约0.00001 SOL)
- 建议准备: 0.1-1 SOL

### Q: 如何提高成功率?

A:
1. 使用付费RPC (Helius, QuickNode)
2. 提高 GAS_PRIORITY_FEE
3. 使用低延迟网络环境
4. 降低 MAX_BUY_AMOUNT (更容易成交)

### Q: 安全吗?

A: 
- ⚠️ **永远不要分享私钥**
- ⚠️ **使用专门的交易钱包**
- ⚠️ **新代币风险极高，可能归零**
- ⚠️ **仅投资你能承受损失的资金**

## 下一步

- 阅读 [README.md](README.md) 了解详细功能
- 查看 [API.md](API.md) 学习自定义开发
- 运行 `python examples.py` 查看更多示例

## 获取帮助

遇到问题？
1. 运行 `python setup.py guide` 查看配置指南
2. 检查日志文件 `sniper_bot.log`
3. 在 GitHub 提交 Issue

## 重要提醒

🚨 **投资有风险，使用需谨慎！**

本软件仅供学习研究使用。作者不对任何资金损失负责。

---

祝你好运！🚀
