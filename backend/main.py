"""耗材管理系统 API — 应用入口，装配路由与中间件"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine, Base
import models  # 确保所有表注册到 Base.metadata

Base.metadata.create_all(bind=engine)

app = FastAPI(title="耗材管理系统 API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── 注册路由 ──────────────────────────────────────────────

from routers.auth import router as auth_router
from routers.dashboard import router as dashboard_router
from routers.items import router as items_router
from routers.categories import router as categories_router
from routers.inbound import router as inbound_router
from routers.outbound import router as outbound_router
from routers.requisitions import router as requisitions_router
from routers.users import router as users_router

app.include_router(auth_router)
app.include_router(dashboard_router)
app.include_router(items_router)
app.include_router(categories_router)
app.include_router(inbound_router)
app.include_router(outbound_router)
app.include_router(requisitions_router)
app.include_router(users_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
