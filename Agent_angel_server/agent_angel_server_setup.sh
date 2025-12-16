#!/bin/bash
# ==========================================================================
#  文件功能 : Agent_angel_server 环境安装脚本 (Linux 版本)
#  逻辑摘要 : 
#    1. 检测 Python 3
#    2. 安装 Python 依赖
#    3. 安装 Patchright (Linux 版本)
#    4. 安装系统依赖
#  易懂解释 : 给机器人穿衣服，装装备！(纯 Linux 版本)
#  未来扩展 : 支持虚拟环境自动创建
#  当前状态 : 活跃 (更新: 2025-12-16)
# ==========================================================================

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}========================================"
echo -e " Agent_angel_server 环境安装"
echo -e " (Linux + Patchright)"
echo -e "========================================${NC}"
echo ""

# -------------------------------------------------------------
#  步骤1: 检测 Python
# -------------------------------------------------------------
echo -e "${CYAN}[1/4] 正在检测 Python...${NC}"
echo ""

if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
    PYTHON_VERSION=$(python3 --version)
    echo -e "${GREEN}✅ 找到 Python: $PYTHON_VERSION${NC}"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
    PYTHON_VERSION=$(python --version)
    echo -e "${GREEN}✅ 找到 Python: $PYTHON_VERSION${NC}"
else
    echo -e "${RED}❌ 错误: 未找到 Python${NC}"
    echo ""
    echo "请安装 Python 3.8+:"
    echo "  Ubuntu/Debian: sudo apt-get install python3 python3-pip"
    echo "  CentOS/RHEL:   sudo yum install python3 python3-pip"
    echo "  Arch:          sudo pacman -S python python-pip"
    echo ""
    exit 1
fi

echo ""

# -------------------------------------------------------------
#  步骤2: 安装系统依赖
# -------------------------------------------------------------
echo -e "${CYAN}[2/4] 正在安装系统依赖...${NC}"
echo ""

# 检测发行版
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    echo -e "${YELLOW}⚠️  无法检测发行版，假设为 Ubuntu/Debian${NC}"
    OS="ubuntu"
fi

echo "检测到系统: $OS"
echo ""

case $OS in
    ubuntu|debian)
        echo "正在更新包列表..."
        sudo apt-get update
        
        echo "正在安装 Patchright 系统依赖..."
        sudo apt-get install -y \
            libnss3 \
            libnspr4 \
            libatk1.0-0 \
            libatk-bridge2.0-0 \
            libcups2 \
            libdrm2 \
            libxkbcommon0 \
            libxcomposite1 \
            libxdamage1 \
            libxfixes3 \
            libxrandr2 \
            libgbm1 \
            libasound2 \
            libpango-1.0-0 \
            libcairo2 \
            libgdk-pixbuf2.0-0 \
            libgtk-3-0 \
            libx11-xcb1 \
            libxcb-dri3-0 \
            libxcomposite1 \
            libxcursor1 \
            libxi6 \
            libxtst6
        ;;
    
    centos|rhel|fedora)
        echo "正在安装 Patchright 系统依赖..."
        sudo yum install -y \
            nss \
            nspr \
            atk \
            at-spi2-atk \
            cups-libs \
            libdrm \
            libxkbcommon \
            libXcomposite \
            libXdamage \
            libXfixes \
            libXrandr \
            mesa-libgbm \
            alsa-lib \
            pango \
            cairo \
            gdk-pixbuf2 \
            gtk3
        ;;
    
    arch|manjaro)
        echo "正在安装 Patchright 系统依赖..."
        sudo pacman -S --noconfirm \
            nss \
            nspr \
            atk \
            at-spi2-atk \
            libcups \
            libdrm \
            libxkbcommon \
            libxcomposite \
            libxdamage \
            libxfixes \
            libxrandr \
            mesa \
            alsa-lib \
            pango \
            cairo \
            gdk-pixbuf2 \
            gtk3
        ;;
    
    *)
        echo -e "${YELLOW}⚠️  未知发行版: $OS${NC}"
        echo "请手动安装 Chromium 依赖"
        echo ""
        ;;
esac

echo -e "${GREEN}✅ 系统依赖安装完成${NC}"
echo ""

# -------------------------------------------------------------
#  步骤3: 安装 Python 依赖
# -------------------------------------------------------------
echo -e "${CYAN}[3/4] 正在安装 Python 依赖...${NC}"
echo ""

$PYTHON_CMD -m pip install --upgrade pip
$PYTHON_CMD -m pip install -r requirements.txt

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Python 依赖安装失败${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Python 依赖安装完成${NC}"
echo ""

# -------------------------------------------------------------
#  步骤4: 安装 Patchright 浏览器
# -------------------------------------------------------------
echo -e "${CYAN}[4/4] 正在安装 Patchright 浏览器 (Linux 版本)...${NC}"
echo ""

# 设置环境变量以支持无头环境
export PLAYWRIGHT_BROWSERS_PATH=0  # 使用默认路径
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=0  # 不跳过下载

# 检测是否有显示服务器
if [ -z "$DISPLAY" ]; then
    echo "检测到无头环境（无 DISPLAY），使用 xvfb-run"
    
    # 检查 xvfb 是否安装
    if ! command -v xvfb-run &> /dev/null; then
        echo "正在安装 xvfb..."
        case $OS in
            ubuntu|debian)
                sudo apt-get install -y xvfb
                ;;
            centos|rhel|fedora)
                sudo yum install -y xorg-x11-server-Xvfb
                ;;
            arch|manjaro)
                sudo pacman -S --noconfirm xorg-server-xvfb
                ;;
        esac
    fi
    
    # 使用 xvfb-run 安装
    xvfb-run -a $PYTHON_CMD -m patchright install chromium
else
    echo "检测到图形环境，直接安装"
    $PYTHON_CMD -m patchright install chromium
fi

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Patchright 安装失败${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Patchright 安装完成${NC}"
echo ""

# -------------------------------------------------------------
#  验证安装
# -------------------------------------------------------------
echo "正在验证安装..."
$PYTHON_CMD -c "from patchright.sync_api import sync_playwright; print('✅ Patchright 导入成功')"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Patchright 验证失败${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}========================================"
echo -e " 安装完成！"
echo -e "========================================${NC}"
echo ""
echo "环境信息:"
echo "  - Python: $PYTHON_VERSION"
echo "  - Patchright: 已安装 (Linux 版本)"
echo "  - 系统依赖: 已安装"
echo ""
echo "下一步:"
echo "  1. 运行 ./agent_angel_server_start.sh 启动服务"
echo "  2. 或运行 ../start.bat 启动完整系统"
echo ""
