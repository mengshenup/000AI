#!/bin/bash
# =================================
#  🎉 启动服务器脚本 (Linux/macOS)
#  端口: 8000
# =================================

PORT=8000
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "========================================================"
echo " 🎉 Angel Agent Server (Port $PORT)"
echo "========================================================"

while true; do
    echo ""
    echo "[启动] 正在检查端口 $PORT..."
    
    # 清理端口
    PID=$(lsof -t -i:$PORT)
    if [ -n "$PID" ]; then
        echo "[清理] 端口 $PORT 被占用，PID: $PID"
        kill -9 $PID
        sleep 1
    fi

    echo "[环境] 正在检查依赖库..."
    pip3 install -r requirements.txt

    echo "[启动] 正在启动 Agent 服务..."
    export PYTHONPATH="$DIR"
    python3 Brain/main.py

    echo ""
    echo "[警告] 服务器已停止。"
    echo "[提示] 按回车键重启，或按 Ctrl+C 退出..."
    read
done
