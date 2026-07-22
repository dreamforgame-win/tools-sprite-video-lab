# 参考图成本优化与生成面板统一 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让风格探索与资产生产共用参考图本地合并、OmniGen 价格预估、历史快照和生成操作区，并以真实批量口径显示预计总价。

**Architecture:** 扩展现有 `OmniGenService`，在远端素材解析前统一完成参考图去重、拼图缓存、实际输入准备和结构化计价；`server.py` 暴露同一估算器的预览接口，并在正式提交后用实际输入数保存报价快照。前端只在现有 `generation-utils.js` 中维护共享展示函数，在两个既有生成面板中调用同一个报价调度和参考图优化控件。

**Tech Stack:** Python 3、Pillow、现有 `OmniGenService`/HTTPServer、浏览器原生 JavaScript、Node `node:test`、CSS、pytest。

## Global Constraints

- 活跃开发页面固定为 `http://127.0.0.1:8895/app/index.html`；`.worktrees/ai-creation-workbench` 与 8894 只作归档参考。
- 两张及以上参考图默认合并，零张或一张不生成拼图；用户可以关闭本次优化。
- 拼图必须等比例完整容纳图片，不裁切主体，不添加文字、编号、水印或装饰。
- 原始参考图保存在 `params.reference_images`；实际输入、拼图路径和报价使用独立快照字段。
- 批量价格按每个生成任务都会重复产生参考图费和输出费计算。
- 价格只读取供应商 `billing_rules`；不得按模型 ID 硬编码价格。
- 无精确规则时展示无法精确预估或供应商回退价，不得把未知费用当成零。
- 风格指导包与用户选择的参考图必须先合并去重，再进入同一优化和计费流程。
- 拼图失败不得静默回退为更昂贵的多参考图提交。
- 优先扩展已有组件、领域服务、数据结构和交互规范，不创建平行生成入口或第二套计费公式。
- 工作树已有大量用户改动。不得清理、回退或覆盖无关内容；只有在任务改动可与已有改动准确隔离且用户授权时才提交 Git，否则保留未提交并报告。
- 后端与跨模块流程验证等级为 `L3（完整相关回归）`。

---

## File Map

- Modify `docs/GENERATION_RULES.zh-CN.md`: 增加共享能力优先规范，以及图片生成参考图优化、报价与关闭操作规格。
- Modify `omnigen_service.py`: 透传计费规则，解析结构化报价，生成和缓存参考图拼图，保存实际输入快照。
- Modify `server.py`: 增加报价预览 API；在指导包编译后统一计算、提交并固化实际报价。
- Modify `app/generation-utils.js`: 提供共享参考图数量、优化说明和价格格式化纯函数。
- Modify `tests/test_generation_utils.js`: 覆盖共享前端纯函数。
- Modify `app/index.html`: 为资产生成面板加入共享优化控件与报价容器。
- Modify `app/app.js`: 为两套面板接入同一报价调度、控件状态和提交参数；删除风格底部取消按钮。
- Modify `app/styles.css`: 统一优化控件、报价摘要和单按钮操作区样式。
- Modify `tests/test_omnigen_service.py`: 覆盖计费、拼图、提交快照和报价 API。
- Create `tests/test_generation_cost_ui.js`: 守护两套面板共用规格、事件连接和提交参数。

---

### Task 1: 先固化共享能力规范

**Files:**
- Modify: `docs/GENERATION_RULES.zh-CN.md:55-100`
- Reference: `docs/superpowers/specs/2026-07-22-reference-image-cost-optimization-design.md`

**Interfaces:**
- Consumes: 已确认设计中的共享优先、参考图优化和真实价格口径。
- Produces: 后续任务必须遵守的项目级规则文本。

- [ ] **Step 1: 在资源与生成通用规则前增加共享能力优先条款**

将以下规则加入图片资产/生成规则区域的前部，不把它埋在单一面板条款中：

```markdown
- 相同或高度相似的业务能力，必须优先扩展已有组件、领域服务、数据结构和交互规范。没有明确业务差异时，不得新建平行入口、重复状态或第二套计算逻辑；确需分离时，应先记录差异、复用边界和迁移策略。新增需求应先检查并维护已有能力，再决定是否需要新结构。
```

- [ ] **Step 2: 更新两个图片生成面板的共享规格**

在现有风格探索和资产生产条款中明确加入：

```markdown
- 风格探索与图片资产生产的生成面板共享参考图优化、模型参数、价格摘要和生成操作区规格。选择两张及以上参考图时默认在本地合并为一张实际输入，用户可以关闭本次优化；原始参考图继续用于界面与历史，拼图只作为实际供应商输入。生成按钮下方按供应商计费规则显示“参考图费用 + 生成费用 = 预计总价”，资产批量生成必须按整批任务数计算。无法精确计算时应说明原因，不得显示虚假零价。
- 生成浮层已有右上关闭按钮时，不再重复提供底部取消按钮；关闭浮层不取消已经提交的任务。
```

- [ ] **Step 3: 核对规则内容，无需运行测试**

Run:

```powershell
rg -n "高度相似|合并为一张实际输入|预计总价|底部取消按钮" docs/GENERATION_RULES.zh-CN.md
```

Expected: 四个关键短语均命中新增规则；本任务属于规则文档修改，本步骤无需浏览器或自动化测试。

---

### Task 2: 规范化 OmniGen 计费规则并实现唯一报价器

**Files:**
- Modify: `omnigen_service.py:1260-1350`
- Modify: `tests/test_omnigen_service.py:425-570`

**Interfaces:**
- Consumes: `model["billing_rules"]`、`params.resolution`、`params.aspect_ratio`、实际参考图数量、原始参考图数量、任务数量。
- Produces: `OmniGenService.estimate_image_cost(model, params, *, effective_reference_count, original_reference_count, task_count) -> dict`。
- Produces: 模型列表中的深拷贝字段 `billing_rules`。

- [ ] **Step 1: 写计费规则透传和 GPT Image 组合计费失败测试**

在 `OmniGenOperationsTests` 中加入：

```python
def test_normalizes_billing_rules_without_model_id_price_hardcoding(self):
    rules = {
        "unit": "composite",
        "currency": "CNY",
        "components": [
            {"key": "input_images", "amount": 0.1, "quantity_from": "input_images"},
            {"key": "output_images", "prices": {"1K": 0.395, "2K": 0.803}, "quantity_from": "output_images"},
        ],
    }
    models = OmniGenService._normalize_image_models(
        {"models": [{"id": "provider-defined-name", "billing_rules": rules}]}
    )
    self.assertEqual(models[0]["billing_rules"], rules)

def test_estimates_composite_reference_and_batch_cost(self):
    model = {
        "billing_rules": {
            "unit": "composite",
            "currency": "CNY",
            "components": [
                {"key": "input_images", "label": "输入参考图", "amount": 0.1, "quantity_from": "input_images"},
                {"key": "output_images", "label": "输出图片", "prices": {"1K": 0.395, "default": 0.395}, "quantity_from": "output_images"},
            ],
        }
    }
    quote = OmniGenService.estimate_image_cost(
        model, {"resolution": "1K", "aspect_ratio": "1:1"},
        effective_reference_count=1, original_reference_count=8, task_count=4,
    )
    self.assertEqual(quote["currency"], "CNY")
    self.assertEqual(quote["reference"]["billable_count"], 1)
    self.assertAlmostEqual(quote["per_task_total"], 0.495)
    self.assertAlmostEqual(quote["total"], 1.98)
    self.assertAlmostEqual(quote["savings"], 2.8)
```

