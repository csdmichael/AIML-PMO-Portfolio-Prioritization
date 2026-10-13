"""Fabric pipeline control: resolve the DataPipeline item by display name, start a job, and report job status."""

from typing import Any

from app.fabric import FabricClient, FabricError, FabricItem
from app.problems import ProblemError


def _upstream(error: FabricError) -> ProblemError:
    return ProblemError(502, f"Fabric REST call failed: {error}", slug="upstream-failure")


class PipelineService:
    def __init__(
        self,
        *,
        fabric: FabricClient,
        item_type: str,
        display_name: str,
        job_type: str,
        workspace_name: str,
        accepted_status: str,
    ) -> None:
        self._fabric = fabric
        self._item_type = item_type
        self._display_name = display_name
        self._job_type = job_type
        self._workspace_name = workspace_name
        self._accepted_status = accepted_status

    def _item(self) -> FabricItem:
        try:
            item = self._fabric.find_item(self._item_type, self._display_name)
        except FabricError as exc:
            raise _upstream(exc) from exc
        if item is None:
            raise ProblemError(
                404,
                f"The pipeline '{self._display_name}' ({self._item_type}) is not deployed in workspace '{self._workspace_name}'. Deploy it, then try again.",
                slug="pipeline-not-deployed",
            )
        return item

    def start(self) -> dict[str, Any]:
        item = self._item()
        try:
            started = self._fabric.start_job(item.id, self._job_type)
        except FabricError as exc:
            raise _upstream(exc) from exc
        return {
            "runId": started.job_instance_id,
            "jobInstanceId": started.job_instance_id,
            "status": self._accepted_status,
            "retryAfterSeconds": started.retry_after_seconds,
        }

    def start_optional(self) -> tuple[str | None, list[str]]:
        try:
            run = self.start()
        except ProblemError as error:
            return None, [error.detail]
        return str(run["runId"]), []

    def status(self, run_id: str) -> dict[str, Any]:
        item = self._item()
        try:
            job = self._fabric.get_job_instance(item.id, run_id)
        except FabricError as exc:
            raise _upstream(exc) from exc
        return {
            "runId": run_id,
            "jobInstanceId": run_id,
            "status": job.get("status"),
            "startTimeUtc": job.get("startTimeUtc"),
            "endTimeUtc": job.get("endTimeUtc"),
            "failureReason": job.get("failureReason"),
        }
