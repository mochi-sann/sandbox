from collections.abc import Generator
from typing import Dict, List, Optional

from fastapi import Depends, FastAPI, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import Boolean, Column, Integer, String, Text, create_engine, select
from sqlalchemy.orm import Session, declarative_base, sessionmaker


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

# SQLiteベースのシンプルな永続化。必要に応じて別DBに差し替え可能。
DATABASE_URL = "sqlite:///./todos.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


class TodoModel(Base):
    __tablename__ = "todos"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    completed = Column(Boolean, nullable=False, default=False)


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _to_read_model(todo: TodoModel) -> Todo:
    return Todo(
        id=todo.id,
        title=todo.title,
        description=todo.description,
        completed=todo.completed,
    )


def _get_or_404(db: Session, todo_id: int) -> TodoModel:
    todo = db.get(TodoModel, todo_id)
    if todo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Todo not found")
    return todo


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
def list_todos(db: Session = Depends(get_db)) -> List[Todo]:
    todos = db.scalars(select(TodoModel).order_by(TodoModel.id)).all()
    return [_to_read_model(todo) for todo in todos]


@app.post(
    "/todos",
    response_model=Todo,
    status_code=status.HTTP_201_CREATED,
    tags=["todos"],
    summary="Todo作成",
    description="新しいTodoを作成し、作成されたリソースを返します。",
)
def create_todo(todo: TodoCreate, db: Session = Depends(get_db)) -> Todo:
    todo_model = TodoModel(
        title=todo.title,
        description=todo.description,
        completed=todo.completed,
    )
    db.add(todo_model)
    db.commit()
    db.refresh(todo_model)
    return _to_read_model(todo_model)


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
def get_todo(todo_id: int, db: Session = Depends(get_db)) -> Todo:
    todo = _get_or_404(db, todo_id)
    return _to_read_model(todo)


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
def update_todo(todo_id: int, todo_update: TodoCreate, db: Session = Depends(get_db)) -> Todo:
    todo = _get_or_404(db, todo_id)

    todo.title = todo_update.title
    todo.description = todo_update.description
    todo.completed = todo_update.completed

    db.commit()
    db.refresh(todo)
    return _to_read_model(todo)


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
def delete_todo(todo_id: int, db: Session = Depends(get_db)) -> None:
    todo = _get_or_404(db, todo_id)
    db.delete(todo)
    db.commit()
