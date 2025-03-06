from fastapi import WebSocket

async def handle_offer(websocket: WebSocket, event, active_games):
    print(f"Forwarding offer to: {event.data['target']}")  # Debug log
    if event.data['target'] in active_games:
        target_socket = active_games[event.data['target']]['websocket']
        await target_socket.send_json({
            "event": "OFFER",
            "data": event.data
        })

async def handle_answer(websocket: WebSocket, event, active_games):
    print(f"Forwarding answer to: {event.data['target']}")  # Debug log
    if event.data['target'] in active_games:
        target_socket = active_games[event.data['target']]['websocket']
        await target_socket.send_json({
            "event": "ANSWER",
            "data": event.data
        })

async def handle_ice_candidate(websocket: WebSocket, event, active_games):
    # Exchange ICE candidates
    candidate = event.data.get("candidate")
    target_player = event.data.get("target")
    if target_player in active_games:
        target_socket = active_games[target_player]["websocket"]
        await target_socket.send_json({
            "event": "ICE_CANDIDATE",
            "data": {"candidate": candidate}
        })