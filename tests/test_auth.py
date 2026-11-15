from __future__ import annotations

import base64

from fastapi.testclient import TestClient

from sgd_api.main import app


def _basic_auth(username: str, password: str) -> dict[str, str]:
    token = base64.b64encode(f"{username}:{password}".encode()).decode()
    return {"Authorization": f"Basic {token}"}


def test_protected_deployment_rejects_requests_without_credentials(monkeypatch):
    monkeypatch.setenv("APP_REQUIRE_AUTH", "true")
    monkeypatch.setenv("APP_USERNAME", "group")
    monkeypatch.setenv("APP_PASSWORD", "long-test-passphrase-for-access")

    response = TestClient(app).get("/health")

    assert response.status_code == 401
    assert response.headers["www-authenticate"].startswith("Basic realm=")
    assert response.headers["cache-control"] == "no-store"


def test_protected_deployment_accepts_valid_credentials(monkeypatch):
    monkeypatch.setenv("APP_REQUIRE_AUTH", "true")
    monkeypatch.setenv("APP_USERNAME", "group")
    monkeypatch.setenv("APP_PASSWORD", "long-test-passphrase-for-access")

    response = TestClient(app).get(
        "/v1/capabilities",
        headers=_basic_auth("group", "long-test-passphrase-for-access"),
    )

    assert response.status_code == 200
    assert response.json()["artificial_lift_recommendation_available"] is False
    assert response.headers["cache-control"] == "no-store"


def test_protected_deployment_rejects_invalid_credentials(monkeypatch):
    monkeypatch.setenv("APP_REQUIRE_AUTH", "true")
    monkeypatch.setenv("APP_USERNAME", "group")
    monkeypatch.setenv("APP_PASSWORD", "long-test-passphrase-for-access")

    response = TestClient(app).get("/health", headers=_basic_auth("group", "incorrect-passphrase"))

    assert response.status_code == 401


def test_protected_deployment_fails_closed_without_strong_secret(monkeypatch):
    monkeypatch.setenv("APP_REQUIRE_AUTH", "true")
    monkeypatch.delenv("APP_PASSWORD", raising=False)

    response = TestClient(app).get("/health")

    assert response.status_code == 503
    assert "not configured" in response.text
