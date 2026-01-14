# Solana 链上全自动监控机器人 🤖

一个功能完整的 Solana 链上代币自动监控和交易系统，提供前后端完整实现，适配 Windows 环境，界面与注释全部中文，专为零基础用户设计。

> **🎯 新版本说明：** 本项目已全面升级！包含完整的前后端实现、Web 界面、自动交易功能等。旧版 pump.fun 狙击机器人代码保留在项目中供参考。

## ✨ 核心功能（v2.0 全新实现）

### 🎯 智能监控系统
- ✅ 自动监听指定钱包的新 Token 买入事件
- ✅ 实时检测持仓 Token 盈利比例
- ✅ 持续更新市价，精确计算盈亏
- ✅ 监控其他钱包的大额买入行为

### 💼 钱包管理
- ✅ 支持助记词导入（12/24个单词）
- ✅ 支持私钥导入（Base58格式）
- ✅ 完美兼容 Phantom 钱包
- ✅ 完美兼容欧易（OKX）钱包
- ✅ 钱包信息加密存储

### ⚡ 自动交易
- ✅ 盈利达标自动卖出（2000ms内执行）
- ✅ 检测大额买入自动卖出
- ✅ 使用 Jupiter 聚合器获得最佳价格
- ✅ 详细的交易日志和错误处理

### 🖥️ Web 界面
- ✅ React + Ant Design 全中文界面
- ✅ 实时监控看板
- ✅ 持仓管理和交易历史
- ✅ 参数配置面板
- ✅ WebSocket 实时更新

### 📦 旧版功能（pump.fun 狙击）
- ✅ WebSocket实时监控新代币
- ✅ 代币创建事件检测
- ✅ 配置和日志系统
- ⚠️ 交易执行功能（框架已搭建，需pump.fun合约逆向工程）

## 功能特性

- 🔍 **实时监控**: 通过WebSocket实时监听pump.fun上的新代币发布
- ⚡ **快速狙击**: 检测到新代币后立即执行购买
- 💰 **自动交易**: 支持自动买入和可选的自动卖出
- 🛡️ **风险控制**: 内置滑点保护、止盈止损功能
- 📊 **详细日志**: 记录所有操作和交易结果
- ⚙️ **灵活配置**: 通过环境变量轻松配置各项参数

## 🚀 快速开始（零基础版）

