import math
from pathlib import Path

from PIL import Image

from project_service import ProjectError, ProjectService


class AgentProcessingService:
    """Project-scoped thin adapters for automatic image processing actions."""

    def __init__(self, project_service: ProjectService, generation_service_factory):
        self.project_service = project_service
        self.generation_service_factory = generation_service_factory
        self.artifact_recorder = None

    def set_artifact_recorder(self, recorder) -> None:
        self.artifact_recorder = recorder

    @staticmethod
    def _pixels(image: Image.Image):
        flattened = getattr(image, "get_flattened_data", None)
        return flattened() if callable(flattened) else image.getdata()

    def _source_record(self, project_id: str, record_id: str) -> tuple[dict, Path]:
        record_id = str(record_id or "").strip()
        if not record_id:
            raise ProjectError("Processing action requires a generation record ID")
        service = self.generation_service_factory(project_id)
        record = service.find_record(record_id)
        if record.get("status") != "succeeded":
            raise ProjectError("Processing source generation record is not complete")
        raw_path = str(record.get("local_path") or "").strip()
        if not raw_path:
            raise ProjectError("Processing source file is unavailable")
        path = Path(raw_path).resolve()
        production_root = self.project_service.project_paths(project_id)[
            "production_images"
        ].resolve()
        if not path.is_file() or not path.is_relative_to(production_root):
            raise ProjectError(
                "Processing source must be inside the project production folder"
            )
        return record, path

    @staticmethod
    def _background_rgb(image: Image.Image) -> tuple[int, int, int]:
        rgba = image.convert("RGBA")
        width, height = rgba.size
        sample_points = (
            (0, 0),
            (max(0, width - 1), 0),
            (0, max(0, height - 1)),
            (max(0, width - 1), max(0, height - 1)),
        )
        samples = [rgba.getpixel(point)[:3] for point in sample_points]
        return tuple(
            round(sum(sample[channel] for sample in samples) / len(samples))
            for channel in range(3)
        )

    @classmethod
    def _simple_matte(cls, image: Image.Image, options: dict) -> tuple[Image.Image, dict]:
        rgba = image.convert("RGBA")
        alpha = rgba.getchannel("A")
        minimum, maximum = alpha.getextrema()
        mode = str(options.get("matte_mode") or "auto").strip().lower()
        if mode == "none" or (mode == "auto" and minimum < maximum):
            return rgba, {
                "mode": "preserve_alpha",
                "source_alpha_min": minimum,
                "source_alpha_max": maximum,
            }
        if mode not in {"auto", "chroma", "edge_connected_chroma"}:
            raise ProjectError(
                "Agent automatic matte supports auto, chroma, edge_connected_chroma, or none"
            )
        background = cls._background_rgb(rgba)
        threshold = max(0.0, min(441.0, float(options.get("threshold") or 42)))
        softness = max(1.0, min(255.0, float(options.get("softness") or 24)))
        output = Image.new("RGBA", rgba.size)
        pixels = []
        for red, green, blue, source_alpha in cls._pixels(rgba):
            distance = math.sqrt(
                (red - background[0]) ** 2
                + (green - background[1]) ** 2
                + (blue - background[2]) ** 2
            )
            if distance <= threshold:
                computed_alpha = 0
            elif distance >= threshold + softness:
                computed_alpha = source_alpha
            else:
                computed_alpha = round(
                    source_alpha * ((distance - threshold) / softness)
                )
            pixels.append((red, green, blue, computed_alpha))
        output.putdata(pixels)
        return output, {
            "mode": "chroma",
            "background_rgb": list(background),
            "threshold": threshold,
            "softness": softness,
        }

    @staticmethod
    def _foreground_mask(image: Image.Image, alpha_cutoff: int) -> tuple[bytearray, int, int]:
        rgba = image.convert("RGBA")
        width, height = rgba.size
        alpha = rgba.getchannel("A")
        minimum, maximum = alpha.getextrema()
        cutoff = max(0, min(254, int(alpha_cutoff)))
        if minimum < maximum or minimum < 255:
            mask = bytearray(
                1 if value > cutoff else 0
                for value in AgentProcessingService._pixels(alpha)
            )
            return mask, width, height
        background = AgentProcessingService._background_rgb(rgba)
        threshold = 28.0
        mask = bytearray()
        for red, green, blue, _alpha in AgentProcessingService._pixels(rgba):
            distance = math.sqrt(
                (red - background[0]) ** 2
                + (green - background[1]) ** 2
                + (blue - background[2]) ** 2
            )
            mask.append(1 if distance > threshold else 0)
        return mask, width, height

    @staticmethod
    def _segments(values: list[int], *, minimum_gap: int = 1) -> list[tuple[int, int]]:
        segments = []
        start = None
        gap = 0
        last_occupied = -1
        for index, occupied in enumerate(values):
            if occupied:
                if start is None:
                    start = index
                last_occupied = index
                gap = 0
            elif start is not None:
                gap += 1
                if gap >= minimum_gap:
                    segments.append((start, last_occupied + 1))
                    start = None
                    gap = 0
        if start is not None:
            segments.append((start, last_occupied + 1))
        return segments

    @classmethod
    def _split_regions(cls, image: Image.Image, options: dict) -> list[dict]:
        mask, width, height = cls._foreground_mask(
            image, int(options.get("alpha_cutoff") or 8)
        )
        row_counts = [
            sum(mask[(row * width) : ((row + 1) * width)])
            for row in range(height)
        ]
        strength = str(options.get("strength") or "normal").lower()
        minimum_gap = {"weak": 4, "normal": 2, "strong": 1}.get(strength, 2)
        row_bands = cls._segments(
            [1 if count else 0 for count in row_counts],
            minimum_gap=minimum_gap,
        )
        minimum_area = max(
            1,
            int(
                options.get("minimum_area")
                or max(4, round((width * height) * 0.0002))
            ),
        )
        padding = max(0, min(64, int(options.get("padding") or 0)))
        regions = []
        for top, bottom in row_bands:
            column_counts = []
            for column in range(width):
                column_counts.append(
                    sum(
                        mask[(row * width) + column]
                        for row in range(top, bottom)
                    )
                )
            column_bands = cls._segments(
                [1 if count else 0 for count in column_counts],
                minimum_gap=minimum_gap,
            )
            for left, right in column_bands:
                area = sum(
                    mask[(row * width) + column]
                    for row in range(top, bottom)
                    for column in range(left, right)
                )
                if area < minimum_area:
                    continue
                regions.append(
                    {
                        "x": max(0, left - padding),
                        "y": max(0, top - padding),
                        "width": min(width, right + padding) - max(0, left - padding),
                        "height": min(height, bottom + padding) - max(0, top - padding),
                        "foreground_area": area,
                    }
                )
        if not regions:
            bbox = image.convert("RGBA").getchannel("A").getbbox()
            if bbox:
                regions.append(
                    {
                        "x": bbox[0],
                        "y": bbox[1],
                        "width": bbox[2] - bbox[0],
                        "height": bbox[3] - bbox[1],
                        "foreground_area": (bbox[2] - bbox[0])
                        * (bbox[3] - bbox[1]),
                    }
                )
        return regions

    def _record_image(
        self,
        project_id: str,
        *,
        image: Image.Image,
        source_record: dict,
        context: dict,
        operation: str,
        params: dict,
        part_index: int | None = None,
    ) -> dict:
        if self.artifact_recorder is None:
            raise ProjectError("Agent processing artifact recorder is unavailable")
        suffix = f" part {part_index}" if part_index is not None else ""
        return self.artifact_recorder(
            project_id,
            image=image,
            prompt=f"{source_record.get('prompt') or source_record['id']} [{operation}{suffix}]",
            model=f"local-processing/{operation}",
            asset_node_id=str(source_record.get("asset_node_id") or "category-other"),
            workflow_run_id=str(context.get("workflow_run_id") or ""),
            actor=str(context.get("actor") or "agent"),
            source_record_id=str(source_record["id"]),
            source_action_id=str(context.get("action_id") or ""),
            params=params,
        )

    def execute(self, action_type: str, inputs: dict, context: dict) -> dict:
        project_id = str(context.get("project_id") or "")
        source_record, source_path = self._source_record(
            project_id, str(inputs.get("record_id") or "")
        )
        intake = self.project_service.create_processing_intake(
            project_id,
            record_ids=[source_record["id"]],
            actor=str(context.get("actor") or "agent"),
            idempotency_key=(
                f"agent:{context.get('agent_run_id')}:{context.get('action_id')}"
            ),
        )
        generation_service = self.generation_service_factory(project_id)
        existing_records = [
            record
            for record in generation_service.list_history()
            if record.get("source_action_id") == context.get("action_id")
            and record.get("status") == "succeeded"
        ]
        if existing_records:
            existing_records.sort(
                key=lambda item: (
                    int((item.get("params") or {}).get("part_index") or 0),
                    str(item.get("created_at") or ""),
                )
            )
            return {
                "processing_intake_id": intake["id"],
                "record_ids": [item["id"] for item in existing_records],
                "records": [
                    {
                        "record_id": item["id"],
                        "record": {
                            key: item.get(key)
                            for key in (
                                "id",
                                "status",
                                "width",
                                "height",
                                "bytes",
                                "local_url",
                                "sha256",
                                "source_record_id",
                                "source_action_id",
                            )
                        },
                    }
                    for item in existing_records
                ],
                "recovered": True,
            }
        with Image.open(source_path) as source_image:
            image = source_image.convert("RGBA")
        if action_type == "image.matte":
            processed, matte = self._simple_matte(image, inputs)
            output = self._record_image(
                project_id,
                image=processed,
                source_record=source_record,
                context=context,
                operation="matte",
                params={"matte": matte},
            )
            processed.close()
            image.close()
            return {
                "processing_intake_id": intake["id"],
                "record_ids": [output["record_id"]],
                "records": [output],
                "matte": matte,
            }
        if action_type == "image.split":
            regions = self._split_regions(image, inputs)
            records = []
            for index, region in enumerate(regions, start=1):
                left = region["x"]
                top = region["y"]
                part = image.crop(
                    (
                        left,
                        top,
                        left + region["width"],
                        top + region["height"],
                    )
                )
                records.append(
                    self._record_image(
                        project_id,
                        image=part,
                        source_record=source_record,
                        context=context,
                        operation="split",
                        params={"region": region, "part_index": index},
                        part_index=index,
                    )
                )
                part.close()
            image.close()
            return {
                "processing_intake_id": intake["id"],
                "record_ids": [item["record_id"] for item in records],
                "records": records,
                "regions": regions,
            }
        image.close()
        raise ProjectError(f"Unsupported Agent processing action: {action_type}")
