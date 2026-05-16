"""耗材路由 — 耗材 CRUD + 专案列表"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from utils.auth import get_current_user, require_admin
from services.item_service import create_item as item_create, update_item as item_update, delete_item as item_delete

router = APIRouter(prefix="/api", tags=["items"])


@router.get("/items", response_model=list[schemas.ItemWithCategory])
def list_items(
    search: str = Query("", max_length=200),
    category_id: int = Query(None),
    project: str = Query(""),
    low_stock: bool = Query(False),
    db: Session = Depends(get_db),
    user: str = Depends(get_current_user),
):
    q = db.query(models.Item)
    if search:
        q = q.filter(models.Item.name.contains(search))
    if category_id:
        q = q.filter(models.Item.category_id == category_id)
    if project:
        q = q.filter(models.Item.project == project)
    if low_stock:
        q = q.filter(models.Item.current_stock <= models.Item.min_stock)
    return q.order_by(models.Item.id.desc()).all()


@router.get("/items/{item_id}", response_model=schemas.ItemWithCategory)
def get_item(item_id: int, db: Session = Depends(get_db), user: str = Depends(get_current_user)):
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="耗材不存在")
    return item


@router.post("/items", response_model=schemas.ItemOut, status_code=201)
def create_item(data: schemas.ItemCreate, db: Session = Depends(get_db), user: str = Depends(get_current_user)):
    return item_create(db, data)


@router.put("/items/{item_id}", response_model=schemas.ItemOut)
def update_item(item_id: int, data: schemas.ItemUpdate, db: Session = Depends(get_db), user: str = Depends(get_current_user)):
    return item_update(db, item_id, data)


@router.delete("/items/{item_id}", status_code=204)
def delete_item(item_id: int, db: Session = Depends(get_db), user: dict = Depends(require_admin)):
    item_delete(db, item_id)


@router.get("/projects")
def list_projects(db: Session = Depends(get_db), user: str = Depends(get_current_user)):
    rows = db.query(models.Item.project).distinct().order_by(models.Item.project).all()
    return [r[0] for r in rows if r[0]]
