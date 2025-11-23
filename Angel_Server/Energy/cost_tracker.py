import json
from Memory.system_config import PRICING_TABLE

class CostTracker:
    # =================================
    #  🎉 成本追踪器 (Energy/cost_tracker.py)
    #
    #  🎨 代码用途：
    #     实时追踪全系统的资源消耗，包括网络流量（WebSocket + 浏览器）和 AI Token 使用量，并计算预估费用。
    # =================================
    def __init__(self):
        self.ws_tx = 0 # 📤 发送字节数
        self.ws_rx = 0 # 📥 接收字节数
        self.browser_rx = 0 # 📥 接收字节数
        self.browser_tx = 0 # 📤 发送字节数
        self.input_tokens = 0 # 📝 输入 Token 数
        self.output_tokens = 0 # 🗣️ 输出 Token 数
        self.ai_cost = 0.0 # 💸 总 AI 费用
    
    def track_ws(self, tx=0, rx=0):
        self.ws_tx += tx
        self.ws_rx += rx

    def track_browser(self, tx=0, rx=0):
        self.browser_tx += tx
        self.browser_rx += rx

    def track_ai(self, text_content: str, is_input=True, model="gemini-1.5-flash"):
        if not text_content: return
        est_tokens = max(1, len(text_content) * 0.35)
        price = PRICING_TABLE.get(model, PRICING_TABLE["gemini-1.5-flash"])
        rate = price["input"] if is_input else price["output"]
        cost = (est_tokens / 1_000_000) * rate
        
        if is_input:
            self.input_tokens += est_tokens
        else:
            self.output_tokens += est_tokens
        self.ai_cost += cost

    def get_report(self):
        return {
            "ws_traffic": {"tx": self.ws_tx, "rx": self.ws_rx},
            "browser_traffic": {"tx": self.browser_tx, "rx": self.browser_rx},
            "ai_usage": {
                "input_tokens": int(self.input_tokens),
                "output_tokens": int(self.output_tokens),
                "cost_usd": round(self.ai_cost, 4)
            }
        }

# 🌍 全局单例实例
global_cost_tracker = CostTracker()
