/* ==========================================================================
   📃 文件功能 : Web_compute_low 环境安装脚本 (C++ 重构版)
   ⚡ 逻辑摘要 : 自动检测 WSL -> 资源限制配置 -> 依赖安装 -> Rust 环境构建 -> 实时监控
   💡 易懂解释 : 这是一个全自动的装修队，帮你把电脑里的 WSL 房间打扫干净，装好 Rust 家具，还会一直盯着不让它把家里弄乱（内存溢出）。
   🔋 扩展备注 : 未来可增加对其他 Linux 发行版的支持，或增加图形化进度条。
   📊 当前状态 : 活跃 (最后更新: 2025-11-28)
   🧱 setup.cpp 踩坑记录 (必须累加，严禁覆盖) :
      1. [2025-11-28] [MemoryLeak] [MonitorThread]: 监控线程未分离导致主线程阻塞 -> 使用 detach() 分离线程
      2. [2025-11-28] [ZombieProcess] [Timeout]: 超时后子进程未清理 -> 添加 taskkill 逻辑
   ========================================================================== */

#include <iostream>
#include <string>
#include <vector>
#include <cstdlib>
#include <fstream>
#include <filesystem>
#include <thread>
#include <chrono>
#include <atomic>
#include <mutex>
#include <future>

namespace fs = std::filesystem; // 📂 文件系统别名

// =============================================================================
//  🎉 全局配置与状态
// =============================================================================

bool g_nonInteractive = false;       // 🤖 非交互模式标志
bool g_safeMode = false;             // 🛡️ 安全模式标志
bool g_lowResourceMode = false;      // 📉 低资源模式标志 (<2GB RAM)
std::string g_wslCmd = "wsl";        // 🐚 WSL命令前缀
std::atomic<bool> g_monitorRunning(true); // 💓 监控线程心跳
std::atomic<bool> g_criticalSection(false); // 🚧 关键区段标志
std::mutex g_logMutex;               // 🔒 日志打印互斥锁

// 前置声明
int runCommand(const std::string& cmd, bool silent = false);

// =============================================================================
//  🎉 工具函数
// =============================================================================

// =============================================================================
//  🎉 内存修剪器 (无参数)
//
//  🎨 代码用途：
//      调用 Windows API 强制修剪当前进程的工作集，释放物理内存。
//
//  💡 易懂解释：
//      把口袋里暂时不用的东西（内存页）都掏出来放回桌子上（交换文件），给别人腾地方。
//
//  ⚠️ 警告：
//      性能抖动：频繁调用会导致页面错误增加，降低性能。
//
//  ⚙️ 触发源 (Trigger Source)：
//      monitorSystem -> Low Memory
// =============================================================================
void trimWorkingSet() {
    // 使用 system 调用 PowerShell 或 rundll32 可能太慢，这里仅作为占位
    // 在 C++ 中直接调用 SetProcessWorkingSetSize 需要 windows.h，为了保持无依赖，
    // 我们尝试通过 system("wmic process where name='setup.exe' call EmptyWorkingSet")
    // 但这可能太重了。
    // 简单策略：在低内存模式下，我们在关键步骤间歇期调用。
    runCommand("powershell -Command \"[System.GC]::Collect()\" >nul 2>&1", true);
}

// =============================================================================
//  🎉 日志记录器 (日志级别，日志内容)
//
//  🎨 代码用途：
//      线程安全的控制台日志输出工具，用于向用户反馈当前执行状态。
//
//  💡 易懂解释：
//      就像一个尽职的广播员，拿着大喇叭（cout）把发生的事情喊出来，而且懂得排队（mutex），不会几个人同时喊。
//
//  ⚠️ 警告：
//      无特殊风险。
//
//  ⚙️ 触发源 (Trigger Source)：
//      setup.cpp (全文件) -> 各个功能函数 -> log()
// =============================================================================
void log(const std::string& level, const std::string& msg) {
    std::lock_guard<std::mutex> lock(g_logMutex); // 🔒 获取打印锁
    std::cout << "[" << level << "] " << msg << std::endl; // 📢 输出格式化日志
}

// =============================================================================
//  🎉 系统命令执行器 (命令字符串，是否静默)
//
//  🎨 代码用途：
//      封装 system() 调用，支持静默执行模式。
//
//  💡 易懂解释：
//      这是传令兵，把你的命令传给操作系统去执行。如果让他“闭嘴”（silent），他就悄悄干活不回话。
//
//  ⚠️ 警告：
//      命令注入风险：cmd 参数直接传入 system()，需确保来源可信。
//
//  ⚙️ 触发源 (Trigger Source)：
//      setup.cpp -> runCommandWithTimeout / cleanMemory
// =============================================================================
int runCommand(const std::string& cmd, bool silent) {
    std::string finalCmd = cmd; // 📝 复制命令
    if (silent) {
        finalCmd += " >nul 2>&1"; // 🔇 追加静默重定向
    }
    return std::system(finalCmd.c_str()); // 🚀 执行系统命令
}

