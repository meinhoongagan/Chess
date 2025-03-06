import asyncio
from sqlalchemy.orm import Session
from app.model import GameDB

async def handle_disconnect_timeout(game_id, player_name, active_games):
    # Wait for 15 seconds
    await asyncio.sleep(15)
    
    # Check if the game still exists and the player hasn't reconnected
    if game_id in active_games:
        game_data = active_games[game_id]
        game = game_data["game"]
        
        # Check if the game is still active and the player is still marked as disconnected
        if hasattr(game, "disconnected_player") and game.disconnected_player == player_name:
            # Find the opponent
            players = game_data["players"]
            opponent_name = next(name for name in players if name != player_name)
            opponent_socket = players[opponent_name]["websocket"]
            
            # Notify the opponent that they won due to timeout
            try:
                await opponent_socket.send_json({
                    "event": "GAME_OVER",
                    "data": {
                        "status": "timeout_disconnect", 
                        "winner": opponent_name, 
                        "message": f"Player {player_name} didn't reconnect within 15 seconds."
                    }
                })
            except Exception as e:
                print(f"Error notifying opponent about timeout: {e}")
            
            # Remove the game
            del active_games[game_id]
            print(f"Game {game_id} removed due to reconnection timeout")

def save_game(game_id, player1, player2, moves, winner, status, db: Session):
    """Save game details to the database"""
    game_db = GameDB(
        id=game_id,
        player1=player1,
        player2=player2,
        moves=moves,
        winner=winner,
        status=status
    )
    db.add(game_db)
    db.commit()
    db.refresh(game_db)
    return game_db