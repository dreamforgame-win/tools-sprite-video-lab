# 灵帧工坊（Sprite Forge Lab）

> **下载入口**：优先下载 [SpriteForgeLab-light.zip 轻量包](https://gitlab-gz.dianchu.cc/api/v4/projects/skill-hub%2Fart-skill%2Fsprite-forge-lab/packages/generic/sprite-forge-lab/v0.2.4/SpriteForgeLab-light.zip)，解压后只需要双击 `Start.exe`。也可以进入 [最新 Release v0.2.4](https://gitlab-gz.dianchu.cc/skill-hub/art-skill/sprite-forge-lab/-/releases/v0.2.4) 查看发布说明。不要下载 GitLab 自动生成的 `Source code zip`，那只是源码包。

灵帧工坊是一个面向 2D 游戏、美术素材和动效资源整理的本地 Web 工具台。它可以把视频、GIF、图片或序列帧处理成透明 Sprite 资源，并提供图片拆图、双背景抠图、资源管理、AI 主体抠图、绿幕/蓝幕精修、MAGIC 线稿清理和 Real-ESRGAN 二次处理等能力。

项目采用“本地后端 + 浏览器前端”的模式：Python 在同事电脑上启动本地 HTTP 服务，前端是原生 HTML/CSS/JavaScript，运行数据默认写入本机 `work/` 目录。仓库不提交模型、虚拟环境、外部二进制工具或导出素材。

## 工具类型

- 本地素材处理工作台，不是在线 SaaS，也不是纯命令行工具。
- 适合处理游戏 Sprite、UI 动效、特效序列帧、透明 WebM、拆图资源和美术临时素材。
- 基础能力依赖 Python、Pillow、ffmpeg/ffprobe。
- AI 能力按需启用，依赖 PyTorch、transformers、Hugging Face 模型缓存、CorridorKey、Real-ESRGAN 等本地组件。
- 不建议只把前端部署到 Vercel：浏览器页面不能直接访问同事本机文件、ffmpeg、Python 模型和 GPU 运行时。更推荐 GitLab 分发源码或轻量 zip，每位同事在本机启动和下载依赖。

## Vercel 静态界面展示

仓库提供 `vercel.json` 和 `.vercelignore`，用于展示前端界面。构建时注入「森屿探险」展示项目，包含 8 项示例素材、2 个风格方向、风格模板、12 帧待机动画、双背景抠图结果和示例视频。可通过页面底部的「预览界面」访问项目总览、风格探索、图片生成、生成历史、图片处理、双背景抠图、视频处理、序列帧提取、资产管理、项目对接、回收站、项目设置和模型管理。

展示版复用真实界面，可切换列表/画布、查看大图、筛选资源和预览处理参数；生成、上传、模型下载及文件写入不执行。尚未实现的视频/音频生成仍显示「待接入」。示例数据与画布改动仅在内存中保留，刷新或「重置展示」恢复初始状态，不写入真实项目。示例视频由浏览器在内存中构建；不支持 MediaRecorder 的浏览器仍可查看序列帧。

`app/index.html` 不引用展示脚本，因此本地 Python 完整版仍使用真实后端。只有 `node scripts/build-static.cjs` 生成的 `dist/` 启用演示；可用任意静态服务器预览该目录。相关检查：`node --test tests/demo-showcase.test.cjs`。

- Vercel 项目的 Root Directory 使用仓库根目录，不要设为 `app`。
- Framework Preset 使用 `Other`；仓库配置禁用安装，执行 `node scripts/build-static.cjs`，Output Directory 为 `dist`。
- `.vercelignore` 仅允许上传 `app/`、静态构建脚本和部署配置，避免将 `server.py` 识别为 Python 服务入口。
- 构建脚本将前端复制到 `dist/app/`，并将首页复制到 `dist/index.html`；域名首页和 `/app/index.html` 均可访问，资源保留 `/app/…` 原有路径。`/api/…` 不转发到页面，也没有后端服务。
- 将配置提交并推送到 Vercel 关联的 Git 分支后触发新部署；也可从仓库根目录执行 `vercel` 创建预览部署。

本地完整版本仍按下文通过 `Start.exe` 或启动脚本运行。

## 主要模块

- `项目总览`：首次运行从项目列表进入；提供文件化 `Default` 项目、创建项目和打开已有项目。
- `项目资产 / 风格探索`：以列表或画布管理风格方向、参考图、候选和项目确认风格。
- `项目资产 / 资产生产`：按资产结构树生成图片；视频和音频生成保留待接入入口，全部结果进入项目历史。
- `资源库 / 资产管理`：筛选、确认、标记和下载内部资产；`项目对接` 负责预检并部署到正式工程。
- `视频转序列帧`：导入视频/GIF/图片序列，截取区间，抽帧，抠图，导出透明帧和 WebM。
- `视频处理`：视频压缩、基础剪辑、字幕、片段拼接、预览和导出。
- `图片处理 / 全流程`：导入单张或多张图片，抠图、拆图、命名、压缩和导出。
- `图片处理 / 双背景抠图`：选择同一素材的黑底图和白底图，计算透明结果，支持直接导出、导出到资源管理或跳转到拆图。
- `资源管理`：创建项目，绑定本地文件夹，扫描和管理项目资源。
- `模型管理`：列出模型、Python AI 依赖、ffmpeg/ffprobe、Real-ESRGAN、CorridorKey 等运行依赖状态，支持可下载项的下载、进度显示和卸载。
- `MAGIC / Real-ESRGAN`：对处理后帧进行 anime x4 超分，再输出 1/2、1/4、1/8 等尺寸版本。

## 项目结构

```text
app/                                  前端页面、样式和浏览器交互逻辑
app/index.html                        主工作台入口
app/app.js                            主前端逻辑
app/styles.css                        主界面样式
app/favicon.png                       产品图标
app/line-cleaner-experiment.*         实验性线稿清理页面
docs/                                 项目生成规则和维护说明
docs/PROJECT_FORMAT.zh-CN.md           文件化项目格式
docs/API.zh-CN.md                      REST API 契约
docs/AUTOMATION_WORKFLOW.zh-CN.md      Agent/CLI 自动化工作流
docs/PROJECT_INTEGRATION.zh-CN.md      正式项目装配规则
project_service.py                     项目领域服务
sprite_lab_cli.py                      项目自动化 CLI
server.py                             本地 HTTP 服务、文件 API 和处理流水线
requirements.txt                      基础运行依赖
requirements-ai.txt                   可选 AI 运行依赖
Start.exe                             同事使用的唯一启动入口
_internal/                            内部程序文件、脚本、运行缓存和模型缓存，小白用户不用打开
setup_and_start.bat                   开发环境的一键安装并启动入口
setup_ai_runtime.bat                  Windows AI 环境和外部模型准备脚本
start_sprite_video_lab.bat            Windows 快速启动脚本
start_sprite_video_lab_portable.bat   带 runtime 的完整便携包启动脚本
build_portable_bundle.ps1             轻量/完整便携包打包脚本
AGENT_INSTALL.md                      给自动化 agent 使用的安装说明
AI_MATTING.md                         AI 抠图模式说明
USAGE.zh-CN.md                        中文使用说明
USAGE.md                              英文使用说明
work/                                 运行时上传、缓存、导出目录，不提交 Git
```

## 给同事使用

推荐两种分发方式：

- `GitLab clone`：适合会用 Git 的同事，便于更新。
- `轻量 zip`：适合直接发包，包内不含模型和运行缓存，首次启动时在本机准备依赖。

GitLab 地址：

```bat
git clone https://gitlab-gz.dianchu.cc/skill-hub/art-skill/sprite-forge-lab.git
cd sprite-forge-lab
```

如果公司网络需要本地代理，可以临时对这次 Git 命令指定代理，不要写入仓库：

```bat
git -c http.proxy=http://127.0.0.1:7897 clone https://gitlab-gz.dianchu.cc/skill-hub/art-skill/sprite-forge-lab.git
```

首次使用和日常启动都只需要：

```bat
Start.exe
```

源码开发环境也可以直接运行：

```bat
start_sprite_video_lab.bat
```

默认访问地址：

```text
http://127.0.0.1:8895
```

如果下载依赖或模型也需要代理，可以在本机命令行临时设置：

```bat
set SPRITE_VIDEO_LAB_PROXY=http://127.0.0.1:7897
setup_and_start.bat
```

## 模型与运行环境

仓库不会提交这些大文件：

- `.venv/`、`.venv-ai/`、共享 AI venv。
- Hugging Face 模型缓存。
- CorridorKey checkout 和 checkpoint。
- Real-ESRGAN、ffmpeg 等外部二进制工具。
- `work/` 里的上传、缓存、导出结果。

应用启动后进入 `模型管理` 页面即可看到当前电脑缺什么。页面会按类别列出依赖状态，并在可下载项上提供下载、进度显示和卸载操作。当前检查覆盖 AI 主体抠图、绿幕/蓝幕精修、MAGIC/线稿清理、基础视频工具和 Python AI 依赖等项目。

当某个功能缺模型或工具时，相关算法选项会变灰，并在名称旁显示 `缺模型`、`缺工具` 或 `缺依赖` 胶囊提示。点击提示后会说明需要哪些依赖，并可跳转到 `模型管理` 页面对应位置。

默认模型和运行缓存位置在项目同级目录：

```text
..\sprite-video-lab-models\
```

## 打轻量包

默认打包只复制源码、脚本和说明，不包含模型、venv、ffmpeg、Real-ESRGAN 或 `work/`：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\build_portable_bundle.ps1 -Clean
```

输出：

```text
dist\SpriteForgeLab-light.zip
```

如果确实要做完整离线包，可按团队内部分发规范显式带上 runtime、工具或模型：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\build_portable_bundle.ps1 `
  -OutputRoot F:\release\sprite-forge-lab `
  -IncludeRuntime `
  -PythonHome "C:\Program Files\Python312" `
  -VenvRoot "F:\Codex-Program\sprite-video-lab-models\venv" `
  -IncludeTools `
  -FfmpegBinRoot "F:\Codex-Program\tools\ffmpeg\bin"
```

模型通常建议单独内部分发，而不是塞进 GitLab 或默认 zip。

## 环境变量

- `SPRITE_VIDEO_LAB_HOST`：服务监听地址，默认 `127.0.0.1`。
- `SPRITE_VIDEO_LAB_PORT`：服务端口，默认 `8895`。
- `SPRITE_VIDEO_LAB_DATA_ROOT`：共享运行环境和模型根目录，默认 `..\sprite-video-lab-models`。
- `SPRITE_VIDEO_LAB_PROXY`：可选代理地址，脚本会同步到 `HTTP_PROXY` 和 `HTTPS_PROXY`。
- `SPRITE_VIDEO_LAB_FFMPEG_DIR`：包含 `ffmpeg(.exe)` 和 `ffprobe(.exe)` 的目录。
- `SPRITE_VIDEO_LAB_FFMPEG_ACCEL`：ffmpeg 硬件加速偏好，支持 `auto`、`cpu`、`cuda`、`qsv`、`d3d11va`、`dxva2`。
- `SPRITE_VIDEO_LAB_AI_MODEL_CACHE`：Hugging Face / AI 模型缓存目录。
- `SPRITE_VIDEO_LAB_CORRIDORKEY_ROOT`：CorridorKey checkout 目录。
- `SPRITE_VIDEO_LAB_REALESRGAN_BIN`：`realesrgan-ncnn-vulkan` 可执行文件路径。
- `SPRITE_VIDEO_LAB_REALESRGAN_MODEL_DIR`：包含 `realesrgan-x4plus-anime.param` 和 `.bin` 的模型目录。
- `SPRITE_VIDEO_LAB_PYTHON`：启动脚本使用的 Python 可执行文件。

## 维护建议

- 提交源码、脚本、README 和说明文档。
- 不要提交 `work/`、虚拟环境、模型缓存、测试视频、导出帧和临时素材。
- 如果公司网络无法访问 Hugging Face，建议由一台机器提前下载模型，再把模型缓存目录通过内部分发方式同步给同事。
- 如果要严格控制供应链，请固定外部模型 revision，并分别审查 CorridorKey、BiRefNet、Real-ESRGAN、ffmpeg 等依赖的许可证。

## 许可证

项目代码使用 [MIT](./LICENSE)。外部依赖、模型和二进制工具有各自许可证，团队内分发或商业使用前请分别确认。
