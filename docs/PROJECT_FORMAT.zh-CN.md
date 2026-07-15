# 灵帧工坊项目格式

项目是灵帧工坊的业务边界。显示名称允许中文，实际项目目录必须使用小写英文、数字和短横线组成的 `slug`。默认项目固定在 `work/projects/default/`。

## 目录结构

```text
project-root/
├─ .sprite-lab/
│  ├─ project.json
│  ├─ asset-tree.json
│  ├─ style-directions.json
│  ├─ generation-history.json
│  ├─ library.json
│  ├─ trash.json
│  ├─ integration.json
│  ├─ references/
│  ├─ canvases/
│  ├─ processing/intakes/
│  ├─ workflows/
│  ├─ deployments/
│  └─ events/events.jsonl
├─ production/images/
├─ production/videos/
├─ production/audio/
├─ processing/images/
├─ processing/videos/
├─ processing/audio/
├─ library/assets/
├─ exports/
├─ cache/
└─ trash/
```

`.sprite-lab/project.json` 是项目识别标记。打开已有目录时必须存在该文件；应用不会把任意非空目录静默初始化为项目。

## 核心清单

- `project.json`：项目 ID、显示名称、英文目录名、类型、比例、默认生成参数、当前确认风格和版本。
- `asset-tree.json`：角色、场景、UI、图标、特效、其他六类节点及自定义分组/资产节点。
- `style-directions.json`：风格方向、分组、标签、参考图、状态与封面结果。
- `generation-history.json`：生成任务、参数、状态、本地文件、来源资产节点与工作流 ID。
- `library.json`：进入资产管理的文件副本、哈希、标签、分类和来源链路。
- `trash.json`：可恢复对象及原位置。彻底删除后从清单和项目文件中清除。
- `integration.json`：正式项目根目录、分类映射和部署记录。
- `canvases/*.json`：画布节点、位置、尺寸、层级、锁定、分组和视口。
- `workflows/*.json`：Agent 或用户发起的自动化执行记录。
- `events/events.jsonl`：只追加的审计事件流。

## 生命周期

```text
production -> processing -> library/assets -> integration -> formal project
```

生成结果使用 `normal`、`selected`、`confirmed`、`archived`、`in_library`、`trashed` 中适用的状态。进入资产管理会复制文件并保留生产原件；部署到正式项目也采用复制，冲突文件先备份再替换。

## 一致性约束

- 所有清单使用 UTF-8 JSON，写入采用同目录临时文件加原子替换。
- 项目修改由项目级文件锁串行化。
- 项目内文件 API 会拒绝目录逃逸。
- Token、本机账号资料和模型配置不写入项目目录。
- `schema_version` 不兼容时必须显式迁移，不能忽略版本继续写入。
