#!/bin/bash
# ==========================================================================
#  文件功能 : Agent_angel_server 启动脚本 (Linux 版本)
#  逻辑摘要 : 
#    1. 清理端口
#    2. 启动 Python Worker (8001)
#    3. 启动 Rust Core (8000)
#  易懂解释 : 启动机器人的大脑和身体！
#  当前状态 : 活跃 (更新: 2025-12-16)
# ==========================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}========================================"
echo -e " Agent_angel_server 启动中 (Linux)"
echo -e "========================================${NC}"
echo ""

# -------------------------------------------------------------
#  函数: 清理端口
# -------------------------------------------------------------
kill_port() {
    local port=$1
    echo -e "${CYAN}正在检查端口 $port...${NC}"
    
    local pid=$(lsof -ti:$port 2>/dev/null)
    if [ ! -z "$pid" ]; then
        echo -e "  终止进程 PID: $pid"
        kill -9 $pid 2>/dev/null || true
    fi
}

# -------------------------------------------------------------
#  函数: 检测 Python
# -------------------------------------------------------------
find_python() {
    if command -v python3 &> /dev/null; then
        echo "python3"
    elif command -v python &> /dev/null; then
        echo "python"
    else
        echo ""
    fi
}

# -------------------------------------------------------------
#  步骤1: 检测环境
# -------------------------------------------------------------
PYTHON_CMD=$(find_python)

if [ -z "$PYTHON_CMD" ]; then
    echo -e "${RED}❌ 错误: 未找到 Python${NC}"
    echo "请先运行 ./agent_angel_server_setup.sh"
    exit 1
fi

PYTHON_VERSION=$($PYTHON_CMD --version)
echo -e "${GREEN}✅ Python: $PYTHON_VERSION${NC}"
echo ""

# 检测 Cargo
if [ ! -f ~/.cargo/bin/cargo ]; then
    echo -e "${RED}❌ 错误: 未找到 Rust/Cargo${NC}"
    echo "请安装 Rust: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    exit 1
fi

echo -e "${GREEN}✅ Rust/Cargo: 已安装${NC}"
echo ""

# -------------------------------------------------------------
#  步骤2: 清理端口
# -------------------------------------------------------------
kill_port 8000
kill_port 8001
echo ""

# -------------------------------------------------------------
#  步骤3: 启动 Python Worker (8001)
# -------------------------------------------------------------
echo -e "${GREEN}正在启动 Python Worker (Port 8001)...${NC}"

# 在后台启动 Python Worker
$PYTHON_CMD Brain/Main.py > python_worker.log 2>&1 &
PYTHON_PID=$!

echo "  PID: $PYTHON_PID"
echo "  日志: python_worker.log"
echo ""

sleep 2

# 检查 Python Worker 是否启动成功
if ! ps -p $PYTHON_PID > /dev/null; then
    echo -e "${RED}❌ Python Worker 启动失败${NC}"
    echo "查看日志: cat python_worker.log"
    exit 1
fi

echo -e "${GREEN}✅ Python Worker 已启动${NC}"
echo ""

# -------------------------------------------------------------
#  步骤4: 启动 Rust Core (8000)
# -------------------------------------------------------------
echo -e "${GREEN}正在启动 Rust Core (Port 8000)...${NC}"
echo ""
echo -e "${YELLOW}提示: 按 Ctrl+C 停止服务${NC}"
echo ""

# 设置清理函数
cleanup() {
    echo ""
    echo -e "${YELLOW}正在停止服务...${NC}"
    
    # 停止 Python Worker
    if ps -p $PYTHON_PID > /dev/null; then
        kill $PYTHON_PID 2>/dev/null || true
        echo "  已停止 Python Worker (PID: $PYTHON_PID)"
    fi
    
    # 清理端口
    kill_port 8000
    kill_port 8001
    
    echo -e "${GREEN}服务已停止${NC}"
    exit 0
}

# 注册清理函数
trap cleanup SIGINT SIGTERM

# 启动 Rust Core (前台运行)
~/.cargo/bin/cargo run

# 如果 Rust Core 退出，清理
cleanup
