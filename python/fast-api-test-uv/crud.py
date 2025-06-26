from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from sqlalchemy.exc import NoResultFound
from typing import List, Optional
from datetime import datetime

from database import TodoDB, UserDB
from models import TodoCreate, TodoUpdate, TodoStatus, UserCreate
from auth import get_password_hash


async def get_user(db: AsyncSession, user_id: int):
    stmt = select(UserDB).where(UserDB.id == user_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_user_by_username(db: AsyncSession, username: str):
    stmt = select(UserDB).where(UserDB.username == username)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def create_user(db: AsyncSession, user: UserCreate):
    hashed_password = get_password_hash(user.password)
    db_user = UserDB(username=user.username, hashed_password=hashed_password)
    db.add(db_user)
    await db.flush()
    await db.refresh(db_user)
    return db_user


async def create_todo(db: AsyncSession, todo: TodoCreate, user_id: int) -> TodoDB:
    """Create a new todo in the database"""
    db_todo = TodoDB(
        title=todo.title,
        description=todo.description,
        status=todo.status.value,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
        owner_id=user_id
    )
    db.add(db_todo)
    await db.flush()
    await db.refresh(db_todo)
    return db_todo


async def get_todo(db: AsyncSession, todo_id: int, user_id: int) -> Optional[TodoDB]:
    """Get a todo by ID"""
    stmt = select(TodoDB).where(TodoDB.id == todo_id, TodoDB.owner_id == user_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_todos(db: AsyncSession, user_id: int, status: Optional[TodoStatus] = None) -> List[TodoDB]:
    """Get all todos, optionally filtered by status"""
    if status:
        stmt = select(TodoDB).where(TodoDB.owner_id == user_id, TodoDB.status == status.value).order_by(TodoDB.created_at.desc())
    else:
        stmt = select(TodoDB).where(TodoDB.owner_id == user_id).order_by(TodoDB.created_at.desc())
    
    result = await db.execute(stmt)
    return result.scalars().all()


async def update_todo(db: AsyncSession, todo_id: int, todo_update: TodoUpdate, user_id: int) -> Optional[TodoDB]:
    """Update a todo"""
    # First check if todo exists
    existing_todo = await get_todo(db, todo_id, user_id)
    if not existing_todo:
        return None
    
    # Build update data
    update_data = {}
    if todo_update.title is not None:
        update_data["title"] = todo_update.title
    if todo_update.description is not None:
        update_data["description"] = todo_update.description
    if todo_update.status is not None:
        update_data["status"] = todo_update.status.value
    
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        
        stmt = update(TodoDB).where(TodoDB.id == todo_id).values(**update_data)
        await db.execute(stmt)
        await db.flush()
        
        # Return updated todo
        return await get_todo(db, todo_id, user_id)
    
    return existing_todo


async def delete_todo(db: AsyncSession, todo_id: int, user_id: int) -> bool:
    """Delete a todo"""
    # First check if todo exists
    existing_todo = await get_todo(db, todo_id, user_id)
    if not existing_todo:
        return False
    
    stmt = delete(TodoDB).where(TodoDB.id == todo_id)
    await db.execute(stmt)
    return True


async def get_todo_count(db: AsyncSession, user_id: int) -> int:
    """Get total number of todos"""
    stmt = select(db.func.count(TodoDB.id)).where(TodoDB.owner_id == user_id)
    result = await db.execute(stmt)
    return result.scalar()


async def get_todos_by_status_count(db: AsyncSession, user_id: int, status: TodoStatus) -> int:
    """Get number of todos by status"""
    stmt = select(db.func.count(TodoDB.id)).where(TodoDB.owner_id == user_id, TodoDB.status == status.value)
    result = await db.execute(stmt)
    return result.scalar()