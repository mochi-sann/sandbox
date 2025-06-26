from fastapi import FastAPI, HTTPException, Depends, status
from typing import List
from datetime import datetime, timedelta
import uvicorn
from contextlib import asynccontextmanager
from fastapi.security import OAuth2PasswordRequestForm
from jose import JWTError, jwt

from models import TodoCreate, TodoUpdate, TodoResponse, TodoStatus, UserCreate, User, Token
from database import get_db, create_tables, close_db, UserDB
from crud import create_todo, get_todo, get_todos, update_todo, delete_todo, get_user_by_username, create_user, get_user
from sqlalchemy.ext.asyncio import AsyncSession
from auth import verify_password
from security import oauth2_scheme

# Configuration
SECRET_KEY = "your-secret-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

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

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(db: AsyncSession = Depends(get_db), token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = await get_user_by_username(db, username=username)
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user: User = Depends(get_current_user)):
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

@app.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    user = await get_user_by_username(db, username=form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@app.post("/users/", response_model=User)
async def create_new_user(user: UserCreate, db: AsyncSession = Depends(get_db)):
    db_user = await get_user_by_username(db, username=user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    return await create_user(db=db, user=user)

@app.get("/users/me/", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user

@app.get("/todos", response_model=List[TodoResponse], summary="Get all todos")
async def get_todos_endpoint(status: TodoStatus = None, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    todos = await get_todos(db, current_user.id, status)
    return [TodoResponse.model_validate(todo) for todo in todos]


@app.get("/todos/{todo_id}", response_model=TodoResponse, summary="Get todo by ID")
async def get_todo_endpoint(todo_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    todo = await get_todo(db, todo_id, current_user.id)
    if not todo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Todo with id {todo_id} not found"
        )
    return TodoResponse.model_validate(todo)


@app.post("/todos", response_model=TodoResponse, status_code=status.HTTP_201_CREATED, summary="Create new todo")
async def create_todo_endpoint(todo: TodoCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    new_todo = await create_todo(db, todo, current_user.id)
    return TodoResponse.model_validate(new_todo)


@app.put("/todos/{todo_id}", response_model=TodoResponse, summary="Update todo")
async def update_todo_endpoint(todo_id: int, todo_update: TodoUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    updated_todo = await update_todo(db, todo_id, todo_update, current_user.id)
    if not updated_todo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Todo with id {todo_id} not found"
        )
    return TodoResponse.model_validate(updated_todo)


@app.delete("/todos/{todo_id}", summary="Delete todo")
async def delete_todo_endpoint(todo_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    deleted = await delete_todo(db, todo_id, current_user.id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Todo with id {todo_id} not found"
        )
    return {"message": f"Todo with id {todo_id} deleted successfully"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)