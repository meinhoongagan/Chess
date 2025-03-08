from enum import Enum
from typing import Optional
from pydantic import BaseModel, EmailStr

from sqlalchemy import JSON, Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

# Pydantic models for request/response validation
class UserCreate(BaseModel):
    username: Optional[str]
    email: EmailStr
    password: str

class User(BaseModel):
    username: str
    email: str

class GameSchema (BaseModel):
    game_id: str
    player1: str
    player2: str
    status: str
    winner: str
    moves: list


class Token(BaseModel):
    access_token: str
    token_type: str
    user: Optional[str] = None

class TokenData(BaseModel):
    username: Optional[str] = None

class Event(BaseModel):
    event: str
    data: dict

# SQLAlchemy model for database
class UserDB(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    password = Column(String)

class GameDB(Base):
    __tablename__ = "games"

    game_id = Column(String, nullable=False, primary_key=True)
    player1 = Column(String, nullable=False)
    player2 = Column(String, nullable=False)
    status = Column(String, nullable=False)
    winner = Column(String, nullable=True)  # Can be NULL if the game is not finished
    moves = Column(JSON, nullable=False, default=[])  # Storing moves as a JSON array