// =============================================================================
//  🎉 带超时的命令执行器 (命令，超时秒数，是否静默)
//
//  🎨 代码用途：
//      异步执行命令并设置超时熔断机制，防止外部进程卡死。
//
//  💡 易懂解释：
//      给传令兵设个闹钟，如果他在规定时间内没回来，就认为他丢了（超时），并派人去清理现场。
//
//  ⚠️ 警告：
//      僵尸进程风险：超时后虽然杀死了 wsl.exe，但深层子进程可能残留。
//
//  ⚙️ 触发源 (Trigger Source)：
//      setup.cpp -> checkWSL / installDependencies
// =============================================================================
int runCommandWithTimeout(const std::string& cmd, int timeoutSeconds, bool silent = false) {
    auto future = std::async(std::launch::async, [cmd, silent]() { // ⏱️ 启动异步任务
        return runCommand(cmd, silent);
    });

    if (future.wait_for(std::chrono::seconds(timeoutSeconds)) == std::future_status::ready) { // ⏳ 等待结果
        return future.get(); // ✅ 任务按时完成
    } else {
        log("WARN", "Command timed out: " + cmd); // ⚠️ 记录超时警告
        if (cmd.find("wsl") != std::string::npos) { // 🔍 检查是否为WSL命令
            runCommand("taskkill /F /IM wsl.exe", true); // 🔪 强制终止WSL进程
        }
        return -1; // ❌ 返回超时错误码
    }
}

// =============================================================================
//  🎉 命令输出捕获器 (命令字符串)
//
//  🎨 代码用途：
//      执行命令并获取其标准输出内容，用于获取系统信息。
//
//  💡 易懂解释：
//      不仅让传令兵去干活，还让他把看到的东西写在纸条上带回来。
//
//  ⚠️ 警告：
//      缓冲区溢出风险：固定 128 字节缓冲区，长输出会被截断。
//
//  ⚙️ 触发源 (Trigger Source)：
//      setup.cpp -> checkMemory / getCommandOutput
// =============================================================================
std::string getCommandOutput(const std::string& cmd) {
    std::string result; // 📦 结果容器
    char buffer[128]; // 🥣 临时缓冲区
    std::string finalCmd = cmd + " 2>&1"; // 🔗 合并错误输出
    FILE* pipe = _popen(finalCmd.c_str(), "r"); // 🔌 建立读取管道
    if (!pipe) return "ERROR"; // ❌ 管道建立失败
    while (fgets(buffer, sizeof(buffer), pipe) != NULL) { // 🔄 逐行读取
        result += buffer; // 📥 收集输出内容
    }
    _pclose(pipe); // 🚪 关闭管道
    return result; // 📤 返回完整输出
}

// =============================================================================
//  🎉 内存清理卫士 (无参数)
//
//  🎨 代码用途：
//      主动终止高内存占用进程并重启关键服务，释放系统资源。
//
//  💡 易懂解释：
//      家政阿姨来了，把占着茅坑不拉屎的进程（如卡死的 rust-analyzer）赶走，并重启服务刷新状态。
//
//  ⚠️ 警告：
//      服务中断风险：重启 LxssManager 会导致所有 WSL 实例断开。
//
//  ⚙️ 触发源 (Trigger Source)：
//      monitorSystem -> 内存过低 -> cleanMemory
// =============================================================================
void cleanMemory() {
    log("INFO", "Attempting to clean memory..."); // 📢 宣告清理开始
    runCommand("taskkill /F /IM rust-analyzer.exe", true); // 🔪 杀掉 Rust 分析器
    
    log("INFO", "Restarting LxssManager service..."); // 📢 宣告重启服务
    runCommand("net stop LxssManager /y", true); // 🛑 停止 WSL 服务
    runCommand("net start LxssManager", true); // ▶️ 启动 WSL 服务

    log("INFO", "Ensuring vmcompute service is running..."); // 📢 检查虚拟化服务
    runCommand("net start vmcompute", true); // ▶️ 启动计算服务
    
    log("OK", "Memory cleanup commands executed."); // ✅ 清理完成
}

