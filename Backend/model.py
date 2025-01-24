from enum import Enum
from pydantic import BaseModel 
from typing import Optional

class Event(BaseModel):
    event: str
    data: dict

class User(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None