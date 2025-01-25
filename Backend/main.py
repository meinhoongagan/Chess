from fastapi import BackgroundTasks, FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from model import Event
from Game import Game
from TimeControl import TimeControl

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

waiting_user = None  # To store the first player waiting for an opponent
active_games = {}  # To track active games keyed by player names


@app.websocket("/ws")
async def websocket_endpoint(
        websocket: WebSocket,
        background_tasks: BackgroundTasks
        ):
    global waiting_user, active_games

    await websocket.accept()

    try:
        while True:
            data = await websocket.receive_json()
            event = Event(**data)

            if event.event == "INIT_GAME":
                player_name = event.data["player_name"]

                if waiting_user:
                    # Match with waiting user and start a new game
                    opponent_name = waiting_user["player_name"]
                    opponent_socket = waiting_user["websocket"]

                    game = Game()
                    time = TimeControl(
                        total_time=event.data["total_time"], 
                        increment=event.data["increment"],
                        game=game,
                        active_games=active_games
                        )
                    game.start(player_name, opponent_name)
                    game.current_turn = player_name
                    time.start(player_name, player_name, opponent_name,websocket, opponent_socket)
                    # Save game in active_games
                    active_games[player_name] = {"game": game, "websocket": websocket, "time": time}
                    active_games[opponent_name] = {"game": game, "websocket": opponent_socket, "time": time}

                    # Notify both players
                    await websocket.send_json({
                        "event": "GAME_STARTED",
                        "data": {"opponent": opponent_name},
                        "turn": player_name
                    })
                    await opponent_socket.send_json({
                        "event": "GAME_STARTED",
                        "data": {"opponent": player_name},
                        "turn": player_name
                    })

                    # Clear waiting_user
                    waiting_user = None
                else:
                    # No opponent available; wait
                    waiting_user = {"player_name": player_name, "websocket": websocket}
                    await websocket.send_json({
                        "event": "WAITING",
                        "data": {"message": "Waiting for an opponent..."}
                    })

            elif event.event == "MOVE":
                
                player_name = None

                for name, details in active_games.items():
                    if details["websocket"] == websocket:
                        player_name = name
                        break

                if not player_name or player_name not in active_games:
                    await websocket.send_json({
                        "event": "ERROR",
                        "data": {"message": "No active game found!"}
                    })
                    continue

                game_data = active_games[player_name]
                game = game_data["game"]
                time = game_data["time"]

                # Check if it's the player's turn
                if game.current_turn != player_name:
                    await websocket.send_json({
                        "event": "ERROR",
                        "data": {"message": "It's not your turn!"}
                    })
                    continue

                try:
                    move = event.data["move"]
                    if not game.isValidMove(move):
                        await websocket.send_json({
                            "event": "ERROR",
                            "data": {"message": f"Invalid move: {move}"}
                        })
                        continue

                    # Make the move and switch turn
                    game.move(move)

                    # Notify both players of the move
                    player1_socket = active_games[game.player1]["websocket"]
                    player2_socket = active_games[game.player2]["websocket"]

                    game.update_status()
                    game_status = game.get_status()
                    active_time = time.timer_active
                    print(active_time)
                    if game_status == "ongoing" and active_time:
                        try:
                            time_update = time.process_move(player_name)
                            game.current_turn = game.player1 if game.current_turn == game.player2 else game.player2
                            evaluation = game.get_evaluation()
                            analysis = game.analyze_position()
                            winning_chance = game.get_winning_chances(evaluation)
                            suggest = game.suggest_move()
                        except Exception as e:
                            print(e)
                            time_update = None
                            evaluation = None
                            analysis = None
                            winning_chance = None
                            suggest = None
                            

                        response = {
                            "event": "MOVE",
                            "data": {"move": move, "turn": game.current_turn},
                            "evaluation": evaluation,
                            "analysis": analysis,
                            "winning_chance": winning_chance,
                            "suggest": suggest,
                            "time": time_update
                            # "oppening": opening
                        }

                        await player1_socket.send_json({
                            **response
                        })
                        await player2_socket.send_json({
                            **response
                        })

                    else:
                        winner = game.current_turn
                        await player1_socket.send_json({
                            "event": "GAME_OVER",
                            "data": {"status": game.get_status(), "winner": winner}
                        })
                        await player2_socket.send_json({
                            "event": "GAME_OVER",
                            "data": {"status": game.get_status(), "winner": winner}
                        })
                        # Remove game from active_games
                        del active_games[game.player1]
                        del active_games[game.player2]

                except Exception as e:
                    await websocket.send_json({
                        "event": "ERROR",
                        "data": {"message": str(e)}
                    })


    except WebSocketDisconnect:
        # Handle disconnects
        if waiting_user and waiting_user["websocket"] == websocket:
            waiting_user = None

        for name, details in list(active_games.items()):
            if details["websocket"] == websocket:
                game = details["game"]
                opponent_name = game.player2 if game.player1 == name else game.player1
                opponent_socket = active_games[opponent_name]["websocket"]

                # Notify the opponent that their opponent left
                await opponent_socket.send_json({
                    "event": "GAME_OVER",
                    "data": {"status": "disconnected", "winner": opponent_name}
                })

                # Remove game
                del active_games[game.player1]
                del active_games[game.player2]

        await websocket.close()