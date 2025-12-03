import asyncio
import json
import PIL.Image
import io
from Energy.cost_tracker import global_cost_tracker
from Brain.gemini_client import global_gemini

class CaptchaSolver:
    # =================================
    #  🎉 验证码解决器 (无参数)
    #
    #  🎨 代码用途：
    #     专门用于解决滑块验证码。利用 Gemini 的视觉能力识别滑块和缺口位置，计算拖动距离。
    #
    #  💡 易懂解释：
    #     Angel 遇到了拦路虎（验证码）！🐯 别怕，它会拍张照发给大脑，大脑会告诉它：“往右拉一点点，对，就是那里！”
    # =================================

    async def solve_slider(self, page, screenshot_bytes):
        # =================================
        #  🎉 解决滑块 (Playwright页面, 截图字节)
        #
        #  🎨 代码用途：
        #     1. 调用 Gemini 识别滑块按钮中心和缺口中心。
        #     2. 计算相对距离。
        #     3. 调用 MouseController 执行拖动。
        #
        #  💡 易懂解释：
        #     看图 -> 找点 -> 拖动！一气呵成！✨
        # =================================
        
        if not global_gemini.model:
            print("🧠 [Captcha] Gemini not available.")
            return False

        print("🧠 [Captcha] Analyzing screenshot for slider...")
        
        try:
            image = PIL.Image.open(io.BytesIO(screenshot_bytes))
            
            # 1. 询问 Gemini 坐标
            prompt = """
            Analyze this captcha screenshot. I need to drag a slider button to a target hole/gap to complete the puzzle.
            Identify two points:
            1. The center of the draggable slider button (usually an arrow or a puzzle piece at the bottom or left).
            2. The center of the target gap/hole in the main image where the piece fits.
            
            Return ONLY a JSON object with relative coordinates (0.0 to 1.0):
            {
                "button": {"x": float, "y": float},
                "target": {"x": float, "y": float}
            }
            """
            
            response = await global_gemini.model.generate_content_async([prompt, image])
            text = response.text
            global_cost_tracker.track_ai(text, is_input=False)
            
            clean_text = text.replace("```json", "").replace("```", "").strip()
            data = json.loads(clean_text)
            
            button_pos = data.get("button")
            target_pos = data.get("target")
            
            if not button_pos or not target_pos:
                print("🧠 [Captcha] Failed to identify coordinates.")
                return False
                
            print(f"🧠 [Captcha] Button: {button_pos}, Target: {target_pos}")
            
            # 2. 计算拖动操作
            # 假设我们只需要水平拖动，或者直接从 button 拖到 target
            # 获取视口大小
            viewport = page.viewport_size
            if not viewport: viewport = {'width': 800, 'height': 600}
            
            start_x = button_pos['x'] * viewport['width']
            start_y = button_pos['y'] * viewport['height']
            end_x = target_pos['x'] * viewport['width']
            end_y = target_pos['y'] * viewport['height']
            
            # 3. 执行拖动
            # 导入 MouseController (避免循环导入，这里局部导入或假设外部传入 hand)
            # 由于 CaptchaSolver 可能被 websocket_server 调用，我们可以让 websocket_server 传入 hand
            # 或者我们在这里临时创建一个 MouseController? 不，最好复用 session 中的 hand
            
            return {
                "action": "drag",
                "start": {"x": start_x, "y": start_y},
                "end": {"x": end_x, "y": end_y}
            }

        except Exception as e:
            print(f"🧠 [Captcha] Error: {e}")
            return False

global_captcha_solver = CaptchaSolver()
