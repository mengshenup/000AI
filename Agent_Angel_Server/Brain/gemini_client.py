import os # 📂 操作系统接口
import json # 🧩 JSON 处理库
from Energy.cost_tracker import global_cost_tracker # 💰 导入成本追踪器

# 📦 尝试导入 google.generativeai
try:
    import google.generativeai as genai # 🧠 导入 Gemini SDK
except ImportError:
    genai = None # 🚫 导入失败，标记为 None

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
        if self.api_key and genai:
            genai.configure(api_key=self.api_key) # ⚙️ 配置 Gemini
            self.model = genai.GenerativeModel('gemini-1.5-flash') # 🧠 加载 Flash 模型（速度快）
        else:
            self.model = None # 🚫 模型不可用
            print("⚠️ 未找到 Gemini API Key 或缺少库。大脑功能已禁用。") # ⚠️ 打印警告信息

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

        if not self.model:
            return {"error": "缺少 Gemini API Key。大脑已离线。"} # ❌ 错误返回

        try:
            prompt = f"""
            You are a tactical analyst for the game 'Delta Force'. 
            Analyze the following video context for 'Zero Dam' (零号大坝) map camper spots (老六点位).
            Video Title: {video_title}
            Video URL: {video_url}
            
            If this sounds like a guide for camper spots, list them with estimated timestamps and descriptions.
            Format as JSON: {{ "spots": [ {{ "timestamp": int, "description": string }} ] }}
            """ # 📝 构造 Prompt 提示词
            
            response = await self.model.generate_content_async(prompt) # ☁️ 发送请求给 Gemini
            text = response.text # 📝 获取文本回复
            global_cost_tracker.track_ai(text, is_input=False) # 📊 记录 AI 输出成本
            
            try:
                # 🧹 清理 Markdown 代码块标记
                clean_text = text.replace("```json", "").replace("```", "").strip() # 🧹 移除 Markdown 格式
                data = json.loads(clean_text) # 🧩 解析 JSON
                spots = data.get("spots", []) # 📍 获取点位列表
                
                if spots:
                    return {
                        "found": True, 
                        "summary": f"Found {len(spots)} spots", 
                        "spots": spots
                    } # ✅ 成功找到点位
                else:
                    return {"found": False, "summary": "No spots identified"} # 🤷‍♀️ 未找到点位
            except json.JSONDecodeError:
                return {"found": False, "summary": "Failed to parse AI response", "raw": text} # 😵 解析失败
                
        except Exception as e:
            return {"error": str(e)} # 💥 发生异常

# 🌍 全局大脑实例
global_gemini = GeminiClient()
