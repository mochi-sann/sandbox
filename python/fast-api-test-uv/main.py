from fastapi import FastAPI, HTTPException, Depends, status
from typing import List
from datetime import datetime
import uvicorn
from contextlib import asynccontextmanager

from models import TodoCreate, TodoUpdate, TodoResponse, TodoStatus
from database import get_db, create_tables, close_db, TodoDB
from crud import create_todo, get_todo, get_todos, update_todo, delete_todo
from sqlalchemy.ext.asyncio import AsyncSession

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await create_tables()
    yield
    # Shutdown
    await close_db()

app = FastAPI(
    title="Todo API",
    description="A simple Todo API built with FastAPI with SQLite persistence",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)



@app.get("/", summary="Root endpoint")
async def root():
    return {"message": "Welcome to Todo API"}


@app.get("/todos", response_model=List[TodoResponse], summary="Get all todos")
async def get_todos_endpoint(status: TodoStatus = None, db: AsyncSession = Depends(get_db)):
    todos = await get_todos(db, status)
    return [TodoResponse.model_validate(todo) for todo in todos]


@app.get("/todos/{todo_id}", response_model=TodoResponse, summary="Get todo by ID")
async def get_todo_endpoint(todo_id: int, db: AsyncSession = Depends(get_db)):
    todo = await get_todo(db, todo_id)
    if not todo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Todo with id {todo_id} not found"
        )
    return TodoResponse.model_validate(todo)


@app.post("/todos", response_model=TodoResponse, status_code=status.HTTP_201_CREATED, summary="Create new todo")
async def create_todo_endpoint(todo: TodoCreate, db: AsyncSession = Depends(get_db)):
    new_todo = await create_todo(db, todo)
    return TodoResponse.model_validate(new_todo)


@app.put("/todos/{todo_id}", response_model=TodoResponse, summary="Update todo")
async def update_todo_endpoint(todo_id: int, todo_update: TodoUpdate, db: AsyncSession = Depends(get_db)):
    updated_todo = await update_todo(db, todo_id, todo_update)
    if not updated_todo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Todo with id {todo_id} not found"
        )
    return TodoResponse.model_validate(updated_todo)


@app.delete("/todos/{todo_id}", summary="Delete todo")
async def delete_todo_endpoint(todo_id: int, db: AsyncSession = Depends(get_db)):
    deleted = await delete_todo(db, todo_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Todo with id {todo_id} not found"
        )
    return {"message": f"Todo with id {todo_id} deleted successfully"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)