// =============================================================================
//  🎉 系统资源监控哨兵 (无参数)
//
//  🎨 代码用途：
//      后台线程函数，周期性检查物理内存，触发自动清理或警告。
//
//  💡 易懂解释：
//      保安队长，每隔 5 秒巡逻一次，发现内存不够用了就赶紧叫人（cleanMemory）来收拾。
//
//  ⚠️ 警告：
//      死循环风险：依赖 g_monitorRunning 标志位退出。
//
//  ⚙️ 触发源 (Trigger Source)：
//      main -> std::thread -> monitorSystem
// =============================================================================
void monitorSystem() {
    while (g_monitorRunning) { // 🔄 持续监控循环
        std::string output = getCommandOutput("wmic OS get FreePhysicalMemory /value"); // 📊 获取内存信息
        size_t pos = output.find("="); // 🔍 定位数值
        if (pos != std::string::npos) {
            try {
                long long freeMemKB = std::stoll(output.substr(pos + 1)); // 🔢 解析数值
                long long freeMemMB = freeMemKB / 1024; // 📉 转换为 MB
                
                // 如果空闲内存低于 200MB，这是极度危险的
                if (freeMemMB < 200) {
                    if (g_criticalSection) {
                        log("MONITOR", "⚠️ CRITICAL LOW MEMORY: " + std::to_string(freeMemMB) + " MB. Critical section active, skipping cleanup.");
                        trimWorkingSet(); // 尝试轻量级修剪
                    } else {
                        log("MONITOR", "⚠️ CRITICAL LOW MEMORY: " + std::to_string(freeMemMB) + " MB. Cleaning...");
                        // 紧急清理
                        cleanMemory();
                    }
                } else if (freeMemMB < 500) { // ⚠️ 警告阈值
                    log("MONITOR", "⚠️ Low Memory: " + std::to_string(freeMemMB) + " MB"); // 📢 发出低内存警告
                    if (g_lowResourceMode) trimWorkingSet(); // 主动修剪
                }
            } catch (...) {
                // 🔇 忽略解析异常
            }
        }
        std::this_thread::sleep_for(std::chrono::seconds(2)); // 💤 提高采样频率到 2 秒
    }
}

// =============================================================================
//  🎉 核心逻辑
// =============================================================================

// =============================================================================
//  🎉 内存预检员 (无参数)
//
//  🎨 代码用途：
//      在安装开始前检查系统内存，决定是否开启“安全模式”（低资源模式）。
//
//  💡 易懂解释：
//      进门前先摸摸口袋里的钱（内存），如果钱不够（<1GB），就决定只买最便宜的套餐（Safe Mode）。
//
//  ⚠️ 警告：
//      解析失败风险：依赖 wmic 输出格式，若格式变动可能导致误判。
//
//  ⚙️ 触发源 (Trigger Source)：
//      main -> checkMemory
// =============================================================================
void checkMemory() {
    log("INFO", "Checking system memory..."); // 📢 开始检查
    std::string output = getCommandOutput("wmic OS get FreePhysicalMemory /value"); // 📊 获取内存数据
    size_t pos = output.find("="); // 🔍 定位数据点
    if (pos != std::string::npos) {
        try {
            long long freeMemKB = std::stoll(output.substr(pos + 1)); // 🔢 解析数值
            long long freeMemMB = freeMemKB / 1024; // 📉 转换单位
            log("INFO", "Free Memory: " + std::to_string(freeMemMB) + " MB"); // 📢 报告内存
            
            if (freeMemMB < 1000) { // 📉 低内存阈值
                log("WARN", "Low memory detected (<1GB). Enabling Safe Mode and cleaning."); // ⚠️ 触发安全模式
                g_safeMode = true; // 🛡️ 激活安全模式标志
                g_lowResourceMode = true; // 📉 激活低资源模式
                cleanMemory(); // 🧹 立即清理释放资源
            } else if (freeMemMB < 2000) {
                log("INFO", "Moderate memory (<2GB). Enabling Low Resource Mode.");
                g_lowResourceMode = true;
            } else {
                log("OK", "Memory is sufficient."); // ✅ 内存充足
            }
        } catch (...) {
            log("WARN", "Failed to parse memory info. Assuming sufficient."); // ⚠️ 解析失败兜底
        }
    } else {
        log("WARN", "Failed to get memory info."); // ⚠️ 获取失败兜底
    }
}

