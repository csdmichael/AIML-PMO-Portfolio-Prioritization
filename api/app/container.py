"""Builds the shared services once per process: Azure credentials, OneLake and Fabric clients, and domain services."""

from dataclasses import dataclass

from app.auth import CredentialProvider
from app.cache import TtlCache
from app.catalog import Catalog
from app.config import AppConfig, get_config
from app.decisions import DecisionService
from app.fabric import FabricClient
from app.lake_paths import LakePaths
from app.onelake import OneLakeClient
from app.pipeline import PipelineService
from app.portfolios import PortfolioService
from app.projects import ProjectService
from app.store import EntryStore, ExportReader


@dataclass
class Services:
    config: AppConfig
    credentials: CredentialProvider
    lake: OneLakeClient
    fabric: FabricClient
    paths: LakePaths
    exports: ExportReader
    entries: EntryStore
    catalog: Catalog
    projects: ProjectService
    portfolios: PortfolioService
    decisions: DecisionService
    pipeline: PipelineService


def build_services(config: AppConfig | None = None, credentials: CredentialProvider | None = None) -> Services:
    config = config or get_config()
    credentials = credentials or CredentialProvider()
    api = config.api
    values = config.values
    lake = OneLakeClient(
        dfs_endpoint=values.dfs_endpoint,
        workspace_name=values.workspace_name,
        lakehouse_name=values.lakehouse_name,
        item_suffix=api.oneLake.itemSuffix,
        credential=credentials.scoped(api.auth.storageScope),
    )
    fabric = FabricClient(
        base_url=values.api_base_url,
        workspace_id=values.workspace_id,
        token_provider=lambda: credentials.bearer_token(api.auth.fabricScope),
        timeout_seconds=api.fabric.timeoutSeconds,
    )
    paths = LakePaths(config)
    entries = EntryStore(lake)
    exports = ExportReader(lake=lake, cache=TtlCache(api.cache.ttlSeconds), pipeline_name=values.pipeline_display_name)
    catalog = Catalog(exports=exports, entries=entries, paths=paths, statuses=api.projects, contract=config.data_entry)
    projects = ProjectService(
        lake=lake,
        entries=entries,
        paths=paths,
        catalog=catalog,
        contract=config.data_entry,
        validation=api.validation,
        project_settings=api.projects,
        upload_settings=api.uploads,
    )
    portfolios = PortfolioService(
        entries=entries,
        paths=paths,
        catalog=catalog,
        contract=config.data_entry,
        validation=api.validation,
        statuses=api.projects,
    )
    decisions = DecisionService(
        entries=entries,
        paths=paths,
        catalog=catalog,
        settings=api.decisions,
        project_id_pattern=config.data_entry.projectIdPattern,
    )
    pipeline = PipelineService(
        fabric=fabric,
        item_type=api.fabric.pipelineItemType,
        display_name=values.pipeline_display_name,
        job_type=values.pipeline_job_type,
        workspace_name=values.workspace_name,
        accepted_status=api.pipeline.acceptedStatus,
    )
    return Services(
        config=config,
        credentials=credentials,
        lake=lake,
        fabric=fabric,
        paths=paths,
        exports=exports,
        entries=entries,
        catalog=catalog,
        projects=projects,
        portfolios=portfolios,
        decisions=decisions,
        pipeline=pipeline,
    )
