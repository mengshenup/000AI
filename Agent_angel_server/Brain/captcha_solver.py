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

    async def solve_slider(self, page, screenshot_bytes, api_key=None):
        # =================================
        #  🎉 解决滑块 (Playwright页面, 截图字节, API Key)
        #
        #  🎨 代码用途：
        #     1. 调用 Gemini 识别滑块按钮中心和缺口中心。
        #     2. 计算相对距离。
        #     3. 调用 MouseController 执行拖动。
        #
        #  💡 易懂解释：
        #     看图 -> 找点 -> 拖动！一气呵成！✨
        # =================================
        
        if not api_key:
            print("🧠 [Captcha] No API Key provided.")
            return False

        print("🧠 [Captcha] Analyzing screenshot for slider...")
        
        try:
            # 🆕 动态使用 GeminiClient 发现的最佳视觉模型
            model_name = global_gemini.best_vision_model_name
            if not model_name: model_name = 'gemini-1.5-flash'
                
            print(f"🧠 [Captcha] Using vision model: {model_name}")
            
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
            Example: {"button": {"x": 0.1, "y": 0.8}, "target": {"x": 0.6, "y": 0.4}}
            """
            
            # 🔄 调用 REST API (无状态)
            import base64
            image_b64 = base64.b64encode(screenshot_bytes).decode('utf-8')
            
            contents = [{
                "parts": [
                    {"text": prompt},
                    {"inline_data": {"mime_type": "image/jpeg", "data": image_b64}}
                ]
            }]
            
            result = await global_gemini._call_gemini_rest(api_key, model_name, contents)
            
            if not result:
                print(f"❌ [Captcha] API Call failed.")
                return False

            text = result.get("candidates", [])[0].get("content", {}).get("parts", [])[0].get("text", "")
            global_cost_tracker.track_ai(text, is_input=False)
            
            print(f"🧠 [Captcha] Raw AI Response: {text}") # 🛠️ Debug Log

            clean_text = text.replace("```json", "").replace("```", "").strip()
            try:
                data = json.loads(clean_text)
            except json.JSONDecodeError:
                print(f"🧠 [Captcha] JSON Parse Error. Raw: {clean_text}")
                return False
            
            button_pos = data.get("button")
            target_pos = data.get("target")
            
            if not button_pos or not target_pos:
                print("🧠 [Captcha] Failed to identify coordinates (missing keys).")
                return False
                
            print(f"🧠 [Captcha] Button: {button_pos}, Target: {target_pos}")
            
            # 2. 计算拖动操作
            # 获取视口大小
            viewport = page.viewport_size
            if not viewport: viewport = {'width': 800, 'height': 600}
            
            # 🛡️ 坐标边界检查
            def clamp(val): return max(0.0, min(1.0, val))
            
            start_x = clamp(button_pos['x']) * viewport['width']
            start_y = clamp(button_pos['y']) * viewport['height']
            end_x = clamp(target_pos['x']) * viewport['width']
            end_y = clamp(target_pos['y']) * viewport['height']
            
            return {
                "action": "drag",
                "start": {"x": start_x, "y": start_y},
                "end": {"x": end_x, "y": end_y}
            }

        except Exception as e:
            print(f"🧠 [Captcha] Error: {e}")
            import traceback
            traceback.print_exc()
            return False

global_captcha_solver = CaptchaSolver()