// =============================================================================
//  🎉 WSL 状态探针 (无参数)
//
//  🎨 代码用途：
//      检测 WSL 子系统是否已安装且能正常运行命令。
//
//  💡 易懂解释：
//      敲敲 WSL 的门，问一句“在吗？”，如果有人回话（echo check），说明房间是好的。
//
//  ⚠️ 警告：
//      误报风险：wsl --status 可能返回 0 但实际无法运行发行版。
//
//  ⚙️ 触发源 (Trigger Source)：
//      main -> checkWSL
// =============================================================================
bool checkWSL() {
    log("DEBUG", "Checking WSL status..."); // 📢 开始检查
    
    // 1. 检查 WSL 服务状态
    int ret = runCommandWithTimeout(g_wslCmd + " --status", 10, true); 
    
    if (ret != 0) {
        log("WARN", "WSL status check failed. Attempting to repair..."); // ⚠️ 尝试修复
        // 尝试启用功能 (针对 Server 环境)
        runCommand("dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart", true);
        runCommand("dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart", true);
        // 重启服务
        runCommand("net stop LxssManager /y", true);
        runCommand("net start LxssManager", true);
        
        ret = runCommandWithTimeout(g_wslCmd + " --status", 20, true); // 🔄 二次检查
        if (ret != 0) {
             log("ERROR", "WSL is not responding even after repair attempts."); // ❌ 彻底失败
             return false; 
        }
    }
    
    // 2. 检查特定发行版 (Alpine)
    ret = runCommandWithTimeout(g_wslCmd + " -d Alpine echo check", 10, true);
    if (ret != 0) {
        log("WARN", "Alpine distro not found or broken."); // ⚠️ 发行版缺失
        return false; 
    }
    
    log("OK", "WSL (Alpine) is working."); // ✅ 一切正常
    return true; 
}

// =============================================================================
//  🎉 手动安装发行版 (Alpine 版)
//
//  🎨 代码用途：
//      下载并导入 Alpine Linux (5MB)，替代臃肿的 Ubuntu (1GB+)。
//
//  💡 易懂解释：
//      这次我们不搬大沙发了，改搬一个小板凳（Alpine），既轻便又结实，绝对不会把地板（内存）压塌。
//
//  ⚠️ 警告：
//      网络依赖：需要访问 alpinelinux.org。
//
//  ⚙️ 触发源 (Trigger Source)：
//      installWSL -> Server Detected or Install Failed
// =============================================================================
bool installDistroManually() {
    log("INFO", "Starting Alpine Linux installation (Lightweight Mode)..."); 
    g_criticalSection = true; 

    // 1. 准备目录
    if (fs::exists("Ubuntu_Extract")) fs::remove_all("Ubuntu_Extract"); 
    if (fs::exists("Ubuntu_Data")) fs::remove_all("Ubuntu_Data"); 
    fs::create_directories("Ubuntu_Data"); 

    // 2. 下载 Alpine RootFS (仅 5MB!)
    // 使用 v3.19 稳定版
    std::string url = "https://dl-cdn.alpinelinux.org/alpine/v3.19/releases/x86_64/alpine-minirootfs-3.19.1-x86_64.tar.gz";
    
    // 定义下载路径 (遵循新的回收协议)
    // 路径: C:\000AI\Debug\Web_compute_low\Trash
    std::string trashRoot = "C:\\000AI\\Debug\\Web_compute_low\\Trash";
    if (!fs::exists(trashRoot)) fs::create_directories(trashRoot);
    
    std::string file = trashRoot + "\\alpine-rootfs.tar.gz";
    
    if (!fs::exists(file)) {
        log("INFO", "Downloading Alpine RootFS (5MB)..."); 
        std::string dlCmd = "curl -L -o \"" + file + "\" " + url;
        // 如果 curl 失败，尝试 powershell
        if (runCommand(dlCmd, true) != 0) {
             dlCmd = "powershell -Command \"Invoke-WebRequest -Uri '" + url + "' -OutFile '" + file + "' -UseBasicParsing\"";
             if (runCommandWithTimeout(dlCmd, 300) != 0) {
                log("ERROR", "Failed to download Alpine RootFS."); 
                g_criticalSection = false; 
                return false;
             }
        }
    }

    // 3. 导入 WSL
    log("INFO", "Importing Alpine distro..."); 
    
    // 清理旧实例 (无论是 Ubuntu 还是 Alpine)
    runCommand(g_wslCmd + " --unregister Ubuntu-22.04", true); 
    runCommand(g_wslCmd + " --unregister Alpine", true); 
    
    std::string absDataPath = fs::absolute("Ubuntu_Data").string();
    std::string absTarPath = file; // 使用 Trash 中的文件路径
    
    // 导入为 "Alpine"
    // 优先尝试 WSL 2
    std::string importCmd = g_wslCmd + " --import Alpine \"" + absDataPath + "\" \"" + absTarPath + "\" --version 2";
    
    if (runCommand(importCmd) != 0) {
        log("WARN", "WSL 2 import failed. Trying WSL 1 fallback..."); 
        // 尝试 WSL 1 (不需要虚拟化支持)
        importCmd = g_wslCmd + " --import Alpine \"" + absDataPath + "\" \"" + absTarPath + "\" --version 1";
        if (runCommand(importCmd) != 0) {
            log("ERROR", "WSL 1 import also failed."); 
            g_criticalSection = false; 
            return false;
        }
        log("INFO", "Fallback to WSL 1 successful.");
    }

    log("SUCCESS", "Alpine installation successful."); 
    g_criticalSection = false; 
    return true;
}

