# 自动化生产工作流

Web、REST、CLI 和后续本地 MCP 适配器共用 `ProjectService`。Agent 不需要操作网页即可完成生产、处理、入库和装配；网页只是同一份项目文件的可视化入口。

Agent 首先读取 `GET /api/v1/agent/manifest`，创建 `agentRun` 并声明图片生成能力。API 返回机器可执行的 `next_actions`；Agent 只执行标记为 `agent` 或 `agent_native` 的动作，服务端动作由状态机自动推进。完整契约见 `AGENT_API.zh-CN.md`。

## 标准步骤

1. 查找或创建项目，获得 `projectId`。
2. 创建 `workflowRun`，记录原始需求、操作者、计划步骤和幂等键。
3. 建立风格方向并提交探索图；确认后写入项目当前风格。
4. 建立资产节点，提交生成任务，并把 `workflow_run_id` 写入生成上下文。
5. 轮询稳定任务 ID；失败时更新步骤错误和重试次数。
6. 将候选结果设为 `selected` 或 `confirmed`。
7. 需要抠图/拆图时创建 `processing-intake`，处理区使用文件副本并保留来源记录；根据有效 Alpha、背景稳定度、边缘质量要求和可用能力在保留 Alpha、色键、增强色键与框选引导 AI Matting 之间协商执行。
8. 对处理结果执行结构化质量检查；`passed=false` 时保留证据并进入返工、人工确认或失败状态，不得自动入库。
9. 将通过质量门禁的最终结果复制到资产管理，写入 SHA-256 和来源链路。
10. 配置正式项目目录与分类映射，执行预检。
11. 使用部署幂等键装配正式项目，验证目标哈希。
12. 将工作流标记为 `succeeded`；失败或取消也必须回写终态。

通过 Agent 编排 API 执行时，以上步骤保存为版本化 `workflowRecipe` 和单次 `agentRun`。`agentRun` 同时关联基础 `workflowRun`，因此现有审计、生成历史、处理接收单、资产入库和部署追溯继续有效。

生图后的抠图、拆分、分层、命名和质量门禁设计见 [AI 生图抠图、拆分与分层工作流方案](AI_IMAGE_MATTING_WORKFLOW.zh-CN.md)。该文档当前是设计提案；现有 Agent 自动抠图仍以本地色键和透明通道处理为主，不应把候选 AI 模型写成已上线能力。

无论执行器来自 Agent、本地模型还是 MCP，网页必须可视化同一份项目状态：用户应能查看运行终态、逐步输入输出、处理图片、质量问题、降级原因和入库去向。只有文件落盘而没有工具内入口，不算自动化流程交付完成。

## CLI

CLI 直接调用领域服务，默认使用仓库 `work/`，可用 `--work-dir` 指定其他数据根目录。

```powershell
python sprite_lab_cli.py list-projects
python sprite_lab_cli.py create-workflow default --request "制作一套主界面图标" --actor codex --idempotency-key ui-icons-v1
python sprite_lab_cli.py update-workflow default run_xxx --status running --steps '[{"id":"produce","status":"running"}]'
python sprite_lab_cli.py set-result-status default selected gen_xxx
python sprite_lab_cli.py ingest-library default gen_xxx
python sprite_lab_cli.py configure-integration default --target-root E:\game --mappings '{"ui":"Assets/UI"}'
python sprite_lab_cli.py preflight default
python sprite_lab_cli.py deploy default --idempotency-key ui-icons-deploy-v1
python sprite_lab_cli.py update-workflow default run_xxx --status succeeded --outputs '{"deployment_id":"deploy_xxx"}'
python sprite_lab_cli.py agent-manifest
python sprite_lab_cli.py create-agent-run default --request "制作一套主界面图标"
python sprite_lab_cli.py get-agent-run default arun_xxx
```

CLI 输出统一为 JSON，成功为 `{"ok": true, "result": ...}`，失败写入标准错误并返回退出码 `1`。

## 幂等与恢复

- 项目创建由英文目录名和项目清单约束，不能覆盖非项目目录。
- 工作流、处理接收单和部署均接受幂等键；同键重试返回原记录。
- 生成任务先创建本地记录，再调用外部服务；提交失败保留失败记录。
- 运行中任务可在应用重启后从项目历史继续轮询。
- 部署冲突先备份，复制完成后比较 SHA-256；部署记录保存来源资产、目标路径和哈希。

## 后续 MCP 适配

本地 MCP 工具应薄封装现有领域服务，建议映射为 `project.list`、`project.create`、`workflow.create/update`、`style.create/confirm`、`asset.create`、`generation.submit/status`、`processing.intake`、`library.ingest`、`integration.preflight/deploy`。工具不得直接修改 JSON 文件或绕过项目锁。