- [ ] **Step 2: 运行测试确认缺少接口和字段**

Run:

```powershell
.venv-ai\Scripts\python.exe -m pytest tests/test_omnigen_service.py -k "billing_rules or composite_reference_and_batch_cost" -q
```

Expected: FAIL，分别指出缺少 `billing_rules` 或 `estimate_image_cost`。

- [ ] **Step 3: 在模型规范化中透传规则，并实现组合/固定单价解析**

模型输出增加：

```python
"billing_rules": copy.deepcopy(model.get("billing_rules") or {}),
```

并在文件顶部加入：

```python
from decimal import Decimal, InvalidOperation
```

报价器返回固定结构：

```python
{
    "currency": currency,
    "exact": exact,
    "used_fallback": used_fallback,
    "reference": {
        "unit_price": reference_unit_price,
        "free_quantity": free_quantity,
        "billable_count": billable_reference_count,
        "subtotal": reference_subtotal,
    },
    "generation": {
        "unit_price": output_unit_price,
        "subtotal": output_subtotal,
    },
    "per_task_total": per_task_total,
    "task_count": task_count,
    "total": total,
    "unoptimized_total": unoptimized_total,
    "savings": savings,
    "unavailable_reason": unavailable_reason,
}
```

实现规则必须按字段结构分支，而不是检查模型 ID。先加入三个纯 helper：

```python
@staticmethod
def _billing_decimal(value: object) -> Decimal | None:
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return None

@staticmethod
def _resolution_price(prices: dict, resolution: str) -> Decimal | None:
    value = prices.get(resolution, prices.get("default")) if isinstance(prices, dict) else None
    return OmniGenService._billing_decimal(value)

@staticmethod
def _estimated_output_pixels(resolution: str, aspect_ratio: str) -> int:
    long_edges = {"512": 512, "1K": 1024, "2K": 2048, "4K": 4096, "8K": 8192}
    edge = long_edges.get(str(resolution or "").upper(), 0)
    try:
        width_ratio, height_ratio = (float(item) for item in str(aspect_ratio or "1:1").split(":", 1))
    except (TypeError, ValueError):
        width_ratio, height_ratio = 1.0, 1.0
    if edge <= 0 or width_ratio <= 0 or height_ratio <= 0:
        return 0
    scale = edge / max(width_ratio, height_ratio)
    return max(1, round(width_ratio * scale)) * max(1, round(height_ratio * scale))
```

`estimate_image_cost` 使用以下完整分支：

```python
@classmethod
def estimate_image_cost(
    cls,
    model: dict,
    params: dict,
    *,
    effective_reference_count: int,
    original_reference_count: int,
    task_count: int = 1,
) -> dict:
    rules = copy.deepcopy(model.get("billing_rules") or {})
    resolution = str(params.get("resolution") or "").upper()
    aspect_ratio = str(params.get("aspect_ratio") or "1:1")
    effective = max(0, int(effective_reference_count))
    original = max(effective, int(original_reference_count))
    tasks = max(1, int(task_count))
    currency = str(rules.get("currency") or "CNY").upper()
    reference_unit = None
    reference_free = 0
    reference_billable = 0
    reference_subtotal = Decimal("0")
    unoptimized_reference_subtotal = Decimal("0")
    output_unit = None
    output_subtotal = None
    exact = True
    used_fallback = False
    unavailable_reason = ""

    unit = str(rules.get("unit") or "").lower()
    if unit == "composite":
        pixels = cls._estimated_output_pixels(resolution, aspect_ratio)
        for component in rules.get("components") or []:
            key = str(component.get("key") or "")
            if key == "input_images":
                reference_unit = cls._billing_decimal(component.get("amount"))
                reference_free = max(0, int(component.get("free_quantity") or 0))
                reference_billable = max(0, effective - reference_free)
                original_billable = max(0, original - reference_free)
                if reference_unit is None:
                    unavailable_reason = "参考图计费规则缺少单价"
                    break
                reference_subtotal = reference_unit * reference_billable
                unoptimized_reference_subtotal = reference_unit * original_billable
            elif key == "output_images":
                output_unit = cls._resolution_price(component.get("prices") or {}, resolution)
                if output_unit is None:
                    for candidate in component.get("rules") or []:
                        when = candidate.get("when") or {}
                        matches_lte = "output_pixels_lte" not in when or pixels <= int(when["output_pixels_lte"])
                        matches_gt = "output_pixels_gt" not in when or pixels > int(when["output_pixels_gt"])
                        if pixels > 0 and matches_lte and matches_gt:
                            output_unit = cls._billing_decimal(candidate.get("amount"))
                            break
                if output_unit is None:
                    unavailable_reason = "当前分辨率缺少生成价格"
                    break
                output_subtotal = output_unit
    elif unit in {"cny/item", "yuan/item", "item"}:
        output_unit = cls._billing_decimal(rules.get("amount"))
        if output_unit is None:
            output_unit = cls._resolution_price(rules.get("prices_by_resolution") or {}, resolution)
        if output_unit is None:
            unavailable_reason = "当前分辨率缺少生成价格"
        else:
            output_subtotal = output_unit
    elif unit == "token_usage":
        fallback = rules.get("fallback") if isinstance(rules.get("fallback"), dict) else {}
        output_unit = cls._resolution_price(fallback.get("prices_by_resolution") or {}, resolution)
        exact = False
        used_fallback = output_unit is not None
        if output_unit is None:
            unavailable_reason = "Token 计费缺少可用的分辨率回退价"
        else:
            output_subtotal = output_unit
            reference_subtotal = Decimal("0")
            unoptimized_reference_subtotal = Decimal("0")
    else:
        exact = False
        unavailable_reason = "当前模型未提供可识别的价格规则"

    if unavailable_reason or output_subtotal is None:
        per_task_total = total = unoptimized_total = savings = None
    else:
        per_task = reference_subtotal + output_subtotal
        unoptimized_per_task = unoptimized_reference_subtotal + output_subtotal
        per_task_total = float(per_task)
        total = float(per_task * tasks)
        unoptimized_total = float(unoptimized_per_task * tasks)
        savings = float(max(Decimal("0"), (unoptimized_per_task - per_task) * tasks))

    return {
        "currency": currency,
        "exact": exact,
        "used_fallback": used_fallback,
        "reference": {
            "unit_price": float(reference_unit) if reference_unit is not None else None,
            "free_quantity": reference_free,
            "billable_count": reference_billable,
            "subtotal": float(reference_subtotal) if not unavailable_reason else None,
        },
        "generation": {
            "unit_price": float(output_unit) if output_unit is not None else None,
            "subtotal": float(output_subtotal) if output_subtotal is not None else None,
        },
        "per_task_total": per_task_total,
        "task_count": tasks,
        "total": total,
        "unoptimized_total": unoptimized_total,
        "savings": savings,
        "unavailable_reason": unavailable_reason,
    }
```

