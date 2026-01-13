# 项目结构

```
SOL/
├── README.md                 # 项目主文档，功能介绍和使用指南
├── QUICKSTART.md            # 5分钟快速开始指南
├── API.md                   # API文档和开发指南
├── CHANGELOG.md             # 版本更新日志
├── TROUBLESHOOTING.md       # 故障排除指南
├── LICENSE                  # MIT许可证和免责声明
│
├── requirements.txt         # Python依赖包列表
├── .env.example            # 环境变量配置模板
├── .gitignore              # Git忽略文件配置
│
├── sniper_bot.py           # 主程序：狙击机器人核心实现
├── setup.py                # 配置助手：验证和设置工具
└── examples.py             # 使用示例：多种使用场景演示
```

## 文件说明

### 核心文件

#### `sniper_bot.py` (17KB)
主程序文件，包含核心功能实现:

- **PumpFunSniper类**: 狙击机器人主类
  - `__init__()`: 初始化配置和连接
  - `start()`: 启动机器人
  - `stop()`: 停止机器人
  - `_monitor_new_tokens()`: 监控新代币
  - `_monitor_via_websocket()`: WebSocket监听
  - `_snipe_token()`: 执行狙击
  - `_execute_buy()`: 执行购买交易
  - `_execute_sell()`: 执行卖出交易
  - `_monitor_position()`: 监控持仓

**功能特点:**
- 异步编程，高性能
- WebSocket实时监听
- 完整的错误处理
- 彩色日志输出
- 支持自动止盈止损

#### `setup.py` (5KB)
配置助手脚本:

- 检查和创建 .env 文件
- 验证配置参数
- 显示配置指南
- 给出优化建议

**使用方法:**
```bash
python setup.py          # 验证配置
python setup.py guide    # 显示配置指南
```

#### `examples.py` (8.5KB)
使用示例脚本，包含4个示例:

1. **基本使用**: 标准狙击模式
2. **自定义过滤**: 根据条件过滤代币
3. **仅监控模式**: 不购买，只记录
4. **Telegram通知**: 集成消息通知

**使用方法:**
```bash
python examples.py       # 显示所有示例
python examples.py 1     # 运行示例1
python examples.py 3     # 运行示例3
```

### 配置文件

#### `.env.example` (483B)
环境变量配置模板，包含:

- Solana RPC/WS节点配置
- 钱包私钥配置
- 交易参数配置
- pump.fun程序配置
- 自动卖出配置

**使用方法:**
```bash
cp .env.example .env
nano .env  # 编辑配置
```

#### `requirements.txt` (102B)
Python依赖包列表:

- `solana>=0.30.2` - Solana Web3库
- `solders>=0.18.1` - Solana数据结构
- `requests>=2.31.0` - HTTP请求
- `websockets>=12.0` - WebSocket客户端
- `python-dotenv>=1.0.0` - 环境变量管理
- `colorama>=0.4.6` - 彩色终端输出

#### `.gitignore` (324B)
Git忽略配置:

- 环境变量文件 (.env)
- Python缓存 (__pycache__, *.pyc)
- 虚拟环境 (venv/, env/)
- IDE配置 (.vscode/, .idea/)
- 日志文件 (*.log)

### 文档文件

#### `README.md` (5KB)
项目主文档:

- 功能特性介绍
- 快速开始指南
- 配置说明
- 工作原理
- 注意事项和风险提示

#### `QUICKSTART.md` (2.3KB)
快速开始指南:

- 5分钟快速启动流程
- 常见问题解答
- 安全提醒
- 下一步建议

#### `API.md` (6.1KB)
API文档和开发指南:

- 核心类和方法说明
- 配置参数详解
- 工作流程详解
- 扩展开发指南
- pump.fun合约分析
- 参考资源

#### `CHANGELOG.md` (2.5KB)
版本更新日志:

- v1.0.0 版本说明
- 功能列表
- 技术特点
- 已知限制
- 下一步计划

#### `TROUBLESHOOTING.md` (6.9KB)
故障排除指南:

- 安装问题解决
- 配置问题解决
- 连接问题解决
- 交易问题解决
- 性能优化建议
- 日志分析方法

#### `LICENSE` (1.9KB)
MIT许可证和免责声明:

- MIT开源许可
- 详细的免责声明
- 风险提示
- 使用条款

## 目录结构建议

实际使用时，可以按以下结构组织:

```
SOL/
├── [核心文件]
│   ├── sniper_bot.py
│   ├── setup.py
│   └── examples.py
│
├── [配置文件]
│   ├── .env                    # 你的实际配置（不提交）
│   ├── .env.example
│   ├── .gitignore
│   └── requirements.txt
│
├── [文档]
│   ├── README.md
│   ├── QUICKSTART.md
│   ├── API.md
│   ├── CHANGELOG.md
│   ├── TROUBLESHOOTING.md
│   └── PROJECT_STRUCTURE.md
│
├── [运行时文件] (自动生成)
│   ├── sniper_bot.log          # 日志文件
│   └── __pycache__/            # Python缓存
│
└── [可选扩展]
    ├── strategies/             # 自定义策略
    │   ├── basic.py
    │   ├── filtered.py
    │   └── advanced.py
    │
    ├── utils/                  # 工具函数
    │   ├── notifications.py
    │   ├── analytics.py
    │   └── helpers.py
    │
    └── tests/                  # 测试文件
        ├── test_sniper.py
        └── test_config.py
```

## 使用流程

### 新手流程

```bash
1. 阅读 README.md           # 了解项目
2. 阅读 QUICKSTART.md       # 快速上手
3. 运行 python setup.py     # 配置和验证
4. 运行 python examples.py 3  # 测试监控
5. 运行 python sniper_bot.py  # 正式运行
```

### 开发者流程

```bash
1. 阅读 API.md              # 了解API
2. 查看 examples.py         # 学习示例
3. 开发自定义策略           # 扩展功能
4. 参考 TROUBLESHOOTING.md  # 解决问题
```

## 开发规划

### 当前状态 (v1.0.0)

✅ 基础框架完成
✅ 监控系统实现
✅ 配置系统完善
✅ 文档齐全

### 待完善功能

⚠️ pump.fun交易指令构建
⚠️ 代币价格实时获取
⚠️ 完整的买卖交易实现

### 未来计划

- 数据库存储交易历史
- Web界面管理
- 更多DEX支持
- 高级策略系统
- 性能优化

## 贡献指南

欢迎贡献代码！请遵循:

1. Fork 项目
2. 创建功能分支
3. 编写测试
4. 提交PR
5. 等待审核

## 技术栈

- **语言**: Python 3.8+
- **区块链**: Solana
- **网络**: WebSocket, HTTP
- **异步**: asyncio
- **依赖管理**: pip
- **配置**: python-dotenv

## 支持

- 📖 文档: 查看各个 .md 文件
- 🐛 Bug: 提交 GitHub Issue
- 💡 建议: 提交 GitHub Issue
- 🤝 贡献: 提交 Pull Request

---

最后更新: 2026-01-13
