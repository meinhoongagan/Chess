from enum import Enum
from typing import Optional
from pydantic import BaseModel, EmailStr

from sqlalchemy import Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

# Pydantic models for request/response validation
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class User(BaseModel):
    username: str
    email: str

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