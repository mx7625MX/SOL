# 故障排除指南

## 常见问题和解决方案

### 安装问题

#### 问题: `pip install` 失败

**解决方案:**

```bash
# 升级pip
python -m pip install --upgrade pip

# 使用国内镜像源
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple

# 或者使用阿里云镜像
pip install -r requirements.txt -i https://mirrors.aliyun.com/pypi/simple/
```

#### 问题: solana库安装失败

**解决方案:**

```bash
# 确保Python版本是3.8或更高
python --version

# 单独安装依赖
pip install solana
pip install solders
pip install websockets
pip install python-dotenv
pip install requests
pip install colorama
```

### 配置问题

#### 问题: "请在.env文件中设置您的私钥"

**原因:** 未创建 .env 文件或私钥配置错误

**解决方案:**

```bash
# 1. 复制示例配置
cp .env.example .env

# 2. 编辑.env文件
nano .env  # 或使用其他编辑器

# 3. 设置正确的私钥
PRIVATE_KEY=你的实际私钥(Base58格式)
```

#### 问题: "私钥格式错误"

**原因:** 私钥格式不正确

**解决方案:**

确保私钥是Base58编码格式:
- 长度通常是87-88个字符
- 只包含Base58字符集 (1-9, A-Z, a-z, 不包括0, O, I, l)
- 示例格式: `5Kb8kLf9CJq...` (完整长度)

**获取正确格式的私钥:**

1. **Phantom钱包:**
   - 设置 → 安全与隐私 → 显示私钥
   - 复制显示的私钥字符串

2. **Solflare钱包:**
   - 设置 → 导出私钥
   - 选择"显示私钥"

3. **命令行工具:**
   ```bash
   # 查看密钥文件
   solana-keygen pubkey ~/.config/solana/id.json
   # 导出为Base58
   cat ~/.config/solana/id.json
   ```

### 连接问题

#### 问题: "WebSocket连接错误"

**可能原因:**
1. RPC节点不可用
2. 网络连接问题
3. 节点不支持WebSocket

**解决方案:**

```bash
# 测试RPC连接
curl https://api.mainnet-beta.solana.com -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'

# 如果失败，更换RPC节点
# 编辑 .env
RPC_ENDPOINT=https://your-alternate-rpc.com
WS_ENDPOINT=wss://your-alternate-rpc.com
```

**推荐的RPC提供商:**
- Helius: https://helius.dev/
- QuickNode: https://www.quicknode.com/
- GenesysGo: https://genesysgo.com/

#### 问题: RPC请求超时或限速

**解决方案:**

使用付费RPC服务，它们提供:
- 更高的请求限制
- 更低的延迟
- 更好的稳定性

### 交易问题

#### 问题: "余额不足以进行交易"

**解决方案:**

```bash
# 检查钱包余额
# 确保至少有:
# - 购买金额 (MIN_BUY_AMOUNT)
# - Gas费用 (~0.00001 SOL)
# - 一些额外余额作为缓冲

# 建议准备: 0.1-1 SOL
```

#### 问题: 交易总是失败

**可能原因:**

1. **网络延迟过高** - 被其他人抢先
   ```env
   # 提高优先费用
   GAS_PRIORITY_FEE=0.001
   ```

2. **滑点设置太低**
   ```env
   # 增加滑点容忍度
   SLIPPAGE_BPS=800  # 8%
   ```

3. **购买金额太大**
   ```env
   # 减少购买金额
   MIN_BUY_AMOUNT=0.01
   ```

4. **RPC节点太慢**
   - 使用付费RPC服务
   - 选择地理位置近的节点

### 监控问题

#### 问题: 没有检测到新代币

**可能原因:**
1. pump.fun上没有新代币创建
2. 日志过滤逻辑需要调整
3. WebSocket连接断开

**调试方法:**

```bash
# 查看日志文件
tail -f sniper_bot.log

# 应该看到类似这样的输出:
# "已订阅 pump.fun 程序日志"
# "WebSocket连接正常"
```

