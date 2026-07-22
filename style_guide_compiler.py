"""Deterministic game-art style guide compilation.

This module is intentionally provider-free.  It turns one immutable published
guide version into bounded text, module and reference inputs for a generation
task without mutating the published data.
"""

from __future__ import annotations

import copy
import re
from typing import Iterable


MODE_BUDGETS = {
    "economy": {"token_budget": 450, "reference_budget": 1, "module_budget": 1},
    "balanced": {"token_budget": 900, "reference_budget": 2, "module_budget": 2},
    "precision": {"token_budget": 1600, "reference_budget": 4, "module_budget": 2},
}

ASSET_MODULE_ROUTES = {
    "environment": ["environment"],
    "scene": ["environment"],
    "architecture": ["environment"],
    "character": ["character"],
    "npc": ["character"],
    "enemy": ["character"],
    "creature": ["character"],
    "ui": ["ui_hud"],
    "hud": ["ui_hud"],
    "panel": ["ui_hud"],
    "control": ["ui_hud"],
    "skill": ["skill_vfx"],
    "spell": ["skill_vfx"],
    "skill_icon": ["skill_vfx", "ui_hud"],
    "vfx": ["skill_vfx"],
    "prop": ["props_equipment"],
    "equipment": ["props_equipment"],
    "weapon": ["props_equipment"],
}

MODULE_TYPES = {
    "environment",
    "character",
    "ui_hud",
    "skill_vfx",
    "props_equipment",
}

CONFLICT_RESOLUTIONS = {"preserve_task", "preserve_guide", "disable_rule"}


def _clamp_int(value, minimum: int, maximum: int, default: int) -> int:
    try:
        number = int(value)
    except (TypeError, ValueError):
        number = default
    return max(minimum, min(maximum, number))


def _warning(code: str, severity: str, message: str, **details) -> dict:
    return {
        "code": code,
        "severity": severity,
        "message": message,
        "details": details,
    }


def _normalized_text(value: object) -> str:
    return " ".join(re.findall(r"[\w\-]+", str(value or "").casefold()))


def _unique_strings(values: Iterable[object]) -> list[str]:
    result = []
    seen = set()
    for value in values:
        text = str(value or "").strip()
        marker = text.casefold()
        if not text or marker in seen:
            continue
        seen.add(marker)
        result.append(text)
    return result


def _split_constraints(value: object) -> list[str]:
    if isinstance(value, (list, tuple, set)):
        return _unique_strings(value)
    return _unique_strings(re.split(r"[,;\n]+", str(value or "")))


def _requested_modules(asset_type: str, module_overrides) -> tuple[list[str], bool]:
    routed = list(ASSET_MODULE_ROUTES.get(str(asset_type or "").strip().casefold(), []))
    explicit = module_overrides is not None
    if module_overrides is None:
        requested = routed
    elif isinstance(module_overrides, dict):
        if isinstance(module_overrides.get("module_types"), list):
            requested = module_overrides["module_types"]
        else:
            requested = [key for key, enabled in module_overrides.items() if enabled]
    elif isinstance(module_overrides, (list, tuple, set)):
        requested = list(module_overrides)
    else:
        requested = []
    normalized = []
    for value in requested:
        module_type = str(value or "").strip()
        if module_type in MODULE_TYPES and module_type not in normalized:
            normalized.append(module_type)
    return normalized, explicit


def _reference_score(reference: dict, seen_roles: set[str]) -> float:
    roles = {str(role) for role in reference.get("roles") or [] if str(role)}
    coverage = len(roles - seen_roles) * 30
    priority = _clamp_int(reference.get("priority"), 0, 100, 0)
    quality = _clamp_int(reference.get("quality"), 0, 100, 0)
    required = 1000 if reference.get("required") else 0
    return required + coverage + priority * 0.5 + quality * 0.2


def _select_references(candidates: list[dict], limit: int) -> list[dict]:
    selected = []
    seen_roles: set[str] = set()
    remaining = [copy.deepcopy(item) for item in candidates]
    while remaining and len(selected) < limit:
        remaining.sort(
            key=lambda item: (
                _reference_score(item, seen_roles),
                str(item.get("id") or ""),
            ),
            reverse=True,
        )
        chosen = remaining.pop(0)
        selected.append(chosen)
        seen_roles.update(str(role) for role in chosen.get("roles") or [] if str(role))
    return selected


