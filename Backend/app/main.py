import asyncio
from collections import defaultdict
from fastapi import FastAPI, WebSocket, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.websocket_handlers import websocket_endpoint
from app.auth import router as auth_router
from db.db import engine, Base

# Initialize database
Base.metadata.create_all(bind=engine)

app = FastAPI()

# Add routers
app.include_router(auth_router)

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global state
app.state.waiting_users = defaultdict(list)  # Store players waiting for opponents
app.state.active_games = {}  # Track active games by game ID
app.state.joining_games = {}  # Track games waiting for another player to join

# Static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Mount websocket endpoint
app.add_websocket_route("/ws", websocket_endpoint)