from fastapi import APIRouter, Body
from pydantic import BaseModel
import json
import os

router = APIRouter()

DATA_FILE = "user_data/apps.json"

class AppState(BaseModel):
    data: dict

@router.post("/save_layout")
async def save_layout(state: AppState):
    """保存应用布局和状态"""
    os.makedirs("user_data", exist_ok=True)
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(state.data, f, ensure_ascii=False, indent=2)
    return {"status": "ok"}

@router.get("/load_layout")
async def load_layout():
    """加载应用布局和状态"""
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}
