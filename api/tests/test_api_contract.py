"""API contract and intake rules. These tests make no network calls: lake and model access is never reached."""

from fastapi.testclient import TestClient

from app.main import app
from app.routes.intake import _extract_text

client = TestClient(app)


def test_csv_text_is_extracted_as_utf8():
    text, method = _extract_text(".csv", b"a,b\n1,2", 100, 10)
    assert method == "utf8"
    assert text == "a,b\n1,2"


def test_text_is_trimmed_to_the_configured_limit():
    text, _ = _extract_text(".txt", b"abcdefghij", 4, 10)
    assert text == "abcd"


def test_formats_without_a_parser_are_stored_only():
    text, method = _extract_text(".pdf", b"%PDF-1.4", 100, 10)
    assert text == ""
    assert method == "stored-only"


def test_draft_rejects_a_description_that_is_too_short():
    response = client.post("/v1/intake/drafts", json={"projectName": "Test project", "description": "too short"})
    assert response.status_code == 422
    assert response.headers["content-type"].startswith("application/problem+json")
    body = response.json()
    assert body["status"] == 422
    assert any(error["field"] == "description" for error in body.get("errors", []))


def test_draft_rejects_an_empty_project_name():
    response = client.post("/v1/intake/drafts", json={"projectName": "   ", "description": "x" * 200})
    assert response.status_code == 422
    assert any(error["field"] == "projectName" for error in response.json().get("errors", []))


def test_openapi_lists_every_intake_route():
    paths = app.openapi()["paths"]
    for route in [
        "/v1/intake/drafts",
        "/v1/intake/drafts/{draftId}",
        "/v1/intake/drafts/{draftId}/documents",
        "/v1/intake/drafts/{draftId}/prefill",
        "/v1/intake/drafts/{draftId}/fields",
        "/v1/intake/drafts/{draftId}/submit",
    ]:
        assert route in paths, f"{route} is missing from the OpenAPI document"


def test_swagger_ui_is_served():
    response = client.get("/docs")
    assert response.status_code == 200
    assert "swagger" in response.text.lower()
