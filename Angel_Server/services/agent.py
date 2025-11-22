import os
import json
import asyncio
import random
from services.billing import global_billing

# 📦 尝试导入 google.generativeai，如果不存在则报错或处理
try:
    import google.generativeai as genai
except ImportError:
    genai = None # ⚠️ 如果库未安装，设为 None

class AgentService:
    # =================================
    #  🎉 智能体服务类 ()
    #
    #  🎨 代码用途：
    #     封装与 Google Gemini API 的交互逻辑，负责处理视频分析请求。
    #
    #  💡 易懂解释：
    #     这是系统的“大脑”！它负责思考、分析视频内容，并告诉你哪里有“老六”。🧠
    #
    #  ⚠️ 警告：
    #     依赖 google-generativeai 库和有效的 API Key。如果缺少任意一个，大脑就会“死机”。
    # =================================
    def __init__(self):
        # =================================
        #  🎉 初始化 ()
        #
        #  🎨 代码用途：
        #     加载环境变量中的 API Key，并配置 Gemini 客户端。
        #
        #  💡 易懂解释：
        #     给大脑通电，并输入密码（API Key）让它准备工作！⚡
        #
        #  ⚠️ 警告：
        #     如果 .env 文件中没有 GEMINI_API_KEY，服务将以降级模式运行（无法分析）。
        # =================================
        # 🔑 从环境变量获取 API Key
        self.api_key = os.getenv("GEMINI_API_KEY", "")
        # ✅ 检查 Key 是否存在且库是否导入成功
        if self.api_key and genai:
            # ⚙️ 配置 Gemini API
            genai.configure(api_key=self.api_key)
            # 🤖 初始化生成模型 (gemini-1.5-flash)
            self.model = genai.GenerativeModel('gemini-1.5-flash')
        else:
            # 🚫 如果条件不满足，模型设为 None
            self.model = None
            print("⚠️ Gemini API Key not found or library missing. Agent capabilities disabled.")

    async def analyze_video(self, video_title, video_url, current_time=0):
        # =================================
        #  🎉 分析视频 (视频标题，视频链接，当前时间)
        #
        #  🎨 代码用途：
        #     构建提示词 (Prompt)，调用 Gemini 模型分析视频元数据，尝试提取“老六点位”信息。
        #
        #  💡 易懂解释：
        #     把视频拿给 AI 看，问它：“这就叫《零号大坝老六点位教学》，你快告诉我都在哪蹲人？”🧐
        #
        #  ⚠️ 警告：
        #     此操作会消耗 Token（钱）。请确保计费系统正常工作。
        # =================================
        print(f"🕵️ Agent analyzing: {video_title} at {current_time}s")
        
        # 💰 记录 AI 输入 Token 消耗 (计费)
        global_billing.track_ai(f"Analyze request: {video_title}", is_input=True)

        # 🛡️ 检查模型是否可用
        if not self.model:
            # === Real Mode Check ===
            return {"error": "Gemini API Key missing or library not installed. Please check server logs."}

        # === REAL GEMINI MODE ===
        try:
            # 📝 构建提示词 (Prompt)
            # 告诉 Gemini 它的角色是《三角洲行动》的战术分析师
            # 要求它分析视频标题和 URL，找出“零号大坝”地图的“老六点位”
            
            # Prompt engineering for tactical analysis
            prompt = f"""
            You are a tactical analyst for the game 'Delta Force'. 
            Analyze the following video context for 'Zero Dam' (零号大坝) map camper spots (老六点位).
            Video Title: {video_title}
            Video URL: {video_url}
            
            If this sounds like a guide for camper spots, list them with estimated timestamps (just guess based on typical video structure if you can't see it) and descriptions.
            Format as JSON: {{ "spots": [ {{ "timestamp": int, "description": string }} ] }}
            """
            
            # 🚀 异步调用 Gemini API 生成内容
            response = await self.model.generate_content_async(prompt)
            # 📄 获取响应文本
            text = response.text
            # 💰 记录 AI 输出 Token 消耗 (计费)
            global_billing.track_ai(text, is_input=False)
            
            # 🔍 尝试解析 JSON 响应
            try:
                # ✂️ 找到 JSON 对象的开始和结束位置
                start = text.find('{')
                end = text.rfind('}') + 1
                # 📦 解析 JSON 字符串
                data = json.loads(text[start:end])
                # ✅ 返回成功结果
                return {
                    "found": True,
                    "spots": data.get("spots", []),
                    "summary": "Gemini Analysis Complete"
                }
            except:
                # ⚠️ 如果 JSON 解析失败，返回原始文本作为摘要
                return {
                    "found": True,
                    "spots": [],
                    "summary": text
                }

        except Exception as e:
            # 🚨 捕获并打印异常
            print(f"Gemini Error: {e}")
            return {"error": str(e)}

# 🌍 创建全局单例实例
agent_service = AgentService()
