#!/bin/bash
# =================================
#  🎉 启动服务器脚本 (Linux/macOS)
#  端口: 5500
# =================================

PORT=5500
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "========================================================"
echo " 🎉 Angel Web Low Server (Port $PORT)"
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

    echo "[启动] 正在启动 HTTP 服务..."
    python3 -m http.server $PORT

    echo ""
    echo "[警告] 服务器已停止。"
    echo "[提示] 按回车键重启，或按 Ctrl+C 退出..."
    read
done
