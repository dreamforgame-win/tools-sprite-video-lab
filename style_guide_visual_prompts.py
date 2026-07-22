"""Deterministic prompts for game-art visual guide generation."""

from __future__ import annotations


MODULE_LABELS = {
    "environment": "场景与环境",
    "character": "角色与生物",
    "ui_hud": "UI / HUD",
    "skill_vfx": "技能与 VFX",
    "props_equipment": "道具与装备",
}

MODULE_DIRECTIONS = {
    "environment": "场景与环境设计展示，包含构图、空间层级、材质、光照、地表与建筑语言",
    "character": "角色与生物设计展示，包含剪影、比例、服装、材质、姿态与表情语言",
    "ui_hud": "UI / HUD 设计展示，包含布局、框体、按钮、图标、色彩层级与信息密度",
    "skill_vfx": "技能与 VFX 设计展示，包含起手、爆发、拖尾、命中、消散与可读性",
    "props_equipment": "道具与装备设计展示，包含轮廓、材料、稀有度、功能结构与使用痕迹",
}

TEMPLATE_VARIANTS = ("compact", "detailed")
TEMPLATE_VARIANT_LABELS = {
    "compact": "简略版",
    "detailed": "详细版",
}

DETAIL_PROFILE_DEFAULT = "compact"
DETAIL_PROFILES = {
    "compact": {
        "label": "精简（小游戏推荐）",
        "prompt": (
            "生产规格：小游戏精简档。以手机 720p/1080p 游戏画面和约 96–128px 资产显示尺寸验收；"
            "先读轮廓与功能，再读大色块，最后只保留少量必要材质提示。每个主体使用约 2–3 个主要形体块，"
            "主要材质不超过 2 种，标志性装饰不超过 1 个；使用宽边缘、清晰明暗分组和充足留白。"
            "参考图只继承媒介、色板和形状语言，不继承过量表面细节。只展示少量代表性样例，不做局部放大。"
        ),
        "negative": (
            "避免密集雕花、细碎纹理、重复小图案、过多挂件、复杂衣褶、磨损颗粒、微小刻痕、"
            "高频噪点、无生产价值的局部特写和为填满画面而添加的装饰。"
        ),
    },
    "standard": {
        "label": "标准",
        "prompt": (
            "生产规格：标准移动端档。保持轮廓、功能和主色块优先，在中等显示尺寸下允许适量材质变化与次级结构；"
            "装饰必须服务角色识别、交互功能或世界观，不为展示复杂度而堆叠。"
        ),
        "negative": "避免无主次的纹理堆叠、重复微小装饰和遮蔽功能轮廓的表面噪声。",
    },
    "rich": {
        "label": "丰富（概念展示）",
        "prompt": (
            "生产规格：概念展示丰富档。允许更完整的材质、次级结构和装饰变化，用于近距离概念评审；"
            "仍需保持清楚的信息层级、统一轮廓语言和可执行的资产结构。"
        ),
        "negative": "避免无层级的随机细节、互相冲突的材质语言和无法转化为实际资产的装饰堆积。",
    },
}

COMPACT_MODULE_CONSTRAINTS = {
    "environment": "场景使用少量大形体建立前中后层级，降低道具密度，保留清楚通道与交互区域。",
    "character": "角色在约 128px 显示尺寸下仍能凭轮廓辨认；服装使用大色块，最多一个标志配件，减少衣褶与小挂件。",
    "ui_hud": "UI 使用大触控区、粗边框、少层级与清楚状态差异，不使用微型花边或密集图标装饰。",
    "skill_vfx": "特效使用一个核心形状、一层主要拖尾和有限粒子，优先表现作用范围、方向与命中时机。",
    "props_equipment": "道具优先功能轮廓，采用一主一辅材质，最多一个装饰母题，不用磨损颗粒填充表面。",
}

NEGATIVE_CONSTRAINTS = (
    "不生成标题，不生成标签，不生成说明文字，不生成可读文字，不生成伪文字，"
    "不生成水印、品牌标志、签名、二维码或界面占位乱码；避免照片拼贴、风格漂移、"
    "不相关题材、重复主体、裁切主体和低清晰度。"
)

COMPACT_SAMPLE_DIRECTIONS = {
    "anchor": "生成一个统一世界观的完整代表性画面",
    "environment": "生成一个完整、可读的原创游戏场景",
    "character": "生成一个原创完整角色或生物，使用单一自然姿态和简单背景",
    "ui_hud": "生成一个完整代表性界面组件或局部界面，不包含可读文字",
    "skill_vfx": "生成一个完整独立特效，并让背景与效果保持清楚对比",
    "props_equipment": "生成一个完整原创道具或装备，居中清楚展示",
}