def _reference_override_ids(reference_overrides) -> tuple[set[str] | None, set[str]]:
    if reference_overrides is None:
        return None, set()
    if isinstance(reference_overrides, dict):
        included = reference_overrides.get("include")
        excluded = reference_overrides.get("exclude") or []
    else:
        included = reference_overrides
        excluded = []
    include_ids = (
        {str(value) for value in included if str(value)}
        if isinstance(included, (list, tuple, set))
        else None
    )
    exclude_ids = (
        {str(value) for value in excluded if str(value)}
        if isinstance(excluded, (list, tuple, set))
        else set()
    )
    return include_ids, exclude_ids


def _style_fragment(text: str, strength: int) -> str:
    if not text:
        return ""
    if strength < 35:
        return f"subtle visual influence: {text}"
    if strength < 80:
        return f"style guidance: {text}"
    return f"strong style adherence: {text}"


def compile_style_guide(
    version: dict,
    *,
    asset_type: str,
    prompt: str,
    mode: str,
    model_reference_limit: int,
    module_overrides=None,
    reference_overrides=None,
    style_strength=70,
    conflict_resolutions=None,
) -> dict:
    """Compile a published guide version into deterministic generation inputs."""

    if mode not in MODE_BUDGETS:
        raise ValueError(f"Unsupported style guide mode: {mode}")
    if not isinstance(version, dict):
        raise ValueError("Published style guide version must be an object")

    source = copy.deepcopy(version)
    budget_config = MODE_BUDGETS[mode]
    strength = _clamp_int(style_strength, 0, 100, 70)
    model_limit = max(0, _clamp_int(model_reference_limit, 0, 1000, 0))
    reference_limit = min(budget_config["reference_budget"], model_limit)
    warnings: list[dict] = []
    blocking_warnings: list[dict] = []

    modules = source.get("modules") if isinstance(source.get("modules"), dict) else {}
    requested_modules, explicit_modules = _requested_modules(asset_type, module_overrides)
    if not requested_modules and not explicit_modules:
        warnings.append(
            _warning(
                "module_required",
                "warning",
                "无法识别资产类型，仅应用全局视觉基因。",
                asset_type=str(asset_type or ""),
            )
        )

    module_types = []
    selected_sections: list[tuple[str, dict]] = []
    core = source.get("core") if isinstance(source.get("core"), dict) else {}
    selected_sections.append(("core", core))
    for module_type in requested_modules[: budget_config["module_budget"]]:
        module = modules.get(module_type)
        if not isinstance(module, dict) or module.get("enabled") is False:
            item = _warning(
                "missing_module",
                "error" if mode == "precision" else "warning",
                "所选指导模块不可用。",
                module_type=module_type,
            )
            warnings.append(item)
            if mode == "precision":
                blocking_warnings.append(item)
            continue
        module_types.append(module_type)
        selected_sections.append((module_type, module))

    if len(requested_modules) > budget_config["module_budget"]:
        warnings.append(
            _warning(
                "module_limit",
                "warning",
                "所选模块超过当前档位上限，已按顺序裁剪。",
                requested=requested_modules,
                selected=module_types,
                limit=budget_config["module_budget"],
            )
        )

    forbidden_terms = []
    for _, section in selected_sections:
        forbidden_terms.extend(section.get("forbidden_terms") or [])
    forbidden_terms = _unique_strings(forbidden_terms)
    prompt_normalized = _normalized_text(prompt)
    resolutions = {
        str(key).casefold(): str(value)
        for key, value in (conflict_resolutions or {}).items()
        if str(value) in CONFLICT_RESOLUTIONS
    }
    omitted_constraints = set()
    for term in forbidden_terms:
        normalized_term = _normalized_text(term)
        if not normalized_term or normalized_term not in prompt_normalized:
            continue
        resolution = resolutions.get(str(term).casefold(), "")
        item = _warning(
            "prompt_conflict",
            "error" if resolution not in {"preserve_task", "disable_rule"} else "warning",
            "任务提示与指导规则冲突。",
            term=term,
            resolution=resolution,
        )
        warnings.append(item)
        if resolution in {"preserve_task", "disable_rule"}:
            omitted_constraints.add(str(term).casefold())
        else:
            blocking_warnings.append(item)

    section_prompt_fragments = _unique_strings(
        section.get("prompt_fragment") for _, section in selected_sections
    )
    visual_guide = version.get("visual_guide") if isinstance(version.get("visual_guide"), dict) else {}
    detail_prompt_fragment = str(visual_guide.get("detail_prompt_fragment") or "").strip()
    positive_style_parts = list(section_prompt_fragments)
    if detail_prompt_fragment and detail_prompt_fragment not in " ".join(section_prompt_fragments):
        positive_style_parts.insert(0, detail_prompt_fragment)
    style_text = _style_fragment(", ".join(positive_style_parts), strength)
    user_prompt = str(prompt or "").strip()
    max_chars = budget_config["token_budget"] * 4
    remaining_chars = max(0, max_chars - len(user_prompt) - 2)
    if len(style_text) > remaining_chars:
        style_text = style_text[:remaining_chars].rstrip(" ,;:")
        warnings.append(
            _warning(
                "text_budget",
                "warning",
                "指导文本超过当前档位预算，已裁剪风格片段。",
                token_budget=budget_config["token_budget"],
            )
        )
    positive_prompt = ", ".join(part for part in (user_prompt, style_text) if part)

    negative_parts = []
    detail_negative_fragment = str(
        visual_guide.get("detail_negative_fragment") or ""
    ).strip()
    if detail_negative_fragment:
        negative_parts.extend(_split_constraints(detail_negative_fragment))
    for _, section in selected_sections:
        negative_parts.extend(_split_constraints(section.get("negative_fragment")))
    negative_prompt = ", ".join(
        item
        for item in _unique_strings(negative_parts)
        if str(item).casefold() not in omitted_constraints
    )

    include_ids, exclude_ids = _reference_override_ids(reference_overrides)
    candidates = []
    invalid_required = []
    seen_reference_ids = set()
    for section_type, section in selected_sections:
        references = section.get("references") if isinstance(section.get("references"), list) else []
        for raw_reference in references:
            if not isinstance(raw_reference, dict):
                continue
            reference = copy.deepcopy(raw_reference)
            reference_id = str(reference.get("id") or "").strip()
            if not reference_id or reference_id in seen_reference_ids:
                continue
            seen_reference_ids.add(reference_id)
            if include_ids is not None and reference_id not in include_ids:
                continue
            if reference_id in exclude_ids:
                continue
            reference["module_type"] = section_type
            available = bool(
                str(reference.get("relative_path") or "").strip()
                or str(reference.get("remote_asset_id") or "").strip()
            ) and str(reference.get("availability") or "available") not in {
                "missing",
                "invalid",
            }
            if not available:
                if reference.get("required"):
                    invalid_required.append(reference)
                continue
            candidates.append(reference)

    for reference in invalid_required:
        code = (
            "invalid_material_id"
            if str(reference.get("availability") or "") == "invalid"
            else "missing_reference"
        )
        item = _warning(
            code,
            "error" if mode == "precision" else "warning",
            "必需参考图不可用。",
            reference_id=reference.get("id"),
        )
        warnings.append(item)
        if mode == "precision":
            blocking_warnings.append(item)

    selected_references = _select_references(candidates, reference_limit)
    if len(candidates) > reference_limit:
        selected_ids = {str(item.get("id") or "") for item in selected_references}
        omitted_required = [
            item
            for item in candidates
            if item.get("required") and str(item.get("id") or "") not in selected_ids
        ]
        item = _warning(
            "reference_limit",
            "error" if mode == "precision" and omitted_required else "warning",
            "参考图已按档位和模型数量上限裁剪。",
            candidate_count=len(candidates),
            selected_count=len(selected_references),
            limit=reference_limit,
            omitted_required_ids=[item.get("id") for item in omitted_required],
        )
        warnings.append(item)
        if mode == "precision" and omitted_required:
            blocking_warnings.append(item)

    estimated_tokens = (len(positive_prompt) + len(negative_prompt) + 3) // 4
    budget = {
        "mode": mode,
        "token_limit": budget_config["token_budget"],
        "estimated_tokens": estimated_tokens,
        "module_limit": budget_config["module_budget"],
        "reference_limit": reference_limit,
        "model_reference_limit": model_limit,
        "selected_reference_count": len(selected_references),
        "style_strength": strength,
    }
    return {
        "positive_prompt": positive_prompt,
        "negative_prompt": negative_prompt,
        "module_types": module_types,
        "references": selected_references,
        "warnings": warnings,
        "blocking_warnings": blocking_warnings,
        "can_continue": not blocking_warnings,
        "budget": budget,
    }


__all__ = [
    "ASSET_MODULE_ROUTES",
    "MODE_BUDGETS",
    "MODULE_TYPES",
    "compile_style_guide",
]
