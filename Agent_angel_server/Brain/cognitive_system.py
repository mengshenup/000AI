import asyncio # ⚡ 异步 I/O
import json # 📄 JSON 处理
from Body.browser_manager import global_browser_manager # 🌐 浏览器管理器
from Brain.gemini_client import global_gemini # 🧠 大脑客户端

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
    
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(CognitiveSystem, cls).__new__(cls)
            cls._instance.initialized = False
        return cls._instance

    def __init__(self):
        if self.initialized: return
        self.initialized = True
        self.running = False
        self.user_goals = {} # 🎯 用户目标 {user_id: "当前任务描述"}

    async def start(self):
        # =================================
        #  🎉 启动认知循环 (无参数)
        #
        #  🎨 代码用途：
        #     启动后台思考循环。
        # =================================
        if self.running: return
        self.running = True
        print("🧠 [认知] 认知系统已启动，开始思考...")
        asyncio.create_task(self._main_loop())

    async def set_goal(self, user_id, goal):
        # =================================
        #  🎉 设定目标 (用户ID, 目标描述)
        #
        #  🎨 代码用途：
        #     为指定用户设定一个新的自主任务。
        # =================================
        print(f"🎯 [认知] 用户 {user_id} 新增目标: {goal}")
        self.user_goals[user_id] = {
            "description": goal,
            "step": 0,
            "status": "active"
        }

    async def _main_loop(self):
        # =================================
        #  🎉 主思考循环 (无参数)
        #
        #  🎨 代码用途：
        #     核心 Loop。遍历所有活跃会话，执行 OODA (观察-调整-决策-行动) 循环。
        # =================================
        while self.running:
            try:
                # 遍历所有活跃的浏览器会话
                active_users = list(global_browser_manager.sessions.keys())
                
                for user_id in active_users:
                    # 1. 检查是否有目标
                    goal = self.user_goals.get(user_id)
                    if not goal or goal['status'] != 'active':
                        continue

                    # 2. 获取感知 (截图)
                    session = global_browser_manager.sessions[user_id]
                    page = session['page']
                    
                    # 📸 截图 (用于分析)
                    # 注意：这里不应该频繁截图，应该有节流
                    # 简化版：每 5 秒思考一次
                    
                    print(f"🤔 [认知] 正在为 {user_id} 思考: {goal['description']}...")
                    
                    # 3. 调用大脑 (Gemini)
                    # TODO: 这里应该调用 global_gemini.analyze_and_act(...)
                    # 暂时模拟思考过程
                    await asyncio.sleep(0.5) 
                    
                    # 4. 执行行动 (Action)
                    # 模拟：随机滚动一下，表示在看
                    await session['hand'].scroll(100)
                    
                    # 5. 更新状态
                    goal['step'] += 1
                    if goal['step'] > 10:
                        print(f"✅ [认知] 用户 {user_id} 任务完成！")
                        goal['status'] = 'completed'

            except Exception as e:
                print(f"❌ [认知] 思考循环出错: {e}")
            
            # 💤 思考间隔 (避免 CPU 爆炸)
            await asyncio.sleep(2)

# 全局单例
global_cognitive_system = CognitiveSystem()