金额内部使用 `Decimal(str(value))`，输出 JSON 前转为 `float`；统一在最终小计处量化到最多 6 位，不在每个乘法中提前按两位舍入。

- [ ] **Step 4: 写首张免费、像素阈值、固定单价和 Token 回退测试**

```python
def test_estimates_free_reference_and_pixel_threshold(self):
    model = {"billing_rules": {
        "unit": "composite", "currency": "CNY", "components": [
            {"key": "input_images", "amount": 0.02, "free_quantity": 1, "quantity_from": "input_images"},
            {"key": "output_images", "rules": [
                {"when": {"output_pixels_lte": 2360000}, "amount": 0.3},
                {"when": {"output_pixels_gt": 2360000}, "amount": 0.6},
            ], "quantity_from": "output_images"},
        ]
    }}
    low = OmniGenService.estimate_image_cost(
        model, {"resolution": "1K", "aspect_ratio": "1:1"},
        effective_reference_count=1, original_reference_count=4, task_count=1,
    )
    high = OmniGenService.estimate_image_cost(
        model, {"resolution": "2K", "aspect_ratio": "1:1"},
        effective_reference_count=1, original_reference_count=4, task_count=1,
    )
    self.assertEqual(low["reference"]["billable_count"], 0)
    self.assertEqual(low["total"], 0.3)
    self.assertEqual(high["total"], 0.6)

def test_token_pricing_uses_declared_resolution_fallback_as_non_exact(self):
    model = {"billing_rules": {
        "unit": "token_usage", "currency": "USD",
        "fallback": {"unit": "item", "prices_by_resolution": {"1K": 0.0672}},
    }}
    quote = OmniGenService.estimate_image_cost(
        model, {"resolution": "1K", "aspect_ratio": "1:1"},
        effective_reference_count=1, original_reference_count=3, task_count=2,
    )
    self.assertFalse(quote["exact"])
    self.assertTrue(quote["used_fallback"])
    self.assertEqual(quote["currency"], "USD")
    self.assertAlmostEqual(quote["total"], 0.1344)
```

像素估算使用分辨率长边：`512 -> 512`、`1K -> 1024`、`2K -> 2048`、`4K -> 4096`、`8K -> 8192`；短边按宽高比计算，最终以整数宽×高匹配 `output_pixels_lte/gt`。

- [ ] **Step 5: 运行计费测试**

Run:

```powershell
.venv-ai\Scripts\python.exe -m pytest tests/test_omnigen_service.py -k "billing or estimates or pricing" -q
```

Expected: 新增计费测试全部 PASS，旧模型规范化期望同步包含 `billing_rules: {}` 后也 PASS。

---

### Task 3: 在现有参考图准备链路加入安全拼图和缓存

**Files:**
- Modify: `omnigen_service.py:90-150, 1390-1685`
- Modify: `tests/test_omnigen_service.py:560-930`

**Interfaces:**
- Consumes: `params.reference_images` 与 `params.optimize_reference_images`。
- Produces: `_optimize_reference_images(raw_references) -> tuple[list[object], dict]`。
- Produces: 记录字段 `reference_optimization`，其中包含 `enabled`、`rule_version`、`original_count`、`effective_count`、`composite_relative_path`、`unmerged_references`。
- Preserves: `_prepare_reference_inputs(...) -> (inputs, markers, remote_params)` 的对外返回形状。

- [ ] **Step 1: 写默认拼图、禁用和缓存复用失败测试**

```python
def test_submit_image_composites_multiple_local_references_by_default(self):
    with tempfile.TemporaryDirectory() as directory:
        service = OmniGenService(Path(directory))
        for name, size, color in (("a.png", (400, 200), "red"), ("b.png", (200, 400), "blue")):
            Image.new("RGB", size, color).save(Path(directory) / name)
        calls = []
        def call_tool(name, arguments):
            calls.append((name, arguments))
            return {"asset_id": "composite-asset"} if name == "upload_asset" else {"task_id": "task-1"}
        with mock.patch.object(service, "call_tool", side_effect=call_tool):
            record = service.submit_image("hero", "image-a", {"reference_images": ["a.png", "b.png"]})
        generate = next(arguments for name, arguments in calls if name == "generate_image")
        self.assertEqual(len(generate["inputs"]), 1)
        self.assertEqual(record["params"]["reference_images"], ["a.png", "b.png"])
        self.assertEqual(record["reference_optimization"]["original_count"], 2)
        self.assertEqual(record["reference_optimization"]["effective_count"], 1)
        self.assertTrue(record["reference_optimization"]["composite_relative_path"])

def test_submit_image_keeps_multiple_inputs_when_optimization_is_disabled(self):
    with tempfile.TemporaryDirectory() as directory:
        service = OmniGenService(Path(directory))
        Image.new("RGB", (64, 32), "red").save(Path(directory) / "a.png")
        Image.new("RGB", (32, 64), "blue").save(Path(directory) / "b.png")
        generated = []
        upload_index = 0
        def call_tool(name, arguments):
            nonlocal upload_index
            if name == "upload_asset":
                upload_index += 1
                return {"asset_id": f"asset-{upload_index}"}
            generated.append(arguments)
            return {"task_id": "task-disabled"}
        with mock.patch.object(service, "call_tool", side_effect=call_tool):
            record = service.submit_image("hero", "image-a", {
                "reference_images": ["a.png", "b.png"],
                "optimize_reference_images": False,
            })
        self.assertEqual(len(generated[0]["inputs"]), 2)
        self.assertEqual(record["reference_optimization"]["effective_count"], 2)
        self.assertEqual(record["reference_optimization"]["composite_relative_path"], "")

def test_reference_composite_cache_is_stable_for_same_ordered_sources(self):
    with tempfile.TemporaryDirectory() as directory:
        service = OmniGenService(Path(directory))
        Image.new("RGB", (64, 32), "red").save(Path(directory) / "a.png")
        Image.new("RGB", (32, 64), "blue").save(Path(directory) / "b.png")
        def call_tool(name, arguments):
            return {"asset_id": "asset-composite"} if name == "upload_asset" else {"task_id": "task"}
        with mock.patch.object(service, "call_tool", side_effect=call_tool):
            first = service.submit_image("first", "image-a", {"reference_images": ["a.png", "b.png"]})
            second = service.submit_image("second", "image-a", {"reference_images": ["a.png", "b.png"]})
        self.assertEqual(
            first["reference_optimization"]["composite_relative_path"],
            second["reference_optimization"]["composite_relative_path"],
        )
        self.assertEqual(len(list(service.reference_composites_dir.glob("*.png"))), 1)
```

