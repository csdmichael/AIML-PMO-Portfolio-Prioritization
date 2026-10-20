"""Builds the shared services once per process: Azure credentials, OneLake and Fabric clients, and domain services."""

from dataclasses import dataclass
from app.auth import CredentialProvider
from app.agent import FoundryAgentClient, load_agent_settings
from app.agent_tools import ToolTokenVerifier
from app.cache import TtlCache
from app.catalog import Catalog
from app.config import AppConfig, get_config
from app.decisions import DecisionService
from app.demo_data import DemoDataService
from app.fabric import FabricClient
from app.lake_paths import LakePaths
from app.onelake import OneLakeClient
from app.options_store import OptionsStore
from app.pipeline import PipelineService
from app.portfolios import PortfolioService
from app.project_changes import ProjectChanges
from app.project_import import ProjectImport
from app.projects import ProjectService
from app.recommendation_cache import RecommendationCache
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
    changes: ProjectChanges
    demo: DemoDataService
    imports: ProjectImport
    portfolios: PortfolioService
    decisions: DecisionService
    pipeline: PipelineService
    options: OptionsStore
    agent: FoundryAgentClient
    recommendation_agent: FoundryAgentClient
    recommendation_cache: RecommendationCache
    intake_agent: FoundryAgentClient
    tool_tokens: ToolTokenVerifier


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
    changes = ProjectChanges(
        entries=entries, paths=paths, contract=config.data_entry,
        cache=TtlCache(api.cache.ttlSeconds), reset_cache=TtlCache(api.cache.ttlSeconds),
    )
    catalog = Catalog(
        exports=exports, entries=entries, paths=paths, statuses=api.projects, contract=config.data_entry, changes=changes,
    )
    projects = ProjectService(
        lake=lake,
        entries=entries,
        paths=paths,
        catalog=catalog,
        contract=config.data_entry,
        validation=api.validation,
        project_settings=api.projects,
        upload_settings=api.uploads,
        changes=changes,
    )
    portfolios = PortfolioService(
        entries=entries,
        paths=paths,
        catalog=catalog,
        contract=config.data_entry,
        validation=api.validation,
        statuses=api.projects,
    )
    imports = ProjectImport(settings=api.projectImport, contract=config.data_entry, catalog=catalog, projects=projects)
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
    options = OptionsStore(
        lake=lake, contract=config.data_entry, path=api.oneLake.lookupsFile, ttl_seconds=api.cache.ttlSeconds,
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
        changes=changes,
        demo=DemoDataService(config=config, lake=lake, paths=paths, catalog=catalog, changes=changes),
        imports=imports,
        portfolios=portfolios,
        decisions=decisions,
        pipeline=pipeline,
        options=options,
        agent=FoundryAgentClient(load_agent_settings("portfolio-agent.json"), credentials),
        recommendation_agent=FoundryAgentClient(load_agent_settings("recommendation-agent.json"), credentials),
        recommendation_cache=RecommendationCache(lake=lake, paths=paths),
        intake_agent=FoundryAgentClient(load_agent_settings("intake-agent.json"), credentials),
        tool_tokens=ToolTokenVerifier(),
    )
