# Requirements Document

## Introduction

本规范定义了 Web_compute_low 前端系统的端到端测试需求。测试将通过 `start.bat` 启动整个系统，然后使用 Playwright 自动化测试框架对 Web_compute_low 的各种功能进行全面测试。测试覆盖桌面系统、窗口管理、应用交互、任务栏、右键菜单、性能等多个方面。

## Glossary

- **Web_compute_low**: 前端 Web 桌面系统，提供类操作系统的用户界面
- **start.bat**: 系统启动脚本，启动所有后端服务和前端服务
- **Playwright**: 自动化测试框架，支持可视化浏览器测试
- **Desktop**: 桌面容器，承载图标和窗口
- **Taskbar**: 任务栏，显示开始按钮、运行中的应用和系统状态
- **Window Manager (WM)**: 窗口管理器，负责窗口的创建、拖拽、层级管理
- **Context Menu**: 右键菜单，提供快捷操作选项
- **Three.js**: 3D 渲染引擎，用于桌面背景效果

## Requirements

### Requirement 1: 系统启动测试

**User Story:** As a tester, I want to verify the system starts correctly via start.bat, so that I can ensure the entire system is operational.

#### Acceptance Criteria

1. WHEN the tester executes start.bat THEN the system SHALL start all required services within 60 seconds
2. WHEN all services are started THEN the Web_compute_low frontend SHALL be accessible at http://localhost:3000
3. WHEN the frontend loads THEN the system SHALL display the desktop interface with taskbar visible

### Requirement 2: 页面加载测试

**User Story:** As a user, I want the page to load completely, so that I can use all features of the desktop system.

#### Acceptance Criteria

1. WHEN a user navigates to the frontend URL THEN the system SHALL display a page with title containing "Angel"
2. WHEN the page loads THEN the system SHALL render the #desktop element as visible
3. WHEN the page loads THEN the system SHALL load Three.js library successfully with THREE object available
4. WHEN the page loads THEN the system SHALL complete loading within 10 seconds

### Requirement 3: 桌面元素测试

**User Story:** As a user, I want to see desktop icons and interact with them, so that I can launch applications.

#### Acceptance Criteria

1. WHEN the desktop renders THEN the system SHALL display application icons with proper positioning
2. WHEN a user double-clicks a desktop icon THEN the system SHALL open the corresponding application window
3. WHEN a user single-clicks a desktop icon THEN the system SHALL select the icon visually
4. WHEN a user drags a desktop icon THEN the system SHALL update the icon position and persist it

### Requirement 4: 任务栏功能测试

**User Story:** As a user, I want to use the taskbar to manage applications, so that I can quickly access running apps.

#### Acceptance Criteria

