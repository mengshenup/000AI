#!/bin/bash
# =================================
#  Angel Client Setup (Linux/macOS)
# =================================

echo "========================================================"
echo " Angel Client Setup (Web_compute_low)"
echo "========================================================"

# 1. 检查 Rust 环境
if ! command -v cargo &> /dev/null; then
    echo "未检测到 Rust 环境。"
    echo "正在自动安装 Rust (rustup)..."
    
    # 官方一键安装脚本 (静默模式 -y)
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    
    # 立即加载环境变量
    if [ -f "$HOME/.cargo/env" ]; then
        source "$HOME/.cargo/env"
    fi
else
    echo "Rust 环境已就绪: $(cargo --version)"
fi

# 2. 预编译依赖
echo ""
echo "正在预编译 Rust 依赖 (Cargo.toml)..."
cd "$(dirname "$0")"

# 再次尝试加载环境，确保 cargo 可用
if [ -f "$HOME/.cargo/env" ]; then
    source "$HOME/.cargo/env"
fi

cargo build --bin apps_list --release

if [ $? -eq 0 ]; then
    echo "编译成功！同步工具已准备就绪。"
else
    echo "编译失败。请检查网络或重试。"
fi
