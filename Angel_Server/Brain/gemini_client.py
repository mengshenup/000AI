import os
import json
from Energy.cost_tracker import global_cost_tracker

# 📦 尝试导入 google.generativeai
try:
    import google.generativeai as genai
except ImportError:
    genai = None

class GeminiClient:
    # =================================
    #  🎉 Gemini 客户端 (Brain/gemini_client.py)
    #
    #  🎨 代码用途：
    #     封装与 Google Gemini API 的交互逻辑，负责思考和分析。
    # =================================
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY", "")
        if self.api_key and genai:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel('gemini-1.5-flash')
        else:
            self.model = None
            print("⚠️ 未找到 Gemini API Key 或缺少库。大脑功能已禁用。")

    async def analyze_video(self, video_title, video_url, current_time=0):
        print(f"🧠 Gemini 正在分析: {video_title} (时间点: {current_time}s)")
        global_cost_tracker.track_ai(f"Analyze request: {video_title}", is_input=True)

        if not self.model:
            return {"error": "缺少 Gemini API Key。大脑已离线。"}

        try:
            prompt = f"""
            You are a tactical analyst for the game 'Delta Force'. 
            Analyze the following video context for 'Zero Dam' (零号大坝) map camper spots (老六点位).
            Video Title: {video_title}
            Video URL: {video_url}
            
            If this sounds like a guide for camper spots, list them with estimated timestamps and descriptions.
            Format as JSON: {{ "spots": [ {{ "timestamp": int, "description": string }} ] }}
            """
            
            response = await self.model.generate_content_async(prompt)
            text = response.text
            global_cost_tracker.track_ai(text, is_input=False)
            
            try:
                # 清理 Markdown 代码块标记
                clean_text = text.replace("```json", "").replace("```", "").strip()
                data = json.loads(clean_text)
                spots = data.get("spots", [])
                
                if spots:
                    return {
                        "found": True, 
                        "summary": f"Found {len(spots)} spots", 
                        "spots": spots
                    }
                else:
                    return {"found": False, "summary": "No spots identified"}
            except json.JSONDecodeError:
                return {"found": False, "summary": "Failed to parse AI response", "raw": text}
                
        except Exception as e:
            return {"error": str(e)}

# 全局大脑实例
global_gemini = GeminiClient()
