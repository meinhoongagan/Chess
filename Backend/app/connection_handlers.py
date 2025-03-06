import asyncio
from fastapi import WebSocket, BackgroundTasks

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

async def handle_disconnect(websocket: WebSocket, background_tasks: BackgroundTasks, waiting_users, active_games):
    # Handle players waiting for a match
    for time_key in list(waiting_users.keys()):
        waiting_users[time_key] = [
            user for user in waiting_users[time_key] 
            if user["websocket"] != websocket
        ]
        
        if not waiting_users[time_key]:
            del waiting_users[time_key]
    
    # Handle active games
    game_to_remove = None
    player_who_left = None
    
    for game_id, game_data in list(active_games.items()):
        players = game_data["players"]
        
        for player_name, details in players.items():
            if details["websocket"] == websocket:
                player_who_left = player_name
                game = game_data["game"]
                
                # Mark this player as disconnected instead of removing the game immediately
                game.disconnected_player = player_name
                game.disconnected_time = asyncio.get_event_loop().time()
                
                # Find the opponent
                opponent_name = next(name for name in players if name != player_name)
                opponent_socket = players[opponent_name]["websocket"]
                
                # Notify the opponent about the disconnection
                try:
                    await opponent_socket.send_json({
                        "event": "OPPONENT_DISCONNECTED",
                        "data": {
                            "player_name": player_name,
                            "message": "Opponent disconnected. Waiting 15 seconds for reconnection."
                        }
                    })
                except Exception as e:
                    print(f"Error notifying opponent about disconnect: {e}")
                
                # Start a background task to handle the timeout
                background_tasks.add_task(
                    handle_disconnect_timeout, 
                    game_id, 
                    player_who_left, 
                    active_games
                )
                break
        
        if player_who_left:
            break

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