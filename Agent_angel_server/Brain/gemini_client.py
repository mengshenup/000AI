import os # 📂 操作系统接口，用于读取环境变量
import json # 🧩 JSON 处理库，用于解析 AI 返回的数据
import PIL.Image # 🖼️ 图像处理库，用于处理截图
import io # 📥 IO 流处理，用于处理二进制图像数据
import requests # 🌐 HTTP 请求库 (用于 REST API)
import asyncio # ⚡ 异步库
from Energy.cost_tracker import global_cost_tracker # 💰 导入成本追踪器，记录 Token 消耗

# 📦 尝试导入 google.generativeai (仅用于模型列表发现，不用于生成)
try:
    import google.generativeai as genai # 🧠 导入 Gemini SDK
except ImportError:
    genai = None # 🚫 导入失败，标记为 None，防止程序崩溃

class GeminiClient:
    # =================================
    #  🎉 Gemini 客户端 (无参数)
    #
    #  🎨 代码用途：
    #     作为 Angel 的“大脑”接口，封装了与 Google Gemini API 的交互逻辑。
    #     🆕 重构：无状态设计，支持多用户并发，使用 REST API 直接调用。
    #
    #  💡 易懂解释：
    #     这是 Angel 的脑细胞！🧠 它现在更聪明了，可以同时处理好几个人的请求，而且不会搞混大家的钥匙！🔑
    # =================================
    def __init__(self):
        # =================================
        #  🎉 初始化大脑 (无参数)
        #
        #  🎨 代码用途：
        #     初始化基础配置。不再持有 api_key 状态。
        # =================================
        # 初始化模型选择变量
        self.available_models = []
        self.best_model_name = 'gemini-1.5-flash' # 默认兜底
        self.best_vision_model_name = 'gemini-1.5-flash' # 默认兜底

        # 尝试发现模型 (使用环境变量中的 Key 作为基准，如果没有则跳过)
        env_key = os.getenv("GEMINI_API_KEY", "")
        if env_key and genai:
            try:
                genai.configure(api_key=env_key)
                self._discover_best_models()
            except:
                pass

    def _discover_best_models(self):
        """
        🔍 自动发现可用模型并选择最佳方案
        """
        print("🧠 [系统] 正在扫描可用模型列表...")
        try:
            self.available_models = []
            for m in genai.list_models():
                if 'generateContent' in m.supported_generation_methods:
                    self.available_models.append(m.name)
            
            print(f"📋 [系统] 发现 {len(self.available_models)} 个可用模型")
            
            # 策略 1: 选择最佳通用模型 (Thinking)
            thinking_candidates = [
                'models/gemini-2.0-pro-exp',
                'models/gemini-2.0-flash-exp',
                'models/gemini-1.5-pro',
                'models/gemini-1.5-flash'
            ]
            
            for candidate in thinking_candidates:
                if any(candidate in m or m in candidate for m in self.available_models):
                    self.best_model_name = candidate.replace('models/', '')
                    break
            
            # 策略 2: 选择最佳视觉模型 (Vision)
            vision_candidates = [
                'models/gemini-2.0-pro-exp',
                'models/gemini-1.5-pro',
                'models/gemini-2.0-flash-exp'
            ]
            
            for candidate in vision_candidates:
                if any(candidate in m or m in candidate for m in self.available_models):
                    self.best_vision_model_name = candidate.replace('models/', '')
                    break

            print(f"🧠 [系统] 已选定大脑: {self.best_model_name}")
            print(f"👁️ [系统] 已选定视觉: {self.best_vision_model_name}")

        except Exception as e:
            print(f"❌ [系统] 模型发现失败: {e}")
            self.best_model_name = 'gemini-1.5-flash'
            self.best_vision_model_name = 'gemini-1.5-flash'

    def update_key(self, new_key):
        # 🗑️ 废弃：不再维护全局 Key
        # 仅用于触发一次模型发现 (如果之前没发现过)
        if genai and not self.available_models:
            try:
                genai.configure(api_key=new_key)
                self._discover_best_models()
            except: pass

    async def _call_gemini_rest(self, api_key, model_name, contents):
        """
        🌐 内部方法：调用 Gemini REST API
        """
        if not api_key: return None
        
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
        headers = {"Content-Type": "application/json"}
        payload = {"contents": contents}
        
        try:
            # 使用 run_in_executor 避免阻塞
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(None, lambda: requests.post(url, json=payload, headers=headers, timeout=30))
            
            if response.status_code != 200:
                print(f"⚠️ [Gemini REST] Error {response.status_code}: {response.text}")
                return None
                
            return response.json()
        except Exception as e:
            print(f"⚠️ [Gemini REST] Exception: {e}")
            return None

    async def analyze_video(self, video_title, video_url, current_time=0, api_key=None):
        # =================================
        #  🎉 分析视频内容 (支持多用户 Key)
        # =================================
        print(f"🧠 Gemini 正在分析: {video_title} (时间点: {current_time}s)")
        global_cost_tracker.track_ai(f"Analyze request: {video_title}", is_input=True)

        if not api_key:
            return {"error": "Missing API Key"}

        prompt_text = f'''
        You are a tactical analyst for the game 'Delta Force'. 
        Analyze the following video context for 'Zero Dam' (零号大坝) map camper spots (老六点位).
        Video Title: {video_title}
        Video URL: {video_url}
        
        If this sounds like a guide for camper spots, list them with estimated timestamps and descriptions.
        Format as JSON: {{ "spots": [ {{ "timestamp": int, "description": string }} ] }}
        '''
        
        contents = [{"parts": [{"text": prompt_text}]}]
        
        # 调用 REST API
        result = await self._call_gemini_rest(api_key, self.best_model_name, contents)
        
        if not result:
            return {"error": "API Call Failed"}

        try:
            # 解析 REST API 响应结构
            # { "candidates": [ { "content": { "parts": [ { "text": "..." } ] } } ] }
            text = result.get("candidates", [])[0].get("content", {}).get("parts", [])[0].get("text", "")
            global_cost_tracker.track_ai(text, is_input=False)
            
            clean_text = text.replace("```json", "").replace("```", "").strip()
            data = json.loads(clean_text)
            spots = data.get("spots", [])
            
            if spots:
                return {"found": True, "summary": f"Found {len(spots)} spots", "spots": spots}
            else:
                return {"found": False, "summary": "No spots identified"}
        except Exception as e:
            return {"error": f"Parse Error: {str(e)}"}

    async def plan_next_action(self, screenshot_bytes, goal, page_url="", api_key=None):
        # =================================
        #  🎉 规划下一步行动 (支持多用户 Key)
        # =================================
        if not api_key: return None

        try:
            # 1. 准备图像数据 (转为 base64)
            import base64
            image_b64 = base64.b64encode(screenshot_bytes).decode('utf-8')

            # 2. 构造 Prompt
            prompt_text = f'''
            You are an intelligent web browsing agent.
            User Goal: "{goal}"
            Current URL: "{page_url}"
            
            Analyze the screenshot and determine the NEXT single action to achieve the goal.
            Return ONLY a JSON object with the following format (no markdown, no explanation):
            
            {{
                "action": "click" | "type" | "scroll" | "navigate" | "done" | "wait",
                "reason": "Short explanation of why",
                "params": {{
                    "x": 0.0-1.0 (for click, relative width),
                    "y": 0.0-1.0 (for click, relative height),
                    "text": "string" (for type),
                    "url": "string" (for navigate),
                    "delta_y": int (for scroll)
                }}
            }}
            '''
            
            contents = [{
                "parts": [
                    {"text": prompt_text},
                    {"inline_data": {"mime_type": "image/jpeg", "data": image_b64}}
                ]
            }]
            
            # 3. 调用 REST API (使用 Vision 模型)
            result = await self._call_gemini_rest(api_key, self.best_vision_model_name, contents)
            
            if not result: return None

            # 4. 解析结果
            text = result.get("candidates", [])[0].get("content", {}).get("parts", [])[0].get("text", "")
            global_cost_tracker.track_ai(text, is_input=False)
            
            clean_text = text.replace("```json", "").replace("```", "").strip()
            return json.loads(clean_text)
            
        except Exception as e:
            print(f"🧠 [大脑] 思考失败: {e}")
            return None

# 🌍 全局大脑实例
global_gemini = GeminiClient() # 🧠 创建全局单例
