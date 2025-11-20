import json
from config import PRICING_TABLE

class EnterpriseBilling:
    def __init__(self):
        # 1. WebSocket 链路流量
        self.ws_tx = 0
        self.ws_rx = 0
        # 2. 浏览器链路流量
        self.browser_rx = 0
        self.browser_tx = 0
        # 3. AI 消耗
        self.input_tokens = 0
        self.output_tokens = 0
        self.ai_cost = 0.0
    
    def track_ws(self, tx=0, rx=0):
        self.ws_tx += tx
        self.ws_rx += rx

    def track_browser(self, tx=0, rx=0):
        self.browser_tx += tx
        self.browser_rx += rx

    def track_ai(self, text_content: str, is_input=True, model="gemini-1.5-flash"):
        # 修复BUG: 增加空值检查
        if not text_content: return
        
        # 估算 Token (中文混合环境按 0.35 系数)
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
        # 计算网络费用
        total_egress_bytes = self.ws_tx + self.browser_tx
        net_cost = (total_egress_bytes / (1024**3)) * PRICING_TABLE["network_egress"]
        total_money = self.ai_cost + net_cost
        
        return {
            "net": {
                "up": self._fmt(self.ws_tx), 
                "down": self._fmt(self.ws_rx),
                "cost": f"${net_cost:.6f}" 
            },
            "grand_total": f"${total_money:.6f}",
            "ai": {
                "details": [
                    f"In-Tok: {int(self.input_tokens)}",
                    f"Out-Tok: {int(self.output_tokens)}",
                    f"AI Cost: ${self.ai_cost:.6f}",
                    f"--- Real Traffic ---",
                    f"Svr Down: {self._fmt(self.browser_rx)}",
                    f"Svr Up: {self._fmt(self.browser_tx)}"
                ]
            }
        }

    @staticmethod
    def _fmt(b):
        if b < 1024: return f"{b} B"
        if b < 1024**2: return f"{b/1024:.1f} KB"
        return f"{b/1024**2:.2f} MB"

# 创建一个全局单例实例供各处调用
global_billing = EnterpriseBilling()