from fastapi.testclient import TestClient
from app.main import create_app


def test_recommendations_endpoint():
    client = TestClient(create_app())
    resp = client.get("/v1/recommendations")
    assert resp.status_code == 200
    data = resp.json()
    assert "newProjectSuggestions" in data
    assert "existingProjectRecommendations" in data
    assert len(data["newProjectSuggestions"]) > 0
    assert "insights" in data


def test_researcher_agent_query():
    client = TestClient(create_app())
    resp = client.post(
        "/v1/recommendations/research",
        json={"query": "What are our highest impact projects?", "portfolioKey": "it-infosec"},
    )
    assert resp.status_code == 200
    res = resp.json()
    assert "answer" in res
    assert "suggestedActions" in res
