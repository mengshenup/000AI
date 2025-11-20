import sys
import os
import time
import subprocess
from pathlib import Path

# === 配置 ===
WATCH_DIRS = ["."]   # 监控当前目录
IGNORE_DIRS = ["user_data", "__pycache__", ".git"] # 忽略的目录
EXTENSIONS = [".py"] # 监控的文件后缀

def get_mtime(path):
    """获取目录下所有监控文件的最后修改时间总和"""
    total_mtime = 0
    for root, dirs, files in os.walk(path):
        # 过滤忽略的目录
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        for file in files:
            if any(file.endswith(ext) for ext in EXTENSIONS):
                try:
                    total_mtime += os.stat(os.path.join(root, file)).st_mtime
                except:
                    pass
    return total_mtime

def main():
    print(f"🚀 Angel 自定义热更新启动器 (PID: {os.getpid()})")
    print("🔥 正在启动 main.py ...")
    print("--------------------------------------------------")

    process = None
    
    def start_server():
        # 启动 main.py 子进程
        return subprocess.Popen([sys.executable, "main.py"])

    def kill_server(p):
        if p:
            try:
                p.terminate()
                p.wait(timeout=2)
            except:
                try:
                    p.kill()
                except:
                    pass

    try:
        process = start_server()
        last_mtime = get_mtime(".")

        while True:
            time.sleep(1) # 每秒检查一次
            current_mtime = get_mtime(".")
            
            if current_mtime != last_mtime:
                print("\n♻️  检测到代码修改，正在重启服务器...\n")
                kill_server(process)
                process = start_server()
                last_mtime = current_mtime
                
            # 检查子进程是否意外死亡
            if process.poll() is not None:
                # 如果是异常退出，等待代码修改再重启
                if process.returncode != 0:
                    pass 
                else:
                    # 正常退出则结束监控
                    break

    except KeyboardInterrupt:
        print("\n🛑 正在停止服务...")
    finally:
        kill_server(process)

if __name__ == "__main__":
    main()