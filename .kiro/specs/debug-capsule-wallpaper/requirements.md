# Requirements Document

## Introduction

调试两个持续存在的 BUG：
1. 胶囊体点击后详情窗口不显示
2. 个性化设置中壁纸选择器不显示壁纸

## Glossary

- **胶囊体 (Capsule)**: 任务栏右侧的状态指示器，如流量监控、计费等
- **详情窗口 (Detail Window)**: 点击胶囊体后弹出的小窗口
- **壁纸选择器 (Wallpaper Grid)**: 个性化设置中显示可选壁纸的网格

## Requirements

### Requirement 1: 胶囊体详情窗口

**User Story:** 作为用户，我希望点击任务栏的胶囊体后能弹出详情窗口，以便查看详细信息。

#### Acceptance Criteria

1. WHEN 用户点击胶囊体 THEN 系统 SHALL 在胶囊体上方显示对应的详情窗口
2. WHEN 详情窗口显示 THEN 系统 SHALL 正确渲染窗口内容（content）
3. WHEN 用户再次点击胶囊体 THEN 系统 SHALL 关闭详情窗口

### Requirement 2: 壁纸选择器

**User Story:** 作为用户，我希望在个性化设置中看到可选的壁纸缩略图，以便选择喜欢的壁纸。

#### Acceptance Criteria

1. WHEN 用户打开个性化设置窗口 THEN 系统 SHALL 在 #wp-grid 中显示 5 张壁纸缩略图
2. WHEN 壁纸缩略图显示 THEN 系统 SHALL 正确加载 assets 目录下的 avif 图片
3. WHEN 用户点击壁纸缩略图 THEN 系统 SHALL 更换桌面壁纸
