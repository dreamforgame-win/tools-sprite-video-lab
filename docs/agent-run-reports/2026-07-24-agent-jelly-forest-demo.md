---
exercise_id: agent-jelly-forest-demo-20260724
status: completed_with_issues
started_at: 2026-07-24T09:48:08+08:00
project_slug: agent-jelly-forest-demo
execution_path: agent_native
---

# Agent 果冻森林资源演练

## 目标

通过灵帧工坊 Agent API 创建独立项目，并完整执行风格确定、资产规划、原生生图回传、自动抠图、自动拆分、质量验收、资产入库和流程保存。

## 范围与约束

- 项目名：Agent 果冻森林资源演练
- 目标素材：2×2 道具图，包含蘑菇屋、药水瓶、宝箱、萤火灯。
- 生图路径：`agent_native`，不调用付费 MCP。
- 抠图底色：纯洋红 `#ff00ff`，道具不得使用该颜色。
- 预期产物：约 4 张独立透明素材、入库记录和可复用流程配方。
- 现有 Default 项目保持不变。

## 执行日志

| Step | 时间 | 动作 | 状态 | 关键输入/输出 | 问题与处理 |
|---|---|---|---|---|---|
| 00 | 09:48 | 只读预检 | succeeded | Manifest 1.0；仅存在 Default 项目；选择 `agent_native` | 无 |
| 01 | 09:48 | 建立演练日志与项目档案 | succeeded | 本日志与 Obsidian 实验项目档案 | 无 |
| 02 | 09:49 | 创建灵帧工坊项目 | succeeded | `project_id=prj_9b9be14e1e044567ad5d1cc81c144638`；目录 `work/projects/agent-jelly-forest-demo` | 无；Default 项目未修改 |
| 03 | 09:50 | 创建 Agent 运行 | succeeded | `run_id=arun_b862540c4a0a43fdbb2ccb933a64cf34`；`workflow_run_id=run_cd0d59cd9487441b9dcfa571ebe0ab9c`；11 个动作 | 正确停在 `style.define/action_required` |
| 04 | 09:51 | 回传 `style.define` | succeeded | 风格契约包含形状、配色、材质与负面约束 | 无 |
| 05 | 09:51 | 服务端创建并确认风格 | succeeded | `style_id=style_befd0a02a90e46c8a663acd60da161fb`；项目风格已确认 | 两个服务端动作自动连续完成 |
| 06 | 09:52 | 回传 `asset.plan` | succeeded | 规划蘑菇屋、药水瓶、宝箱、萤火灯四个象限 | 无 |
| 07 | 09:52 | 服务端创建资产节点 | succeeded | `asset_node_id=asset_fa139c205dff4cd5b267c2c2026dd102`；目标数 4 | 运行正确停在 `image.generate/agent_native` |
| 08 | 09:53 | Agent 原生生图 | succeeded | 内置 imagegen；原始文件来自本次 Codex 会话的生成图片缓存，回传后已写入项目生产目录；4 个对象准确 | 实际尺寸 1254×1254，不是动作参数中的 1024×1024；细节高于“低细节”契约 |
| 09 | 09:54 | 回传 `generate-prop-sheet` artifact | succeeded | 原始记录 `d76c7004-f278-4266-8030-e8ce1aa38985`；SHA-256 `c3870d...05fd5` | 原图角落底色在 `#EB20E8` 至 `#F50CEE` 间变化，并非严格 `#ff00ff` |
| 10 | 09:54 | 服务端自动抠图 | succeeded | 抠图记录 `8b2aee6e-4bda-4bde-b273-28a6218af958`；估计底色 `[240,21,236]`；透明像素 70.09% | 数值上透明有效，但未做 despill/边缘颜色净化 |
| 11 | 09:54 | 服务端自动拆分 | succeeded | 正确生成 4 条记录：`20be359c...`、`48c9caaf...`、`663ac4ba...`、`231fbec3...` | 棋盘格复核发现四张图均有可见洋红描边，违反质量条件 |
| 12 | 09:56 | 回传 `quality.review` | rejected | 明确提交 `passed=false`、3 条问题和“不要入库”建议 | API 接受结果，但动作状态仍被写为 `succeeded` |
| 13 | 09:56 | 下游 `library.ingest` | incorrectly_succeeded | 自动入库 4 张不合格素材：`lib_bb070e...`、`lib_c19c91...`、`lib_9eeea1...`、`lib_d35622...` | 严重：下游未读取质量判定，质量门禁无效 |
| 14 | 09:56 | `flow.save` 与运行收尾 | incorrectly_succeeded | `recipe_id=recipe_8ec728f4c89c476a93db3847fcfcd677` v1；运行状态 `succeeded` | 失败质量判定没有传播到运行和保存配方 |
| 15 | 收尾 | 配方重新实例化验证 | succeeded_with_observation | 验证运行 `arun_ccc8ac5e328d40a4ba47d6c6c7354d76`；能力协商后 `image.generate` 使用 `agent_native`；未生成素材并已取消 | 配方列表静态显示执行器为 `server_mcp`，与实例化后的实际协商结果不一致，容易误导调用方 |
| 16 | 收尾 | Agent API 自动化回归 | succeeded | Agent 服务与 API 相关测试 `23/23` 通过 | 现有测试未覆盖 `quality.review.passed=false` 对控制流的阻断，因此未发现 ISSUE-005 |
| 17 | 收尾 | 服务重启与持久化复核 | succeeded | 重启 8895 根目录服务后，主运行、`review.passed=false`、4 条入库记录及配方均可恢复 | 错误控制流同样被完整持久化，证明不是前端缓存或一次性内存状态问题 |
| 18 | 收尾 | 页面、Manifest 与产物可达性 | succeeded | 应用页、Manifest、原图、4 张拆图及 4 条资产库文件均可读取；页面与 Manifest 返回 HTTP 200 | 无新增问题 |

