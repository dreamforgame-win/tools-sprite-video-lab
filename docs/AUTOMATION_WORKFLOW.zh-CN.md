# 自动化生产工作流

Web、REST、CLI 和后续本地 MCP 适配器共用 `ProjectService`。Agent 不需要操作网页即可完成生产、处理、入库和装配；网页只是同一份项目文件的可视化入口。

## 标准步骤

1. 查找或创建项目，获得 `projectId`。
2. 创建 `workflowRun`，记录原始需求、操作者、计划步骤和幂等键。
3. 建立风格方向并提交探索图；确认后写入项目当前风格。
4. 建立资产节点，提交生成任务，并把 `workflow_run_id` 写入生成上下文。
5. 轮询稳定任务 ID；失败时更新步骤错误和重试次数。
6. 将候选结果设为 `selected` 或 `confirmed`。
7. 需要抠图/拆图时创建 `processing-intake`，处理区使用文件副本并保留来源记录。
8. 将最终结果复制到资产管理，写入 SHA-256 和来源链路。
9. 配置正式项目目录与分类映射，执行预检。
10. 使用部署幂等键装配正式项目，验证目标哈希。
11. 将工作流标记为 `succeeded`；失败或取消也必须回写终态。

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
