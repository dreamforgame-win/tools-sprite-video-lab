# 灵帧工坊 REST API

本地服务默认监听 `http://127.0.0.1:8895`。业务接口使用 `/api/v1`，请求与响应均为 UTF-8 JSON。错误响应格式为 `{"ok": false, "error": "..."}`。

## 项目

| 方法 | 路径 | 作用 |
|---|---|---|
| GET | `/api/v1/projects` | 项目列表、默认父目录和当前项目 |
| POST | `/api/v1/projects` | 创建项目 |
| POST | `/api/v1/projects/open` | 登记已有项目目录 |
| POST | `/api/v1/projects/select` | 选择当前项目 |
| GET/PATCH/DELETE | `/api/v1/projects/{projectId}` | 读取、修改或归档项目 |
| GET | `/api/v1/projects/{projectId}/dashboard` | 项目进度 |
| GET | `/api/v1/projects/{projectId}/events` | 审计事件 |

创建项目主要字段：`display_name`、`slug`、`parent_path`、`project_type`、`aspect_ratio`、`description`、`style_tags`、`create_mode`、`template_id`。

## 风格、资产树与画布

| 方法 | 路径 |
|---|---|
| GET/POST | `/api/v1/projects/{projectId}/styles` |
| PATCH/DELETE | `/api/v1/projects/{projectId}/styles/{styleId}` |
| GET | `/api/v1/projects/{projectId}/asset-tree` |
| POST | `/api/v1/projects/{projectId}/asset-nodes` |
| PATCH/DELETE | `/api/v1/projects/{projectId}/asset-nodes/{nodeId}` |
| GET/POST | `/api/v1/projects/{projectId}/canvases/{canvasType}` |
| POST | `/api/v1/projects/{projectId}/images/import` |

`DELETE` 默认进入项目回收站。画布类型当前包括 `style`、`production`、`library`。

## 生成与处理

| 方法 | 路径 | 作用 |
|---|---|---|
| GET | `/api/v1/generation/models` | 图片模型能力 |
| POST | `/api/v1/generation/tasks` | 提交图片生成任务 |
| GET | `/api/v1/generation/task?id=...&project_id=...` | 刷新任务 |
| GET | `/api/v1/generation/history?project_id=...` | 项目生成历史 |
| POST | `/api/v1/projects/{projectId}/generation-results/lifecycle` | 批量修改业务状态 |
| POST | `/api/v1/projects/{projectId}/processing-intakes` | 把生产结果复制到处理区 |

生成请求必须包含 `project_id`、`asset_node_id`、`prompt`、`model`、`params`。可选 `style_direction_id`、`workflow_run_id` 和 `actor`。每个请求产生稳定记录 ID，任务完成后远端结果会下载到项目 `production/images/`。

## 资产管理、回收站与项目对接

| 方法 | 路径 |
|---|---|
| GET | `/api/v1/projects/{projectId}/library` |
| POST | `/api/v1/projects/{projectId}/library/ingest` |
| PATCH/DELETE | `/api/v1/projects/{projectId}/library/{assetId}` |
| GET | `/api/v1/projects/{projectId}/trash` |
| POST | `/api/v1/projects/{projectId}/trash/restore` |
| POST | `/api/v1/projects/{projectId}/trash/purge` |
| GET/PATCH | `/api/v1/projects/{projectId}/integration` |
| POST | `/api/v1/projects/{projectId}/integration/preflight` |
| POST | `/api/v1/projects/{projectId}/integration/deploy` |

部署请求建议同时发送 HTTP `Idempotency-Key` 或 JSON `idempotency_key`。预检返回 `ready`、`files`、`conflicts` 和 `errors`；只有 `ready=true` 时才能部署。

## 工作流

| 方法 | 路径 |
|---|---|
| GET/POST | `/api/v1/projects/{projectId}/workflow-runs` |
| GET/PATCH | `/api/v1/projects/{projectId}/workflow-runs/{runId}` |

工作流状态为 `planned`、`running`、`succeeded`、`failed`、`canceled`。创建请求可带 `request`、`actor`、`steps` 和 `idempotency_key`；更新可带 `status`、`steps`、`outputs`、`error`、`retry_count`。

## Agent 编排

`GET /api/v1/agent/manifest` 返回机器可读协议。Agent 运行与可复用配方使用以下接口：

| 方法 | 路径 |
|---|---|
| GET/POST | `/api/v1/projects/{projectId}/workflow-recipes` |
| GET/PATCH | `/api/v1/projects/{projectId}/workflow-recipes/{recipeId}` |
| GET/POST | `/api/v1/projects/{projectId}/agent-runs` |
| GET | `/api/v1/projects/{projectId}/agent-runs/{runId}` |
| POST | `/api/v1/projects/{projectId}/agent-runs/{runId}/actions/{actionId}/result` |
| POST | `/api/v1/projects/{projectId}/agent-runs/{runId}/actions/{actionId}/artifacts` |
| POST | `/api/v1/projects/{projectId}/agent-runs/{runId}/actions/{actionId}/retry` |
| POST | `/api/v1/projects/{projectId}/agent-runs/{runId}/approve` |
| POST | `/api/v1/projects/{projectId}/agent-runs/{runId}/cancel` |
| POST | `/api/v1/projects/{projectId}/agent-runs/{runId}/resume` |

Agent 必须显式声明是否具备原生生图能力。原生图片通过受控 data URL 回传；没有原生能力时，服务端使用已配置 MCP，并受报价和预算策略约束。完整动作、能力、引用、恢复和 CLI 契约见 `docs/AGENT_API.zh-CN.md`。

## 本地资料与生成服务

`GET/POST /api/local-profile` 管理游客名称和头像。`POST/DELETE /api/v1/generation/provider-token` 设置或清除 Token，`POST /api/v1/generation/provider-test` 测试连接。任何读取接口都不会返回完整 Token。
