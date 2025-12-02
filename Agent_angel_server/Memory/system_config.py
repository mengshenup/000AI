import os # 📂 操作系统接口

# =================================
#  🎉 系统配置 (无参数)
#
#  🎨 代码用途：
#     集中管理 Angel Server 的全局配置参数，包括文件路径、浏览器设置、目标 URL 和计费标准。
#
#  💡 易懂解释：
#     Angel 的设置中心！⚙️ 就像手机的“设置”APP一样，想改什么参数（比如浏览器大小、存东西的地方）都在这里改。
#
#  ⚠️ 警告：
#     BROWSER_CHANNEL 的选择会影响视频解码能力。内置 Chromium 可能无法播放 H.264 视频。
# =================================

# 📂 用户数据存储目录 (绝对路径，确保在 Agent_angel_server/Memorybank 下)
# 使用绝对路径防止在不同目录下启动时生成位置错误
import pathlib
CURRENT_DIR = pathlib.Path(__file__).parent.absolute() # Agent_angel_server/Memory
PROJECT_ROOT = CURRENT_DIR.parent # Agent_angel_server
USER_DATA_DIR = os.path.join(PROJECT_ROOT, "Memorybank", "BrowserData") # 💾 浏览器缓存和数据存放处

# 🖥️ 浏览器视口大小
VIEWPORT = {'width': 800, 'height': 600} # 🖼️ 虚拟显示器的分辨率

# 🌐 浏览器通道选择
# "chrome": Google Chrome (最佳兼容性，需手动安装)
# "msedge": Microsoft Edge (Windows自带，支持 H.264，推荐)
# None: Playwright 内置 Chromium (可能不支持 H.264 视频解码)
BROWSER_CHANNEL = None # 🚀 默认使用内置 Chromium

# 🔗 默认目标 URL
TARGET_SEARCH_URL = "https://www.douyin.com/search/三角洲行动_零号大坝_老六点位" # 🎯 Angel 起床后第一个要去的地方

# 💰 AI 模型定价表 (USD per 1M Tokens)
PRICING_TABLE = {
    "gemini-1.5-flash": {
        "input": 0.075,  # 📥 输入价格
        "output": 0.30   # 📤 输出价格
    },
    "network_egress": 0.1  # 📡 网络流出流量单价 ($0.10 per GB)
}

# =================================
#  🎉 初始化环境 (无参数)
#
#  🎨 代码用途：
#     在模块加载时自动检查并创建必要的数据目录结构。
#
#  💡 易懂解释：
#     装修队进场！👷‍♂️ 看看房间（目录）建好了没有，没建好就赶紧盖起来！
# =================================
if not os.path.exists(USER_DATA_DIR): # 🔍 检查目录是否存在
    os.makedirs(USER_DATA_DIR) # 🏗️ 创建数据目录