- [ ] **Step 2: 运行拼图测试确认当前会分别上传**

Run:

```powershell
.venv-ai\Scripts\python.exe -m pytest tests/test_omnigen_service.py -k "composites_multiple or optimization_is_disabled or composite_cache" -q
```

Expected: 默认拼图和缓存测试 FAIL；禁用测试描述当前行为但缺少快照字段而 FAIL。

- [ ] **Step 3: 初始化受控拼图目录并实现确定性渲染**

在 `__init__` 中增加并校验：

```python
self.reference_composites_dir = (self.omnigen_dir / "reference-composites").resolve()
```

文件顶部同时增加 `import math`，并把 Pillow 导入改为：

```python
from PIL import Image, ImageOps, UnidentifiedImageError
```

渲染常量与缓存键：

```python
REFERENCE_COMPOSITE_RULE_VERSION = 1
REFERENCE_COMPOSITE_MAX_EDGE = 4096
REFERENCE_COMPOSITE_CELL_EDGE = 1024
REFERENCE_COMPOSITE_MAX_IMAGES = 40
REFERENCE_COMPOSITE_GAP = 24
REFERENCE_COMPOSITE_BACKGROUND = (238, 240, 243)
```

核心方法：

```python
def _render_reference_composite(self, paths: list[Path]) -> Path:
    fingerprints = [self._reference_fingerprint(path) for path in paths]
    signature = json.dumps({
        "version": REFERENCE_COMPOSITE_RULE_VERSION,
        "fingerprints": fingerprints,
        "cell": REFERENCE_COMPOSITE_CELL_EDGE,
        "gap": REFERENCE_COMPOSITE_GAP,
    }, separators=(",", ":"), sort_keys=True)
    cache_name = hashlib.sha256(signature.encode("utf-8")).hexdigest() + ".png"
    destination = self.reference_composites_dir / cache_name
    if destination.is_file():
        return destination
    columns = max(1, math.ceil(math.sqrt(len(paths))))
    rows = math.ceil(len(paths) / columns)
    largest_axis = max(columns, rows)
    cell = min(
        REFERENCE_COMPOSITE_CELL_EDGE,
        max(256, (REFERENCE_COMPOSITE_MAX_EDGE - (largest_axis + 1) * REFERENCE_COMPOSITE_GAP) // largest_axis),
    )
    canvas = Image.new("RGB", (
        columns * cell + (columns + 1) * REFERENCE_COMPOSITE_GAP,
        rows * cell + (rows + 1) * REFERENCE_COMPOSITE_GAP,
    ), REFERENCE_COMPOSITE_BACKGROUND)
    for index, path in enumerate(paths):
        with Image.open(path) as source:
            source.load()
            rgb = source.convert("RGB")
            tile = ImageOps.contain(
                rgb,
                (min(cell, rgb.width), min(cell, rgb.height)),
                Image.Resampling.LANCZOS,
            )
        column, row = index % columns, index // columns
        x = REFERENCE_COMPOSITE_GAP + column * (cell + REFERENCE_COMPOSITE_GAP) + (cell - tile.width) // 2
        y = REFERENCE_COMPOSITE_GAP + row * (cell + REFERENCE_COMPOSITE_GAP) + (cell - tile.height) // 2
        canvas.paste(tile, (x, y))
    self._atomic_write_image(destination, canvas, format="PNG")
    return destination
```

使用项目现有原子写入模式实现 `_atomic_write_image`，临时文件必须与目标同目录，并在 `replace` 后清理失败残留；不得直接覆盖现有缓存文件：

```python
def _atomic_write_image(self, path: Path, image: Image.Image, *, format: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = None
    try:
        with tempfile.NamedTemporaryFile(
            "wb", dir=path.parent, prefix=f".{path.name}.", suffix=".tmp", delete=False,
        ) as handle:
            temporary_path = Path(handle.name)
            image.save(handle, format=format, optimize=True)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary_path, path)
    finally:
        if temporary_path is not None and temporary_path.exists():
            temporary_path.unlink()
```

- [ ] **Step 4: 在 `_prepare_reference_inputs` 前完成去重和优化**

规则顺序固定，并以以下方法实现：

```python
def _reference_identity(self, raw_reference: object) -> str:
    if isinstance(raw_reference, dict):
        relative_path = str(raw_reference.get("relative_path") or "").strip()
        if relative_path:
            return "path:" + relative_path.replace("\\", "/")
        asset_id = str(raw_reference.get("remote_asset_id") or raw_reference.get("asset_id") or "").strip()
        return f"asset:{asset_id}" if asset_id else ""
    text = str(raw_reference or "").strip()
    parsed = urllib.parse.urlparse(text)
    return f"url:{text}" if parsed.scheme in {"http", "https"} and parsed.netloc else "path:" + text.replace("\\", "/")

def _reference_local_path(self, raw_reference: object) -> Path | None:
    value = raw_reference.get("relative_path") if isinstance(raw_reference, dict) else raw_reference
    text = str(value or "").strip()
    parsed = urllib.parse.urlparse(text)
    if not text or (parsed.scheme in {"http", "https"} and parsed.netloc):
        return None
    return self._resolve_project_reference_path(text)

def _optimize_reference_images(self, raw_references: list[object], enabled: bool) -> tuple[list[object], dict]:
    unique = []
    seen = set()
    for reference in raw_references:
        identity = self._reference_identity(reference)
        if identity and identity not in seen:
            seen.add(identity)
            unique.append(reference)
    local_entries = []
    for index, reference in enumerate(unique):
        local_path = self._reference_local_path(reference)
        if local_path is not None:
            local_entries.append((index, local_path))
    if len(local_entries) > REFERENCE_COMPOSITE_MAX_IMAGES:
        raise ValueError(f"单次最多支持 {REFERENCE_COMPOSITE_MAX_IMAGES} 张本地参考图")
    optimized = list(unique)
    composite_relative_path = ""
    if enabled and len(local_entries) >= 2:
        composite = self._render_reference_composite([path for _index, path in local_entries])
        composite_relative_path = composite.relative_to(self.work_dir).as_posix()
        local_indexes = {index for index, _path in local_entries}
        first_local = min(local_indexes)
        optimized = [
            composite_relative_path if index == first_local else reference
            for index, reference in enumerate(unique)
            if index == first_local or index not in local_indexes
        ]
    snapshot = {
        "enabled": bool(enabled),
        "rule_version": REFERENCE_COMPOSITE_RULE_VERSION,
        "original_count": len(unique),
        "effective_count": len(optimized),
        "composite_relative_path": composite_relative_path,
        "unmerged_references": [
            self._reference_identity(reference)
            for reference in optimized
            if self._reference_local_path(reference) is None
        ],
    }
    return optimized, snapshot
```

