# 🔑 Google Gemini API 配置全流程 (保姆级教程)

如果之前的步骤让你感到困惑，请**只看这一篇**。跟着做，一定能行。

---

## 第一阶段：强制创建项目 (Project)

我们先去 Google Cloud 手动建一个“房间”，这样 Google 就不会报错了。

1.  **点击这个链接** (跳过欢迎页，直接填表)：
    *   👉 [https://console.cloud.google.com/projectcreate](https://console.cloud.google.com/projectcreate)

2.  **填写表单**：
    *   **Project name**: 输入 `Angel-Help` (或者 `My-AI-Project`，名字随便起，英文即可)。
    *   **Location**: 如果有下拉菜单，选 `No organization`。如果没有，就保持默认不动。
    *   **点击创建**: 点击页面底部的蓝色 **CREATE** 按钮。

3.  **等待成功**：
    *   点击后，页面可能不会马上跳转。请盯着右上角的 **铃铛图标 🔔**。
    *   等待约 10-30 秒，铃铛处会弹出绿色对勾 ✅，提示 `Project ... has been created`。
    *   **看到这个对勾，第一阶段就完成了！**

---

## 第二阶段：领取钥匙 (API Key)

现在“房间”建好了，我们去拿钥匙。

1.  **点击这个链接**：
    *   👉 [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)

2.  **点击创建按钮**：
    *   点击页面上的 **"Create API key"** (通常是蓝色或黑色的按钮)。

3.  **选择刚才的项目 (关键！)**：
    *   弹窗会出现两个选项，**一定要选第二个**：
    *   👉 **"Create API key in existing project"** (在现有项目中创建)
    *   点击后，会有一个下拉菜单。
    *   在菜单里找到你刚才建的 `Angel001` (或者你起的名字)。选它！

4.  **确认创建**：
    *   点击 **"Create API key"** 按钮。
    *   等待几秒钟，屏幕上会显示一串长长的字符，以 `AIza` 开头。
    *   点击旁边的 **复制图标 📋** (Copy)。

---

## 第三阶段：填入系统 (最后一步)

拿到钥匙后，要告诉小天使。

1.  **找到配置文件**：
    *   回到你的电脑文件夹：`C:\000AI\Angel_Server\`
    *   找到文件 `.env` (如果没有，就把 `.env.example` 重命名为 `.env`)。

2.  **修改文件**：
    *   右键点击 `.env` -> 打开方式 -> **记事本**。
    *   你会看到一行字：`GEMINI_API_KEY=...`
    *   把它删掉，改成你刚才复制的钥匙。
    *   **格式必须是这样** (注意没有空格)：
        ```text
        GEMINI_API_KEY=AIzaSyDxxxxxxxxxxxxxxxxxxxxxxxxxxxx
        ```

3.  **保存并启动**：
    *   按 `Ctrl + S` 保存文件。
    *   关闭记事本。
    *   双击 `start_server.bat` 启动服务器。
    *   观察黑底白字的窗口，如果显示 **"✨ Angel 系统已模块化启动！"**，恭喜你，成功了！

---
**常见问题**
*   **Q: 还是提示 Unable to create?**
    *   A: 确保你在第二阶段选的是 **"Existing project"** (现有项目)，而不是 New project。
*   **Q: 启动后报错 "API Key missing"?**
    *   A: 检查 `.env` 文件名是不是对的 (前面有个点)，检查里面是不是保存了。
