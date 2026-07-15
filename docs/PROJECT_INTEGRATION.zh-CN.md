# 项目对接与正式装配

资产管理是项目内部的候选/确认资源区，项目对接是进入正式工程前的唯一部署入口。内部资产不会因为“入库”自动写入游戏工程。

## 配置

项目对接清单保存：

- `target_root`：正式项目根目录的绝对路径。
- `mappings`：角色、场景、UI、图标、特效、其他六类到目标相对目录的映射。
- `deployments`：每次部署的输入资产、目标、哈希、备份和状态。

映射值必须是相对目录。正式目标可以位于仓库之外，但来源文件必须来自当前项目 `library/assets/`。

## 预检

部署前调用 `/integration/preflight`，检查：

1. 目标根目录是否已配置且可创建。
2. 所选资产是否存在于资产管理清单。
3. 来源文件是否存在。
4. 分类映射能否形成安全目标路径。
5. 目标是否有同名文件；有则列为冲突。

预检只读，不修改正式项目。`ready=false` 时禁止部署。

## 部署

部署采用复制并保留项目内部资产：

1. 为部署生成稳定 `deployment_id`。
2. 同名目标存在时复制到 `.sprite-forge-backups/{deployment_id}/`。
3. 通过同目录临时文件写入目标，再原子替换。
4. 比较来源和目标 SHA-256。
5. 把文件结果写入项目部署记录和审计事件。

部署请求必须使用幂等键。相同项目、相同键重复调用返回原部署，不重复覆盖文件。

## 回溯链路

```text
formal target
  <- deployment file record
  <- library asset and SHA-256
  <- processing result or generation record
  <- asset node / style direction
  <- workflow run and original request
```

正式项目出现问题时，优先根据部署记录定位来源资产与备份，不直接修改项目清单。外部工程中的人工修改不会自动反向覆盖灵帧工坊资产。