随后按以下顺序连接现有 `_prepare_reference_inputs`：

1. 按字符串路径、结构化 `relative_path/remote_asset_id` 或 URL 建立稳定身份并去重；
2. `optimize_reference_images` 缺省视为 `True`，从 `remote_params` 中移除，不发送给供应商；
3. 调用 `_optimize_reference_images`；
4. 遍历优化后的引用调用现有 `_reference_input`；
5. 拼图加独立输入的总数写入 `effective_count`；
6. 任何本地图片损坏或拼图失败时抛出明确异常，不回退为原图列表。

在记录创建后、远端上传前保存：

```python
record = self.update_record(
    record["id"],
    reference_optimization=optimization_snapshot,
)
```

`_prepare_reference_inputs` 保持现有三元返回值；`submit_image` 调用后立即用 `record = self.find_record(record["id"])` 刷新局部记录，再读取 `reference_optimization`、追加 `reference_assets` 和执行模型上限校验。

- [ ] **Step 5: 写完整容纳、损坏图片、远端独立输入和上限测试**

新增测试使用一张 400×100 红图和一张 100×400 蓝图，并明确断言：

```python
with Image.open(composite_path) as composite:
    self.assertEqual(composite.mode, "RGB")
    self.assertLessEqual(max(composite.size), REFERENCE_COMPOSITE_MAX_EDGE)

self.assertRaisesRegex(ValueError, "invalid|损坏|参考图", submit_bad_image)
self.assertEqual(snapshot["effective_count"], 2)  # 一张本地拼图 + 一条纯 URL
```

同时验证优化后的 `effective_count` 超过模型上限时由调用方阻止；原始数量超过上限但优化后未超过时允许提交。

- [ ] **Step 6: 运行参考图与既有素材复用测试**

Run:

```powershell
.venv-ai\Scripts\python.exe -m pytest tests/test_omnigen_service.py -k "reference or composite or submit_image" -q
```

Expected: 所有参考图上传、生成结果素材 ID 恢复、项目路径保护、默认拼图、关闭优化和缓存测试 PASS。

---

### Task 4: 接入报价 API、正式提交快照与实际输入上限

**Files:**
- Modify: `server.py:7140-7170, 7530-7690`
- Modify: `omnigen_service.py:640-725, 1640-1705`
- Modify: `tests/test_omnigen_service.py:1000-1220`

**Interfaces:**
- Consumes: Task 2 的 `estimate_image_cost(...)` 和 Task 3 的 `record.reference_optimization`。
- Produces: `POST /api/v1/generation/estimate`。
- Produces: 正式记录字段 `cost_estimate`。

- [ ] **Step 1: 写报价 API 失败测试**

在 `ServerApiTests.setUp` 配置：

```python
self.service.image_model_capability.return_value = {
    "id": "image-a",
    "max_reference_images": 4,
    "billing_rules": {"unit": "cny/item", "amount": 0.25, "currency": "CNY"},
}
self.service.estimate_image_cost.return_value = {
    "currency": "CNY", "exact": True, "total": 1.0, "task_count": 4,
}
self.service.update_record.side_effect = lambda _record_id, **changes: {
    **self.service.submit_image.return_value,
    **changes,
}
```

新增测试：

```python
def test_generation_estimate_route_uses_shared_service_quote(self):
    status, payload = self.request("POST", "/api/v1/generation/estimate", {
        "model": "image-a",
        "params": {"resolution": "1K", "aspect_ratio": "1:1"},
        "original_reference_count": 8,
        "effective_reference_count": 1,
        "task_count": 4,
    })
    self.assertEqual(status, 200)
    self.assertEqual(payload["estimate"]["total"], 1.0)
    self.service.estimate_image_cost.assert_called_once()
```

- [ ] **Step 2: 运行 API 测试确认 404**

Run:

```powershell
.venv-ai\Scripts\python.exe -m pytest tests/test_omnigen_service.py -k "generation_estimate_route" -q
```

Expected: FAIL，当前接口返回 404。

- [ ] **Step 3: 实现只调用唯一报价器的预览接口**

请求校验：

```python
model_id = str(payload.get("model") or "").strip()
params = payload.get("params") if isinstance(payload.get("params"), dict) else {}
original_count = max(0, min(100, int(payload.get("original_reference_count") or 0)))
effective_count = max(0, min(original_count, int(payload.get("effective_reference_count") or 0)))
task_count = max(1, min(8, int(payload.get("task_count") or 1)))
capability = GENERATION_PROVIDER.image_model_capability(model_id)
if not capability:
    raise ValueError("Unknown image model")
estimate = GENERATION_PROVIDER.estimate_image_cost(
    capability,
    params,
    effective_reference_count=effective_count,
    original_reference_count=original_count,
    task_count=task_count,
)
self.send_json({"ok": True, "estimate": estimate})
```

接口只返回价格信息，不上传图片、不创建历史、不修改项目。

- [ ] **Step 4: 写正式提交在指导包合并后保存实际快照的测试**

扩展现有 `test_generation_compiles_exact_style_guide_version_before_submit`，在请求 params 中增加：

```python
"optimize_reference_images": True,
```

并把 `self.service.submit_image.return_value` 的本测试返回值临时设置为：

```python
{
    "id": "record-1",
    "status": "queued",
    "reference_optimization": {
        "enabled": True,
        "original_count": 2,
        "effective_count": 1,
        "composite_relative_path": ".sprite-video-lab/generation/reference-composites/key.png",
        "unmerged_references": [],
    },
}
```

请求完成后断言：

```python
submitted_params = self.service.submit_image.call_args.args[2]
self.assertEqual(len(submitted_params["reference_images"]), 2)
self.assertTrue(submitted_params["optimize_reference_images"])
context = self.service.submit_image.call_args.kwargs["context"]
self.assertEqual(context["model_reference_limit"], 4)
self.service.update_record.assert_called_once()
saved_estimate = self.service.update_record.call_args.kwargs["cost_estimate"]
self.assertEqual(saved_estimate["task_count"], 1)
```

- [ ] **Step 5: 正式提交按实际输入数重新计算单任务报价**

在读取 payload 后立刻取得一次模型能力，并供指导包编译、实际上限和报价共同复用：

```python
capability = GENERATION_PROVIDER.image_model_capability(payload.get("model") or "")
if not capability:
    raise ValueError("Unknown image model")
params["optimize_reference_images"] = bool(
    params.get("optimize_reference_images", True)
)
generation_context["model_reference_limit"] = int(
    capability.get("max_reference_images") or 0
)
```

指导包继续把 `compiled.reference_paths` 追加到 `params.reference_images`；稳定去重由 Task 3 的共享参考图准备层执行，不在 `server.py` 再实现一份。

