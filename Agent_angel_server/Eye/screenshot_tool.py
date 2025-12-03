# ==========================================================================
#  📃 文件功能 : 截图工具 (ScreenshotTool)
#  ⚡ 逻辑摘要 : 封装 Playwright 截图功能，支持多级画质压缩和磁盘缓存控制。
#  💡 易懂解释 : Angel 的眼睛！负责把看到的网页拍下来，还能把照片变小一点省流量。
#  🔋 未来扩展 : 支持 WebP 格式，支持区域截图。
#  📊 当前状态 : 活跃 (更新: 2025-12-03)
#  🧱 screenshot_tool.py 踩坑记录 :
#     1. [2025-12-03] [已修复] [性能]: 频繁写入磁盘导致直播流卡顿 -> 增加 save_to_disk 参数控制 (Line 32)
# ==========================================================================
import base64 # 📦 Base64 编码库
import io # 📥 I/O 流处理库
import os # 📂 操作系统
import asyncio # ⚡ 异步 I/O
from PIL import Image # 🖼️ 图像处理库 (Pillow)
from Memory.system_config import VIEWPORT # ⚙️ 导入视口配置

class ScreenshotTool:
    # =================================
    #  🎉 截图工具 (无参数)
    #
    #  🎨 代码用途：
    #     作为 Angel 的“眼睛”，负责从浏览器页面捕获图像，并根据需求进行压缩和格式转换。
    #
    #  💡 易懂解释：
    #     咔嚓！📸 Angel 眨眨眼，就把看到的画面拍下来啦！还能根据网络好坏，自动调整照片的清晰度哦！
    #
    #  ⚠️ 警告：
    #     高频截图会消耗大量 CPU 和内存，且 Base64 编码会增加数据体积。请根据实际需求选择 quality_mode。
    # =================================
    def __init__(self, page):
        # =================================
        #  🎉 初始化视觉 (Playwright页面对象)
        #
        #  🎨 代码用途：
        #     绑定 Playwright 的 Page 对象，以便后续调用截图 API。
        #
        #  💡 易懂解释：
        #     把眼睛装到浏览器上！👀 准备好观察世界了！
        # =================================
        self.page = page # 📄 绑定的页面实例

    def _process_image(self, screenshot_bytes, quality_mode):
        # =================================
        #  🎉 图像处理 (内部同步方法)
        #
        #  🎨 代码用途：
        #     使用 PIL 进行图像缩放和压缩。这是一个 CPU 密集型操作，应在线程池中运行。
        # =================================
        with io.BytesIO(screenshot_bytes) as input_io: # 📥 创建输入流
            img = Image.open(input_io) # 🖼️ 打开图片
            
            if quality_mode == 'low':
                target_width = int(VIEWPORT['width'] / 6) # 📉 宽度缩小到 1/6
                target_height = int(VIEWPORT['height'] / 6) # 📉 高度缩小到 1/6
                img = img.resize((target_width, target_height), Image.Resampling.NEAREST) # ⚡ 极速缩放
                save_quality = 10 # 📉 极低质量
            elif quality_mode == 'medium':
                target_width = int(VIEWPORT['width'] / 2) # 📉 宽度缩小到 1/2
                target_height = int(VIEWPORT['height'] / 2) # 📉 高度缩小到 1/2
                img = img.resize((target_width, target_height), Image.Resampling.BILINEAR) # 🎨 双线性插值
                save_quality = 40 # 📉 中等质量
            else:
                save_quality = 70 # 💎 默认质量

            with io.BytesIO() as output_io: # 📤 创建输出流
                img.save(output_io, format='JPEG', quality=save_quality) # 💾 保存压缩后的图片
                return base64.b64encode(output_io.getvalue()).decode() # 📦 转为 Base64

    async def capture(self, quality_mode='high', user_id='default_user', save_to_disk=False):
        # =================================
        #  🎉 捕获视野 (画质模式, 用户ID, 是否保存到磁盘)
        #
        #  🎨 代码用途：
        #     截取当前页面屏幕，支持 'high', 'medium', 'low' 三种画质。
        #     低画质模式下会使用 PIL 进行降采样和压缩，以减少数据传输量。
        #     可选将截图保存到 Memorybank/Screenshots/{user_id}/ 目录下。
        #
        #  💡 易懂解释：
        #     看这里！✌️ 拍张照！如果是为了省流量（low模式），我会把照片变小一点、模糊一点，但还是能看清大概的！
        #
        #  ⚠️ 警告：
        #     Image.Resampling.NEAREST 速度最快但画质最差。如果页面已关闭，此方法会捕获异常并返回空字符串。
        # =================================
        if not self.page:
            print("⚠️ [Eye] Page object is None!")
            return "" # 🚫 页面不存在
            
        if self.page.is_closed():
            print("⚠️ [Eye] Page is closed!")
            return ""

        try:
            # 1. 获取原始截图 (JPEG)
            # 🛠️ 优化：设置超时时间为 15000ms (15秒)，禁用动画和光标，防止因页面卡顿导致长时间阻塞
            screenshot_bytes = await self.page.screenshot(
                type='jpeg', 
                quality=70, 
                timeout=15000, 
                animations="disabled", 
                caret="hide"
            ) 
            
            # 🛠️ 保存截图到 Memorybank (仅当 save_to_disk=True 时)
            # 路径: Agent_angel_server/Memorybank/Screenshots/{user_id}/capture.jpg
            if save_to_disk:
                base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) # Agent_angel_server
                save_dir = os.path.join(base_dir, "Memorybank", "Screenshots", user_id)
                os.makedirs(save_dir, exist_ok=True)
                
                save_path = os.path.join(save_dir, "capture.jpg")
                with open(save_path, "wb") as f:
                    f.write(screenshot_bytes)
                # print(f"📸 [DEBUG] Screenshot saved to {save_path}")

            if quality_mode == 'high':
                return base64.b64encode(screenshot_bytes).decode() # 💎 高画质直接返回

            # 2. PIL 后处理 (缩放 & 压缩) - 移至线程池执行，避免阻塞事件循环
            return await asyncio.to_thread(self._process_image, screenshot_bytes, quality_mode)

        except Exception as e:
            print(f"👁️ Vision Error: {e}") # ❌ 视觉故障
            import traceback
            traceback.print_exc()
            return ""
