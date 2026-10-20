from types import SimpleNamespace
from unittest.mock import Mock
from fastapi.testclient import TestClient
from app.main import create_app
from app.routes.deps import get_services


def test_recommendations_endpoint():
    app = create_app()
    exports = Mock()
    exports.read.return_value = {
        "projects": [
            {
                "projectId": "GIS-0001",
                "projectName": "Test Project",
                "portfolioKey": "it-infosec",
                "finalTier": "Proceed",
                "priorityScore": 75.0,
                "userBase": 4500,
                "primarySkill": "CLOUD",
                "dependencyCount": 1,
                "regulatorySecurity": False,
            }
        ],
        "capacityBySkill": [{"skill": "CLOUD", "gapFte": -1.0}],
    }
    paths = SimpleNamespace(portfolio_export=lambda: "Files/exports/portfolio.json")
    services = SimpleNamespace(exports=exports, paths=paths)
    app.dependency_overrides[get_services] = lambda: services

    with TestClient(app) as client:
        resp = client.get("/v1/recommendations")
        assert resp.status_code == 200
        data = resp.json()
        assert "newProjectSuggestions" in data
        assert "existingProjectRecommendations" in data
        assert len(data["newProjectSuggestions"]) > 0
        assert "insights" in data


def test_researcher_agent_query():
    app = create_app()
    with TestClient(app) as client:
        resp = client.post(
            "/v1/recommendations/research",
            json={"query": "What are our highest impact projects?", "portfolioKey": "it-infosec"},
        )
        assert resp.status_code == 200
        res = resp.json()
        assert "answer" in res
        assert "suggestedActions" in res
