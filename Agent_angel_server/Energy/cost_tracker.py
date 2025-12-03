import json # 🧩 JSON 处理库
import time # ⏱️ 时间库
from Memory.system_config import PRICING_TABLE # 💰 导入定价表

class CostTracker:
    # =================================
    #  🎉 成本追踪器 (无参数)
    #
    #  🎨 代码用途：
    #     作为系统的“财务总监”，实时追踪全系统的资源消耗，包括网络流量（WebSocket + 浏览器）和 AI Token 使用量，并计算预估费用。
    #
    #  💡 易懂解释：
    #     Angel 的小账本！📒 每一笔流量、每一次思考（AI 调用），都要记下来，看看我们花了多少钱，是不是该省着点花啦？
    #
    #  ⚠️ 警告：
    #     Token 估算仅基于字符长度（0.35系数），并非精确的 Tokenizer 结果，实际费用以 API 账单为准。
    # =================================
    def __init__(self):
        # =================================
        #  🎉 初始化账本 (无参数)
        #
        #  🎨 代码用途：
        #     初始化各项计数器为零。
        #
        #  💡 易懂解释：
        #     新的一天开始啦，把账本翻到新的一页，所有数字都归零！0️⃣
        # =================================
        self.ws_tx = 0 # 📤 WebSocket 发送字节数
        self.ws_rx = 0 # 📥 WebSocket 接收字节数
        self.browser_rx = 0 # 📥 浏览器接收字节数
        self.browser_tx = 0 # 📤 浏览器发送字节数
        self.input_tokens = 0 # 📝 AI 输入 Token 数
        self.output_tokens = 0 # 🗣️ AI 输出 Token 数
        self.ai_cost = 0.0 # 💸 总 AI 费用 (USD)
        
        # ⏱️ 速度计算相关
        self.start_time = time.time() # 🏁 会话开始时间
        self.last_check_time = time.time() # ⏱️ 上次检查时间
        self.last_total_tx = 0 # 📤 上次总发送量
        self.last_total_rx = 0 # 📥 上次总接收量
    
    def track_ws(self, tx=0, rx=0):
        # =================================
        #  🎉 记录 WebSocket 流量 (发送量，接收量)
        #
        #  🎨 代码用途：
        #     累加 WebSocket 通道的上下行流量。
        #
        #  💡 易懂解释：
        #     记一笔：神经系统（WebSocket）又传输了一些信号！⚡
        # =================================
        self.ws_tx += tx # 📤 累加发送流量
        self.ws_rx += rx # 📥 累加接收流量

    def track_browser(self, tx=0, rx=0):
        # =================================
        #  🎉 记录浏览器流量 (发送量，接收量)
        #
        #  🎨 代码用途：
        #     累加浏览器产生的网络流量。
        #
        #  💡 易懂解释：
        #     记一笔：眼睛（浏览器）看网页用了多少流量！🌐
        # =================================
        self.browser_tx += tx # 📤 累加发送流量
        self.browser_rx += rx # 📥 累加接收流量

    def track_ai(self, text_content: str, is_input=True, model="gemini-1.5-flash"):
        # =================================
        #  🎉 记录 AI 消耗 (文本内容，是否为输入，模型名称)
        #
        #  🎨 代码用途：
        #     估算文本的 Token 数量，并根据定价表计算费用。
        #
        #  💡 易懂解释：
        #     记一笔：大脑（AI）思考了多少东西！🧠 思考也是要花钱的哦（Token）！
        #
        #  ⚠️ 警告：
        #     如果 text_content 为空，将直接返回。默认使用 gemini-1.5-flash 定价。
        # =================================
        if not text_content: return # 🚫 内容为空，跳过
        est_tokens = max(1, len(text_content) * 0.35) # 📏 估算 Token 数
        price = PRICING_TABLE.get(model, PRICING_TABLE["gemini-1.5-flash"]) # 💰 获取单价
        rate = price["input"] if is_input else price["output"] # 📊 选择费率
        cost = (est_tokens / 1_000_000) * rate # 💸 计算费用
        
        if is_input:
            self.input_tokens += est_tokens # 📝 累加输入 Token
        else:
            self.output_tokens += est_tokens # 🗣️ 累加输出 Token
        self.ai_cost += cost # 💸 累加总费用

    def _format_bytes(self, size):
        # 🛠️ 辅助函数：格式化字节数
        power = 2**10
        n = 0
        power_labels = {0 : '', 1: 'K', 2: 'M', 3: 'G', 4: 'T'}
        while size > power:
            size /= power
            n += 1
        return f"{size:.1f} {power_labels[n]}B"

    def _format_time(self, seconds):
        # 🛠️ 辅助函数：格式化时间
        m, s = divmod(int(seconds), 60)
        h, m = divmod(m, 60)
        return f"{h:02d}:{m:02d}:{s:02d}"

    def get_report(self):
        # =================================
        #  🎉 获取财务报表 (无参数)
        #
        #  🎨 代码用途：
        #     打包当前的资源消耗数据，返回字典格式的报表。
        #     包含实时速度计算和格式化输出。
        #
        #  💡 易懂解释：
        #     老板，这是今天的账单！🧾 请过目！
        # =================================
        now = time.time()
        delta_time = now - self.last_check_time
        
        # 计算总流量
        total_tx = self.ws_tx + self.browser_tx
        total_rx = self.ws_rx + self.browser_rx
        
        # 计算网络费用 (仅计算流出流量)
        # $0.10 per GB -> $0.10 / 1024 / 1024 / 1024 per Byte
        net_cost = (total_tx / (1024**3)) * PRICING_TABLE.get("network_egress", 0.1)
        total_cost = self.ai_cost + net_cost

        # 计算实时速度 (如果间隔太短则不更新速度，避免除零或波动)
        if delta_time > 0.5:
            tx_speed = (total_tx - self.last_total_tx) / delta_time
            rx_speed = (total_rx - self.last_total_rx) / delta_time
            
            self.last_check_time = now
            self.last_total_tx = total_tx
            self.last_total_rx = total_rx
            
            self.current_tx_speed_str = f"{self._format_bytes(tx_speed)}/s"
            self.current_rx_speed_str = f"{self._format_bytes(rx_speed)}/s"
        else:
            # 保持上次计算的速度
            if not hasattr(self, 'current_tx_speed_str'):
                self.current_tx_speed_str = "0.0 B/s"
                self.current_rx_speed_str = "0.0 B/s"

        return {
            "net": {
                "up": self.current_tx_speed_str,
                "down": self.current_rx_speed_str,
                "total_tx": self._format_bytes(total_tx),
                "total_rx": self._format_bytes(total_rx)
            },
            "cost": {
                "total": f"${total_cost:.4f}",
                "net": f"${net_cost:.6f}",
                "ai": f"${self.ai_cost:.4f}",
                "models": {
                    "Gemini": f"${self.ai_cost:.4f}"
                }
            },
            "session": {
                "duration": self._format_time(now - self.start_time),
                "cost": f"${total_cost:.4f}"
            },
            "raw": {
                "ws_traffic": {"tx": self.ws_tx, "rx": self.ws_rx},
                "browser_traffic": {"tx": self.browser_tx, "rx": self.browser_rx},
                "ai_usage": {
                    "input_tokens": int(self.input_tokens),
                    "output_tokens": int(self.output_tokens),
                    "cost_usd": round(self.ai_cost, 4)
                }
            }
        }

# 🌍 全局单例实例
global_cost_tracker = CostTracker()
