from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class TodoStatus(str, Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    DONE = "done"


class TodoBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200, description="Todo title")
    description: Optional[str] = Field(None, max_length=1000, description="Todo description")
    status: TodoStatus = Field(default=TodoStatus.TODO, description="Todo status")


class TodoCreate(TodoBase):
    pass


class TodoUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200, description="Todo title")
    description: Optional[str] = Field(None, max_length=1000, description="Todo description")
    status: Optional[TodoStatus] = Field(None, description="Todo status")


class TodoResponse(TodoBase):
    id: int = Field(..., description="Todo ID")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    owner_id: int

    model_config = {"from_attributes": True}

class UserBase(BaseModel):
    username: str


class UserCreate(UserBase):
    password: str


class User(UserBase):
    id: int
    is_active: bool
    todos: list[TodoResponse] = []

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None