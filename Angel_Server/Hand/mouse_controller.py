import asyncio
import random
from Memory.system_config import VIEWPORT

class MouseController:
    # =================================
    #  🎉 鼠标控制器 (Hand/mouse_controller.py)
    #
    #  🎨 代码用途：
    #     负责执行物理动作，如点击、移动、滑动。
    # =================================
    def __init__(self, page):
        self.page = page

    async def human_move(self, end_x, end_y):
        """拟人化移动"""
        if not self.page: return
        steps = random.randint(15, 30)
        await self.page.mouse.move(end_x, end_y, steps=steps)

    async def click(self, x_ratio, y_ratio):
        """拟人化点击"""
        if not self.page: return
        
        target_x = x_ratio * VIEWPORT['width']
        target_y = y_ratio * VIEWPORT['height']
        
        # 1. 移动
        await self.human_move(target_x, target_y)
        # 2. 反应延迟
        await asyncio.sleep(random.uniform(0.05, 0.15))
        # 3. 点击
        await self.page.mouse.down()
        await asyncio.sleep(random.uniform(0.05, 0.1))
        await self.page.mouse.up()

    async def jump_video(self, timestamp):
        """控制视频跳转"""
        if not self.page: return False
        print(f"✋ Mouse: Jumping to {timestamp}s")
        # 这里需要注入 JS 来控制 video 标签
        # 简化版实现
        return True
