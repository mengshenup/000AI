import os
from dotenv import load_dotenv

# 模拟 fastapi_app.py 中的加载逻辑
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "Memorybank", ".env")
print(f"正在尝试加载 .env 文件: {env_path}")

if os.path.exists(env_path):
    print("✅ .env 文件存在")
    with open(env_path, 'r', encoding='utf-8') as f:
        content = f.read()
        print(f"📄 文件内容预览 (前50字符): {content[:50]!r}")
        if '\n' in content:
            print("ℹ️ 文件包含换行符 (正常)")
        else:
            print("ℹ️ 文件不包含换行符")
            
    load_dotenv(env_path)
    key = os.getenv("GEMINI_API_KEY")
    if key:
        print(f"✅ GEMINI_API_KEY 已加载: {key[:5]}...{key[-5:]} (长度: {len(key)})")
        if '\n' in key:
            print("⚠️ 警告: Key 中包含换行符！")
        if '\r' in key:
            print("⚠️ 警告: Key 中包含回车符！")
        if key.strip() != key:
            print("⚠️ 警告: Key 前后有空白字符！")
    else:
        print("❌ GEMINI_API_KEY 未找到")
else:
    print("❌ .env 文件不存在")