## 问题清单

- `ISSUE-001 / 中`：生图提示要求纯 `#ff00ff`，实际角落颜色存在约 20–35 RGB 距离变化；当前自动抠图通过角落均值和阈值仍能移除大部分背景。
- `ISSUE-002 / 高`：自动抠图只调整 alpha，不做 despill 或边缘收缩，拆分素材出现明显洋红描边；不满足运行中声明的质量条件。
- `ISSUE-003 / 中`：风格契约要求低细节、大块面，实际原生生图更接近高细节高光泽插画，说明风格契约到图片动作提示之间缺少强约束或验收反馈。
- `ISSUE-004 / 低`：动作参数声明 `1024x1024`，原生回传实际为 1254×1254。记录同时保存了真实尺寸，但没有尺寸契约校验或偏差提示。
- `ISSUE-005 / 严重 / 已确认`：`quality.review` 的结构化结果包含 `passed=false`，但服务只把“成功收到结果”当作动作成功，未解释质量判定；`library.ingest`、`flow.save` 和整条运行继续成功。质量门禁目前是记录性动作，不是控制流门禁。
- `ISSUE-006 / 低`：保存配方时没有调用方能力上下文，配方列表把 `image.generate.executor` 展示为 `server_mcp`；重新实例化时会根据能力正确协商为 `agent_native`，功能未失效，但静态协议表示与实际执行语义不一致。

## 最终总结

本次演练完成了独立项目创建、风格确认、资产规划、Agent 原生生图、artifact 回传、服务端抠图、自动拆分、质量复核、资产入库、流程保存、配方重新实例化和跨服务重启恢复。生成内容数量正确，4 个目标对象均被识别并拆分，文件、哈希、处理记录、资产库记录和配方都已持久化；但业务结果不能判定为合格完成，因为质量检查明确拒绝后，状态机仍继续执行并把整条运行标成成功。

最关键根因位于 `agent_workflow_service.py` 的 Agent 动作结果提交逻辑：除 `workflow.plan` 外，服务在收到合法结果后无条件把动作写为 `succeeded`，没有针对 `quality.review` 解释 `passed`、`verdict` 或 `recommended_action`，因此失败判定无法阻断后续动作。洋红细边则来自另一条图像处理缺口：当前抠图只设置 alpha，没有 despill 和边缘收缩。

建议修复顺序：

1. 先把 `quality.review` 改成真正的控制流门禁；`passed=false` 时保留复核输出、阻断 `library.ingest` 与 `flow.save`，并将运行标记为失败或待处理。
2. 为自动抠图增加可配置 despill 和可选 1px 边缘收缩，并用本次原图与棋盘格接触表做回归。
3. 对原生回传尺寸与请求尺寸的偏差增加可观察警告或契约校验。
4. 将配方中的图片执行器表示为“运行时协商”，避免静态 `server_mcp` 造成误解。
5. 将风格漂移先纳入提示词和质量验收反馈；首轮不扩展复杂风格编译器。

本次 4 条不合格入库资产与主运行保留为失败证据，不删除、不覆盖。修复后应基于同一原图创建新的幂等重跑记录，以便直接比较修复前后结果。
