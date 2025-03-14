from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from db.db import get_db
from app.model import GameDB
from fastapi import APIRouter, HTTPException, Depends

router = APIRouter()

@router.get("/game/{game_id}")
def get_game_details(game_id: str, db: Session = Depends(get_db)):
    game = db.query(GameDB).filter(GameDB.game_id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    return {
        "game_id": game.game_id,
        "player1": game.player1,
        "player2": game.player2,
        "status": game.status,
        "winner": game.winner,
        "moves" : game.moves
    }


@router.get("/user/{username}/games")
def get_user_games(username: str, db: Session = Depends(get_db)):
    games = db.query(GameDB).filter((GameDB.player1 == username) | (GameDB.player2 == username)).all()
    if not games:
        raise HTTPException(status_code=404, detail="No games found for this user")
    return [
        {
            "game_id": game.game_id,
            "status": game.status,
            "winner": game.winner,
            "player1": game.player1,
            "player2": game.player2,
        }
        for game in games
    ]
