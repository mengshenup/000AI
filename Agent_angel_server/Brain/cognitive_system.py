import asyncio # ⚡ 异步 I/O 库，用于并发执行任务
import json # 📄 JSON 处理库，用于数据格式转换
from Body.browser_manager import global_browser_manager # 🌐 导入全局浏览器管理器实例
from Brain.gemini_client import global_gemini # 🧠 导入全局 Gemini 客户端实例

class CognitiveSystem:
    # =================================
    #  🎉 认知系统 (无参数)
    #
    #  🎨 代码用途：
    #     Angel 的“前额叶皮层”。负责自主思考、规划任务和执行循环。
    #     它会不断轮询所有活跃的用户会话，检查是否有待处理的任务，并调用 Gemini 进行决策。
    #
    #  💡 易懂解释：
    #     这是 Angel 的总指挥部！👮‍♂️ 它时刻盯着每一个正在干活的分身，看看有没有新任务。
    #     如果有，它就问问超级大脑（Gemini）该怎么办，然后指挥手脚去干活。
    #
    #  ⚠️ 警告：
    #     这是一个后台无限循环，必须确保异常处理完善，防止一个用户的错误导致整个系统崩溃。
    # =================================
    
    _instance = None # 🔒 单例模式实例存储变量

    def __new__(cls):
        # =================================
        #  🎉 创建实例 (类本身)
        #
        #  🎨 代码用途：
        #     实现单例模式，确保整个应用中只有一个 CognitiveSystem 实例。
        #
        #  💡 易懂解释：
        #     世界上只能有一个总指挥！如果已经有了，就直接用那个，别再造新的了！🙅‍♂️
        #
        #  ⚠️ 警告：
        #     多线程环境下可能需要加锁，但在 asyncio 单线程事件循环中通常是安全的。
        # =================================
        if cls._instance is None: # 🧐 检查实例是否存在
            cls._instance = super(CognitiveSystem, cls).__new__(cls) # 🆕 创建新实例
            cls._instance.initialized = False # 🚩 标记为未初始化
        return cls._instance # 🔙 返回实例

    def __init__(self):
        # =================================
        #  🎉 初始化 (无参数)
        #
        #  🎨 代码用途：
        #     初始化认知系统的状态变量。
        #
        #  💡 易懂解释：
        #     指挥官刚上任，先整理一下办公桌，准备好笔记本（user_goals）记录任务！📝
        #
        #  ⚠️ 警告：
        #     注意避免重复初始化。
        # =================================
        if self.initialized: return # 🛑 如果已初始化则直接返回
        self.initialized = True # ✅ 标记为已初始化
        self.running = False # 🛑 初始状态为停止
        self.user_goals = {} # 🎯 用户目标字典 {user_id: "当前任务描述"}

    async def start(self):
        # =================================
        #  🎉 启动认知循环 (无参数)
        #
        #  🎨 代码用途：
        #     启动后台思考循环任务。
        #
        #  💡 易懂解释：
        #     引擎启动！🏎️ 指挥官开始工作啦，大脑开始飞速运转！
        #
        #  ⚠️ 警告：
        #     如果已经运行中，不要重复启动。
        # =================================
        if self.running: return # 🛑 如果正在运行则忽略
        self.running = True # ▶️ 设置运行标志
        print("🧠 [认知] 认知系统已启动，开始思考...") # 📢 打印启动日志
        asyncio.create_task(self._main_loop()) # 🚀 创建后台异步任务运行主循环

    async def set_goal(self, user_id, goal):
        # =================================
        #  🎉 设定目标 (用户ID, 目标描述)
        #
        #  🎨 代码用途：
        #     为指定用户设定一个新的自主任务，并重置步数。
        #
        #  💡 易懂解释：
        #     接到新命令！🫡 用户 {user_id} 想要 {goal}，赶紧记下来，准备行动！
        #
        #  ⚠️ 警告：
        #     会覆盖该用户之前的目标。
        # =================================
        print(f"🎯 [认知] 用户 {user_id} 新增目标: {goal}") # 📢 打印新目标日志
        self.user_goals[user_id] = { # 📝 更新用户目标字典
            "description": goal, # 📋 任务描述
            "step": 0, # 👣 当前步数重置为 0
            "status": "active" # ▶️ 状态设置为活跃
        }

    async def _main_loop(self):
        # =================================
        #  🎉 主思考循环 (无参数)
        #
        #  🎨 代码用途：
        #     核心 Loop。遍历所有活跃会话，执行 OODA (观察-调整-决策-行动) 循环。
        #
        #  💡 易懂解释：
        #     这是指挥官的日常巡逻！👀 看看谁有任务，看看屏幕上是啥，问问大脑咋办，然后下达指令！
        #
        #  ⚠️ 警告：
        #     必须捕获所有异常，防止循环崩溃退出。
        # =================================
        while self.running: # 🔄 只要运行标志为真就一直循环
            try: # 🛡️ 异常捕获块
                # 遍历所有活跃的浏览器会话
                active_users = list(global_browser_manager.sessions.keys()) # 📋 获取当前所有活跃用户 ID
                
                for user_id in active_users: # 🚶‍♂️ 遍历每个用户
                    # 1. 检查是否有目标
                    goal = self.user_goals.get(user_id) # 🔍 获取该用户的目标
                    if not goal or goal['status'] != 'active': # 🛑 如果没目标或目标不活跃
                        continue # ⏭️ 跳过，看下一个用户

                    # 2. 获取感知 (截图)
                    session = global_browser_manager.sessions[user_id] # 📦 获取用户会话对象
                    page = session['page'] # 📄 获取 Playwright 页面对象
                    hand = session['hand'] # 🖐️ 获取鼠标控制器对象
                    
                    print(f"🤔 [认知] 正在为 {user_id} 思考: {goal['description']} (Step {goal['step']})...") # 📢 打印思考日志
                    
                    # 📸 截图 (用于分析)
                    try: # 🛡️ 截图异常捕获
                        screenshot_bytes = await page.screenshot(format="jpeg", quality=50) # 📸 截取屏幕，JPEG 格式压缩质量 50
                        current_url = page.url # 🌐 获取当前页面 URL
                    except Exception as e: # ❌ 捕获截图错误
                        print(f"❌ [认知] 截图失败: {e}") # 📢 打印错误日志
                        continue # ⏭️ 跳过本次循环

                    # 3. 调用大脑 (Gemini)
                    plan = await global_gemini.plan_next_action( # 🧠 调用 Gemini 规划下一步
                        screenshot_bytes, # 🖼️ 传入截图数据
                        goal['description'], # 📋 传入任务描述
                        current_url # 🌐 传入当前 URL
                    )
                    
                    if not plan: # 🛑 如果没有返回计划
                        print("⚠️ [认知] 大脑一片空白 (API调用失败或无响应)") # 📢 打印警告
                        await asyncio.sleep(2) # 💤 休息 2 秒
                        continue # ⏭️ 重试

                    print(f"💡 [认知] 决策: {plan.get('action')} - {plan.get('reason')}") # 📢 打印决策结果

                    # 4. 执行行动 (Action)
                    action = plan.get('action') # 🎬 获取动作类型
                    params = plan.get('params', {}) # ⚙️ 获取动作参数

                    if action == 'click': # 🖱️ 如果是点击
                        await hand.click(params.get('x', 0.5), params.get('y', 0.5)) # 👆 执行点击，默认中心点
                    elif action == 'type': # ⌨️ 如果是输入
                        # 模拟打字
                        text = params.get('text', '') # 📝 获取要输入的文本
                        if text: # ✅ 如果有文本
                            await page.keyboard.type(text, delay=100) # ⌨️ 模拟键盘输入，延迟 100ms
                            await page.keyboard.press('Enter') # ↵ 输入完按回车
                    elif action == 'scroll': # 📜 如果是滚动
                        await hand.scroll(params.get('delta_y', 500)) # 🖱️ 执行滚动，默认向下 500
                    elif action == 'navigate': # 🧭 如果是导航
                        await page.goto(params.get('url')) # 🌐 跳转到指定 URL
                    elif action == 'wait': # ⏳ 如果是等待
                        await asyncio.sleep(2) # 💤 等待 2 秒
                    elif action == 'done': # ✅ 如果是完成
                        print(f"✅ [认知] 用户 {user_id} 任务完成！") # 📢 打印完成日志
                        goal['status'] = 'completed' # 🏁 标记状态为完成
                        # TODO: 通知前端任务完成
                    
                    # 5. 更新状态
                    goal['step'] += 1 # 👣 步数加 1
                    if goal['step'] > 20: # 🛑 防止死循环，最大 20 步
                        print(f"🛑 [认知] 任务步数超限，强制停止。") # 📢 打印超限日志
                        goal['status'] = 'failed' # ❌ 标记状态为失败

            except Exception as e: # ❌ 捕获主循环异常
                print(f"❌ [认知] 思考循环出错: {e}") # 📢 打印错误信息
            
            # 💤 思考间隔 (避免 CPU 爆炸)
            await asyncio.sleep(3) # 🛌 休息 3 秒再进行下一轮思考

# 全局单例
global_cognitive_system = CognitiveSystem() # 🌍 创建全局认知系统实例