### 系统要求
- Windows 10 或更高版本
- Node.js 16.0+ （[下载地址](https://nodejs.org/zh-cn/)）
- 至少 4GB 内存
- 稳定的网络连接

### 一键启动（推荐）

1. **下载项目**
   ```bash
   git clone https://github.com/mx7625MX/SOL.git
   cd SOL
   ```

2. **运行启动脚本**
   
   双击运行：`scripts/启动监控机器人.bat`
   
   脚本会自动：
   - ✅ 检查环境
   - ✅ 安装依赖
   - ✅ 创建配置
   - ✅ 启动服务
   - ✅ 打开浏览器

3. **访问界面**
   
   浏览器自动打开：http://localhost:3000

### 手动启动

如果您喜欢手动控制：

**启动后端：**
```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

**启动前端（新窗口）：**
```bash
cd frontend
npm install
npm run dev
```

### 详细教程

- 📖 [完整中文文档](docs/README_CN.md) - 详细功能说明和配置指南
- ⚡ [快速上手指南](docs/快速上手.md) - 5分钟上手教程
- 🔧 [故障排除](docs/故障排除.md) - 常见问题解决方案

## 📖 使用教程

### 1. 导入钱包

1. 打开 Web 界面
2. 点击"钱包管理"
3. 点击"导入钱包"
4. 选择类型并粘贴：
   - 助记词（12/24个单词）
   - 私钥（Base58格式）
   - Phantom 钱包导出
   - OKX 欧易钱包导出

### 2. 配置监控

1. 点击"监控设置"
2. 选择钱包
3. 设置参数：
   - **盈利阈值**：30%（建议）
   - **大额买入阈值**：1.0 SOL
   - **卖出比例**：100%
4. 开启"启用监控"
5. 保存配置

### 3. 启动监控

1. 在"监控设置"页面
2. 点击"启动监控"
3. 查看"监控看板"实时数据

### 4. 查看结果

- **监控看板**：实时持仓和盈亏
- **交易历史**：所有买卖记录
- **持仓管理**：详细持仓信息

## 📁 项目结构

```
SOL/
├── backend/              # Node.js 后端服务
│   ├── src/
│   │   ├── services/    # 核心服务（钱包、监控、交易）
│   │   ├── routes/      # API 路由
│   │   ├── config/      # 配置管理
│   │   └── utils/       # 工具函数
│   ├── data/            # SQLite 数据库
│   └── logs/            # 日志文件
│
├── frontend/            # React 前端界面
│   └── src/
│       ├── components/  # React 组件
│       ├── services/    # API 和 WebSocket
│       └── types/       # TypeScript 类型
│
├── docs/                # 中文文档
│   ├── README_CN.md     # 完整文档
│   ├── 快速上手.md       # 快速指南
│   └── 故障排除.md       # 问题解决
│
├── scripts/             # Windows 脚本
│   ├── 启动监控机器人.bat
│   ├── 停止监控机器人.bat
│   └── 系统检查.bat
│
└── [旧版文件]           # pump.fun 狙击机器人
    ├── sniper_bot.py
    ├── setup.py
    └── examples.py
```

## ⚠️ 重要风险提示

**请务必仔细阅读：**

### 资金风险
- 加密货币交易具有极高风险，可能导致全部资金损失
- 新代币风险极高，很多是骗局（Rug Pull）
- **仅投资您能承受损失的资金**

### 技术风险
- Solana 网络可能拥堵导致交易失败
- RPC 节点可能不稳定
- 智能合约可能存在漏洞

### 使用建议
1. **先在 Devnet 测试**
2. **使用专用钱包**，不要使用主钱包
3. **设置合理止损**
4. **持续监控系统**
5. **保持软件更新**

## 🔧 高级配置

### 使用付费 RPC 节点

编辑 `backend/.env`：
```env
RPC_ENDPOINT=https://mainnet.helius-rpc.com/?api-key=你的密钥
WS_ENDPOINT=wss://mainnet.helius-rpc.com/?api-key=你的密钥
```

推荐服务：
- **Helius**: https://helius.dev/ （推荐）
- **QuickNode**: https://www.quicknode.com/
- **Alchemy**: https://www.alchemy.com/

### 调整交易参数

```env
DEFAULT_SLIPPAGE=0.5      # 滑点容忍度
MAX_RETRY=3               # 最大重试次数
TRANSACTION_TIMEOUT=30000 # 交易超时（毫秒）
```

## 🆘 故障排除

### 常见问题

**Q: 无法启动服务？**
- 运行 `scripts/系统检查.bat`
- 查看 `backend/logs/monitor.log`

**Q: 导入钱包失败？**
- 确保助记词/私钥格式正确
- 检查是否有多余空格

**Q: 监控不工作？**
- 确保点击了"启动监控"
- 检查钱包是否启用监控
- 查看后端日志

**Q: 交易失败？**
- 检查 SOL 余额是否充足
- 增加滑点容忍度
- 使用更快的 RPC 节点

更多问题？查看 [故障排除文档](docs/故障排除.md)

## 📞 获取帮助

- 📖 [完整文档](docs/README_CN.md)
- ⚡ [快速上手](docs/快速上手.md)
- 🔧 [故障排除](docs/故障排除.md)
- 🐛 [报告问题](https://github.com/mx7625MX/SOL/issues)
- 💬 [社区讨论](https://github.com/mx7625MX/SOL/discussions)

## 📝 更新日志

### v2.0.0 (2026-01-14) - 全新版本 🎉
- ✅ 完整的前后端实现
- ✅ Web 界面（React + Ant Design）
- ✅ 钱包管理功能
- ✅ 自动监控和交易
- ✅ 实时数据更新
- ✅ 详细中文文档
- ✅ Windows 一键启动脚本

### v1.0.0 (2026-01-13) - 初始版本
- ✅ pump.fun 监控框架
- ✅ WebSocket 事件监听
- ✅ 基础配置系统

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## ⚖️ 免责声明

本软件仅供教育和研究使用。使用本软件进行交易的所有风险由使用者自行承担。作者不对任何资金损失负责。

加密货币交易具有高风险，可能导致全部资金损失。在使用真实资金前，请充分了解相关风险，并仅投资您能承受损失的金额。

**本软件不构成任何投资建议。**

---

**开发团队：** mx7625MX  
**最后更新：** 2026-01-14  
**版本：** v2.0.0

**如果觉得项目有帮助，请给个 ⭐ Star！**
