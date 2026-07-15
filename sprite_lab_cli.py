import argparse
import json
import os
import sys
from pathlib import Path

from project_service import ProjectError, ProjectService


def parse_json(value: str, expected_type: type, label: str):
    try:
        payload = json.loads(value)
    except json.JSONDecodeError as exc:
        raise argparse.ArgumentTypeError(f"{label} must be valid JSON: {exc}") from exc
    if not isinstance(payload, expected_type):
        raise argparse.ArgumentTypeError(f"{label} must decode to {expected_type.__name__}")
    return payload


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Sprite Forge Lab project automation CLI")
    parser.add_argument(
        "--work-dir",
        default=os.environ.get("SPRITE_VIDEO_LAB_WORK_DIR", str(Path(__file__).resolve().parent / "work")),
        help="Application work directory containing project-registry.json",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("list-projects", help="List registered projects")

    create = subparsers.add_parser("create-project", help="Create a file-backed project")
    create.add_argument("--name", required=True)
    create.add_argument("--slug", required=True)
    create.add_argument("--parent", default="")
    create.add_argument("--type", default="game-art")
    create.add_argument("--aspect-ratio", default="1:1")
    create.add_argument("--description", default="")

    dashboard = subparsers.add_parser("dashboard", help="Read project progress")
    dashboard.add_argument("project_id")

    events = subparsers.add_parser("events", help="Read project audit events")
    events.add_argument("project_id")
    events.add_argument("--limit", type=int, default=100)

    create_workflow = subparsers.add_parser("create-workflow", help="Create an auditable workflow run")
    create_workflow.add_argument("project_id")
    create_workflow.add_argument("--request", required=True)
    create_workflow.add_argument("--actor", default="agent")
    create_workflow.add_argument("--steps", default="[]")
    create_workflow.add_argument("--idempotency-key", default="")

    list_workflows = subparsers.add_parser("list-workflows", help="List workflow runs")
    list_workflows.add_argument("project_id")
    list_workflows.add_argument("--limit", type=int, default=100)

    update_workflow = subparsers.add_parser("update-workflow", help="Update a workflow run")
    update_workflow.add_argument("project_id")
    update_workflow.add_argument("run_id")
    update_workflow.add_argument("--status", choices=["planned", "running", "succeeded", "failed", "canceled"])
    update_workflow.add_argument("--steps")
    update_workflow.add_argument("--outputs")
    update_workflow.add_argument("--error")
    update_workflow.add_argument("--retry-count", type=int)
    update_workflow.add_argument("--actor", default="agent")

    lifecycle = subparsers.add_parser("set-result-status", help="Update generation result lifecycle")
    lifecycle.add_argument("project_id")
    lifecycle.add_argument("status", choices=["normal", "selected", "confirmed", "archived", "in_library", "trashed"])
    lifecycle.add_argument("record_ids", nargs="+")
    lifecycle.add_argument("--actor", default="agent")

    ingest = subparsers.add_parser("ingest-library", help="Copy generation results into asset management")
    ingest.add_argument("project_id")
    ingest.add_argument("record_ids", nargs="+")
    ingest.add_argument("--actor", default="agent")

    integration = subparsers.add_parser("configure-integration", help="Bind a formal project directory")
    integration.add_argument("project_id")
    integration.add_argument("--target-root", required=True)
    integration.add_argument("--mappings", default="{}")
    integration.add_argument("--actor", default="agent")

    preflight = subparsers.add_parser("preflight", help="Preflight formal project deployment")
    preflight.add_argument("project_id")
    preflight.add_argument("asset_ids", nargs="*")

    deploy = subparsers.add_parser("deploy", help="Deploy asset-management files to the formal project")
    deploy.add_argument("project_id")
    deploy.add_argument("asset_ids", nargs="*")
    deploy.add_argument("--actor", default="agent")
    deploy.add_argument("--idempotency-key", required=True)
    return parser


def execute(service: ProjectService, args: argparse.Namespace):
    if args.command == "list-projects":
        return service.list_projects()
    if args.command == "create-project":
        return service.create_project(
            display_name=args.name,
            slug=args.slug,
            parent_path=args.parent,
            project_type=args.type,
            aspect_ratio=args.aspect_ratio,
            description=args.description,
        )
    if args.command == "dashboard":
        return service.project_dashboard(args.project_id)
    if args.command == "events":
        return service.list_events(args.project_id, limit=args.limit)
    if args.command == "create-workflow":
        return service.create_workflow_run(
            args.project_id,
            actor=args.actor,
            request_text=args.request,
            steps=parse_json(args.steps, list, "steps"),
            idempotency_key=args.idempotency_key,
        )
    if args.command == "list-workflows":
        return service.list_workflow_runs(args.project_id, limit=args.limit)
    if args.command == "update-workflow":
        changes = {}
        for key in ("status", "error", "retry_count"):
            value = getattr(args, key)
            if value is not None:
                changes[key] = value
        if args.steps is not None:
            changes["steps"] = parse_json(args.steps, list, "steps")
        if args.outputs is not None:
            changes["outputs"] = parse_json(args.outputs, dict, "outputs")
        return service.update_workflow_run(
            args.project_id, args.run_id, changes=changes, actor=args.actor
        )
    if args.command == "set-result-status":
        return service.update_generation_lifecycle(
            args.project_id,
            record_ids=args.record_ids,
            lifecycle_status=args.status,
            actor=args.actor,
        )
    if args.command == "ingest-library":
        return service.ingest_library_assets(
            args.project_id, record_ids=args.record_ids, actor=args.actor
        )
    if args.command == "configure-integration":
        return service.update_integration(
            args.project_id,
            target_root=args.target_root,
            mappings=parse_json(args.mappings, dict, "mappings"),
            actor=args.actor,
        )
    if args.command == "preflight":
        return service.integration_preflight(args.project_id, args.asset_ids or None)
    if args.command == "deploy":
        return service.deploy_library_assets(
            args.project_id,
            args.asset_ids or None,
            actor=args.actor,
            idempotency_key=args.idempotency_key,
        )
    raise ProjectError(f"Unsupported command: {args.command}")


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        result = execute(ProjectService(Path(args.work_dir)), args)
    except (argparse.ArgumentTypeError, ProjectError, OSError, ValueError) as exc:
        print(json.dumps({"ok": False, "error": str(exc)}, ensure_ascii=False), file=sys.stderr)
        return 1
    print(json.dumps({"ok": True, "result": result}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
