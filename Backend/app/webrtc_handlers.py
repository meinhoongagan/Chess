from fastapi import WebSocket


async def handle_offer(websocket: WebSocket, event, active_games):
    """
    Handle WebRTC offer from a client
    
    This function processes an SDP offer from a client and forwards it to their opponent
    in the active game.
    """
    game_id = event.data.get("game_id")
    offer = event.data.get("offer")
    
    if not game_id or game_id not in active_games:
        await websocket.send_json({
            "event": "ERROR",
            "data": {"message": "Invalid game ID or no active game found!"}
        })
        return
    
    game_data = active_games[game_id]
    players = game_data["players"]
    
    # Find the player who sent the offer
    player_name = None
    for name, details in players.items():
        if details["websocket"] == websocket:
            player_name = name
            break
    
    if not player_name:
        await websocket.send_json({
            "event": "ERROR",
            "data": {"message": "Player not found in the game!"}
        })
        return
    
    # Get opponent information
    game = game_data["game"]
    opponent_name = game.player1 if player_name == game.player2 else game.player2
    opponent_socket = players[opponent_name]["websocket"]
    
    # Forward the offer to the opponent
    try:
        await opponent_socket.send_json({
            "event": "OFFER",
            "data": {
                "offer": offer,
                "from": player_name,
                "game_id": game_id
            }
        })
    except Exception as e:
        await websocket.send_json({
            "event": "ERROR",
            "data": {"message": f"Failed to forward offer: {str(e)}"}
        })


async def handle_answer(websocket: WebSocket, event, active_games):
    """
    Handle WebRTC answer from a client
    
    This function processes an SDP answer from a client and forwards it to their opponent
    in the active game.
    """
    game_id = event.data.get("game_id")
    answer = event.data.get("answer")
    
    if not game_id or game_id not in active_games:
        await websocket.send_json({
            "event": "ERROR",
            "data": {"message": "Invalid game ID or no active game found!"}
        })
        return
    
    game_data = active_games[game_id]
    players = game_data["players"]
    
    # Find the player who sent the answer
    player_name = None
    for name, details in players.items():
        if details["websocket"] == websocket:
            player_name = name
            break
    
    if not player_name:
        await websocket.send_json({
            "event": "ERROR",
            "data": {"message": "Player not found in the game!"}
        })
        return
    
    # Get opponent information
    game = game_data["game"]
    opponent_name = game.player1 if player_name == game.player2 else game.player2
    opponent_socket = players[opponent_name]["websocket"]
    
    # Forward the answer to the opponent
    try:
        await opponent_socket.send_json({
            "event": "ANSWER",
            "data": {
                "answer": answer,
                "from": player_name,
                "game_id": game_id
            }
        })
    except Exception as e:
        await websocket.send_json({
            "event": "ERROR",
            "data": {"message": f"Failed to forward answer: {str(e)}"}
        })


async def handle_ice_candidate(websocket: WebSocket, event, active_games):
    """
    Handle ICE candidate from a client
    
    This function processes an ICE candidate from a client and forwards it to their opponent
    in the active game.
    """
    game_id = event.data.get("game_id")
    candidate = event.data.get("candidate")
    
    if not game_id or game_id not in active_games:
        await websocket.send_json({
            "event": "ERROR",
            "data": {"message": "Invalid game ID or no active game found!"}
        })
        return
    
    game_data = active_games[game_id]
    players = game_data["players"]
    
    # Find the player who sent the ICE candidate
    player_name = None
    for name, details in players.items():
        if details["websocket"] == websocket:
            player_name = name
            break
    
    if not player_name:
        await websocket.send_json({
            "event": "ERROR",
            "data": {"message": "Player not found in the game!"}
        })
        return
    
    # Get opponent information
    game = game_data["game"]
    opponent_name = game.player1 if player_name == game.player2 else game.player2
    opponent_socket = players[opponent_name]["websocket"]
    
    # Forward the ICE candidate to the opponent
    try:
        await opponent_socket.send_json({
            "event": "ICE_CANDIDATE",
            "data": {
                "candidate": candidate,
                "from": player_name,
                "game_id": game_id
            }
        })
    except Exception as e:
        await websocket.send_json({
            "event": "ERROR",
            "data": {"message": f"Failed to forward ICE candidate: {str(e)}"}
        })