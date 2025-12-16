# ==========================================================================
#  📃 文件功能 : Gemini AI 客户端
#  ⚡ 逻辑摘要 : 封装 Google Gemini API，负责图像理解和动作规划。
#  💡 易懂解释 : 机器人的 "大脑"，看图说话，告诉手脚该干嘛。
#  🔋 未来扩展 : 支持更多模型 (GPT-4o, Claude 3.5)，支持流式输出。
#  📊 当前状态 : 活跃 (更新: 2025-12-06)
#  🧱 Body/Gemini.py 踩坑记录 (累积，勿覆盖) :
#     1. [2025-12-04] [已修复] [JSON解析]: Gemini 有时会返回 Markdown 格式的 JSON。 -> 增加了 strip() 和 replace() 清理代码。
# ==========================================================================

import aiohttp
import json
import time
import sys
import os

# 🛠️ 确保能导入 Memory 模块
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from Memory.Config import GEMINI_API_KEY, PRICING_TABLE

class AICostTracker:
    # =============================================================================
    #  🎉 AI 成本追踪器
    #
    #  🎨 代码用途:
    #      估算 Token 消耗和美元成本。
    #
    #  💡 易懂解释:
    #      这里是记账的小本本，看看我们花了多少零花钱！
    #
    #  ⚠️ 警告:
    #      [估算偏差]: 目前是基于字符长度的粗略估算，非官方 Token 计数。
    #
    #  ⚙️ 触发源:
    #      Through Body/Gemini.py "Cost Tracking" -> AICostTracker
    # =============================================================================
    def __init__(self):
        self.input_tokens = 0 # 📥 输入 Token 总数
        self.output_tokens = 0 # 📤 输出 Token 总数
        self.cost_usd = 0.0 # 💰 总成本 (USD)
        
        # 增量 (用于周期性上报)
        self.delta_input = 0 # ➕ 输入增量
        self.delta_output = 0 # ➕ 输出增量
        self.delta_cost = 0.0 # ➕ 成本增量

    def track(self, input_len, output_len, model="gemini-1.5-flash"):
        # =============================================================================
        #  🎉 记录成本 (输入长度，输出长度，模型)
        #
        #  🎨 代码用途:
        #     计算单次调用的成本。
        #
        #  💡 易懂解释:
        #      记下一笔账，看看这次思考花了多少钱。
        #
        #  ⚠️ 警告:
        #      [配置依赖]: PRICING_TABLE 必须包含对应模型的定价。
        #
        #  ⚙️ 触发源:
        #      Through Body/Gemini.py "API Call" -> track
        # =============================================================================
        # 🔢 简单估算: 1 char ≈ 0.35 tokens (英文) / 0.6 (中文)
        # 这里使用保守估计
        in_tok = int(input_len * 0.35) # 📏 估算输入 Token
        out_tok = int(output_len * 0.35) # 📏 估算输出 Token
        
        price = PRICING_TABLE.get(model, PRICING_TABLE["gemini-1.5-flash"]) # 💲 获取单价
        cost = (in_tok / 1_000_000 * price["input"]) + (out_tok / 1_000_000 * price["output"]) # 💸 计算成本
        
        self.input_tokens += in_tok # 📈 累加输入
        self.output_tokens += out_tok # 📈 累加输出
        self.cost_usd += cost # 📈 累加成本
        
        self.delta_input += in_tok # ➕ 累加增量输入
        self.delta_output += out_tok # ➕ 累加增量输出
        self.delta_cost += cost # ➕ 累加增量成本

    def pop_deltas(self):
        # =============================================================================
        #  🎉 获取增量
        #
        #  🎨 代码用途:
        #      获取并清空增量数据。
        #
        #  💡 易懂解释:
        #      把账单整理一下，准备汇报啦！
        #
        #  ⚠️ 警告:
        #      [线程安全]: 非线程安全，但在 Python GIL 下通常没问题 (单线程事件循环)。
        #
        #  ⚙️ 触发源:
        #      Through Body/Gemini.py "Periodic Report" -> pop_deltas
        # =============================================================================
        d = {
            "input_tokens": self.delta_input, # 📦 打包输入增量
            "output_tokens": self.delta_output, # 📦 打包输出增量
            "cost_usd": self.delta_cost # 📦 打包成本增量
        }
        self.delta_input = 0 # 🧹 重置输入增量
        self.delta_output = 0 # 🧹 重置输出增量
        self.delta_cost = 0.0 # 🧹 重置成本增量
        return d # 📤 返回增量数据

