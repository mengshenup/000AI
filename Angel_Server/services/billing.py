import json
from config import PRICING_TABLE

class EnterpriseBilling:
    # ---------------------------------------------------------------- #
    #  企业级计费系统()
    #
    #  类用处：
    #     实时追踪全系统的资源消耗，包括网络流量（WebSocket + 浏览器）和 AI Token 使用量，并计算预估费用。
    #
    #  易懂解释：
    #     这是公司的“会计”。它手里拿着算盘，每一笔数据传输、每一次 AI 思考，它都记在账本上，算算花了多少钱。
    #
    #  警告：
    #     Token 估算算法仅供参考，实际账单以 API 提供商（如 Google Cloud）为准。
    # ---------------------------------------------------------------- #
    def __init__(self):
        # ---------------------------------------------------------------- #
        #  初始化()
        #
        #  函数用处：
        #     初始化所有计费计数器为 0。
        #
        #  易懂解释：
        #     会计上班了，先把账本翻到新的一页，所有数字归零。
        # ---------------------------------------------------------------- #
        # 1. WebSocket 链路流量
        self.ws_tx = 0 # 发送字节数
        self.ws_rx = 0 # 接收字节数
        # 2. 浏览器链路流量
        self.browser_rx = 0 # 接收字节数
        self.browser_tx = 0 # 发送字节数
        # 3. AI 消耗
        self.input_tokens = 0 # 输入 Token 数
        self.output_tokens = 0 # 输出 Token 数
        self.ai_cost = 0.0 # 总 AI 费用
    
    def track_ws(self, tx=0, rx=0):
        # ---------------------------------------------------------------- #
        #  记录WebSocket流量(发送字节数, 接收字节数)
        #
        #  函数用处：
        #     累加前后端通信产生的流量。
        #
        #  易懂解释：
        #     记一笔：刚才跟前端说话用了多少流量。
        #
        #  警告：
        #     只统计应用层 Payload 大小，不包含 TCP/IP 协议头开销。
        # ---------------------------------------------------------------- #
        self.ws_tx += tx # 累加发送流量
        self.ws_rx += rx # 累加接收流量

    def track_browser(self, tx=0, rx=0):
        # ---------------------------------------------------------------- #
        #  记录浏览器流量(发送字节数, 接收字节数)
        #
        #  函数用处：
        #     累加 Playwright 浏览器访问网页产生的流量。
        #
        #  易懂解释：
        #     记一笔：刚才机器人上网看视频用了多少流量。
        # ---------------------------------------------------------------- #
        self.browser_tx += tx # 累加发送流量
        self.browser_rx += rx # 累加接收流量

    def track_ai(self, text_content: str, is_input=True, model="gemini-1.5-flash"):
        # ---------------------------------------------------------------- #
        #  记录AI消耗(文本内容, 是否为输入, 模型名称)
        #
        #  函数用处：
        #     根据文本长度估算 Token 数量，并根据费率表计算成本。
        #
        #  易懂解释：
        #     数一数 AI 读了多少字（Input），又写了多少字（Output），然后按字数收钱。
        #
        #  警告：
        #     中文和英文的 Token 计算方式不同，这里使用 0.35 的系数进行粗略估算。
        # ---------------------------------------------------------------- #
        # 修复BUG: 增加空值检查，防止空字符串报错
        if not text_content: return
        
        # 估算 Token (中文混合环境按 0.35 系数，即 100 个字符约等于 35 个 Token)
        est_tokens = max(1, len(text_content) * 0.35)

        # 获取模型价格配置，如果模型不存在则使用默认值
        price = PRICING_TABLE.get(model, PRICING_TABLE["gemini-1.5-flash"])
        # 根据是输入还是输出选择对应的费率
        rate = price["input"] if is_input else price["output"]
        
        # 计算本次消耗的费用 (Token数 / 100万 * 单价)
        cost = (est_tokens / 1_000_000) * rate
        
        # 更新累计计数器
        if is_input:
            self.input_tokens += est_tokens
        else:
            self.output_tokens += est_tokens
        self.ai_cost += cost

    def get_report(self):
        # ---------------------------------------------------------------- #
        #  生成账单报告()
        #
        #  函数用处：
        #     汇总所有费用，生成一个包含详细数据的字典，用于前端展示。
        #
        #  易懂解释：
        #     打印账单。告诉你总共花了多少钱，钱都花哪儿了。
        #
        #  警告：
        #     返回的是字典对象，不是字符串。
        # ---------------------------------------------------------------- #
        # 计算网络总费用 (总流量 GB * 单价)
        total_egress_bytes = self.ws_tx + self.browser_tx
        net_cost = (total_egress_bytes / (1024**3)) * PRICING_TABLE["network_egress"]
        
        # 计算总开销 (AI 费用 + 网络费用)
        total_money = self.ai_cost + net_cost
        
        # 返回结构化的报告数据
        return {
            "net": {
                "up": self._fmt(self.ws_tx), # 格式化上传流量
                "down": self._fmt(self.ws_rx), # 格式化下载流量
                "cost": f"${net_cost:.6f}" # 网络费用
            },
            "grand_total": f"${total_money:.6f}", # 总费用
            "ai": {
                "details": [
                    f"In-Tok: {int(self.input_tokens)}", # 输入 Token 总数
                    f"Out-Tok: {int(self.output_tokens)}", # 输出 Token 总数
                    f"AI Cost: ${self.ai_cost:.6f}", # AI 总费用
                    f"--- Real Traffic ---",
                    f"Svr Down: {self._fmt(self.browser_rx)}", # 浏览器下载流量
                    f"Svr Up: {self._fmt(self.browser_tx)}" # 浏览器上传流量
                ]
            }
        }

    @staticmethod
    def _fmt(b):
        # ---------------------------------------------------------------- #
        #  格式化字节数(字节数值)
        #
        #  函数用处：
        #     将字节数转换为易读的 KB/MB 格式。
        #
        #  易懂解释：
        #     把一长串数字变成“1.5 MB”这种人能看懂的样子。
        # ---------------------------------------------------------------- #
        if b < 1024: return f"{b} B" # 小于 1KB 显示 B
        if b < 1024**2: return f"{b/1024:.1f} KB" # 小于 1MB 显示 KB
        return f"{b/1024**2:.2f} MB" # 否则显示 MB

# 创建一个全局单例实例供各处调用
global_billing = EnterpriseBilling()