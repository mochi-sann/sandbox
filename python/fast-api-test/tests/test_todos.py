import pytest
from httpx import AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker

from main import Base, app, get_db


@pytest.fixture
def override_db():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(bind=engine)

    def _get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = _get_db
    yield
    app.dependency_overrides.pop(get_db, None)
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
async def client(override_db):
    async with AsyncClient(app=app, base_url="http://testserver") as async_client:
        yield async_client


@pytest.mark.asyncio
async def test_create_and_list_todos(client: AsyncClient):
    create_resp = await client.post(
        "/todos", json={"title": "Write tests", "description": "Add integration tests"}
    )
    assert create_resp.status_code == 201
    created = create_resp.json()
    assert created["title"] == "Write tests"
    assert created["completed"] is False

    list_resp = await client.get("/todos")
    assert list_resp.status_code == 200
    todos = list_resp.json()
    assert len(todos) == 1
    assert todos[0]["id"] == created["id"]


@pytest.mark.asyncio
async def test_get_todo_not_found(client: AsyncClient):
    resp = await client.get("/todos/999")
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Todo not found"


@pytest.mark.asyncio
async def test_update_todo(client: AsyncClient):
    create_resp = await client.post("/todos", json={"title": "Initial"})
    todo_id = create_resp.json()["id"]

    update_resp = await client.put(
        f"/todos/{todo_id}",
        json={"title": "Updated", "description": "Refined", "completed": True},
    )
    assert update_resp.status_code == 200
    updated = update_resp.json()
    assert updated["title"] == "Updated"
    assert updated["description"] == "Refined"
    assert updated["completed"] is True


@pytest.mark.asyncio
async def test_delete_todo(client: AsyncClient):
    create_resp = await client.post("/todos", json={"title": "Delete me"})
    todo_id = create_resp.json()["id"]

    delete_resp = await client.delete(f"/todos/{todo_id}")
    assert delete_resp.status_code == 204

    get_resp = await client.get(f"/todos/{todo_id}")
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_create_validation_error(client: AsyncClient):
    resp = await client.post("/todos", json={"title": ""})
    assert resp.status_code == 422
    body = resp.json()
    assert body["detail"]
