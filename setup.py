#!/usr/bin/env python3
"""
配置助手脚本
帮助用户设置和验证机器人配置
"""

import os
import sys
from pathlib import Path


def check_env_file():
    """检查.env文件是否存在"""
    env_file = Path('.env')
    env_example = Path('.env.example')
    
    if not env_file.exists():
        print("⚠️  未找到 .env 文件")
        if env_example.exists():
            print("正在从 .env.example 创建 .env 文件...")
            env_file.write_text(env_example.read_text())
            print("✓ .env 文件已创建，请编辑该文件填入你的配置")
        else:
            print("❌ 未找到 .env.example 文件")
        return False
    return True


def validate_config():
    """验证配置"""
    from dotenv import load_dotenv
    
    load_dotenv()
    
    issues = []
    warnings = []
    
    # 检查必需配置
    private_key = os.getenv('PRIVATE_KEY')
    if not private_key or private_key == 'your_private_key_here':
        issues.append("❌ PRIVATE_KEY 未设置或使用默认值")
    
    # 检查RPC配置
    rpc_endpoint = os.getenv('RPC_ENDPOINT')
    if not rpc_endpoint:
        issues.append("❌ RPC_ENDPOINT 未设置")
    elif 'api.mainnet-beta.solana.com' in rpc_endpoint:
        warnings.append("⚠️  使用公共RPC节点，建议使用付费RPC以获得更好性能")
    
    # 检查交易参数
    try:
        max_buy = float(os.getenv('MAX_BUY_AMOUNT', '0'))
        min_buy = float(os.getenv('MIN_BUY_AMOUNT', '0'))
        
        if max_buy <= 0:
            issues.append("❌ MAX_BUY_AMOUNT 必须大于0")
        if min_buy <= 0:
            issues.append("❌ MIN_BUY_AMOUNT 必须大于0")
        if max_buy < min_buy:
            issues.append("❌ MAX_BUY_AMOUNT 必须大于等于 MIN_BUY_AMOUNT")
        if max_buy > 1.0:
            warnings.append(f"⚠️  MAX_BUY_AMOUNT ({max_buy} SOL) 较大，请确认")
    except ValueError:
        issues.append("❌ 交易金额配置格式错误")
    
    # 检查滑点
    try:
        slippage = int(os.getenv('SLIPPAGE_BPS', '0'))
        if slippage < 0:
            issues.append("❌ SLIPPAGE_BPS 不能为负数")
        elif slippage > 1000:
            warnings.append(f"⚠️  SLIPPAGE_BPS ({slippage/100}%) 较大，可能导致滑点过高")
    except ValueError:
        issues.append("❌ SLIPPAGE_BPS 格式错误")
    
    # 显示结果
    print("\n" + "="*60)
    print("配置验证结果")
    print("="*60)
    
    if not issues and not warnings:
        print("✓ 所有配置检查通过！")
        return True
    
    if issues:
        print("\n严重问题:")
        for issue in issues:
            print(f"  {issue}")
    
    if warnings:
        print("\n警告:")
        for warning in warnings:
            print(f"  {warning}")
    
    return len(issues) == 0


def show_config_guide():
    """显示配置指南"""
    print("""
╔══════════════════════════════════════════════════════════════╗
║          Pump.fun 狙击机器人 - 配置指南                      ║
╚══════════════════════════════════════════════════════════════╝

1. 获取Solana钱包私钥
   - 使用 Phantom、Solflare 等钱包导出私钥
   - 或使用 solana-keygen 工具生成新钱包
   - 私钥格式: Base58编码字符串

2. 配置RPC节点
   免费RPC (有限速):
   - https://api.mainnet-beta.solana.com
   
   推荐付费RPC (更快、更稳定):
   - Helius: https://helius.dev/
   - QuickNode: https://www.quicknode.com/
   - Alchemy: https://www.alchemy.com/

3. 设置交易参数
   - MAX_BUY_AMOUNT: 建议从小额开始 (0.01-0.1 SOL)
   - SLIPPAGE_BPS: 一般设置 300-800 (3%-8%)
   - GAS_PRIORITY_FEE: 提高可加快交易确认

4. 风险管理
   - 仅投资你能承受损失的资金
   - 设置合理的止损点
   - 使用专门的交易钱包

5. 测试运行
   - 建议先在小额测试
   - 观察日志输出
   - 验证交易是否正常执行

⚠️  重要提示:
   - 永远不要分享你的私钥
   - 新代币交易风险极高
   - 可能面临完全损失

需要帮助? 查看 README.md 获取详细文档
    """)


def main():
    """主函数"""
    print("Pump.fun 狙击机器人 - 配置助手\n")
    
    if len(sys.argv) > 1 and sys.argv[1] == 'guide':
        show_config_guide()
        return
    
    # 检查依赖
    try:
        import dotenv
    except ImportError:
        print("❌ 未安装 python-dotenv")
        print("请运行: pip install -r requirements.txt")
        return
    
    # 检查.env文件
    if not check_env_file():
        print("\n请编辑 .env 文件后再次运行此脚本验证配置")
        return
    
    # 验证配置
    print("\n正在验证配置...")
    if validate_config():
        print("\n✓ 配置验证成功！可以运行 python sniper_bot.py 启动机器人")
    else:
        print("\n❌ 配置存在问题，请修复后重试")
        print("提示: 运行 'python setup.py guide' 查看配置指南")


if __name__ == "__main__":
    main()
