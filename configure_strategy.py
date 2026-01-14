#!/usr/bin/env python3
"""
利润监控机器人使用示例
演示不同的配置策略和使用场景
"""

import os
from dotenv import load_dotenv, set_key

# 策略配置示例
STRATEGIES = {
    "conservative": {
        "name": "保守止盈策略",
        "description": "利润20%就卖，快速落袋为安",
        "config": {
            "PROFIT_PERCENTAGE": "20",
            "WHALE_BUY_THRESHOLD": "2.0",
            "SELL_RATIO": "100",
            "MAX_EXECUTION_DELAY": "2.0",
            "GAS_PRIORITY_FEE": "0.0005"
        }
    },
    "aggressive": {
        "name": "激进策略",
        "description": "利润50%才卖，保留上涨空间",
        "config": {
            "PROFIT_PERCENTAGE": "50",
            "WHALE_BUY_THRESHOLD": "0.5",
            "SELL_RATIO": "50",
            "MAX_EXECUTION_DELAY": "2.0",
            "GAS_PRIORITY_FEE": "0.0005"
        }
    },
    "whale_follow": {
        "name": "跟随鲸鱼策略",
        "description": "只关注大额买入作为退出信号",
        "config": {
            "PROFIT_PERCENTAGE": "100",
            "WHALE_BUY_THRESHOLD": "5.0",
            "SELL_RATIO": "100",
            "MAX_EXECUTION_DELAY": "1.5",
            "GAS_PRIORITY_FEE": "0.001"
        }
    },
    "batch_profit": {
        "name": "分批止盈策略",
        "description": "逐步锁定利润，保留持仓",
        "config": {
            "PROFIT_PERCENTAGE": "30",
            "WHALE_BUY_THRESHOLD": "1.0",
            "SELL_RATIO": "30",
            "MAX_EXECUTION_DELAY": "2.0",
            "GAS_PRIORITY_FEE": "0.0005"
        }
    },
    "ultra_fast": {
        "name": "极速策略",
        "description": "最快速度执行，最高优先费用",
        "config": {
            "PROFIT_PERCENTAGE": "25",
            "WHALE_BUY_THRESHOLD": "0.8",
            "SELL_RATIO": "100",
            "MAX_EXECUTION_DELAY": "1.0",
            "GAS_PRIORITY_FEE": "0.01"
        }
    }
}


def print_strategies():
    """打印所有可用策略"""
    print("\n" + "="*70)
    print("可用的交易策略：")
    print("="*70 + "\n")
    
    for key, strategy in STRATEGIES.items():
        print(f"策略ID: {key}")
        print(f"名称: {strategy['name']}")
        print(f"描述: {strategy['description']}")
        print(f"配置:")
        for config_key, config_value in strategy['config'].items():
            print(f"  {config_key}: {config_value}")
        print()


def apply_strategy(strategy_id: str, env_file: str = ".env"):
    """应用指定的策略到.env文件"""
    if strategy_id not in STRATEGIES:
        print(f"错误: 策略 '{strategy_id}' 不存在")
        print_strategies()
        return False
    
    strategy = STRATEGIES[strategy_id]
    
    print(f"\n正在应用策略: {strategy['name']}")
    print(f"描述: {strategy['description']}\n")
    
    # 检查.env文件是否存在
    if not os.path.exists(env_file):
        print(f"警告: {env_file} 不存在，将从 .env.example 复制")
        if os.path.exists(".env.example"):
            import shutil
            shutil.copy(".env.example", env_file)
        else:
            print("错误: .env.example 也不存在，无法创建配置文件")
            return False
    
    # 更新配置
    for key, value in strategy['config'].items():
        set_key(env_file, key, value)
        print(f"✓ 设置 {key} = {value}")
    
    print(f"\n策略已成功应用到 {env_file}")
    print("\n现在可以运行:")
    print("  python pump_profit_bot.py")
    print()
    
    return True


def create_custom_strategy():
    """交互式创建自定义策略"""
    print("\n" + "="*70)
    print("创建自定义策略")
    print("="*70 + "\n")
    
    print("请按照提示输入参数（直接回车使用默认值）:\n")
    
    config = {}
    
    # 利润百分比
    profit = input("1. 止盈百分比 (默认: 30): ").strip()
    config['PROFIT_PERCENTAGE'] = profit if profit else "30"
    
    # 鲸鱼买入阈值
    whale = input("2. 鲸鱼买入阈值/SOL (默认: 1.0): ").strip()
    config['WHALE_BUY_THRESHOLD'] = whale if whale else "1.0"
    
    # 卖出比例
    sell_ratio = input("3. 卖出比例/% (10-100, 默认: 100): ").strip()
    config['SELL_RATIO'] = sell_ratio if sell_ratio else "100"
    
    # 最大执行延迟
    delay = input("4. 最大执行延迟/秒 (默认: 2.0): ").strip()
    config['MAX_EXECUTION_DELAY'] = delay if delay else "2.0"
    
    # 优先费用
    fee = input("5. Gas优先费用/SOL (默认: 0.0005): ").strip()
    config['GAS_PRIORITY_FEE'] = fee if fee else "0.0005"
    
    print("\n自定义策略配置:")
    for key, value in config.items():
        print(f"  {key}: {value}")
    
    confirm = input("\n确认应用此配置？(y/n): ").strip().lower()
    
    if confirm == 'y':
        for key, value in config.items():
            set_key(".env", key, value)
        print("\n✓ 自定义策略已应用")
        print("\n现在可以运行:")
        print("  python pump_profit_bot.py")
        return True
    else:
        print("\n已取消")
        return False


def show_current_config():
    """显示当前配置"""
    load_dotenv()
    
    print("\n" + "="*70)
    print("当前配置")
    print("="*70 + "\n")
    
    config_keys = [
        'PROFIT_PERCENTAGE',
        'WHALE_BUY_THRESHOLD',
        'SELL_RATIO',
        'MAX_EXECUTION_DELAY',
        'GAS_PRIORITY_FEE',
        'RPC_ENDPOINT',
        'SLIPPAGE_BPS'
    ]
    
    for key in config_keys:
        value = os.getenv(key, "未设置")
        print(f"{key}: {value}")
    
    print()


def main():
    """主函数"""
    print("\n" + "="*70)
    print("Pump.fun 利润监控机器人 - 策略配置工具")
    print("="*70)
    
    while True:
        print("\n请选择操作:")
        print("1. 查看所有预设策略")
        print("2. 应用预设策略")
        print("3. 创建自定义策略")
        print("4. 查看当前配置")
        print("5. 退出")
        
        choice = input("\n请输入选项 (1-5): ").strip()
        
        if choice == "1":
            print_strategies()
        
        elif choice == "2":
            print_strategies()
            strategy_id = input("\n请输入策略ID: ").strip()
            apply_strategy(strategy_id)
        
        elif choice == "3":
            create_custom_strategy()
        
        elif choice == "4":
            show_current_config()
        
        elif choice == "5":
            print("\n再见！")
            break
        
        else:
            print("\n无效的选项，请重试")


if __name__ == "__main__":
    main()