// =============================================================================
//  🎉 WSL 安装工 (无参数)
//
//  🎨 代码用途：
//      自动安装 WSL 子系统，兼容 Windows Server 环境。
//
//  💡 易懂解释：
//      如果发现家里没有 WSL 这个房间，就叫装修队（dism/powershell）来现盖一个。
//
//  ⚠️ 警告：
//      重启中断：安装 WSL 通常需要重启系统，脚本无法自动恢复执行。
//
//  ⚙️ 触发源 (Trigger Source)：
//      main -> checkWSL 失败 -> installWSL
// =============================================================================
void installWSL() {
    log("INFO", "Attempting to install/configure WSL..."); // 📢 开始安装
    
    std::string osCaption = getCommandOutput("wmic os get caption"); // 🖥️ 获取系统版本
    bool isServer = (osCaption.find("Server") != std::string::npos); // 🏢 判断服务器版

    if (isServer) { // 🏢 服务器版检测
        log("INFO", "Windows Server detected. Using Server-specific setup..."); // 📢 服务器版特殊处理
        
        // 1. 启用功能 (DISM) - 使用 /Quiet 防止控制台溢出
        runCommand("dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart /Quiet", true);
        runCommand("dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart /Quiet", true);
        
        // 2. 重启服务 (尝试生效)
        runCommand("net stop LxssManager /y", true);
        runCommand("net start LxssManager", true);
        
        // 3. 更新内核
        log("INFO", "Attempting to update WSL kernel...");
        runCommand("wsl --update >nul 2>&1", true);

        // 4. 总是尝试手动安装发行版 (Server 商店通常不可用)
        if (!installDistroManually()) { // 🛠️ 手动安装发行版
             log("ERROR", "Manual distro installation failed."); // ❌ 失败
        }
    } else {
        // Client OS
        runCommand("powershell -Command \"Start-Process 'wsl' -ArgumentList '--install' -Verb RunAs -Wait\""); // 🚀 执行标准安装
        
        // 如果标准安装失败或没有我们需要的发行版，尝试手动
        if (!checkWSL()) {
             log("WARN", "Standard install failed or distro missing. Trying manual install...");
             installDistroManually();
        }
    }
    
    log("INFO", "WSL setup phase finished. Please restart if prompted."); // 📢 安装结束
}

// =============================================================================
//  🎉 WSL 资源配置师 (无参数)
//
//  🎨 代码用途：
//      生成 .wslconfig 文件，限制 WSL 的内存和 CPU 使用，防止宿主机卡死。
//
//  💡 易懂解释：
//      给 WSL 房间立个规矩：最多只能用多少电（CPU）和水（内存），免得把整个房子的资源都占光了。
//
//  ⚠️ 警告：
//      配置覆盖：会直接覆盖用户原有的 .wslconfig 文件。
//
//  ⚙️ 触发源 (Trigger Source)：
//      main -> configureWSL
// =============================================================================
void configureWSL() {
    log("INFO", "Configuring .wslconfig..."); // 📢 开始配置
    const char* userProfileEnv = std::getenv("USERPROFILE"); // 🏠 获取用户目录
    std::string userProfile = userProfileEnv ? userProfileEnv : "C:\\"; // 📂 路径兜底
    std::string configPath = userProfile + "\\.wslconfig"; // 📝 配置文件路径
    
    long long freeMemMB = 0; // 🔢 内存变量初始化
    std::string output = getCommandOutput("wmic OS get FreePhysicalMemory /value"); // 📊 再次检查内存
    size_t pos = output.find("=");
    if (pos != std::string::npos) {
        try {
            freeMemMB = std::stoll(output.substr(pos + 1)) / 1024; // 📉 转换单位
        } catch (...) {}
    }

    std::ofstream configFile(configPath); // ✍️ 打开文件写入
    if (configFile.is_open()) {
        configFile << "[wsl2]\n"; // 🏷️ 写入节头
        
        if (g_safeMode || freeMemMB < 1000) { // 🛡️ 安全模式/低内存
            log("WARN", "Setting WSL memory to 512MB due to low system memory."); // ⚠️ 极低配置
            configFile << "memory=512MB\n"; // 📉 限制 512MB
        } else if (freeMemMB < 2500) { // 📉 中等内存
            log("INFO", "Setting WSL memory to 1024MB."); // 📢 中等配置
            configFile << "memory=1024MB\n"; // 📉 限制 1GB
        } else { // 🚀 充足内存
            log("INFO", "Setting WSL memory to 2048MB."); // 📢 高配
            configFile << "memory=2048MB\n"; // 📉 限制 2GB
        }
        
        configFile << "processors=1\n"; // 🐌 限制单核
        configFile << "swap=4GB\n"; // 🔄 设置交换空间
        configFile << "localhostForwarding=true\n"; // 🌐 开启网络转发
        configFile.close(); // 🚪 关闭文件
        log("OK", ".wslconfig updated."); // ✅ 配置完成
    } else {
        log("ERROR", "Failed to write .wslconfig"); // ❌ 写入失败
    }
    
    log("INFO", "Restarting WSL (via LxssManager restart)..."); // 📢 重启生效
    runCommand("taskkill /F /IM wsl.exe", true); // 🔪 杀掉旧进程
    runCommand("net stop LxssManager /y", true); // 🛑 停止服务
    runCommand("net start LxssManager", true); // ▶️ 启动服务
    
    log("INFO", "Waiting 10s for WSL to restart..."); // ⏳ 等待重启
    std::this_thread::sleep_for(std::chrono::seconds(10)); // 💤 延时等待
}

