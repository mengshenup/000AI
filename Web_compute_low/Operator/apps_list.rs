// =================================
//  🎉 应用列表同步工具 (Apps List Sync)
//
//  🎨 代码用途：
//     扫描本地 js/apps 目录，构建应用清单，并将其推送到服务端。
//     使用 Rust 高性能库 (Reqwest/Tokio) 实现。
//
//  💡 易懂解释：
//     这是快递员小哥！他拿着一张清单（apps_list），
//     把家里（Web_compute_low）做好的玩具（JS应用），
//     一个个登记好，然后送到学校（Web_compute_high）去展示。
//
//  ⚠️ 警告：
//     虽然引入了 Axum 库，但当前主要使用 Reqwest 进行客户端推送。
//     如果未来需要让客户端变成服务器被动接收请求，可以直接复用 Axum 依赖。
// =================================

use std::fs;
use std::path::Path;
use walkdir::WalkDir;
use serde::{Serialize, Deserialize};
use reqwest::blocking::Client; // 使用阻塞式客户端以简化脚本逻辑
use anyhow::{Result, Context};

// 💖 服务器地址配置
const SERVER_URL: &str = "http://localhost:9000";
const BATCH_SIZE: usize = 50;

#[derive(Debug, Serialize, Deserialize, Clone)]
struct AppData {
    name: String,
    path: String,
    size: u64,
    content: String,
}

#[derive(Debug, Serialize)]
struct BatchRequest {
    apps: Vec<AppData>,
}

fn main() -> Result<()> {
    // 启用控制台颜色支持 (Windows)
    #[cfg(windows)]
    let _ = console::enable_ansi_support();

    println!("========================================================");
    println!(" 🎉 Angel Apps List Sync (Rust Edition)");
    println!("========================================================");

    // 1. 确定扫描路径
    // 假设我们在 Web_compute_low 根目录运行 (通过 cargo run)
    // 或者在 Operator 目录运行
    let current_dir = std::env::current_dir()?;
    
    // 尝试定位 js/apps 目录
    let apps_dir = if current_dir.join("js").join("apps").exists() {
        current_dir.join("js").join("apps")
    } else if current_dir.parent().map(|p| p.join("js").join("apps").exists()).unwrap_or(false) {
        current_dir.parent().unwrap().join("js").join("apps")
    } else {
        // 默认回退到相对路径
        Path::new("js/apps").to_path_buf()
    };

    println!("📂 目标扫描目录: {:?}", apps_dir);

    if !apps_dir.exists() {
        println!("❌ 错误: 找不到 js/apps 目录！请确保在 Web_compute_low 目录下运行。");
        return Ok(());
    }

    // 2. 扫描文件
    let mut apps_buffer: Vec<AppData> = Vec::new();
    let client = Client::new();
    let mut total_synced = 0;

    println!("🚀 开始扫描并同步...");

    for entry in WalkDir::new(&apps_dir).into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        if path.is_file() && path.extension().map_or(false, |ext| ext == "js") {
            // 读取文件内容
            let content = fs::read_to_string(path).unwrap_or_default();
            let name = path.file_stem().unwrap().to_string_lossy().to_string();
            
            // 计算相对路径
            let relative_path = path.strip_prefix(&apps_dir.parent().unwrap_or(&apps_dir))
                .unwrap_or(path)
                .to_string_lossy()
                .replace("\\", "/");

            let size = content.len() as u64;

            let app = AppData {
                name,
                path: relative_path,
                size,
                content,
            };

            apps_buffer.push(app);

            // 3. 批量发送
            if apps_buffer.len() >= BATCH_SIZE {
                send_batch(&client, &apps_buffer)?;
                total_synced += apps_buffer.len();
                apps_buffer.clear();
                println!("   📦 已推送 {} 个应用...", total_synced);
            }
        }
    }

    // 4. 发送剩余的
    if !apps_buffer.is_empty() {
        send_batch(&client, &apps_buffer)?;
        total_synced += apps_buffer.len();
    }

    // 5. 提交更改
    println!("💾 正在提交更改到服务器...");
    let commit_url = format!("{}/admin/sync_commit", SERVER_URL);
    let res = client.post(&commit_url).send();

    match res {
        Ok(response) => {
            if response.status().is_success() {
                println!("✅ 同步成功！共处理了 {} 个应用。", total_synced);
            } else {
                println!("❌ 提交失败: Status {}", response.status());
                println!("   Response: {}", response.text().unwrap_or_default());
            }
        },
        Err(e) => {
            println!("❌ 连接服务器失败: {}", e);
            println!("   请确保 Web_compute_high (Port 9000) 已启动。");
        }
    }

    Ok(())
}

fn send_batch(client: &Client, apps: &[AppData]) -> Result<()> {
    let url = format!("{}/admin/sync_batch", SERVER_URL);
    let body = BatchRequest { apps: apps.to_vec() };
    
    let res = client.post(&url)
        .json(&body)
        .send()
        .context("❌ 发送批次数据失败")?;

    if !res.status().is_success() {
        println!("⚠️ 批次上传警告: {}", res.status());
    }
    Ok(())
}

// 💖 这里的 console 模块是为了让 Windows 终端支持颜色
#[cfg(windows)]
mod console {
    pub fn enable_ansi_support() -> Result<(), u32> {
        // 简单的封装，实际生产环境可以使用 `console` crate
        Ok(())
    }
}
