import argparse
import base64
import json
import mimetypes
import os
import sys
from pathlib import Path

from agent_processing_service import AgentProcessingService
from agent_workflow_service import AgentWorkflowService
from omnigen_service import OmniGenService
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
    subparsers.add_parser("agent-manifest", help="Read the Agent workflow protocol")

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

    create_recipe = subparsers.add_parser(
        "create-recipe", help="Create a reusable Agent workflow recipe"
    )
    create_recipe.add_argument("project_id")
    create_recipe.add_argument("--name", required=True)
    create_recipe.add_argument("--description", default="")
    create_recipe.add_argument("--steps", required=True)
    create_recipe.add_argument("--actor", default="agent")
    create_recipe.add_argument("--idempotency-key", default="")

    list_recipes = subparsers.add_parser(
        "list-recipes", help="List Agent workflow recipes"
    )
    list_recipes.add_argument("project_id")

    create_agent_run = subparsers.add_parser(
        "create-agent-run", help="Create a persistent Agent workflow run"
    )
    create_agent_run.add_argument("project_id")
    create_agent_run.add_argument("--request", required=True)
    create_agent_run.add_argument("--capabilities", default="{}")
    create_agent_run.add_argument("--policy", default="{}")
    create_agent_run.add_argument("--steps")
    create_agent_run.add_argument("--variables", default="{}")
    create_agent_run.add_argument("--recipe-id", default="")
    create_agent_run.add_argument("--recipe-version", type=int)
    create_agent_run.add_argument("--actor", default="agent")
    create_agent_run.add_argument("--idempotency-key", default="")

    get_agent_run = subparsers.add_parser(
        "get-agent-run", help="Read and advance an Agent workflow run"
    )
    get_agent_run.add_argument("project_id")
    get_agent_run.add_argument("run_id")

    submit_result = subparsers.add_parser(
        "submit-agent-result", help="Submit a structured Agent action result"
    )
    submit_result.add_argument("project_id")
    submit_result.add_argument("run_id")
    submit_result.add_argument("action_id")
    submit_result.add_argument("--result", required=True)
    submit_result.add_argument("--idempotency-key", default="")

    submit_artifact = subparsers.add_parser(
        "submit-agent-artifact", help="Submit a native Agent image artifact"
    )
    submit_artifact.add_argument("project_id")
    submit_artifact.add_argument("run_id")
    submit_artifact.add_argument("action_id")
    submit_artifact.add_argument("--file", required=True)
    submit_artifact.add_argument("--idempotency-key", default="")

    approve_agent_run = subparsers.add_parser(
        "approve-agent-run", help="Approve a paid Agent workflow action"
    )
    approve_agent_run.add_argument("project_id")
    approve_agent_run.add_argument("run_id")
    approve_agent_run.add_argument("--action-id", default="*")
    approve_agent_run.add_argument("--actor", default="user")

    cancel_agent_run = subparsers.add_parser(
        "cancel-agent-run", help="Cancel a persistent Agent workflow run"
    )
    cancel_agent_run.add_argument("project_id")
    cancel_agent_run.add_argument("run_id")
    cancel_agent_run.add_argument("--actor", default="user")

    resume_agent_run = subparsers.add_parser(
        "resume-agent-run", help="Resume a persistent Agent workflow run"
    )
    resume_agent_run.add_argument("project_id")
    resume_agent_run.add_argument("run_id")
    return parser


def build_agent_service(service: ProjectService) -> AgentWorkflowService:
    generation_services = {}

    def generation_factory(project_id: str) -> OmniGenService:
        if project_id in generation_services:
            return generation_services[project_id]
        root = service.project_root(project_id)
        paths = service.project_paths(project_id)
        generation = OmniGenService(
            root,
            settings_path=service.work_dir / "settings.json",
            profile_dir=service.work_dir / "profile",
            omnigen_dir=paths["marker"] / "generation",
            history_path=paths["generation_history"],
            results_dir=paths["production_images"],
            trash_dir=paths["trash"] / "generation",
            transaction_lock_path=paths["locks"] / "generation.transactions.lock",
            local_url_prefix=(
                f"/api/v1/projects/{project_id}/files/production/images"
            ),
        )
        generation_services[project_id] = generation
        return generation

    processing = AgentProcessingService(service, generation_factory)
    agent_service = AgentWorkflowService(
        service, generation_factory, processing_executor=processing.execute
    )
    processing.set_artifact_recorder(agent_service.register_processed_image)
    return agent_service


def execute(service: ProjectService, args: argparse.Namespace):
    if args.command == "list-projects":
        return service.list_projects()
    if args.command == "agent-manifest":
        return AgentWorkflowService.manifest()
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
    if args.command == "create-recipe":
        return build_agent_service(service).create_recipe(
            args.project_id,
            name=args.name,
            description=args.description,
            steps=parse_json(args.steps, list, "steps"),
            actor=args.actor,
            idempotency_key=args.idempotency_key,
        )
    if args.command == "list-recipes":
        return build_agent_service(service).list_recipes(args.project_id)
    if args.command == "create-agent-run":
        return build_agent_service(service).create_run(
            args.project_id,
            request_text=args.request,
            capabilities=parse_json(args.capabilities, dict, "capabilities"),
            execution_policy=parse_json(args.policy, dict, "policy"),
            recipe_id=args.recipe_id,
            recipe_version=args.recipe_version,
            steps=(
                parse_json(args.steps, list, "steps")
                if args.steps is not None
                else None
            ),
            variables=parse_json(args.variables, dict, "variables"),
            actor=args.actor,
            idempotency_key=args.idempotency_key,
        )
    if args.command == "get-agent-run":
        return build_agent_service(service).get_run(args.project_id, args.run_id)
    if args.command == "submit-agent-result":
        return build_agent_service(service).submit_action_result(
            args.project_id,
            args.run_id,
            args.action_id,
            result=parse_json(args.result, dict, "result"),
            idempotency_key=args.idempotency_key,
        )
    if args.command == "submit-agent-artifact":
        path = Path(args.file).expanduser().resolve()
        if not path.is_file():
            raise ProjectError(f"Agent artifact does not exist: {path}")
        mime_type = mimetypes.guess_type(path.name)[0] or ""
        if mime_type not in {"image/png", "image/jpeg", "image/webp"}:
            raise ProjectError("Agent artifact must be PNG, JPEG, or WebP")
        data_url = (
            f"data:{mime_type};base64,"
            f"{base64.b64encode(path.read_bytes()).decode('ascii')}"
        )
        return build_agent_service(service).submit_artifact(
            args.project_id,
            args.run_id,
            args.action_id,
            data_url=data_url,
            file_name=path.name,
            idempotency_key=args.idempotency_key,
        )
    if args.command == "approve-agent-run":
        return build_agent_service(service).approve_run(
            args.project_id,
            args.run_id,
            action_id=args.action_id,
            actor=args.actor,
        )
    if args.command == "cancel-agent-run":
        return build_agent_service(service).cancel_run(
            args.project_id, args.run_id, actor=args.actor
        )
    if args.command == "resume-agent-run":
        return build_agent_service(service).resume_run(
            args.project_id, args.run_id
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