COMPACT_LAYOUT_BANS = (
    "禁止色卡；禁止文字；禁止多格排版；禁止转面；禁止表情合集；"
    "禁止局部放大；禁止资产堆叠；禁止照搬参考图主体、身份、姿势、构图和背景。"
)


def _clean(value: object) -> str:
    return " ".join(str(value or "").strip().split())


def normalize_template_variants(values: object = None) -> list[str]:
    requested = ["compact"] if values is None else values
    if not isinstance(requested, (list, tuple, set)):
        raise ValueError("Style template variants must be an array")
    normalized = {
        _clean(value).lower() for value in requested if _clean(value)
    }
    unknown = normalized.difference(TEMPLATE_VARIANTS)
    if unknown:
        raise ValueError(f"Unknown style template variant: {sorted(unknown)[0]}")
    result = [value for value in TEMPLATE_VARIANTS if value in normalized]
    if not result:
        raise ValueError("至少选择一种模板规格")
    return result


def _validate_modules(module_types: list[str] | tuple[str, ...]) -> list[str]:
    normalized = []
    for module_type in module_types or []:
        value = _clean(module_type)
        if value not in MODULE_LABELS:
            raise ValueError(f"Unknown visual guide module: {value}")
        if value not in normalized:
            normalized.append(value)
    return [value for value in MODULE_LABELS if value in normalized]


def normalize_detail_profile(value: object = DETAIL_PROFILE_DEFAULT) -> str:
    normalized = _clean(value).lower() or DETAIL_PROFILE_DEFAULT
    if normalized not in DETAIL_PROFILES:
        raise ValueError(f"Unknown visual guide detail profile: {normalized}")
    return normalized


def detail_profile_prompt(
    detail_profile: object = DETAIL_PROFILE_DEFAULT, module_type: str = ""
) -> str:
    profile = normalize_detail_profile(detail_profile)
    module_constraint = (
        COMPACT_MODULE_CONSTRAINTS.get(module_type, "") if profile == "compact" else ""
    )
    return f"{DETAIL_PROFILES[profile]['prompt']}{module_constraint}"


def detail_profile_negative(detail_profile: object = DETAIL_PROFILE_DEFAULT) -> str:
    profile = normalize_detail_profile(detail_profile)
    return str(DETAIL_PROFILES[profile]["negative"])


def _master_prompt(
    title: str, description: str, detail_profile: object = DETAIL_PROFILE_DEFAULT
) -> str:
    title_text = _clean(title) or "未命名风格方向"
    description_text = _clean(description)
    direction = f"；方向说明：{description_text}" if description_text else ""
    return (
        f"为游戏美术生产制作原创视觉指导图，风格方向：{title_text}{direction}。"
        "参考输入图的媒介、色板、形状语言、材质、光照与笔触；细节密度必须服从本次生产规格。"
        "设计全新的游戏资产，不临摹现有角色或构图。使用中性专业展示背景，"
        f"画面清晰、结构有序、同一世界观与制作规格贯穿全部内容。{detail_profile_prompt(detail_profile)}"
    )


def build_anchor_prompt(
    title: str, description: str, detail_profile: object = DETAIL_PROFILE_DEFAULT
) -> str:
    negative = f"{NEGATIVE_CONSTRAINTS}{detail_profile_negative(detail_profile)}"
    return (
        f"{_master_prompt(title, description, detail_profile)}制作一张视觉基因锚点图，集中展示核心色板、"
        "主次轮廓、比例、主要材质、照明和少量贯穿母题；"
        f"它将作为后续场景、角色、UI、技能与道具的统一视觉依据。{negative}"
    )


def build_module_prompt(
    title: str,
    description: str,
    module_type: str,
    detail_profile: object = DETAIL_PROFILE_DEFAULT,
) -> str:
    modules = _validate_modules([module_type])
    selected = modules[0]
    profile = normalize_detail_profile(detail_profile)
    module_constraint = (
        COMPACT_MODULE_CONSTRAINTS.get(selected, "") if profile == "compact" else ""
    )
    examples = (
        "保持同一套视觉基因，只展示少量有明确生产价值的代表性样例，不做局部放大，"
        if profile == "compact"
        else "保持同一套视觉基因，展示有明确差异且层级清楚的设计样例，"
    )
    negative = f"{NEGATIVE_CONSTRAINTS}{detail_profile_negative(profile)}"
    return (
        f"{_master_prompt(title, description, profile)}"
        f"{module_constraint}只制作{MODULE_DIRECTIONS[selected]}。"
        f"{examples}不混入其他专业模块的完整设计板。{negative}"
    )


