import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .routes.scenarios import router as scenarios_router
from .routes.optimization import router as optimization_router
from .routes.plans import router as plans_router
from .routes.publishing import router as publishing_router

app = FastAPI(title="Dispatcher Workspace API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(scenarios_router)
app.include_router(optimization_router)
app.include_router(plans_router)
app.include_router(publishing_router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}


static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
if os.path.isdir(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