调用 `service.submit_image` 返回后读取 `record["reference_optimization"]`，使用同一个 `capability` 和实际 `original_count/effective_count` 计算 `task_count=1` 的记录级报价，再调用：

```python
optimization = record.get("reference_optimization") or {}
actual_estimate = GENERATION_PROVIDER.estimate_image_cost(
    capability,
    params,
    effective_reference_count=int(optimization.get("effective_count") or 0),
    original_reference_count=int(optimization.get("original_count") or 0),
    task_count=1,
)
record = service.update_record(record["id"], cost_estimate=actual_estimate)
```

在 `OmniGenService.submit_image` 的 `_prepare_reference_inputs` 返回后、任何 `upload_asset/generate_image` 调用前执行：

```python
reference_limit = max(0, int((context or {}).get("model_reference_limit") or 0))
effective_count = int(record.get("reference_optimization", {}).get("effective_count") or 0)
if reference_limit and effective_count > reference_limit:
    raise ValueError(
        f"当前模型最多支持 {reference_limit} 张实际参考输入，本次优化后为 {effective_count} 张"
    )
```

异常继续走现有失败记录逻辑。原始数量超过上限但优化后不超过时允许提交。

- [ ] **Step 6: 运行服务与 API 测试**

Run:

```powershell
.venv-ai\Scripts\python.exe -m pytest tests/test_omnigen_service.py -q
```

Expected: `tests/test_omnigen_service.py` 全部 PASS。

---

### Task 5: 增加前端共享数量与价格格式化纯函数

**Files:**
- Modify: `app/generation-utils.js:1-90`
- Modify: `tests/test_generation_utils.js:1-150`

**Interfaces:**
- Consumes: 后端结构化 `estimate`、原始参考图数量、优化开关。
- Produces: `effectiveReferenceCount(originalCount, optimizationEnabled) -> number`。
- Produces: `generationOptimizationText(originalCount, effectiveCount, enabled) -> string`。
- Produces: `formatGenerationCostEstimate(estimate) -> { formula: string, detail: string, tone: string }`。

- [ ] **Step 1: 写共享纯函数失败测试**

```javascript
test("reference optimization predicts one input for two or more images", () => {
  assert.equal(generationUtils.effectiveReferenceCount?.(0, true), 0);
  assert.equal(generationUtils.effectiveReferenceCount?.(1, true), 1);
  assert.equal(generationUtils.effectiveReferenceCount?.(8, true), 1);
  assert.equal(generationUtils.effectiveReferenceCount?.(8, false), 8);
});

test("batch CNY quote uses the shared requested formula", () => {
  const view = generationUtils.formatGenerationCostEstimate?.({
    currency: "CNY", exact: true,
    reference: { unit_price: 0.1, free_quantity: 0, billable_count: 1, subtotal: 0.1 },
    generation: { unit_price: 0.395, subtotal: 0.395 },
    per_task_total: 0.495, task_count: 4, total: 1.98, savings: 2.8,
  });
  assert.equal(view.formula, "（参考图 ¥0.10 × 1 + 生成 ¥0.395）× 4 张 = 预计 ¥1.98");
  assert.match(view.detail, /预计节省 ¥2.80/);
});

test("token fallback and unavailable quote never pretend to be exact zero", () => {
  const fallback = generationUtils.formatGenerationCostEstimate?.({
    currency: "USD", exact: false, used_fallback: true,
    reference: { unit_price: null, billable_count: 0, subtotal: null },
    generation: { unit_price: 0.0672, subtotal: 0.0672 },
    per_task_total: 0.0672, task_count: 1, total: 0.0672, savings: null,
  });
  assert.match(fallback.formula, /约 \$0\.0672/);
  const unavailable = generationUtils.formatGenerationCostEstimate?.({
    currency: "USD", exact: false, total: null, unavailable_reason: "缺少可用回退价",
  });
  assert.match(unavailable.formula, /暂无法精确预估/);
});
```

- [ ] **Step 2: 运行 Node 测试确认函数不存在**

Run:

```powershell
node --test tests/test_generation_utils.js
```

Expected: 新增测试 FAIL，已有测试 PASS。

- [ ] **Step 3: 实现无 DOM、无模型名称分支的共享函数**

```javascript
function effectiveReferenceCount(originalCount, optimizationEnabled) {
  const count = Math.max(0, Number(originalCount) || 0);
  return optimizationEnabled && count >= 2 ? 1 : count;
}

function currencyText(value, currency, { approximate = false } = {}) {
  const symbol = currency === "CNY" ? "¥" : currency === "USD" ? "$" : `${currency || ""} `;
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "";
  const digits = Math.abs(amount) >= 1 ? 2 : Math.min(4, Math.max(2, String(amount).split(".")[1]?.length || 2));
  return `${approximate ? "约 " : ""}${symbol}${amount.toFixed(digits)}`;
}

function generationOptimizationText(originalCount, effectiveCount, enabled) {
  const original = Math.max(0, Number(originalCount) || 0);
  const effective = Math.max(0, Number(effectiveCount) || 0);
  if (original <= 1) return "当前无需合并";
  if (!enabled) return `将按 ${original} 张参考图分别提交`;
  return `将 ${original} 张参考图合并为 ${effective} 张实际输入`;
}

function formatGenerationCostEstimate(estimate) {
  const currency = String(estimate?.currency || "CNY").toUpperCase();
  if (!Number.isFinite(Number(estimate?.total))) {
    return {
      formula: `暂无法精确预估${estimate?.unavailable_reason ? `：${estimate.unavailable_reason}` : ""}`,
      detail: "",
      tone: "unavailable",
    };
  }
  if (estimate?.used_fallback) {
    return {
      formula: `供应商回退估价：${currencyText(estimate.total, currency, { approximate: true })}`,
      detail: "实际 Token 用量可能导致最终价格不同",
      tone: "approximate",
    };
  }
  const reference = estimate.reference || {};
  const generation = estimate.generation || {};
  const referencePrice = currencyText(reference.unit_price, currency);
  const generationPrice = currencyText(generation.unit_price, currency);
  const totalPrice = currencyText(estimate.total, currency);
  const taskCount = Math.max(1, Number(estimate.task_count) || 1);
  const referenceFormula = reference.unit_price == null || !Number.isFinite(Number(reference.unit_price))
    ? "参考图不单独计费"
    : Number(reference.free_quantity || 0) > 0
      ? `参考图首张免费，后续 ${referencePrice} × ${Number(reference.billable_count || 0)}`
      : `参考图 ${referencePrice} × ${Number(reference.billable_count || 0)}`;
  const perTask = `${referenceFormula} + 生成 ${generationPrice}`;
  const formula = taskCount > 1
    ? `（${perTask}）× ${taskCount} 张 = 预计 ${totalPrice}`
    : `${perTask} = 预计 ${totalPrice}`;
  const savings = Number(estimate.savings);
  return {
    formula,
    detail: Number.isFinite(savings) && savings > 0
      ? `预计节省 ${currencyText(savings, currency)}`
      : "",
    tone: estimate.exact === false ? "approximate" : "exact",
  };
}
```

