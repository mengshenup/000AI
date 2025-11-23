from fastapi import APIRouter
from pydantic import BaseModel
from Memory.file_manager import FileManager

router = APIRouter()
DATA_FILE = "apps.json"

class AppState(BaseModel):
    data: dict

@router.post("/save_layout")
async def save_layout(state: AppState):
    """保存记忆"""
    success = FileManager.save(DATA_FILE, state.data)
    return {"status": "ok" if success else "error"}

@router.get("/load_layout")
async def load_layout():
    """读取记忆"""
    return FileManager.load(DATA_FILE, default={})
