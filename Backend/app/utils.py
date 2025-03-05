from app.model import GameDB


def save_game(game_id: str, player1: str, player2: str, moves: list, winner: str, status: str, db_generator):
    db = next(db_generator)
    try:
        new_game = GameDB(
            game_id=game_id,
            player1=player1,
            player2=player2,
            moves=moves,
            winner=winner,
            status=status
        )
        db.add(new_game)
        db.commit()
        db.refresh(new_game)
    finally:
        db.close()