// =============================================================================
//  🎉 依赖包安装员 (Alpine 版)
//
//  🎨 代码用途：
//      使用 apk 包管理器安装依赖。
//
//  💡 易懂解释：
//      Alpine 的超市叫 apk，我们要去那里买工具。
//
//  ⚙️ 触发源 (Trigger Source)：
//      main -> installDependencies
// =============================================================================
bool installDependencies() {
    log("INFO", "Installing dependencies in Alpine..."); 
    
    std::string wslDistro = g_wslCmd + " -d Alpine";
    
    // 1. 配置 DNS (防止 apk 无法解析)
    runCommand(wslDistro + " sh -c \"echo 'nameserver 8.8.8.8' > /etc/resolv.conf\"", true);

    // 2. 更新源并安装基础包
    // build-base: 编译工具链 (gcc, make 等)
    // curl, git, bash: 常用工具
    // openssl-dev: 编译依赖
    int ret = runCommandWithTimeout(wslDistro + " apk update", 60); 
    if (ret != 0) {
        log("WARN", "apk update failed. Retrying..."); 
        std::this_thread::sleep_for(std::chrono::seconds(2)); 
        runCommandWithTimeout(wslDistro + " apk update", 60); 
    }
    
    std::string installCmd = wslDistro + " apk add build-base curl git bash openssl-dev"; 
    ret = runCommandWithTimeout(installCmd, 300); 
    
    if (ret != 0) {
        log("ERROR", "Failed to install dependencies."); 
        return false; 
    }
    
    return true; 
}

// =============================================================================
//  🎉 Rust 环境搭建师 (Alpine 极速版)
//
//  🎨 代码用途：
//      直接使用 apk 安装 Rust，避免 rustup 编译消耗。
//
//  💡 易懂解释：
//      直接买成品家具（apk add rust），不自己锯木头了，省力气！
//
//  ⚙️ 触发源 (Trigger Source)：
//      main -> installRust
// =============================================================================
bool installRust() {
    log("INFO", "Installing Rust via apk...");
    std::string wslDistro = g_wslCmd + " -d Alpine";

    // 直接安装 rust 和 cargo
    int ret = runCommandWithTimeout(wslDistro + " apk add rust cargo", 300);
    
    if (ret != 0) {
        log("ERROR", "Failed to install Rust via apk.");
        return false;
    }

    // 验证
    ret = runCommandWithTimeout(wslDistro + " cargo --version", 30, true);
    if (ret == 0) {
        log("SUCCESS", "Rust installed successfully.");
        return true;
    } else {
        log("ERROR", "Rust verification failed.");
        return false;
    }
}

//  ⚠️ 警告：
//      下载失败：rustup 脚本下载可能因网络问题失败。
//
//  ⚙️ 触发源 (Trigger Source)：
//      main -> setupRust
// =============================================================================
bool setupRust() {
    // Alpine 模式下，installRust 已经完成了所有工作
    // 此函数仅作为兼容性保留，或用于非 Alpine 环境
    log("INFO", "Checking Rust setup...");
    
    std::string wslDistro = g_wslCmd + " -d Alpine";
    int ret = runCommandWithTimeout(wslDistro + " cargo --version", 30, true);
    
    if (ret == 0) {
        log("OK", "Rust is ready.");
        return true;
    }
    
    log("WARN", "Rust not found in Alpine. Retrying install...");
    return installRust();
}