把 `effectiveReferenceCount`、`generationOptimizationText` 和 `formatGenerationCostEstimate` 加入模块 `return` 导出；函数只返回纯文本，HTML 转义继续由调用方处理。

- [ ] **Step 4: 运行共享工具测试**

Run:

```powershell
node --test tests/test_generation_utils.js
```

Expected: 全部 PASS。

---

### Task 6: 两个既有生成面板接入同一优化控件和报价调度

**Files:**
- Modify: `app/index.html:1090-1160, 2320-2330`
- Modify: `app/app.js:1-15, 130-175, 4440-4840, 6070-6140, 6415-6450, 21750-22170`
- Modify: `app/styles.css:13200-13250, 13600-13740, 15980-16180`
- Create: `tests/test_generation_cost_ui.js`

**Interfaces:**
- Consumes: Task 4 的 `POST /api/v1/generation/estimate`。
- Consumes: Task 5 的三个共享纯函数。
- Produces: 两个面板的 `optimize_reference_images` 提交参数和统一价格摘要 DOM。

- [ ] **Step 1: 写结构守护测试**

`tests/test_generation_cost_ui.js` 读取 HTML 与 JS 源码并断言：

```javascript
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "app", "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "app", "app.js"), "utf8");

test("asset generation exposes shared optimization and estimate controls", () => {
  assert.match(html, /id="aiReferenceOptimizationInput"[^>]*checked/);
  assert.match(html, /id="aiGenerationCostEstimate"/);
});

test("style generation uses the same shared controls without a footer cancel button", () => {
  assert.match(app, /renderGenerationReferenceOptimizationControl\("style"/);
  assert.match(app, /renderGenerationCostEstimateContainer\("style"/);
  const panel = app.slice(app.indexOf("function renderStyleGenerationPanel"), app.indexOf("function syncStyleGenerationCapabilityControls"));
  assert.doesNotMatch(panel, />取消<\/button>/);
});

test("both submissions persist the reference optimization flag", () => {
  assert.match(app, /optimize_reference_images:\s*seedRecord\?\.params\?\.optimize_reference_images[\s\S]{0,100}styleReferenceOptimizationEnabled\(\)/);
  assert.match(app, /optimize_reference_images:\s*aiReferenceOptimizationEnabled\(\)/);
});
```

- [ ] **Step 2: 运行结构测试确认控件尚不存在**

Run:

```powershell
node --test tests/test_generation_cost_ui.js
```

Expected: FAIL，缺少资产控件、风格共享 renderer 和提交参数。

- [ ] **Step 3: 建立共享状态与标记 renderer**

在 `state.aiCreation` 增加：

```javascript
referenceOptimizationEnabled: true,
styleReferenceOptimizationEnabled: true,
costEstimate: null,
styleCostEstimate: null,
costEstimateRequestId: 0,
styleCostEstimateRequestId: 0,
costEstimateTimer: null,
styleCostEstimateTimer: null,
```

共享 renderer 固定输出相同类名：

```javascript
function renderGenerationReferenceOptimizationControl(scope, enabled = true) {
  const inputId = scope === "style" ? "styleReferenceOptimizationInput" : "aiReferenceOptimizationInput";
  const hintId = scope === "style" ? "styleReferenceOptimizationHint" : "aiReferenceOptimizationHint";
  return `<label class="generation-reference-optimization"><input id="${inputId}" type="checkbox" ${enabled ? "checked" : ""}><span><strong>合并参考图以节省费用</strong><small id="${hintId}">当前无需合并</small></span></label>`;
}

function renderGenerationCostEstimateContainer(scope) {
  const id = scope === "style" ? "styleGenerationCostEstimate" : "aiGenerationCostEstimate";
  return `<div id="${id}" class="generation-cost-estimate" aria-live="polite"><span>正在计算预计价格…</span></div>`;
}
```

资产静态 HTML 使用同样的类名和 ID；风格动态面板调用上述 renderer。价格容器必须紧跟各自生成按钮之后。

把 `aiReferenceOptimizationInput`、`aiReferenceOptimizationHint` 和 `aiGenerationCostEstimate` 加入现有 `els` ID 注册数组；动态风格控件继续通过 `document.getElementById` 获取，避免把不存在于初始 HTML 的节点缓存为 `null`。

- [ ] **Step 4: 实现唯一报价请求与两个上下文适配器**

共享请求函数：

```javascript
async function requestGenerationCostEstimate({ model, params, originalCount, optimizationEnabled, taskCount }) {
  return apiJson("/api/v1/generation/estimate", {
    method: "POST",
    body: {
      model,
      params,
      original_reference_count: originalCount,
      effective_reference_count: effectiveReferenceCount(originalCount, optimizationEnabled),
      task_count: taskCount,
    },
  });
}
```

建立 `scheduleStyleGenerationCostEstimate()` 与 `scheduleAiGenerationCostEstimate()` 两个轻量上下文适配器，但二者必须调用同一个请求函数和同一个 `paintGenerationCostEstimate(host, estimate, counts)`；只允许在“如何读取当前 DOM/指导包预览引用数”上不同。

资产参考图计数必须把 `selectedAiReferenceRecords()`、本地文件和 `state.aiCreation.styleGuidePreview.references` 按相对路径/引用 ID 去重。使用以下稳定 key helper：

```javascript
function generationLocalFileKey(file, index) {
  return `local:${index}:${file?.name || "image"}:${Number(file?.size || 0)}:${Number(file?.lastModified || 0)}`;
}

function aiGenerationReferenceKeys() {
  const keys = [
    ...selectedAiReferenceRecords().map((record) => `path:${aiReferenceRecordPath(record)}`),
    ...Array.from(els.aiReferenceImageInput?.files || []).map(generationLocalFileKey),
    ...(state.aiCreation.styleGuidePreview?.references || []).map((reference) => (
      `path:${reference.relative_path || reference.id || reference.remote_asset_id || ""}`
    )),
  ].filter((key) => key !== "path:");
  return Array.from(new Set(keys));
}

function styleGenerationReferenceKeys() {
  return Array.from(new Set([
    ...selectedStyleReferencePaths().map((path) => `path:${path}`),
    ...Array.from(document.getElementById("styleReferenceInput")?.files || []).map(generationLocalFileKey),
  ]));
}
```

报价调度使用 160ms debounce 和递增 request ID，旧响应不得覆盖新配置。`paintGenerationCostEstimate` 调用共享 formatter，并用 `textContent` 写公式和节省说明，不拼接未转义的后端字符串。

每个适配器在请求前把对应容器设为“正在计算预计价格…”，在 `catch` 中设置 `.is-error` 和“价格预估失败：安全错误信息”，但不得改变生成按钮原有的模型、提示词、指导包和参考图可用性判断；新 request ID 产生后，旧请求的成功或失败结果都直接丢弃。

