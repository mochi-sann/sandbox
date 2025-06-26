from fastapi import FastAPI, HTTPException, Depends, status
from typing import List
from datetime import datetime
import uvicorn

from models import TodoCreate, TodoUpdate, TodoResponse, TodoStatus

app = FastAPI(
    title="Todo API",
    description="A simple Todo API built with FastAPI",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

todos_db = []
next_id = 1


def get_next_id():
    global next_id
    current_id = next_id
    next_id += 1
    return current_id


@app.get("/", summary="Root endpoint")
async def root():
    return {"message": "Welcome to Todo API"}


@app.get("/todos", response_model=List[TodoResponse], summary="Get all todos")
async def get_todos(status: TodoStatus = None):
    if status:
        return [todo for todo in todos_db if todo["status"] == status]
    return todos_db


@app.get("/todos/{todo_id}", response_model=TodoResponse, summary="Get todo by ID")
async def get_todo(todo_id: int):
    todo = next((todo for todo in todos_db if todo["id"] == todo_id), None)
    if not todo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Todo with id {todo_id} not found"
        )
    return todo


@app.post("/todos", response_model=TodoResponse, status_code=status.HTTP_201_CREATED, summary="Create new todo")
async def create_todo(todo: TodoCreate):
    now = datetime.now()
    new_todo = {
        "id": get_next_id(),
        "title": todo.title,
        "description": todo.description,
        "status": todo.status,
        "created_at": now,
        "updated_at": now
    }
    todos_db.append(new_todo)
    return new_todo


@app.put("/todos/{todo_id}", response_model=TodoResponse, summary="Update todo")
async def update_todo(todo_id: int, todo_update: TodoUpdate):
    todo = next((todo for todo in todos_db if todo["id"] == todo_id), None)
    if not todo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Todo with id {todo_id} not found"
        )
    
    update_data = todo_update.model_dump(exclude_unset=True)
    if update_data:
        for field, value in update_data.items():
            todo[field] = value
        todo["updated_at"] = datetime.now()
    
    return todo


@app.delete("/todos/{todo_id}", summary="Delete todo")
async def delete_todo(todo_id: int):
    todo = next((todo for todo in todos_db if todo["id"] == todo_id), None)
    if not todo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Todo with id {todo_id} not found"
        )
    
    todos_db.remove(todo)
    return {"message": f"Todo with id {todo_id} deleted successfully"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)