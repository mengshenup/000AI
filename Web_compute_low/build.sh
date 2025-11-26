#!/bin/bash

# ========================================================
#   🦀 Angel Web Low - Build Script (Linux Native)
#   构建脚本：编译源码并归位
# ========================================================

# 1. 设置环境
# 获取脚本所在目录的绝对路径
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

# 设置 Rust 环境路径 (Portable Mode)
RUST_DIR="$SCRIPT_DIR/no_code/wsl_rust_env"
export RUSTUP_HOME="$RUST_DIR/rustup"
export CARGO_HOME="$RUST_DIR/cargo"
export PATH="$CARGO_HOME/bin:$PATH"

echo "[1/2] 正在准备构建环境..."
echo "   (Using Portable Rust: $RUST_DIR)"

# 2. 核心构建命令
echo "🚀 Compiling binaries..."

# [Config] 强制设置 CARGO_TARGET_DIR 到 no_code/target
# 即使没有 .cargo/config.toml，这行环境变量也会生效
export CARGO_TARGET_DIR="no_code/target"

# 创建输出目录
mkdir -p Debug Operator

# 编译
cargo build --bin simple_server --bin apps_list

if [ $? -ne 0 ]; then
    echo "❌ 构建失败 (Build Failed)."
    exit 1
fi

# 3. 归位文件
echo "📦 Copying binaries..."
cp -f "$CARGO_TARGET_DIR/debug/simple_server" ./Debug/simple_server
cp -f "$CARGO_TARGET_DIR/debug/apps_list" ./Operator/apps_list

echo ""
echo "========================================================"
echo "  🎉 构建完成！"
echo "  文件已生成并归位:"
echo "  - Debug/simple_server"
echo "  - Operator/apps_list"
echo "========================================================"
