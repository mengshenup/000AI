import asyncio # ⚡ 异步 I/O 库
import random # 🎲 随机数生成库
from Memory.system_config import VIEWPORT # ⚙️ 导入视口配置

class MouseController:
    # =================================
    #  🎉 鼠标控制器 (无参数)
    #
    #  🎨 代码用途：
    #     作为 Angel 的“手”，负责执行具体的页面交互操作，如点击、移动、滑动等，并模拟人类的操作习惯。
    #
    #  💡 易懂解释：
    #     Angel 的小手手！✋ 它可以帮你点点点，滑滑滑，而且动作很自然，不会像机器人一样僵硬哦！
    #
    #  ⚠️ 警告：
    #     坐标计算依赖于 VIEWPORT 配置，如果前端视口大小不一致，点击位置可能会偏移。
    # =================================
    def __init__(self, page):
        # =================================
        #  🎉 初始化手部 (Playwright页面对象)
        #
        #  🎨 代码用途：
        #     绑定 Playwright 的 Page 对象，以便控制鼠标。
        #
        #  💡 易懂解释：
        #     把手伸进浏览器里！👋 准备好干活啦！
        # =================================
        self.page = page # 📄 绑定的页面实例

    async def human_move(self, end_x, end_y):
        # =================================
        #  🎉 拟人化移动 (目标X坐标，目标Y坐标)
        #
        #  🎨 代码用途：
        #     将鼠标移动到指定坐标，通过 steps 参数模拟人类移动鼠标的轨迹和速度变化，避免瞬间移动被检测。
        #
        #  💡 易懂解释：
        #     慢慢移过去... 🚶‍♀️ 就像人手拿鼠标一样，有快有慢，不会“嗖”的一下就飞过去，这样才不会被发现是机器人在操作！
        # =================================
        """拟人化移动"""
        if not self.page: return
        steps = random.randint(15, 30) # 🎲 随机步数，模拟不稳定的移动速度
        await self.page.mouse.move(end_x, end_y, steps=steps) # 🖱️ 执行移动

    async def click(self, x_ratio, y_ratio):
        # =================================
        #  🎉 拟人化点击 (X轴比例，Y轴比例)
        #
        #  🎨 代码用途：
        #     根据相对比例计算绝对坐标，先移动鼠标，模拟反应延迟，然后执行按下和抬起操作。
        #
        #  💡 易懂解释：
        #     瞄准... 发射！👉 先看准位置移过去，稍微停顿一下（假装在思考），然后轻轻点下去，再松开。完美！
        #
        #  ⚠️ 警告：
        #     输入参数是 0.0-1.0 的比例值，而非绝对像素坐标。
        # =================================
        """拟人化点击"""
        if not self.page: return
        
        target_x = x_ratio * VIEWPORT['width'] # 📏 计算绝对 X 坐标
        target_y = y_ratio * VIEWPORT['height'] # 📏 计算绝对 Y 坐标
        
        # 1. 移动
        await self.human_move(target_x, target_y) # 🖱️ 移动到位
        # 2. 反应延迟
        await asyncio.sleep(random.uniform(0.05, 0.15)) # ⏳ 模拟人类反应时间
        # 3. 点击
        await self.page.mouse.down() # 👇 按下鼠标
        await asyncio.sleep(random.uniform(0.05, 0.1)) # ⏳ 模拟按键时长
        await self.page.mouse.up() # ☝️ 抬起鼠标

    async def jump_video(self, timestamp):
        # =================================
        #  🎉 视频跳转 (时间戳)
        #
        #  🎨 代码用途：
        #     控制页面中的视频播放器跳转到指定时间点。
        #
        #  💡 易懂解释：
        #     快进！⏩ 直接跳到精彩的地方！
        #
        #  ⚠️ 警告：
        #     当前为简化版实现，尚未注入具体的 JS 代码来控制 Video 标签。
        # =================================
        """控制视频跳转"""
        if not self.page: return False # 🚫 页面不存在，返回失败
        print(f"✋ Mouse: Jumping to {timestamp}s") # 📢 打印跳转日志
        # 这里需要注入 JS 来控制 video 标签
        # 简化版实现
        return True # ✅ 模拟跳转成功