def build_overall_prompt(
    title: str,
    description: str,
    module_types: list[str] | tuple[str, ...],
    detail_profile: object = DETAIL_PROFILE_DEFAULT,
) -> str:
    modules = _validate_modules(module_types)
    if not modules:
        raise ValueError("Overall visual guide requires at least one module")
    module_text = "、".join(MODULE_LABELS[value] for value in modules)
    profile = normalize_detail_profile(detail_profile)
    module_constraints = (
        "".join(COMPACT_MODULE_CONSTRAINTS.get(module_type, "") for module_type in modules)
        if profile == "compact"
        else ""
    )
    negative = f"{NEGATIVE_CONSTRAINTS}{detail_profile_negative(profile)}"
    return (
        f"{_master_prompt(title, description, profile)}{module_constraints}"
        f"制作一张综合游戏美术视觉指导图，内容仅包含：{module_text}。"
        "以一套清晰视觉基因贯穿所有区域，各区域边界明确、比例合理，重点展示可直接指导资产生产的设计样例。"
        f"{negative}"
    )


def _compact_sample_prompt(
    title: str,
    description: str,
    node_key: str,
    detail_profile: object = DETAIL_PROFILE_DEFAULT,
) -> str:
    if node_key not in COMPACT_SAMPLE_DIRECTIONS:
        raise ValueError(f"Unknown compact style template node: {node_key}")
    title_text = _clean(title) or "未命名风格方向"
    description_text = _clean(description)
    direction_text = f"方向说明：{description_text}。" if description_text else ""
    module_type = node_key if node_key in MODULE_LABELS else ""
    return (
        f"为游戏美术生产创建纯净风格样例。风格方向：{title_text}。{direction_text}"
        f"{COMPACT_SAMPLE_DIRECTIONS[node_key]}。只继承参考图的比例体系、形状语言、线条、"
        "色彩关系、明暗、材质表达和细节密度，不继承参考图的内容职责。"
        f"{detail_profile_prompt(detail_profile, module_type)}"
        f"{COMPACT_LAYOUT_BANS}{NEGATIVE_CONSTRAINTS}"
        f"{detail_profile_negative(detail_profile)}"
    )


def prompt_bundle(
    *,
    title: str,
    description: str,
    mode: str,
    module_types: list[str],
    detail_profile: object = DETAIL_PROFILE_DEFAULT,
    template_variant: object = "detailed",
) -> dict:
    normalized_mode = _clean(mode).lower()
    if normalized_mode not in {"overall", "modular"}:
        raise ValueError(f"Unknown visual guide mode: {normalized_mode}")
    modules = _validate_modules(module_types)
    if normalized_mode == "overall" and not modules:
        raise ValueError("Overall visual guide requires at least one module")
    profile = normalize_detail_profile(detail_profile)
    variant = normalize_template_variants([template_variant])[0]
    master = (
        _compact_sample_prompt(title, description, "anchor", profile)
        if variant == "compact"
        else _master_prompt(title, description, profile)
    )
    negative = f"{NEGATIVE_CONSTRAINTS}{detail_profile_negative(profile)}"
    if variant == "compact":
        anchor = (
            _compact_sample_prompt(title, description, "anchor", profile)
            if normalized_mode == "modular"
            else ""
        )
        overall = (
            _compact_sample_prompt(title, description, "anchor", profile)
            if normalized_mode == "overall"
            else ""
        )
        module_prompts = (
            {
                value: _compact_sample_prompt(
                    title, description, value, profile
                )
                for value in modules
            }
            if normalized_mode == "modular"
            else {value: MODULE_LABELS[value] for value in modules}
        )
    else:
        anchor = (
            build_anchor_prompt(title, description, profile)
            if normalized_mode == "modular"
            else ""
        )
        overall = (
            build_overall_prompt(title, description, modules, profile)
            if normalized_mode == "overall"
            else ""
        )
        module_prompts = (
            {
                value: build_module_prompt(title, description, value, profile)
                for value in modules
            }
            if normalized_mode == "modular"
            else {value: MODULE_LABELS[value] for value in modules}
        )
    return {
        "template_variant": variant,
        "prompt_version": "style-template-variants-v1",
        "mode": normalized_mode,
        "detail_profile": profile,
        "detail_label": DETAIL_PROFILES[profile]["label"],
        "detail_prompt": detail_profile_prompt(profile),
        "detail_negative": detail_profile_negative(profile),
        "master": master,
        "anchor": anchor,
        "overall": overall,
        "modules": module_prompts,
        "negative": negative,
        "reference_order": [],
    }


__all__ = [
    "DETAIL_PROFILE_DEFAULT",
    "DETAIL_PROFILES",
    "MODULE_LABELS",
    "NEGATIVE_CONSTRAINTS",
    "TEMPLATE_VARIANTS",
    "TEMPLATE_VARIANT_LABELS",
    "build_anchor_prompt",
    "build_module_prompt",
    "build_overall_prompt",
    "detail_profile_negative",
    "detail_profile_prompt",
    "normalize_detail_profile",
    "normalize_template_variants",
    "prompt_bundle",
]
