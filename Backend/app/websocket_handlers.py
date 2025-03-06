from fastapi import Depends, WebSocket, WebSocketDisconnect, BackgroundTasks
from app.game_handlers import handle_init_game, handle_join_game, handle_create_game, handle_move
from app.connection_handlers import handle_reconnect, handle_disconnect
from app.webrtc_handlers import handle_offer, handle_answer, handle_ice_candidate
# from app.utils import save_game , handle_disconnect_timeout
from app.model import Event

async def websocket_endpoint(websocket: WebSocket, background_tasks: BackgroundTasks = Depends()):
    # Get app state
    app = websocket.app
    waiting_users = app.state.waiting_users
    active_games = app.state.active_games
    joining_games = app.state.joining_games
    
    await websocket.accept()
    
    try:
        while True:
            data = await websocket.receive_json()
            event = Event(**data)
            
            print(f"Received event: {event.event}")  # Debug log
            
            # Route to appropriate handler based on event type
            if event.event == "INIT_GAME":
                await handle_init_game(websocket, event, waiting_users, active_games)
                
            elif event.event == "JOIN_GAME":
                await handle_join_game(websocket, event, joining_games, active_games)
                
            elif event.event == "CREATE_GAME":
                await handle_create_game(websocket, event, joining_games)
                
            elif event.event == "RECONNECT":
                await handle_reconnect(websocket, event, active_games)
                
            elif event.event == "OFFER":
                await handle_offer(websocket, event, active_games)
                
            elif event.event == "ANSWER":
                await handle_answer(websocket, event, active_games)
                
            elif event.event == "ICE_CANDIDATE":
                await handle_ice_candidate(websocket, event, active_games)
                
            elif event.event == "MOVE":
                await handle_move(websocket, event, active_games)
                
    except WebSocketDisconnect:
        await handle_disconnect(websocket, background_tasks, waiting_users, active_games)