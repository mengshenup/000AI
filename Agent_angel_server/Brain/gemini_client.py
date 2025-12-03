import os # 📂 操作系统接口，用于读取环境变量
import json # 🧩 JSON 处理库，用于解析 AI 返回的数据
import PIL.Image # 🖼️ 图像处理库，用于处理截图
import io # 📥 IO 流处理，用于处理二进制图像数据
from Energy.cost_tracker import global_cost_tracker # 💰 导入成本追踪器，记录 Token 消耗

# 📦 尝试导入 google.generativeai
try:
    import google.generativeai as genai # 🧠 导入 Gemini SDK
except ImportError:
    genai = None # 🚫 导入失败，标记为 None，防止程序崩溃

class GeminiClient:
    # =================================
    #  🎉 Gemini 客户端 (无参数)
    #
    #  🎨 代码用途：
    #     作为 Angel 的“大脑”接口，封装了与 Google Gemini API 的交互逻辑，负责处理复杂的思考、分析和决策任务。
    #
    #  💡 易懂解释：
    #     这是 Angel 的脑细胞！🧠 它连接着超级聪明的 Gemini AI，帮助 Angel 理解视频内容、寻找游戏攻略，甚至思考人生（如果需要的话）！
    #
    #  ⚠️ 警告：
    #     严重依赖网络连接和 API Key 的有效性。如果 Key 无效或配额耗尽，大脑将无法工作。
    # =================================
    def __init__(self):
        # =================================
        #  🎉 初始化大脑 (无参数)
        #
        #  🎨 代码用途：
        #     加载环境变量中的 API Key，配置 Gemini 客户端，并初始化生成模型。
        #
        #  💡 易懂解释：
        #     大脑启动中... 正在寻找密钥（API Key）来解锁智慧之门！🔑 如果找不到，Angel 就会变得笨笨的哦。
        #
        #  ⚠️ 警告：
        #     如果未安装 `google.generativeai` 库或未设置 `GEMINI_API_KEY`，模型将初始化为 None，导致后续调用失败。
        # =================================
        self.api_key = os.getenv("GEMINI_API_KEY", "") # 🔑 获取 API 密钥
        if self.api_key and genai: # ✅ 检查 Key 和库是否都存在
            genai.configure(api_key=self.api_key) # ⚙️ 配置 Gemini
            self.model = genai.GenerativeModel('gemini-1.5-flash') # 🧠 加载 Flash 模型（速度快，适合实时任务）
        else:
            self.model = None # 🚫 模型不可用
            print("⚠️ [提示] Gemini API Key 未配置或库缺失 (大脑功能受限)") # ⚠️ 打印警告信息

    def update_key(self, new_key):
        # =============================================================================
        #  🎉 更新密钥 (new_key)
        #
        #  🎨 用途:
        #      运行时动态更新 Gemini API Key，并重新初始化生成模型。
        #
        #  💡 易懂解释:
        #      换把新钥匙！🔑 旧的钥匙可能生锈了，或者我们换了把新锁。
        #
        #  ⚠️ 警告:
        #      无特殊风险。如果 Key 无效，模型将不可用。
        #
        #  ⚙️ 触发源:
        #      Nerve/websocket_server.py -> auth 消息 -> update_key
        # =============================================================================
        self.api_key = new_key # 🔑 更新内部 Key 存储
        if self.api_key and genai: # ✅ 检查 Key 和库状态
            genai.configure(api_key=self.api_key) # ⚙️ 重新配置 SDK
            self.model = genai.GenerativeModel('gemini-1.5-flash') # 🧠 重建模型实例
            print(f"🔑 Gemini API Key 已更新: {new_key[:5]}***") # 📢 打印脱敏日志
        else:
            self.model = None # 🚫 模型置空
            print("⚠️ [提示] Gemini API Key 更新失败或库缺失") # ⚠️ 打印失败警告

    async def analyze_video(self, video_title, video_url, current_time=0):
        # =================================
        #  🎉 分析视频内容 (视频标题，视频链接，当前时间)
        #
        #  🎨 代码用途：
        #     构造 Prompt 提示词，调用 Gemini API 分析视频元数据，尝试提取游戏攻略（如老六点位）并返回结构化 JSON 数据。
        #
        #  💡 易懂解释：
        #     Angel 正在看视频！👀 它会问 Gemini：“嘿，这个视频里有没有教怎么当‘老六’呀？” 然后把找到的秘密点位都记下来！
        #
        #  ⚠️ 警告：
        #     AI 的回复可能不稳定，需要进行 JSON 解析异常处理。Prompt 的质量直接影响结果的准确性。
        # =================================
        print(f"🧠 Gemini 正在分析: {video_title} (时间点: {current_time}s)") # 📢 打印分析日志
        global_cost_tracker.track_ai(f"Analyze request: {video_title}", is_input=True) # 📊 记录 AI 输入成本

        if not self.model: # 🛑 检查模型是否可用
            return {"error": "Gemini API Key 未配置 (大脑离线)"} # ❌ 错误返回

        try:
            prompt = f'''
            You are a tactical analyst for the game 'Delta Force'. 
            Analyze the following video context for 'Zero Dam' (零号大坝) map camper spots (老六点位).
            Video Title: {video_title}
            Video URL: {video_url}
            
            If this sounds like a guide for camper spots, list them with estimated timestamps and descriptions.
            Format as JSON: {{ "spots": [ {{ "timestamp": int, "description": string }} ] }}
            ''' # 📝 构造 Prompt 提示词
            
            response = await self.model.generate_content_async(prompt) # ☁️ 发送请求给 Gemini
            text = response.text # 📝 获取文本回复
            global_cost_tracker.track_ai(text, is_input=False) # 📊 记录 AI 输出成本
            
            try:
                # 🧹 清理 Markdown 代码块标记
                clean_text = text.replace("```json", "").replace("```", "").strip() # 🧹 移除 Markdown 格式
                data = json.loads(clean_text) # 🧩 解析 JSON
                spots = data.get("spots", []) # 📍 获取点位列表
                
                if spots: # ✅ 如果找到了点位
                    return {
                        "found": True, 
                        "summary": f"Found {len(spots)} spots", 
                        "spots": spots
                    } # ✅ 成功返回
                else:
                    return {"found": False, "summary": "No spots identified"} # 🤷‍♀️ 未找到点位
            except json.JSONDecodeError: # 😵 JSON 解析失败
                return {"found": False, "summary": "Failed to parse AI response", "raw": text} # ❌ 返回原始文本
                
        except Exception as e: # 💥 其他异常
            return {"error": str(e)} # ❌ 返回错误信息

    async def plan_next_action(self, screenshot_bytes, goal, page_url=""):
        # =================================
        #  🎉 规划下一步行动 (截图数据, 目标描述, 当前URL)
        #
        #  🎨 代码用途：
        #     将当前屏幕截图和用户目标发送给 Gemini Pro Vision，请求下一步的操作指令。
        #     返回格式必须是严格的 JSON。
        #
        #  💡 易懂解释：
        #     Angel 把看到的画面发给大脑，问：“我要做这个任务，下一步该点哪里？”
        #     大脑看了一眼，说：“点那个红色的按钮！” 👈
        #
        #  ⚠️ 警告：
        #     图像处理需要消耗较多 Token。必须确保返回的是 JSON 格式，否则无法解析。
        # =================================
        if not self.model: return None # 🛑 模型不可用则返回 None

        try:
            # 1. 准备图像数据
            image = PIL.Image.open(io.BytesIO(screenshot_bytes)) # 🖼️ 将二进制数据转换为 PIL 图像对象

            # 2. 构造 Prompt
            prompt = f'''
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
            
            If the goal is achieved, return action "done".
            If the page is loading or you need to wait, return action "wait".
            ''' # 📝 构造多模态 Prompt
            
            # 3. 调用多模态模型
            response = await self.model.generate_content_async([prompt, image]) # ☁️ 发送图片和文本给 Gemini
            text = response.text # 📝 获取回复文本
            global_cost_tracker.track_ai(text, is_input=False) # 📊 记录成本
            
            # 4. 解析结果
            clean_text = text.replace("```json", "").replace("```", "").strip() # 🧹 清理 Markdown 标记
            return json.loads(clean_text) # 🧩 解析并返回 JSON 对象
            
        except Exception as e: # 💥 异常处理
            print(f"🧠 [大脑] 思考失败: {e}") # 📢 打印错误日志
            return None # ❌ 返回 None

# 🌍 全局大脑实例
global_gemini = GeminiClient() # 🧠 创建全局单例
