import pytest
from fastapi.testclient import TestClient
from main import app, todos_db

client = TestClient(app)


@pytest.fixture(autouse=True)
def clear_todos():
    todos_db.clear()
    global next_id
    from main import next_id
    next_id = 1


def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to Todo API"}


def test_get_empty_todos():
    response = client.get("/todos")
    assert response.status_code == 200
    assert response.json() == []


def test_create_todo():
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
    assert data["id"] == 1
    assert "created_at" in data
    assert "updated_at" in data


def test_create_todo_minimal():
    todo_data = {
        "title": "Minimal Todo"
    }
    response = client.post("/todos", json=todo_data)
    assert response.status_code == 201
    
    data = response.json()
    assert data["title"] == todo_data["title"]
    assert data["description"] is None
    assert data["status"] == "todo"


def test_get_todos():
    client.post("/todos", json={"title": "Todo 1"})
    client.post("/todos", json={"title": "Todo 2", "status": "in_progress"})
    
    response = client.get("/todos")
    assert response.status_code == 200
    
    data = response.json()
    assert len(data) == 2
    assert data[0]["title"] == "Todo 1"
    assert data[1]["title"] == "Todo 2"


def test_get_todos_by_status():
    client.post("/todos", json={"title": "Todo 1", "status": "todo"})
    client.post("/todos", json={"title": "Todo 2", "status": "in_progress"})
    client.post("/todos", json={"title": "Todo 3", "status": "done"})
    
    response = client.get("/todos?status=in_progress")
    assert response.status_code == 200
    
    data = response.json()
    assert len(data) == 1
    assert data[0]["title"] == "Todo 2"
    assert data[0]["status"] == "in_progress"


def test_get_todo_by_id():
    response = client.post("/todos", json={"title": "Test Todo"})
    todo_id = response.json()["id"]
    
    response = client.get(f"/todos/{todo_id}")
    assert response.status_code == 200
    
    data = response.json()
    assert data["id"] == todo_id
    assert data["title"] == "Test Todo"


def test_get_todo_not_found():
    response = client.get("/todos/999")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"]


def test_update_todo():
    response = client.post("/todos", json={"title": "Original Title"})
    todo_id = response.json()["id"]
    
    update_data = {
        "title": "Updated Title",
        "status": "in_progress"
    }
    response = client.put(f"/todos/{todo_id}", json=update_data)
    assert response.status_code == 200
    
    data = response.json()
    assert data["title"] == "Updated Title"
    assert data["status"] == "in_progress"


def test_update_todo_partial():
    response = client.post("/todos", json={"title": "Original Title", "description": "Original Description"})
    todo_id = response.json()["id"]
    
    update_data = {"status": "done"}
    response = client.put(f"/todos/{todo_id}", json=update_data)
    assert response.status_code == 200
    
    data = response.json()
    assert data["title"] == "Original Title"
    assert data["description"] == "Original Description"
    assert data["status"] == "done"


def test_update_todo_not_found():
    update_data = {"title": "Updated Title"}
    response = client.put("/todos/999", json=update_data)
    assert response.status_code == 404
    assert "not found" in response.json()["detail"]


def test_delete_todo():
    response = client.post("/todos", json={"title": "To Delete"})
    todo_id = response.json()["id"]
    
    response = client.delete(f"/todos/{todo_id}")
    assert response.status_code == 200
    assert "deleted successfully" in response.json()["message"]
    
    response = client.get(f"/todos/{todo_id}")
    assert response.status_code == 404


def test_delete_todo_not_found():
    response = client.delete("/todos/999")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"]


def test_create_todo_validation():
    response = client.post("/todos", json={"title": ""})
    assert response.status_code == 422
    
    response = client.post("/todos", json={})  
    assert response.status_code == 422