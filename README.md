# 项目概览

本项目是一个桌面端语音转写工具，采用 Electron + Vue 3 构建前端界面，Rust Sidecar 在 Windows 上通过 WASAPI 回环采集系统声音，并将 16kHz 的 PCM 流通过 WebSocket 发送到后端 Python 服务，后端使用 Whisper 模型进行转写并广播结果。

## 技术栈
- 前端：`Vue 3`、`Pinia`、`Vite`、`Electron`
- 主进程：`electron/main.cjs`，通过 `BrowserWindow` 管理主窗口与悬浮球窗口，`ipcMain` + 预加载桥接暴露 `window.api.*`
- 悬浮球：透明、置顶、无框子窗口，支持拖拽、展开/收起、打开主窗口，代码位于 `src/views/BubbleWindow.vue` 和 `src/components/FloatingBubble.vue`
- 音频采集（Windows）：`sidecar-wasapi`（Rust），使用 `wasapi` + `tokio` + `tokio-tungstenite`，采集系统回声音频，重采样到 `16kHz mono int16`
- 后端：`python-backend/server.py`，基于 `websockets` 启动 `ws://localhost:8765`，通过 `openai-whisper` + `torch` 完成转写
- 打包：`electron-builder`，将 `dist/` 前端资源与 `sidecar-wasapi.exe` 一并打包（通过 `extraResources`）

## 目录结构
- `src/` 前端界面与业务逻辑
- `electron/` Electron 主进程与预加载脚本
- `sidecar-wasapi/` Rust sidecar（WASAPI 回环采集）
- `python-backend/` Python 后端（WebSocket + Whisper）
- `dist/` 前端构建产物（由 `vite build` 生成）

## 安装依赖
- 前端与主进程
  - 在项目根目录运行：
    - `npm install`
- Rust Sidecar（Windows）
  - 安装 Rust 工具链（推荐 `rustup`）
  - 进入 `sidecar-wasapi/`：
    - `cargo build --release`
- Python 后端
  - 建议使用虚拟环境（Windows）：
    - `python -m venv python-backend/.venv`
    - `python-backend\.venv\Scripts\activate`
  - 安装依赖：
    - `pip install -r python-backend/requirements.txt`
  - 注：如 `torch` 安装报错，请参考 PyTorch 官方网站选择与你 Python/操作系统匹配的轮子。

## 启动步骤
1. 启动后端（建议先启动）
   - 进入 `python-backend/` 目录（或在根目录指定路径）：
   - `python python-backend/server.py`
   - 监听地址：`ws://localhost:8765`

2. 构建 Sidecar（用于系统声音采集）
   - 进入 `sidecar-wasapi/`：`cargo build --release`
   - Electron 在开发模式会从 `sidecar-wasapi/target/{debug,release}/sidecar-wasapi.exe` 自动解析可执行文件；打包后为 `wasapi-capture.exe`

3. 启动前端（两种方式）
   - 开发联调（Vite + Electron）：
     - `npm run electron:dev`
     - 说明：该脚本会启动 Vite 在 `http://localhost:1422` 并以该地址加载 Electron。如果端口占用，请关闭占用或改用下述方式。
   - 构建后运行 Electron：
     - `npm run build`
     - `npx electron .`
     - 说明：若不存在 `VITE_DEV_SERVER_URL`，主进程将加载 `dist/index.html`。

4. 采集系统音频
   - 在应用界面点击“扬声器”开关会调用主进程 `start-system-capture`，自动启动 Sidecar 并向后端发送音频。
   - 如开发中需要手动测试，可直接运行 `sidecar-wasapi\target\release\sidecar-wasapi.exe`（确保后端已在 `8765` 监听）。

## 常用命令
- 前端构建：`npm run build`
- 开发联调：`npm run electron:dev`
- 直接运行 Electron（加载构建产物）：`npx electron .`
- 打包应用：`npm run electron:build`
- Rust 构建：`cargo build --release`（在 `sidecar-wasapi/`）
- Python 后端：`python python-backend/server.py`

## 注意事项
- 仅 Windows 支持 WASAPI 回环采集；非 Windows 平台 `sidecar-wasapi` 会空运行。
- 首次运行 Whisper 可能需要下载模型，时间较长；建议确保网络与 `torch` 安装正确。
- 若 `npm run electron:dev` 报端口占用（`1422`），可用构建 + 直接运行 Electron 的方式；或修改脚本端口。