global_ai_cost = AICostTracker()

class GeminiClient:
    # =============================================================================
    #  🎉 Gemini 客户端
    #
    #  🎨 代码用途:
    #      与 Google Gemini API 交互。
    #
    #  💡 易懂解释:
    #      这是我们的大脑连接器，专门负责和聪明的 Gemini 聊天！
    #
    #  ⚠️ 警告:
    #      [密钥依赖]: 需要有效的 GEMINI_API_KEY。
    #
    #  ⚙️ 触发源:
    #      Through Body/Gemini.py "Init" -> GeminiClient
    # =============================================================================
    def __init__(self):
        self.api_key = GEMINI_API_KEY # 🔑 API 密钥
        self.model = "gemini-1.5-flash" # 🧠 模型名称

    async def plan_next_action(self, screenshot_b64: str, goal: str, current_url: str):
        # =============================================================================
        #  🎉 规划下一步 (截图, 目标, URL)
        #
        #  🎨 代码用途:
        #      发送截图和目标，获取下一步操作。
        #
        #  💡 易懂解释:
        #      把看到的画面发给 Gemini，问问它接下来该怎么办！
        #
        #  ⚠️ 警告:
        #      [网络超时]: 网络请求可能超时。
        #
        #  ⚙️ 触发源:
        #      Through Brain/Main.py "Decision Cycle" -> plan_next_action
        # =============================================================================
        if not self.api_key: # 🛑 检查 API Key
            print("❌ [Gemini] 未配置 API Key") # 📢 打印错误
            return None # 🔙 返回空

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}" # 🔗 构造 API URL
        
        # 📝 构造 Prompt
        prompt = f"""You are an intelligent web browsing agent.
        User Goal: "{goal}"
        Current URL: "{current_url}"
        
        Analyze the screenshot and determine the NEXT single action to achieve the goal.
        Return ONLY a JSON object with the following format (no markdown):
        {{
            "action": "click" | "type" | "scroll" | "navigate" | "done" | "wait",
            "reason": "Short explanation",
            "params": {{
                "x": 0.0-1.0 (relative width),
                "y": 0.0-1.0 (relative height),
                "text": "string",
                "url": "string",
                "delta_y": int
            }}
        }}""" # 🗣️ 提示词

        payload = {
            "contents": [{
                "parts": [
                    { "text": prompt }, # 📄 文本部分
                    { "inline_data": { "mime_type": "image/jpeg", "data": screenshot_b64 } } # 🖼️ 图片部分
                ]
            }]
        } # 📦 请求负载

        async with aiohttp.ClientSession() as session: # 🌐 创建会话
            start_t = time.time() # ⏱️ 记录开始时间
            async with session.post(url, json=payload) as resp: # 📮 发送 POST 请求
                if resp.status != 200: # 🚦 检查状态码
                    print(f"❌ [Gemini] API Error: {resp.status} {await resp.text()}") # 📢 打印错误详情
                    return None # 🔙 返回空
                
                data = await resp.json() # 📦 解析响应 JSON
                
                # 💰 计费
                input_len = len(prompt) + len(screenshot_b64) # 粗略估算 # 📏 估算输入长度
                try:
                    text = data["candidates"][0]["content"]["parts"][0]["text"] # 🔍 提取响应文本
                    global_ai_cost.track(input_len, len(text), self.model) # 🧾 记录成本
                    
                    # 🧹 解析 JSON (清理 Markdown 标记)
                    clean_text = text.replace("```json", "").replace("```", "").strip() # 🧹 清理 Markdown
                    return json.loads(clean_text) # 📦 解析 JSON
                except Exception as e: # 🚨 捕获异常
                    print(f"❌ [Gemini] 解析失败: {e}") # 📢 打印错误
                    return None # 🔙 返回空

angel_brain = GeminiClient()
