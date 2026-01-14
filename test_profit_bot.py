#!/usr/bin/env python3
"""
利润监控机器人功能测试脚本
测试各个组件的基本功能
"""

import os
import sys
import asyncio
from unittest.mock import Mock, patch
from dotenv import load_dotenv

# 添加当前目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# 加载环境变量
load_dotenv()


def test_imports():
    """测试所有必需的库是否可以导入"""
    print("测试1: 检查依赖库...")
    
    try:
        import solana
        import solders
        import websockets
        import requests
        import colorama
        print("✓ 所有依赖库导入成功")
        return True
    except ImportError as e:
        print(f"✗ 依赖库导入失败: {e}")
        print("请运行: pip install -r requirements.txt")
        return False


def test_env_config():
    """测试环境变量配置"""
    print("\n测试2: 检查环境变量配置...")
    
    required_vars = [
        'RPC_ENDPOINT',
        'WS_ENDPOINT',
        'PRIVATE_KEY'
    ]
    
    optional_vars = [
        'PROFIT_PERCENTAGE',
        'WHALE_BUY_THRESHOLD',
        'SELL_RATIO',
        'MAX_EXECUTION_DELAY'
    ]
    
    all_ok = True
    
    for var in required_vars:
        value = os.getenv(var)
        if not value or value == 'your_private_key_here':
            print(f"✗ {var} 未正确配置")
            all_ok = False
        else:
            # 隐藏敏感信息
            if var == 'PRIVATE_KEY':
                print(f"✓ {var} 已配置 (***隐藏***)")
            else:
                print(f"✓ {var} = {value}")
    
    for var in optional_vars:
        value = os.getenv(var)
        if value:
            print(f"✓ {var} = {value}")
        else:
            print(f"⚠ {var} 未配置（将使用默认值）")
    
    if not all_ok:
        print("\n请复制 .env.example 到 .env 并配置必需的参数")
    
    return all_ok


def test_bot_init():
    """测试机器人初始化"""
    print("\n测试3: 测试机器人初始化...")
    
    # 检查是否配置了私钥
    private_key = os.getenv('PRIVATE_KEY')
    if not private_key or private_key == 'your_private_key_here':
        print("✗ 需要配置有效的私钥才能初始化机器人")
        print("提示: 这是正常的，配置.env后再测试")
        return False
    
    try:
        from pump_profit_bot import PumpProfitBot
        
        bot = PumpProfitBot()
        
        # 检查基本属性
        assert hasattr(bot, 'wallet')
        assert hasattr(bot, 'profit_percentage')
        assert hasattr(bot, 'whale_buy_threshold')
        assert hasattr(bot, 'sell_ratio')
        assert hasattr(bot, 'max_execution_delay')
        
        print(f"✓ 机器人初始化成功")
        print(f"  钱包地址: {bot.wallet.pubkey()}")
        print(f"  止盈百分比: {bot.profit_percentage}%")
        print(f"  鲸鱼阈值: {bot.whale_buy_threshold} SOL")
        print(f"  卖出比例: {bot.sell_ratio}%")
        
        return True
        
    except ValueError as e:
        print(f"✗ 初始化失败: {e}")
        return False
    except Exception as e:
        print(f"✗ 未预期的错误: {e}")
        return False


async def test_rpc_connection():
    """测试RPC连接"""
    print("\n测试4: 测试RPC连接...")
    
    private_key = os.getenv('PRIVATE_KEY')
    if not private_key or private_key == 'your_private_key_here':
        print("⚠ 跳过RPC连接测试（需要配置私钥）")
        return True
    
    try:
        from pump_profit_bot import PumpProfitBot
        from solana.rpc.async_api import AsyncClient
        
        bot = PumpProfitBot()
        client = AsyncClient(bot.rpc_endpoint)
        
        # 测试获取最新区块高度
        response = await client.get_slot()
        if response.value:
            print(f"✓ RPC连接成功")
            print(f"  当前区块高度: {response.value}")
            
            # 测试获取余额
            balance_response = await client.get_balance(bot.wallet.pubkey())
            if balance_response.value is not None:
                balance = balance_response.value / 1e9
                print(f"  钱包余额: {balance:.4f} SOL")
            
            await client.close()
            return True
        else:
            print("✗ RPC连接失败: 无法获取区块高度")
            await client.close()
            return False
            
    except Exception as e:
        print(f"✗ RPC连接失败: {e}")
        return False