1. WHEN the page loads THEN the system SHALL display the taskbar (#taskbar) at the bottom of the screen
2. WHEN the page loads THEN the system SHALL display the start button (#btn-start) in the taskbar
3. WHEN a user clicks the start button THEN the system SHALL trigger the login or key manager interface
4. WHEN an application is opened THEN the system SHALL add its icon to the taskbar-apps area
5. WHEN a user clicks a taskbar app icon THEN the system SHALL toggle the application window visibility

### Requirement 5: 时钟显示测试

**User Story:** As a user, I want to see the current time in the taskbar, so that I can track time while working.

#### Acceptance Criteria

1. WHEN the page loads THEN the system SHALL display the clock element (#clock-time) in the taskbar
2. WHEN the clock displays THEN the system SHALL show time in HH:MM format with colon separator
3. WHEN one minute passes THEN the system SHALL update the clock display automatically

### Requirement 6: 窗口管理测试

**User Story:** As a user, I want to manage application windows, so that I can organize my workspace efficiently.

#### Acceptance Criteria

1. WHEN a user opens an application THEN the system SHALL create a window with title bar and content area
2. WHEN a user clicks the close button THEN the system SHALL close the window and update taskbar
3. WHEN a user clicks the minimize button THEN the system SHALL hide the window and keep taskbar icon
4. WHEN a user drags a window title bar THEN the system SHALL move the window to the new position
5. WHEN a user clicks on a window THEN the system SHALL bring it to the front (highest z-index)

### Requirement 7: 右键菜单测试

**User Story:** As a user, I want to access context menus, so that I can perform quick actions on desktop and icons.

#### Acceptance Criteria

1. WHEN a user right-clicks on the desktop THEN the system SHALL display the context menu at cursor position
2. WHEN a user right-clicks on a desktop icon THEN the system SHALL display icon-specific menu options
3. WHEN a user clicks outside the context menu THEN the system SHALL hide the context menu
4. WHEN a user selects a menu item THEN the system SHALL execute the corresponding action

### Requirement 8: 壁纸功能测试

**User Story:** As a user, I want to customize my desktop wallpaper, so that I can personalize my workspace.

#### Acceptance Criteria

1. WHEN the page loads THEN the system SHALL display the saved wallpaper or default wallpaper
2. WHEN a user changes the wallpaper THEN the system SHALL update the desktop background immediately
3. WHEN a user refreshes the page THEN the system SHALL restore the previously selected wallpaper

### Requirement 9: 应用窗口交互测试

**User Story:** As a user, I want to interact with application windows, so that I can use the application features.

#### Acceptance Criteria

1. WHEN a resizable window is opened THEN the system SHALL allow the user to resize it by dragging edges
2. WHEN a window contains input fields THEN the system SHALL allow text input without triggering drag
3. WHEN a window contains buttons THEN the system SHALL respond to button clicks appropriately

### Requirement 10: 浏览器应用测试

**User Story:** As a user, I want to use the browser application, so that I can view remote content.

#### Acceptance Criteria

1. WHEN the browser app opens THEN the system SHALL display address bar with URL input field
2. WHEN the browser app opens THEN the system SHALL display navigation buttons (back, forward, refresh)
3. WHEN a user enters a URL and clicks Go THEN the system SHALL attempt to navigate to that URL
4. WHEN the browser receives video stream THEN the system SHALL display it in the content area

### Requirement 11: 性能监控测试

**User Story:** As a user, I want to monitor system performance, so that I can ensure smooth operation.

#### Acceptance Criteria

1. WHEN the page loads THEN the system SHALL complete DOM content loaded within 3 seconds
2. WHEN the page loads THEN the system SHALL become interactive within 5 seconds
3. WHEN multiple windows are open THEN the system SHALL maintain responsive UI interactions

### Requirement 12: 多窗口管理测试

**User Story:** As a user, I want to work with multiple windows simultaneously, so that I can multitask effectively.

#### Acceptance Criteria

1. WHEN multiple applications are opened THEN the system SHALL display all windows without overlap issues
2. WHEN a user clicks between windows THEN the system SHALL correctly update the active window focus
3. WHEN windows are minimized and restored THEN the system SHALL maintain their original positions

### Requirement 13: 拖拽保护层测试

**User Story:** As a user, I want smooth dragging experience, so that iframe content does not interfere with drag operations.

#### Acceptance Criteria

1. WHEN a user starts dragging a window THEN the system SHALL activate the drag-overlay layer
2. WHEN a user stops dragging THEN the system SHALL deactivate the drag-overlay layer
3. WHILE dragging over iframe content THEN the system SHALL prevent mouse events from being captured by iframe

### Requirement 14: 状态持久化测试

**User Story:** As a user, I want my workspace state to be saved, so that I can resume work after page refresh.

#### Acceptance Criteria

1. WHEN a user moves a window THEN the system SHALL save the new position to local storage
2. WHEN a user opens/closes applications THEN the system SHALL save the application state
3. WHEN the page reloads THEN the system SHALL restore windows to their saved positions and states

### Requirement 15: 键盘交互测试

**User Story:** As a user, I want to use keyboard shortcuts, so that I can work more efficiently.

#### Acceptance Criteria

1. WHEN a user presses Enter in rename input THEN the system SHALL submit the new name
2. WHEN a user presses Escape THEN the system SHALL cancel the current operation
3. WHEN an input field is focused THEN the system SHALL not trigger window drag on key press

### Requirement 16: 响应式布局测试

**User Story:** As a user, I want the interface to adapt to different screen sizes, so that I can use it on various devices.

#### Acceptance Criteria

1. WHEN the viewport is 1920x1080 THEN the system SHALL display all elements correctly
2. WHEN the viewport is 1366x768 THEN the system SHALL adjust layout without breaking functionality
3. WHEN the window is resized THEN the system SHALL recalculate desktop icon grid positions

### Requirement 17: 错误处理测试

**User Story:** As a user, I want graceful error handling, so that the system remains usable when issues occur.

#### Acceptance Criteria

1. WHEN the backend is unavailable THEN the system SHALL display offline mode with local apps
2. WHEN an application fails to load THEN the system SHALL show an error message without crashing
3. WHEN network reconnects THEN the system SHALL attempt to restore full functionality

### Requirement 18: 胶囊组件测试

**User Story:** As a user, I want to see system status capsules, so that I can monitor traffic, billing, and FPS.

#### Acceptance Criteria

1. WHEN the page loads THEN the system SHALL display status capsules in the taskbar
2. WHEN a user clicks a capsule THEN the system SHALL open the corresponding detail window
3. WHEN a user clicks outside the capsule window THEN the system SHALL close the detail window

### Requirement 19: 登录界面测试

**User Story:** As a user, I want to log in to the system, so that I can access personalized features.

#### Acceptance Criteria

1. WHEN a user clicks start button without login THEN the system SHALL display the login interface
2. WHEN a user enters credentials THEN the system SHALL validate and process the login
3. WHEN login succeeds THEN the system SHALL store user session and update UI accordingly

### Requirement 20: 系统稳定性测试

**User Story:** As a tester, I want to verify system stability, so that I can ensure reliable operation.

#### Acceptance Criteria

1. WHEN the system runs for 5 minutes THEN the system SHALL maintain stable memory usage
2. WHEN rapid window operations are performed THEN the system SHALL handle them without freezing
3. WHEN all tests complete THEN the system SHALL allow clean shutdown via stop scripts