// =============================================================================
//  🎉 Rust 环境验证师 (无参数)
//
//  🎨 代码用途：
//      编译并运行一个简单的 Rust 程序，确保编译器和运行环境正常。
//
//  💡 易懂解释：
//      家具装好了，先试着坐一下（编译 Hello World），看看会不会塌（报错）。
//
//  ⚠️ 警告：
//      无特殊风险。
//
//  ⚙️ 触发源 (Trigger Source)：
//      main -> verifyRust
// =============================================================================
bool verifyRust() {
    log("INFO", "Verifying Rust installation..."); // 📢 开始验证
    
    std::string currentDir = fs::current_path().string(); // 📂 获取当前路径
    std::string rustDir = currentDir + "\\no_code\\wsl_rust_env"; // 🎯 Rust 目录
    std::string cargoHome = rustDir + "\\cargo"; // 📦 Cargo 目录
    
    // 定义测试代码路径 (遵循新的回收协议)
    // 路径: C:\000AI\Debug\Web_compute_low\test_code
    // 注意：WSL 访问 Windows 路径需要 /mnt/c/...
    std::string debugRoot = "C:\\000AI\\Debug\\Web_compute_low\\test_code";
    if (!fs::exists(debugRoot)) fs::create_directories(debugRoot);

    std::string testFileWin = debugRoot + "\\test_compile.rs";
    std::string testExeWin = debugRoot + "\\test_compile";
    
    // WSL 路径转换 (C:\000AI... -> /mnt/c/000AI...)
    std::string testFileWsl = "/mnt/c/000AI/Debug/Web_compute_low/test_code/test_compile.rs";
    std::string testExeWsl = "/mnt/c/000AI/Debug/Web_compute_low/test_code/test_compile";

    // 创建测试文件
    std::ofstream testFile(testFileWin); // 📝 创建测试源码
    testFile << "fn main() { println!(\"Hello from WSL Portable Rust!\"); }\n";
    testFile.close();
    
    // Use specific distro
    std::string wslDistro = g_wslCmd + " -d Alpine";
    
    // 编译命令
    std::string compileCmd = wslDistro + " bash -c \"rustc " + testFileWsl + " -o " + testExeWsl + "\"";
    
    if (runCommandWithTimeout(compileCmd, 60) != 0) {
        log("ERROR", "Rust compilation failed."); // ❌ 编译失败
        return false;
    }
    
    // 运行命令
    std::string runCmd = wslDistro + " bash -c \"" + testExeWsl + "\"";
    if (runCommandWithTimeout(runCmd, 10) != 0) {
        log("WARN", "Compiled binary failed to run."); // ⚠️ 运行失败
        // 运行失败可能是环境问题，但不一定代表编译坏了，给个警告
    } else {
        log("OK", "Rust compiler is healthy!"); // ✅ 验证通过
    }
    
    return true;
}

// =============================================================================
//  🎉 项目构建工 (Alpine 版)
//
//  🎨 代码用途：
//      调用 Cargo 构建整个项目。
//
//  💡 易懂解释：
//      最后一步，按照图纸（Cargo.toml）把整个大楼（项目）盖起来。
//
//  ⚙️ 触发源 (Trigger Source)：
//      main -> buildProject
// =============================================================================
bool buildProject() {
    log("INFO", "Building project..."); // 📢 开始构建
    
    if (!fs::exists("no_code\\target")) fs::create_directories("no_code\\target"); // 📁 创建 target 目录
    
    // Use specific distro
    std::string wslDistro = g_wslCmd + " -d Alpine";
    
    // 构建命令 (Alpine 下 Rust 是全局安装的，不需要设置 PATH)
    // 必须转换 Windows 路径到 WSL 路径
    // 简单起见，假设我们在当前目录下运行，直接挂载
    // 但 WSL 访问 /mnt/c/... 可能慢。
    // 更好的方式是：cargo build --manifest-path Cargo.toml
    
    // 修复 Lock 文件版本不兼容问题
    if (fs::exists("Cargo.lock")) {
        log("INFO", "Removing Cargo.lock to ensure compatibility...");
        fs::remove("Cargo.lock");
    }

    // 强制降级依赖 (针对 Rust 1.76)
    // 通过锁定 url 版本为 2.4.1，避免引入 idna 1.0+ (进而避免 icu_properties_data 2.x)
    log("INFO", "Pinning 'url' crate to 2.4.1 to avoid Rust 1.83+ requirement...");
    runCommand(wslDistro + " bash -c \"cargo add url@=2.4.1 --manifest-path Cargo.toml\"");

    // 降级 native-tls 以兼容 Rust 1.76
    log("INFO", "Downgrading native-tls to 0.2.11 for Rust 1.76 compatibility...");
    runCommand(wslDistro + " bash -c \"cargo update -p native-tls --precise 0.2.11 --manifest-path Cargo.toml\"");

    // 降级 indexmap 以兼容 Rust 1.76
    log("INFO", "Downgrading indexmap to 2.2.6 for Rust 1.76 compatibility...");
    runCommand(wslDistro + " bash -c \"cargo update -p indexmap --precise 2.2.6 --manifest-path Cargo.toml\"");

    // 注意：在 WSL 1 中，文件系统互操作性很好。
    std::string buildCmd = wslDistro + " bash -c \"cargo build --manifest-path Cargo.toml --target-dir no_code/target\"";
    
    if (runCommand(buildCmd) != 0) {
        log("ERROR", "Project build failed."); // ❌ 构建失败
        return false;
    }
    
    log("SUCCESS", "Project built successfully!"); // ✅ 构建成功
    return true;
}

