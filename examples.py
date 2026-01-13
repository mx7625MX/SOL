#!/usr/bin/env python3
"""
示例脚本: 演示如何使用狙击机器人的各种功能
"""

import asyncio
import logging
from sniper_bot import PumpFunSniper

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def example_basic_usage():
    """示例1: 基本使用 - 启动机器人监控新代币"""
    print("\n" + "="*60)
    print("示例1: 基本使用")
    print("="*60)
    
    try:
        # 创建机器人实例
        bot = PumpFunSniper()
        
        # 启动机器人（会持续运行直到手动停止）
        await bot.start()
        
    except ValueError as e:
        print(f"配置错误: {e}")
        print("请先配置 .env 文件，运行 'python setup.py' 检查配置")
    except Exception as e:
        print(f"错误: {e}")


async def example_custom_filter():
    """示例2: 自定义过滤 - 只购买符合条件的代币"""
    print("\n" + "="*60)
    print("示例2: 自定义代币过滤")
    print("="*60)
    
    class FilteredSniper(PumpFunSniper):
        """带过滤功能的狙击机器人"""
        
        async def _snipe_token(self, token_mint: str):
            """重写狙击方法，添加过滤逻辑"""
            try:
                logger.info(f"检测到新代币: {token_mint}")
                
                # 获取代币信息
                token_info = await self._get_token_info(token_mint)
                if not token_info:
                    logger.warning("无法获取代币信息，跳过")
                    return
                
                # 应用过滤器
                if not self._filter_token(token_info):
                    logger.info("代币不符合过滤条件，跳过")
                    return
                
                # 通过过滤，执行购买
                logger.info(f"代币通过过滤，准备购买...")
                await super()._snipe_token(token_mint)
                
            except Exception as e:
                logger.error(f"处理代币失败: {e}")
        
        def _filter_token(self, token_info: dict) -> bool:
            """过滤代币"""
            name = token_info.get('name', '').lower()
            symbol = token_info.get('symbol', '').lower()
            
            # 过滤规则1: 排除包含"test"或"scam"的代币
            if 'test' in name or 'scam' in name:
                logger.info(f"过滤: 名称包含禁用词 - {name}")
                return False
            
            # 过滤规则2: 必须有描述
            if not token_info.get('description'):
                logger.info("过滤: 没有描述")
                return False
            
            # 过滤规则3: 建议有社交媒体链接
            has_social = token_info.get('twitter') or token_info.get('telegram')
            if not has_social:
                logger.warning("警告: 代币没有社交媒体链接")
                # 不过滤，只是警告
            
            logger.info(f"✓ 代币通过过滤: {name} ({symbol})")
            return True
    
    try:
        bot = FilteredSniper()
        await bot.start()
    except Exception as e:
        print(f"错误: {e}")


async def example_monitor_only():
    """示例3: 仅监控模式 - 不执行购买，只记录新代币"""
    print("\n" + "="*60)
    print("示例3: 仅监控模式（不购买）")
    print("="*60)
    
    class MonitorOnlySniper(PumpFunSniper):
        """只监控不购买的机器人"""
        
        async def _snipe_token(self, token_mint: str):
            """只记录，不购买"""
            try:
                token_info = await self._get_token_info(token_mint)
                
                if token_info:
                    print("\n" + "-"*60)
                    print(f"发现新代币!")
                    print(f"地址: {token_mint}")
                    print(f"名称: {token_info.get('name', 'Unknown')}")
                    print(f"符号: {token_info.get('symbol', 'Unknown')}")
                    print(f"描述: {token_info.get('description', 'N/A')}")
                    print(f"Twitter: {token_info.get('twitter', 'N/A')}")
                    print(f"Telegram: {token_info.get('telegram', 'N/A')}")
                    print("-"*60)
                else:
                    print(f"\n发现新代币: {token_mint} (无法获取详细信息)")
                
                # 不执行购买
                logger.info("监控模式: 不执行购买")
                
            except Exception as e:
                logger.error(f"处理代币失败: {e}")
    
    try:
        bot = MonitorOnlySniper()
        await bot.start()
    except Exception as e:
        print(f"错误: {e}")


async def example_with_notifications():
    """示例4: 带通知功能 - 通过Telegram发送通知"""
    print("\n" + "="*60)
    print("示例4: Telegram通知集成")
    print("="*60)
    print("需要设置环境变量: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID")
    
    import os
    import requests
    
    class NotificationSniper(PumpFunSniper):
        """带Telegram通知的狙击机器人"""
        
        def __init__(self):
            super().__init__()
            self.telegram_bot_token = os.getenv('TELEGRAM_BOT_TOKEN')
            self.telegram_chat_id = os.getenv('TELEGRAM_CHAT_ID')
            
            if not self.telegram_bot_token or not self.telegram_chat_id:
                logger.warning("未配置Telegram，通知功能将被禁用")
        
        async def _send_telegram(self, message: str):
            """发送Telegram消息"""
            if not self.telegram_bot_token or not self.telegram_chat_id:
                return
            
            try:
                url = f"https://api.telegram.org/bot{self.telegram_bot_token}/sendMessage"
                requests.post(url, json={
                    'chat_id': self.telegram_chat_id,
                    'text': message,
                    'parse_mode': 'Markdown'
                }, timeout=5)
            except Exception as e:
                logger.error(f"发送Telegram消息失败: {e}")
        
        async def _snipe_token(self, token_mint: str):
            """狙击代币并发送通知"""
            token_info = await self._get_token_info(token_mint)
            
            # 发送检测通知
            if token_info:
                message = f"""
🎯 *检测到新代币*
名称: {token_info.get('name', 'Unknown')}
符号: {token_info.get('symbol', 'Unknown')}
地址: `{token_mint}`
                """
                await self._send_telegram(message)
            
            # 执行购买
            success = await super()._snipe_token(token_mint)
            
            # 发送购买结果通知
            if success:
                await self._send_telegram(f"✅ 成功购买 {token_mint}")
            else:
                await self._send_telegram(f"❌ 购买失败 {token_mint}")
    
    try:
        bot = NotificationSniper()
        await bot.start()
    except Exception as e:
        print(f"错误: {e}")


def show_examples():
    """显示所有可用示例"""
    examples = {
        '1': ('基本使用 - 启动狙击机器人', example_basic_usage),
        '2': ('自定义过滤 - 只购买符合条件的代币', example_custom_filter),
        '3': ('仅监控模式 - 不购买，只记录', example_monitor_only),
        '4': ('Telegram通知 - 发送交易通知', example_with_notifications),
    }
    
    print("\n" + "="*60)
    print("Pump.fun 狙击机器人 - 使用示例")
    print("="*60)
    print("\n可用示例:")
    
    for key, (desc, _) in examples.items():
        print(f"  {key}. {desc}")
    
    print("\n使用方法:")
    print("  python examples.py <示例编号>")
    print("\n示例:")
    print("  python examples.py 1  # 运行示例1")
    print("  python examples.py 3  # 运行示例3（监控模式）")
    print("\n")
    
    return examples


async def main():
    """主函数"""
    import sys
    
    examples = show_examples()
    
    if len(sys.argv) < 2:
        return
    
    example_num = sys.argv[1]
    if example_num not in examples:
        print(f"错误: 示例 '{example_num}' 不存在")
        return
    
    _, example_func = examples[example_num]
    
    print(f"\n⚠️  注意: 请确保已配置 .env 文件")
    print("按 Ctrl+C 可以随时停止\n")
    
    try:
        await example_func()
    except KeyboardInterrupt:
        print("\n\n已停止")


if __name__ == "__main__":
    asyncio.run(main())