- [ ] **Step 5: 绑定所有价格依赖项并更新提交参数**

触发报价更新的事件：

- 风格：模型、比例、分辨率、参考图、优化开关、背景变化和生成面板打开；
- 资产：模型、比例、分辨率、生成数量、参考图、优化开关、风格指导包预览与生成浮层打开；
- 模型列表重新加载后两个打开中的面板重新报价。

模型参考图上限、提示与按钮可用性全部改用预计实际输入数，而不是原始选择数：

```javascript
function styleReferenceOptimizationEnabled() {
  return document.getElementById("styleReferenceOptimizationInput")?.checked !== false;
}

function aiReferenceOptimizationEnabled() {
  return els.aiReferenceOptimizationInput?.checked !== false;
}

const originalCount = styleGenerationReferenceKeys().length;
const effectiveCount = effectiveReferenceCount(originalCount, styleReferenceOptimizationEnabled());
const exceedsLimit = effectiveCount > styleModelReferenceLimit();
```

资产对应逻辑使用 `aiGenerationReferenceKeys().length` 与 `aiModelReferenceLimit()`。数量标签继续显示原始选择数，同时优化提示显示实际输入数；只有 `effectiveCount > limit` 才禁用生成。`generateStyleImage` 和 `submitAiImageGeneration` 的提交前检查也使用相同 effective count，服务端仍按 Task 4 的实际结果做最终校验。

风格提交参数增加：

```javascript
optimize_reference_images: seedRecord?.params?.optimize_reference_images
  ?? styleReferenceOptimizationEnabled(),
```

资产新任务参数增加：

```javascript
optimize_reference_images: aiReferenceOptimizationEnabled(),
```

重试已有资产记录继续使用 `record.params`，不读取当前面板开关。

- [ ] **Step 6: 删除风格底部取消并统一 CSS**

风格操作区只保留一个主按钮。CSS 必须覆盖：

```css
.generation-reference-optimization {
  min-width: 0;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 0 2px;
  color: var(--ink);
  cursor: pointer;
}
.generation-reference-optimization > input {
  width: 14px;
  height: 14px;
  margin: 1px 0 0;
  accent-color: var(--sunny-blue);
}
.generation-reference-optimization > span {
  min-width: 0;
  display: grid;
  gap: 2px;
}
.generation-reference-optimization strong { font-size: 11px; font-weight: 700; }
.generation-reference-optimization small { color: var(--muted); font-size: 10px; line-height: 1.35; }
.generation-cost-estimate {
  display: grid;
  gap: 2px;
  padding-top: 7px;
  color: var(--ink);
  font-size: 11px;
  line-height: 1.45;
  font-variant-numeric: tabular-nums;
}
.generation-cost-estimate.is-unavailable { color: var(--muted); }
.generation-cost-estimate.is-error { color: var(--sunny-red-deep); }
.generation-cost-estimate small { color: var(--sunny-blue-deep); font-size: 10px; }
.style-generation-actions > .primary-button { width: 100%; }
```

使用现有颜色变量、边框、字号和间距；不新增装饰性渐变或大卡片底板。

- [ ] **Step 7: 运行前端单测与语法检查**

Run:

```powershell
node --test tests/test_generation_utils.js tests/test_generation_cost_ui.js tests/test_style_guide_generation.js tests/test_ai_production_reuse.js
node --check app/app.js
```

Expected: 所有测试 PASS；`node --check` 无输出且退出码 0。

---

### Task 7: 完整相关回归与 8895 页面验收

**Files:**
- Verify only: all files modified in Tasks 1-6

**Interfaces:**
- Consumes: 完整实现。
- Produces: L3 验证证据和最终交付报告。

- [ ] **Step 1: 运行 Python 精准测试**

Run:

```powershell
.venv-ai\Scripts\python.exe -m pytest tests/test_omnigen_service.py -q
```

Expected: 全部 PASS。

- [ ] **Step 2: 运行关联后端回归**

Run:

```powershell
.venv-ai\Scripts\python.exe -m pytest tests/test_style_guide_service.py tests/test_style_guide_visual_service.py tests/test_project_service.py -q
```

Expected: 全部 PASS；风格指导包编译、视觉运行和项目文件路径行为无回归。

- [ ] **Step 3: 运行全部前端 Node 测试**

Run:

```powershell
node --test tests/*.js
```

Expected: 全部 PASS。

- [ ] **Step 4: 运行强制语法检查**

Run:

```powershell
node --check app/app.js
.venv-ai\Scripts\python.exe -m py_compile server.py omnigen_service.py
```

Expected: 两个命令均无输出且退出码 0。

- [ ] **Step 5: 确认 8895 服务并执行浏览器关键路径**

先访问：

```text
http://127.0.0.1:8895/app/index.html
```

若服务未运行，只在本任务已获实施确认的范围内启动根目录服务；不得启动 8894 归档工作树。

浏览器验证以下 16 个场景，并记录每项结果：

1. 风格生成零参考图显示“当前无需合并”和纯生成价格；
2. 单参考图不生成拼图，价格含一张参考图费；
3. 两参考图默认显示合并为一张及节省金额；
4. 多张横竖混合参考图生成的联系表完整容纳主体；
5. 关闭优化后公式恢复多张输入费用；
6. 相同组合再次生成复用拼图与远端素材缓存；
7. 损坏或丢失图片阻止提交且不静默多图计费；
8. GPT Image 在 1K/2K/4K 间正确切换价格；
9. Seedream 首张免费和 1K/2K 像素档位正确；
10. Token 模型显示供应商回退估价或明确无法精确预估；
11. 资产生成 1/2/4/8 张时整批总价正确；
12. 风格指导包引用加入参考图总数、优化与价格；
13. 两个面板的控件、字号、间距和状态一致；
14. 生成历史同时保留原图、实际输入和报价快照；
15. 重新生成沿用原优化设置；
16. 风格底部无取消按钮，右上关闭正常且不取消已提交任务。

- [ ] **Step 6: 检查差异与工作树边界**

Run:

```powershell
git diff --check
git status --short
git diff -- docs/GENERATION_RULES.zh-CN.md omnigen_service.py server.py app/generation-utils.js app/index.html app/app.js app/styles.css tests/test_omnigen_service.py tests/test_generation_utils.js tests/test_generation_cost_ui.js
```

Expected: `git diff --check` 无错误；差异只包含本计划内容和实施前已经存在、且未被覆盖的用户改动。

- [ ] **Step 7: 交付报告**

报告必须列出：

- 修改与新增文件；
- 16 个场景的实际结果；
- Python、Node、语法检查的命令和通过数量；
- 页面是否需要刷新或服务是否重启；
- 可点击且仍可访问的预览链接 `http://127.0.0.1:8895/app/index.html`；
- 未触碰的已有工作树改动。
