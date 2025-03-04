from collections import defaultdict
from fastapi import BackgroundTasks, FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from uuid import uuid4 as UUID4
from app.model import Event
from app.Game import Game
from app.TimeControl import TimeControl
from app.Signaling import Signaling
from app.auth import router as auth_router
from db.db import engine , Base

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.include_router(auth_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

waiting_users = defaultdict(list)  # To store the first player waiting for an opponent
active_games = {}  # To track active games keyed by player names
joining_games = {}  # To track joining games keyed by player names
signaling = Signaling()

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.websocket("/ws")
async def websocket_endpoint(
        websocket: WebSocket,
        background_tasks: BackgroundTasks
    ):
    global waiting_users, active_games, joining_games

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

                if waiting_users.get(time_key):
                    opponent_info = waiting_users[time_key].pop(0)
                    opponent_name = opponent_info["player_name"]
                    opponent_socket = opponent_info["websocket"]

                    game_id = UUID4().hex  # Generate unique game ID

                    game = Game(
                        game_id=game_id
                    )
                    time = TimeControl(
                        total_time=total_time,
                        increment=increment,
                        game=game,
                        active_games=active_games,
                        game_id=game_id
                    )
                    game.start(player_name, opponent_name)
                    game.current_turn = player_name
                    time.start(player_name, player_name, opponent_name, websocket, opponent_socket)

                    # Save game in active_games by game_id
                    active_games[game_id] = {
                        "players": {
                            player_name: {"websocket": websocket, "time": time},
                            opponent_name: {"websocket": opponent_socket, "time": time}
                        },
                        "game": game
                    }

                    # Notify both players
                    await websocket.send_json({
                        "event": "GAME_STARTED",
                        "data": {"opponent": opponent_name, "game_id": game_id},
                        "turn": player_name
                    })
                    await opponent_socket.send_json({
                        "event": "GAME_STARTED",
                        "data": {"opponent": player_name, "game_id": game_id},
                        "turn": player_name
                    })
                else:
                    # Add this player to the waiting queue
                    if time_key not in waiting_users:
                        waiting_users[time_key] = []
                    
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

            elif event.event == "JOIN_GAME":
                player_name = event.data["player_name"]
                game_id = event.data["game_id"]

                if game_id in joining_games:
                    opponent_info = joining_games.pop(game_id)
                    opponent_name = opponent_info["player_name"]
                    opponent_socket = opponent_info["websocket"]

                    game = Game(game_id=game_id)
                    time = TimeControl(
                        total_time=opponent_info["total_time"],
                        increment=opponent_info["increment"],
                        game=game,
                        active_games=active_games,
                        game_id=game_id
                    )
                    game.start(opponent_name, player_name)
                    game.current_turn = opponent_name
                    time.start(opponent_name, opponent_name, player_name, opponent_socket, websocket)

                    active_games[game_id] = {
                        "players": {
                            opponent_name: {"websocket": opponent_socket, "time": time},
                            player_name: {"websocket": websocket, "time": time}
                        },
                        "game": game
                    }

                    await websocket.send_json({
                        "event": "GAME_STARTED",
                        "data": {"opponent": opponent_name, "game_id": game_id},
                        "turn": opponent_name
                    })
                    await opponent_socket.send_json({
                        "event": "GAME_STARTED",
                        "data": {"opponent": player_name, "game_id": game_id},
                        "turn": opponent_name
                    })
                else:
                    await websocket.send_json({
                        "event": "ERROR",
                        "data": {"message": "Invalid game ID or game not available for joining."}
                    })
            elif event.event == "CREATE_GAME":
                player_name = event.data["player_name"]
                total_time = event.data["total_time"]
                increment = event.data["increment"]

                game_id = UUID4().hex  # Generate new game ID

                joining_games[game_id] = {
                    "player_name": player_name,
                    "websocket": websocket,
                    "total_time": total_time,
                    "increment": increment
                }

                await websocket.send_json({
                    "event": "GAME_CREATED",
                    "data": {"message": "Game created. Share the game ID to invite a friend.", "game_id": game_id}
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
                game_id = event.data.get("game_id")
                if not game_id or game_id not in active_games:
                    await websocket.send_json({
                        "event": "ERROR",
                        "data": {"message": "Invalid game ID or no active game found!"}
                    })
                    continue

                game_data = active_games[game_id]
                game = game_data["game"]
                players = game_data["players"]
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
                    continue

                time = players[player_name]["time"]

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

                    game.update_status()
                    game_status = game.get_status()
                    active_time = time.timer_active
                    opponent_name = game.player1 if player_name == game.player2 else game.player2
                    opponent_socket = players[opponent_name]["websocket"]

                    if game_status == "ongoing" and active_time:
                        try:
                            time_update = time.process_move(player_name)
                            game.current_turn = opponent_name
                            winning_chance = game.get_winning_chances(evaluation)
                            suggest = game.suggest_move()
                        except Exception as e:
                            print(e)
                            time_update = None
                            evaluation = None
                            winning_chance = None
                            suggest = None

                        response = {
                            "event": "MOVE",
                            "data": {"move": move, "turn": game.current_turn, "game_id": game_id},
                            "winning_chance": winning_chance,
                            "suggest": suggest,
                            "time": time_update
                        }

                        await websocket.send_json(response)
                        await opponent_socket.send_json(response)
                    else:
                        await websocket.send_json({
                            "event": "MOVE",
                            "data": {"move": move, "turn": game.current_turn, "game_id": game_id}
                        })
                        await opponent_socket.send_json({
                            "event": "MOVE",
                            "data": {"move": move, "turn": game.current_turn, "game_id": game_id}
                        })
                        winner = game.current_turn
                        await websocket.send_json({
                            "event": "GAME_OVER",
                            "data": {"status": game.get_status(), "winner": winner}
                        })
                        await opponent_socket.send_json({
                            "event": "GAME_OVER",
                            "data": {"status": game.get_status(), "winner": winner}
                        })
                        # Remove game from active_games
                        del active_games[game_id]
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

                del active_games[game_id]

        await websocket.close()