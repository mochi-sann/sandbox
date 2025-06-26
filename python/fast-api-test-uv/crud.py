from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from sqlalchemy.exc import NoResultFound
from typing import List, Optional
from datetime import datetime

from database import TodoDB
from models import TodoCreate, TodoUpdate, TodoStatus


async def create_todo(db: AsyncSession, todo: TodoCreate) -> TodoDB:
    """Create a new todo in the database"""
    db_todo = TodoDB(
        title=todo.title,
        description=todo.description,
        status=todo.status.value,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(db_todo)
    await db.flush()
    await db.refresh(db_todo)
    return db_todo


async def get_todo(db: AsyncSession, todo_id: int) -> Optional[TodoDB]:
    """Get a todo by ID"""
    stmt = select(TodoDB).where(TodoDB.id == todo_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_todos(db: AsyncSession, status: Optional[TodoStatus] = None) -> List[TodoDB]:
    """Get all todos, optionally filtered by status"""
    if status:
        stmt = select(TodoDB).where(TodoDB.status == status.value).order_by(TodoDB.created_at.desc())
    else:
        stmt = select(TodoDB).order_by(TodoDB.created_at.desc())
    
    result = await db.execute(stmt)
    return result.scalars().all()


async def update_todo(db: AsyncSession, todo_id: int, todo_update: TodoUpdate) -> Optional[TodoDB]:
    """Update a todo"""
    # First check if todo exists
    existing_todo = await get_todo(db, todo_id)
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
        return await get_todo(db, todo_id)
    
    return existing_todo


async def delete_todo(db: AsyncSession, todo_id: int) -> bool:
    """Delete a todo"""
    # First check if todo exists
    existing_todo = await get_todo(db, todo_id)
    if not existing_todo:
        return False
    
    stmt = delete(TodoDB).where(TodoDB.id == todo_id)
    await db.execute(stmt)
    return True


async def get_todo_count(db: AsyncSession) -> int:
    """Get total number of todos"""
    stmt = select(db.func.count(TodoDB.id))
    result = await db.execute(stmt)
    return result.scalar()


async def get_todos_by_status_count(db: AsyncSession, status: TodoStatus) -> int:
    """Get number of todos by status"""
    stmt = select(db.func.count(TodoDB.id)).where(TodoDB.status == status.value)
    result = await db.execute(stmt)
    return result.scalar()