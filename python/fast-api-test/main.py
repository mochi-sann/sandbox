from typing import Dict, List, Optional

from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field


class TodoCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    completed: bool = False


class Todo(TodoCreate):
    id: int


class ErrorResponse(BaseModel):
    detail: str = Field(..., examples=["Todo not found"])


app = FastAPI(
    title="Todo API",
    version="1.0.0",
    description=(
        "シンプルなTodo管理用REST APIです。\n\n"
        "- `/todos` エンドポイントでTodoリソースをCRUD操作できます。\n"
        "- 自動生成される `/docs` でSwagger UI、`/redoc` でReDocによるOpenAPIドキュメントを参照できます。"
    ),
    openapi_tags=[
        {"name": "healthcheck", "description": "APIの稼働状況確認"},
        {"name": "todos", "description": "TodoリソースのCRUD操作"},
    ],
)

# 簡易的なインメモリストア。永続化は別途実装が必要。
_todo_store: Dict[int, Todo] = {}
_next_id: int = 1


def _get_next_id() -> int:
    global _next_id
    todo_id = _next_id
    _next_id += 1
    return todo_id


@app.get(
    "/",
    response_model=Dict[str, str],
    tags=["healthcheck"],
    summary="API稼働チェック",
    description="APIが利用可能かを確認するためのヘルスチェック用エンドポイントです。",
)
async def read_root() -> Dict[str, str]:
    return {"message": "Todo API is running"}


@app.get(
    "/todos",
    response_model=List[Todo],
    tags=["todos"],
    summary="Todo一覧取得",
    description="登録済みのTodoリストを作成順に返します。",
)
async def list_todos() -> List[Todo]:
    return list(_todo_store.values())


@app.post(
    "/todos",
    response_model=Todo,
    status_code=status.HTTP_201_CREATED,
    tags=["todos"],
    summary="Todo作成",
    description="新しいTodoを作成し、作成されたリソースを返します。",
)
async def create_todo(todo: TodoCreate) -> Todo:
    todo_id = _get_next_id()
    new_todo = Todo(id=todo_id, **todo.model_dump())
    _todo_store[todo_id] = new_todo
    return new_todo


@app.get(
    "/todos/{todo_id}",
    response_model=Todo,
    tags=["todos"],
    summary="Todo取得",
    description="指定されたIDのTodoを取得します。",
    responses={
        status.HTTP_404_NOT_FOUND: {
            "model": ErrorResponse,
            "description": "指定IDのTodoが存在しません。",
        }
    },
)
async def get_todo(todo_id: int) -> Todo:
    todo = _todo_store.get(todo_id)
    if todo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Todo not found")
    return todo


@app.put(
    "/todos/{todo_id}",
    response_model=Todo,
    tags=["todos"],
    summary="Todo更新",
    description="指定されたIDのTodoを全体更新します。",
    responses={
        status.HTTP_404_NOT_FOUND: {
            "model": ErrorResponse,
            "description": "指定IDのTodoが存在しません。",
        }
    },
)
async def update_todo(todo_id: int, todo_update: TodoCreate) -> Todo:
    if todo_id not in _todo_store:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Todo not found")

    updated_todo = Todo(id=todo_id, **todo_update.model_dump())
    _todo_store[todo_id] = updated_todo
    return updated_todo


@app.delete(
    "/todos/{todo_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["todos"],
    summary="Todo削除",
    description="指定されたIDのTodoを削除します。",
    responses={
        status.HTTP_404_NOT_FOUND: {
            "model": ErrorResponse,
            "description": "指定IDのTodoが存在しません。",
        },
        status.HTTP_204_NO_CONTENT: {
            "description": "削除が成功しました。レスポンスボディは含まれません。",
        },
    },
)
async def delete_todo(todo_id: int) -> None:
    if todo_id not in _todo_store:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Todo not found")
    del _todo_store[todo_id]