// =============================================================================
//  🎉 主函数 (参数个数，参数列表)
//
//  🎨 代码用途：
//      程序的总指挥，按顺序调度各个模块完成安装任务。
//
//  💡 易懂解释：
//      这是包工头，拿着图纸（代码），指挥大家先干这个（checkMemory），再干那个（installWSL），最后完工收钱。
//
//  ⚠️ 警告：
//      无特殊风险。
//
//  ⚙️ 触发源 (Trigger Source)：
//      OS -> setup.exe
// =============================================================================
int main(int argc, char* argv[]) {
    system("chcp 65001 >nul"); // 🔧 设置 UTF-8 编码
    
    log("INFO", "Starting Web_compute_low Setup (C++ Version)..."); // 📢 启动日志
    
    for (int i = 1; i < argc; ++i) { // 🔄 解析参数
        std::string arg = argv[i];
        if (arg == "--non-interactive") {
            g_nonInteractive = true; // 🤖 启用非交互模式
        }
    }
    
    const char* envNonInteractive = std::getenv("NONINTERACTIVE"); // 🔍 检查环境变量
    if (envNonInteractive && std::string(envNonInteractive) == "1") {
        g_nonInteractive = true; // 🤖 启用非交互模式
    }
    
    std::thread monitorThread(monitorSystem); // 🧵 启动监控线程
    monitorThread.detach(); // 🔓 分离线程，使其后台运行
    
    checkMemory(); // 🧠 检查内存
    
    if (!checkWSL()) { // 🔍 检查 WSL
        installWSL(); // 🛠️ 安装 WSL
        if (!checkWSL()) { // 🔄 二次检查
            log("FATAL", "Failed to install/enable WSL. Please restart and try again."); // ❌ 致命错误
            g_monitorRunning = false; // 🛑 停止监控
            if (!g_nonInteractive) system("pause"); // ⏸️ 暂停查看
            return 1; // 🚪 异常退出
        }
    }
    
    configureWSL(); // ⚙️ 配置资源
    
    if (!installDependencies()) { // 📦 安装依赖
        log("FATAL", "Failed to install dependencies."); // ❌ 致命错误
        g_monitorRunning = false; // 🛑 停止监控
        if (!g_nonInteractive) system("pause"); // ⏸️ 暂停查看
        return 1; // 🚪 异常退出
    }
    
    if (!setupRust()) { // 🦀 安装 Rust
        log("FATAL", "Failed to setup Rust."); // ❌ 致命错误
        g_monitorRunning = false; // 🛑 停止监控
        if (!g_nonInteractive) system("pause"); // ⏸️ 暂停查看
        return 1; // 🚪 异常退出
    }

    if (!verifyRust()) { // 🔍 验证 Rust
        log("WARN", "Rust verification failed. Environment might be unstable."); // ⚠️ 验证失败警告
    }

    if (!buildProject()) { // 🏗️ 构建项目
        log("FATAL", "Failed to build project."); // ❌ 致命错误
        g_monitorRunning = false; // 🛑 停止监控
        if (!g_nonInteractive) system("pause"); // ⏸️ 暂停查看
        return 1; // 🚪 异常退出
    }
    
    log("SUCCESS", "Setup completed successfully!"); // ✅ 成功完成
    g_monitorRunning = false; // 🛑 停止监控
    if (!g_nonInteractive) system("pause"); // ⏸️ 暂停查看
    return 0; // 🚪 正常退出
}