**验证pump.fun活动:**
- 访问 https://pump.fun
- 查看是否有新代币正在创建
- 确认程序地址: `6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P`

#### 问题: 检测到代币但无法获取信息

**原因:** pump.fun API不可用或限速

**解决方案:**

```python
# API端点可能变化，检查是否需要更新
PUMPFUN_API=https://frontend-api.pump.fun

# 或者使用代理
```

### 运行时错误

#### 问题: "ModuleNotFoundError"

**解决方案:**

```bash
# 确保已安装所有依赖
pip install -r requirements.txt

# 检查Python路径
python -c "import sys; print(sys.path)"

# 在正确的目录运行
cd /path/to/SOL
python sniper_bot.py
```

#### 问题: 机器人突然停止

**可能原因:**
1. 网络连接中断
2. RPC节点问题
3. 未捕获的异常

**解决方案:**

```bash
# 查看日志
cat sniper_bot.log | tail -50

# 自动重启脚本
while true; do
    python sniper_bot.py
    echo "机器人停止，5秒后重启..."
    sleep 5
done
```

### 性能问题

#### 问题: 响应太慢，总是抢不到

**优化建议:**

1. **使用高性能RPC**
   - 选择专业的付费RPC服务
   - 选择地理位置近的节点

2. **提高优先费用**
   ```env
   GAS_PRIORITY_FEE=0.005  # 更高的费用
   ```

3. **优化网络环境**
   - 使用有线网络而非WiFi
   - 选择低延迟的服务器部署
   - 考虑在AWS/GCP等云平台运行

4. **减少购买金额**
   - 更小的交易更容易快速完成
   ```env
   MIN_BUY_AMOUNT=0.01
   ```

### 安全问题

#### 问题: 担心私钥安全

**最佳实践:**

1. **使用专门的交易钱包**
   ```bash
   # 创建新钱包用于狙击
   solana-keygen new -o trading-wallet.json
   ```

2. **限制钱包余额**
   - 只保留交易所需的最少金额
   - 定期转出盈利

3. **保护.env文件**
   ```bash
   # 确保.env在.gitignore中
   chmod 600 .env  # 仅所有者可读写
   ```

4. **定期更换密钥**
   - 如果怀疑泄露，立即更换

## 日志分析

### 正常运行的日志示例:

```
2026-01-13 21:49:14 - INFO - 机器人初始化成功
2026-01-13 21:49:14 - INFO - 钱包地址: xxxxx
2026-01-13 21:49:14 - INFO - 当前余额: 0.5000 SOL
2026-01-13 21:49:14 - INFO - 已订阅 pump.fun 程序日志
2026-01-13 21:49:15 - INFO - 开始监控新代币发布...
```

### 错误日志示例:

```
ERROR - WebSocket连接错误: Connection refused
WARNING - 警告: 余额不足以进行交易!
ERROR - 执行购买失败: Transaction simulation failed
```

## 获取更多帮助

如果以上方案都无法解决你的问题:

1. **查看完整日志**
   ```bash
   cat sniper_bot.log
   ```

2. **运行配置检查**
   ```bash
   python setup.py
   ```

3. **提交Issue**
   - 访问 GitHub 仓库
   - 创建新的 Issue
   - 包含错误信息和日志

4. **社区支持**
   - 查看其他用户的 Issues
   - 参与讨论

## 调试技巧

### 启用详细日志

编辑 `sniper_bot.py`，修改日志级别:

```python
logging.basicConfig(
    level=logging.DEBUG,  # 改为DEBUG
    # ...
)
```

### 测试模式

使用示例3运行监控模式，不实际交易:

```bash
python examples.py 3
```

### 手动测试RPC连接

```python
import asyncio
from solana.rpc.async_api import AsyncClient

async def test_rpc():
    client = AsyncClient("your_rpc_endpoint")
    health = await client.get_health()
    print(health)
    await client.close()

asyncio.run(test_rpc())
```

---

**记住:** 遇到问题不要慌，仔细检查日志，逐步排查！
