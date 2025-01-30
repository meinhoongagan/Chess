from collections import defaultdict
from fastapi import BackgroundTasks, FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from model import Event
from Game import Game
from TimeControl import TimeControl
from Signaling import Signaling

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

waiting_users = defaultdict(list)  # To store the first player waiting for an opponent
active_games = {}  # To track active games keyed by player names
signaling = Signaling()

app.mount("/static", StaticFiles(directory="static"), name="static")

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

            print(f"Received event: {event.event}")  # Debug log
            if event.event == "INIT_GAME":
                player_name = event.data["player_name"]
                total_time = event.data["total_time"]
                increment = event.data["increment"]
                time_key = (total_time, increment)

                if waiting_users[time_key]:
                    opponent_info = waiting_users[time_key].pop(0)
                    opponent_name = opponent_info["player_name"]
                    opponent_socket = opponent_info["websocket"]

                    game = Game()
                    time = TimeControl(
                        total_time=total_time,
                        increment=increment,
                        game=game,
                        active_games=active_games
                    )
                    game.start(player_name, opponent_name)
                    game.current_turn = player_name
                    time.start(player_name, player_name, opponent_name, websocket, opponent_socket)
                    
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
                else:
                    # Add this player to the waiting queue
                    waiting_users[time_key].append({
                        "player_name": player_name,
                        "websocket": websocket,
                        "total_time": total_time,
                        "increment": increment
                    })
                    
                    # Get count of players waiting with same time control
                    waiting_count = len(waiting_users[time_key])
                    await websocket.send_json({
                        "event": "WAITING",
                        "data": {
                            "message": f"Waiting for an opponent with {total_time}s + {increment}s increment... ({waiting_count} players in queue)"
                        }
                    })
            

            elif event.event == "OFFER":
                print(f"Forwarding offer to: {event.data['target']}")  # Debug log
                if event.data['target'] in active_games:
                    target_socket = active_games[event.data['target']]['websocket']
                    await target_socket.send_json({
                        "event": "OFFER",
                        "data": event.data
                    })

            elif event.event == "ANSWER":
                print(f"Forwarding answer to: {event.data['target']}")  # Debug log
                if event.data['target'] in active_games:
                    target_socket = active_games[event.data['target']]['websocket']
                    await target_socket.send_json({
                        "event": "ANSWER",
                        "data": event.data
                    })

            elif event.event == "ICE_CANDIDATE":
                # Exchange ICE candidates
                candidate = event.data.get("candidate")
                target_player = event.data.get("target")
                if target_player in active_games:
                    target_socket = active_games[target_player]["websocket"]
                    await target_socket.send_json({
                        "event": "ICE_CANDIDATE",
                        "data": {"candidate": candidate}
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

        for time_key in list(waiting_users.keys()):
            waiting_users[time_key] = [
                user for user in waiting_users[time_key] 
                if user["websocket"] != websocket
            ]

            if not waiting_users[time_key]:
                del waiting_users[time_key]


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

                del active_games[game.player1]
                del active_games[game.player2]

        await websocket.close()