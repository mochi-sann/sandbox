import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import StaticPool
import os
import tempfile
import asyncio
from unittest.mock import AsyncMock

from main import app
from database import Base, get_db


class TestSession:
    """Mock test session that behaves like a regular sync session for testing"""
    def __init__(self):
        self.committed = False
        self.rolled_back = False
        
    async def commit(self):
        self.committed = True
        
    async def rollback(self):
        self.rolled_back = True
        
    async def close(self):
        pass


@pytest.fixture
def mock_db_session():
    """Create a mock database session"""
    return TestSession()


@pytest.fixture
def client(mock_db_session):
    """Create test client with dependency override"""
    def override_get_db():
        yield mock_db_session
    
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as test_client:
        yield test_client
    
    app.dependency_overrides.clear()


def test_root(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to Todo API"}


def test_get_empty_todos(client):
    # Mock the get_todos function to return empty list
    import crud
    original_get_todos = crud.get_todos
    
    async def mock_get_todos(db, status=None):
        return []
    
    crud.get_todos = mock_get_todos
    
    try:
        response = client.get("/todos")
        assert response.status_code == 200
        assert response.json() == []
    finally:
        crud.get_todos = original_get_todos


def test_create_todo(client):
    # Mock the create_todo function
    import crud
    from database import TodoDB
    from datetime import datetime
    
    original_create_todo = crud.create_todo
    
    async def mock_create_todo(db, todo):
        mock_todo = TodoDB()
        mock_todo.id = 1
        mock_todo.title = todo.title
        mock_todo.description = todo.description
        mock_todo.status = todo.status.value
        mock_todo.created_at = datetime.utcnow()
        mock_todo.updated_at = datetime.utcnow()
        return mock_todo
    
    crud.create_todo = mock_create_todo
    
    try:
        todo_data = {
            "title": "Test Todo",
            "description": "This is a test todo",
            "status": "todo"
        }
        response = client.post("/todos", json=todo_data)
        assert response.status_code == 201
        
        data = response.json()
        assert data["title"] == todo_data["title"]
        assert data["description"] == todo_data["description"]
        assert data["status"] == todo_data["status"]
        assert "id" in data
        assert "created_at" in data
        assert "updated_at" in data
    finally:
        crud.create_todo = original_create_todo


def test_get_todo_not_found(client):
    # Mock the get_todo function to return None
    import crud
    
    original_get_todo = crud.get_todo
    
    async def mock_get_todo(db, todo_id):
        return None
    
    crud.get_todo = mock_get_todo
    
    try:
        response = client.get("/todos/999")
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]
    finally:
        crud.get_todo = original_get_todo


def test_create_todo_validation(client):
    response = client.post("/todos", json={"title": ""})
    assert response.status_code == 422
    
    response = client.post("/todos", json={})  
    assert response.status_code == 422