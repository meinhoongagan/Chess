import asyncio
from fastapi import WebSocket
from db.db import get_db
from app.utils import save_game

async def handle_disconnect_timeout(game_id, player_name, active_games):
    """Waits 15 seconds to check if the player reconnects, else the opponent wins."""
    
    await asyncio.sleep(30)  # Wait for 15 seconds

    try :
        game = active_games[game_id]["game"]
        players = active_games[game_id]["players"]
        opponent_name = next(name for name in players if name != player_name)
        db = get_db()
        save_game(game.id, game.player1, game.player2, game.moves, opponent_name, "Disconnect", db)
    
    except Exception as e:
        print(f"Error saving game: {e}")

    
    if game_id in active_games:
        game_data = active_games[game_id]
        game = game_data["game"]
        
        # Ensure the game is still active and the player has not reconnected
        if getattr(game, "disconnected_player", None) == player_name:
            players = game_data["players"]
            opponent_name = next(name for name in players if name != player_name)
            opponent_socket = players[opponent_name]["websocket"]

            # Notify opponent about winning the game
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
                print(f"Error sending game over message: {e}")
            
            # Remove the game from active games
            del active_games[game_id]
            print(f"Game {game_id} ended due to reconnection timeout")


async def handle_disconnect(websocket: WebSocket, waiting_users, active_games):
    """Handles player disconnection and starts a timer for reconnection."""

    # Remove from waiting queue
    for time_key in list(waiting_users.keys()):
        waiting_users[time_key] = [
            user for user in waiting_users[time_key] if user["websocket"] != websocket
        ]
        if not waiting_users[time_key]:  
            del waiting_users[time_key]
    
    player_who_left = None
    game_id_to_remove = None

    # Check if player belongs to an active game
    for game_id, game_data in list(active_games.items()):
        players = game_data["players"]
        
        for player_name, details in players.items():
            if details["websocket"] == websocket:
                player_who_left = player_name
                game = game_data["game"]
                
                # Mark player as disconnected
                game.disconnected_player = player_name
                
                # Notify opponent
                opponent_name = next(name for name in players if name != player_name)
                opponent_socket = players[opponent_name]["websocket"]

                try:
                    await opponent_socket.send_json({
                        "event": "OPPONENT_DISCONNECTED",
                        "data": {
                            "player_name": player_name,
                            "message": "Opponent disconnected. Waiting 30 seconds for reconnection."
                        }
                    })
                except Exception as e:
                    print(f"Error notifying opponent about disconnect: {e}")

                # Start async task to track reconnection timeout
                asyncio.create_task(handle_disconnect_timeout(game_id, player_who_left, active_games))

                break  # Exit inner loop

        if player_who_left:
            break  # Exit outer loop


async def handle_reconnect(websocket: WebSocket, event, active_games):
    player_name = event.data["player_name"]
    game_id = event.data["game_id"]
    
    if game_id in active_games:
        game_data = active_games[game_id]
        players = game_data["players"]
        game = game_data["game"]
        
        if player_name in players:
            # Update the player's websocket
            players[player_name]["websocket"] = websocket
            
            # Clear disconnected status if this was the disconnected player
            if hasattr(game, "disconnected_player") and game.disconnected_player == player_name:
                game.disconnected_player = None
            
            # Get the game state
            await websocket.send_json({
                "event": "GAME_STATE",
                "data": {
                    "moves": game.moves,
                    "turn": game.current_turn,
                    "status": game.get_status(),
                    "game_id": game_id
                }
            })
            
            # Notify the opponent
            opponent_name = next(name for name in players if name != player_name)
            opponent_socket = players[opponent_name]["websocket"]
            await opponent_socket.send_json({
                "event": "RECONNECTED",
                "data": {"player_name": player_name}
            })
        else:
            await websocket.send_json({
                "event": "ERROR",
                "data": {"message": "Player not found in the game!"}
            })
    else:
        await websocket.send_json({
            "event": "ERROR",
            "data": {"message": "Game not found!"}
        })