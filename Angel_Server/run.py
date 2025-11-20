import sys
import os
import time
import subprocess
from pathlib import Path

# === 配置 ===
WATCH_DIRS = ["."]   # 监控当前目录
IGNORE_DIRS = ["user_data", "__pycache__", ".git"] # 忽略的目录列表
EXTENSIONS = [".py"] # 需要监控的文件后缀列表

def get_mtime(path):
    # ---------------------------------------------------------------- #
    #  获取最后修改时间(路径)
    #
    #  函数用处：
    #     递归遍历指定目录下所有监控文件（.py），计算它们的最后修改时间总和。
    #
    #  易懂解释：
    #     给所有代码文件“体检”，看看它们有没有变胖（被修改过）。
    #
    #  警告：
    #     如果文件非常多，这个操作可能会比较慢。
    # ---------------------------------------------------------------- #
    total_mtime = 0 # 初始化总时间戳
    # 遍历目录树
    for root, dirs, files in os.walk(path):
        # 过滤掉不需要监控的目录 (原地修改 dirs 列表)
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        for file in files:
            # 检查文件后缀是否在监控列表中
            if any(file.endswith(ext) for ext in EXTENSIONS):
                try:
                    # 获取文件的最后修改时间并累加
                    total_mtime += os.stat(os.path.join(root, file)).st_mtime
                except:
                    pass # 忽略无法读取的文件
    return total_mtime # 返回总时间戳

def main():
    # ---------------------------------------------------------------- #
    #  主监控循环()
    #
    #  函数用处：
    #     启动主服务器进程，并每秒检查一次代码文件是否有变动。如果有变动，自动重启服务器。
    #
    #  易懂解释：
    #     这是个“监工”。它盯着写代码的人，一旦发现代码改了，就立马让服务器重新跑一遍，省得你手动重启。
    #
    #  警告：
    #     使用 subprocess.Popen 启动子进程，如果主进程被强制杀掉，子进程可能变成孤儿进程（虽然有 try-finally 处理）。
    # ---------------------------------------------------------------- #
    print(f"🚀 Angel 自定义热更新启动器 (PID: {os.getpid()})")
    print("🔥 正在启动 main.py ...")
    print("--------------------------------------------------")

    process = None # 存储子进程对象
    
    def start_server():
        # ---------------------------------------------------------------- #
        #  启动服务器()
        #
        #  函数用处：
        #     使用当前 Python 解释器启动 main.py。
        # ---------------------------------------------------------------- #
        # 使用 subprocess.Popen 启动一个新的 Python 进程运行 main.py
        return subprocess.Popen([sys.executable, "main.py"])

    def kill_server(p):
        # ---------------------------------------------------------------- #
        #  关闭服务器(进程对象)
        #
        #  函数用处：
        #     优雅地（或强制地）终止子进程。
        # ---------------------------------------------------------------- #
        if p: # 如果进程对象存在
            try:
                p.terminate() # 尝试发送终止信号 (SIGTERM)
                p.wait(timeout=2) # 等待进程结束，最多等 2 秒
            except:
                try:
                    p.kill() # 如果还在运行，强制杀死 (SIGKILL)
                except:
                    pass # 忽略错误

    try:
        # 首次启动服务器
        process = start_server()
        # 获取当前文件系统的状态快照
        last_mtime = get_mtime(".")

        while True:
            time.sleep(1) # 暂停 1 秒，避免 CPU 占用过高
            # 获取最新的文件系统状态
            current_mtime = get_mtime(".")
            
            # 如果状态发生变化（有文件被修改）
            if current_mtime != last_mtime:
                print("\n♻️  检测到代码修改，正在重启服务器...\n")
                kill_server(process) # 杀死旧进程
                process = start_server() # 启动新进程
                last_mtime = current_mtime # 更新状态快照
                
            # 检查子进程是否意外死亡
            if process.poll() is not None:
                # 如果是异常退出 (returncode != 0)，保持监控循环，等待用户修复代码
                if process.returncode != 0:
                    pass 
                else:
                    # 如果是正常退出 (returncode == 0)，则结束监控程序
                    break

    except KeyboardInterrupt:
        # 捕获 Ctrl+C 中断信号
        print("\n🛑 正在停止服务...")
    finally:
        # 无论如何，确保子进程被关闭
        kill_server(process)

if __name__ == "__main__":
    main()