def test_configuration_values():
    """测试配置参数的合理性"""
    print("\n测试5: 检查配置参数合理性...")
    
    try:
        profit_pct = float(os.getenv('PROFIT_PERCENTAGE', '30'))
        whale_threshold = float(os.getenv('WHALE_BUY_THRESHOLD', '1.0'))
        sell_ratio = float(os.getenv('SELL_RATIO', '100'))
        max_delay = float(os.getenv('MAX_EXECUTION_DELAY', '2.0'))
        
        all_ok = True
        
        # 检查利润百分比
        if profit_pct < 1 or profit_pct > 1000:
            print(f"⚠ PROFIT_PERCENTAGE ({profit_pct}) 可能不合理（建议: 10-200）")
            all_ok = False
        else:
            print(f"✓ PROFIT_PERCENTAGE: {profit_pct}%")
        
        # 检查鲸鱼阈值
        if whale_threshold < 0.1 or whale_threshold > 100:
            print(f"⚠ WHALE_BUY_THRESHOLD ({whale_threshold}) 可能不合理（建议: 0.5-10）")
            all_ok = False
        else:
            print(f"✓ WHALE_BUY_THRESHOLD: {whale_threshold} SOL")
        
        # 检查卖出比例
        if sell_ratio < 10 or sell_ratio > 100:
            print(f"✗ SELL_RATIO ({sell_ratio}) 必须在10-100之间")
            all_ok = False
        else:
            print(f"✓ SELL_RATIO: {sell_ratio}%")
        
        # 检查最大延迟
        if max_delay < 0.5 or max_delay > 10:
            print(f"⚠ MAX_EXECUTION_DELAY ({max_delay}) 可能不合理（建议: 1-5）")
            all_ok = False
        else:
            print(f"✓ MAX_EXECUTION_DELAY: {max_delay}s")
        
        return all_ok
        
    except ValueError as e:
        print(f"✗ 配置参数格式错误: {e}")
        return False


def test_base58_decoder():
    """测试Base58解码功能"""
    print("\n测试6: 测试Base58解码...")
    
    try:
        from pump_profit_bot import PumpProfitBot
        
        # 测试已知的Base58字符串
        test_string = "11111111111111111111111111111111"  # 全1的地址
        result = PumpProfitBot._decode_base58(test_string)
        
        assert isinstance(result, bytes)
        print("✓ Base58解码功能正常")
        return True
        
    except Exception as e:
        print(f"✗ Base58解码失败: {e}")
        return False


def print_summary(results):
    """打印测试摘要"""
    print("\n" + "="*70)
    print("测试摘要")
    print("="*70)
    
    total = len(results)
    passed = sum(results.values())
    failed = total - passed
    
    print(f"\n总计: {total} 个测试")
    print(f"通过: {passed} 个")
    print(f"失败: {failed} 个")
    
    if failed == 0:
        print("\n✓ 所有测试通过！")
        print("\n机器人已准备就绪，可以运行:")
        print("  python pump_profit_bot.py")
    else:
        print("\n⚠ 部分测试失败")
        print("请根据上述提示修复问题后再运行机器人")
    
    print()


async def run_async_tests():
    """运行异步测试"""
    results = {}
    
    # 异步测试
    results['RPC连接'] = await test_rpc_connection()
    
    return results


def main():
    """主函数"""
    print("="*70)
    print("Pump.fun 利润监控机器人 - 功能测试")
    print("="*70)
    
    results = {}
    
    # 同步测试
    results['依赖库'] = test_imports()
    results['环境变量'] = test_env_config()
    results['机器人初始化'] = test_bot_init()
    results['配置参数'] = test_configuration_values()
    results['Base58解码'] = test_base58_decoder()
    
    # 异步测试
    if results['依赖库'] and results['环境变量']:
        async_results = asyncio.run(run_async_tests())
        results.update(async_results)
    
    # 打印摘要
    print_summary(results)


if __name__ == "__main__":
    main()
